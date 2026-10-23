// 梯港拾星 / LADDERLIGHT — original code-native harbor miniature.
export const SCENE_WIDTH=1008,SCENE_HEIGHT=720;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
const rr=(c,x,y,w,h,r,fill,stroke,lw=1)=>{c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}};
const ell=(c,x,y,rx,ry,fill,stroke,lw=1)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}};
const line=(c,ps,color,w=1)=>{c.beginPath();ps.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=w;c.stroke();};
const poly=(c,ps,fill,stroke,lw=1)=>{c.beginPath();ps.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}};
function gridOf(g){const tiles=Array.isArray(g.tiles)?g.tiles:[];return{tiles,width:g.width||tiles[0]?.length||21,height:g.height||tiles.length||15};}
export function layout(g){const grid=gridOf(g),tile=Math.min(1008/grid.width,720/grid.height),left=(1008-grid.width*tile)/2,top=(720-grid.height*tile)/2;return{width:1008,height:720,tile,left,top,gridWidth:grid.width,gridHeight:grid.height,point(x,y){return{x:left+(x+.5)*tile,y:top+(y+.5)*tile};}};}
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');canvas.width=1008;canvas.height=720;this.backdrops=new Map;this.motion=new Map;this.lastLevel=null;this.lastTime=-1;}
 layout(g){return layout(g);}
 movement(id,a,g){const now=Number(g.time)||0,old=this.motion.get(id);let changedAt=old?.changedAt??-Infinity;if(old&&(old.x!==a.x||old.y!==a.y))changedAt=now;this.motion.set(id,{x:a.x,y:a.y,changedAt});return g.state==='playing'&&now-changedAt<.15;}
 draw(g){
  const c=this.ctx,l=layout(g),grid=gridOf(g),time=Number(g.time)||0,playing=g.state==='playing';
  if(this.lastLevel!==g.level||time<this.lastTime)this.motion.clear();this.lastLevel=g.level;this.lastTime=time;
  c.clearRect(0,0,1008,720);c.lineJoin='round';c.lineCap='round';
  const level=Number(g.level)||1;if(!this.backdrops.has(level))this.backdrops.set(level,harborBackdrop(level));c.drawImage(this.backdrops.get(level),0,0);
  const holes=(g.holes||[]).filter(h=>h.remaining>0),holeKeys=new Set(holes.map(h=>h.x+','+h.y)),get=(x,y)=>grid.tiles[y]?.[x]||'.';
  for(let y=0;y<grid.height;y++)for(let x=0;x<grid.width;x++){
   const kind=get(x,y);if(kind==='.'||holeKeys.has(x+','+y))continue;
   c.save();c.translate(l.left+x*l.tile,l.top+y*l.tile);c.scale(l.tile/48,l.tile/48);
   if(kind==='#')steel(c,x,y,get(x,y-1));else if(kind===':')brick(c,x,y,get(x,y-1));else if(kind==='H')ladder(c,x,y);else if(kind==='-')rope(c,x,y);c.restore();
  }
  for(const h of holes){const p=l.point(h.x,h.y);c.save();c.translate(p.x,p.y);c.scale(l.tile/48,l.tile/48);hole(c,h);c.restore();}
  if(g.exit){const p=l.point(g.exit.x,g.exit.y);c.save();c.translate(p.x,p.y);c.scale(l.tile/48,l.tile/48);gate(c,Boolean(g.exit.open));c.restore();}
  for(const core of g.cores||[]){if(core.collected)continue;const p=l.point(core.x,core.y),embedded=Boolean(core.buried)&&get(core.x,core.y)===':'&&!holeKeys.has(core.x+','+core.y);c.save();c.translate(p.x,p.y);c.scale(l.tile/48,l.tile/48);lampCore(c,embedded);c.restore();}
  for(const e of g.enemies||[]){const p=l.point(e.x,e.y),moving=this.movement('guard-'+e.id,e,g);c.save();c.translate(p.x,p.y);c.scale(l.tile/48,l.tile/48);moth(c,e,time,moving,playing);c.restore();}
  if(g.player){const p=l.point(g.player.x,g.player.y),moving=this.movement('player',g.player,g);c.save();c.translate(p.x,p.y);c.scale(l.tile/48,l.tile/48);worker(c,g.player,time,moving,playing);c.restore();}
  c.strokeStyle='#d3d8ae35';c.lineWidth=1;c.strokeRect(l.left+.5,l.top+.5,l.gridWidth*l.tile-1,l.gridHeight*l.tile-1);
 }
}

