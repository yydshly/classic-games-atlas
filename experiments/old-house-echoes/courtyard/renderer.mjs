import {ROOMS,ITEMS} from './world.mjs';
import {near} from './engine.mjs';
const W=1000,H=650;
const project=(x,y,z=0)=>[79+x*42+(y-7)*4,127+y*30-z];
export function draw(canvas,s){
 const c=canvas.getContext('2d'),room=ROOMS[s.room],compact=canvas.clientWidth<600;if(canvas.width!==W){canvas.width=W;canvas.height=H;}
 c.clearRect(0,0,W,H);const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1b2a2c');bg.addColorStop(1,'#101c20');c.fillStyle=bg;c.fillRect(0,0,W,H);
 const polygon=(pts,fill,stroke)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}};
 const floor=(x,y,w,h,fill,stroke,z=0)=>polygon([[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([a,b])=>project(a,b,z)),fill,stroke);
 const box=(x,y,w,h,z,fill,top)=>{floor(x,y,w,h,fill,'#273436');polygon([project(x,y+h),project(x+w,y+h),project(x+w,y+h,z),project(x,y+h,z)],fill,'#293235');polygon([project(x+w,y),project(x+w,y+h),project(x+w,y+h,z),project(x+w,y,z)],'#364642','#293235');floor(x,y,w,h,top,'#8b9180',z);};
 const text=(t,x,y,color='#e9e4c9',size=18)=>{c.fillStyle=color;c.font=`${compact?Math.max(size,29):size}px system-ui,sans-serif`;c.textAlign='center';c.fillText(t,x,y);};
 floor(.8,.8,18.4,12.4,room.tint,'#a8a98d');
 for(let y=1;y<13;y+=1.2)for(let x=1;x<19;x+=2.4){const [px,py]=project(x,y);c.strokeStyle=room.floor==='wood'?'#acaa8a55':'#aab6a033';c.lineWidth=1;c.beginPath();c.moveTo(px,py);c.lineTo(px+90,py);c.stroke();}
 for(const [x,y,w,h] of room.walls||[])box(x,y,w,h,85,'#34413f','#67726a');
 for(const [x,y,w,h] of room.obstacles){
  if(['garden','yard'].includes(s.room)){box(x,y,w,h,24,'#485948','#6b7657');for(let px=x+.5;px<x+w;px+=.85){const [a,b]=project(px,y+h*.45,29);c.fillStyle='#8d9c71';c.beginPath();c.ellipse(a,b,13,6,-.5,0,Math.PI*2);c.fill();c.fillStyle='#597b62';c.beginPath();c.ellipse(a+6,b-9,8,12,.7,0,Math.PI*2);c.fill();}}
  else box(x,y,w,h,30,'#4c5249','#9b9a7b');
 }
 if(s.room==='pump'){for(let i=0;i<4;i++){const [x,y]=project(3+i*3.6,10.6);c.strokeStyle='#bed5c077';c.lineWidth=3;c.beginPath();c.moveTo(x-20,y-17);c.lineTo(x+18,y-17);c.stroke();}}
 if(['archive','vault'].includes(s.room)){for(let k=0;k<5;k++){const [x,y]=project(2.5+k*3.5,2.1,26);c.fillStyle=['#c7ad80','#8f9e85','#a8948b'][k%3];c.fillRect(x-18,y,26,38);c.fillStyle='#343c3a';c.fillRect(x-14,y+5,18,3);}}
 for(const d of room.doors){const [x,y]=project(d.x,d.y);const open=!d.lock||!!s.flags[d.lock];c.fillStyle=open?'#324d49':'#554940';c.fillRect(x-19,y-20,38,27);c.strokeStyle=open?'#c9d7be':'#ddbb84';c.lineWidth=3;c.strokeRect(x-20,y-21,40,28);text(open?'↗':'◇',x,y-31,open?'#d2e0bd':'#ecc791',23);}
 const objects=room.props.filter(p=>!s.taken.includes(p.id)).map(p=>({...p,type:'prop'}));if(s.room==='corridor'&&s.enemy.hp>0)objects.push({...s.enemy,type:'enemy'});objects.push({...s.player,type:'player'});
 for(const p of objects.sort((a,b)=>a.y-b.y)){
  const [x,y]=project(p.x,p.y);c.save();if(compact){c.translate(x,y);c.scale(1.55,1.55);c.translate(-x,-y);}c.fillStyle='#07151b70';c.beginPath();c.ellipse(x+4,y+3,17,7,0,0,Math.PI*2);c.fill();
  if(p.type==='player'){c.strokeStyle='#26393a';c.lineWidth=7;c.beginPath();c.moveTo(x-6,y-8);c.lineTo(x-7,y);c.moveTo(x+6,y-8);c.lineTo(x+7,y);c.stroke();c.fillStyle=s.player.invulnerable>0?'#ecd4a7':'#cfa878';polygon([[x-11,y-32],[x+10,y-32],[x+13,y-8],[x-12,y-8]],c.fillStyle);c.fillStyle='#d6cdb5';c.beginPath();c.arc(x,y-41,7,0,Math.PI*2);c.fill();c.fillStyle='#425759';c.fillRect(x-9,y-47,18,5);const a=s.player.angle,ax=Math.cos(a)*22,ay=Math.sin(a)*15;c.strokeStyle='#f0dfb5';c.lineWidth=3;c.beginPath();c.moveTo(x,y-22);c.lineTo(x+ax,y-22+ay);c.stroke();if(s.aim){c.setLineDash([4,5]);c.strokeStyle='#f2d087';c.lineWidth=1;c.beginPath();c.moveTo(x+ax,y-22+ay);c.lineTo(x+Math.cos(a)*210,y-22+Math.sin(a)*145);c.stroke();c.setLineDash([]);}if(s.shot>0){c.fillStyle='#ffe4a3';c.beginPath();c.arc(x+ax,y-22+ay,6,0,7);c.fill();}}
  else if(p.type==='enemy'){polygon([[x-13,y-30],[x+10,y-33],[x+15,y-6],[x-10,y-7]],p.windup>0?'#c8906a':'#a5afa0');c.fillStyle='#656f6c';c.fillRect(x-8,y-47,17,17);c.strokeStyle='#d0c7a5';c.lineWidth=5;c.beginPath();c.moveTo(x-12,y-24);c.lineTo(x-25,y-14);c.moveTo(x+9,y-23);c.lineTo(x+23,y-16);c.stroke();for(let i=0;i<p.hp;i++){c.fillStyle='#e5c18d';c.fillRect(x-13+i*8,y-56,5,3);}if(p.windup>0)text('推击将至',x,y-68,'#ffd0a1',17);}
  else if(p.kind==='pickup'){c.fillStyle=p.item==='ledger'?'#ceb887':'#e0cd9d';c.fillRect(x-12,y-22,p.item==='ledger'?28:23,19);c.strokeStyle='#6c795e';c.strokeRect(x-12,y-22,p.item==='ledger'?28:23,19);text(ITEMS[p.item].short,x,y-5,'#304345',15);}
  else if(p.kind==='note'){c.fillStyle='#d6c7a4';c.fillRect(x-12,y-18,24,18);c.fillStyle='#728278';c.fillRect(x-8,y-13,15,2);c.fillRect(x-8,y-8,11,2);}
  else{box(p.x-.35,p.y-.3,.7,.6,26,'#3b5652','#a2a88a');if(!compact)text(p.kind==='box'?'补给':p.kind==='exit'?'接应':'记录',x,y-60,'#e6dbad',16);}c.restore();
 }
 for(const x of [2,18]){const [a,b]=project(x,1.4,38);const light=c.createRadialGradient(a,b,2,a,b,115);light.addColorStop(0,'#eecb8466');light.addColorStop(1,'#eecb8400');c.fillStyle=light;c.fillRect(a-115,b-115,230,230);}
 const shade=c.createRadialGradient(500,325,260,500,325,670);shade.addColorStop(0,'#071b1c00');shade.addColorStop(1,'#071b1c8a');c.fillStyle=shade;c.fillRect(0,0,W,H);
 text('RAIN COURT / '+String(Object.keys(ROOMS).indexOf(s.room)+1).padStart(2,'0'),compact?190:160,55,'#c4d0b7',15);c.textAlign='right';c.font=`${compact?27:15}px system-ui`;c.fillStyle='#cad4c2';c.fillText('固定镜头 · 上方为北',925,55);
 const p=near(s);if(p){const [a,b]=project(p.x,p.y);c.strokeStyle='#f0d389';c.lineWidth=2;c.beginPath();c.ellipse(a,b+5,25,11,0,0,7);c.stroke();text('E · '+p.label,500,605,'#f8e4b5',21);}else text(s.aim?'举枪中 · 方向调整 / 空格射击':'走近门与物品，按 E 查看',500,605,'#d5dec8',20);
}
