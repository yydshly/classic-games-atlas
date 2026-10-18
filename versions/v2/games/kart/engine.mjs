import {LEVELS,pointAt,roadPath} from './levels.mjs';
export {LEVELS,pointAt,roadPath};
export const FIXED_DT=1/60;
export const RULES=Object.freeze({maxSpeed:100,boostSpeed:124,acceleration:72,brake:140,drag:27,linearDrag:.45,steerRate:2.1,carRadius:6,boxRadius:15,boxCooldown:5,itemBoost:1.3,itemShield:2.8,pulseRange:54,pulseSlow:1.1,itemCooldown:.3,driftMinimum:.55,driftMaximum:1.6,driftBoost:.68});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=Number.isFinite;
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;};
const clone=o=>JSON.parse(JSON.stringify(o));
const levelOf=g=>LEVELS[g.level-1];
const circ=(a,b,length)=>{let d=(a-b)%length;if(d>length/2)d-=length;if(d< -length/2)d+=length;return d;};
function placeCars(g){const ranked=[...g.cars].sort((a,b)=>a.finishTime!==null&&b.finishTime!==null?(Math.abs(a.finishTime-b.finishTime)<1e-9?a.id-b.id:a.finishTime-b.finishTime):a.finishTime!==null?-1:b.finishTime!==null?1:b.s-a.s||a.id-b.id);ranked.forEach((c,i)=>c.place=i+1);g.rank=g.cars[0].place;}
function pose(c,l){const p=pointAt(l,c.s,c.lateral);c.x=p.x;c.y=p.y;c.heading=p.heading+c.headingError;c.lap=Math.min(l.laps,Math.max(1,Math.floor(Math.max(0,c.s)/l.track.length)+1));c.offroad=Math.abs(c.lateral)>l.track.width/2-RULES.carRadius;}
export function createGame(index=0,{assist=false}={}){index=Number.isInteger(index)?clamp(index,0,7):0;const l=LEVELS[index],g={version:1,assist:assist===true,state:'ready',level:l.id,time:0,countdown:3,remaining:l.timeLimit,rank:1,result:null,reason:'',pausedFrom:null,accumulator:0,itemHeld:false,cars:[],boxes:l.boxes.map(b=>({id:b.id,readyAt:0})),effects:[],events:[],stats:{pickups:0,itemsUsed:0,driftBoosts:0,collisions:0,obstacleHits:0,offroadTime:0},ticks:0};
 for(let i=0;i<4;i++){const c={id:i,name:['赤狐','岩獾','苔兔','橡熊'][i],color:['#d85e38','#477d83','#aeb96a','#bf8b42'][i],s:-Math.floor(i/2)*19,lateral:i%2?11:-11,speed:0,headingError:0,x:0,y:0,heading:0,lap:1,place:i+1,finishTime:null,item:null,boost:0,shield:0,slow:0,itemCooldown:0,collisionCooldown:0,obstacleCooldown:0,driftCharge:0,drifting:false,offroad:false};pose(c,l);g.cars.push(c);}placeCars(g);return g;}
