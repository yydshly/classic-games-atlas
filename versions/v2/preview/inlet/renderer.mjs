// 汀光织界 / INLET WEAVER — original code-native nautical textile chart.
export const SCENE_WIDTH=880,SCENE_HEIGHT=640;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fract=n=>n-Math.floor(n);
const noise=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
const ell=(c,x,y,rx,ry,fill,stroke,w=1)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}};
const line=(c,points,color,w=1)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=w;c.stroke();};
const poly=(c,points,fill,stroke,w=1)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}};
const rr=(c,x,y,w,h,r,fill,stroke,lw=1)=>{c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}};
function gridOf(g){const w=g.grid?.width||22,h=g.grid?.height||16;return{width:w,height:h,claimed:g.grid?.claimed||[]};}
export function layout(g){const grid=gridOf(g),tile=Math.min(880/grid.width,640/grid.height),left=(880-grid.width*tile)/2,top=(640-grid.height*tile)/2;return{width:880,height:640,tile,left,top,gridWidth:grid.width,gridHeight:grid.height,point(x,y){return{x:left+(x+.5)*tile,y:top+(y+.5)*tile};}};}
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');canvas.width=880;canvas.height=640;this.paper=null;}
 layout(g){return layout(g);}
 draw(g){const c=this.ctx,l=layout(g),grid=gridOf(g),time=Number(g.time)||0;c.clearRect(0,0,880,640);c.lineJoin='round';c.lineCap='round';water(c,l,time);claimed(c,l,grid,g);capture(c,l,g);basins(c,l,g);trail(c,l,g,time);for(let i=0;i<(g.enemies||[]).length;i++){const e=g.enemies[i],p=l.point(e.x,e.y);c.save();c.translate(p.x,p.y);c.scale(l.tile/40,l.tile/40);current(c,e,i,time,g.state==='playing');c.restore();}if(g.patroller){const p=l.point(g.patroller.x,g.patroller.y);c.save();c.translate(p.x,p.y);c.scale(l.tile/40,l.tile/40);shoreWalker(c,g.patroller,time,g.state==='playing');c.restore();}if(g.player){const p=l.point(g.player.x,g.player.y);c.save();c.translate(p.x,p.y);c.scale(l.tile/40,l.tile/40);needle(c,Boolean(g.drawArmed),Number(g.player.invulnerable)||0);c.restore();}chartEdge(c,l);}
}

function water(c,l,time){
 const sea=c.createLinearGradient(0,0,880,640);sea.addColorStop(0,'#2d6572');sea.addColorStop(.45,'#347c83');sea.addColorStop(1,'#225365');c.fillStyle=sea;c.fillRect(0,0,880,640);
 // Long, quiet bathymetric contours and submerged coral sketchwork are purely
 // environmental. They do not imply walls, colliders, pickups or safe areas.
 c.save();c.strokeStyle='#a9d0be0c';c.lineWidth=1;
 for(let j=0;j<11;j++){const y=35+j*58;c.beginPath();c.moveTo(-20,y);for(let x=-20;x<930;x+=90)c.bezierCurveTo(x+22,y-25,x+63,y+25,x+90,y+Math.sin(j+x/190)*11);c.stroke();}
 for(let i=0;i<50;i++){const x=noise(i,13)*880,y=noise(i,29)*640,s=5+noise(i,33)*9;c.save();c.translate(x,y);c.rotate(noise(i,3)*Math.PI);if(i%3===0){line(c,[[0,s],[0,-s],[s*.55,-s*1.6]],'#b9ccab0c',1.5);line(c,[[0,0],[-s*.7,-s*.7],[-s*.7,-s*1.3]],'#b9ccab0c',1.3);line(c,[[0,-s*.6],[s*.5,-s*.2],[s*.9,-s*.5]],'#b9ccab0c',1.3);}else ell(c,0,0,s,s*.3,null,'#b6d4bd0b',1);c.restore();}
 // Sunward surface threads drift only with the model's actual game clock;
 // time stops in paused/terminal snapshots, so no renderer timer is required.
 for(let i=0;i<75;i++){const x=noise(i,41)*880,y=noise(i,47)*640,phase=time*.6+i*.8,w=8+noise(i,19)*20;const shift=Math.sin(phase)*3;c.strokeStyle=i%4?'#c5e2cf12':'#d1ddbb1c';c.lineWidth=.7;c.beginPath();c.moveTo(x-w/2,y+shift);c.quadraticCurveTo(x,y-2+shift,x+w/2,y+shift);c.stroke();}
 for(let i=0;i<450;i++){c.fillStyle=i%2?'#d1e9d208':'#163b4a0c';c.fillRect(noise(i,51)*880,noise(i,71)*640,1.3,.6);}
 c.restore();
}

