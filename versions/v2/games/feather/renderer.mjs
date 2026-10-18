import {SPRITE_META} from './asset-meta.mjs';
import {SPECIES,ELEMENTS,WALKABLE,SITES,maxHP,partner,active,nextIntent,captureChance} from './model.mjs';
// These anchors follow the actual painted dry land; logical grid coordinates are not pixel coordinates.
export const ANCHORS={'1,3':[.25,.69],'2,3':[.33,.69],'3,3':[.42,.70],'4,3':[.50,.71],'5,3':[.61,.73],'6,3':[.64,.63],'7,3':[.68,.53],'1,2':[.25,.54],'1,1':[.22,.43],'2,1':[.30,.42],'3,1':[.39,.41],'3,2':[.41,.56],'4,1':[.45,.32],'5,1':[.51,.31],'5,2':[.61,.46],'7,2':[.72,.52],'7,1':[.76,.50]};
export const point=(x,y)=>{const p=ANCHORS[x+','+y];return {x:p[0]*1200,y:p[1]*675};};
let textScale=1;
const C={ink:'#f8f1d7',muted:'#d3dfc6',panel:'#173d36',gold:'#efc978'};
function round(ctx,x,y,w,h,r=14){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function pill(ctx,text,x,y,{w=0,fill='rgba(19,46,39,.92)',size=19,color=C.ink}={}){size=Math.round(size*textScale);ctx.font=`600 ${size}px sans-serif`;const width=w||ctx.measureText(text).width+24;ctx.fillStyle=fill;round(ctx,x-width/2,y,width,size+17,12);ctx.fill();ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,x,y+size+5);}
function shadow(ctx,x,y,w){ctx.fillStyle='rgba(20,44,34,.25)';ctx.beginPath();ctx.ellipse(x,y,w*.38,w*.09,0,0,Math.PI*2);ctx.fill();}
function sprite(ctx,assets,id,x,foot,width,flip=false,opacity=1){const im=assets[id];if(!im)return;const height=width*im.height/im.width;ctx.save();ctx.globalAlpha=opacity;shadow(ctx,x,foot-2,width);ctx.translate(x,foot);if(flip)ctx.scale(-1,1);const footAnchor=SPRITE_META[id].foot;ctx.drawImage(im,-width*footAnchor[0],-height*footAnchor[1],width,height);ctx.restore();}
function bar(ctx,label,val,max,x,y,w,color){ctx.fillStyle='rgba(15,37,31,.72)';round(ctx,x,y,w,48,12);ctx.fill();ctx.font=`600 ${Math.round(18*textScale)}px sans-serif`;ctx.fillStyle=C.ink;ctx.textAlign='left';ctx.fillText(label+' '+val+' / '+max,x+12,y+(textScale>1?26:21));ctx.fillStyle='#3c5d50';round(ctx,x+12,y+31,w-24,7,4);ctx.fill();ctx.fillStyle=color;round(ctx,x+12,y+31,Math.max(1,(w-24)*val/max),7,4);ctx.fill();}
export function render(ctx,s,assets,{time=0,showPaths=true,viewportWidth=1200}={}){
textScale=viewportWidth<=640?1.45:1;
ctx.clearRect(0,0,1200,675);if(assets.background)ctx.drawImage(assets.background,0,0,1200,675);else{ctx.fillStyle='#315c4c';ctx.fillRect(0,0,1200,675);ctx.fillStyle=C.ink;ctx.font='24px sans-serif';ctx.fillText('场景美术加载中…',40,50);}
if(s.phase==='encounter'){drawEncounter(ctx,s,assets,time);return;}
if(s.phase==='camp'){ctx.fillStyle='rgba(12,39,31,.13)';ctx.fillRect(0,0,1200,675);pill(ctx,'归羽营地 · 选两位再出发',600,32,{size:23});
 const roster=s.roster;const poses=[[390,510,142],[535,500,140],[675,515,122],[820,510,132],[965,520,162]];
 roster.forEach((p,i)=>{const [x,y,w]=poses[i];sprite(ctx,assets,p.id,x,y,w,false,1);pill(ctx,SPECIES[p.id].name+(p.rank?' · 成长':''),x,y+10,{size:18,fill:s.team.includes(p.id)?'rgba(24,72,57,.94)':'rgba(38,53,43,.8)'});if(s.team.includes(p.id)){ctx.fillStyle=C.gold;ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText(p.id===s.active?'领队':'同行',x,y+67);}});
 if(s.report?.recruited.length)pill(ctx,'新朋友已经回营：'+s.report.recruited.map(id=>SPECIES[id].name).join('、'),600,590,{size:22,fill:'rgba(32,71,53,.94)'});
 return;}
if(showPaths){ctx.save();ctx.lineWidth=4;ctx.setLineDash([2,12]);ctx.lineCap='round';ctx.strokeStyle='rgba(255,244,208,.9)';for(const[x,y]of WALKABLE)for(const[dx,dy]of [[1,0],[0,1]])if(ANCHORS[(x+dx)+','+(y+dy)]){const a=point(x,y),b=point(x+dx,y+dy);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.save();ctx.strokeStyle='rgba(25,60,43,.5)';ctx.lineWidth=7;ctx.stroke();ctx.restore();ctx.stroke();}ctx.restore();}
for(const[id,site]of Object.entries(SITES)){const p=point(site.x,site.y);if(id==='camp'){pill(ctx,'营地',p.x-65,p.y+28,{size:18});continue;}const used=s.sites[id];if(id==='berry'){ctx.fillStyle=used?'#a8b593':'#ecb0b9';ctx.beginPath();ctx.arc(p.x-8,p.y-10,7,0,Math.PI*2);ctx.arc(p.x+8,p.y-10,7,0,Math.PI*2);ctx.arc(p.x,p.y-23,7,0,Math.PI*2);ctx.fill();}else if(!used){sprite(ctx,assets,id,p.x+(id==='fin'?30:0),p.y-4,id==='fin'?96:72);}pill(ctx,used?'已探访':site.name,p.x,p.y+16,{size:17,fill:used?'rgba(48,66,48,.7)':'rgba(18,57,45,.91)'});}
const here=point(s.pos.x,s.pos.y);for(const[x,y]of WALKABLE)if(Math.abs(x-s.pos.x)+Math.abs(y-s.pos.y)===1){const p=point(x,y);ctx.strokeStyle='#fff0bc';ctx.lineWidth=3;ctx.fillStyle='rgba(42,85,62,.35)';ctx.beginPath();ctx.ellipse(p.x,p.y,15,9,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
const follower=s.team.find(id=>id!==s.active);if(follower)sprite(ctx,assets,follower,here.x-35,here.y+23,67,false,.85);sprite(ctx,assets,s.active,here.x,here.y,95);
pill(ctx,'沿亮色步点行走 · 方向键 / 点邻近步点',600,28,{size:20});
}
function drawEncounter(ctx,s,assets,time){const w=s.wild,p=active(s);ctx.fillStyle='rgba(11,35,29,.34)';ctx.fillRect(0,0,1200,675);const g=ctx.createLinearGradient(0,430,0,675);g.addColorStop(0,'rgba(13,37,31,0)');g.addColorStop(1,'rgba(13,37,31,.82)');ctx.fillStyle=g;ctx.fillRect(0,360,1200,315);
ctx.fillStyle='rgba(218,229,162,.15)';ctx.beginPath();ctx.ellipse(320,530,185,43,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(850,432,155,36,0,0,Math.PI*2);ctx.fill();
const heroWidth=p.id==='fin'?310:270,foeWidth=w.id==='fin'?300:225;const top=(id,foot,width)=>assets[id]?foot-width*assets[id].height/assets[id].width*SPRITE_META[id].foot[1]:200;sprite(ctx,assets,p.id,330,535,heroWidth);sprite(ctx,assets,w.id,850,443,foeWidth,true);
pill(ctx,'相遇 · '+SPECIES[w.id].name,600,26,{size:24});pill(ctx,SPECIES[p.id].name+' · '+ELEMENTS[SPECIES[p.id].element].name+(p.rank?' · 已成长':''),320,Math.max(85,top(p.id,535,heroWidth)-58),{size:21});pill(ctx,SPECIES[w.id].name+' · '+ELEMENTS[w.element].name,850,Math.max(82,top(w.id,443,foeWidth)-54),{size:21});
bar(ctx,'体力',p.hp,maxHP(p),180,555,300,'#b6d794');bar(ctx,'体力',w.hp,w.maxHP,705,456,290,'#edc381');bar(ctx,'安心',w.calm,60,705,510,290,'#8bd6dd');
pill(ctx,'下一步：'+nextIntent(s),850,575,{size:19});pill(ctx,'能量 '+p.energy+' / 3',330,614,{size:19});
if(s.notice){ctx.save();ctx.fillStyle='#f5e7bd';ctx.font=`600 ${Math.round(24*textScale)}px sans-serif`;ctx.textAlign='center';ctx.fillText('羽结回应率 '+captureChance(s)+'%',600,360);ctx.restore();}
}
export function hitNode(clientX,clientY,rect,s){const x=(clientX-rect.left)/rect.width*1200,y=(clientY-rect.top)/rect.height*675;let best=null,distance=45;for(const[nx,ny]of WALKABLE){if(Math.abs(nx-s.pos.x)+Math.abs(ny-s.pos.y)!==1)continue;const p=point(nx,ny),d=Math.hypot(x-p.x,y-p.y);if(d<distance){distance=d;best={x:nx,y:ny};}}return best?best.x>s.pos.x?'right':best.x<s.pos.x?'left':best.y>s.pos.y?'down':'up':null;}
