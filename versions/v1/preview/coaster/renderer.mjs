/**
 * 云岬游乐园 · original code-painted coastal miniature.
 * Canvas-only, deterministic and read-only. No DOM, assets, network or RNG.
 * Track geometry and train progress come exclusively from the engine state.
 * Projectors and hit testing use the logical 1200 × 800 coordinate space.
 */
export const VIEW = Object.freeze({ width:1200, height:800, originX:610, originY:420, centerX:500, centerY:340, xx:.80, xy:-.57, yx:.24, yy:.40, elevation:2.7 });
const TAU=Math.PI*2;
const C={ink:'#244e45',cream:'#f7edcf',light:'#fff6df',coral:'#c66045',gold:'#ddb469',steel:'#466f70',sea:'#84b7b9',moss:'#829c6d',deep:'#284d4b'};
const MODULES={rail:{name:'普通轨',color:'#4e8885',symbol:'轨'},lift:{name:'链式提升',color:'#cb9a3f',symbol:'升'},drive:{name:'动力推进',color:'#4f8eab',symbol:'推'},trim:{name:'调速轨',color:'#dc9d51',symbol:'缓'},brake:{name:'制动轨',color:'#c66045',symbol:'刹'},bank:{name:'倾斜弯轨',color:'#8c79a0',symbol:'倾'}};
const STATUS={design:'工程设计',testing:'空车试运行',operating:'载客运营',paused:'已暂停',won:'目标达成',lost:'运营结束'};
const noise=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
const finite=(n,d=0)=>Number.isFinite(n)?n:d;
const points=s=>s?.level?.points||[];
export function projectPoint(x,y,z=0){return{x:VIEW.originX+(x-VIEW.centerX)*VIEW.xx+(y-VIEW.centerY)*VIEW.xy,y:VIEW.originY+(x-VIEW.centerX)*VIEW.yx+(y-VIEW.centerY)*VIEW.yy-z*VIEW.elevation};}
export function projectTrackPoint(state,segment,t=.5){const p=points(state),i=Number(segment);if(!p.length||!Number.isInteger(i)||i<0||i>=p.length||!Number.isFinite(t))return null;const a=p[i],b=p[(i+1)%p.length],u=Math.max(0,Math.min(1,t));return projectPoint(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,a.z+(b.z-a.z)*u);}
function closest(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/l)):0;return{distance:Math.hypot(x-a.x-t*dx,y-a.y-t*dy),t};}
export function projectSegmentLabel(state,i){const a=projectTrackPoint(state,i,0),b=projectTrackPoint(state,i,1);if(!a||!b)return null;const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(i===9)return{x:m.x+40,y:m.y-5};if(i===10)return{x:m.x-31,y:m.y+42};if(i===11)return{x:m.x-37,y:m.y+14};const side=m.y<410?-1:1;return{x:m.x-dy/l*19*side,y:m.y+dx/l*19*side};}
export function hitSegment(x,y,state){if(!Number.isFinite(x)||!Number.isFinite(y))return null;let result=null,distance=22;const p=points(state);for(let i=0;i<p.length;i++){const label=projectSegmentLabel(state,i);if(Math.abs(x-label.x)<=14&&Math.abs(y-label.y)<=12)return i;}for(let i=0;i<p.length;i++){const a=projectTrackPoint(state,i,0),b=projectTrackPoint(state,i,1),d=closest(x,y,a,b).distance;if(d<distance){distance=d;result=i;}}return result;}
function path(c,p,fill,stroke,lw=1,close=true){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(close)c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function line(c,x,y,a,b,col,w=1){path(c,[[x,y],[a,b]],null,col,w,false);}
function ellipse(c,x,y,rx,ry,fill,stroke,w=1,rot=0){c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function round(c,x,y,w,h,r,fill,stroke,lw=1){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function text(c,str,x,y,size=12,col=C.ink,align='left',weight=500){c.font=`${weight} ${size}px "Noto Sans CJK SC","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif`;c.fillStyle=col;c.textAlign=align;c.textBaseline='middle';c.fillText(String(str),x,y);}
function gradient(c,x,y,a,b,stops){const g=c.createLinearGradient(x,y,a,b);for(const[n,color]of stops)g.addColorStop(n,color);return g;}
function bezier(c,p,col,w=1){c.beginPath();c.moveTo(...p[0]);for(let i=1;i<p.length;i+=3)c.bezierCurveTo(...p[i],...p[i+1],...p[i+2]);c.strokeStyle=col;c.lineWidth=w;c.stroke();}
function gull(c,x,y,scale=1){bezier(c,[[x-9*scale,y],[x-5*scale,y-5*scale],[x-2*scale,y-4*scale],[x,y],[x+4*scale,y-6*scale],[x+8*scale,y-5*scale],[x+11*scale,y-2*scale]],'#537b77',1.5*scale);}
function cloud(c,x,y,s=1){ellipse(c,x,y,49*s,8*s,'#f7f0d640');ellipse(c,x-15*s,y-7*s,24*s,13*s,'#f7f0d640');ellipse(c,x+14*s,y-9*s,23*s,16*s,'#f7f0d640');}
function background(c,time){
  c.fillStyle='#e3dbc5';c.fillRect(0,0,1200,800);round(c,16,16,1168,768,22,'#f3e8cb','#c4b99d',1.2);
  c.save();round(c,26,26,1148,748,17);c.clip();c.fillStyle=gradient(c,0,26,0,774,[[0,'#c6dbcd'],[.32,'#93bdba'],[.75,'#76abad'],[1,'#b7ccbd']]);c.fillRect(26,26,1148,748);
  path(c,[[20,170],[105,147],[169,153],[212,127],[293,150],[359,177],[20,204]],'#7daba26e');path(c,[[876,137],[938,115],[988,125],[1033,103],[1094,132],[1184,114],[1184,187],[876,177]],'#7fa9a06b');
  for(let i=0;i<63;i++){const y=176+i*10,x=34+noise(i+80)*50,w=1010+noise(i+1)*60;bezier(c,[[x,y],[x+w*.34,y-4],[x+w*.64,y+5],[x+w,y-1]],i%4?'#e8edcf24':'#e8edcf55',i%4?1:1.6);}
  for(let i=0;i<55;i++){let x=46+noise(i+40)*1110,y=190+noise(i+20)*548;if(x>100&&x<1100&&y>220&&y<655)continue;bezier(c,[[x-13,y],[x-4,y-2],[x+4,y+Math.sin(time*.0005+i)],[x+15,y-1]],'#edf0d58a',1.3);}
  cloud(c,396+Math.sin(time*.00008)*8,148,1.3);cloud(c,1060,187,1.4);cloud(c,129,669,1.2);for(let i=0;i<5;i++)gull(c,896+i*22,148+Math.sin(i)*8,.7+noise(i)*.3);
  // A small distant sail boat, hand-painted rather than an external asset.
  path(c,[[1085,542],[1115,540],[1107,549],[1093,549]],'#597f76');line(c,1100,540,1100,512,'#7b8d77',1);path(c,[[1098,515],[1085,537],[1098,536]],'#f7edcc');path(c,[[1102,520],[1112,535],[1102,535]],'#d6ae71');line(c,1084,554,1116,554,'#e4e9c98a',1.5);
  c.restore();
  text(c,'云 岬 游 乐 园',58,68,28,'#28574e','left',800);text(c,'CLOUD CAPE  /  COASTER WORKSHOP',61,99,10,'#567d6c','left',700);line(c,61,116,262,116,'#6e93806b',1);ellipse(c,267,116,2,2,'#6e9380');
  text(c,'把速度，交给一条好轨道。',1139,68,15,'#426d60','right',500);text(c,'轨道工程 · 安全试车 · 海风里的快乐',1139,96,10,'#648876','right',500);
}
const ISLAND=[[95,391],[139,307],[270,246],[453,212],[654,213],[835,250],[1003,317],[1098,403],[1080,504],[974,592],[802,658],[586,689],[366,648],[202,570],[113,476]];
function island(c){
  const lower=ISLAND.map(([x,y])=>[x,y+25]);path(c,lower,'#5f8980','#608b82',2);
  for(let k=0;k<4;k++){const offset=7+k*5;path(c,ISLAND.map(([x,y])=>[600+(x-600)*(1+.012*k),440+(y-440)*(1+.012*k)+offset]),null,k%2?'#e3e5bf66':'#8cb3a473',2);}
  path(c,ISLAND,'#c4ba8f','#e7d8ab',4);
  const inset=ISLAND.map(([x,y])=>[600+(x-600)*.977,440+(y-440)*.962]);path(c,inset,gradient(c,350,250,700,660,[[0,'#a9bb88'],[.5,'#b1c08e'],[1,'#91ad7a']]),'#8da577',1.4);
  c.save();path(c,inset);c.clip();for(let i=0;i<420;i++){const x=94+noise(i+500)*1000,y=211+noise(i+800)*478;ellipse(c,x,y,2+noise(i)*5,.6+noise(i+2)*1.2,i%3?'#5b825b0f':'#f5e4a722');}
  path(c,[[105,463],[232,503],[303,551],[426,580],[570,590],[708,568],[828,517],[965,500],[1097,465]],null,'#998e6880',31,false);path(c,[[105,461],[232,501],[303,549],[426,578],[570,588],[708,566],[828,515],[965,498],[1097,463]],null,'#ead7a7',25,false);path(c,[[105,461],[232,501],[303,549],[426,578],[570,588],[708,566],[828,515],[965,498],[1097,463]],null,'#faf0cf55',2,false);
  path(c,[[303,549],[322,483],[337,414],[381,356],[468,312],[583,289],[702,306],[789,355],[836,421],[828,515]],null,'#a4946e77',20,false);path(c,[[303,549],[322,483],[337,414],[381,356],[468,312],[583,289],[702,306],[789,355],[836,421],[828,515]],null,'#decb9a',15,false);
  // Low garden beds make the center a designed park, not an empty field.
  ellipse(c,571,455,116,44,'#7f9e70','#d7c89a',5);ellipse(c,571,454,102,35,'#a4b882','#557c5a44',1);for(let i=0;i<38;i++){const a=i/38*TAU;ellipse(c,571+Math.cos(a)*105,454+Math.sin(a)*37,3,2,['#e8c887','#dc9978','#f1deb2'][i%3]);}
  c.restore();
  for(let i=8;i<ISLAND.length-1;i++){const a=ISLAND[i],b=ISLAND[i+1];for(let j=0;j<5;j++){const t=j/5,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;line(c,x,y+4,x+3,y+19,'#6f8f7970',1.4);line(c,x,y+14,x+12,y+16,'#cad1a775',1);}}
}
function tree(c,x,y,s=1,seed=0){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,5,4,22,7,'#2e5f4d25');line(c,0,0,0,-40,'#7f7750',5);line(c,1,-2,1,-36,'#c7ac73',1.5);line(c,0,-22,-12,-40,'#82774e',2);line(c,1,-28,12,-47,'#82774e',2);
  for(let j=0;j<6;j++){const a=j/6*TAU,x=Math.cos(a)*13,y=-43+Math.sin(a)*13;ellipse(c,x,y,17,18,j%2?'#739d6b':'#5c8b65','#487957',.6);}ellipse(c,-4,-47,18,17,'#86a872');ellipse(c,-10,-54,9,7,'#a4b97b88');for(let i=0;i<10;i++)ellipse(c,-20+noise(seed+i)*40,-65+noise(seed+40+i)*40,2,1,'#bec68c55');c.restore();}
function pine(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,4,2,15,5,'#2f5e4528');line(c,0,0,0,-42,'#7f7452',4);for(let i=0;i<3;i++){const w=20-i*4,y=-10-i*14;path(c,[[-w,y],[0,y-31],[w,y],[5,y-2]],i%2?'#527f62':'#68936b','#49785e',.7);path(c,[[0,y-30],[w,y],[4,y-6]],'#345f4d30');}c.restore();}
function hedge(c,x,y,w){ellipse(c,x,y+3,w*.55,7,'#4b754d25');round(c,x-w/2,y-10,w,15,7,'#6f9864','#547c55');for(let i=0;i<w/7;i++)ellipse(c,x-w/2+i*7+4,y-8,4,4,'#8cad74');}
function lamp(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,1,2,7,3,'#446d4b2b');line(c,0,0,0,-42,'#5d7567',3);path(c,[[-5,-42],[-6,-54],[6,-54],[5,-42]],'#f3dfaa','#526e60',1.5);path(c,[[-8,-54],[0,-60],[8,-54]],'#718c71','#526e60');line(c,-4,-42,4,-42,'#526e60',2);c.restore();}
function person(c,x,y,color,phase=0,s=.9){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,1,1,5,2.5,'#3157472b');line(c,-1,-4,-2+Math.sin(phase),1,'#496359',2);line(c,2,-4,3-Math.sin(phase),1,'#496359',2);round(c,-4,-13,8,10,3,color,'#3e67593b',.5);line(c,-4,-10,-6,-5,'#d3ad82',1.8);line(c,4,-10,6,-7,'#d3ad82',1.8);ellipse(c,0,-17,4,4.5,'#d9b18b','#956e53',.5);path(c,[[-4,-18],[-3,-22],[1,-23],[4,-20],[4,-18]],'#695b48');c.restore();}
function bench(c,x,y,flip=1){c.save();c.translate(x,y);c.scale(flip,1);path(c,[[-19,-9],[8,-2],[21,-7],[-6,-14]],'#b28b59','#6e7756',1);for(let i=0;i<3;i++)line(c,-17+i*4,-9-i*1.4,9+i*4,-2-i*1.4,'#dcc090',1);line(c,-14,-9,-14,3,'#65775c',2);line(c,13,-5,13,7,'#65775c',2);path(c,[[-19,-13],[8,-6],[8,-16],[-19,-23]],'#ba9863','#718063');line(c,-19,-18,8,-11,'#dec395',1);c.restore();}
function umbrella(c,x,y,s=1,color=C.coral){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,0,0,24,8,'#476d4620');line(c,0,0,0,-35,'#8f8563',2);ellipse(c,0,-4,15,5,'#f3dfaa','#9e956f');path(c,[[-29,-36],[-21,-48],[0,-59],[23,-46],[29,-36],[18,-32],[7,-35],[-4,-31],[-16,-35]],color,'#855d4f',1);path(c,[[0,-59],[7,-35],[18,-32],[11,-45]],'#f2dbaa');path(c,[[0,-59],[-16,-35],[-29,-36],[-13,-47]],'#f5dfb6');line(c,0,-59,0,-63,'#7d7858',2);c.restore();}
function booth(c,x,y,s=1,label='海风票亭'){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,6,8,63,17,'#3d665029');path(c,[[-48,-8],[5,9],[47,-12],[-6,-29]],'#7c8c6c','#66785e',1);path(c,[[-43,-10],[5,5],[5,-48],[-43,-62]],'#edc780','#967a50');path(c,[[5,5],[42,-14],[42,-65],[5,-48]],'#cea36b','#967a50');
  path(c,[[-47,-61],[4,-44],[49,-67],[-4,-84]],'#f2dab0','#7a7157',1.4);path(c,[[-47,-61],[-3,-88],[50,-68],[4,-44]],'#be674d','#815d47',1.2);for(let i=0;i<5;i++)path(c,[[-40+i*9,-63+i*3],[-3+i*8,-86+i*3],[4+i*9,-82+i*3],[-33+i*9,-60+i*3]],i%2?'#cc8057':'#dc9d69');line(c,-3,-88,50,-68,'#f4d4a2',2);
  path(c,[[-33,-46],[-5,-37],[-5,-18],[-33,-27]],'#4c7268','#b5945e',2);path(c,[[14,-37],[31,-45],[31,-24],[14,-16]],'#5c8070','#ae8d59',2);line(c,-19,-42,-19,-22,'#e6ce9a',2);line(c,-34,-25,-5,-16,'#f2d69d',4);path(c,[[-33,-22],[-6,-14],[-6,-10],[-33,-17]],'#c68551');
  round(c,-34,-75,68,18,3,'#f7e2ae','#8a7751');text(c,label,0,-66,10,'#735f42','center',700);ellipse(c,-18,-34,4,4,'#d1aa7d');round(c,-23,-30,10,8,3,'#9e6c59');
  line(c,37,-82,37,-112,'#7d795c',2);path(c,[[38,-111],[64,-104],[38,-99]],'#c65f48','#b05c44',.7);c.restore();}
