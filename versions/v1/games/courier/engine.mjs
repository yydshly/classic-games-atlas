import{LEVELS,STEP,JUMP_SECONDS,SLIDE_SECONDS,LOOKAHEAD}from'./levels.mjs';
const copy=x=>JSON.parse(JSON.stringify(x)),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createGame(index=0){const l=LEVELS[index];if(!l)throw Error('Unknown route');return{level:l.id,state:'ready',ticks:0,accumulator:0,distance:0,x:1,lane:1,action:null,actionTick:0,hp:3,cargo:0,score:0,hitRows:[],resolved:[],collected:[],log:[],reason:'',stats:{hits:0,jumps:0,slides:0,laneChanges:0,settlements:0}};}
export function pose(g){if(!g.action)return{kind:'run',height:0,age:0};const age=(g.ticks-g.actionTick)*STEP,duration=g.action==='jump'?JUMP_SECONDS:SLIDE_SECONDS,f=clamp(age/duration,0,1);return{kind:g.action,height:g.action==='jump'?4*f*(1-f):0,age};}
export function command(g,kind){if(kind==='start'){if(g.state!=='ready')return false;g.state='playing';return true;}if(g.state!=='playing')return false;
 if(kind==='left'||kind==='right'){const n=clamp(g.lane+(kind==='left'?-1:1),0,2);if(n===g.lane)return false;g.lane=n;g.stats.laneChanges++;}
 else if(kind==='jump'||kind==='slide'){if(g.action)return false;g.action=kind;g.actionTick=g.ticks;g.stats[kind==='jump'?'jumps':'slides']++;}
 else return false;g.log.push({tick:g.ticks,kind});return true;
}
function settle(g,state,reason){if(g.state!=='playing')return;g.state=state;g.reason=reason;g.accumulator=0;g.stats.settlements++;}
function tick(g){if(g.state!=='playing')return;const l=LEVELS[g.level-1],previous=g.distance;g.ticks++;g.distance=Math.min(l.length,g.ticks*STEP*l.speed);g.x+=clamp(g.lane-g.x,-10*STEP,10*STEP);if(Math.abs(g.lane-g.x)<1e-9)g.x=g.lane;
 if(g.action&&(g.ticks-g.actionTick)*STEP>=(g.action==='jump'?JUMP_SECONDS:SLIDE_SECONDS)-1e-9)g.action=null;
 const p=pose(g);for(const row of l.rows){if(previous>row.d+.6||g.distance<row.d-.6)continue;
  if(!g.hitRows.includes(row.id)){const inLane=row.lanes.length===3||row.lanes.some(x=>Math.abs(x-g.x)<.53),clear=row.kind==='jump'?p.kind==='jump'&&p.height>=.62:row.kind==='slide'?p.kind==='slide'&&p.age>=.07&&p.age<=SLIDE_SECONDS-.05:false;
   if(inLane&&!clear){g.hitRows.push(row.id);g.hp--;g.stats.hits++;if(!g.hp){settle(g,'lost','体力用完了。路牌会提前出现，读清形状，再换道、跳跃或滑行。');return;}}
  }
  if(previous<row.d+.6&&g.distance>=row.d+.6&&!g.resolved.includes(row.id)){g.resolved.push(row.id);if(!g.hitRows.includes(row.id))for(const parcel of row.parcels)if(Math.abs(parcel.lane-g.x)<=.44&&!g.collected.includes(parcel.id)){g.collected.push(parcel.id);g.cargo++;g.score+=parcel.value;}}
 }
 if(g.distance>=l.length)settle(g,g.cargo>=l.goal?'won':'lost',g.cargo>=l.goal?'信件已送达。':'到达了终点，但信件不足。留意空道上的信封，岔路可以选一边。');
}
export function advanceTicks(g,count){if(!Number.isInteger(count)||count<0||count>20000)throw Error('Invalid ticks');for(let i=0;i<count&&g.state==='playing';i++)tick(g);}
export function advance(g,delta){if(g.state!=='playing'||!Number.isFinite(delta)||delta<=0)return;g.accumulator+=Math.min(.1,delta);while(g.accumulator>=STEP-1e-10&&g.state==='playing'){g.accumulator-=STEP;tick(g);}if(g.accumulator<0)g.accumulator=0;}
export function pause(g){if(!['playing','paused'].includes(g.state))return false;g.state=g.state==='playing'?'paused':'playing';g.accumulator=0;return true;}
export function checkpoint(g){return['playing','paused'].includes(g.state)?{version:1,level:g.level,ticks:g.ticks,commands:copy(g.log)}:null;}
export function restore(cp){try{if(!cp||cp.version!==1||!Number.isInteger(cp.level)||!LEVELS[cp.level-1]||!Number.isInteger(cp.ticks)||cp.ticks<0||cp.ticks>18000||!Array.isArray(cp.commands)||cp.commands.length>1500)return null;const g=createGame(cp.level-1);command(g,'start');let last=-1;for(const c of cp.commands){if(!c||!Number.isInteger(c.tick)||c.tick<last||c.tick>cp.ticks||!['left','right','jump','slide'].includes(c.kind))return null;advanceTicks(g,c.tick-g.ticks);if(!command(g,c.kind))return null;last=c.tick;}advanceTicks(g,cp.ticks-g.ticks);if(g.state!=='playing')return null;g.state='paused';g.accumulator=0;return g;}catch{return null;}}
export function snapshot(g){const l=LEVELS[g.level-1];return{...copy(g),time:g.ticks*STEP,speed:l.speed,length:l.length,goal:l.goal,pose:pose(g),upcoming:copy(l.rows.filter(r=>r.d+.6>=g.distance&&r.d-g.distance<=LOOKAHEAD).map(r=>({...r,eta:(r.d-g.distance)/l.speed,hit:g.hitRows.includes(r.id)})))};}
