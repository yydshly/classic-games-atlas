import {LEVELS,TYPES} from './levels.mjs';
import {attackRegion,guardState} from './engine.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const LIGHT={dawn:{brightness:.91,tint:'#d9ad78',alpha:.09},rain:{brightness:.75,tint:'#426c89',alpha:.17},night:{brightness:.56,tint:'#345776',alpha:.22}};
const load=name=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('街巷素材未加载：'+name));i.src=new URL(name==='actions-v2.webp'?'./art/'+name:'../../../../assets/escort/art/'+name,import.meta.url).href;});
function rounded(c,x,y,w,h,r=5){c.beginPath();c.roundRect(x,y,w,h,r);}
function surface(){const s=document.createElement('canvas');s.width=320;s.height=240;return s;}

// Readability overlay only: exact world-foot projections, never simulation inputs.
export function drawFootMarkers(c,items,player){
 c.save();c.globalAlpha=1;c.globalCompositeOperation='source-over';
 for(const {a,x,y,z} of items){const hero=a.id==='player';if(!hero&&(a.hp<=0||Math.hypot(a.x-player.x,a.y-player.y)>320))continue;
  const radius=(hero?7:9)*z;c.beginPath();if(hero)c.arc(x,y,radius,0,Math.PI*2);else{c.moveTo(x,y-radius);c.lineTo(x+radius,y);c.lineTo(x,y+radius);c.lineTo(x-radius,y);c.closePath();}
  c.lineWidth=5;c.strokeStyle='#07131c';c.stroke();c.lineWidth=2;c.strokeStyle=hero?'#b2f6db':'#ffd08c';c.stroke();c.beginPath();c.arc(x,y,1.5*z,0,Math.PI*2);c.fillStyle=hero?'#b2f6db':'#ffd08c';c.fill();
 }c.restore();
}