export function setAssist(g,enabled){if(g.state!=='ready'||typeof enabled!=='boolean')return false;g.assist=enabled;return true;}
export function start(g){if(g.state!=='ready')return false;g.state='countdown';g.events=[{type:'start'}];return true;}
export function pause(g){if(!['playing','countdown'].includes(g.state))return false;g.pausedFrom=g.state;g.state='paused';return true;}
export function resume(g){if(g.state!=='paused'||!['playing','countdown'].includes(g.pausedFrom))return false;g.state=g.pausedFrom;g.pausedFrom=null;return true;}
export function retry(g){const fresh=createGame(g.level-1,{assist:g.assist});for(const k of Object.keys(g))delete g[k];Object.assign(g,fresh);return g;}
export function canAction(g,kind='item'){return kind==='item'&&g.state==='playing'&&g.cars[0].item!==null&&g.cars[0].itemCooldown===0;}
function useItem(g,c){if(g.state!=='playing'||!c.item||c.itemCooldown>0||c.finishTime!==null)return false;const l=levelOf(g),kind=c.item;c.item=null;c.itemCooldown=RULES.itemCooldown;if(kind==='boost')c.boost=Math.max(c.boost,RULES.itemBoost);if(kind==='shield')c.shield=RULES.itemShield;if(kind==='pulse'){for(const other of g.cars){if(other.id===c.id||other.finishTime!==null)continue;if(Math.hypot(circ(other.s,c.s,l.track.length),other.lateral-c.lateral)<=RULES.pulseRange&&other.shield<=0)other.slow=Math.max(other.slow,RULES.pulseSlow);}g.effects.push({kind:'pulse',x:c.x,y:c.y,life:.35});}if(c.id===0)g.stats.itemsUsed++;g.events.push({type:'item',car:c.id,kind});return true;}
export function action(g,kind='item'){return kind==='item'?useItem(g,g.cars[0]):false;}
function inputOf(input={}){return {steer:finite(input.steer)?clamp(input.steer,-1,1):0,throttle:finite(input.throttle)?clamp(input.throttle,0,1):1,brake:input.brake===true,drift:input.drift===true,item:input.item===true};}
// AI has no position setter or speed override. It submits exactly the same controls.
export function aiInput(g,c){const l=levelOf(g),look=pointAt(l,c.s+Math.max(12,c.speed*.25)),here=pointAt(l,c.s),lane=c.id===1?4:c.id===2?-9:13;const error=c.lateral-lane;const desiredYaw=here.curvature*c.speed- .045*error-2.5*c.headingError;const rate=RULES.steerRate*c.speed/(c.speed+28)*l.grip;const steer=clamp(desiredYaw/Math.max(.1,rate),-1,1),curve=Math.abs(look.curvature),safe=Math.min(100,Math.sqrt(115/(curve+.005)));return {steer,throttle:l.aiPace[c.id-1],brake:c.speed>safe,drift:Math.abs(steer)>.35&&Math.abs(steer)<.82&&c.speed>44,item:c.item==='boost'?curve<.012:c.item==='shield'?g.cars.some(o=>o.id!==c.id&&Math.abs(circ(o.s,c.s,l.track.length))<24):c.item==='pulse'?g.cars.some(o=>o.id!==c.id&&o.s>c.s&&o.s-c.s<48):false};}
// Assist is an explicit, ready-screen-only mode. It compensates curve yaw and
// damps heading error through ordinary steer input (75% curve compensation); never sets position, speed,
// braking, items or drift. No lateral centering: the player still chooses a lane.
export function assistedInput(g,c,input){
 if(!g.assist||c.id!==0)return input;
 const l=levelOf(g),p=pointAt(l,c.s),drifting=input.drift&&(Math.abs(p.curvature*c.speed)>.15||Math.abs(input.steer)>.15||c.drifting)&&c.speed>35&&!c.offroad;
 const rate=RULES.steerRate*c.speed/(c.speed+28)*l.grip*(drifting?1.16:1);
 const desiredYaw=.75*p.curvature*c.speed*Math.max(.16,Math.cos(c.headingError))+(input.steer*.42-c.headingError)*3;
 return {...input,steer:clamp(desiredYaw/Math.max(.1,rate),-1,1)};
}
// All displacement is integrated along the authored road. World projection cannot add lap progress.
export function integrateCar(g,c,dt,raw){const l=levelOf(g),input=assistedInput(g,c,inputOf(raw)),oldS=c.s;if(c.finishTime!==null)return oldS;
 for(const k of ['boost','shield','slow','itemCooldown','collisionCooldown','obstacleCooldown'])c[k]=Math.max(0,c[k]-dt);
 const p=pointAt(l,c.s),wasDrifting=c.drifting;c.drifting=input.drift&&(Math.abs(input.steer)>.15||wasDrifting)&&c.speed>35&&!c.offroad;
 if(c.drifting)c.driftCharge=Math.min(RULES.driftMaximum,c.driftCharge+dt);else if(wasDrifting){if(c.driftCharge>=RULES.driftMinimum){c.boost=Math.max(c.boost,RULES.driftBoost+Math.min(.42,c.driftCharge*.18));if(c.id===0)g.stats.driftBoosts++;g.events.push({type:'driftBoost',car:c.id});}c.driftCharge=0;}else c.driftCharge=0;
 const grass=Math.abs(c.lateral)>l.track.width/2-RULES.carRadius,cap=grass?44:c.slow>0?53:c.boost>0?RULES.boostSpeed:RULES.maxSpeed;
 const force=RULES.acceleration*input.throttle-RULES.drag-RULES.linearDrag*c.speed-(input.brake?RULES.brake:0)+(c.boost>0?47:0)-(grass?37:0);
 c.speed=clamp(c.speed+force*dt,0,cap);
 const rate=RULES.steerRate*c.speed/(c.speed+28)*l.grip*(c.drifting?1.16:1),forward=c.speed*Math.max(.16,Math.cos(c.headingError));
 c.headingError=clamp(c.headingError+(input.steer*rate-p.curvature*forward)*dt,-1.38,1.38);
 const wind=l.wind*Math.sin((c.s/l.track.length)*Math.PI*2+.4);
 c.lateral+=(Math.sin(c.headingError)*c.speed+wind)*dt;
 // A low-speed guardrail prevents unbounded excursions, without progress or direction teleportation.
 const edge=l.track.width/2+35;if(Math.abs(c.lateral)>edge){c.lateral=clamp(c.lateral,-edge,edge);c.speed=Math.min(c.speed,22);c.headingError*=.92;}
 c.s+=Math.max(0,c.speed*Math.cos(c.headingError))*dt;pose(c,l);
 if(c.id===0&&c.offroad)g.stats.offroadTime+=dt;return oldS;
}
function collide(g){const l=levelOf(g);for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=g.cars[i],b=g.cars[j];if(a.finishTime!==null||b.finishTime!==null)continue;const ds=circ(a.s,b.s,l.track.length),dy=a.lateral-b.lateral;if(Math.hypot(ds,dy)>=RULES.carRadius*2||a.collisionCooldown>0||b.collisionCooldown>0)continue;const faster=a.speed>b.speed?a:b,other=faster===a?b:a;if(faster.shield<=0)faster.speed*=.76;if(other.shield<=0)other.speed*=.9;const direction=dy===0?(i%2?1:-1):Math.sign(dy);if(a.shield<=0)a.headingError=clamp(a.headingError+direction*.11,-1.38,1.38);if(b.shield<=0)b.headingError=clamp(b.headingError-direction*.11,-1.38,1.38);a.collisionCooldown=b.collisionCooldown=.65;if(i===0||j===0)g.stats.collisions++;g.events.push({type:'collision',cars:[i,j]});}}
function scenery(g,c,oldS){const l=levelOf(g),s=c.s;for(const b of l.boxes){const live=g.boxes[b.id];if(c.item||g.time<live.readyAt)continue;const first=Math.floor(oldS/l.track.length);let crossed=false;for(let lap=first;lap<=Math.floor(s/l.track.length);lap++){const at=lap*l.track.length+b.s;if(oldS<=at&&s>=at&&Math.abs(c.lateral-b.lateral)<=RULES.boxRadius){crossed=true;break;}}if(crossed){c.item=b.kind;live.readyAt=g.time+RULES.boxCooldown;if(c.id===0)g.stats.pickups++;g.events.push({type:'pickup',car:c.id,kind:b.kind});}}
 if(c.obstacleCooldown>0)return;for(const o of l.obstacles)if(Math.hypot(circ(c.s,o.s,l.track.length),c.lateral-o.lateral)<o.r+RULES.carRadius){if(c.shield<=0){c.speed*=.5;c.headingError=clamp(c.headingError+(c.lateral>=o.lateral?.2:-.2),-1.38,1.38);if(c.id===0)g.stats.obstacleHits++;}c.obstacleCooldown=.8;g.events.push({type:'obstacle',car:c.id,blocked:c.shield>0});break;}}
