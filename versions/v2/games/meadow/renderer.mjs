/**
 * 草甸联赛 / MEADOW LEAGUE — original painted small-sided football.
 * Pure Canvas presentation of the six actual people and actual football.
 * No simulation, random calls, wall-clock reads, DOM, state edits or fake action.
 * The bounded oblique camera never follows a player or crops either goal.
 */
import {LEVELS,PITCH,shotDirection} from './engine.mjs';
export const VIEW=Object.freeze({width:1200,height:800});
const TAU=Math.PI*2, font='"Noto Sans CJK SC","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
const C={ink:'#17364a',navy:'#193b53',coral:'#e97d67',cream:'#fff6de',chalk:'#fffce9',wood:'#b6956f',woodDark:'#80694f',leaf:'#497b61',mint:'#a8d2a1'};
const SCENES=[
 {name:'清晨开球',sky:'#e9f2df',grass:'#a9cd94',stripe:'#a3c88d',leaf:'#66966c',flower:'#fff8d9',accent:'#e98570'},
 {name:'蒲公英日',sky:'#f3f0d6',grass:'#b1cf91',stripe:'#a7c688',leaf:'#72956a',flower:'#f9dc78',accent:'#e9936e'},
 {name:'风过林梢',sky:'#e1efe2',grass:'#9fc79c',stripe:'#96bf95',leaf:'#518a71',flower:'#dfead9',accent:'#d67e78'},
 {name:'雨后草地',sky:'#dce8e4',grass:'#9abbaa',stripe:'#92b3a2',leaf:'#5d8476',flower:'#ebefdc',accent:'#d98d7d',wet:true},
 {name:'夏日边线',sky:'#e3efdc',grass:'#a7c890',stripe:'#9bc086',leaf:'#5b8d61',flower:'#fcf2bb',accent:'#e87866'},
 {name:'反击时刻',sky:'#f6e2d0',grass:'#bac58f',stripe:'#aebc86',leaf:'#839369',flower:'#f5d9b6',accent:'#dd9275'},
 {name:'灯下配合',sky:'#c7d5d5',grass:'#91b19b',stripe:'#88a991',leaf:'#587e73',flower:'#e8e0ba',accent:'#dd9185',night:true},
 {name:'草甸决赛',sky:'#f3ecd4',grass:'#bacb97',stripe:'#acc18a',leaf:'#73936a',flower:'#f7d78b',accent:'#e18b6f'}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),num=(v,d=0)=>Number.isFinite(v)?v:d;
