// Original, authored closed circuits. Coordinates are world units, not canvas pixels.
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);for(const v of Object.values(o))freeze(v);}return o;};
const TAU=Math.PI*2, wrap=a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;
function makeTrack(nodes,width){
 const raw=[];
 for(let i=0;i<nodes.length;i++){const a=nodes[(i+nodes.length-1)%nodes.length],b=nodes[i],c=nodes[(i+1)%nodes.length],d=nodes[(i+2)%nodes.length];
  for(let j=0;j<24;j++){const t=j/24,t2=t*t,t3=t2*t;raw.push({x:((1-3*t+3*t2-t3)*a[0]+(4-6*t2+3*t3)*b[0]+(1+3*t+3*t2-3*t3)*c[0]+t3*d[0])/6,y:((1-3*t+3*t2-t3)*a[1]+(4-6*t2+3*t3)*b[1]+(1+3*t+3*t2-3*t3)*c[1]+t3*d[1])/6});}}
 let length=0;for(let i=0;i<raw.length;i++){const p=raw[i],n=raw[(i+1)%raw.length];p.s=length;p.heading=Math.atan2(n.y-p.y,n.x-p.x);p.span=Math.hypot(n.x-p.x,n.y-p.y);length+=p.span;}
 for(let i=0;i<raw.length;i++){const p=raw[i],b=raw[(i+raw.length-1)%raw.length],n=raw[(i+1)%raw.length];p.curvature=wrap(n.heading-b.heading)/(p.span+b.span);}
 const minX=Math.min(...raw.map(p=>p.x))-width,minY=Math.min(...raw.map(p=>p.y))-width,maxX=Math.max(...raw.map(p=>p.x))+width,maxY=Math.max(...raw.map(p=>p.y))+width;
 return {points:raw,length,width,bounds:{minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY}};
}
const layouts=[
 {name:'苔原练习场',tip:'自动加速。提前轻转方向，松开漂移可释放短冲刺。',width:72,targetPlace:3,timeLimit:92,nodes:[[230,145],[680,145],[835,255],[820,430],[650,545],[280,545],[135,420],[130,260]],grip:1,wind:0},
 {name:'果园双弯',tip:'连续弯道先减速再转向，别把方向一直按到底。',width:68,targetPlace:3,timeLimit:94,nodes:[[240,125],[610,125],[820,220],[795,390],[680,480],[505,425],[325,555],[145,445],[140,250]],grip:1,wind:0},
 {name:'木桥回环',tip:'路面变窄。直线收好方向，道具箱要贴近才能拾取。',width:61,targetPlace:2,timeLimit:98,nodes:[[230,120],[720,120],[840,240],[755,355],[835,510],[620,565],[430,465],[265,560],[130,420],[160,245]],grip:1,wind:0},
 {name:'雨洼溪岸',tip:'湿地抓地力降低，刹车后再进入急弯更稳。',width:65,targetPlace:2,timeLimit:105,nodes:[[240,130],[590,130],[810,215],[825,380],[675,535],[520,415],[360,535],[155,465],[135,270]],grip:.82,wind:0},
 {name:'砂丘折返',tip:'弯内的木桩会减速。提前换线，护盾可以挡住撞击。',width:62,targetPlace:2,timeLimit:106,nodes:[[245,100],[735,110],[855,225],[700,325],[830,475],[675,575],[500,490],[300,565],[130,450],[160,270]],grip:.96,wind:0,obstacleFractions:[.23,.55,.78]},
 {name:'风口长湾',tip:'风口会持续把赛车推向外侧，需要小幅反打修正。',width:65,targetPlace:2,timeLimit:108,nodes:[[230,100],[600,105],[835,195],[780,365],[855,520],[650,580],[430,490],[230,575],[120,390],[145,230]],grip:1,wind:5.5},
 {name:'松林针弯',tip:'连续针弯更考验控速，留下脉冲道具用于近身超车。',width:61,targetPlace:1,timeLimit:112,nodes:[[230,95],[690,95],[840,205],[670,315],[825,435],[740,565],[545,515],[415,370],[290,535],[130,445],[160,255]],grip:.94,wind:0,obstacleFractions:[.29,.63]},
 {name:'林野冠军环',tip:'湿滑、阵风和木桩同时出现。两圈后夺得第一名。',width:62,targetPlace:1,timeLimit:118,nodes:[[230,100],[680,100],[835,215],[680,320],[830,460],[675,575],[500,505],[395,370],[285,550],[135,460],[155,250]],grip:.87,wind:3.5,obstacleFractions:[.21,.49,.75]}
];
export const LEVELS=freeze(layouts.map((a,i)=>{const track=makeTrack(a.nodes,a.width);return {id:i+1,name:a.name,tip:a.tip,targetPlace:a.targetPlace,timeLimit:a.timeLimit,laps:2,grip:a.grip,wind:a.wind,palette:i,track,boxes:[.12,.36,.61,.85].map((f,j)=>({id:j,s:track.length*f,lateral:[-12,12,0,-10][j],kind:['boost','shield','pulse','boost'][(j+i)%4]})),obstacles:(a.obstacleFractions||[]).map((f,j)=>({id:j,s:track.length*f,lateral:j%2?13:-13,r:7})),weather:a.grip<.9?'rain':a.wind?'wind':'clear',aiPace:[.91,.88,.85].map(v=>v+i*.003)};}));
export function pointAt(levelOrTrack,s,lateral=0){const t=levelOrTrack.track||levelOrTrack;const n=((s%t.length)+t.length)%t.length;let lo=0,hi=t.points.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(t.points[m].s<=n)lo=m;else hi=m-1;}const p=t.points[lo],q=t.points[(lo+1)%t.points.length],u=Math.max(0,Math.min(1,(n-p.s)/p.span));const heading=p.heading+wrap(q.heading-p.heading)*u;return {x:p.x+(q.x-p.x)*u-Math.sin(heading)*lateral,y:p.y+(q.y-p.y)*u+Math.cos(heading)*lateral,heading,curvature:p.curvature+(q.curvature-p.curvature)*u};}
export function roadPath(levelOrTrack,offset=0){const t=levelOrTrack.track||levelOrTrack;return t.points.map(p=>pointAt(t,p.s,offset));}