function lighthouse(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,5,4,34,10,'#4e775e25');path(c,[[-17,0],[16,2],[12,-70],[-11,-72]],'#f0dfb1','#778b70',1);path(c,[[2,1],[16,2],[12,-70],[3,-71]],'#d5c298');path(c,[[-14,-21],[14,-20],[13,-34],[-13,-36]],'#c87958');path(c,[[-12,-52],[12,-51],[12,-62],[-12,-64]],'#c87958');round(c,-5,-15,9,17,4,'#6e8572');path(c,[[-17,-71],[17,-69],[17,-86],[-17,-88]],'#70968b','#59776b');line(c,-6,-87,-6,-71,'#e8d7a5',2);line(c,6,-86,6,-70,'#e8d7a5',2);path(c,[[-23,-89],[0,-103],[23,-86]],'#a95947','#7c6750');ellipse(c,0,-103,2.5,3,'#dec58d');line(c,-20,-69,21,-67,'#667c69',3);c.restore();}
function pavilion(c,x,y){
  ellipse(c,x+6,y+5,67,19,'#416d4e25');ellipse(c,x,y,65,22,'#c9c39a','#93a37a',2);ellipse(c,x,y-4,56,18,'#e3d5a7','#f1e0b7',2);
  for(const [dx,dy]of[[-39,-6],[0,9],[39,-6],[-26,-16],[26,-16]]){line(c,x+dx,y+dy,x+dx,y+dy-46,'#75937b',4);line(c,x+dx-1,y+dy,x+dx-1,y+dy-46,'#d1d6aa',1.4);}
  path(c,[[x-54,y-49],[x-35,y-68],[x,y-86],[x+35,y-68],[x+54,y-49],[x+34,y-43],[x,y-37],[x-34,y-43]],'#c18b54','#7b7e59',1.1);
  path(c,[[x,y-86],[x-54,y-49],[x-34,y-43]],'#edd19a');path(c,[[x,y-86],[x-34,y-43],[x,y-37]],'#d6a967');path(c,[[x,y-86],[x,y-37],[x+34,y-43]],'#edd2a0');path(c,[[x,y-86],[x+34,y-43],[x+54,y-49]],'#b68152');
  path(c,[[x-54,y-49],[x-34,y-43],[x,y-37],[x+34,y-43],[x+54,y-49]],null,'#f3dfb1',3,false);ellipse(c,x,y-87,4,4,'#dcba78','#7b7e59');line(c,x,y-89,x,y-110,'#718570',1.5);path(c,[[x+1,y-110],[x+22,y-104],[x+1,y-98]],'#c36e50');
  path(c,[[x-35,y-6],[x-11,y+2],[x-11,y-3],[x-35,y-11]],'#a89566','#77866a');path(c,[[x+13,y+2],[x+34,y-6],[x+34,y-11],[x+13,y-3]],'#a89566','#77866a');
  for(let i=0;i<7;i++){const a=i/7*Math.PI;ellipse(c,x+Math.cos(a)*44,y-44+Math.sin(a)*9,4,3,i%2?'#9bb579':'#6e996a');}text(c,'海风凉亭',x,y+30,10,'#688265','center',600);
}
function fountain(c,x,y,time){ellipse(c,x+4,y+4,43,17,'#385d452a');ellipse(c,x,y,43,17,'#d4c79c','#8d9e78',2);ellipse(c,x,y-3,35,12,'#78b1ac','#e3d6b0',3);ellipse(c,x,y-5,23,7,'#a4d0ba');path(c,[[x-8,y-4],[x+9,y-4],[x+5,y-22],[x-4,y-22]],'#b0b892','#8e9e7e');ellipse(c,x,y-23,20,6,'#e3d7ac','#96a68a');ellipse(c,x,y-25,16,4,'#93c5b6');for(let i=0;i<5;i++){const a=i/5*TAU;bezier(c,[[x,y-26],[x+Math.cos(a)*13,y-55],[x+Math.cos(a)*26,y-36],[x+Math.cos(a)*28,y-8]],'#dceacdab',1.7);ellipse(c,x+Math.cos(a)*24,y-13-Math.sin(time*.002+i)*3,1.2,2,'#ebeed5');}text(c,'海风花园',x,y+28,10,'#557557','center',600);}
function scenery(c,time){
  // These strolling figures belong to the illustrated grounds. Operational
  // passenger counts and train occupants are rendered separately from state.
  lighthouse(c,994,317,.8);pine(c,962,330,.7);pine(c,1030,356,.75);
  [[186,346,.9],[219,313,.8],[298,273,.65],[408,251,.7],[690,248,.6],[819,286,.6],[980,400,.75]].forEach(([x,y,s],i)=>tree(c,x,y,s,i*11));
  [[145,427,.7],[174,462,.65],[1007,454,.7],[1035,480,.9],[919,576,.7],[799,624,.75],[427,629,.75],[262,570,.8]].forEach(([x,y,s])=>pine(c,x,y,s));
  hedge(c,456,545,64);hedge(c,706,532,64);hedge(c,938,465,42);bench(c,453,562);bench(c,722,543,-1);bench(c,946,518);lamp(c,346,562);lamp(c,759,547,.9);lamp(c,974,485,.9);lamp(c,247,484,.8);
  pavilion(c,605,371);fountain(c,574,451,time);umbrella(c,871,448,.8,'#688d8d');umbrella(c,905,469,.65,'#c87857');
  booth(c,223,497,.85);text(c,'云岬 · 入口',200,540,11,'#5e765a','center',600);
  for(const [x,y,col,phase]of[[353,565,'#b96852',0],[362,569,'#e6c17d',2],[417,580,'#578e92',3],[682,570,'#c17759',4],[694,565,'#e2be79',5],[815,525,'#7288a3',1],[954,493,'#b97463',4]])person(c,x+Math.sin(time*.0004+phase)*1.5,y,col,time*.003+phase,.86);
  // A little striped ice-cream cart and two empty garden tables.
  path(c,[[816,481],[845,489],[857,483],[829,475]],'#f1d9a3','#927d55');path(c,[[816,481],[845,489],[845,472],[816,464]],'#c77354','#927d55');path(c,[[845,489],[857,483],[857,468],[845,472]],'#ba8d61','#927d55');ellipse(c,822,485,4,5,'#61775d','#dfc795',1.2);ellipse(c,849,489,4,5,'#61775d','#dfc795',1.2);line(c,819,465,819,448,'#8e805b',2);line(c,851,472,851,454,'#8e805b',2);path(c,[[812,448],[841,457],[860,451],[830,442]],'#f1dbac','#a68860');for(let i=0;i<4;i++)path(c,[[814+i*7,448+i*2],[819+i*7,449+i*2],[836+i*7,443+i*2],[831+i*7,442+i*2]],'#bf6b4f');
}
function support(c,state,i,t){const pp=points(state),a=pp[i],b=pp[(i+1)%pp.length],x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t,p=projectPoint(x,y,z),g=projectPoint(x,y,0);if(z<1)return;const w=8;
  ellipse(c,g.x+3,g.y+3,14,4,'#466f5720');path(c,[[g.x-w-4,g.y],[g.x-w+3,g.y+3],[g.x-w+8,g.y],[g.x-w+1,g.y-3]],'#b8b596','#80947a');path(c,[[g.x+w-4,g.y+1],[g.x+w+3,g.y+4],[g.x+w+8,g.y+1],[g.x+w+1,g.y-2]],'#b8b596','#80947a');
  line(c,g.x-w,g.y,p.x-w,p.y+5,'#5d7c70',4);line(c,g.x+w,g.y+2,p.x+w,p.y+7,'#51776b',4);line(c,g.x-w-1,g.y-1,p.x-w-1,p.y+5,'#b0bea0',1);line(c,g.x+w-1,g.y,p.x+w-1,p.y+5,'#9eb497',1);
  if(g.y-p.y>30){line(c,g.x-w,g.y-4,p.x+w,p.y+10,'#759185',2);line(c,g.x+w,g.y-4,p.x-w,p.y+10,'#759185',2);}
  line(c,p.x-14,p.y+6,p.x+14,p.y+8,'#3c6961',4);line(c,p.x-14,p.y+4,p.x+14,p.y+6,'#a5b595',1.5);
}
function track(c,s,selected,time){const p=points(s);if(p.length<2)return;const q=p.map(v=>projectPoint(v.x,v.y,v.z));c.lineJoin='round';c.lineCap='round';
  // Steel supports have real ground endpoints and terminate at the current rail.
  const supports=[];for(let i=0;i<p.length;i++){const a=q[i],b=q[(i+1)%p.length],count=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/55));for(let j=0;j<count;j++)supports.push({i,t:j/count,depth:projectTrackPoint(s,i,j/count).y});}supports.sort((a,b)=>a.depth-b.depth).forEach(v=>support(c,s,v.i,v.t));
  const all=q.map(a=>[a.x,a.y]);path(c,all.map(([x,y])=>[x+2,y+5]),null,'#234f4945',18);path(c,all,null,'#345f59',16);path(c,all,null,'#8aab91',12);
  for(let i=0;i<p.length;i++){const a=q[i],b=q[(i+1)%p.length],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),nx=-dy/l,ny=dx/l,m=MODULES[s.modules?.[i]]||MODULES.rail,count=Math.ceil(l/9),isSelected=i===selected;
    if(isSelected){line(c,a.x,a.y,b.x,b.y,'#fff2b8cc',28);line(c,a.x,a.y,b.x,b.y,m.color,16);}
    else line(c,a.x,a.y,b.x,b.y,m.color,11);
    for(let j=0;j<count;j++){const t=(j+.4)/count,x=a.x+dx*t,y=a.y+dy*t;line(c,x-nx*8,y-ny*8,x+nx*8,y+ny*8,'#315b54',2.4);line(c,x-nx*7,y-ny*7-1,x+nx*7,y+ny*7-1,'#c7cfab',1.1);}
    line(c,a.x+nx*5,a.y+ny*5,b.x+nx*5,b.y+ny*5,'#e2e4bb',2.5);line(c,a.x-nx*5,a.y-ny*5,b.x-nx*5,b.y-ny*5,'#eff0ce',2.5);line(c,a.x+nx*6,a.y+ny*6+1,b.x+nx*6,b.y+ny*6+1,'#406c61',.8);
    const module=s.modules?.[i]||'rail';if(module==='lift'||module==='drive'){
      line(c,a.x,a.y,b.x,b.y,'#675f3f',2.5);for(let j=1;j<Math.floor(l/15);j++){const t=j/Math.floor(l/15),x=a.x+dx*t,y=a.y+dy*t;path(c,[[x-dx/l*3+nx*2.6,y-dy/l*3+ny*2.6],[x+dx/l*2,y+dy/l*2],[x-dx/l*3-nx*2.6,y-dy/l*3-ny*2.6]],null,module==='lift'?'#f5d583':'#c0e2df',1.6,false);}
    }else if(module==='brake'||module==='trim'){
      for(const t of[.33,.49,.65]){const x=a.x+dx*t,y=a.y+dy*t;line(c,x-nx*3-dx/l*3,y-ny*3-dy/l*3,x-nx*3+dx/l*3,y-ny*3+dy/l*3,'#aa4e3d',3.5);line(c,x+nx*3-dx/l*3,y+ny*3-dy/l*3,x+nx*3+dx/l*3,y+ny*3+dy/l*3,'#f3c58e',3.5);}
    }else if(module==='bank'){
      line(c,a.x+nx*10,a.y+ny*10-4,b.x+nx*10,b.y+ny*10-4,'#927e9b',2);for(const t of[.2,.4,.6,.8]){const x=a.x+dx*t,y=a.y+dy*t;line(c,x+nx*7,y+ny*7,x+nx*10,y+ny*10-4,'#b8b4c0',1.8);}
    }
    const d=s.report?.diagnosis?.find(v=>v.segment===i&&(v.severity==='danger'||v.severity==='warning'));if(d){const x=a.x+dx*.65,y=a.y+dy*.65;ellipse(c,x,y,12,12,null,d.severity==='danger'?'#c55a47':'#d3a04c',2);}
  }
}
function trackLabels(c,s,selected){const p=points(s),q=p.map(v=>projectPoint(v.x,v.y,v.z));
  // Segment plaques are physical track signs and share the exact hit geometry.
  for(let i=0;i<p.length;i++){const a=q[i],b=q[(i+1)%p.length],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),nx=-dy/l,ny=dx/l,label=projectSegmentLabel(s,i),x=label.x,y=label.y,sel=i===selected,m=MODULES[s.modules?.[i]]||MODULES.rail;line(c,x,y,(a.x+b.x)/2,(a.y+b.y)/2,'#597b6677',1);round(c,x-13,y-11,26,22,7,sel?C.coral:'#f4e7c6',sel?'#fff1c5':'#81967a',sel?2:1);text(c,String(i+1).padStart(2,'0'),x,y,11,sel?'#fff5d9':m.color,'center',800);}
}
function station(c,s){const pp=points(s);if(!pp.length)return;const start=projectPoint(pp[0].x,pp[0].y,pp[0].z);const x=start.x-26,y=start.y+17;c.save();c.translate(x,y);ellipse(c,6,15,58,13,'#426d4d28');path(c,[[-51,-4],[27,18],[48,5],[-30,-17]],'#d5ba85','#8e8c65');for(let i=0;i<9;i++)line(c,-44+i*9,-3+i*2.5,-23+i*9,-14+i*2.5,'#f0d7a0',1);for(const [a,b]of[[-42,-9],[25,9],[-24,-20],[43,-2]]){line(c,a,b,a,b-36,'#9e9a6f',3);line(c,a-1,b,a-1,b-36,'#d1c699',1);}path(c,[[-53,-46],[21,-25],[55,-42],[-20,-63]],'#c87551','#8f7250',1.2);path(c,[[-53,-46],[21,-25],[21,-19],[-53,-40]],'#f2ddac','#9f8156');path(c,[[21,-25],[55,-42],[55,-36],[21,-19]],'#b35e45');for(let i=0;i<6;i++)path(c,[[-48+i*12,-45+i*3.4],[-20+i*12,-61+i*3.4],[-14+i*12,-59+i*3.4],[-42+i*12,-43+i*3.4]],i%2?'#f0d59c':'#df9970');round(c,-43,-54,66,15,3,'#f5e2b1','#8b7b54');text(c,'云岬站 · 起点',-10,-46,9,'#795d42','center',700);c.restore();}
function behind(s,segment,t,distance){const p=points(s);let i=segment,u=t,d=distance;for(let k=0;k<p.length+1;k++){const a=p[i],b=p[(i+1)%p.length],l=Math.hypot(b.x-a.x,b.y-a.y,(b.z-a.z)*2),available=u*l;if(d<=available)return{segment:i,t:u-d/l};d-=available;i=(i-1+p.length)%p.length;u=1;}return{segment:i,t:0};}
function trainCar(c,x,y,angle,index,occupants){c.save();c.translate(x,y);c.rotate(angle);ellipse(c,1,6,16,5,'#1e484635');
  // Axles and four wheels sit below a clearly separated passenger carriage.
  for(const u of[-9,9]){ellipse(c,u,6,3,4,'#35514d','#d3c59b',1);ellipse(c,u,-5,3,3,'#35514d','#d3c59b',1);}round(c,-15,-10,30,18,5,index===0?'#a9503f':'#b96549','#6c4b3d',1.2);round(c,-13,-11,26,13,4,index===0?'#e9bd70':'#e3bb7a','#f6dba0',1);round(c,-9,-8,18,9,3,'#466e65','#916f4e',.8);
  for(const u of[-8,0,8]){line(c,u,-8,u,0,'#c4915c',1);for(const v of[-8,-2]){if(occupants>0){ellipse(c,u,v-2,2.8,2.8,'#d1a27c','#785e46',.4);ellipse(c,u-1,v-3,2.2,1.6,'#635447');line(c,u-2.5,v+1,u+2.5,v+1,'#ead59b',1);occupants--;}}}
  path(c,[[-15,1],[15,1],[13,9],[-12,9]],index===0?'#cb7651':'#c87e54','#744e3e',.8);line(c,-11,3,11,3,'#f4cd88',1.3);ellipse(c,index===0?12:-10,4,2,2,'#f5db9d');if(index===0)path(c,[[15,-7],[20,-4],[20,3],[15,6]],'#e8b464','#92593d',1);c.restore();}