function claimed(c,l,grid,g){const t=l.tile,w=grid.width,h=grid.height,isSafe=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&Boolean(grid.claimed[y*w+x]);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!isSafe(x,y))continue;const px=l.left+x*t,py=l.top+y*t,n=noise(x+5,y+7),initial=Array.isArray(g.initialSafe)?Boolean(g.initialSafe[y*w+x]):true;
  c.fillStyle=initial?'#aebfa5':'#c5cfa9';c.fillRect(px-.15,py-.15,t+.3,t+.3);
  // Interleaved fibers cross cell boundaries; no debug-grid border is drawn.
  c.save();c.beginPath();c.rect(px,py,t,t);c.clip();for(let k=0;k<5;k++){line(c,[[px,py+4+k*t/5],[px+t,py+4+k*t/5]],initial?'#7d9e8b1a':'#97aa7b27',.8);line(c,[[px+3+k*t/5,py],[px+3+k*t/5,py+t]],'#ece9c32b',.7);}
  if(n>.82){poly(c,[[px+t*.25,py+t*.24],[px+t*.44,py+t*.31],[px+t*.43,py+t*.47],[px+t*.21,py+t*.43]],initial?'#8ca68f22':'#b1ba8f44');}
  c.restore();
  // Exposed rims follow actual claimed neighbours, including interior islands.
  const edges=[{safe:isSafe(x,y-1),a:[px,py+1],b:[px+t,py+1],shadow:[0,3]},{safe:isSafe(x+1,y),a:[px+t-1,py],b:[px+t-1,py+t],shadow:[-3,0]},{safe:isSafe(x,y+1),a:[px,py+t-1],b:[px+t,py+t-1],shadow:[0,-3]},{safe:isSafe(x-1,y),a:[px+1,py],b:[px+1,py+t],shadow:[3,0]}];
  for(const edge of edges){if(edge.safe)continue;line(c,[[edge.a[0]+edge.shadow[0],edge.a[1]+edge.shadow[1]],[edge.b[0]+edge.shadow[0],edge.b[1]+edge.shadow[1]]],'#6b968846',4);line(c,[edge.a,edge.b],'#e3ddaf',2.3);}
  // A few small chart stitches on stable terrain are deliberately subdued.
  if(initial&&n>.87){const xx=px+t*.5,yy=py+t*.5;line(c,[[xx-3,yy],[xx+3,yy]],'#77958855',1);line(c,[[xx,yy-3],[xx,yy+3]],'#77958855',1);}
 }
}

function capture(c,l,g){for(const e of g.effects||[]){if(e.kind!=='capture'||!Array.isArray(e.cells))continue;const alpha=clamp(Number(e.ttl)/Math.max(.001,Number(e.duration)||1),0,1);c.save();c.globalAlpha=alpha*.7;for(const cell of e.cells){const p=l.point(cell.x,cell.y);rr(c,p.x-l.tile/2+2,p.y-l.tile/2+2,l.tile-4,l.tile-4,3,'#f6df9d44','#f5ddb0',1.2);}c.restore();}}

function trail(c,l,g,time){if(!Array.isArray(g.trail)||!g.trail.length)return;const points=g.trail.map(p=>l.point(p.x,p.y));const start=g.trailStart||g.trailAnchor;if(start)points.unshift(l.point(start.x,start.y));c.save();c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle='#163d4f88';c.lineWidth=9;c.stroke();c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle='#e5c37f';c.lineWidth=3.4;c.stroke();c.setLineDash([3,7]);c.lineDashOffset=-time*8;c.strokeStyle='#fff1b9';c.lineWidth=1.4;c.stroke();c.setLineDash([]);for(const p of points){ell(c,p.x,p.y,2.2,2.2,'#f3e6af');}c.restore();}

function current(c,e,index,time,animate){const moving=animate?Math.sin(time*3+(index+1)*1.4):0,col=index%2?'#b3a0c1':'#c9a1a7',dark=index%2?'#5c657e':'#826177';ell(c,0,3,17,9,'#153f4a44');c.save();if(Number.isFinite(e.dx)&&Number.isFinite(e.dy))c.rotate(Math.atan2(e.dy,e.dx));else if(typeof e.dir==='object'&&e.dir)c.rotate(Math.atan2(e.dir.y,e.dir.x));else if(Number.isInteger(e.dir))c.rotate([-Math.PI/2,0,Math.PI/2,Math.PI][e.dir]||0);
 // Open, pointed ink currents contrast with the player's closed gold needle.
 for(let i=0;i<6;i++){const a=i*Math.PI/3,r=15+(i%2)*2;line(c,[[Math.cos(a)*6,Math.sin(a)*6],[Math.cos(a)*r,Math.sin(a)*r+moving]],col,1.5);ell(c,Math.cos(a)*r,Math.sin(a)*r+moving,1.5,1.5,'#d0b7bd');}
 poly(c,[[-11,0],[-5,-8],[4,-10],[11,-1],[8,7],[-2,10]],dark,col,1.3);poly(c,[[-5,-1],[0,-6],[6,0],[0,6]],col,'#dfc0c3',.5);ell(c,1,-1,1.8,1.8,'#f2ddce');c.restore();}

