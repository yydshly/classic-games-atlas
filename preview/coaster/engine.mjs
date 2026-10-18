import { LEVELS, MODULES } from './levels.mjs';
export { LEVELS, MODULES } from './levels.mjs';
export const PARTS = MODULES;
export const FIXED_DT = 1 / 60;
export const PHYSICS = Object.freeze({ gravity: 9.8, rollingLoss: .7, liftSpeed: 8, driveSpeed: 21, trimSpeed: 18, brakeSpeed: 10, bankFactor: .55, minSpeed: 4, lateralLimit: 1.35, stationSpeed: 12, maxFrame: .25 });
const LIMITS = Object.freeze({ events: 1024, ticks: 250000, bytes: 160000 });
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=o=>JSON.parse(JSON.stringify(o));
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
const live=s=>s.state==='testing'||s.state==='operating';
const costOf=mods=>mods.reduce((n,id)=>n+MODULES[id].cost,0);
const cue=(s,msg)=>{s.message=msg;s.events.push(msg);if(s.events.length>10)s.events.shift();};
const pos=(s,i,t)=>{const a=s.level.points[i],b=s.level.points[(i+1)%s.level.points.length];return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};};
const trainAtStation=s=>({segment:0,t:0,speed:PHYSICS.liftSpeed,...pos(s,0,0),lap:s.runs});
function log(s,event){if(s.replaying)return;const prev=s.history.at(-1);if(event.kind==='ticks'&&prev?.kind==='ticks')prev.n+=event.n;else if(event.kind==='command'&&event.command.type==='select'&&prev?.kind==='command'&&prev.command.type==='select')prev.command=event.command;else s.history.push(event);}
export function createGame(index=0){
 const levelIndex=clamp(Math.trunc(Number(index)||0),0,LEVELS.length-1),level=LEVELS[levelIndex];
 const s={state:'design',priorState:null,levelIndex,level,selected:0,modules:[...level.initialModules],cost:0,cash:level.budget,train:null,report:null,runs:0,revenue:0,reputation:0,visitors:0,aboard:0,runProgress:0,elapsed:0,tick:0,accumulator:0,message:'先选轨段、安装模块，再用空车测试整圈。',events:[],history:[],active:null};
 s.cost=costOf(s.modules);s.cash=level.budget-s.cost;s.train=trainAtStation(s);return s;
}
export function start(s){return s;}
export function pause(s){if(live(s)){s.priorState=s.state;s.state='paused';log(s,{kind:'pause'});}return s;}
export function resume(s){if(s.state==='paused'&&['testing','operating'].includes(s.priorState)){s.state=s.priorState;s.priorState=null;log(s,{kind:'resume'});}return s;}
export function retry(s){const fresh=createGame(s.levelIndex);Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,fresh);return s;}
const normalize=c=>typeof c==='string'?{type:c}:c;
export function canCommand(s,input){
 const c=normalize(input);if(!c||typeof c!=='object'||Array.isArray(c)||typeof c.type!=='string')return{ok:false,reason:'无效操作。'};
 if(c.type==='select')return Number.isInteger(c.segment)&&c.segment>=0&&c.segment<s.modules.length?{ok:true,reason:''}:{ok:false,reason:'请选择有效轨段。'};
 if(c.type==='design')return ['testing','operating','paused','design'].includes(s.state)?{ok:true,reason:''}:{ok:false,reason:'本次营业已结束，请重试或前往下一关。'};
 if(s.state!=='design')return{ok:false,reason:s.state==='paused'?'请先继续，或返回设计。':'请先返回设计阶段。'};
 if(c.type==='module'){
  if(!Number.isInteger(c.segment)||c.segment<0||c.segment>=s.modules.length||!Object.hasOwn(MODULES,c.module))return{ok:false,reason:'无效的轨段或模块。'};
  const seg=s.level.segments[c.segment],a=s.level.points[seg.from],b=s.level.points[seg.to],net=MODULES[c.module].cost-MODULES[s.modules[c.segment]].cost;
  if(c.module==='lift'&&b.z-a.z<3)return{ok:false,reason:'链条提升只安装在上升至少 3 米的坡段。',cost:net};
  if(c.module==='drive'&&(b.z<a.z||b.z-a.z>10||seg.kind==='station'))return{ok:false,reason:'轮胎驱动只能安装在平段或上升不超过 10 米的缓坡，不能用于站前进场。',cost:net};
  if(net>s.cash)return{ok:false,reason:`预算不足：还需 ${net}，可用 ${s.cash}。`,cost:net};
  return{ok:true,reason:'',cost:net};
 }
 if(c.type==='test')return{ok:true,reason:''};
 if(c.type==='open')return s.report?.safe?{ok:true,reason:s.report.approved?'':'体验未达标，营业可能无法完成目标。'}:{ok:false,reason:'先完成一次安全试车；任何轨道改动都需要重新测试。'};
 return{ok:false,reason:'无效操作。'};
}
function diagnose(code,segment,message,severity='danger'){return{code,segment,severity,message};}
// Energy balance is exact within this deliberately legible abstraction:
// v_free² = v_entry² + 2*g*(z_from-z_to) - rollingLoss*segmentLength.
// Brakes, drive and chain are distributed segment controls, not instantaneous
// teleportations. A linear-in-distance energy profile produces the animation.
export function inspectDesign(s){
 let v=8,totalTime=0,totalThrill=0,totalComfort=0,maxSpeed=0,minSpeed=Infinity,firstFailure=null;
 const segments=[],diagnosis=[];
 for(const seg of s.level.segments){
  const i=seg.id,a=s.level.points[seg.from],b=s.level.points[seg.to],module=s.modules[i],entrySpeed=v,freeEnergy=v*v+2*PHYSICS.gravity*(a.z-b.z)-PHYSICS.rollingLoss*seg.length;
  let exitSpeed=Math.sqrt(Math.max(0,freeEnergy));
  if(module==='lift')exitSpeed=8;
  if(module==='drive')exitSpeed=Math.max(21,exitSpeed);
  if(module==='trim')exitSpeed=Math.min(18,exitSpeed);
  if(module==='brake')exitSpeed=Math.min(10,exitSpeed);
  const actualEntry=entrySpeed;
  const peak=Math.max(actualEntry,exitSpeed),low=Math.min(actualEntry,exitSpeed);
  const lateral=peak*peak/(seg.turnRadius*PHYSICS.gravity)*(module==='bank'?.55:1);
  const deceleration=(module==='trim'||module==='brake')?Math.max(0,(entrySpeed*entrySpeed-exitSpeed*exitSpeed)/(2*seg.length)):0;
  const thrill=clamp((actualEntry+exitSpeed)*.95+Math.max(0,a.z-b.z)*.36+lateral*5-(module==='lift'?5:0),0,100);
  const comfort=clamp(100-Math.max(0,lateral-.45)*42-Math.max(0,deceleration-2.5)*3.5,0,100);
  let duration=2*seg.length/Math.max(4,actualEntry+exitSpeed);const failures=[];
  if(exitSpeed<4)failures.push(diagnose('stall',i,`${i+1} 号段能量不足：预计出口 ${exitSpeed.toFixed(1)} 米/秒，最低要求 4；试车在坡中降至 4 米/秒时中止，未到出口。上坡加提升或在前段保留速度。`));
  if(peak>s.level.speedLimit)failures.push(diagnose('overspeed',i,`${i+1} 号段峰速 ${peak.toFixed(1)} 超过线路限速 ${s.level.speedLimit} 米/秒；在上一个低速入口或下坡段调速。`));
  if(lateral>1.35)failures.push(diagnose('lateral',i,`${i+1} 号段横向力 ${lateral.toFixed(2)}g 超过 1.35g；使用倾斜弯轨或提前减速。`));
  if(seg.kind==='station'&&exitSpeed>12)failures.push(diagnose('station',i,`回站速度 ${exitSpeed.toFixed(1)} 超过 12 米/秒；12 号段安装站前制动。`));
  let stopT=1;
  if(exitSpeed<4&&freeEnergy<16&&module!=='lift'&&module!=='drive')stopT=clamp((entrySpeed*entrySpeed-16)/Math.max(.001,entrySpeed*entrySpeed-freeEnergy),.03,1);
  const reached=firstFailure===null;
  const energyDelta=exitSpeed<4&&module!=='lift'&&module!=='drive'?freeEnergy-actualEntry*actualEntry:exitSpeed*exitSpeed-actualEntry*actualEntry;
  if(stopT<1)duration=2*seg.length*stopT/(actualEntry+4);
  const measuredExitSpeed=stopT<1?4:exitSpeed,measuredMinSpeed=Math.min(actualEntry,measuredExitSpeed);
  const measuredThrill=stopT<1?clamp((actualEntry+measuredExitSpeed)*.95+Math.max(0,a.z-b.z)*stopT*.36+lateral*5-(module==='lift'?5:0),0,100):thrill;
  const status=!reached?'unreached':failures.length?'danger':comfort<s.level.minComfort?'warning':'safe';
  const item={segment:i,module,entrySpeed:actualEntry,exitSpeed,maxSpeed:peak,minSpeed:measuredMinSpeed,measuredExitSpeed,exitReached:stopT===1,freeEnergy,energyDelta,acceleration:energyDelta/(2*seg.length),measured:reached,lateral,deceleration,thrill:measuredThrill,comfort,duration,stopT,status,message:!reached?'前段测试中止，本段尚未测量。':failures[0]?.message||`${i+1} 号段通过：${exitSpeed.toFixed(1)} 米/秒，横向 ${lateral.toFixed(2)}g。`};
  segments.push(item);if(reached)diagnosis.push(...failures);if(failures.length&&firstFailure===null)firstFailure=i;
  if(reached){totalTime+=duration;totalThrill+=measuredThrill;totalComfort+=comfort;maxSpeed=Math.max(maxSpeed,peak);minSpeed=Math.min(minSpeed,measuredMinSpeed);}v=exitSpeed;
 }
 const testedSegments=firstFailure===null?segments.length:firstFailure+1;
 const thrill=totalThrill/testedSegments,comfort=totalComfort/testedSegments,safe=firstFailure===null;
 if(safe&&thrill<s.level.minThrill)diagnosis.push(diagnose('dull',null,`刺激 ${thrill.toFixed(1)} / ${s.level.minThrill}：减掉不必要的刹车，或在平直轨段增加驱动。`,'warning'));
 if(safe&&comfort<s.level.minComfort)diagnosis.push(diagnose('comfort',null,`舒适 ${comfort.toFixed(1)} / ${s.level.minComfort}：降低弯道横向力，或把急刹改成提前调速。`,'warning'));
 const approved=safe&&thrill>=s.level.minThrill&&comfort>=s.level.minComfort;
 const demand=clamp(Math.min(thrill/s.level.minThrill,comfort/s.level.minComfort),.2,1);
 const riders=Math.max(1,Math.floor(s.level.seats*demand));
 const rideReputation=approved?90:Math.round(30*demand);
 const rideRevenue=riders*s.level.ticketPrice;
 if(!diagnosis.length)diagnosis.push(diagnose('certified',null,`安全与体验验收通过；预计每班 ${riders} 位游客，收入 ${rideRevenue}，口碑 +${rideReputation}。`,'success'));
 return{safe,approved,testedSegments,thrill,comfort,maxSpeed,minSpeed,duration:totalTime,diagnosis,segments,firstFailure,riders,rideRevenue,rideReputation};
}
function begin(s,mode){
 const report=mode==='testing'?inspectDesign(s):s.report;
 s.state=mode;s.priorState=null;s.active={report,segmentElapsed:0};s.train=trainAtStation(s);s.runProgress=0;s.aboard=mode==='operating'?report.riders:0;s.accumulator=0;
 cue(s,mode==='testing'?'空车出发：逐段测量速度、横向力和乘坐体验。':`开园接客：本班 ${s.aboard} 位游客，安全回站后结算。`);
}
export function command(s,input){
 const c=normalize(input),result=canCommand(s,c);if(!result.ok)return result;
 log(s,{kind:'command',command:c.type==='module'?{type:c.type,segment:c.segment,module:c.module}:c.type==='select'?{type:c.type,segment:c.segment}:{type:c.type}});
 if(c.type==='select')s.selected=c.segment;
 else if(c.type==='module'){
  s.modules[c.segment]=c.module;s.selected=c.segment;s.cost=costOf(s.modules);s.cash=s.level.budget-s.cost;s.report=null;s.train=trainAtStation(s);s.runProgress=0;
  cue(s,`${c.segment+1} 号段已装${MODULES[c.module].name}；预算余额 ${s.cash}，请重新试车。`);
 }else if(c.type==='test')begin(s,'testing');
 else if(c.type==='open')begin(s,'operating');
 else if(c.type==='design'){s.state='design';s.priorState=null;s.active=null;s.aboard=0;s.train=trainAtStation(s);s.runProgress=0;s.accumulator=0;cue(s,'回到设计台；已完成营业保留，当前未完成班次不结算。');}
 return result;
}
function finishTest(s){s.report=s.active.report;s.state='design';s.active=null;s.aboard=0;s.accumulator=0;cue(s,s.report.safe?(s.report.approved?'试车通过！查看验收报告后可以开放营业。':'安全试车完成，但体验未达标；建议调整后重测。'):s.report.diagnosis.find(d=>d.severity==='danger').message);}
function finishRide(s){
 const r=s.active.report;s.runs++;s.visitors+=r.riders;s.revenue+=r.rideRevenue;s.reputation+=r.rideReputation;s.aboard=0;
 if(s.revenue>=s.level.targetRevenue&&s.reputation>=s.level.targetReputation){s.state='won';s.active=null;s.accumulator=0;cue(s,`开园成功！${s.runs} 班接待 ${s.visitors} 人，收入 ${s.revenue}，口碑 ${s.reputation}。`);}
 else if(s.runs>=s.level.maxRuns){s.state='lost';s.active=null;s.accumulator=0;cue(s,`营业班次用尽：收入 ${s.revenue}/${s.level.targetRevenue}，口碑 ${s.reputation}/${s.level.targetReputation}。重新设计再试一次。`);}
 else{cue(s,`第 ${s.runs} 班安全回站：收入 +${r.rideRevenue}，口碑 +${r.rideReputation}；下一班出发。`);s.train=trainAtStation(s);s.active.segmentElapsed=0;s.aboard=r.riders;s.runProgress=0;}
}
function tick(s){
 if(!live(s))return false;s.tick++;s.elapsed=s.tick*FIXED_DT;
 const active=s.active,i=s.train.segment,profile=active.report.segments[i],seg=s.level.segments[i];
 active.segmentElapsed+=FIXED_DT;
 const a=profile.acceleration;
 const travelled=profile.entrySpeed*active.segmentElapsed+.5*a*active.segmentElapsed*active.segmentElapsed;
 const t=clamp(travelled/seg.length,0,1),isFailure=s.state==='testing'&&active.report.firstFailure===i;
 const limitedT=isFailure?Math.min(t,profile.stopT):t;
 s.train={segment:i,t:limitedT,speed:Math.sqrt(Math.max(0,profile.entrySpeed**2+profile.energyDelta*limitedT)),...pos(s,i,limitedT),lap:s.runs};s.runProgress=(i+limitedT)/s.modules.length;
 if((isFailure&&t>=profile.stopT)||active.segmentElapsed+1e-9>=profile.duration){
  if(isFailure){finishTest(s);return true;}
  if(i===s.modules.length-1){s.train.t=1;Object.assign(s.train,pos(s,i,1));s.runProgress=1;if(s.state==='testing')finishTest(s);else finishRide(s);}
  else{s.train.segment=i+1;s.train.t=0;Object.assign(s.train,pos(s,i+1,0));active.segmentElapsed=0;}
 }
 return true;
}
export function step(s,dt=FIXED_DT){
 if(!live(s)||!Number.isFinite(dt)||dt<=0)return s;
 s.accumulator+=Math.min(dt,PHYSICS.maxFrame);
 while(s.accumulator+1e-12>=FIXED_DT&&live(s)){s.accumulator=Math.max(0,s.accumulator-FIXED_DT);tick(s);log(s,{kind:'ticks',n:1});}
 return s;
}
export function snapshot(s){const {history,replaying,...visible}=s;return freeze(clone(visible));}
export function checkpoint(s){
 if(s.history.length>LIMITS.events||s.tick>LIMITS.ticks)return null;
 const out={schema:'cloud-cape-coaster',version:1,levelIndex:s.levelIndex,history:clone(s.history),accumulator:s.accumulator};
 return JSON.stringify(out).length<=LIMITS.bytes?out:null;
}
export function restore(input){
 try{
  if(!input||typeof input!=='object'||Array.isArray(input))return null;
  const raw=JSON.stringify(input);if(raw.length>LIMITS.bytes)return null;const data=JSON.parse(raw);
  if(Object.keys(data).sort().join(',')!=='accumulator,history,levelIndex,schema,version'||data.schema!=='cloud-cape-coaster'||data.version!==1||!Number.isInteger(data.levelIndex)||data.levelIndex<0||data.levelIndex>=LEVELS.length||!Array.isArray(data.history)||data.history.length>LIMITS.events||!Number.isFinite(data.accumulator)||data.accumulator<0||data.accumulator>=FIXED_DT+1e-12)return null;
  const s=createGame(data.levelIndex);s.replaying=true;let ticks=0;
  for(const event of data.history){
   if(!event||typeof event!=='object'||Array.isArray(event))return null;
   if(event.kind==='ticks'){
    if(Object.keys(event).sort().join(',')!=='kind,n'||!Number.isInteger(event.n)||event.n<=0||ticks+event.n>LIMITS.ticks)return null;
    for(let i=0;i<event.n;i++){if(!live(s))return null;tick(s);}ticks+=event.n;
   }else if(event.kind==='command'){
    if(Object.keys(event).sort().join(',')!=='command,kind')return null;
    const c=event.command,expected=c?.type==='module'?'module,segment,type':c?.type==='select'?'segment,type':'type';
    if(!c||Object.keys(c).sort().join(',')!==expected||!command(s,c).ok)return null;
   }else if(event.kind==='pause'){if(Object.keys(event).length!==1||!live(s))return null;pause(s);}
   else if(event.kind==='resume'){if(Object.keys(event).length!==1||s.state!=='paused')return null;resume(s);}
   else return null;
  }
  if(!live(s)&&s.state!=='paused'&&data.accumulator!==0)return null;
  s.history=clone(data.history);s.accumulator=data.accumulator;delete s.replaying;return s;
 }catch{return null;}
}
