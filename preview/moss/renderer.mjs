// 苔灯归途 / MOSS PARADE — original code-native woodland art.
// World coordinates are tiles: actor x is its centre, actor y is its feet.
export const SCENE_WIDTH=960,SCENE_HEIGHT=480,TILE=40;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fract=n=>n-Math.floor(n);
const noise=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
const palette=['#6e9c83','#9eae76','#7eaaa0','#a4a77a','#6c978b','#b8a16f'];
const rr=(c,x,y,w,h,r,fill,stroke,lw=1)=>{c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}};
const ell=(c,x,y,rx,ry,fill,stroke,lw=1)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}};
const line=(c,points,col,w=1)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=col;c.lineWidth=w;c.stroke();};
const poly=(c,points,col,stroke,lw=1)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(col){c.fillStyle=col;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}};
function gridOf(g){const source=Array.isArray(g.grid)?g.grid:g.grid?.tiles||[];return{tiles:source,width:g.grid?.width||source[0]?.length||24,height:g.grid?.height||source.length||12};}
export function layout(g){const grid=gridOf(g),tile=Math.min(960/grid.width,480/grid.height);return{width:960,height:480,tile,left:(960-grid.width*tile)/2,top:(480-grid.height*tile)/2,gridWidth:grid.width,gridHeight:grid.height,point(x,y){return{x:this.left+x*tile,y:this.top+y*tile};}};}
export function hitTest(g,x,y){const l=layout(g);const actors=(g.actors||[]).filter(a=>!['rescued','lost'].includes(a.state));for(const a of [...actors].reverse()){const p=l.point(a.x,a.y);if(Math.abs(x-p.x)<=l.tile*.32&&y<=p.y+4&&y>=p.y-l.tile*.95)return{type:'actor',id:a.id,actor:a};}return null;}
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');canvas.width=960;canvas.height=480;this.backdrop=null;}
 layout(g){return layout(g);}
 hitTest(g,x,y){return hitTest(g,x,y);}
 draw(g,selectedId=null,options={}){
  const c=this.ctx,l=layout(g),grid=gridOf(g),time=Number(g.time)||0,animate=g.state==='playing';
  c.clearRect(0,0,960,480);c.lineJoin='round';c.lineCap='round';
  if(!this.backdrop)this.backdrop=makeForest();c.drawImage(this.backdrop,0,0);
  const tile=(x,y)=>grid.tiles[y]?.[x]||'.';
  for(let y=0;y<grid.height;y++)for(let x=0;x<grid.width;x++){const kind=tile(x,y);if(kind==='.')continue;c.save();c.translate(l.left+x*l.tile,l.top+y*l.tile);c.scale(l.tile/40,l.tile/40);if(kind==='~')hazard(c,x,y,time,animate);else if(kind==='=')bridge(c,x,y,tile(x-1,y)==='=',tile(x+1,y)==='=');else terrain(c,kind,x,y,tile(x,y-1),tile(x-1,y),tile(x+1,y));c.restore();}
  if(g.spawn){const p=l.point(g.spawn.x,g.spawn.y);c.save();c.translate(p.x,p.y);c.scale(l.tile/40,l.tile/40);spawnArch(c);c.restore();}
  if(g.exit){const p=l.point(g.exit.x,g.exit.y);c.save();c.translate(p.x,p.y);c.scale(l.tile/40,l.tile/40);beacon(c,time,animate);c.restore();}
  // Draw the historical location beneath living creatures, never over them.
  if(options.incident){const p=l.point(clamp(options.incident.point.x,.3,grid.width-.3),clamp(options.incident.point.y,.4,grid.height-.3));c.save();c.strokeStyle='#e4b78b';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y-4,9,0,Math.PI*2);c.stroke();c.fillStyle='#ffe2bb';c.font='700 13px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('×',p.x,p.y-4);c.restore();}
  const actors=(g.actors||[]).filter(a=>!['rescued','lost'].includes(a.state));
  for(const a of actors){if(a.job?.cells?.length&&['bridging','digging'].includes(a.state)){const progress=clamp(1-Number(a.job.remaining||0)/Math.max(.001,Number(a.job.duration)||1),0,1);for(const cell of a.job.cells){const p=l.point(cell.x,cell.y);c.save();c.setLineDash([3,4]);c.lineWidth=1.5;c.strokeStyle=a.state==='digging'?'#e6c38299':'#d3dfab99';c.strokeRect(p.x+2,p.y+2,l.tile-4,l.tile-4);c.setLineDash([]);c.restore();}const p=l.point(a.x,a.y);rr(c,p.x-11,p.y-l.tile*.98,22,3,2,'#284c4766');if(progress>0)rr(c,p.x-11,p.y-l.tile*.98,22*progress,3,2,'#f3d194');}}
  // The physical miniature remains readable as creatures overlap: selected last.
  const sorted=actors.filter(a=>a.id!==selectedId).sort((a,b)=>a.y-b.y||a.x-b.x);const chosen=actors.find(a=>a.id===selectedId);if(chosen)sorted.push(chosen);
  for(const a of sorted){const p=l.point(a.x,a.y);c.save();c.translate(p.x,p.y);c.scale(l.tile/40,l.tile/40);creature(c,a,time,animate,a.id===selectedId);c.restore();}
  for(const e of g.effects||[]){if(!['dig','fragment','bridge'].includes(e.kind||e.type))continue;const p=l.point(e.x,e.y);c.save();c.translate(p.x,p.y);c.globalAlpha=clamp((e.ttl??1)/(e.duration??e.max??1),0,1);fragment(c,e.kind||e.type);c.restore();}
  // Optional controller preview. It is an explicit prospective tool, not an
  // invented job or a claim that the action will succeed.
  if(options.previewCells?.length){c.save();c.strokeStyle='#f1d59d';c.lineWidth=2;c.setLineDash([4,4]);for(const cell of options.previewCells){const p=l.point(cell.x,cell.y);c.strokeRect(p.x+2,p.y+2,l.tile-4,l.tile-4);}c.restore();}
 }
}