function train(c,s){const p=points(s),t=s.train;if(!p.length||!t||!Number.isInteger(t.segment)||t.segment<0||t.segment>=p.length)return;const cars=[];let riders=Math.max(0,finite(t.passengers,finite(s.aboard,finite(s.passengersOnboard,finite(s.onboard,0)))));for(let i=0;i<3;i++){const pos=behind(s,t.segment,Math.max(0,Math.min(1,finite(t.t))),i*34),a=projectTrackPoint(s,pos.segment,pos.t),b=projectTrackPoint(s,pos.segment,Math.min(1,pos.t+.01)),prev=projectTrackPoint(s,pos.segment,Math.max(0,pos.t-.01));cars.push({x:a.x,y:a.y-4,angle:Math.atan2(b.y-prev.y,b.x-prev.x),index:i,occupants:Math.min(6,riders)});riders=Math.max(0,riders-6);}
  for(let i=cars.length-1;i>0;i--)line(c,cars[i].x,cars[i].y,cars[i-1].x,cars[i-1].y,'#546c5e',3);cars.sort((a,b)=>a.y-b.y).forEach(car=>trainCar(c,car.x,car.y,car.angle,car.index,car.occupants));
  const lead=projectTrackPoint(s,t.segment,t.t),isTest=s.state==='testing'||s.priorState==='testing';if(s.state==='testing'||s.state==='operating'||s.state==='paused'){round(c,lead.x-34,lead.y-52,68,21,7,'#f6e8c5ee','#79927a');text(c,isTest?'空车试跑':s.state==='paused'?'暂停中':`${finite(s.aboard)} 人乘坐`,lead.x,lead.y-41,9,C.ink,'center',700);line(c,lead.x,lead.y-31,lead.x,lead.y-18,'#6f8a6e',1);}
}
function panels(c,s,selected){const level=s.level||{},report=s.report,module=MODULES[s.modules?.[selected]]||MODULES.rail,seg=level.segments?.[selected],p=points(s),a=p[selected],b=p[(selected+1)%p.length];
  round(c,50,134,220,56,12,'#f6eacde8','#d2c89e',1);text(c,`${String(finite(s.levelIndex)+1).padStart(2,'0')}  ${level.name||level.title||'海湾试车场'}`,65,154,13,C.ink,'left',700);text(c,STATUS[s.state]||'工程设计',65,175,10,'#6a8067');ellipse(c,247,155,5,5,s.state==='won'?'#4d9274':s.state==='lost'?'#c66549':'#d3aa61');
  const testing=s.state==='testing'||(s.state==='paused'&&s.priorState==='testing'),title=testing?'空车测量中 · 逐段试跑':report?(report.safe?'试跑完成 · 安全达标':'试跑报告 · 需要调整'):'先设计，再试跑';round(c,894,135,256,59,12,'#f5e8cbe8','#d2c89e');text(c,title,911,154,13,report&&!report.safe?C.coral:C.ink,'left',700);text(c,testing?`第 ${finite(s.train?.segment)+1} / ${p.length} 段 · 完成试跑后查看验收结果`:report?`刺激 ${Math.round(finite(report.thrill))}  ·  舒适 ${Math.round(finite(report.comfort))}  ·  峰值 ${finite(report.maxSpeed).toFixed(1)} m/s`:'点击轨段，选择适合它的模块',911,177,10,'#70836c');
  // Bottom legend intentionally stays outside track geometry and park paths.
  round(c,49,701,1102,64,12,'#f7edcfe8','#c4c399',1);text(c,'轨道图例',68,719,10,'#688065','left',700);let x=138;for(const [key,v]of Object.entries(MODULES)){line(c,x,719,x+18,719,v.color,5);text(c,v.name,x+25,719,10,'#58725f');x+=key==='rail'?90:114;}
  text(c,'轨段编号可点选 · 轨道高度与列车位置来自当前工程',68,746,10,'#65806d');const speed=finite(s.train?.speed).toFixed(1);text(c,`列车 ${speed} m/s  ·  第 ${finite(s.train?.lap)+1} 圈`,1128,746,11,'#3f6958','right',700);
  if(a&&b){const y=626,x=64;round(c,x,y,332,61,11,'#f6e8cfe9','#c9b88f');round(c,x+10,y+10,38,38,9,module.color);text(c,String(selected+1).padStart(2,'0'),x+29,y+29,17,'#fff2ce','center',800);text(c,`${seg?.name||'选中轨段'} · ${module.name}`,x+61,y+20,13,C.ink,'left',700);text(c,`高度 ${a.z} → ${b.z} m${seg?.length?`   ·   长 ${Math.round(seg.length)} m`:''}`,x+61,y+43,10,'#73816a');}
  const issue=report?.diagnosis?.find(v=>v.segment===selected);if(issue){const msg=String(issue.message||'请查看轨段试跑数据');round(c,691,636,448,43,10,'#f4e6cce8','#c9b88f');ellipse(c,709,657,4,4,issue.severity==='danger'?C.coral:C.gold);text(c,msg.length>35?msg.slice(0,34)+'…':msg,722,657,11,'#735e47','left',600);}
}
export function render(ctx,state,{width=VIEW.width,height=VIEW.height,time=0,reducedMotion=false,selectedSegment=state?.selected??0}={}){
  const c=ctx;if(!c||!state)return;const t=reducedMotion?0:finite(time);const selected=Number.isInteger(selectedSegment)?selectedSegment:0;
  c.save();c.setTransform(width/VIEW.width,0,0,height/VIEW.height,0,0);c.clearRect(0,0,VIEW.width,VIEW.height);c.lineJoin='round';c.lineCap='round';background(c,t);island(c);scenery(c,t);track(c,state,selected,t);station(c,state);train(c,state);trackLabels(c,state,selected);panels(c,state,selected);c.restore();
}
