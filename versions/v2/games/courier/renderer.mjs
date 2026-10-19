import { LEVELS } from './levels.mjs';
import { pose, worldAt } from './engine.mjs';

// This is a world-space renderer: the road, its lane markings, props and obstacles
// all live on the same folded orthogonal route. The camera never anticipates a turn.
const TAU = Math.PI * 2, SX = 19, SY = 10, CX = 480, CY = 452;
const THEMES = {
  valley: { ground:'#b4bf98', patch:'#a3b58b', dark:'#31584c', leaf:'#527b58', light:'#8fa66b', road:'#c8bea2', water:'#80b8ad', bank:'#cfcea8' },
  bamboo: { ground:'#9fb9a1', patch:'#8bab90', dark:'#28594f', leaf:'#417e63', light:'#80a577', road:'#bdbaa0', water:'#70aca6', bank:'#c7c8a3' }
};
const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const mix = (a,b,t) => a + (b-a)*t;
const vector = h => ({ fx:Math.sin(h), fy:-Math.cos(h), rx:Math.cos(h), ry:Math.sin(h) });
function routePoints(level) {
  return [-24, 0, ...level.turns.map(t=>t.d), level.length, level.length+25].map(d=>worldAt(level,d));
}
function offsetLine(points, amount) {
  return points.map((p,i)=>{
    const prev=points[Math.max(0,i-1)], next=points[Math.min(points.length-1,i+1)];
    let ax=p.x-prev.x, ay=p.y-prev.y, bx=next.x-p.x, by=next.y-p.y;
    let al=Math.hypot(ax,ay), bl=Math.hypot(bx,by);
    if(!al){ax=bx;ay=by;al=bl;} if(!bl){bx=ax;by=ay;bl=al;}
    const arx=-ay/al, ary=ax/al, brx=-by/bl, bry=bx/bl;
    const denom=Math.max(.1,1+arx*brx+ary*bry);
    return {x:p.x+amount*(arx+brx)/denom,y:p.y+amount*(ary+bry)/denom};
  });
}
function distanceToRoute(p,points){
  let best=Infinity;
  for(let i=1;i<points.length;i++){
    const a=points[i-1], b=points[i], dx=b.x-a.x,dy=b.y-a.y;
    const f=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));
    best=Math.min(best,Math.hypot(p.x-a.x-f*dx,p.y-a.y-f*dy));
  }
  return best;
}
function makeScenery(level,points){
  const out=[];
  for(let d=-16,k=0;d<level.length+30;d+=9,k++) for(const side of [-1,1]) for(let band=0;band<3;band++){
    const seed=k*31+band*7+(side+1)*3+level.id*47, off=side*(8+band*7+hash(seed)*4);
    const p=worldAt(level,d+hash(seed+2)*6,1+off/3);
    if(distanceToRoute(p,points)<6.6)continue;
    out.push({...p,seed,size:.75+hash(seed+8)*.6,kind:band===0&&k%5===1?'rock':hash(seed+4)<.23?'bush':level.theme==='bamboo'?'bamboo':'tree'});
  }
  for(let d=17,k=0;d<level.length;d+=72,k++){
    const side=k%2?-1:1, p=worldAt(level,d,1+side*13/3);
    if(distanceToRoute(p,points)>8)out.push({...p,kind:'house',seed:k+level.id*30,size:1});
    const m=worldAt(level,d+4,1+side*6.2/3);out.push({...m,kind:'mailbox',seed:k,size:1});
  }
  return out;
}
export function createRenderer(canvas) {
  const c=canvas.getContext('2d');
  const cache=new Map(); let camera=null, lastLevel=null,lastTicks=-1, turnStart=0,turnFrom=0,turnTarget=0;
  let origin={x:0,y:0}, heading=0, theme=THEMES.valley;
  const project=(p,z=0)=>({x:CX+((p.x-origin.x)*Math.cos(heading)+(p.y-origin.y)*Math.sin(heading))*SX,y:CY+(-(p.x-origin.x)*Math.sin(heading)+(p.y-origin.y)*Math.cos(heading))*SY-z*SX});
  const local=(p,x,y,z=0)=>{const v=vector(p.heading||0);return project({x:p.x+v.rx*x+v.fx*y,y:p.y+v.ry*x+v.fy*y},z);};
  function polygon(points,fill,stroke,width=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  function line(points,color,width=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
  function ellipse(x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=fill;c.fill();}
  function label(str,x,y,size=14,color='#253e36',align='center',weight=700){c.font=`${weight} ${size}px system-ui, 'Noto Sans CJK SC', sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(str,x,y);}
  function roundRect(x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
  function groundTransform(){c.setTransform(SX*Math.cos(heading),-SY*Math.sin(heading),SX*Math.sin(heading),SY*Math.cos(heading),CX-SX*(origin.x*Math.cos(heading)+origin.y*Math.sin(heading)),CY-SY*(-origin.x*Math.sin(heading)+origin.y*Math.cos(heading)));}
  function groundPath(points,color,width,dash=[]){c.save();groundTransform();c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineJoin='miter';c.miterLimit=4;c.lineCap='butt';c.setLineDash(dash);c.stroke();c.restore();}
  function box(p,w,d,h,colors,z=0){
    const corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
    const low=corners.map(([x,y])=>local(p,x,y,z)),high=corners.map(([x,y])=>local(p,x,y,z+h));
    const faces=[0,1,2,3].sort((a,b)=>(low[a].y+low[(a+1)%4].y)-(low[b].y+low[(b+1)%4].y));
    for(const i of faces){const j=(i+1)%4;polygon([low[i],low[j],high[j],high[i]],colors[i%2+1]||colors[1],'#25483928',.7);}
    polygon(high,colors[0],'#25483930',.8);return {low,high};
  }
  function envelope(x,y,s=1,gold=false){
    c.save();c.translate(x,y);c.rotate(-.09);
    roundRect(-13*s,-9*s,26*s,18*s,2*s,gold?'#f2c65e':'#fff7d9','#856d3f');
    line([{x:-12*s,y:-8*s},{x:0,y:1*s},{x:12*s,y:-8*s}],'#aa8a53',1.2*s);
    line([{x:-12*s,y:8*s},{x:-4*s,y:0},{x:4*s,y:0},{x:12*s,y:8*s}],'#cbb485',.8*s);
    c.restore();
  }
  function tree(p){
    const q=project(p),s=p.size;ellipse(q.x+8*s,q.y+3,21*s,8*s,'#35544720');
    line([{x:q.x,y:q.y},{x:q.x-2*s,y:q.y-34*s}],'#675e40',6*s);
    line([{x:q.x-1,y:q.y-15*s},{x:q.x+12*s,y:q.y-33*s}],'#675e40',3*s);
    ellipse(q.x,q.y-39*s,24*s,24*s,theme.dark);
    ellipse(q.x-10*s,q.y-46*s,19*s,20*s,theme.leaf);
    ellipse(q.x+9*s,q.y-49*s,18*s,19*s,theme.leaf);
    ellipse(q.x-4*s,q.y-58*s,15*s,14*s,theme.light);
    ellipse(q.x-9*s,q.y-59*s,5*s,3*s,'#c2cf8b70');
  }
  function bamboo(p){
    const q=project(p),s=p.size;ellipse(q.x+9,q.y+2,20*s,7*s,'#35544720');
    for(let k=-1;k<=1;k++){
      const x=q.x+k*10*s,h=(54+hash(p.seed+k+2)*25)*s;
      line([{x,y:q.y},{x:x+k*5*s,y:q.y-h}],k===0?'#4c7853':'#638a59',5*s);
      for(let i=1;i<=4;i++)line([{x:x-3*s+k*i,y:q.y-i*h/5},{x:x+3*s+k*i,y:q.y-i*h/5}],'#a3b67b',1.2*s);
      for(let j=0;j<3;j++)for(const side of[-1,1]){
        const y=q.y-h+j*16*s;
        polygon([{x:x+k*4,y},{x:x+side*28*s,y:y-8*s},{x:x+side*13*s,y:y+4*s}],j%2?theme.leaf:theme.dark);
      }
    }
  }
  function bush(p){const q=project(p),s=p.size;ellipse(q.x+3,q.y+2,17*s,6*s,'#3f5b4220');for(const[a,b,r]of[[-11,-6,11],[4,-11,14],[15,-5,9]])ellipse(q.x+a*s,q.y+b*s,r*s,r*.68*s,theme.leaf);ellipse(q.x,q.y-14*s,8*s,4*s,theme.light);}
  function rock(p){const q=project(p),s=p.size;ellipse(q.x+2,q.y+2,19*s,7*s,'#37504020');polygon([{x:q.x-19*s,y:q.y-3},{x:q.x-12*s,y:q.y-17*s},{x:q.x+7*s,y:q.y-23*s},{x:q.x+21*s,y:q.y-8*s},{x:q.x+15*s,y:q.y+4*s},{x:q.x-8*s,y:q.y+5*s}],'#7f8b79');polygon([{x:q.x-12*s,y:q.y-17*s},{x:q.x+7*s,y:q.y-23*s},{x:q.x+21*s,y:q.y-8*s},{x:q.x,y:q.y-9*s}],'#b3b7a1');}
  function house(p){
    const q=project(p);ellipse(q.x+12,q.y+10,61,20,'#354f3c22');
    box(p,4.3,4.1,2.3,['#f2dfb3','#c5bc97','#e3d1a6']);
    const roof=[local(p,-2.55,-2.5,2.25),local(p,2.55,-2.5,2.25),local(p,2.55,2.5,2.25),local(p,-2.55,2.5,2.25)],ridgeA=local(p,0,-2.5,3.65),ridgeB=local(p,0,2.5,3.65);
    const faces=[[roof[0],ridgeA,ridgeB,roof[3]],[ridgeA,roof[1],roof[2],ridgeB],[roof[0],roof[1],ridgeA],[roof[3],ridgeB,roof[2]]];
    faces.sort((a,b)=>a.reduce((n,p)=>n+p.y,0)/a.length-b.reduce((n,p)=>n+p.y,0)/b.length);
    faces.forEach((f,i)=>polygon(f,['#9a6450','#b47755','#cf946b','#815c4d'][i]));
    for(let i=-2;i<=2;i++)line([local(p,-2.5,i,2.27),local(p,0,i,3.68),local(p,2.5,i,2.27)],'#e0a77b45',1);
    const door=local(p,0,-2.06,.8);roundRect(door.x-7,door.y-13,14,25,2,'#4d6558');
    const win=local(p,1.35,-2.08,1.35);roundRect(win.x-7,win.y-6,14,13,1,'#efd38b','#7e8260');line([{x:win.x,y:win.y-6},{x:win.x,y:win.y+7}],'#7e8260');
  }
  function mailbox(p){
    box(p,.25,.25,1.3,['#849279','#546f58','#687d60']);
    box(p,.95,.65,.65,['#a5b68d','#547c65','#6e9372'],1.1);
    const q=project(p,1.45);envelope(q.x,q.y,.38);line([{x:q.x+10,y:q.y-3},{x:q.x+10,y:q.y-15}],'#e2aa58',2.5);line([{x:q.x+10,y:q.y-15},{x:q.x+18,y:q.y-15}],'#dc764c',4);
  }
  function sign(p,text,sub='',color='#f4d37c'){
    const q=project(p);line([{x:q.x,y:q.y},{x:q.x,y:q.y-47}],'#566c54',4);
    roundRect(q.x-29,q.y-61,58,31,5,'#355d4c');roundRect(q.x-27,q.y-59,54,27,4,color);
    if(text==='↰'||text==='↱'){const side=text==='↰'?-1:1;line([{x:q.x-side*8,y:q.y-36},{x:q.x-side*8,y:q.y-48},{x:q.x+side*10,y:q.y-48}],'#344f3c',3);polygon([{x:q.x+side*14,y:q.y-48},{x:q.x+side*6,y:q.y-55},{x:q.x+side*6,y:q.y-41}],'#344f3c');}else label(text,q.x,q.y-45,20,'#344f3c');if(sub)label(sub,q.x,q.y-21,10,'#344f3c');
  }
  function obstacle(row,p){
    const hit=row.hit;c.save();if(hit)c.globalAlpha=.45;
    if(row.kind==='crate'){
      box(p,2.35,1.9,1.65,['#b39764','#7d6b4c','#9c8055']);
      const a=local(p,-1.05,-.96,.15),b=local(p,1.05,-.96,1.5),d=local(p,-1.05,-.96,1.5),e=local(p,1.05,-.96,.15);
      line([a,b],'#dec69a',3);line([d,e],'#dec69a',3);
      const mid=local(p,0,0,1.68);line([local(p,-1.15,0,1.68),local(p,1.15,0,1.68)],'#ddc899',3);
    }else if(row.kind==='jump'){
      for(const x of[-1.14,1.14]){const b={...p,x:p.x+Math.cos(p.heading)*x,y:p.y+Math.sin(p.heading)*x};box(b,.2,.7,1.25,['#eda45c','#9c593c','#b76a43']);}
      box(p,2.65,.36,.74,['#f0ad66','#bc653f','#d8844d'],.46);
      for(const x of[-.8,0,.8])line([local(p,x-.18,-.19,.5),local(p,x+.18,-.19,1.16)],'#ffe4ac',4);
    }else if(row.kind==='slide'){
      for(const x of[-1.24,1.24]){const b={...p,x:p.x+Math.cos(p.heading)*x,y:p.y+Math.sin(p.heading)*x};box(b,.2,.52,2.35,['#7caeaa','#365f66','#4d8487']);}
      box(p,2.7,.48,.52,['#8ebcb6','#386871','#5f9298'],1.85);
      const q=local(p,0,-.26,2.1);label('↓',q.x,q.y,17,'#f4ead0');
    }
    c.restore();
  }
  function courier(g,p){
    const pp=pose(g),q=project(p),jump=pp.height*39,run=g.state==='playing',stride=run&&pp.kind==='run'?Math.sin(g.ticks*.22):.25;
    ellipse(q.x+3,q.y+2,18-pp.height*4,6-pp.height*1.5,'#263e3740');
    if(run&&pp.kind==='run')for(let k=0;k<3;k++){const phase=(g.ticks*.03+k/3)%1;ellipse(q.x+(k-1)*8,q.y+phase*18,1.5+phase*3,1+phase*1.4,`rgba(234,222,182,${(1-phase)*.45})`);}
    c.save();c.translate(q.x,q.y-jump);c.rotate(Math.sin(p.heading-heading)*.12);if(g.state==='lost'&&/跑出了山路|前面没有路/.test(g.reason||'')){c.rotate(.95);c.globalAlpha=.83;}
    if(pp.kind==='slide'){
      line([{x:-19,y:-7},{x:12,y:-5}],'#314e44',9);line([{x:-20,y:-5},{x:-27,y:-3}],'#d2bf91',5);
      roundRect(-20,-26,34,19,6,'#e2a65a','#8c6846');ellipse(18,-22,10,10,'#f1c991');
      polygon([{x:7,y:-26},{x:12,y:-35},{x:25,y:-34},{x:29,y:-26}],'#4c6d55');roundRect(-14,-32,22,15,3,'#bd8250');envelope(-3,-25,.42);
    }else{
      line([{x:-6,y:-20},{x:-8-stride*5,y:-6},{x:-11-stride*7,y:0}],'#314e44',7);
      line([{x:6,y:-20},{x:8+stride*5,y:-7},{x:11+stride*7,y:0}],'#38574a',7);
      line([{x:-13-stride*7,y:0},{x:-7-stride*7,y:0}],'#e2cc9b',5);line([{x:7+stride*7,y:0},{x:15+stride*7,y:0}],'#e2cc9b',5);
      line([{x:-11,y:-39},{x:-16,y:-29-stride*6},{x:-18,y:-22-stride*5}],'#daa052',7);
      line([{x:11,y:-39},{x:17,y:-29+stride*6},{x:19,y:-22+stride*5}],'#daa052',7);
      ellipse(-18,-22-stride*5,3.5,3.5,'#eec18c');ellipse(19,-22+stride*5,3.5,3.5,'#eec18c');
      polygon([{x:-11,y:-43},{x:11,y:-43},{x:13,y:-20},{x:-13,y:-20}],'#e7ac60','#8b6c46',1.2);
      line([{x:8,y:-43},{x:-8,y:-21}],'#526c52',3);
      ellipse(0,-51,9.5,11,'#eac18c');ellipse(-9,-51,2.5,3,'#eac18c');ellipse(9,-51,2.5,3,'#eac18c');
      polygon([{x:-11,y:-54},{x:-8,y:-63},{x:7,y:-64},{x:12,y:-54}],'#49674f');ellipse(0,-54,13,3,'#638266');
      roundRect(-10,-40,20,20,4,'#b77f4c','#765b3d');roundRect(-9,-40,18,7,3,'#d29d5e');envelope(1,-29,.43);
    }
    c.restore();
  }
  function miniMap(level,g,points){
    const x=807,y=20,w=133,h=125;roundRect(x,y,w,h,12,'#f8f3dbeb','#ffffff70');label('邮路 / ROUTE',x+13,y+17,10,'#4d6959','left');
    const ps=[worldAt(level,0),...level.turns.map(t=>worldAt(level,t.d)),worldAt(level,level.length)];
    const minX=Math.min(...ps.map(p=>p.x)),maxX=Math.max(...ps.map(p=>p.x)),minY=Math.min(...ps.map(p=>p.y)),maxY=Math.max(...ps.map(p=>p.y));
    const scale=Math.min(94/Math.max(1,maxX-minX),77/Math.max(1,maxY-minY));
    const map=p=>({x:x+66+(p.x-(maxX+minX)/2)*scale,y:y+77+(p.y-(maxY+minY)/2)*scale});
    line(ps.map(map),'#c8cfb2',8);line(ps.map(map),'#718b6e',4);
    ps.slice(1,-1).forEach(p=>{const q=map(p);ellipse(q.x,q.y,3.5,3.5,'#ddac54');});
    const finish=map(ps.at(-1));roundRect(finish.x-4,finish.y-4,8,8,1,'#e9ba65','#56715c');
    const q=map(worldAt(level,g.distance));ellipse(q.x,q.y,6,6,'#fff8df');ellipse(q.x,q.y,3.8,3.8,'#db7850');
  }
  function draw(g){
    const level=LEVELS[g.level-1]||LEVELS[0];theme=THEMES[level.theme]||THEMES.valley;
    if(!cache.has(level.id)){const points=routePoints(level);cache.set(level.id,{points,scenery:makeScenery(level,points)});}
    const {points,scenery}=cache.get(level.id);
    if(camera===null||lastLevel!==g.level||g.ticks<lastTicks){camera=g.heading||0;turnTarget=camera;turnFrom=camera;turnStart=g.ticks;}
    if(Math.abs((g.heading||0)-turnTarget)>1e-6){turnFrom=camera;turnTarget=g.heading||0;turnStart=g.ticks;}
    const f=Math.max(0,Math.min(1,(g.ticks-turnStart)/72));camera=mix(turnFrom,turnTarget,f*f*(3-2*f));
    lastLevel=g.level;lastTicks=g.ticks;heading=camera;origin=worldAt(level,g.distance);
    c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,960,600);c.fillStyle=theme.ground;c.fillRect(0,0,960,600);
    // Stable world-space meadow patches, grass and the creek remain fixed while the camera rotates.
    c.save();groundTransform();
    const tile=9, ox=Math.floor(origin.x/tile),oy=Math.floor(origin.y/tile);
    for(let tx=ox-8;tx<=ox+8;tx++)for(let ty=oy-8;ty<=oy+8;ty++){
      const seed=tx*31+ty*67,h=hash(seed);c.fillStyle=h>.5?theme.patch:'#c5c69c';c.globalAlpha=.18;
      c.beginPath();c.ellipse(tx*tile+hash(seed+1)*4,ty*tile+hash(seed+2)*4,4+h*5,3+h*4,h*3,0,TAU);c.fill();
      c.globalAlpha=.24;c.strokeStyle=theme.dark;c.lineWidth=.045;for(let k=0;k<4;k++){const x=tx*tile+hash(seed+k+5)*9,y=ty*tile+hash(seed+k+12)*9;c.beginPath();c.moveTo(x-.16,y-.15);c.lineTo(x,y+.1);c.lineTo(x+.15,y-.25);c.stroke();}
    }c.restore();
    const creek=offsetLine(points,20);groundPath(creek,theme.bank,8.5);groundPath(creek,theme.water,6.2);groundPath(offsetLine(points,19.4),'#c0ddd041',.12,[1.4,2.8]);groundPath(offsetLine(points,21.5),'#e8f0cf60',.08,[.6,3.6]);
    // Thick miter-joined strokes produce genuine square 90-degree road bends.
    groundPath(points,'#526c5628',12.4);groundPath(points,'#66765e',11.2);groundPath(points,'#e2d8b5',10.55);groundPath(points,theme.road,9.45);
    for(const amount of[-4.45,4.45])groundPath(offsetLine(points,amount),'#f1e9ce',.13);
    for(const amount of[-1.5,1.5])groundPath(offsetLine(points,amount),'#f8efd3bb',.12,[1.3,1.65]);
    for(let d=0;d<=level.length;d+=4){if(Math.abs(d-g.distance)>85)continue;if(level.turns.some(t=>Math.abs(t.d-d)<6))continue;const p=worldAt(level,d),a=local(p,-4.4,0),b=local(p,4.4,0);line([a,b],'#827e6424',1);}
    const next=level.turns[g.turnIndex||0];
    if(next&&next.d-g.distance<48&&next.d-g.distance>=0){
      const end=worldAt(level,next.d),h=worldAt(level,next.d-.01).heading,v=vector(h),start=worldAt(level,next.d-16);
      const quad=[{x:start.x-v.rx*4.45,y:start.y-v.ry*4.45},{x:start.x+v.rx*4.45,y:start.y+v.ry*4.45},{x:end.x+v.rx*4.45,y:end.y+v.ry*4.45},{x:end.x-v.rx*4.45,y:end.y-v.ry*4.45}];
      polygon(quad.map(p=>project(p)),'#edbd5735');
      line([local({...start,heading:h},-4.4,0),local({...start,heading:h},4.4,0)],'#f6dea7',3);
    }
    const things=[];
    const push=(p,fn,bias=0)=>{const q=project(p);if(q.x>-150&&q.x<1110&&q.y>-100&&q.y<770)things.push({depth:q.y+bias,fn});};
    for(const p of scenery)push(p,()=>({tree,bamboo,bush,rock,house,mailbox}[p.kind])(p));
    // Short verge posts and distance stones belong to the road, not to the screen.
    for(let d=2;d<level.length;d+=7){if(Math.abs(d-g.distance)>85||level.turns.some(t=>Math.abs(t.d-d)<7))continue;for(const side of[-1,1]){const p=worldAt(level,d,1+side*5.4/3);push(p,()=>{box(p,.18,.18,.72,['#f0e5bf','#7b8264','#c0c49c']);const q=project(p,.55);ellipse(q.x,q.y,2,2,'#e4ac5a');});}}
    for(const turn of level.turns){if(Math.abs(turn.d-g.distance)>65)continue;
      const incoming=worldAt(level,turn.d-.01),v=vector(incoming.heading),corner=worldAt(level,turn.d);
      const marker={...worldAt(level,turn.d-8),x:worldAt(level,turn.d-8).x+v.rx*6.3,y:worldAt(level,turn.d-8).y+v.ry*6.3};push(marker,()=>sign(marker,turn.dir==='left'?'↰':'↱','90°'));
      const outside={x:corner.x+v.fx*6,y:corner.y+v.fy*6,heading:incoming.heading};
      push(outside,()=>{for(const x of[-3,0,3]){const p={...outside,x:outside.x+v.rx*x,y:outside.y+v.ry*x};box(p,2.6,.4,.62,['#e8c87b','#827b52','#bbaa6a'],.4);for(const xx of[-.7,.1,.9])line([local(p,xx-.2,-.22,.43),local(p,xx+.2,-.22,1.01)],'#6b6c4b',4);}},1);
    }
    for(const row of level.rows){if(Math.abs(row.d-g.distance)>77)continue;for(const lane of row.lanes){const p=worldAt(level,row.d,lane);push(p,()=>obstacle({...row,hit:g.hitRows?.includes(row.id)},p));}
      for(const mail of row.parcels){if(g.collected?.includes(mail.id)||g.resolved?.includes(row.id))continue;const p=worldAt(level,row.d,mail.lane);push(p,()=>{const z=row.kind==='mail'?1.35:row.kind==='slide'?2.9:2.25,q=project(p,z);q.y-=Math.sin(g.ticks*.045+row.d)*3;ellipse(q.x,q.y,22,22,'#f9e6a128');ellipse(q.x,q.y,16,16,'#fff1b237');envelope(q.x,q.y,.85,mail.value>10);const ground=project(p);ellipse(ground.x,ground.y,9,3,'#7e6d4030');},1);}
    }
    const finish=worldAt(level,level.length);
    push(finish,()=>{for(const x of[-5.1,5.1]){const v=vector(finish.heading),p={...finish,x:finish.x+v.rx*x,y:finish.y+v.ry*x};box(p,.45,.5,4.6,['#b2bf91','#536f55','#77926c']);}box(finish,10.7,.55,.95,['#a8ba86','#496e52','#6e8a61'],3.65);const q=project(finish,4.1);label('山 间 投 递 站',q.x,q.y,17,'#fff0c9');});
    const player=worldAt(level,g.distance,g.x);if(g.state==='lost'&&/跑出了山路|前面没有路/.test(g.reason||'')){const v=vector(g.heading||0);player.x+=v.fx*8;player.y+=v.fy*8;player.heading=g.heading||0;}push(player,()=>courier(g,player),.4);
    things.sort((a,b)=>a.depth-b.depth);for(const item of things)item.fn();
    const vignette=c.createRadialGradient(480,310,200,480,310,620);vignette.addColorStop(0,'#183e2800');vignette.addColorStop(1,'#22482f33');c.fillStyle=vignette;c.fillRect(0,0,960,600);
    // A compact route overview makes the geometry and the completed turn unambiguous.
    roundRect(20,20,207,71,12,'#f8f3dbed','#ffffff70');label(`0${level.id}  ${level.theme==='bamboo'?'竹桥回响':'晨谷邮路'}`,34,41,15,'#315647','left');label(`${Math.floor(g.distance)} / ${level.length} m`,34,65,12,'#71806b','left',600);
    roundRect(129,61,80,5,3,'#d2d6b9');roundRect(129,61,Math.max(3,80*g.distance/level.length),5,3,'#d49b55');
    miniMap(level,g,points);
    if(next&&next.d-g.distance<=28&&next.d-g.distance>0){
      const active=next.d-g.distance<=16,chosen=Boolean(g.pendingTurn),correct=g.pendingTurn===next.dir;
      const msg=chosen?(correct?'方向已记住 · 到路口转弯':'方向选错了'):active?`${next.dir==='left'?'← 左转':'右转 →'}  现在按一次`:`${Math.ceil(next.d-g.distance)} m 后${next.dir==='left'?'左':'右'}转`;
      roundRect(342,24,276,40,20,chosen&&!correct?'#b56346ed':active?'#f6d88bef':'#f8f3dbed','#ffffff60');label(msg,480,44,15,chosen&&!correct?'#fff3d7':'#395545');
    }
    if(g.state==='ready'){
      roundRect(284,509,392,58,12,'#254a3fe8','#d4dec35a');label('山路有弯，来信有归处。',480,530,17,'#fbefd1');label('左右换道 · 空格跳跃 · ↓ 滑行',480,552,12,'#c7d3b9', 'center',500);
    }else if(g.state==='paused'){
      roundRect(387,265,186,57,12,'#254a3fed');label('邮路暂歇',480,293,20,'#f8edcf');
    }
  }
  return {draw};
}