function makeForest(){
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=480;const c=canvas.getContext('2d');
 const sky=c.createLinearGradient(0,0,0,480);sky.addColorStop(0,'#1f4948');sky.addColorStop(.4,'#47756b');sky.addColorStop(.75,'#6d927b');sky.addColorStop(1,'#92a686');c.fillStyle=sky;c.fillRect(0,0,960,480);
 // Soft paper-mist layers establish a woodland, rather than a flat tile grid.
 for(let layer=0;layer<3;layer++){const base=325+layer*44;c.beginPath();c.moveTo(-30,480);c.lineTo(-30,base);for(let x=-30;x<1000;x+=80)c.quadraticCurveTo(x+40,base-30-noise(x,layer)*65,x+80,base-15+noise(x,layer+4)*22);c.lineTo(1000,480);c.closePath();c.fillStyle=['#355c5a55','#48766566','#6e8b6c88'][layer];c.fill();}
 for(let layer=0;layer<3;layer++)for(let i=0;i<12;i++){const x=noise(i+2,layer+8)*1020-30,w=7+layer*6+noise(i,8)*8,top=-25-noise(i,3)*60,bottom=325+layer*66;c.save();c.globalAlpha=.11+layer*.06;c.fillStyle=layer===2?'#153e3b':'#b7c7a4';c.beginPath();c.moveTo(x-w,top);c.bezierCurveTo(x-w*1.4,120,x+w*.2,240,x-w*1.3,bottom);c.lineTo(x+w*1.4,bottom);c.bezierCurveTo(x+w*.4,230,x+w*1.8,110,x+w,top);c.closePath();c.fill();line(c,[[x,170],[x-48-noise(i,5)*35,111],[x-70,70]],c.fillStyle,Math.max(3,w*.35));line(c,[[x,220],[x+42,153],[x+74,131]],c.fillStyle,Math.max(3,w*.3));c.restore();}
 for(let i=0;i<65;i++){const x=noise(i,7)*1000-20,y=noise(i,9)*155-30;ell(c,x,y,20+noise(i,4)*65,12+noise(i,2)*24,i%2?'#8ba68a14':'#163f3e1b');}
 const light=c.createRadialGradient(760,90,0,760,90,440);light.addColorStop(0,'#e1d6a824');light.addColorStop(1,'#eee3a800');c.fillStyle=light;c.fillRect(0,0,960,480);
 for(let i=0;i<900;i++){const x=noise(i,17)*960,y=noise(i,23)*480;c.fillStyle=i%3?'#e4ecd40a':'#0e302e08';c.fillRect(x,y,1.3,.6);}
 return canvas;
}