function tick(g,input){const dt=FIXED_DT;g.ticks++;if(g.state==='countdown'){g.countdown=Math.max(0,g.countdown-dt);if(g.countdown<1e-8){g.countdown=0;g.state='playing';g.events.push({type:'go'});}return;}
 const l=levelOf(g),before=g.time;g.time=Math.min(l.timeLimit,g.time+dt);g.remaining=Math.max(0,l.timeLimit-g.time);const controls=g.cars.map(c=>c.id===0?input:inputOf(aiInput(g,c)));
 if(input.item&&!g.itemHeld)useItem(g,g.cars[0]);g.itemHeld=input.item;for(let i=1;i<4;i++)if(controls[i].item)useItem(g,g.cars[i]);
 const old=g.cars.map((c,i)=>integrateCar(g,c,dt,controls[i]));collide(g);
 for(let i=0;i<4;i++){const c=g.cars[i];if(c.finishTime!==null)continue;scenery(g,c,old[i]);pose(c,l);const finish=l.track.length*l.laps;if(c.s>=finish){const fraction=c.s>old[i]?(finish-old[i])/(c.s-old[i]):0;c.finishTime=before+dt*clamp(fraction,0,1);c.s=finish;c.speed=0;c.drifting=false;pose(c,l);g.events.push({type:'finish',car:c.id,time:c.finishTime});}}
 g.effects.forEach(e=>e.life-=dt);g.effects=g.effects.filter(e=>e.life>0);placeCars(g);
 const p=g.cars[0];if(p.finishTime!==null){const won=p.place<=l.targetPlace&&p.finishTime<=l.timeLimit;g.state=won?'won':'lost';g.result={place:p.place,time:p.finishTime,goal:l.targetPlace,won,assisted:g.assist===true};g.reason=won?'完成目标名次':'未达到目标名次';g.events.push({type:g.state});}else if(g.time>=l.timeLimit){g.state='lost';g.reason='比赛时间耗尽';g.result={place:p.place,time:g.time,goal:l.targetPlace,won:false,assisted:g.assist===true};g.events.push({type:'lost'});}}
