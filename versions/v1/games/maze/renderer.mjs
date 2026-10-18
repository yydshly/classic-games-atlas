import {COLS,ROWS,TILE} from './levels.mjs';
const palette={roamer:'#8abdc6',tracker:'#b5a0e2',charger:'#ef8a68'};
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});}
 draw(g,clock=0){
  const c=this.ctx,t=TILE;c.fillStyle='#161f31';c.fillRect(0,0,600,520);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
   const tile=g.grid[y][x],px=x*t,py=y*t;
   c.fillStyle=(x+y)%2?'#263249':'#29364c';c.fillRect(px,py,t,t);
   c.strokeStyle='#1a263a';c.strokeRect(px+.5,py+.5,t-1,t-1);
   if(tile==='#'){
    c.fillStyle='#111b2c';c.fillRect(px+2,py+5,36,35);c.fillStyle='#53647c';c.fillRect(px+2,py+2,36,31);
    c.fillStyle='#43536c';c.fillRect(px+5,py+6,30,25);c.fillStyle='#647890';c.fillRect(px+5,py+5,30,3);
    c.fillStyle='#29394f';for(const [a,b] of [[8,11],[30,11],[8,26],[30,26]])c.fillRect(px+a,py+b,2,2);
   }else if(tile==='+'){
    c.fillStyle='#111928';c.fillRect(px+3,py+7,35,32);c.fillStyle='#ae7350';c.fillRect(px+3,py+3,34,31);
    c.fillStyle='#825237';c.fillRect(px+7,py+7,26,23);c.strokeStyle='#d49b64';c.lineWidth=4;c.strokeRect(px+5,py+5,30,27);
    c.lineWidth=3;c.beginPath();c.moveTo(px+7,py+8);c.lineTo(px+32,py+29);c.moveTo(px+32,py+8);c.lineTo(px+7,py+29);c.stroke();
   }else if((x*17+y*29)%9===0){c.fillStyle='#51607940';c.fillRect(px+10,py+29,5,2);c.fillRect(px+27,py+7,2,4);}
  }
  const ex=g.exit.x*t,ey=g.exit.y*t,open=!g.enemies.length;
  c.fillStyle=open?'#315951':'#37384e';c.fillRect(ex+3,ey+3,34,34);c.strokeStyle=open?'#a6e4be':'#78758e';c.lineWidth=2;c.strokeRect(ex+6,ey+5,28,30);
  c.fillStyle=open?'#a6e4be':'#8f89a8';c.font='bold 21px monospace';c.textAlign='center';c.fillText(open?'↗':'⌑',ex+20,ey+27);
  if(open){c.globalAlpha=.15+Math.sin(clock*4)*.08;c.fillStyle='#8de9b0';c.fillRect(ex-3,ey-3,46,46);c.globalAlpha=1;}
  for(const i of g.items){const x=i.x*t+20,y=i.y*t+20;c.save();c.translate(x,y+Math.sin(clock*4)*2);c.fillStyle='#17283b';c.beginPath();c.arc(0,0,14,0,Math.PI*2);c.fill();c.strokeStyle='#d8bc78';c.lineWidth=2;c.stroke();c.fillStyle='#ffe0a1';c.font='bold 16px monospace';c.textAlign='center';c.fillText({capacity:'＋',range:'↔',speed:'»'}[i.type],0,6);c.restore();}
  for(const b of g.bombs){const x=b.x*t+20,y=b.y*t+22,pulse=1+.06*Math.sin(clock*(b.fuse<.7?32:9));c.save();c.translate(x,y);c.scale(pulse,pulse);c.fillStyle='#111727';c.beginPath();c.ellipse(0,4,15,12,0,0,Math.PI*2);c.fill();const grad=c.createRadialGradient(-4,-5,1,0,0,15);grad.addColorStop(0,'#657589');grad.addColorStop(1,'#11192a');c.fillStyle=grad;c.beginPath();c.arc(0,0,13,0,Math.PI*2);c.fill();c.strokeStyle=b.fuse<.7?'#ff8265':'#e0b478';c.lineWidth=2;c.beginPath();c.arc(0,0,16,-Math.PI/2,-Math.PI/2+Math.PI*2*b.fuse/2.4);c.stroke();c.fillStyle='#e5b56e';c.fillRect(-3,-15,6,6);c.strokeStyle='#ffba64';c.beginPath();c.moveTo(1,-14);c.quadraticCurveTo(9,-26,12,-18);c.stroke();c.fillStyle='#fff4b0';c.fillRect(10,-21,4,4);c.restore();}
  for(const f of g.flames){const x=f.x*t,y=f.y*t;c.globalAlpha=Math.min(1,f.ttl/.16);c.fillStyle='#ef775355';c.fillRect(x,y,40,40);c.fillStyle='#ed864e';c.fillRect(x+4,y+9,32,22);c.fillRect(x+9,y+4,22,32);c.fillStyle='#ffc36b';c.fillRect(x+7,y+13,26,14);c.fillRect(x+13,y+7,14,26);c.fillStyle='#ffe9ac';c.fillRect(x+15,y+13,10,14);c.globalAlpha=1;}
  const actors=[...g.enemies.map(e=>({...e,enemy:true})),g.player].sort((a,b)=>a.y-b.y);
  for(const a of actors){
   const blend=Math.min(1,a.age/(a.animationStep||.22)),x=(a.fromX+(a.x-a.fromX)*blend)*t+20,y=(a.fromY+(a.y-a.fromY)*blend)*t+20;
   if(!a.enemy&&a.invulnerable>0&&Math.floor(clock*12)%2===0)continue;
   c.save();c.translate(x,y);c.fillStyle='#0c152b88';c.beginPath();c.ellipse(0,11,15,7,0,0,Math.PI*2);c.fill();
   const walk=Math.sin(a.age*24)*(blend<1?2:0);c.fillStyle='#111a2c';c.fillRect(-10,7+walk,7,7);c.fillRect(3,7-walk,7,7);
   c.fillStyle=a.enemy?palette[a.type]:'#e8e5cd';c.beginPath();c.roundRect(-13,-13,26,26,a.type==='charger'?3:8);c.fill();
   c.fillStyle=a.enemy?'#c7d8e33a':'#bfceb9';c.fillRect(-10,-11,20,4);c.fillStyle='#1c3041';c.beginPath();c.roundRect(-9,-5,18,10,3);c.fill();c.fillStyle=a.enemy?(a.type==='charger'?'#ffcc91':'#d8eef0'):'#8ce6c0';
   const dx=[0,2,0,-2][a.dir],dy=[-1,0,1,0][a.dir];c.fillRect(-6+dx,-2+dy,4,3);c.fillRect(2+dx,-2+dy,4,3);
   if(a.enemy){if(a.type==='tracker'){c.strokeStyle=palette.tracker;c.lineWidth=2;c.beginPath();c.moveTo(0,-13);c.lineTo(0,-18);c.stroke();c.fillStyle='#e3d4ff';c.fillRect(-2,-20,4,4);}if(a.type==='charger'){c.fillStyle=a.burst>0?'#ffe2ab':'#aa4e43';c.fillRect(-8,8,16,3);}}
   else{c.fillStyle='#e6a06e';c.fillRect(-15,-1,4,11);c.fillRect(11,-1,4,11);c.fillStyle='#719d9a';c.fillRect(-5,8,10,4);}
   c.restore();
  }
  // Fine registration marks tie the playfield to the atlas' print-inspired identity.
  c.strokeStyle='#d8b97966';c.lineWidth=1;for(const [x,y,sx,sy] of [[4,4,1,1],[596,4,-1,1],[4,516,1,-1],[596,516,-1,-1]]){c.beginPath();c.moveTo(x,y+sy*9);c.lineTo(x,y);c.lineTo(x+sx*9,y);c.stroke();}
 }
}