function terrain(c,kind,x,y,above,left,right){
 const soil=kind===':',n=noise(x+5,y+7),exposed=!['#',':','='].includes(above);
 c.fillStyle=soil?'#8b7756':'#667865';c.fillRect(0,0,40.5,40.5);
 if(soil){poly(c,[[0,5],[14,3],[28,7],[40,4],[40,16],[22,19],[0,16]],'#a58a60');poly(c,[[0,27],[18,24],[40,29],[40,40],[0,40]],'#77694f');for(let i=0;i<7;i++){const xx=noise(x*8+i,y)*36+2,yy=noise(x,y*8+i)*34+5;ell(c,xx,yy,1.4,.8,'#d1b57b55');}if(n>.5)line(c,[[5,18],[15,21],[23,18],[36,22]],'#554d3d33',1.5);}
 else{poly(c,[[0,0],[24,0],[17,15],[0,19]],'#82917a');poly(c,[[17,15],[40,5],[40,37],[26,40],[29,23]],'#526c5c');if(n>.25){line(c,[[4,9],[14,14],[21,12],[28,19],[25,31]],'#304f4770',1);line(c,[[28,19],[38,18]],'#304f4740',1);}if(n>.64){ell(c,9,28,7,3,'#98a16c55');ell(c,15,30,4,2,'#b4b97a33');}}
 if(left==='.'||left==='~'){c.fillStyle=soil?'#6f624e':'#526d5d';c.fillRect(0,5,3,35);}if(right==='.'||right==='~'){c.fillStyle=soil?'#655f49':'#446358';c.fillRect(37,6,3,34);}
 if(exposed){poly(c,[[-.5,0],[6,-2],[12,1],[20,-2],[29,0],[36,-3],[40.5,0],[40.5,5],[30,7],[21,5],[12,7],[0,5]],soil?'#b0ae78':'#a9b886');for(let i=0;i<4;i++){const xx=5+i*9;line(c,[[xx,2],[xx-2,-3-noise(x+i,y)*4],[xx+1,0]],i%2?'#b7c18b':'#8da673',1.3);}if(n>.72){mushroom(c,11,-1,soil?'#c99a6b':'#c0b77e');}}
}
function mushroom(c,x,y,col){line(c,[[x,y],[x,y-7]],'#d3c8a1',2);ell(c,x,y-7,6,3,col);ell(c,x-2,y-8,1,1,'#f0ddae88');}
function hazard(c,x,y,time,animate){const shift=animate?Math.sin(time*2+x)*2:0;c.fillStyle='#244f50';c.fillRect(0,5,40.5,35.5);poly(c,[[0,7],[10,4+shift],[23,7],[40,4-shift],[40,15],[0,15]],'#4b7b6d');line(c,[[4,15+shift],[16,15+shift]],'#a6bd904d',1);line(c,[[25,25-shift],[36,25-shift]],'#b6bf8c44',1);for(let i=0;i<3;i++){const xx=4+i*15;poly(c,[[xx,36],[xx+4,25-noise(x+i,y)*7],[xx+8,36]],'#506b51');}if(noise(x,y)>.5)ell(c,26,11,2,1,'#d5c28b55');}
function bridge(c,x,y,hasLeft,hasRight){ell(c,20,12,24,5,'#28463d22');for(let i=0;i<5;i++){const xx=i*8;poly(c,[[xx,1+(i%2)],[xx+7,0],[xx+7,9],[xx,10]],i%2?'#c2a471':'#b79967','#7b7151',.7);line(c,[[xx+2,3],[xx+5,4]],'#e1c88e66',.8);}line(c,[[0,9],[40,9]],'#756746',2);if(!hasLeft){line(c,[[3,9],[3,22]],'#9b8058',3);}if(!hasRight){line(c,[[37,8],[37,21]],'#9b8058',3);}}

