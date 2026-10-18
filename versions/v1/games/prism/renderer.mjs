import {WIDTH,HEIGHT} from './levels.mjs';
import {RADIUS,WALL_LEFT,WALL_RIGHT,WALL_TOP,PADDLE_Y,PADDLE_H,paddleWidth,remaining} from './engine.mjs';
const colors=['#b9d7c1','#dfb780','#b8a9dd','#83c0cc','#df9d8c'];
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.trails=new Map();this.lastTime=-1;}
 draw(g,clock=0){
  const c=this.ctx;if(g.time<this.lastTime)this.trails.clear();this.lastTime=g.time;
  c.fillStyle='#242636';c.fillRect(0,0,WIDTH,HEIGHT);const grad=c.createLinearGradient(0,0,600,720);grad.addColorStop(0,'#303148');grad.addColorStop(.7,'#1e2b3c');grad.addColorStop(1,'#182534');c.fillStyle=grad;c.fillRect(WALL_LEFT,WALL_TOP,WALL_RIGHT-WALL_LEFT,HEIGHT-WALL_TOP-14);
  c.strokeStyle='#9aabc32a';c.lineWidth=1;c.strokeRect(24.5,36.5,551,669);c.fillStyle='#b8c2b14d';for(let i=1;i<68;i++){const x=30+(i*137)%540,y=45+(i*89)%610;c.fillRect(x,y,i%7?1:2,i%7?1:2);}
  c.strokeStyle='#8b99aa33';for(let y=68;y<680;y+=32){c.beginPath();c.moveTo(18,y);c.lineTo(23,y);c.moveTo(577,y);c.lineTo(582,y);c.stroke();}
  c.fillStyle='#c5baa4';c.font='9px monospace';c.textAlign='left';c.fillText('PRISM ARRAY / '+String(g.level).padStart(2,'0'),34,23);c.textAlign='right';c.fillText(`${remaining(g)} TARGETS`,566,23);
  for(const b of g.bricks){
   if(!b.steel&&b.hp<=0)continue;const color=colors[Math.floor((b.y-90)/29)%colors.length];
   c.fillStyle='#101c2b';c.fillRect(b.x+1,b.y+4,b.w,b.h);
   c.fillStyle=b.steel?'#586576':color;c.beginPath();c.roundRect(b.x,b.y,b.w,b.h,2);c.fill();
   c.fillStyle=b.steel?'#7c8c9d':'#ffffff40';c.fillRect(b.x+2,b.y+2,b.w-4,3);c.fillStyle='#10212f44';c.fillRect(b.x+2,b.y+b.h-4,b.w-4,3);
   if(b.steel){c.strokeStyle='#b5c2cc77';c.lineWidth=1;c.beginPath();c.moveTo(b.x+8,b.y+7);c.lineTo(b.x+b.w-8,b.y+b.h-6);c.moveTo(b.x+b.w-8,b.y+7);c.lineTo(b.x+8,b.y+b.h-6);c.stroke();}
   else{c.fillStyle='#22313d';for(let i=0;i<b.hp&&b.maxHP>1;i++)c.fillRect(b.x+7+i*5,b.y+8,3,6);if(b.power){c.font='bold 10px monospace';c.textAlign='right';c.fillText({wide:'W',split:'×3',slow:'S'}[b.power],b.x+b.w-5,b.y+16);}}
  }
  for(const e of g.effects){c.globalAlpha=Math.min(1,e.ttl*3);c.strokeStyle='#cdd7bd';c.lineWidth=1;for(let i=0;i<6;i++){const a=i*Math.PI/3,d=(.4-e.ttl)*70;c.beginPath();c.moveTo(e.x+Math.cos(a)*d,e.y+Math.sin(a)*d);c.lineTo(e.x+Math.cos(a)*(d+4),e.y+Math.sin(a)*(d+4));c.stroke();}c.globalAlpha=1;}
  for(const d of g.drops){const color={wide:'#a8c8e9',split:'#e2c486',slow:'#b1d5b8'}[d.type];c.fillStyle='#12253588';c.beginPath();c.roundRect(d.x-17,d.y-9,34,20,9);c.fill();c.strokeStyle=color;c.stroke();c.fillStyle=color;c.font='bold 10px system-ui';c.textAlign='center';c.fillText({wide:'宽',split:'×3',slow:'缓'}[d.type],d.x,d.y+4);}
  for(const b of g.balls){
   const trail=this.trails.get(b.id)||[];if(g.state==='playing'&&!b.attached){trail.unshift({x:b.x,y:b.y});if(trail.length>9)trail.pop();}this.trails.set(b.id,trail);
   if(!b.attached)for(let i=trail.length-1;i>=0;i--){c.globalAlpha=(1-i/10)*.25;c.fillStyle='#bdc8ee';c.beginPath();c.arc(trail[i].x,trail[i].y,Math.max(1,RADIUS-i*.6),0,Math.PI*2);c.fill();}c.globalAlpha=1;
   c.fillStyle='#a7c6df30';c.beginPath();c.arc(b.x,b.y,RADIUS+5,0,Math.PI*2);c.fill();c.fillStyle='#f9ecc7';c.beginPath();c.arc(b.x,b.y,RADIUS,0,Math.PI*2);c.fill();c.fillStyle='#ffffff';c.beginPath();c.arc(b.x-2,b.y-2,2.5,0,Math.PI*2);c.fill();
  }
  for(const id of this.trails.keys())if(!g.balls.some(b=>b.id===id))this.trails.delete(id);
  const width=paddleWidth(g),x=g.paddle.x-width/2,y=PADDLE_Y-PADDLE_H/2;c.fillStyle='#0d1d2e';c.beginPath();c.roundRect(x-2,y+4,width+4,PADDLE_H,5);c.fill();c.fillStyle=g.buffs.wide>0?'#c4d4ed':'#bbd4bf';c.beginPath();c.roundRect(x,y,width,PADDLE_H,5);c.fill();c.fillStyle='#eef0d7';c.fillRect(x+9,y+2,width-18,3);c.fillStyle='#4c7376';c.fillRect(x+width/2-2,y+5,4,7);c.fillRect(x+5,y+5,4,7);c.fillRect(x+width-9,y+5,4,7);
  c.fillStyle='#9faeb8';c.font='9px monospace';c.textAlign='center';c.fillText('LEFT  ←   /   →  RIGHT',300,694);
  if(g.state==='playing'&&g.serving){c.fillStyle='#1a2a3de8';c.beginPath();c.roundRect(184,565,232,37,3);c.fill();c.fillStyle='#e7d8b2';c.font='13px system-ui';c.fillText('点击 / 空格，发出下一道光',300,589);}
 }
}
