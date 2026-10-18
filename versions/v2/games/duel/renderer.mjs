import{LEVELS,THEMES,ATTACKS}from'./levels.mjs';
import{phase,invulnerable}from'./engine.mjs';
const POSES={idle:0,light:1,heavy:2,guard:3,aerial:4,anti:5,throw:6,hurt:7};
export function createRenderer(canvas,preloaded=null){
 const c=canvas.getContext('2d'),images={};
 for(const [key,file] of Object.entries({player:'player-poses.webp',enemy:'enemy-poses.webp',stage:'courtyard.webp'})){if(preloaded?.[key])images[key]=preloaded[key];else{const im=new Image();im.src=new URL('./assets/'+file,import.meta.url);images[key]=im;}}
 const line=(x,y,x2,y2,color,width=2)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();};
 const text=(s,x,y,size,color='#fff',align='center')=>{c.font=`600 ${size}px system-ui,sans-serif`;c.textAlign=align;c.fillStyle=color;c.fillText(s,x,y);};
 function figure(g,a){const s=a.action,ph=g.ticks<a.stunUntil?'受击':phase(a),air=a.jumpAge!==null,y=350-a.y,im=images[a.id],color=a.id==='player'?'#72e2df':'#ffb789';let pose=ph==='受击'?'hurt':a.guard?'guard':air?'aerial':'idle';
  if(s&&s.kind!=='dash'&&ph!=='受击')pose=ph==='前摇'?'guard':s.kind;
  c.save();c.globalAlpha=.25;c.fillStyle='#07161d';c.beginPath();c.ellipse(a.x,353,air?23:37,7,0,0,Math.PI*2);c.fill();c.restore();
  // Eight authored key poses, switched by rules; no claim of frame animation.
  if(im.complete&&im.naturalWidth){const cell=POSES[pose]??0;c.save();c.translate(a.x,y);c.scale(a.face,1);if(ph==='受击'&&g.ticks%6<3)c.globalAlpha=.62;c.drawImage(im,(cell%4)*256,Math.floor(cell/4)*240,256,240,-128,-228,256,240);c.restore();}
  else{text('角色素材加载中',a.x,y-90,14,color);}
  if(a.guard){c.save();c.strokeStyle='#a8e3ef';c.lineWidth=4;c.globalAlpha=.72;c.beginPath();c.ellipse(a.x+a.face*30,y-98,22,65,0,-1.3,1.3);c.stroke();c.restore();}
  if(invulnerable(g,a)){c.strokeStyle='#9af6ff';c.lineWidth=3;c.beginPath();c.ellipse(a.x,y-92,55,96,0,0,Math.PI*2);c.stroke();}
  if(s&&s.kind!=='dash'&&ph==='前摇'){const ratio=Math.min(1,s.age/s.wind);c.fillStyle='#162b32d9';c.fillRect(a.x-52,y-204,104,27);text(ATTACKS[s.kind].name,a.x,y-185,14,s.kind==='throw'?'#ffb2e0':'#ffe9ad');c.fillStyle='#6a737b';c.fillRect(a.x-45,y-174,90,4);c.fillStyle=s.kind==='throw'?'#f78ed0':'#ffce77';c.fillRect(a.x-45,y-174,90*ratio,4);}
  if(s&&s.kind!=='dash'&&ph==='出招'){c.save();c.translate(a.x,y-93);c.scale(s.facing,1);c.strokeStyle=s.kind==='throw'?'#f6a7dc':'#fff1b9';c.lineWidth=5;c.globalAlpha=.75;c.beginPath();if(s.kind==='anti')c.arc(35,-45,64,.25,4.4,true);else if(s.kind==='throw'){c.arc(45,0,22,0,Math.PI*1.7);}else{c.moveTo(35,-10);c.quadraticCurveTo(s.range*.7,-25,s.range,2);}c.stroke();c.restore();}
  if(ph==='收招')text('收招',a.x,y-188,12,'#dae5ea');
  text(a.id==='player'?'织风客':LEVELS[g.level-1].opponent,a.x,384,13,color);
 }
 return{draw(g){const compact=canvas.clientWidth<550,w=compact?600:900;if(canvas.width!==w)canvas.width=w;if(canvas.height!==440)canvas.height=440;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,440);
  const scale=compact?Math.min(1,600/(Math.abs(g.enemy.x-g.player.x)+235)):1,view=w/scale,center=Math.max(view/2,Math.min(900-view/2,(g.enemy.x+g.player.x)/2));
  c.fillStyle='#142932';c.fillRect(0,0,w,440);c.save();c.translate(w/2-center*scale,220-220*scale);c.scale(scale,scale);
  const bg=images.stage;if(bg.complete&&bg.naturalWidth)c.drawImage(bg,0,0,900,440);else{const grad=c.createLinearGradient(0,0,0,440);grad.addColorStop(0,'#354b5d');grad.addColorStop(1,'#182d31');c.fillStyle=grad;c.fillRect(0,0,900,440);}
  const wash=c.createLinearGradient(0,0,0,440);wash.addColorStop(0,'#101e2a66');wash.addColorStop(.5,'#111e2600');wash.addColorStop(1,'#071b27dd');c.fillStyle=wash;c.fillRect(0,0,900,440);
  const l=LEVELS[g.level-1];
  line(24,353,876,353,'#e5d8a640',2);
  figure(g,g.player);figure(g,g.enemy);
  const ev=g.events.at(-1);if(ev&&ev.result!=='miss'&&g.ticks-ev.tick<28){const a=g[ev.target],age=g.ticks-ev.tick,p=Math.max(0,1-age/28),x=a.x,y=265-a.y; c.save();c.globalAlpha=p;
   const color=ev.result==='block'?'#a4e9f3':ev.result==='evade'?'#7ee4ff':'#ffe6a8';c.strokeStyle=color;c.lineWidth=3;for(let i=0;i<9;i++){const r=i*Math.PI*2/9,inner=9+age*.5,outer=inner+12;line(x+Math.cos(r)*inner,y+Math.sin(r)*inner,x+Math.cos(r)*outer,y+Math.sin(r)*outer,color,3);}
   text(ev.result==='evade'?'避开':ev.result==='block'?'格挡 −'+ev.damage:ev.result==='break'?'破防 −'+ev.damage:ev.kind==='throw'?'摔击 −'+ev.damage:'−'+ev.damage,x,Math.max(78,y-75-age*.5),22,color);c.restore();
  }
  c.restore();c.fillStyle='#102733ca';c.fillRect(16,16,w-32,36);text('风庭 '+String(l.id).padStart(2,'0')+' · '+THEMES[l.theme].name,28,40,14,'#e7e8d9','left');text(compact?'跳 · 对空 · 近投':'腾空避投 · 对空截跳 · 近投破守',w-28,40,13,'#dfcfa7','right');c.fillStyle='#112632ee';c.fillRect(16,402,w-32,26);text(compact?'跳跃躲投 · 对空截跳 · 近投破防':'J 短拍 / 空踢   U 长挑   W 跳跃   I 对空   O 近投   K 格挡   L 退步',w/2,420,12,'#e6dcc2');
 }};
}