function spawnArch(c){ell(c,0,0,23,6,'#203d3544');poly(c,[[-21,0],[-20,-22],[-11,-36],[6,-39],[20,-24],[22,0]],'#456b57','#a5b288',1);poly(c,[[-13,0],[-12,-19],[-6,-28],[5,-29],[12,-18],[13,0]],'#244b47');line(c,[[-16,-27],[-7,-34],[5,-35],[15,-25]],'#91a571',2);ell(c,-15,-29,9,4,'#a4af73');ell(c,11,-34,10,4,'#91a46b');line(c,[[-7,-39],[-9,-48]],'#a8b787',1.5);poly(c,[[-10,-48],[-17,-44],[-10,-40],[-6,-44]],'#b4bf85');}
function beacon(c,time,animate){const flicker=animate?Math.sin(time*3)*.03:0;const glow=c.createRadialGradient(0,-26,0,0,-26,55);glow.addColorStop(0,'#ffdda866');glow.addColorStop(.5,'#ecc17c22');glow.addColorStop(1,'#eec88100');c.fillStyle=glow;c.fillRect(-60,-85,120,100);ell(c,0,1,26,7,'#294c3840');poly(c,[[-21,0],[-19,-37],[-10,-51],[12,-51],[20,-36],[23,0]],'#58715a','#91a177',1);poly(c,[[-12,1],[-12,-27],[-7,-36],[7,-36],[13,-27],[13,1]],'#2d574a');rr(c,-7,-29,14,26,5,'#f2ce8b');ell(c,0,-17,4.5,8,'#fff0bd');poly(c,[[-24,-37],[-13,-51],[0,-58],[16,-50],[26,-36],[10,-38],[0,-44],[-13,-38]],'#88996b','#adb27a',1);line(c,[[0,-57],[0,-69]],'#c5b77e',2);poly(c,[[0,-70],[7,-65],[0,-60],[-6,-65]],'#d9c18a');line(c,[[-17,-5],[-22,2]],'#9baf7b',3);line(c,[[18,-6],[24,2]],'#9baf7b',3);ell(c,-15,-39,6,2,'#bac18c');c.globalAlpha=1-flicker;ell(c,0,-16,2.5,4.5,'#fff1c4');c.globalAlpha=1;}