function harborBackdrop(level){
 const canvas=document.createElement('canvas');canvas.width=1008;canvas.height=720;const c=canvas.getContext('2d');
 const sky=c.createLinearGradient(0,0,1008,720);sky.addColorStop(0,level===2?'#315f63':'#2a575d');sky.addColorStop(.6,'#234b52');sky.addColorStop(1,'#173d49');c.fillStyle=sky;c.fillRect(0,0,1008,720);
 // Distant warehouses and harbor rigs are low-contrast scenery, never solid
 // platforms: actual traversable brick/steel/ladder/rope is drawn above them.
 for(let layer=0;layer<2;layer++)for(let i=0;i<10;i++){
  const x=i*116-38+(layer?57:0),y=240+layer*137+noise(i,level)*90,w=79+noise(i,4)*55,h=105+noise(i,7)*125;
  c.fillStyle=layer?'#40716a22':'#82a48a0c';c.fillRect(x,y,w,h);poly(c,[[x-5,y],[x+w*.42,y-28],[x+w+5,y],[x+w,y+4],[x,y+4]],layer?'#6f927115':'#8faa880b');
  for(let j=0;j<3;j++)for(let k=0;k<3;k++){c.fillStyle=(i+j+k)%6===0?'#d0be7e1a':'#143a4214';c.fillRect(x+13+k*22,y+19+j*29,10,16);}
 }
 for(let i=0;i<6;i++){const x=70+i*185,y=170+noise(i,level+2)*115;line(c,[[x,660],[x,y],[x+100,y+56]],'#97ad8e0b',5);line(c,[[x-75,y+54],[x+100,y+56],[x+47,y+115]],'#b4bf930b',1.5);}
 const mist=c.createLinearGradient(0,430,0,720);mist.addColorStop(0,'#8fb29900');mist.addColorStop(1,'#a0b69a0f');c.fillStyle=mist;c.fillRect(0,430,1008,290);
 for(let i=0;i<60;i++){const x=noise(i,13)*1008,y=515+noise(i,19)*205;line(c,[[x,y],[x+8+noise(i,3)*35,y]],'#b2c2a20d',1);}
 const light=c.createRadialGradient(818,80,0,818,80,490);light.addColorStop(0,'#e8d8a11c');light.addColorStop(1,'#e8d8a100');c.fillStyle=light;c.fillRect(0,0,1008,720);
 for(let i=0;i<700;i++){c.fillStyle=i%3?'#c9ddbd07':'#0b2c3409';c.fillRect(noise(i,23)*1008,noise(i,31)*720,1.2,.7);}
 return canvas;
}

function steel(c,x,y,above){
 const n=noise(x+5,y+9);c.fillStyle='#55756c';c.fillRect(0,0,48.5,48.5);
 rr(c,1,4,46,39,2,n>.5?'#668477':'#607e72','#3f625d',.8);
 c.fillStyle='#829b83';c.fillRect(0,0,48.5,4);c.fillStyle='#345950';c.fillRect(0,43,48.5,5.5);
 line(c,[[4,10],[14,10],[34,36],[44,36]],'#91a48a36',2);line(c,[[4,36],[15,36],[35,10],[44,10]],'#294e4938',2);
 for(const xx of[5,43])for(const yy of[7,40]){ell(c,xx,yy,1.7,1.7,'#b1b18b');line(c,[[xx-1,yy],[xx+1,yy]],'#607663',.6);}
 if(above==='.'||above==='H'||above==='-'){line(c,[[1,1],[47,1]],'#b1c1a3',1);}
}
function brick(c,x,y,above){
 c.save();c.beginPath();c.rect(0,0,48,48);c.clip();
 c.fillStyle='#8e795d';c.fillRect(0,0,48.5,48.5);
 for(let row=0;row<3;row++){const offset=(row+y)%2?12:0;for(let col=-1;col<3;col++){const xx=col*24+offset,yy=row*16;rr(c,xx+1,yy+1,22,14,1,['#b19670','#af916c','#b79c75'][(row+col+x+6)%3]);line(c,[[xx+3,yy+3],[xx+20,yy+3]],'#dec29366',.8);if(noise(x*9+col,y*5+row)>.7)line(c,[[xx+12,yy+5],[xx+10,yy+9],[xx+13,yy+12]],'#7c755744',.8);}}
 c.fillStyle='#5a65513d';c.fillRect(0,45,48.5,3.5);if(above==='.'||above==='H'||above==='-')line(c,[[1,1],[47,1]],'#dfc99a',1.6);c.restore();
}
function ladder(c){
 line(c,[[15,-1],[15,49]],'#315a4c',5);line(c,[[33,-1],[33,49]],'#315a4c',5);
 line(c,[[15,-1],[15,49]],'#b2c69e',3.3);line(c,[[33,-1],[33,49]],'#b2c69e',3.3);
 for(let y=6;y<49;y+=10){line(c,[[15,y+1],[33,y+1]],'#4c785d',4);line(c,[[15,y],[33,y]],'#c8d0a3',2.8);}
}
function rope(c,x,y){line(c,[[0,6],[48,6]],'#254a46',5);line(c,[[0,4],[48,4]],'#c7b581',2.8);for(let xx=2;xx<49;xx+=7)line(c,[[xx,2],[xx+2,6]],'#e0d09a99',.7);}