export function step(g,dt,raw={}){if(!['countdown','playing'].includes(g.state)||!finite(dt)||dt<=0||dt>.25)return g;g.events=[];const input=inputOf(raw);g.accumulator+=dt;let steps=0;while(g.accumulator+1e-10>=FIXED_DT&&['countdown','playing'].includes(g.state)&&steps<16){g.accumulator=Math.max(0,g.accumulator-FIXED_DT);if(g.accumulator<1e-10)g.accumulator=0;tick(g,input);steps++;}return g;}
export const update=step;
export function snapshot(g){return freeze(clone(g));}
export function checkpoint(g){return freeze({version:1,game:'kart',state:clone(g)});}
const bounded=(n,a,b)=>finite(n)&&n>=a&&n<=b;
export function restore(payload){try{if(typeof payload==='string'){if(payload.length>30000)return null;payload=JSON.parse(payload);}if(!payload||payload.version!==1||payload.game!=='kart'||!payload.state)return null;const s=payload.state;if(!Number.isInteger(s.level)||s.level<1||s.level>8)return null;const l=LEVELS[s.level-1];if(!['ready','countdown','playing','paused','won','lost'].includes(s.state))return null;if(s.state==='paused'&&!['countdown','playing'].includes(s.pausedFrom))return null;if(s.state!=='paused'&&s.pausedFrom!==null)return null;
 if(!bounded(s.time,0,l.timeLimit)||!bounded(s.countdown,0,3)||!bounded(s.remaining,0,l.timeLimit)||Math.abs(s.remaining-(l.timeLimit-s.time))>1e-7||!bounded(s.accumulator,0,FIXED_DT+1e-7)||!Number.isInteger(s.ticks)||!bounded(s.ticks,0,100000)||typeof s.itemHeld!=='boolean')return null;
 if(!Array.isArray(s.cars)||s.cars.length!==4||!Array.isArray(s.boxes)||s.boxes.length!==l.boxes.length||!s.stats)return null;if(s.assist!==undefined&&typeof s.assist!=='boolean')return null;const fresh=createGame(s.level-1,{assist:s.assist===true});
 for(let i=0;i<4;i++){const c=s.cars[i];if(!c||c.id!==i||!bounded(c.s,-Math.floor(i/2)*19,l.track.length*l.laps)||!bounded(c.lateral,-l.track.width/2-35,l.track.width/2+35)||!bounded(c.speed,0,RULES.boostSpeed)||!bounded(c.headingError,-1.38,1.38)||![null,'boost','shield','pulse'].includes(c.item)||typeof c.drifting!=='boolean')return null;
  const ranges={boost:[0,1.3],shield:[0,2.8],slow:[0,1.1],itemCooldown:[0,.3],collisionCooldown:[0,.65],obstacleCooldown:[0,.8],driftCharge:[0,1.6]};for(const[k,[a,b]]of Object.entries(ranges))if(!bounded(c[k],a,b))return null;if(c.finishTime===null&&c.s>=l.track.length*l.laps)return null;if(c.finishTime!==null&&(!bounded(c.finishTime,0,s.time+1e-7)||Math.abs(c.s-l.track.length*l.laps)>1e-7||c.speed!==0))return null;
  Object.assign(fresh.cars[i],Object.fromEntries(['s','lateral','speed','headingError','finishTime','item','boost','shield','slow','itemCooldown','collisionCooldown','obstacleCooldown','driftCharge','drifting'].map(k=>[k,c[k]])));pose(fresh.cars[i],l);
 }
 for(let i=0;i<s.boxes.length;i++)if(s.boxes[i]?.id!==i||!bounded(s.boxes[i].readyAt,0,l.timeLimit+RULES.boxCooldown))return null;
 for(const k of Object.keys(fresh.stats))if(!bounded(s.stats[k],0,k==='offroadTime'?l.timeLimit:100000)||(k!=='offroadTime'&&!Number.isInteger(s.stats[k])))return null;
 const phase=s.state==='paused'?s.pausedFrom:s.state;if((phase==='ready'&&(s.countdown!==3||s.ticks!==0))||(phase==='countdown'&&s.countdown<=0)||(['playing','won','lost'].includes(phase)&&s.countdown!==0))return null;if(['ready','countdown'].includes(phase)&&(s.time!==0||s.cars.some((c,i)=>c.s!==-Math.floor(i/2)*19||c.speed!==0||c.item!==null)))return null;if(phase==='playing'&&s.cars[0].finishTime!==null)return null;if(phase==='won'&&(s.cars[0].finishTime===null))return null;
 Object.assign(fresh,{state:s.state,time:s.time,countdown:s.countdown,remaining:s.remaining,pausedFrom:s.pausedFrom,accumulator:s.accumulator,itemHeld:s.itemHeld,ticks:s.ticks,boxes:clone(s.boxes),stats:clone(s.stats)});placeCars(fresh);
 if(['won','lost'].includes(fresh.state)){const p=fresh.cars[0],won=p.finishTime!==null&&p.place<=l.targetPlace;if((fresh.state==='won')!==won)return null;fresh.result={place:p.place,time:p.finishTime??fresh.time,goal:l.targetPlace,won,assisted:fresh.assist};fresh.reason=won?'完成目标名次':p.finishTime!==null?'未达到目标名次':'比赛时间耗尽';if(!won&&p.finishTime===null&&fresh.time<l.timeLimit)return null;}
 if(['playing','countdown'].includes(fresh.state)){fresh.pausedFrom=fresh.state;fresh.state='paused';}fresh.events=[];fresh.effects=[];return fresh;
 }catch{return null;}}