function creature(c,a,time,animate,selected){
 const dir=a.dir===-1?-1:1,state=a.state,walking=animate&&state==='walking',working=animate&&['bridging','digging'].includes(state),swing=walking?Math.sin(time*12+(Number(a.id)||0))*2.5:0,bob=walking?Math.abs(Math.sin(time*12+(Number(a.id)||0)))*.7:0;
 const color=typeof a.color==='string'?a.color:palette[(Number(a.id)||0)%palette.length];
 ell(c,0,0,8,2.6,'#173d3650');
 if(selected){ell(c,0,-9,13.5,17,'#c6ecbc0d','#d4e1a8',1.5);line(c,[[-17,-10],[-14,-10]],'#e4d498',1.5);line(c,[[14,-10],[17,-10]],'#e4d498',1.5);}
 c.save();c.translate(0,-bob);c.scale(dir,1);
 if(state==='falling'){c.rotate(-.1*dir);}
 line(c,[[-3,-5],[-4+swing,-.5]],'#35594d',3);line(c,[[3,-5],[4-swing,-.5]],'#35594d',3);ell(c,-4+swing,0,3,1.4,'#c5c39a');ell(c,4-swing,0,3,1.4,'#c5c39a');
 poly(c,[[-7,-18],[-4,-23],[5,-23],[8,-17],[7,-4],[1,-1],[-7,-4]],color,'#466c57',.6);poly(c,[[-7,-17],[-2,-20],[-3,-4],[-7,-5]],'#e3dfb455');
 ell(c,0,-23,9,9.5,color,'#476f5a',.8);ell(c,2,-23,5.4,5.8,'#e3d9a8');ell(c,2,-24,1,1.5,'#335247');ell(c,6,-24,.8,1.3,'#335247');line(c,[[3,-20],[5,-20]],'#b3926e',.8);
 // A two-leaf hood is an original silhouette, not a borrowed classic sprite.
 line(c,[[-2,-31],[-4,-37]],'#b8c28d',1.2);poly(c,[[-4,-34],[-11,-37],[-13,-34],[-7,-31]],'#aab780');poly(c,[[-4,-35],[0,-40],[5,-39],[2,-34]],'#c0c893');
 let hand=[8,-12],other=[-7,-11];
 if(state==='blocking'){hand=[12,-18];other=[-12,-18];}
 if(state==='falling'){hand=[12,-25];other=[-11,-25];}
 if(state==='bridging'){hand=[11,-13+(working?Math.sin(time*9)*2:0)];}
 if(state==='digging'){hand=[10,-7+(working?Math.sin(time*10)*3:0)];other=[-2,-13];}
 line(c,[[5,-15],hand],color,4);line(c,[[-5,-15],other],color,4);ell(c,hand[0],hand[1],1.8,1.8,'#d5c99a');ell(c,other[0],other[1],1.8,1.8,'#d5c99a');
 if(state==='blocking'){rr(c,-13,-20,26,6,2,'#b8bc91','#7f906d');line(c,[[-9,-17],[-6,-19]],'#fff0bf66',1);line(c,[[4,-17],[7,-19]],'#fff0bf66',1);}
 else if(state==='bridging'){poly(c,[[6,-13],[17,-11],[16,-7],[5,-9]],'#c7a771','#77694d',.7);line(c,[[hand[0],hand[1]],[hand[0]+2,hand[1]-9]],'#9b845c',1.7);rr(c,hand[0]-1,hand[1]-12,7,4,1,'#bbb991');}
 else if(state==='digging'){line(c,[[other[0],other[1]],[hand[0]+2,hand[1]+3]],'#ab925e',1.8);poly(c,[[hand[0]-1,hand[1]+1],[hand[0]+8,hand[1]+4],[hand[0]+6,hand[1]+9],[hand[0]+1,hand[1]+8]],'#acb89b','#55735e',.7);}
 else{line(c,[[hand[0],hand[1]],[hand[0]+2,hand[1]+4]],'#b5ad7c',1);rr(c,hand[0]-1,hand[1]+3,7,8,2,'#e0bf7e','#a89d6a',.7);ell(c,hand[0]+2.5,hand[1]+7,1.5,2.2,'#ffe9ac');}
 c.restore();
 if(selected){rr(c,-10,7,20,12,5,'#e7e9c5','#97b08a',.8);c.fillStyle='#4b7055';c.font='650 8px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(a.id),0,13);}
 if(state==='digging'&&working){const phase=time*5%1;for(let i=0;i<3;i++){const xx=(i-1)*6,yy=2-phase*8;poly(c,[[xx,yy],[xx+3,yy-1],[xx+4,yy+2],[xx+1,yy+3]],'#c5a677');}}
}
function fragment(c,type){for(let i=0;i<3;i++){const x=i*7-9,y=-i*3;poly(c,[[x,y],[x+4,y-2],[x+6,y+2],[x+2,y+4]],type==='bridge'?'#d7b77e':'#b2a077');}}