function hole(c,h){
 const remain=Math.max(0,Number(h.remaining)||0),total=Math.max(.001,Number(h.duration)||5.5),p=clamp(remain/total,0,1);
 poly(c,[[-24,-24],[-17,-24],[-19,-16],[-24,-13]],'#c7a976');poly(c,[[24,-24],[17,-24],[19,-16],[24,-13]],'#c7a976');
 line(c,[[-23,-9],[-23,17],[-17,22],[17,22],[23,17],[23,-9]],'#b6a67877',1.5);
 rr(c,-17,13,34,4,2,'#193e4355');if(p>0)rr(c,-17,13,34*p,4,2,p<.28?'#e0ac70':'#c6c290');
 c.fillStyle='#d9d2a3';c.font='650 10px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(remain.toFixed(1),0,4);
 if(p<.28){line(c,[[-5,-13],[0,-8],[5,-13]],'#e0bc7c',1.5);}
}

function lampCore(c,embedded=false){
 if(embedded){rr(c,-14,-17,28,34,3,'#a58b62','#dec492',1);line(c,[[-12,-14],[-7,-17],[12,-14]],'#e3c99a88',1);}
 c.save();if(embedded)c.globalAlpha=.7;
 const glow=c.createRadialGradient(0,0,0,0,0,21);glow.addColorStop(0,'#e8d29538');glow.addColorStop(1,'#e8d29500');c.fillStyle=glow;c.fillRect(-23,-23,46,46);
 poly(c,[[0,-14],[8,-6],[7,9],[0,14],[-7,9],[-8,-6]],'#ddc488','#f6e0a9',1);poly(c,[[0,-9],[4,-3],[3,6],[0,9],[-3,6],[-4,-3]],'#fff0b5');line(c,[[-4,-6],[4,-6]],'#a58c5d',1);line(c,[[-4,8],[4,8]],'#a58c5d',1);ell(c,0,0,2,3,'#e8b964');c.restore();if(embedded){line(c,[[-12,-4],[-7,-1]],'#8f7d5b',1.3);line(c,[[8,7],[12,4]],'#8f7d5b',1.3);}
}
function gate(c,open){
 if(open){const glow=c.createRadialGradient(0,-3,0,0,-3,37);glow.addColorStop(0,'#f0d69d44');glow.addColorStop(1,'#f0d69d00');c.fillStyle=glow;c.fillRect(-40,-42,80,80);}
 rr(c,-18,-23,36,45,3,'#567b6b','#a8ba91',1);rr(c,-13,-18,26,40,9,open?'#ead49a':'#2e5a56','#c5c79b',1.5);
 if(open){rr(c,-7,-10,14,28,6,'#fff0b8');line(c,[[-4,3],[0,-2],[4,3]],'#af9b60',1.5);line(c,[[0,-1],[0,10]],'#af9b60',1.5);}
 else{line(c,[[-8,-12],[-8,19]],'#879b78',2);line(c,[[0,-15],[0,20]],'#879b78',2);line(c,[[8,-12],[8,19]],'#879b78',2);rr(c,-5,0,10,9,2,'#b5a16b');ell(c,0,-1,4,4,null,'#b5a16b',1.5);}
 poly(c,[[-22,-21],[-12,-29],[12,-29],[23,-21]],'#9bad83','#c4c69b',.8);ell(c,0,-24,2,2,open?'#f3dfa6':'#688a70');
}

