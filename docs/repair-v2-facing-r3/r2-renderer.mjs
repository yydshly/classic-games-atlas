/** 雨街修理所 · v2 hybrid illustrated workshop + locally rendered 3D robot sprites. Logical stage: 1200 × 800. */
const W=1200,H=800,TAU=Math.PI*2;
const SLOT_DATA=[['A',340,190],['B',565,190],['C',790,190],['D',340,510],['E',565,510],['F',790,510]];
const art = new Map();
/** Optional async art. No engine state or browser globals are required to render. */
export async function preloadArt(loader) {
 const load = loader || (url => new Promise((resolve,reject) => { const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=url; }));
 const keys=[...['courier','gardener','lantern','musician'].flatMap(type=>[0,1,2,3].map(frame=>`robot-${type}-${frame}`)),...[0,1,2].flatMap(type=>[0,1,2,3,4,5].map(frame=>`tech-${type}-${frame}`))];
 try { const image=await load(new URL('./assets/workshop-actors.png?v=20261018-r2',import.meta.url).href);keys.forEach((key,i)=>art.set(key,{image,x:i%6*256,y:Math.floor(i/6)*320}));return true; } catch { return false; }
}
const COLORS={ink:'#293f43',cream:'#f4e9cc',brass:'#ddb966',mint:'#8ab7a5',teal:'#3c7979',rust:'#bb6b4f'};
const stationNames={diagnosis:'诊断台',mechanical:'机械台',electrical:'电路台',reception:'接待处',payment:'交付柜台'};
const accents={diagnosis:'#57e3da',mechanical:'#ffc56b',electrical:'#aa9bff',reception:'#e8b568',payment:'#8dc8a1'};
export function project(x,y,z=0){return{x:100+Number(x||0),y:146+.86*Number(y||0)-Number(z||0)};}
export function unproject(px,py){return{x:Number(px)-100,y:(Number(py)-146)/.86};}
export function hitSlot(px,py){for(const[id,x,y]of SLOT_DATA){const p=project(x,y);if(px>=p.x-101&&px<=p.x+101&&py>=p.y-89&&py<=p.y+78)return id;}return null;}
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
function round(c,x,y,w,h,r=5,fill,stroke,lw=1){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function line(c,x1,y1,x2,y2,color,lw=1){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=lw;c.stroke();}
function path(c,pts,fill,stroke,lw=1,close=true){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));if(close)c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function ellipse(c,x,y,rx,ry,fill,stroke,lw=1){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function text(c,str,x,y,size=12,color=COLORS.cream,align='left',weight=600){c.font=`${weight} ${size}px "Noto Sans CJK SC","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(String(str),x,y);}
function gradient(c,x,y,x2,y2,stops){const g=c.createLinearGradient(x,y,x2,y2);for(const[s,color]of stops)g.addColorStop(s,color);return g;}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ellipse(c,x,y,r,r,g);}
function screw(c,x,y,r=2.1){ellipse(c,x,y,r,r,'#e4d2a2','#594f3e',.7);line(c,x-r*.6,y,x+r*.6,y,'#615d4b',.6);}
function wrench(c,x,y,s=1,a=0,color='#a7b4ae'){c.save();c.translate(x,y);c.rotate(a);c.scale(s,s);round(c,-2,-2,4,20,1.5,color,'#33494b',.8);ellipse(c,0,0,5,5,color,'#33494b',1);path(c,[[-3,-5],[-2,0],[2,0],[3,-5]],'#344c4b');ellipse(c,0,15,1,1,'#495f5b');c.restore();}
function gear(c,x,y,r,angle=0,color='#b6b6a1'){c.save();c.translate(x,y);c.rotate(angle);c.beginPath();for(let i=0;i<40;i++){const a=i*TAU/40,rr=(i%4<2?r:r*.78);i?c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):c.moveTo(rr,0);}c.closePath();c.fillStyle=color;c.fill();c.strokeStyle='#33474a';c.lineWidth=1.4;c.stroke();ellipse(c,0,0,r*.37,r*.37,'#354d50','#d6d2b1',1);ellipse(c,0,0,r*.11,r*.11,'#c4b689');c.restore();}
function plant(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,0,4,24,7,'#1b323b32');path(c,[[-16,-11],[16,-11],[12,14],[-12,14]],'#a66b4f','#674e40',1.5);ellipse(c,0,-11,16,5,'#c68a63','#674e40',1);ellipse(c,0,-12,12,3,'#3d5144');for(let i=0;i<8;i++){const a=(i-3.5)*.4,xx=Math.sin(a)*24,yy=-30-Math.cos(a)*20;line(c,0,-13,xx,yy,'#638964',2);c.save();c.translate(xx,yy);c.rotate(a);ellipse(c,0,0,7,17,i%2?'#7d9e69':'#527f66','#426654',.7);line(c,0,-12,0,12,'#b0b77b88',.8);c.restore();}c.restore();}
function rainWindow(c,x,y,w,h,t,night=false){round(c,x-7,y-7,w+14,h+14,3,'#785b46','#3e4a46',3);round(c,x,y,w,h,1,gradient(c,x,y,x,y+h,[[0,night?'#284452':'#426873'],[1,'#93a9a0']]));c.save();c.beginPath();c.rect(x,y,w,h);c.clip();for(let i=0;i<10;i++){const bx=x+i*w/9-8,bh=25+noise(i+12)*45;round(c,bx,y+h-bh,w/8,bh,1,i%2?'#53757a':'#3c626c');for(let j=0;j<3;j++)if(noise(i*6+j)>.25)round(c,bx+6+j*9,y+h-bh+9,4,7,1,'#deb77e80');}path(c,[[x,y+h-17],[x+w,y+h-28],[x+w,y+h],[x,y+h]],'#8baba9');for(let i=0;i<26;i++){const xx=x+noise(i+250)*w,yy=y+(noise(i+390)*h+t*.035)%h;line(c,xx,yy,xx-3,yy+10,'#d2e8db60',.8);}for(let i=0;i<5;i++){let xx=x+w*(i+.7)/6;c.beginPath();c.moveTo(xx,y);c.bezierCurveTo(xx-4,y+h*.25,xx+6,y+h*.65,xx-3,y+h);c.strokeStyle='#dcebe329';c.lineWidth=1;c.stroke();}path(c,[[x+8,y],[x+52,y],[x+105,y+h],[x+70,y+h]],'#d6e4d813');c.restore();line(c,x+w*.5,y,x+w*.5,y+h,'#6c5d49',6);line(c,x,y+h*.58,x+w,y+h*.58,'#6c5d49',5);line(c,x+2,y+2,x+w-2,y+2,'#e2c999',1);round(c,x-11,y+h,w+22,9,2,'#af8b60','#5b5747',1);}
function jar(c,x,y,color='#91ad94',h=18){round(c,x,y,12,h,3,color,'#4b5d51',1);round(c,x-1,y-3,14,4,1,'#b9b491','#66715d',.6);round(c,x+3,y+5,6,7,1,'#e2d6b9');line(c,x+2,y+2,x+2,y+h-3,'#ffffff55');}
function hangingLamp(c,x,y,t,wide=false){line(c,x,y-48,x,y,'#425247',3);ellipse(c,x,y+8,wide?44:29,11,'#203f3d18');glow(c,x,y+38,wide?115:80,'#ffe5a62b');path(c,[[x-8,y-7],[x+8,y-7],[x+(wide?37:24),y+12],[x-(wide?37:24),y+12]],'#486b5f','#2c4d47',2);ellipse(c,x,y+12,wide?37:24,5,'#e6c789','#364e45',1);ellipse(c,x,y+13,wide?27:17,3,'#fff0b5');round(c,x-4,y-13,8,9,2,'#bba270');}
function background(c,time,day){
 c.fillStyle='#233c44';c.fillRect(0,0,W,H);
 round(c,48,18,1104,740,19,'#132e35');
 // Warm plaster and exposed timber make a small, lived-in shop.
 round(c,65,26,1070,177,8,gradient(c,0,28,0,205,[[0,'#817c60'],[.55,'#c4b88b'],[1,'#9c9877']]),'#233f41',3);
 for(let y=40;y<190;y+=24)for(let x=75+(y%48?0:38);x<1120;x+=76){line(c,x,y,x+72,y,'#f0dfb421',1);line(c,x,y-21,x,y,'#4a604a0c',1);}
 rainWindow(c,98,52,240,117,time,day%3===2);
 round(c,375,43,363,47,6,'#254e4f','#d5ba7f',2);text(c,'雨 街 修 理 所',555,62,23,'#f4dcaa','center',700);text(c,'RAIN STREET  •  ROBOT CARE',555,81,8,'#9db7a3','center',600);
 // Peg board, ordered tools and yesterday's pinned notes.
 round(c,392,104,221,83,4,'#937e57','#5c634d',2);for(let x=402;x<607;x+=12)for(let y=114;y<182;y+=12)ellipse(c,x,y,.85,.85,'#5f624c');
 for(let i=0;i<6;i++)wrench(c,410+i*28,130,.9,(i%2?-.12:.13),'#b7c4b5');
 gear(c,586,158,15,.2,'#baaa79');round(c,423,162,106,16,3,'#4c665d','#314e48');for(let i=0;i<6;i++)round(c,429+i*15,157,5,15,1,i%2?'#bb7453':'#dac77d');
 c.save();c.translate(646,119);c.rotate(-.07);round(c,0,0,63,64,1,'#e4d5a9','#a28a60');text(c,'给旧零件',31,18,10,'#5e705d','center');text(c,'新的明天',31,32,10,'#5e705d','center');gear(c,31,50,9,0,'#bb8c54');ellipse(c,31,3,2,2,'#ad6050');c.restore();
 // Wall shelves with drawer labels, coils, tin cans and spare shells.
 round(c,772,47,314,146,5,'#4a5f51','#314c47',3);for(const yy of[84,131,177]){round(c,777,yy,304,8,1,'#a48659','#4e5541',1);line(c,780,yy+1,1078,yy+1,'#d1b27b',1);}
 for(let i=0;i<9;i++){let x=790+i*31;round(c,x,58,24,25,2,['#789389','#ad8c62','#8a9f91'][i%3],'#384f47',1);round(c,x+4,65,16,8,1,'#e3d7b1');line(c,x+9,69,x+15,69,'#8a8769');}
 jar(c,792,106,'#a8b5a0',24);jar(c,809,109,'#d6b875',21);gear(c,854,114,15,.15,'#9da893');gear(c,879,116,11,.5,'#c3a764');round(c,907,104,46,26,4,'#c38c61','#405a51',1.5);round(c,915,110,30,12,3,'#3b5958');ellipse(c,923,116,3,3,'#e2d890');ellipse(c,937,116,3,3,'#e2d890');
 for(let i=0;i<4;i++){c.beginPath();c.arc(986+i*9,116,11,0,TAU);c.strokeStyle=i%2?'#d6b076':'#8ca49b';c.lineWidth=3;c.stroke();}round(c,1040,103,25,28,2,'#98a68e','#41594d');text(c,'油',1052,118,12,'#4b6657','center');
 for(let i=0;i<5;i++){round(c,791+i*44,146,38,29,2,i%2?'#9b8d66':'#7d8b70','#41594c',1);round(c,801+i*44,153,19,7,1,'#d3c69d');line(c,805+i*44,166,815+i*44,166,'#3c5146',2);}
 line(c,76,202,1124,202,'#5d6248',12);line(c,76,199,1124,199,'#be9d68',3);
 // Blue-green ceramic tiles, subtle individual wear, and a thick cutaway plinth.
 path(c,[[65,200],[1135,200],[1135,727],[65,727]],'#365c60','#244b50',3);
 const floor=gradient(c,0,190,0,720,[[0,'#588280'],[.55,'#6e9690'],[1,'#587b76']]);c.fillStyle=floor;c.fillRect(73,204,1054,515);
 for(let row=0;row<13;row++)for(let col=0;col<26;col++){const x=74+col*41,y=205+row*40;if(noise(row*70+col)>.37){c.fillStyle=noise(row*5+col)>.55?'#c5d1ad0c':'#20474b0c';c.fillRect(x+1,y+1,39,38);}line(c,x,y,x+40,y,'#c8d2b62e',1);line(c,x,y,x,y+39,'#244a4b30',1);if(noise(col*89+row)>.94)line(c,x+9,y+8,x+20,y+11,'#cbd8bd30',1);}
 // Copper inlays gently explain the walking corridor without turning it into a UI grid.
 round(c,80,418,1045,60,6,'#426b68aa');line(c,80,421,1125,421,'#e1c58b55',1.5);line(c,80,476,1125,476,'#e1c58b55',1.5);
 for(let x=155;x<1110;x+=38){path(c,[[x,445],[x+5,449],[x,453]],null,'#d9d8a642',1.5,false);}
 for(const x of[440,665,890]){line(c,x-51,387,x-51,419,'#dfc88b35',1);line(c,x+51,387,x+51,419,'#dfc88b35',1);line(c,x-51,478,x-51,505,'#dfc88b35',1);line(c,x+51,478,x+51,505,'#dfc88b35',1);}
 // The wet street is visible at both open ends of the room.
 for(const left of[true,false]){const x=left?68:1081;round(c,x,383,48,117,3,'#2a4a52','#c4a778',2);round(c,x+6,390,35,103,2,'#427079');for(let i=0;i<8;i++){let yy=391+(i*15+time*.035)%98;line(c,x+11+i%3*10,yy,x+8+i%3*10,yy+10,'#b8d8cc55',1);}round(c,x-4,496,56,7,1,'#bfaa7b');line(c,x+6,482,x+39,482,'#cfb780',2);text(c,left?'IN':'OUT',x+24,405,9,'#d8dab6','center');}
 // Low entry bench, hanging coats, boots, umbrella stand and curled workshop cat.
 round(c,105,564,174,19,5,'#b48b5e','#42564c',2);round(c,111,578,10,47,2,'#725e47','#3f5148');round(c,258,578,10,47,2,'#725e47','#3f5148');round(c,109,550,165,16,4,'#cb9b68','#655c45',1.5);for(let i=0;i<6;i++)line(c,116+i*27,553,116+i*27,563,'#8d754e',1);
 round(c,118,519,48,33,5,'#a89972','#5b6851',1);line(c,124,526,158,526,'#dcc996',1);round(c,129,514,23,8,4,null,'#796d4b',3);
 ellipse(c,221,546,24,9,'#bf9d6b','#685f47',1);ellipse(c,239,540,11,10,'#c8aa79','#685f47',1);path(c,[[231,534],[232,526],[239,532],[245,526],[249,536]],'#c8aa79','#685f47',1);line(c,236,540,239,540,'#635f48',1);line(c,243,540,246,540,'#635f48',1);c.beginPath();c.moveTo(203,548);c.bezierCurveTo(184,541,197,531,214,538);c.strokeStyle='#927d57';c.lineWidth=5;c.stroke();
 round(c,102,642,188,47,5,'#426b65','#324f49',2);round(c,108,648,176,34,3,'#8e9974');text(c,'慢慢修，都会好的。',196,665,13,'#eee0b3','center',500);
 plant(c,302,616,.75);round(c,102,506,20,32,4,'#a1835e','#4c5e4e',1);for(let i=0;i<3;i++){line(c,108+i*5,514,105+i*7,476,'#4e685b',2);c.beginPath();c.arc(108+i*7,477,3,Math.PI,TAU);c.strokeStyle='#b79460';c.lineWidth=2;c.stroke();}
 // Lower-right utility cart, coiled hose and a leafy little corner.
 round(c,1010,566,77,58,5,'#6e8a7a','#375951',2);round(c,1004,558,90,12,3,'#b68e5d','#41584a',2);for(let i=0;i<3;i++){round(c,1017,577+i*13,62,10,2,'#8a9c7e','#4a6553');line(c,1040,582+i*13,1054,582+i*13,'#d7c28b',2);}for(const xx of[1017,1080])ellipse(c,xx,630,6,6,'#3b5351','#a8b8a0',1);jar(c,1018,535,'#d4b978',20);round(c,1041,533,35,25,3,'#4a6661','#2d4845',1);wrench(c,1054,525,.7,.4);
 plant(c,1071,668,.86);ellipse(c,1040,696,28,6,'#2a51444d');for(let i=0;i<4;i++){c.beginPath();c.ellipse(1035+i*2,680,20-i*2,12-i*.7,.3,0,TAU);c.strokeStyle=i%2?'#b69768':'#8a8763';c.lineWidth=3;c.stroke();}
 // Front fascia, screws and warm workshop lighting.
 round(c,63,716,1074,24,4,'#6b644a','#27474b',2);round(c,71,718,1058,5,1,'#b49967');for(let i=0;i<15;i++)screw(c,90+i*72,730,2);text(c,'EST. 2086',112,754,10,'#8aaca1');text(c,'REPAIR • REUSE • RETURN',1093,754,9,'#8aaca1','right',500);
 hangingLamp(c,363,205,time);hangingLamp(c,749,204,time,true);hangingLamp(c,1084,204,time);
}
function corners(c,x,y,w,h,color){c.strokeStyle=color;c.lineWidth=2.3;for(const[sx,sy]of[[-1,-1],[1,-1],[-1,1],[1,1]]){const xx=x+sx*w/2,yy=y+sy*h/2;c.beginPath();c.moveTo(xx-sx*15,yy);c.lineTo(xx,yy);c.lineTo(xx,yy-sy*11);c.stroke();}}
function footprint(c,p,selected,accent){ellipse(c,p.x+3,p.y+29,100,38,'#193d3a28');round(c,p.x-96,p.y-61,192,122,12,'#244f4c18');if(selected){round(c,p.x-102,p.y-81,204,153,12,accent+'18',accent,1.4);corners(c,p.x,p.y-4,211,158,accent);} }
function blueprint(c,id,p,selected,time){const accent=selected?'#f5d58c':'#a9c9b2';footprint(c,p,selected,accent);c.save();c.setLineDash([5,5]);round(c,p.x-87,p.y-58,174,112,8,'#527a711c',accent+'77',1);c.setLineDash([]);path(c,[[p.x-57,p.y-25],[p.x+53,p.y-25],[p.x+67,p.y-10],[p.x-43,p.y-10]],'#abcdb01c',accent+'6b',1);line(c,p.x-43,p.y-10,p.x-43,p.y+19,accent+'6b');line(c,p.x+67,p.y-10,p.x+67,p.y+19,accent+'6b');line(c,p.x-57,p.y-25,p.x-57,p.y+9,accent+'6b');line(c,p.x-40,p.y+20,p.x+64,p.y+20,accent+'4a');round(c,p.x-14,p.y-49,28,20,2,null,accent+'70',1);line(c,p.x,p.y-29,p.x,p.y-24,accent+'70');ellipse(c,p.x,p.y+8,15,15,'#335f5355',accent+'aa',1);line(c,p.x-6,p.y+8,p.x+6,p.y+8,accent,2);line(c,p.x,p.y+2,p.x,p.y+14,accent,2);text(c,`工位 ${id}`,p.x,p.y+41,13,accent,'center');text(c,'待建 · 点击规划',p.x,p.y+68,10,selected?'#f5d58c':'#bed2b6','center',500);c.restore();}
function littleMonitor(c,x,y,w=49,h=37,time=0,active=true){round(c,x-2,y-2,w+4,h+4,5,'#3e5652','#263f3e',2);round(c,x,y,w,h,3,gradient(c,0,y,0,y+h,[[0,'#123c40'],[1,'#285a53']]),'#86a797',1);c.save();c.beginPath();c.rect(x+3,y+3,w-6,h-6);c.clip();for(let i=1;i<5;i++)line(c,x+3,y+i*h/5,x+w-3,y+i*h/5,'#7abdb318',.8);c.beginPath();for(let i=0;i<=24;i++){const yy=y+h*.52+(active?Math.sin(i*.45+time*.003)*Math.cos(i*.9)*h*.21:0);i?c.lineTo(x+4+i*(w-8)/24,yy):c.moveTo(x+4,yy);}c.strokeStyle=active?'#a5dfbc':'#659c8e';c.lineWidth=1.4;c.stroke();c.restore();line(c,x+w*.5,y+h+2,x+w*.5,y+h+10,'#3c5550',5);round(c,x+w*.5-13,y+h+8,26,4,1,'#b0ac86','#3d544c');ellipse(c,x+w-5,y+h-5,1.5,1.5,active?'#ffe296':'#718b71');}
function station(c,s,p,selected,time,robotStatus){const type=s.type||'diagnosis',a=accents[type]||accents.diagnosis,ratio=clamp(s.progress/(s.duration||1)),occupied=!!s.robotId,busy=robotStatus==='servicing'||s.status==='working',blocked=robotStatus==='blocked',broken=!!s.broken||s.maintenance>0;
 footprint(c,p,selected,a);const x=p.x,y=p.y;
 // Substantial timber cabinet, metal edging, drawer hardware and visible power cables.
 c.beginPath();c.moveTo(x+62,y+26);c.bezierCurveTo(x+108,y+66,x+83,y+72,x+95,y+82);c.strokeStyle='#32574e';c.lineWidth=3;c.stroke();round(c,x+90,y+78,13,7,2,'#d0b580','#385348',1);
 round(c,x-85,y-4,171,54,5,gradient(c,x,y,x,y+52,[[0,'#9c8056'],[1,'#736b4c']]),'#334f46',2);round(c,x-80,y+1,75,32,3,'#b09566','#6b684c',1);round(c,x+3,y+1,76,32,3,'#9f8961','#64634a',1);for(const xx of[x-43,x+40]){round(c,xx-12,y+10,24,6,2,'#d1bb83','#736d4c');line(c,xx-8,y+12,xx+8,y+12,'#ece0ac',1);}round(c,x-79,y+41,11,18,2,'#53634c');round(c,x+68,y+41,11,18,2,'#53634c');line(c,x-70,y+50,x+68,y+50,'#b8a16d',2);
 path(c,[[x-91,y-20],[x+78,y-20],[x+93,y-4],[x+92,y+5],[x-91,y+5]],'#d3b278','#3e5548',2);path(c,[[x-91,y-20],[x+77,y-20],[x+93,y-4],[x-78,y-4]],'#dabc87','#765e44',1);line(c,x-78,y-2,x+89,y-2,'#efcf98',1);
 round(c,x-76,y-43,150,27,2,'#5e7661','#3a554b',1);for(let i=0;i<12;i++)ellipse(c,x-69+i*12,y-35,1,1,'#b3b899');
 if(type==='diagnosis'){
   round(c,x-63,y-77,52,61,7,'#8aada0','#304d48',2);round(c,x-57,y-70,40,39,4,'#305c58','#c0c9a6',1);c.beginPath();c.arc(x-37,y-51,13,.4,5.3);c.strokeStyle=a;c.lineWidth=1.5;c.stroke();line(c,x-37,y-51,x-29+Math.sin(time*.002)*3,y-60,'#dce9b0',1);ellipse(c,x-37,y-51,3,3,'#e9dc92');round(c,x-56,y-25,36,4,1,'#3e6255');for(let i=0;i<3;i++)ellipse(c,x-52+i*12,y-20,2,2,i===0?'#e7cc79':'#497a68');littleMonitor(c,x+4,y-66,53,34,time,busy);
   // Magnifying arm, hinged lamp and a resting probe.
   line(c,x+66,y-18,x+69,y-70,'#bcc8ad',5);line(c,x+69,y-70,x+45,y-86,'#bcc8ad',5);ellipse(c,x+67,y-68,4,4,'#c6bb85','#436058',1);ellipse(c,x+44,y-84,16,7,'#a5c4b0','#365951',2);ellipse(c,x+44,y-84,11,4,'#caeee1aa');line(c,x-4,y-10,x+19,y-14,'#3e6861',4);line(c,x+19,y-14,x+28,y-13,'#d5d9b4',2);round(c,x-69,y-12,35,7,2,'#e9d9b0','#746d51',1);
 }else if(type==='mechanical'){
   round(c,x-65,y-79,62,62,4,'#6e8872','#304c43',2);for(let i=0;i<6;i++)wrench(c,x-56+i*10,y-63,.58,(i%2?.12:-.1),i%2?'#e3bf7f':'#bfcbaf');round(c,x-60,y-30,52,13,2,'#c39d67','#4b6050',1);gear(c,x+36,y-45,25,time*(busy?.0006:0),'#bea776');gear(c,x+55,y-24,14,-time*(busy?.001:0),'#d8bd7c');round(c,x+20,y-29,30,12,2,'#4c6959','#294a43',1);round(c,x-12,y-16,32,12,2,'#7e9d8a','#334f45',1);round(c,x-9,y-24,26,9,1,'#bbc6a8','#425b4c',1);round(c,x-18,y-20,7,17,1,'#c2a065','#4b5d49');line(c,x-23,y-12,x-7,y-12,'#d5bb7e',2);ellipse(c,x-23,y-12,3,3,'#d8b97b');wrench(c,x+64,y-13,.85,1.2,'#d7c18d');for(let i=0;i<4;i++)screw(c,x-52+i*11,y-11,2);
 }else if(type==='electrical'){
   littleMonitor(c,x-65,y-73,55,42,time,busy);round(c,x+4,y-63,58,43,5,'#b1b093','#3b554a',2);round(c,x+11,y-55,31,20,2,'#314d4c','#d2ceaa',1);text(c,broken?'ERR':'12.8',x+26,y-45,10,broken?'#e8aa80':'#bbddae','center',700);ellipse(c,x+51,y-48,5,5,'#6f8876','#3f554a');line(c,x+51,y-48,x+54,y-51,'#d6cca3',1);for(let i=0;i<3;i++)ellipse(c,x+16+i*14,y-26,2.5,2.5,['#c47b62','#c6b576','#7e9b8a'][i]);round(c,x-18,y-13,47,11,2,'#537f62','#2e5445',1);for(let i=0;i<5;i++){round(c,x-13+i*8,y-11,5,5,1,i%2?'#b2aa76':'#283f3f');line(c,x-12+i*8,y-5,x-12+i*8,y-1,'#c6b574',.8);}line(c,x+45,y-14,x+70,y-8,'#d2c8a5',3);round(c,x+66,y-11,10,9,2,'#826f8d','#40554c');c.beginPath();c.moveTo(x+72,y-7);c.bezierCurveTo(x+100,y+4,x+81,y+32,x+64,y+21);c.strokeStyle='#514b5a';c.lineWidth=2;c.stroke();if(busy){glow(c,x+43,y-14,16,'#dfc7ff40');for(let i=0;i<3;i++)line(c,x+43,y-17,x+45+Math.sin(time*.01+i)*5,y-23-i*2,'#e9d2bd70',1);}
 }
 // Station information lives on the furniture instead of floating over characters.
 const lv=Math.max(1,Number(s.level)||1),labelY=s.slot==='C'?y-120:y+45;round(c,x-72,labelY-11,144,23,4,'#294f4b','#d6bd83',1);text(c,`${s.slot||''}  ${stationNames[type]||'修理台'}`,x-62,labelY,11,'#f1ddae');for(let i=0;i<Math.min(lv,4);i++)ellipse(c,x+41+i*8,labelY,2,2,a);
 if(occupied||broken){const color=broken?'#ed987e':blocked?'#dbc18b':a;round(c,x-66,y+60,132,5,2,'#2b514a');round(c,x-65,y+61,130*(broken?.65:ratio),3,1,color);if(broken){round(c,x-36,y-98,72,19,6,'#67463b','#e5a079',1);text(c,s.maintenance>0?'维护中':'需要检修',x,y-88,10,'#ffe0b2','center');}else{ellipse(c,x+75,y-81,10,10,'#294f4b','#d6c18b',1);c.beginPath();c.arc(x+75,y-81,7,-Math.PI/2,-Math.PI/2+TAU*ratio);c.strokeStyle=a;c.lineWidth=2.5;c.stroke();}}
 if(blocked&&!broken){round(c,x-36,y-98,72,19,6,'#67553d','#d9c18b',1);text(c,'等待技师',x,y-88,10,'#f4e2b3','center');}const q=Array.isArray(s.queue)?s.queue.length:Number(s.queue)||0;if(q){round(c,x+50,y+62,38,18,7,'#2b504a','#b4c4a0',1);text(c,`候 ${q}`,x+69,y+71,10,'#e8dab2','center');}else if(!s.workerId){text(c,'待分配技师',x,y+72,10,'#d9d0a5','center',500);}
}
function reception(c,s,p,pay,time){const x=p.x,y=p.y,accent=pay?'#a8d5a4':'#e8bb75';c.save();if(pay){c.translate(x+34,y);c.scale(.68,.84);c.translate(-x,-y);}ellipse(c,x,y+29,73,28,'#24483b2d');round(c,x-59,y-5,120,56,6,'#4f7864','#284e43',2);for(let i=0;i<7;i++)line(c,x-50+i*16,y+3,x-50+i*16,y+43,'#94aa7b44',1);path(c,[[x-66,y-20],[x+51,y-20],[x+67,y-5],[x-53,y-5]],'#d8b77d','#5d6249',2);round(c,x-66,y-6,133,9,2,'#b18c57','#52604b',1);round(c,x-51,y+9,103,25,3,'#31594b','#c3b67b',1);text(c,pay?'完修交付':'来客接待',x,y+22,13,'#efdaa4','center');
 if(pay){round(c,x-32,y-49,51,29,4,'#89a68b','#355449',2);round(c,x-26,y-44,24,13,2,'#335650','#bdc9a3');text(c,'¥',x-14,y-38,10,'#daebba','center');for(let i=0;i<6;i++)round(c,x+3+i%3*5,y-42+Math.floor(i/3)*7,3,4,1,'#d3d0a4');round(c,x+28,y-30,21,12,2,'#ecd9ad','#967f52',1);text(c,'OK',x+39,y-24,7,'#678366','center');}else{round(c,x-39,y-44,36,28,2,'#e8d8ab','#89764c',1);for(let i=0;i<4;i++)line(c,x-32,y-36+i*5,x-9,y-36+i*5,'#8c9b79',1);round(c,x-30,y-48,19,5,1,'#6d8e75');ellipse(c,x+29,y-19,13,4,'#6a7755');c.beginPath();c.arc(x+29,y-22,10,Math.PI,0);c.fillStyle='#dec382';c.fill();c.strokeStyle='#6e7955';c.lineWidth=1.3;c.stroke();ellipse(c,x+29,y-34,2,2,'#eed494');}
 const q=Array.isArray(s?.queue)?s.queue.length:0;if(q){round(c,x-22,y+55,44,18,7,'#325647','#c3c794',1);text(c,`候 ${q}`,x,y+64,10,'#e8d5a5','center');}if(s?.robotId){const ratio=clamp(s.progress/(s.duration||1));round(c,x-42,y+42,84,4,2,'#284d41');round(c,x-41,y+43,82*ratio,2,1,accent);}c.restore();const lx=pay?x+34:x,ly=pay?y-64:y-93;round(c,lx-44,ly-10,88,20,5,'#31594d','#d8c18b',1);text(c,pay?'交付结账':'雨棚接待',lx,ly,12,'#f0ddae','center');
}
function robot(c,r,time,reduced){if(r.status==='gone')return;if(robotArt(c,r,time,reduced))return;const p=project(r.x,r.y),walk=r.status==='walking'||r.status==='leaving',phase=reduced?0:time*.012+(Number(String(r.id).replace(/\D/g,''))||0),bob=walk?Math.sin(phase*2)*1.6:Math.sin(phase*.19)*.55,type=r.type||'courier',pat=clamp(r.patience/(r.maxPatience||100)),sad=pat<.28||r.status==='blocked',color=({courier:'#dfad60',gardener:'#7da999',lantern:'#c47c65',musician:'#a296bd'})[type]||'#dfad60';
 c.save();c.translate(p.x,p.y);ellipse(c,0,1,22,7,'#183d3b36');c.translate(0,bob);const leg=walk?Math.sin(phase)*4:0;
 // Jointed legs, toe plates, segmented arms and a separate chest give clients real silhouettes.
 for(const side of[-1,1]){line(c,side*9,-13,side*10+leg*side,-3,'#405b55',5);ellipse(c,side*9,-13,4,4,'#96a79a','#3b514b',1);round(c,side*10-7+leg*side,-6,14,7,3,'#536e66','#2c4b47',1);line(c,side*10-5+leg*side,-3,side*10+4+leg*side,-3,'#b9bf9c',1);}
 if(type==='gardener'){round(c,-24,-42,13,25,5,'#6b8e69','#35584c',1.5);for(let i=0;i<3;i++){line(c,-19,-41,-27+i*7,-53-i*2,'#6d9068',2);ellipse(c,-26+i*7,-53-i*2,5,3,'#abc17d','#5c8060',.6);}}
 if(type==='courier'){round(c,13,-38,12,20,3,'#937550','#4b5543',1.5);line(c,15,-33,22,-33,'#ceaf70',1);}
 round(c,-16,-43,32,30,type==='lantern'?12:7,gradient(c,0,-44,0,-12,[[0,color],[1,color]]),'#324e49',1.7);round(c,-11,-37,22,15,3,type==='musician'?'#4c555e':'#cbcfad','#637b66',1);
 if(type==='musician'){for(let rr=3;rr<=8;rr+=2){c.beginPath();c.arc(0,-29,rr,0,TAU);c.strokeStyle=rr===7?'#b4bda7':'#7a8f87';c.lineWidth=1;c.stroke();}}else if(type==='courier'){path(c,[[-5,-35],[0,-29],[5,-35]],null,'#9a8151',2,false);path(c,[[-5,-28],[0,-22],[5,-28]],null,'#9a8151',2,false);}else if(type==='gardener'){line(c,0,-25,0,-34,'#5c8666',1.5);ellipse(c,-4,-32,5,2.5,'#729367');ellipse(c,4,-35,5,2.5,'#729367');}else{glow(c,0,-30,17,'#ffe4a143');ellipse(c,0,-30,6,8,'#f3d896','#a08c5c',1);}
 for(const side of[-1,1]){const sway=walk?Math.sin(phase+side)*5:Math.sin(phase*.25+side)*1.2;line(c,side*17,-38,side*22+sway*.3,-24+sway,'#8a9a87',5);ellipse(c,side*17,-37,4,4,color,'#38554c',1);ellipse(c,side*23+sway*.3,-21+sway,4,4,'#aab5a0','#3b584d',1);line(c,side*23+sway*.3,-19+sway,side*26+sway*.3,-17+sway,'#3d5b50',1.5);}
 line(c,0,-44,0,-50,'#617969',5);
 if(type==='lantern'){round(c,-21,-76,42,28,13,'#b17962','#344f47',2);round(c,-16,-71,32,19,9,gradient(c,0,-72,0,-52,[[0,'#f1d69b'],[1,'#b6bb86']]),'#e8ca8b',1);round(c,-10,-81,20,7,2,'#a38965','#405b4b');line(c,0,-80,0,-87,'#6e8064',2);ellipse(c,0,-88,3,3,'#e4be79');}else if(type==='gardener'){ellipse(c,0,-63,20,16,color,'#35554b',2);round(c,-15,-68,30,15,6,'#2d5551','#afd1aa',1);line(c,3,-78,7,-87,'#63846c',2);ellipse(c,11,-87,7,3,'#b1c481','#557b61',1);}else{round(c,-20,-76,40,27,type==='musician'?10:7,color,'#334f48',1.8);round(c,-15,-69,30,15,4,'#2c5351','#a5b29a',1);if(type==='courier'){round(c,-21,-80,39,8,3,'#708e77','#354f45',1.2);round(c,-24,-74,47,4,2,'#829d7d','#3e5949',1);line(c,-8,-79,-1,-79,'#d9c18d',1.5);}else{c.beginPath();c.arc(0,-67,22,Math.PI,TAU);c.strokeStyle='#5b6871';c.lineWidth=4;c.stroke();round(c,-25,-68,7,15,3,'#c0afc5','#46595a',1);round(c,18,-68,7,15,3,'#c0afc5','#46595a',1);}}
 const eye=type==='lantern'?'#555e49':'#d4edb6';if(sad){line(c,-10,-63,-4,-61,eye,2);line(c,4,-61,10,-63,eye,2);}else{round(c,-10,-65,5,5,2,eye);round(c,5,-65,5,5,2,eye);}c.beginPath();if(sad){c.arc(0,-55,4,Math.PI,TAU);}else{c.arc(0,-60,4,.15,Math.PI-.15);}c.strokeStyle=eye;c.lineWidth=1.2;c.stroke();for(const xx of[-14,14])screw(c,xx,-47,1.2);
 if(r.status==='blocked'){round(c,-15,-97,30,13,6,'#675448','#e0ba83',.7);text(c,'···',0,-92,14,'#f0dbad','center');}if(r.status==='waiting'||r.status==='blocked'){round(c,-18,-95,36,5,2,'#31554b');round(c,-17,-94,34*pat,3,1,pat<.3?'#e39878':'#d6d29c');}if(r.status==='leaving'){text(c,'✓',20,-83,16,'#f4d58a','center');}if(r.status==='servicing'){for(let i=0;i<3;i++){const a=time*.002+i*TAU/3;ellipse(c,Math.cos(a)*24,-37+Math.sin(a)*7,1.4,1.4,'#e7dfa3aa');}}
 c.restore();}
function human(c,s,time,reduced){if(humanArt(c,s,time,reduced))return;const p=project(s.x,s.y),seed=String(s.id||'').split('').reduce((a,v)=>a+v.charCodeAt(0),0),walk=s.status==='walking',working=s.status==='working',phase=reduced?0:time*.011+seed,bob=walk?Math.abs(Math.sin(phase))*1.5:0,skin=['#c89872','#e2b98b','#a8795e'][seed%3],coat=['#6c8e86','#ad8562','#7d91a0'][seed%3];
 c.save();c.translate(p.x,p.y);ellipse(c,0,2,18,6,'#143d3a30');c.translate(0,-bob);const step=walk?Math.sin(phase)*5:0;for(const side of[-1,1]){line(c,side*6,-17,side*7+step*side,-3,'#465c56',7);round(c,side*7-5+step*side,-4,12,6,3,'#4b4f43','#2e4842',1);}
 round(c,-13,-46,26,32,8,coat,'#38514a',1.5);path(c,[[-7,-44],[7,-44],[11,-17],[-11,-17]],'#d3b681','#766d4b',1);round(c,-6,-32,13,10,2,'#b69f70','#807a56',.7);line(c,-3,-29,-3,-23,'#796e50',1);line(c,2,-28,2,-22,'#4d7668',1.7);line(c,-6,-44,-9,-48,'#d7bd8a',2);line(c,6,-44,9,-48,'#d7bd8a',2);
 for(const side of[-1,1]){const handY=working&&side===1?-39+Math.sin(phase*.7)*4:-24+(walk?Math.sin(phase+side)*4:0),handX=side*(working&&side===1?23:17);line(c,side*12,-41,side*18,-33,coat,7);line(c,side*18,-33,handX,handY,skin,5);ellipse(c,handX,handY,3,3,skin,'#826c50',.5);if(working&&side===1)wrench(c,handX+1,handY-6,.55,-.45+Math.sin(phase*.7)*.2,'#c5d2b5');}
 round(c,-4,-51,8,10,3,skin);ellipse(c,0,-59,12,14,skin,'#80694c',1);ellipse(c,-12,-58,2.5,4,skin);ellipse(c,12,-58,2.5,4,skin);
 if(seed%2){ellipse(c,0,-69,13,7,'#5d5541');ellipse(c,11,-72,6,6,'#5d5541');path(c,[[-11,-70],[-12,-57],[-8,-63],[-6,-69]],'#5d5541');}else{round(c,-14,-76,27,11,4,'#678579','#35574b',1);round(c,-16,-68,32,4,2,'#8da389','#38564b',1);line(c,-7,-73,4,-73,'#cdd0a0',1);}
 line(c,-6,-59,-3,-59,'#514e3e',1.4);line(c,3,-59,6,-59,'#514e3e',1.4);c.beginPath();c.arc(0,-55,3,0,Math.PI);c.strokeStyle='#8e6048';c.lineWidth=.8;c.stroke();if(seed%3===0){ellipse(c,-5,-59,4,3,null,'#65705b',.8);ellipse(c,5,-59,4,3,null,'#65705b',.8);line(c,-1,-59,1,-59,'#65705b',.8);}if(!s.fixed){round(c,-12,-87,24,12,4,'#32584bb8','#bfd0a477',.7);text(c,String(s.name||s.id||'技师').slice(0,3),0,-81,7,'#e8dfb5','center',500);}c.restore();}
function lighting(c,day,time){const mode=day%3;if(mode===1){const g=c.createLinearGradient(75,200,1125,700);g.addColorStop(0,'#e4d6a50b');g.addColorStop(1,'#e9ae6a14');c.fillStyle=g;c.fillRect(74,205,1053,510);}if(mode===2){c.fillStyle='#183b6320';c.fillRect(74,205,1053,510);for(const[x,y]of[[363,270],[749,270],[1084,270]])glow(c,x,y,135,'#f9d39a1a');}const g=c.createRadialGradient(610,400,270,610,400,740);g.addColorStop(0,'transparent');g.addColorStop(1,'#0b2f3a43');c.fillStyle=g;c.fillRect(0,0,W,H);}
/** Sprite feet remain on engine paths; 4 offline-rendered poses are keyed by walk phase. */
function robotArt(c,r,time,reduced){
 const walk=r.status==='walking'||r.status==='leaving',frame=walk&&!reduced?Math.floor(time/150+Number(String(r.id).replace(/\D/g,'')))%4:0;
 const sprite=art.get(`robot-${r.type||'courier'}-${frame}`);if(!sprite)return false;
 const p=project(r.x,r.y),bob=walk&&!reduced?Math.sin(time*.013)*1.3:0;
 c.save();c.translate(p.x,p.y+bob);ellipse(c,0,-1,25,7,'#102f4159');
 // 96px tall rendered figure, with the camera's padded transparent sprite anchored to its feet.
 c.drawImage(sprite.image,sprite.x,sprite.y,256,320,-52,-112.5,104,130);c.restore();return true;
}
function humanArt(c,s,time,reduced){
 const seed=String(s.id||'').split('').reduce((a,v)=>a+v.charCodeAt(0),0),frame=s.status==='working'?(reduced?4:4+Math.floor(time/260)%2):s.status==='walking'&&!reduced?Math.floor(time/150+seed)%4:0;
 const sprite=art.get(`tech-${seed%3}-${frame}`);if(!sprite)return false;
 const p=project(s.x,s.y);c.save();c.translate(p.x,p.y);ellipse(c,0,0,21,6,'#16373d55');c.drawImage(sprite.image,sprite.x,sprite.y,256,320,-52,-112.5,104,130);c.restore();return true;
}
function bolt(c,x,y,size,color){path(c,[[x+size*.1,y-size],[x-size*.5,y+size*.05],[x-size*.04,y+size*.05],[x-size*.25,y+size],[x+size*.55,y-size*.15],[x+size*.09,y-size*.15]],color);}
function stationBanner(c,s,p,selected){
 const active=!!s.robotId,blocked=s.broken||s.maintenance>0||!s.workerId,a=accents[s.type]||'#b9d8ca';
 const color=blocked?'#f7a784':active?a:'#e0e4d4';
 const name={diagnosis:'检测',mechanical:'机械',electrical:'电路'}[s.type];
 const label=s.maintenance>0?'保养中':s.broken?'故障':!s.workerId?'缺技师':active?`${Math.floor(clamp(s.progress/(s.duration||1))*100)}%`:'待客';
 const x=p.x,y=p.y+(s.y>350?88:-112);
 round(c,x-85,y-17,170,32,7,selected?'#162e37':'#233e45',selected?'#ffdf98':'#a1b8ae',selected?2.5:1.3);
 round(c,x-78,y-10,26,20,4,a);text(c,s.slot,x-65,y,14,'#17373a','center',800);
 text(c,name,x-43,y,14,'#fff1d5','left',700);text(c,label,x+74,y,13,color,'right',700);
 if(active){round(c,x-79,y+18,158,6,3,'#163943');round(c,x-79,y+18,158*clamp(s.progress/(s.duration||1)),6,3,color);}
}
function robotSignals(c,r,state,time,reduced){
 if(r.status==='gone')return;const p=project(r.x,r.y),active=r.status==='servicing',waiting=r.status==='waiting'||r.status==='blocked';
 const st=state.stations?.find(s=>s.id===r.stationId),q=st?.queue?.indexOf(r.id)??-1;
 const pat=clamp(r.patience/(r.maxPatience||100));
 if(waiting||q>=0){round(c,p.x-23,p.y-119,46,7,3,'#182f38','#e5e5d5',1);round(c,p.x-21,p.y-117,42*pat,3,2,pat<.3?'#ff7156':'#a6e093');if(q>=0){round(c,p.x+20,p.y-119,17,17,5,'#fff3d3','#294957',1);text(c,q+1,p.x+28.5,p.y-110,10,'#23424c','center',800);}}
 if(r.paid){const y=p.y-123-(reduced?0:Math.sin(time*.006)*3);round(c,p.x-37,y,74,26,7,'#e8ffcc','#447c60',1.8);text(c,`+${r.receipt}`,p.x,y+13,17,'#235642','center',800);return;}
 if(r.status==='leaving'&&!r.paid){round(c,p.x-35,p.y-123,70,24,6,'#642f35','#ffb4a0',1);text(c,'离开了',p.x,p.y-111,13,'#ffe7ce','center');return;}
 // Every visible fault icon follows this customer's true remaining repair route.
 if(!active&&r.stage!=='payment'){
  const electrical=r.type==='lantern'||(r.type==='musician'&&r.stage==='electrical');
  round(c,p.x+18,p.y-83,24,24,7,electrical?'#442c53':'#533b27','#ffe7bb',1.2);
  if(electrical)bolt(c,p.x+30,p.y-71,8,'#d6beff');else{gear(c,p.x+30,p.y-71,8,.3,'#ffcb77');line(c,p.x+24,p.y-78,p.x+36,p.y-64,'#fff2cb',2);}
 }
 if(active&&st){
  const a=accents[st.type]||'#b8e6c1',phase=reduced?.5:(time%1000)/1000;
  if(st.type==='diagnosis'){
   const yy=p.y-94+phase*70;round(c,p.x-32,p.y-104,64,99,10,'#45efdb11');line(c,p.x-33,yy,p.x+33,yy,'#73fff0',3);glow(c,p.x,yy,35,'#6fffea2b');
   for(const side of[-1,1]){line(c,p.x+side*32,p.y-100,p.x+side*32,p.y-8,'#a1fff073',1);}
  }else if(st.type==='mechanical'){
   const contact=phase>.6,wx=p.x-27,wy=p.y-55;
   c.save();c.translate(wx,wy);c.rotate(-.6+(contact?.12:-phase*.55));wrench(c,0,0,1.45,0,'#f3dd9a');c.restore();
   gear(c,p.x+8,p.y-48,9,reduced?0:time*.004,'#ffe4a8');
   if(contact&&!reduced)for(let i=0;i<4;i++){const a=i*1.55;line(c,wx+Math.cos(a)*7,wy+Math.sin(a)*7,wx+Math.cos(a)*15,wy+Math.sin(a)*15,'#fff0aa',2);}
  }else if(st.type==='electrical'){
   const wx=p.x-7,wy=p.y-55;line(c,p.x-44,p.y-34,wx,wy,'#313b51',8);line(c,p.x-19,p.y-46,wx,wy,'#ded1cf',4);glow(c,wx,wy,23,'#bcaaff50');
   if(!reduced)for(let i=0;i<5;i++){const a=time*.015+i*1.25,rad=8+((time*.02+i*3)%13);line(c,wx+Math.cos(a)*5,wy+Math.sin(a)*5,wx+Math.cos(a)*rad,wy+Math.sin(a)*rad,'#fff6c6',2);}
   else ellipse(c,wx,wy,4,4,'#fff6c6');
  }else if(st.type==='payment'){
   round(c,p.x+25,p.y-91,26,32,2,'#fff8d8','#27454a',1);for(let i=0;i<4;i++)line(c,p.x+30,p.y-85+i*6,p.x+45,p.y-85+i*6,'#71977c',1.5);
  }
 }
}
function drawShop(c,state,options){
 const reduced=!!options.reducedMotion,time=reduced?0:Number(options.time)||0,selected=options.selectedSlot,
 stations=Array.isArray(state.stations)?state.stations:[],robots=Array.isArray(state.robots)?state.robots:[],staff=Array.isArray(state.staff)?state.staff:[];
 let day=Number(state.levelIndex??0);if(!Number.isFinite(day))day=0;
 background(c,time,day);lighting(c,day,time);
 // Room retains the original illustration; foreground work is lit independently.
 c.fillStyle='#dbe3ce0b';c.fillRect(74,205,1053,510);
 const normal=stations.filter(s=>s.type!=='reception'&&s.type!=='payment');
 for(const[id,x,y]of SLOT_DATA)if(!normal.some(s=>s.slot===id))blueprint(c,id,project(x,y),selected===id,time);
 // Painter-sort desks with characters. A technician behind a lower bench is no longer pasted in front of its tools.
 const actors=[...stations.map(s=>({kind:2,data:s,y:s.y||0})),...robots.filter(r=>r.status!=='gone').map(r=>({kind:0,data:r,y:r.y||0})),...staff.map(s=>({kind:1,data:s,y:s.y||0}))].sort((a,b)=>a.y-b.y||a.kind-b.kind);
 for(const a of actors){if(a.kind===0)robot(c,a.data,time,reduced);else if(a.kind===1)human(c,a.data,time,reduced);else{const s=a.data;if(s.type==='reception'||s.type==='payment')reception(c,s,project(s.x,s.y),s.type==='payment',time);else station(c,s,project(s.x,s.y),selected===s.slot,time,robots.find(r=>r.id===s.robotId)?.status);}}
 for(const r of robots)robotSignals(c,r,state,time,reduced);
 for(const s of normal)stationBanner(c,s,project(s.x,s.y),selected===s.slot);
}
/** Draws no HTML/UI and never mutates simulation state. Hit tests remain original logical coordinates. */
export function render(ctx,state={},options={}){if(!ctx)return;const width=Number(options.width)||W,height=Number(options.height)||H;
 ctx.save();ctx.setTransform(width/W,0,0,height/H,0,0);ctx.lineCap='round';ctx.lineJoin='round';drawShop(ctx,state,options);ctx.restore();}
/** A real crop of the selected live bay, rather than a separate idealized animation. */
export function renderDetail(ctx,state={},options={}){if(!ctx)return;const width=Number(options.width)||420,height=Number(options.height)||240;
 const slot=SLOT_DATA.find(s=>s[0]===options.selectedSlot)||SLOT_DATA[0],p=project(slot[1],slot[2]);
 const cropW=266,cropH=cropW*height/width;
 ctx.save();ctx.setTransform(width/cropW,0,0,height/cropH,-(p.x-cropW/2)*width/cropW,-(p.y-(slot[2]>350?158:108))*height/cropH);
 ctx.lineCap='round';ctx.lineJoin='round';drawShop(ctx,state,options);ctx.restore();
}