function shoreWalker(c,e,time,animate){const moving=animate?Math.sin(time*7)*1.5:0;ell(c,0,4,15,7,'#647d6c22');for(const side of[-1,1]){line(c,[[side*7,-3],[side*14,-7-moving],[side*18,-4]],'#98734c',2);line(c,[[side*7,3],[side*15,7+moving],[side*17,10]],'#98734c',2);}poly(c,[[-12,0],[-7,-10],[5,-12],[13,-3],[10,9],[-3,11]],'#bb8e62','#e8c58c',1);poly(c,[[-5,-6],[3,-8],[8,-2],[2,3],[-5,1]],'#d4ae79');line(c,[[-4,4],[5,3]],'#7b7056',1);ell(c,-4,-3,1,1,'#7c684c');ell(c,5,-4,1,1,'#7c684c');}

function needle(c,armed,invulnerable=0){if(invulnerable>0){c.save();c.setLineDash([3,4]);ell(c,0,0,23,23,null,'#d0eee5',2);c.restore();}const glow=c.createRadialGradient(0,0,0,0,0,26);glow.addColorStop(0,'#f6e2a13b');glow.addColorStop(1,'#f6e2a100');c.fillStyle=glow;c.fillRect(-27,-27,54,54);ell(c,0,2,15,12,'#123e4a55');if(armed)ell(c,0,0,19,19,null,'#f0cf8c99',1.5);poly(c,[[0,-18],[10,-4],[7,12],[0,18],[-7,12],[-10,-4]],'#e6c58b','#fff0bc',1.6);poly(c,[[0,-14],[0,14],[-6,9],[-8,-3]],'#ba9766');poly(c,[[0,-14],[7,-3],[5,9],[0,14]],'#f3e1b3');line(c,[[0,-9],[0,8]],'#416a66',1.4);ell(c,0,-3,2.3,3,'#3c7474');ell(c,0,-3,1,1.5,'#abd1bb');}

function chartEdge(c,l){c.save();c.strokeStyle='#e0d6a452';c.lineWidth=1;c.strokeRect(l.left+.5,l.top+.5,l.gridWidth*l.tile-1,l.gridHeight*l.tile-1);for(let x=1;x<l.gridWidth;x++){const px=l.left+x*l.tile;line(c,[[px,l.top+1],[px,l.top+5]],'#456e6177',1);line(c,[[px,l.top+l.gridHeight*l.tile-5],[px,l.top+l.gridHeight*l.tile-1]],'#456e6177',1);}for(let y=1;y<l.gridHeight;y++){const py=l.top+y*l.tile;line(c,[[l.left+1,py],[l.left+5,py]],'#456e6177',1);line(c,[[l.left+l.gridWidth*l.tile-5,py],[l.left+l.gridWidth*l.tile-1,py]],'#456e6177',1);}c.restore();}

// Fixed initial basin extents and model-owned completion. This pass runs
// before risk line, currents, shoreline walker and needle, so it cannot paint
// over their decisive information. There is no filled influence-area overlay.
function basins(c,l,g){
 if(!Array.isArray(g.objectives))return;
 g.objectives.forEach((objective,index)=>{
  if(!Array.isArray(objective.cells)||!objective.cells.length)return;
  const cells=new Set(objective.cells.map(p=>p.x+','+p.y)),t=l.tile;
  c.save();c.lineWidth=1;c.strokeStyle=objective.complete?'#dbe8c22a':'#f1dba331';c.setLineDash([4,8]);c.beginPath();
  for(const p of objective.cells){const x=l.left+p.x*t,y=l.top+p.y*t;
   if(!cells.has(p.x+','+(p.y-1))){c.moveTo(x,y+2);c.lineTo(x+t,y+2);}
   if(!cells.has((p.x+1)+','+p.y)){c.moveTo(x+t-2,y);c.lineTo(x+t-2,y+t);}
   if(!cells.has(p.x+','+(p.y+1))){c.moveTo(x,y+t-2);c.lineTo(x+t,y+t-2);}
   if(!cells.has((p.x-1)+','+p.y)){c.moveTo(x+2,y);c.lineTo(x+2,y+t);}
  }
  c.stroke();c.setLineDash([]);
  if(objective.labelAt&&Number.isFinite(objective.labelAt.x)&&Number.isFinite(objective.labelAt.y)){
   const p=l.point(objective.labelAt.x,objective.labelAt.y);c.translate(p.x,p.y);c.scale(t/40,t/40);
   if(objective.complete){rr(c,-14,-14,28,28,6,'#bacdaaee','#e6e5bc',1.2);}
   else ell(c,0,0,15,15,'#244f59d9','#dbd7a7bb',1.2);
   // Number remains on completed markers, too; its fixed correspondence with
   // the DOM list is not represented only by hue or a transient animation.
   c.fillStyle=objective.complete?'#315c50':'#e4e4c1';c.font='700 15px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';
   if(objective.complete){c.fillText(String(index+1),0,-5);c.fillStyle='#30594d';c.font='700 8px system-ui,sans-serif';c.fillText('✓',0,7);}
   else c.fillText(String(index+1),0,.5);
  }
  c.restore();
 });
}