function worker(c,p,time,moving,playing){
 const dir=p.dir===-1?-1:1,pose=p.pose||'stand',activeDig=pose==='dig'&&Number(p.actionTimer)>0,swing=moving?Math.sin(time*13)*3:0;
 ell(c,0,20,11,3.6,'#163b3d66');c.save();c.scale(dir,1);
 if(pose==='fall')c.rotate(-.08);if(pose==='rope')c.translate(0,8);const legY=pose==='rope'?14:18;
 line(c,[[-4,10],[-5+swing,legY]],'#355d58',4);line(c,[[4,10],[5-swing,legY]],'#355d58',4);
 ell(c,-5+swing,legY+1,4,2,'#c7b993');ell(c,5-swing,legY+1,4,2,'#c7b993');
 poly(c,[[-9,-7],[-5,-13],[6,-13],[10,-5],[10,10],[3,15],[-3,11],[-10,13]],'#82b1a0','#2c5b54',1);poly(c,[[-9,-6],[-4,-10],[-5,10],[-10,12]],'#bad0b055');
 line(c,[[-6,6],[8,6]],'#c2a574',3);rr(c,-2,2,6,8,1,'#d8bd83');line(c,[[-5,-10],[6,5]],'#dbd5af',2);rr(c,3,-1,6,7,1,'#5e8f7b');
 ell(c,0,-17,8,9,'#dfc19a');poly(c,[[-9,-18],[-8,-25],[-1,-29],[8,-24],[9,-16],[4,-20],[-4,-19]],'#8fb5a0','#466e5d',.8);rr(c,2,-23,8,5,2,'#c5ab73');ell(c,7,-21,2,1.6,'#f6e2a5');ell(c,3,-16,1,1.3,'#34574e');line(c,[[3,-12],[6,-12]],'#af8967',1);
 let a=[11,-1],b=[-10,1];
 if(pose==='climb'){a=[9,-15+swing];b=[-10,-11-swing];}
 if(pose==='rope'){a=[8,-28];b=[-8,-28];}
 if(pose==='fall'){a=[13,-17];b=[-12,-18];}
 if(activeDig){a=[13,8+(playing?Math.sin(time*12)*2:0)];b=[4,-1];}
 line(c,[[7,-6],a],'#82b1a0',5);line(c,[[-7,-5],b],'#82b1a0',5);ell(c,...a,2.5,2.5,'#dfc19a');ell(c,...b,2.5,2.5,'#dfc19a');
 if(activeDig){line(c,[[3,-1],[19,13]],'#bd9d68',2.5);poly(c,[[15,11],[24,14],[23,22],[17,20]],'#bbc7a3','#5c8068',.8);if(playing){poly(c,[[21,25],[25,23],[28,26],[25,29]],'#ceb080');}}
 else{line(c,[[a[0],a[1]],[a[0]+1,a[1]+4]],'#bea577',1);rr(c,a[0]-1,a[1]+3,7,9,2,'#c6a36a','#8a8c60',.8);ell(c,a[0]+2.5,a[1]+7,1.5,2.5,'#f4dfa3');}
 c.restore();
}

function moth(c,e,time,moving,playing){
 const trapped=e.state==='trapped',warning=e.state==='warning',chasing=e.state==='chasing',dir=e.dir===-1?-1:1,flap=moving?Math.sin(time*12+Number(e.id))*2:0;
 ell(c,0,18,13,4,'#14383d66');c.save();c.scale(dir,1);
 if(trapped)c.translate(0,8);
 const spread=trapped?7:18;
 poly(c,[[-4,-7],[-spread,-19-flap],[-spread-3,-6],[-10,9],[-4,5]],'#84a798','#c5c49a',1);
 poly(c,[[4,-7],[spread,-19+flap],[spread+3,-6],[10,9],[4,5]],chasing?'#b7a06d':'#91ad96','#d3c694',1);
 line(c,[[-6,-5],[-spread+1,-13]],'#436b63',1);line(c,[[6,-5],[spread-1,-13]],'#536f5a',1);
 rr(c,-5,-12,10,27,4,'#8e9871','#d1b97d',1);ell(c,0,-7,4,4,warning?'#f0cd83':'#354e4d','#d0bc8c',.8);ell(c,1,-8,1,1,warning?'#fff0ac':'#91b6a0');
 line(c,[[-2,-13],[-7,-20]],'#c1b68c',1);line(c,[[2,-13],[8,-20]],'#c1b68c',1);
 line(c,[[-3,13],[-5+flap*.4,18]],'#6f8269',2.5);line(c,[[3,13],[5-flap*.4,18]],'#6f8269',2.5);
 if(chasing)line(c,[[24,-5],[29,0],[24,5]],'#e4bb7f',1.8);
 c.restore();
 if(warning){ell(c,0,-4,25,25,null,'#ecd19b77',1.2);rr(c,-20,-42,40,15,4,'#244f52ed','#d4bd84',.8);c.fillStyle='#eed7a0';c.font='700 11px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('! '+Math.max(0,Number(e.tellTimer)||0).toFixed(1)+'s',0,-34.5);}
 if(trapped){line(c,[[-13,3],[-8,8],[0,6],[8,8],[13,3]],'#d2bd83',1.4);rr(c,-20,-34,40,15,4,'#214b4fed','#aabc95',.8);c.fillStyle='#d9d4a5';c.font='650 10px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(Math.max(0,Number(e.trapRemaining)||0).toFixed(1)+'s',0,-26.5);}
}