export function createRenderer(canvas,map){
 const c=canvas.getContext('2d'),m=map.getContext('2d'),images={},cache=new Map(),blend=surface(),bc=blend.getContext('2d');
 map.width=440;map.height=180;let previous=new Map(),previousTick=-1,previousLevel=0;
 const ready=Promise.all(['scenery.webp','guardian.webp','rivals.webp','cart.webp','actions-v2.webp'].map(async n=>images[n]=await load(n)));
 // Foot anchors follow each source frame. Cached ambient light and a local
 // lantern mask reuse the original art without modifying the simulation.
 function frame(kind,index,theme,warm=false){
  const key=[kind,index,theme,warm].join(':');if(cache.has(key))return cache.get(key);
  let img,sx,sy,sw,sh,dw,dh,ax,foot;
  if(index>=10){const i=index-10;img=images['actions-v2.webp'];sx=i%4*512;sy=Math.floor(i/4)*512;sw=sh=512;dw=dh=i<5?204.8:220.16;ax=256;foot=480;}
  else if(kind==='player'){img=images['guardian.webp'];sx=index%3*512;sy=Math.floor(index/3)*512;sw=sh=512;dw=dh=162;ax=[288,295,296,263,264,278][index];foot=[511,511,511,478,476,469][index];}
  else if(kind==='cart'){img=images['cart.webp'];sx=sy=0;sw=sh=1254;dw=dh=154;ax=505;foot=1190;}
  else{img=images['rivals.webp'];const row={drift:0,flank:1,heavy:2,warden:3}[kind],rows=[0,342,682,1070,1536];sx=index*512;sy=rows[row];sw=512;sh=rows[row+1]-rows[row];dh=[130,133,145,159][row];dw=sw/sh*dh;ax=[[294,282],[292,283],[281,270],[289,297]][row][index];foot=row===3?[443,444][index]:sh;}
  const s=surface(),sc=s.getContext('2d'),light=LIGHT[theme];sc.filter='brightness('+(warm?.96:light.brightness)+') saturate('+(warm?1.02:.88)+')';sc.drawImage(img,sx,sy,sw,sh,160-ax*dw/sw,220-foot*dh/sh,dw,dh);sc.filter='none';sc.globalCompositeOperation='source-atop';sc.globalAlpha=warm?.2:light.alpha;sc.fillStyle=warm?'#edb56c':light.tint;sc.fillRect(0,0,320,240);cache.set(key,s);return s;
 }
 function shadow(x,y,z,width,lightX){
  c.save();c.translate(x,y);c.scale(z,z);c.globalCompositeOperation='multiply';const away=clamp((x-lightX)/12,-13,13);
  for(const [dx,dy,rx,ry,alpha] of [[away,3,width*1.45,9,.26],[0,1,width,5,.5]]){c.save();c.translate(dx,dy);c.scale(rx,ry);const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'rgba(4,14,22,'+alpha+')');g.addColorStop(.4,'rgba(4,14,22,'+alpha*.65+')');g.addColorStop(1,'rgba(4,14,22,0)');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();}c.restore();
 }
 function lit(kind,index,theme,lx,ly,hero=false){
  c.save();if(hero)c.filter='drop-shadow(1px 0px 0px #ead09b70) drop-shadow(-1px 0px 0px #07141ee0)';c.drawImage(frame(kind,index,theme),-160,-220);c.filter='none';
  bc.clearRect(0,0,320,240);bc.globalCompositeOperation='source-over';bc.drawImage(frame(kind,index,theme,true),0,0);bc.globalCompositeOperation='destination-in';const g=bc.createRadialGradient(160+lx,220+ly,12,160+lx,220+ly,175);g.addColorStop(0,theme==='dawn'?'#ffffff55':'#ffffffdf');g.addColorStop(.52,'#ffffff66');g.addColorStop(1,'#ffffff00');bc.fillStyle=g;bc.fillRect(0,0,320,240);c.drawImage(blend,-160,-220);c.restore();
 }
 function cart(g,x,y,z,theme){
  shadow(x,y,z,39,x-7*z);c.save();c.translate(x,y);c.scale(z,z);const ground=c.createRadialGradient(-7,0,2,-7,0,95);ground.addColorStop(0,theme==='night'?'#e4ac4826':'#e4ac480f');ground.addColorStop(1,'#e4ac4800');c.save();c.scale(1,.3);c.fillStyle=ground;c.fillRect(-110,-100,220,200);c.restore();
  lit('cart',0,theme,-7,-94);c.save();c.translate(-21,-30);c.beginPath();c.ellipse(0,0,23,26,0,0,Math.PI*2);c.clip();c.rotate(g.cart.distance*.045);c.filter='brightness('+(theme==='night'?.66:theme==='rain'?.8:.93)+')';c.drawImage(images['cart.webp'],125,735,440,465,-27,-28,54,56);c.restore();
  const lamp=c.createRadialGradient(-7,-94,2,-7,-94,38);lamp.addColorStop(0,'#ffdc7955');lamp.addColorStop(.42,'#ffc96522');lamp.addColorStop(1,'#f7ba4900');c.globalCompositeOperation='screen';c.fillStyle=lamp;c.fillRect(-46,-134,78,80);c.restore();
 }
 function sprite(a,g,x,y,z,theme,lightX,lightY){
  const hero=a.id==='player',kind=hero?'player':a.kind,act=a.action,r=act?.kind==='attack'?g.attacks.find(r=>r.id===act.id):null,age=r?g.ticks-r.start:0,active=r&&age>=r.wind&&age<r.wind+r.active,wind=r&&age<r.wind,old=previous.get(a.id),moving=old&&g.ticks!==previousTick&&Math.hypot(a.x-old.x,a.y-old.y)>.01;
  let index=0;if(hero){if(act?.kind==='dodge')index=5;else if(r)index=wind?3:4;else if(moving)index=1+Math.floor(g.ticks/8)%2;}else if(r&&age>=r.wind)index=1;
  if(r){if(hero&&!wind&&r.combo>1)index=8+r.combo;else if(kind==='flank')index=wind?12:active?13:14;else if(kind==='warden')index=wind?15:active?(r.move==='sweep'?16:1):17;}
  shadow(x,y,z,hero?25:kind==='heavy'?29:23,lightX);c.save();c.translate(x,y);c.scale(a.face*z,z);
  if(hero&&act?.kind==='dodge'){c.save();c.globalAlpha=.16;c.translate(-a.action.dx*a.face*14,0);c.drawImage(frame(kind,5,theme),-160,-220);c.restore();}
  if(wind)c.transform(1,0,-.025*clamp(age/r.wind,0,1),1,0,0);
  if(active)c.translate((hero?4:2)*Math.sin(Math.PI*(age-r.wind)/r.active),0);
  lit(kind,index,theme,(lightX-x)/(a.face*z),(lightY-y)/z,hero);c.restore();
  return {a,x,y,z,head:y-(hero?161:kind==='warden'?151:kind==='heavy'?139:128)*z,r,age};
 }
 function labels(items,g,W,H,ui=1){
  const occupied=[];for(const item of [...items].sort((a,b)=>(b.a.id==='player')-(a.a.id==='player')||a.x-b.x)){
   const {a,x,y,z,head,r,age}=item,hero=a.id==='player',wind=r&&age<r.wind;
   if(!hero&&a.hp===a.maxHP&&!wind&&Math.abs(a.x-g.player.x)>230)continue;
   const width=(hero?40:78)*ui,height=(hero?21:25)*ui;let bx=clamp(x-width/2,10,W-width-10),by=clamp(head-(hero?34:39)*ui,72,H-70);
   for(let n=0;n<12&&occupied.some(o=>bx<o.x+o.w+7&&bx+width+7>o.x&&by<o.y+o.h+5&&by+height+5>o.y);n++){if(n%3<2)bx=clamp(bx+(n%3===0?-1:2)*(width+8),10,W-width-10);else{bx=clamp(x-width/2,10,W-width-10);by-=height+8;}}
   occupied.push({x:bx,y:by,w:width,h:height});c.strokeStyle=hero?'#e8cf91b0':'#b8bec080';c.lineWidth=1;c.beginPath();c.moveTo(bx+width/2,by+height);c.lineTo(x,head+3*z);c.stroke();c.fillStyle='#0c1c27e8';rounded(c,bx,by,width,height,4);c.fill();c.fillStyle=hero?'#f5d593':'#d4d0c3';c.font=(hero?'bold ':'')+(hero?12:10)*ui+'px system-ui';c.textAlign='center';c.fillText(hero?'你':TYPES[a.kind].name+(guardState(g,a)==='guard'?'·护势':guardState(g,a)==='exposed'?'·破绽':''),bx+width/2,by+14*ui);
   if(!hero){c.fillStyle='#45515a';c.fillRect(bx+6*ui,by+19*ui,width-12*ui,3*ui);c.fillStyle='#cba07e';c.fillRect(bx+6*ui,by+19*ui,(width-12*ui)*a.hp/a.maxHP,3*ui);}
   if(wind){c.fillStyle='#efb884';c.fillRect(bx,by+height+2,width*age/r.wind,2);}
  }
 }
 function draw(g){
  if(!images['cart.webp'])return;const l=LEVELS[g.level-1],compact=(matchMedia('(max-width:800px)').matches||matchMedia('(pointer:coarse)').matches)&&g.state!=='ready',rect=canvas.getBoundingClientRect(),portrait=compact&&rect.height>rect.width,W=portrait?720:960,H=compact?Math.max(300,Math.round(W*rect.height/rect.width)):540;
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  const z=portrait?1.34:compact?1.04:1,visible=W/z,cam=clamp(g.player.x-visible*.4,0,Math.max(0,l.length-visible+70)),sx=x=>(x-cam)*z,depthScale=compact?H*(portrait?.22:.29)/180:.8,sy=y=>(compact?H*(portrait?.65:.62):330)+(y-60)*depthScale,theme=l.theme==='dawn'?0:l.theme==='rain'?1:g.level===8?3:2,scene=images['scenery.webp'],cellW=scene.width/2,cellH=scene.height/2;
  if(previousLevel!==g.level||g.ticks<previousTick)previous.clear();c.clearRect(0,0,W,H);
  const bgH=H+18,bgW=Math.max(W+72,bgH*1.5),offset=(bgW-W)*.5+cam*.035;c.save();if(g.state!=='ready')c.filter='saturate(.79) brightness(.86) blur(.45px)';c.drawImage(scene,theme%2*cellW,Math.floor(theme/2)*cellH,cellW,cellH,-offset,-8,bgW,bgH);c.restore();
  const ambient=c.createLinearGradient(0,0,0,H);ambient.addColorStop(0,'#07132415');ambient.addColorStop(.6,'#07132400');ambient.addColorStop(1,'#0713243a');c.fillStyle=ambient;c.fillRect(0,0,W,H);
  c.save();c.strokeStyle='#edce8f48';c.lineWidth=1.2;c.setLineDash([3,12]);c.beginPath();l.path.forEach((p,i)=>i?c.lineTo(sx(p.x),sy(p.y)):c.moveTo(sx(p.x),sy(p.y)));c.stroke();c.restore();
  for(let i=0;i<3;i++){const x=sx(l.gates[i]),open=g.cleared[i];if(x< -50||x>W+50)continue;c.save();c.globalAlpha=open?.3:.7;c.strokeStyle='#d9ae67';c.lineWidth=1.5;c.setLineDash([2,12]);c.beginPath();c.moveTo(x,sy(60));c.lineTo(x,sy(240)+12);c.stroke();c.setLineDash([]);c.fillStyle='#10222be6';rounded(c,x-20,sy(60)-40,40,28,4);c.fill();c.fillStyle=open?'#a4d1bd':'#e3c38b';c.font='13px serif';c.textAlign='center';c.fillText(open?'✓':String(i+1).padStart(2,'0'),x,sy(60)-22);c.restore();}
  // The same locked region drives warnings and contacts; charge contact also follows its body.
  for(const a of[g.player,...g.enemies.filter(e=>e.hp>0)])if(a.action?.kind==='attack'){
   const r=g.attacks.find(r=>r.id===a.action.id),age=g.ticks-r.start,bad=a.id!=='player',exposed=guardState(g,a)==='exposed',q=exposed?{x0:a.x-42,x1:a.x+42,y0:a.y-22,y1:a.y+22}:attackRegion(a,r);
   if(age<r.wind+r.active||exposed){c.fillStyle=exposed?'#68d9bf28':bad?'#e891452f':'#ecd08a14';c.strokeStyle=exposed?'#8ef7d2':bad?'#ffc47c':'#ebd5a355';c.lineWidth=bad?2:1;rounded(c,sx(q.x0),sy(q.y0),(q.x1-q.x0)*z,(q.y1-q.y0)*depthScale,4);c.fill();c.stroke();c.font='bold 12px system-ui';c.textAlign='center';c.fillStyle=exposed?'#b2ffe1':'#ffe0a0';if(bad)c.fillText(exposed?'破绽 · 连击 +50%':r.move==='charge'?'直冲 · 纵深让开':r.move==='sweep'?'横扫 · 后撤离圈':'近战蓄势',sx((q.x0+q.x1)/2),sy(q.y1)+17);}
  }
  const lightX=sx(g.cart.x)-7*z,lightY=sy(g.cart.y)-94*z,actors=[{...g.cart,kind:'cart'},...g.enemies.filter(e=>e.hp>0),{...g.player,kind:'player'}].sort((a,b)=>a.y-b.y),items=[];
  for(const a of actors){const x=sx(a.x),y=sy(a.y);if(x< -180||x>W+180)continue;const perspective=.96+(a.y-60)/180*.08;if(a.kind==='cart')cart(g,x,y,z,l.theme);else items.push(sprite(a,g,x,y,z*perspective,l.theme,lightX,lightY));}
  for(const e of g.events){const age=g.ticks-e.tick;if(e.kind!=='hit'||age<0||age>15)continue;const target=e.target==='cart'?g.cart:e.target==='player'?g.player:g.enemies.find(a=>a.id===e.target);if(!target)continue;const x=sx(target.x),y=sy(target.y)-76*z;c.save();c.globalAlpha=(1-age/15)*.7;c.strokeStyle=e.source==='player'?'#e7c28b':'#d99a7f';c.lineWidth=1.6;for(let i=0;i<4;i++){const angle=i*Math.PI/2+.4,d=5+age*.65;c.beginPath();c.moveTo(x+Math.cos(angle)*d,y+Math.sin(angle)*d);c.lineTo(x+Math.cos(angle)*(d+5),y+Math.sin(angle)*(d+5));c.stroke();}c.restore();}
  labels(items,g,W,H,portrait?1.65:compact?1.25:1);
  if(l.theme==='rain'){c.strokeStyle='#bed5e91d';c.lineWidth=1;for(let i=0;i<48;i++){const x=(i*137+g.ticks*2.1)%W,y=(i*73+g.ticks*7)%H;c.beginPath();c.moveTo(x,y);c.lineTo(x-5,y+15);c.stroke();}}else for(let i=0;i<16;i++){const x=(i*89+Math.sin(g.ticks*.007+i)*18)%W,y=40+(i*61+g.ticks*.15)%(H-70);c.fillStyle=l.theme==='night'?'#f8d37844':'#ffe2a82a';c.beginPath();c.arc(x,y,i%3===0?1.2:.7,0,Math.PI*2);c.fill();}
  const vignette=c.createRadialGradient(W*.5,H*.6,Math.min(W,H)*.25,W*.5,H*.6,Math.max(W,H)*.72);vignette.addColorStop(0,'#04111b00');vignette.addColorStop(1,'#04111b66');c.fillStyle=vignette;c.fillRect(0,0,W,H);
  drawFootMarkers(c,items,g.player);
  c.fillStyle='#10222bdf';rounded(c,18,18,205,46,5);c.fill();c.fillStyle='#d8b677';c.font='10px system-ui';c.textAlign='left';c.fillText('ALLEYLIGHT / '+String(g.level).padStart(2,'0'),30,36);c.fillStyle='#e6dcc5';c.font='12px serif';c.fillText('第'+(g.stage+1)+'街段 · '+g.enemies.filter(a=>a.hp>0).length+'名来敌',30,54);
  const cx=sx(g.cart.x);if(cx<35||cx>W-35){c.fillStyle='#132632ed';rounded(c,cx<35?15:W-165,H-50,150,30,4);c.fill();c.fillStyle='#e5c68d';c.font='12px system-ui';c.textAlign='center';c.fillText(cx<35?'← 回到灯车身边':'灯车在前方 →',cx<35?90:W-90,H-30);}
  m.fillStyle='#10242d';m.fillRect(0,0,440,180);const scale=400/l.length,dy=y=>35+(y-60)*.5;m.strokeStyle='#8a754d';m.lineWidth=1;m.setLineDash([3,7]);m.beginPath();l.path.forEach((p,i)=>i?m.lineTo(20+p.x*scale,dy(p.y)):m.moveTo(20+p.x*scale,dy(p.y)));m.stroke();m.setLineDash([]);for(let i=0;i<3;i++){m.strokeStyle=g.cleared[i]?'#86b29d':'#c8a46a';m.beginPath();m.moveTo(20+l.gates[i]*scale,23);m.lineTo(20+l.gates[i]*scale,133);m.stroke();}for(const a of[g.cart,...g.enemies.filter(e=>e.hp>0),g.player]){m.fillStyle=a.id==='cart'?'#efc268':a.id==='player'?'#9acdb4':'#d98f6d';m.beginPath();m.arc(20+a.x*scale,dy(a.y),a.id==='player'?5:4,0,Math.PI*2);m.fill();}m.font='11px system-ui';m.fillStyle='#c8ba9b';m.textAlign='center';m.fillText('守灯人 · 灯车 · 三段街口',220,160);
  previous=new Map([g.player,...g.enemies].map(a=>[a.id,{x:a.x,y:a.y}]));previousTick=g.ticks;previousLevel=g.level;
 }
 return{ready,draw};
}


