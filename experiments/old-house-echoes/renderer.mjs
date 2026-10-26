import {ROOMS,ITEMS,walkable} from './world.mjs?v=echoes-slice-1';
import {near} from './engine.mjs?v=echoes-slice-1';
const W=1000,H=650;
function project(x,y,z=0){return [80+x*42+(y-7)*4,130+y*30-z];}
export function draw(canvas,s){
 const ctx=canvas.getContext('2d');if(canvas.width!==W){canvas.width=W;canvas.height=H;}const c=ctx,room=ROOMS[s.room];
 c.clearRect(0,0,W,H);c.fillStyle='#181f25';c.fillRect(0,0,W,H);
 const poly=(points,fill,stroke)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}};
 const floor=(x,y,w,h,fill,stroke,z=0)=>poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([a,b])=>project(a,b,z)),fill,stroke);
 const box=(x,y,w,h,z,fill,top)=>{floor(x,y,w,h,fill,'#292d2b',0);poly([project(x,y+h),project(x+w,y+h),project(x+w,y+h,z),project(x,y+h,z)],fill,'#242826');poly([project(x+w,y),project(x+w,y+h),project(x+w,y+h,z),project(x+w,y,z)],'#343b37','#242826');floor(x,y,w,h,top||fill,'#99917b',z);};
 // The entire floor is a stable fixed camera; drawings never change collision coordinates.
 floor(.8,.8,18.4,12.4,'#4a4d46','#898570');
 for(let y=1;y<13;y++)for(let x=1;x<19;x++){
  const tile=walkable(s.room,x+.5,y+.5,.05);const n=(x*7+y*13)%9;
  const tones=room.floor==='wood'?['#5c584b','#625b4a','#565548']:room.floor==='glass'?['#536664','#52605c','#5a6961']:['#697067','#63695f','#5e645c'];
  floor(x,y,1,1,tile?tones[n%3]:'#343936',tile?'#414b44':'#41463f');
  if(tile&&room.floor==='wood'){const [a,b]=project(x,y+.5);c.strokeStyle='#75715c';c.beginPath();c.moveTo(a,b);c.lineTo(a+40,b);c.stroke();}
 }
 if(['hall','corridor','library'].includes(s.room)){floor(8.8,2,2.4,9.8,'#6b514c','#a28e6c');floor(9,2.2,2,9.4,'#705a51','#95806a');for(let y=2.6;y<11.4;y+=.7)floor(9.2,y,1.6,.035,'#97816a');}
 // Raised back wall, paneled dado and original windows.
 box(1,.8,18,.32,75,'#38453f',room.tint);for(let x=2;x<19;x+=2){const [px,py]=project(x,1,48);c.fillStyle='#a69c7c';c.fillRect(px,py,2,38);}
 if(s.room==='greenhouse'){
  for(let x=2;x<18;x+=3){const [px,py]=project(x,1,65);c.fillStyle='#91b1b1';c.fillRect(px,py,88,39);c.strokeStyle='#384b4e';c.strokeRect(px,py,88,39);c.beginPath();c.moveTo(px+44,py);c.lineTo(px+44,py+39);c.stroke();for(let i=0;i<7;i++){c.strokeStyle='#c2d2c2';c.beginPath();c.moveTo(px+8+i*12,py+6);c.lineTo(px+5+i*12,py+16);c.stroke();}}
 }else{
  for(const x of [3,15]){const [px,py]=project(x,1,61);c.fillStyle='#a29b7b';c.fillRect(px-3,py-3,78,47);c.fillStyle='#3b5158';c.fillRect(px,py,72,41);c.strokeStyle='#9eaa9a';c.beginPath();c.moveTo(px+36,py);c.lineTo(px+36,py+41);c.moveTo(px,py+20);c.lineTo(px+72,py+20);c.stroke();}
 }
 // Shallow side wall keeps the playable floor visible.
 box(.85,1,.25,12,24,'#333d38','#737563');box(18.9,1,.25,12,24,'#333d38','#737563');
 for(const a of room.walls)box(...a,54,'#44463f','#686858');
 if(s.room==='corridor'){
  // Original abstract portraits, hung on the inner masonry faces.
  for(const x of [5.7,14.3]){const [a,b]=project(x,7,43);c.fillStyle='#a18a60';c.fillRect(a-26,b-5,52,45);c.fillStyle='#374749';c.fillRect(a-21,b,42,35);c.fillStyle='#7c8a7a';c.beginPath();c.ellipse(a,b+12,7,9,0,0,7);c.fill();c.beginPath();c.moveTo(a-14,b+33);c.quadraticCurveTo(a,b+12,a+14,b+33);c.closePath();c.fill();}
 }
 for(const [x,y,w,h] of room.obstacles){
  if(s.room==='greenhouse'){box(x,y,w,h,22,'#454d43','#777c60');for(let px=x+.5;px<x+w;px+=.7){const [a,b]=project(px,y+h*.5,27);c.fillStyle='#819675';c.beginPath();c.ellipse(a,b,13,7,-.7,0,Math.PI*2);c.fill();c.fillStyle='#506b56';c.beginPath();c.ellipse(a+6,b-7,8,12,.6,0,Math.PI*2);c.fill();}}
  else {box(x,y,w,h,30,'#444940','#85826c');if(s.room==='library'||s.room==='archive'){for(let i=0;i<w*4;i++){const [a,b]=project(x+.15+i*.24,y+.25,34);c.fillStyle=['#a39a75','#5b736b','#9b776a','#72808c'][i%4];c.fillRect(a,b,7,13);}}}
 }
 const text=(txt,x,y,color='#e1dbc1',size=18)=>{c.fillStyle=color;c.font=`${size}px system-ui, sans-serif`;c.textAlign='center';c.fillText(txt,x,y);};
 for(const d of room.doors){const [x,y]=project(d.x,d.y);let open=!d.lock||s.flags[d.lock]||d.lock==='archive'&&s.flags.archive||d.lock==='power'&&s.flags.power;
  c.save();c.translate(x,y);c.strokeStyle=open?'#b8c8b0':'#c69d70';c.lineWidth=3;c.strokeRect(-20,-20,40,26);c.fillStyle='#293b3d';c.fillRect(-17,-17,34,20);c.restore();text(open?'↗':'◇',x,y-29,open?'#c8dbc0':'#efc48e',24);
 }
 const objects=room.props.filter(p=>!s.taken.includes(p.id)).map(p=>({...p,type:'prop'}));
 if(s.room==='corridor'&&s.enemy.hp>0)objects.push({...s.enemy,type:'enemy'});objects.push({...s.player,type:'player'});
 if(s.rescued)objects.push({x:s.player.x-.5,y:s.player.y+.65,type:'companion'});
 for(const p of objects.sort((a,b)=>a.y-b.y)){
  const [x,y]=project(p.x,p.y);c.fillStyle='#0c171b65';c.beginPath();c.ellipse(x+4,y+3,p.type==='prop'?18:16,7,0,0,Math.PI*2);c.fill();
  if(p.type==='player'||p.type==='companion'){
   const companion=p.type==='companion';c.strokeStyle='#252e31';c.lineWidth=7;c.beginPath();c.moveTo(x-5,y-8);c.lineTo(x-7,y);c.moveTo(x+5,y-8);c.lineTo(x+6,y);c.stroke();
   c.fillStyle=companion?'#baac88':s.player.invulnerable>0?'#dec58c':'#d1a865';c.beginPath();c.moveTo(x-11,y-32);c.lineTo(x+10,y-32);c.lineTo(x+13,y-9);c.lineTo(x-12,y-9);c.closePath();c.fill();c.fillStyle='#d4c8ae';c.beginPath();c.arc(x,y-41,7,0,Math.PI*2);c.fill();c.fillStyle='#39494a';c.fillRect(x-8,y-47,16,5);
   if(!companion){const a=s.player.angle,ax=Math.cos(a)*22,ay=Math.sin(a)*15;c.strokeStyle='#ede4c1';c.lineWidth=3;c.beginPath();c.moveTo(x,y-22);c.lineTo(x+ax,y-22+ay);c.stroke();if(s.aim){c.setLineDash([4,5]);c.strokeStyle='#dac38a';c.lineWidth=1;c.beginPath();c.moveTo(x+ax,y-22+ay);c.lineTo(x+Math.cos(a)*220,y-22+Math.sin(a)*150);c.stroke();c.setLineDash([]);}if(s.shot>0){c.fillStyle='#f1dc9c';c.beginPath();c.arc(x+ax,y-22+ay,5,0,7);c.fill();}}
  }else if(p.type==='enemy'){
   c.fillStyle=p.windup>0?'#c68e68':'#9da596';c.beginPath();c.moveTo(x-13,y-30);c.lineTo(x+9,y-34);c.lineTo(x+16,y-6);c.lineTo(x-10,y-7);c.closePath();c.fill();c.fillStyle='#646e68';c.fillRect(x-7,y-46,17,17);c.strokeStyle='#bdbaa0';c.lineWidth=5;c.beginPath();c.moveTo(x-10,y-26);c.lineTo(x-24,y-15);c.moveTo(x+10,y-26);c.lineTo(x+23,y-20);c.stroke();for(let i=0;i<p.hp;i++){c.fillStyle='#cba97b';c.fillRect(x-13+i*8,y-57,5,3);}if(p.windup>0)text('推击将至',x,y-68,'#f1c69b',18);
  }else{
   const key=p.kind;if(key==='box'){box(p.x-.45,p.y-.35,.9,.7,28,'#3d5352','#8b9c8a');text('寄存',x,y-60,'#dbddc3',17);}
   else if(key==='patient'){if(!s.rescued){c.fillStyle='#c6bd9d';c.fillRect(x-17,y-19,35,15);c.fillStyle='#d6cbb4';c.beginPath();c.arc(x-22,y-17,7,0,7);c.fill();text('阿遥',x,y-36);}}
   else if(key==='pickup'){c.fillStyle='#dec99b';c.beginPath();c.arc(x,y-10,11,0,7);c.fill();text(ITEMS[p.item].short,x,y-3,'#2c4141',16);}
   else if(key==='note'){c.fillStyle='#d0c8a6';c.fillRect(x-12,y-17,24,17);c.strokeStyle='#6f7969';c.beginPath();c.moveTo(x-8,y-12);c.lineTo(x+8,y-12);c.moveTo(x-8,y-7);c.lineTo(x+3,y-7);c.stroke();}
   else {box(p.x-.35,p.y-.3,.7,.6,25,'#48564f','#9c9e7e');text(key==='panel'?(s.flags.power?'通电':'电柜'):key==='beacon'?'信标座':'记录',x,y-60,'#d3d7bb',17);}
  }
 }
 // Lit sconces and vignette: atmospheric, while floors and pickups remain legible.
 for(const x of [2,18]){const [a,b]=project(x,1.4,38);const g=c.createRadialGradient(a,b,1,a,b,95);g.addColorStop(0,'#f1cb7940');g.addColorStop(1,'#f1cb7900');c.fillStyle=g;c.fillRect(a-95,b-95,190,190);c.fillStyle='#e8cf91';c.fillRect(a-3,b-6,6,12);}
 const g=c.createRadialGradient(510,330,220,510,330,650);g.addColorStop(0,'#081a2000');g.addColorStop(1,'#081a2070');c.fillStyle=g;c.fillRect(0,0,W,H);
 text('OLD HOUSE / '+String(Object.keys(ROOMS).indexOf(s.room)+1).padStart(2,'0'),150,55,'#a8b9ae',15);
 c.textAlign='right';c.font='15px system-ui';c.fillStyle='#bec4ae';c.fillText('镜头固定 · 上方为北',925,55);
 const p=near(s);if(p){const [a,b]=project(p.x,p.y);c.strokeStyle='#e0c783';c.lineWidth=2;c.beginPath();c.ellipse(a,b+4,25,11,0,0,7);c.stroke();text('E · '+p.label,500,605,'#f0dfb9',22);}else text(s.aim?'举枪中 · 方向调整 / 空格射击':'走近门与物品，按 E 查看',500,605,'#c5cebd',20);
}