const noise=n=>{const v=Math.sin(n*71.31+39.17)*43758.5453;return v-Math.floor(v);};
const levelOf=s=>LEVELS[Math.max(0,Math.min(7,num(s?.levelIndex,typeof s?.level==='number'?s.level-1:0)))]||LEVELS[0];
const sceneOf=s=>SCENES[Math.max(0,Math.min(7,num(s?.levelIndex,typeof s?.level==='number'?s.level-1:0)))];
const levelNumber=s=>Math.max(1,Math.min(8,num(s?.levelIndex,typeof s?.level==='number'?s.level-1:0)+1));
function path(c,p,fill,stroke,w=1,close=true){c.beginPath();p.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));if(close)c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function line(c,x,y,a,b,col,w=1){path(c,[[x,y],[a,b]],null,col,w,false);}
function ellipse(c,x,y,rx,ry,col,stroke,w=1,angle=0){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),angle,0,TAU);if(col){c.fillStyle=col;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function round(c,x,y,w,h,r,col,stroke,lw=1){c.beginPath();c.roundRect(x,y,w,h,r);if(col){c.fillStyle=col;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function text(c,t,x,y,size=12,col=C.ink,align='left',weight=600){c.fillStyle=col;c.font=`${weight} ${size}px ${font}`;c.textAlign=align;c.textBaseline='middle';c.fillText(String(t),x,y);}
function curve(c,p,col,w=1){c.beginPath();c.moveTo(p[0],p[1]);c.bezierCurveTo(...p.slice(2));c.strokeStyle=col;c.lineWidth=w;c.stroke();}
function gradient(c,x,y,xx,yy,stops){const g=c.createLinearGradient(x,y,xx,yy);for(const[t,col]of stops)g.addColorStop(t,col);return g;}
/** Logical projection. z is genuine engine flight height, never an invented arc. */
export function projectPoint(state,x=500,y=300,z=0){const scale=.98+.08*clamp(y/PITCH.height,0,1);return{x:600+(x-PITCH.width/2)*scale,y:236+y*.74-z*scale*.88,scale};}
export function cameraFor(){return{kind:'bounded-oblique-overview',width:1200,height:800,worldWidth:PITCH.width,worldHeight:PITCH.height,xCenter:600,yOrigin:236,yScale:.74,farScale:.98,nearScale:1.06};}
export function projectPlayer(state,p=0){const player=typeof p==='number'?state.players[p]:p;if(!player)return null;return{...projectPoint(state,player.x,player.y),facing:player.facing,id:player.id};}
export function projectBall(state){const b=state.ball;if(!b)return null;return{...projectPoint(state,b.x,b.y,num(b.z)),ground:projectPoint(state,b.x,b.y),z:num(b.z)};}
function ground(c,s,pts,fill,stroke,w=1){path(c,pts.map(([x,y,z=0])=>{const p=projectPoint(s,x,y,z);return[p.x,p.y];}),fill,stroke,w);}
function groundLine(c,s,pts,col,w=2){ground(c,s,pts,null,col,w);}
function groundArc(c,s,x,y,r,a=0,b=TAU,col=C.chalk,w=2.4){const pts=[];for(let n=0;n<=64;n++){const t=a+(b-a)*n/64;pts.push([x+Math.cos(t)*r,y+Math.sin(t)*r]);}ground(c,s,pts,null,col,w);}
function tree(c,x,y,size,p,seed){c.save();c.translate(x,y);c.scale(size,size);ellipse(c,12,3,40,10,'#3158471b',null,1,-.15);path(c,[[-4,0],[-2,-37],[-9,-58],[-3,-52],[3,-35],[5,1]],'#8e8161');line(c,1,-25,17,-48,'#8e8161',3);line(c,-2,-32,-18,-49,'#8e8161',3);const leaves=[p.leaf,'#8aab78','#a8c28e','#bdd3a0'];for(let n=0;n<13;n++){const a=n*2.399,r=13+noise(seed+n)*22;ellipse(c,Math.cos(a)*r,-58+Math.sin(a)*r*.66,18+noise(seed+n+5)*7,16+noise(seed+n+17)*7,leaves[n%4]);}for(let n=0;n<15;n++)ellipse(c,-35+noise(seed+n*5)*70,-84+noise(seed+n*11)*47,2.6,1.3,'#e1e8b745',null,1,-.4);c.restore();}
function flag(c,x,y,size=1,col=C.coral){line(c,x,y,x,y-32*size,'#a28d68',2*size);path(c,[[x,y-32*size],[x+24*size,y-26*size],[x+2*size,y-20*size]],col);ellipse(c,x,y-33*size,2*size,2*size,C.cream);}
function stand(c,x,y,size,p,label){c.save();c.translate(x,y);c.scale(size,size);ellipse(c,5,7,113,18,'#325d4420');path(c,[[-105,5],[105,5],[98,-42],[-98,-42]],'#c7b18b',C.woodDark,1.2);for(let n=0;n<4;n++){const yy=-32+n*11;path(c,[[-100-n*2,yy],[100+n*2,yy],[103+n*2,yy+5],[-103-n*2,yy+5]],'#e5d4ac',C.woodDark,.8);line(c,-100,yy+6,100,yy+6,'#a68a65',1.1);}for(let i=0;i<17;i++){const yy=i%2?-25:-40,xx=-88+i*11;const skin=['#b98059','#e8b994','#795944','#c5966e'][i%4];line(c,xx-2,yy+9,xx-3,yy+16,C.navy,2);line(c,xx+2,yy+9,xx+4,yy+16,C.navy,2);round(c,xx-4,yy-1,8,11,2,[C.coral,C.navy,'#d4ba78','#90ad91'][i%4]);ellipse(c,xx,yy-5,3.5,4.5,skin);ellipse(c,xx,yy-8,3.6,2.2,'#4c4a3c');}for(const xx of[-110,110])line(c,xx,10,xx,-82,C.woodDark,4);path(c,[[-122,-77],[-103,-94],[103,-94],[122,-77]],'#dccca7',C.woodDark,1.5);for(let n=0;n<10;n++)path(c,[[-121+n*24,-77],[-102+n*20,-94],[-90+n*20,-94],[-108+n*24,-77]],n%2?p.accent:'#f6edcf');line(c,-121,-77,121,-77,'#f7edcf',3);round(c,-49,-112,98,19,3,C.cream,C.woodDark,1);text(c,label,0,-102,10,C.navy,'center',800);flag(c,-110,-79,.65,p.accent);flag(c,110,-79,.65,C.navy);c.restore();}
function flowers(c,x,y,seed,p){for(let n=0;n<4;n++){const xx=x+noise(seed+n)*14,yy=y+noise(seed+n+4)*6;line(c,xx,yy,xx-1,yy-5,'#6c9a6c',.7);ellipse(c,xx-1,yy-5,1.8,1.6,p.flower);ellipse(c,xx-1,yy-5,.65,.65,'#e8bc6b');}}
function scenery(c,s){const p=sceneOf(s),n=levelNumber(s);c.fillStyle=C.cream;c.fillRect(0,0,1200,800);round(c,16,16,1168,768,24,'#f8f1dc','#d9d9bd',1.2);c.save();round(c,24,24,1152,752,19);c.clip();c.fillStyle=gradient(c,0,110,0,710,[[0,p.sky],[.45,'#d8e2c0'],[1,'#d6dfb7']]);c.fillRect(24,115,1152,605);
// Watercolour hills, open grass and low timber stands leave the entire pitch legible.
path(c,[[24,188],[117,166],[205,175],[293,147],[397,165],[500,151],[609,168],[700,143],[812,160],[921,149],[1071,173],[1176,158],[1176,270],[24,270]],'#c8d8b8');path(c,[[24,208],[133,192],[229,208],[361,186],[492,204],[614,183],[758,199],[890,186],[1010,207],[1176,195],[1176,290],[24,290]],'#b6cfaa');
for(let i=0;i<23;i++){const x=45+i*52,yy=225+noise(i+7)*13;tree(c,x,yy,.35+noise(i+3)*.19,p,30+i);}
stand(c,346,223,.78,p,'草 甸 球 迷 会');stand(c,852,223,.78,p,'MEADOW  LEAGUE');
if(p.night)for(const x of[182,1018]){line(c,x,244,x,151,'#718875',3);line(c,x-16,151,x+16,151,C.navy,3);for(const dx of[-11,11]){round(c,x+dx-7,147,14,8,2,C.navy);round(c,x+dx-5,149,10,4,1,'#fff1b8');}const glow=c.createRadialGradient(x,153,2,x,153,45);glow.addColorStop(0,'#fff5c75a');glow.addColorStop(1,'#fff5c700');c.fillStyle=glow;c.fillRect(x-45,108,90,90);}
for(const d of[[65,246,1.2],[1141,250,1.17],[57,449,.83],[1147,462,.8],[48,660,.75],[1152,672,.74]])tree(c,...d,p,n*17+d[0]);
for(let i=0;i<82;i++){const x=35+noise(i*2+15)*1130,y=237+noise(i*3+79)*456;if(x>95&&x<1105&&y>248&&y<677)continue;flowers(c,x,y,i*13+n,p);}
// Small kit bags and benches are outside the clear field, never additional players.
for(const x of[278,782]){path(c,[[x,692],[x+135,692],[x+129,686],[x+6,686]],'#d9c49d',C.woodDark,1);for(const xx of[x+12,x+122])line(c,xx,693,xx,700,C.woodDark,3);round(c,x+45,681,25,9,3,C.navy);line(c,x+52,681,x+56,677,C.navy,1.5);line(c,x+64,681,x+61,677,C.navy,1.5);round(c,x+89,680,4,11,1,p.accent);ellipse(c,x+91,680,2,1,C.cream);}
c.restore();}
function pitch(c,s){const p=sceneOf(s),{minX:l,maxX:r,minY:t,maxY:b}=PITCH;
ground(c,s,[[l-14,t-15],[r+14,t-15],[r+14,b+15],[l-14,b+15]],'#5d84613d');ground(c,s,[[l-9,t-10],[r+9,t-10],[r+9,b+10],[l-9,b+10]],'#d8d4ad','#9da984',1.2);ground(c,s,[[l,t],[r,t],[r,b],[l,b]],p.grass);
for(let i=0;i<10;i++)if(i%2===0){const x=l+(r-l)*i/10;ground(c,s,[[x,t],[x+(r-l)/10,t],[x+(r-l)/10,b],[x,b]],p.stripe);}
if(p.wet)for(let n=0;n<21;n++){const q=projectPoint(s,90+noise(n+19)*820,90+noise(n+97)*430);ellipse(c,q.x,q.y,9+noise(n+31)*12,1.3,'#e7efdc27');}
// Fixed pigment specks are paint, not moving weather or gameplay effects.
for(let i=0;i<650;i++){const x=l+noise(i+219)*(r-l),y=t+noise(i+729)*(b-t),q=projectPoint(s,x,y);ellipse(c,q.x,q.y,1+noise(i+912)*1.9,.35+noise(i)*.4,i%4?'#fcf9d50c':'#376b4520');}
ground(c,s,[[l,t],[r,t],[r,b],[l,b]],null,C.chalk,2.8);groundLine(c,s,[[500,t],[500,b]],C.chalk,2.5);groundArc(c,s,500,300,78);const center=projectPoint(s,500,300);ellipse(c,center.x,center.y,3,2.3,C.chalk);
for(const side of[0,1]){const x=side?r:l,dir=side?-1:1,xx=x+dir*PITCH.boxDepth;groundLine(c,s,[[x,PITCH.boxTop],[xx,PITCH.boxTop],[xx,PITCH.boxBottom],[x,PITCH.boxBottom]],C.chalk,2.5);groundLine(c,s,[[x,PITCH.goalTop-24],[x+dir*58,PITCH.goalTop-24],[x+dir*58,PITCH.goalBottom+24],[x,PITCH.goalBottom+24]],C.chalk,2.2);const spot=projectPoint(s,x+dir*101,300);ellipse(c,spot.x,spot.y,2.8,2.1,C.chalk);groundArc(c,s,x+dir*101,300,72,side?Math.PI*.61:-Math.PI*.39,side?Math.PI*1.39:Math.PI*.39,C.chalk,2.1);}
// Low continuous wooden boards accurately express the enclosed, reboundable boundary.
for(const y of[t-6,b+6]){const a=projectPoint(s,l-6,y),z=projectPoint(s,r+6,y);line(c,a.x,a.y,z.x,z.y,'#899477',3);line(c,a.x,a.y-8,z.x,z.y-8,'#e8dfbc',4);for(let x=l-6;x<=r+6;x+=52){const q=projectPoint(s,x,y);line(c,q.x,q.y+1,q.x,q.y-11,'#b3a680',3);}}
for(const x of[l-7,r+7])for(const [ya,yb]of[[t-6,PITCH.goalTop],[PITCH.goalBottom,b+6]]){const a=projectPoint(s,x,ya),z=projectPoint(s,x,yb);line(c,a.x,a.y-6,z.x,z.y-6,'#e8dfbc',4);line(c,a.x,a.y,z.x,z.y,'#899477',2.5);for(let y=ya;y<=yb;y+=49){const q=projectPoint(s,x,y);line(c,q.x,q.y+1,q.x,q.y-10,'#b3a680',3);}}
for(const [x,y]of[[l,t],[r,t],[l,b],[r,b]]){const q=projectPoint(s,x,y);flag(c,q.x,q.y,.48,C.coral);}
}
function goalBack(c,s,side){const x=side?PITCH.maxX:PITCH.minX,xx=x+(side?31:-31),a=PITCH.goalTop,b=PITCH.goalBottom,h=PITCH.goalHeight;
ground(c,s,[[x,a],[xx,a],[xx,b],[x,b]],'#e6e5c94d');ground(c,s,[[xx,a],[xx,a,h*.73],[xx,b,h*.73],[xx,b]],'#eff0db38','#a5b19a',1.3);
for(let yy=a;yy<=b;yy+=19)groundLine(c,s,[[xx,yy],[xx,yy,h*.73]],'#f9f6dcbb',.8);for(let z=0;z<=h*.73;z+=11)groundLine(c,s,[[xx,a,z],[xx,b,z]],'#f9f6dcbb',.8);
for(const yy of[a,b]){ground(c,s,[[x,yy],[x,yy,h],[xx,yy,h*.73],[xx,yy]],'#eef0db1c','#c2c9ae',1);for(let zz=12;zz<h;zz+=12)groundLine(c,s,[[x,yy,zz],[xx,yy,zz*.73]],'#fff9dc99',.8);}
for(let yy=a;yy<=b;yy+=19)groundLine(c,s,[[x,yy,h],[xx,yy,h*.73]],'#fffbdfaa',.8);for(let n=1;n<4;n++){const ratio=n/4;groundLine(c,s,[[x+(xx-x)*ratio,a,h*(1-ratio*.27)],[x+(xx-x)*ratio,b,h*(1-ratio*.27)]],'#fffbdfaa',.8);}
}
function goalPost(c,s,side,front=true){const x=side?PITCH.maxX:PITCH.minX,a=PITCH.goalTop,b=PITCH.goalBottom,h=PITCH.goalHeight;if(front){groundLine(c,s,[[x,b],[x,b,h]],C.navy,5.7);groundLine(c,s,[[x,b],[x,b,h]],'#fff9df',3.8);}else{groundLine(c,s,[[x,a],[x,a,h],[x,b,h]],C.navy,5.8);groundLine(c,s,[[x,a],[x,a,h],[x,b,h]],'#fff9df',3.8);}}
const SKINS=['#d79b72','#a96f50','#edbd91','#835b45','#d4a47d','#bd815c'];
const HAIR=['#283742','#51392c','#805b39','#252f36','#704638','#3d3330'];
const NUMBERS=[7,11,1,9,6,1];
/** Local pose uses only engine velocity/runPhase/action/actionT/charge. */
export function poseFor(s,p,{reducedMotion=false}={}){const speed=Math.hypot(num(p.vx),num(p.vy)),running=s.state==='playing'&&speed>8,stride=running&&!reducedMotion?Math.sin(num(p.runPhase))*clamp(speed/125,0,1):0;const action=String(p.action||''),active=num(p.actionT)>0;return{speed,running,stride,action:action==='charge'&&s.charging&&p.id===s.controlled?'charge':active?action:'',phase:clamp(num(p.actionT)/.45,0,1),facing:num(p.faceX,num(p.facing)===0?1:Math.cos(p.facing))<-.12?-1:1,charge:s.charging&&p.id===s.controlled?clamp(num(s.charge)/num(s.chargeMax,1.2),0,1):p.aiCharging?clamp(num(p.aiCharge)/num(s.chargeMax,1.2),0,1):0};}
function limb(c,pts,col,w){for(let i=1;i<pts.length;i++)line(c,...pts[i-1],...pts[i],col,w);}
function person(c,s,p,index,options){const q=projectPlayer(s,p),pose=poseFor(s,p,options),keeper=p.role==='keeper',team=p.team===1?1:0,skin=SKINS[index%6],hair=HAIR[index%6],kit=keeper?(team?'#d4ae54':'#5d9b87'):(team?C.coral:C.navy),dark=keeper?(team?'#8b733a':'#346f65'):(team?'#9f4f4b':'#102c40'),trim=keeper?'#fff7d9':team?'#fff2db':'#f7ead2',f=pose.facing,stride=pose.stride,selected=p.id===s.controlled,scale=q.scale*1.12,action=pose.action;
c.save();c.translate(q.x,q.y);c.scale(scale,scale);ellipse(c,3,1,15+Math.abs(stride)*3,5,'#1f4a3b35');if(selected){ellipse(c,0,1,19,7,null,'#fffbe0',2);ellipse(c,0,1,21.5,8,null,'#193b533b',.8);}
let turn=0,lean=clamp(num(p.vx)/170,-1,1)*2,hip=-22,bob=pose.running&&!options.reducedMotion?Math.abs(stride)*1.6:0;
// Diving is shown exclusively during an actual keeper save, with the same facing vector.
if(action==='save'&&keeper){turn=(num(p.faceY)>=0?1:-1)*.91;lean=f*7;bob=4;}else if(action==='recover'){turn=f*.18;hip=-18;}
c.translate(lean,-bob);if(turn)c.rotate(turn);
let rearFoot=[-7-stride*9,0],frontFoot=[6+stride*9,0],rearKnee=[-7-stride*3,-11],frontKnee=[6+stride*3,-11];
if(action==='charge'){frontFoot=[f*-13,-2-pose.charge*6];frontKnee=[f*-14,-12-pose.charge*2];rearFoot=[f*5,0];rearKnee=[f*1,-11];}
if(action==='shoot'||action==='pass'){const kick=1-pose.phase*.2;frontFoot=[f*(16+kick*6),-9-kick*5];frontKnee=[f*10,-15];rearFoot=[-f*7,0];rearKnee=[-f*4,-11];}
if(action==='tackle'){frontFoot=[f*22,-1];frontKnee=[f*10,-9];rearFoot=[-f*12,-2];rearKnee=[-f*6,-10];hip=-18;}
if(action==='receive'){frontFoot=[f*15,-2];frontKnee=[f*8,-11];}
if(action==='save'&&keeper){rearFoot=[-9,-1];frontFoot=[9,-6];rearKnee=[-8,-11];frontKnee=[8,-13];}
for(const [i,knee,foot]of[[0,rearKnee,rearFoot],[1,frontKnee,frontFoot]]){const root=[i?-3:3,hip];limb(c,[root,knee,foot],dark,7);limb(c,[[knee[0],knee[1]+2],[foot[0],foot[1]-1]],skin,5.5);const sockTop=[knee[0]+(foot[0]-knee[0])*.40,knee[1]+(foot[1]-knee[1])*.40];limb(c,[sockTop,[foot[0],foot[1]-1]],trim,5.8);line(c,sockTop[0]-.2,sockTop[1]+1,sockTop[0]+.2,sockTop[1]+3,kit,5.8);round(c,foot[0]-4+(f<0?-3:0),foot[1]-2,11,4,1.8,i?'#f7e9ca':'#243746',C.ink,.65);line(c,foot[0]-2,foot[1]+2,foot[0]+5,foot[1]+2,'#203444',.9);}
// Far arm first, then tailored shirt / shorts, then near arm and expressive face.
let left=[[-9,-38],[-16-stride*3,-29],[-12-stride*6,-23]],right=[[9,-38],[16+stride*3,-31],[11+stride*6,-23]];
if(action==='charge'){left=[[-9,-38],[-17,-34],[-21,-29]];right=[[9,-38],[15,-29],[f*21,-24]];}
if(action==='shoot'||action==='pass'||action==='tackle'){left=[[-9,-38],[-18,-36],[-24,-30]];right=[[9,-38],[17,-40],[22,-37]];}
if(action==='receive'){left=[[-9,-38],[-15,-33],[-17,-28]];right=[[9,-38],[15,-34],[18,-29]];}
if(keeper){left=[[-9,-38],[-17,-31],[-18,-25]];right=[[9,-38],[17,-31],[18,-25]];if(action==='save'){left=[[-9,-38],[-12,-48],[-10,-60]];right=[[9,-38],[9,-49],[6,-61]];}else if(p.hasBall){left=[[-9,-38],[-13,-30],[-5,-29]];right=[[9,-38],[13,-30],[5,-29]];}}
limb(c,left,skin,5.2);line(c,...left[0],...left[1],kit,7);ellipse(c,...left[2],keeper?3.8:2.5,keeper?3.2:2.7,keeper?C.cream:skin,C.ink,.4);
line(c,0,-46,0,-38,skin,6);path(c,[[-6,-42],[-12,-38],[-10,-27],[-8,-23],[8,-23],[10,-27],[12,-38],[6,-42],[3,-38],[-3,-38]],kit,C.ink,.75);path(c,[[-8,-25],[8,-25],[10,hip+2],[1,hip+3],[0,hip-1],[-1,hip+3],[-10,hip+2]],dark,C.ink,.6);line(c,-7,-40,-11,-36,trim,2.1);line(c,7,-40,11,-36,trim,2.1);path(c,[[-4,-41],[0,-37],[4,-41]],null,trim,1.5,false);line(c,-8,-26,8,-26,trim,.9);line(c,7,-35,6,-28,'#ffffff30',1.6);text(c,NUMBERS[index%6],0,-31,8.5,trim,'center',900);if(!keeper){ellipse(c,-5,-36,1.6,1.9,trim);line(c,4,-36,7,-36,trim,.8);}
limb(c,right,skin,5.5);line(c,...right[0],...right[1],kit,7);ellipse(c,...right[2],keeper?3.8:2.7,keeper?3.2:2.9,keeper?C.cream:skin,C.ink,.4);
ellipse(c,0,-49,7.3,8.9,skin,C.ink,.55);ellipse(c,-7,-49,1.6,2.5,skin);ellipse(c,7,-49,1.6,2.5,skin);
if(index%3===0){for(let j=0;j<6;j++)ellipse(c,-6+j*2.3,-55.4+(j%2)*1.1,2.5,3,hair);path(c,[[-7,-53],[-5,-48],[-5,-53],[5,-53],[7,-49],[7,-55]],hair);}else if(index%3===1){path(c,[[-7,-49],[-8,-55],[-4,-59],[3,-59],[7,-56],[8,-50],[4,-52],[2,-55],[-5,-53],[-5,-48]],hair);if(index===4)ellipse(c,-5,-57,5,3.2,hair);}else{path(c,[[-7,-50],[-7,-55],[-3,-58],[4,-58],[7,-54],[7,-50],[4,-53],[-4,-53]],hair);line(c,-6,-54,6,-54,trim,1.8);}
ellipse(c,f*2.9,-49,1,1.15,C.ink);line(c,f*5,-48,f*6,-46,'#8d5b46',.8);line(c,f*1.5,-44,f*4,-44,'#925f49',.8);
if(selected){path(c,[[-3.5,-67],[3.5,-67],[0,-62]],C.cream,C.navy,.8);}
c.restore();}
function ballShadow(c,s){const b=s.ball;if(!b)return;const q=projectBall(s),z=Math.max(0,num(b.z)),r=7.3*q.scale;ellipse(c,q.ground.x+z*.04,q.ground.y+1,r*(1+.004*z),2.6*q.scale*(1+.002*z),`rgba(21,58,43,${clamp(.31-z*.002,.09,.31)})`);}
function football(c,s){if(!s.ball)return;const q=projectBall(s),b=s.ball,r=7.4*q.scale;c.save();c.translate(q.x,q.y-r*.55);c.rotate((num(b.x)+num(b.y))*.015);const g=c.createRadialGradient(-r*.35,-r*.45,1,0,0,r);g.addColorStop(0,'#fffef3');g.addColorStop(.72,'#efe9cf');g.addColorStop(1,'#c7d1b5');ellipse(c,0,0,r,r,g,C.ink,.9);path(c,[[0,-3.3],[3.2,-1],[2,2.7],[-2,2.7],[-3.2,-1]],C.navy);for(let j=0;j<5;j++){const a=-Math.PI/2+j*TAU/5,x=Math.cos(a)*r*.86,y=Math.sin(a)*r*.86;path(c,[[x,y],[x+Math.cos(a+2)*2.7,y+Math.sin(a+2)*2.7],[x+Math.cos(a-2)*2.7,y+Math.sin(a-2)*2.7]],C.navy);line(c,Math.cos(a)*3,Math.sin(a)*3,x,y,'#83938b',.55);}ellipse(c,-r*.35,-r*.45,1.2,.7,'#ffffff');c.restore();}
function formatClock(v){const t=Math.max(0,Math.ceil(num(v)));return`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;}
function hud(c,s){const level=levelOf(s),number=levelNumber(s),p=sceneOf(s),score=s.score||[0,0],stateNames={ready:'准备开球',kickoff:'开球准备',playing:'比赛进行中',goal:'进球',paused:'已暂停',won:'比赛胜利',lost:'比赛结束'};
round(c,35,29,1130,91,15,C.navy);line(c,312,47,312,104,'#cbdac432');text(c,'草 甸 联 赛',57,66,29,C.cream,'left',900);text(c,'MEADOW LEAGUE  /  THREE-A-SIDE',60,99,9,'#c4d5cb','left',700);
text(c,'草甸队',398,52,12,C.cream,'center',800);round(c,361,68,74,32,7,'#254e64','#6e8e93',.8);text(c,score[0],398,85,25,C.cream,'center',900);text(c,'VS',459,86,11,'#adc6bd','center',800);text(c,level.opponent||'来访队',520,52,12,'#f2c1a7','center',800);round(c,483,68,74,32,7,p.accent);text(c,score[1],520,85,25,C.cream,'center',900);
line(c,592,47,592,104,'#cbdac432');text(c,'剩余时间',630,51,9,'#b8cdbf');text(c,formatClock(s.time??level.duration??90),628,84,31,C.cream,'left',900);text(c,stateNames[s.state]||'草甸联赛',820,84,10,'#bdd3c2','right');
text(c,`第 ${String(number).padStart(2,'0')} 场 / 08`,1139,51,10,'#c9d7c0','right',700);text(c,level.name||p.name,1139,79,20,C.cream,'right',800);text(c,'2 名队员 + 1 名门将  ·  封闭式小场足球',1139,104,9,'#c0d0bd','right');
round(c,37,718,1126,55,12,'#fbf6e3','#c9d1ae',1.1);const controlled=s.players?.find(x=>x.id===s.controlled),owner=s.players?.find(x=>x.id===s.ball?.owner),status=s.state==='goal'?'进球 · 准备重新开球':s.state==='paused'?'比赛已暂停':s.state==='won'||s.state==='lost'?'终场哨响':s.state==='ready'||s.state==='kickoff'?'等待开球':s.charging?'蓄力射门 · 松开出脚':owner?.team===0?'草甸队控球':owner?.team===1?'对方控球':s.ball?.mode==='shot'?'足球正在飞行':s.ball?.mode==='pass'?'传球进行中':'争夺球权';
ellipse(c,59,745,8,8,C.navy);text(c,controlled?NUMBERS[s.players.indexOf(controlled)]:'7',59,745,9,C.cream,'center',900);text(c,status,79,738,12,C.navy,'left',800);text(c,'向右侧球门进攻  →',79,758,9,'#718976');
text(c,'射门蓄力',323,735,9,'#718976');round(c,323,746,178,9,4,'#e2e7cb');if(s.charging)round(c,323,746,178*clamp(num(s.charge)/num(s.chargeMax,1.2),0,1),9,4,p.accent);text(c,'移动  WASD / 方向键',548,739,11,C.navy);text(c,'射门  空格    传球 / 抢断  J    切换  K',548,758,10,'#718976');
const shots=s.stats?.shots||[0,0],saves=s.stats?.saves||[0,0];text(c,`射门  ${shots[0]} : ${shots[1]}`,1139,737,10,C.navy,'right');text(c,`扑救  ${saves[0]} : ${saves[1]}`,1139,757,10,'#718976','right');
if(s.state==='goal'){round(c,461,135,278,42,12,C.coral,C.cream,2);text(c,'进 球 ！',600,157,25,C.cream,'center',900);}else if(s.state==='paused'){round(c,482,137,236,42,12,C.navy,C.cream,2);text(c,'比赛已暂停',600,158,20,C.cream,'center',800);}else if(s.state==='ready'){round(c,472,137,256,39,12,'#fff8e4eb','#b8c6a5',1);text(c,'三人登场，哨声即将响起',600,157,14,C.navy,'center',800);}else if(s.state==='won'||s.state==='lost'){round(c,443,136,314,44,12,s.state==='won'?C.navy:'#756c60',C.cream,2);text(c,s.state==='won'?'终场哨响 · 草甸队获胜':'终场哨响 · 再战下一场',600,158,18,C.cream,'center',800);}else if(s.state==='kickoff'){round(c,478,137,244,38,12,'#fff8e4eb','#b8c6a5',1);text(c,'回到中圈，准备开球',600,157,14,C.navy,'center',800);}
}
// Read-only cues: the arrow shares shoot()'s exact facing rule, never predicts a goal.
function playCues(c,s){
 const owner=s.ball?.owner==null?null:s.players[s.ball.owner];
 if(owner){const q=projectPlayer(s,owner);ellipse(c,q.x,q.y+1,25,9,null,'#e5b44f',2.5);ellipse(c,q.x,q.y+1,27.5,10,null,'#fff8dc99',1);}
 const p=s.players[s.controlled];if(!p||s.state!=='playing'||s.ball.owner!==p.id)return;
 const d=shotDirection(p),a=projectPoint(s,p.x+d.x*28,p.y+d.y*28),b=projectPoint(s,p.x+d.x*76,p.y+d.y*76),ang=Math.atan2(b.y-a.y,b.x-a.x);
 c.save();line(c,a.x,a.y,b.x,b.y,'#183d5455',6);line(c,a.x,a.y,b.x,b.y,'#fffbe4dc',3);path(c,[[b.x,b.y],[b.x-11*Math.cos(ang-.5),b.y-11*Math.sin(ang-.5)],[b.x-11*Math.cos(ang+.5),b.y-11*Math.sin(ang+.5)]],'#fffbe4dc');
 const mate=s.players.find(q=>q.team===0&&q.role==='outfield'&&q.id!==p.id);if(mate){const q=projectPlayer(s,mate);c.setLineDash([3,4]);ellipse(c,q.x,q.y+1,22,8,null,'#fffbe499',1.5);c.setLineDash([]);}c.restore();
}
export function render(ctx,state,{width=1200,height=800,time=0,reducedMotion=false}={}){if(!ctx||!state)return;ctx.save();ctx.setTransform(width/1200,0,0,height/800,0,0);ctx.clearRect(0,0,1200,800);ctx.lineCap='round';ctx.lineJoin='round';scenery(ctx,state);pitch(ctx,state);goalBack(ctx,state,0);goalBack(ctx,state,1);goalPost(ctx,state,0,false);goalPost(ctx,state,1,false);ballShadow(ctx,state);playCues(ctx,state);
const draw=(state.players||[]).map((p,i)=>({y:p.y,type:'player',p,i}));draw.push({y:PITCH.goalBottom+.1,type:'post',side:0},{y:PITCH.goalBottom+.1,type:'post',side:1});if(state.ball)draw.push({y:state.ball.y+.1,type:'ball'});draw.sort((a,b)=>a.y-b.y||(a.type==='ball'?1:-1));for(const item of draw){if(item.type==='player')person(ctx,state,item.p,item.i,{reducedMotion});else if(item.type==='post')goalPost(ctx,state,item.side,true);else football(ctx,state);}hud(ctx,state);ctx.restore();}
export default render;
