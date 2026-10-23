import{createGame,start,update,snapshot,aiInput,resetCar}from'../../versions/v4/games/post/engine.mjs';
import{THIRD_ROUTE_ID,THIRD_TRACK,project}from'../../versions/v4/games/post/tracks.mjs';
import{decide}from'./policy.mjs';
export function run({strategy='center',interval=.05,stage=0,params={},aiPlayer=false,limit=95}={}){
 const g=createGame(stage,THIRD_ROUTE_ID);start(g);let elapsed=0,next=0,input={},index=0,gas=0,brake=0,steer=0,lateral=0,latMax=0,decisionCount=0;const trace=[],seen=new WeakSet(),events=[];
 while(g.state!=='finished'&&g.time<limit&&elapsed<limit+4){
  if(elapsed+1e-9>=next){input=aiPlayer?aiInput(g,g.cars[0]):decide(snapshot(g),{strategy,params});next+=Array.isArray(interval)?interval[index++%interval.length]:interval;decisionCount++;}
  const old=g.time;update(g,1/120,input);elapsed+=1/120;
  if(g.time>old){gas+=input.gas/120;brake+=input.brake/120;steer+=Math.abs(input.steer)/120;const q=project(THIRD_TRACK,g.cars[0]),lat=(g.cars[0].x-q.x)*(-q.ty)+(g.cars[0].y-q.y)*q.tx;lateral+=Math.abs(lat)/120;latMax=Math.max(latMax,Math.abs(lat));}
  for(const e of g.events)if(!seen.has(e)){seen.add(e);const c=g.cars[0],q=project(THIRD_TRACK,c);events.push({at:+g.time.toFixed(3),...e,...(e.id==='player'?{position:{x:+c.x.toFixed(2),y:+c.y.toFixed(2)},speed:+c.speed.toFixed(2),lateral:+((c.x-q.x)*(-q.ty)+(c.y-q.y)*q.tx).toFixed(2)}:{})});}
  if(trace.length===0||g.time-trace.at(-1).time>=1)trace.push({time:+g.time.toFixed(3),x:+g.cars[0].x.toFixed(1),y:+g.cars[0].y.toFixed(1),speed:+g.cars[0].speed.toFixed(1),next:g.cars[0].nextGate,lap:g.cars[0].lap,desired:input.desired,lane:input.lane});
 }
 return{strategy,interval,stage,state:g.state,time:+g.time.toFixed(3),finished:g.cars[0].finishedAt,rank:g.result?.rank,gates:g.cars[0].stats.gates,resets:g.cars[0].stats.resets,offroadSeconds:+g.cars[0].stats.offroadSeconds.toFixed(3),brakeSeconds:+brake.toFixed(3),gasSeconds:+gas.toFixed(3),steerSeconds:+steer.toFixed(3),meanAbsLateral:+(lateral/g.time).toFixed(3),maxAbsLateral:+latMax.toFixed(3),contacts:g.stats.contacts,decisionCount,rivals:g.cars.slice(1).map(c=>({id:c.id,finished:c.finishedAt,gates:c.stats.gates,resets:c.stats.resets,offroadSeconds:c.stats.offroadSeconds})),events,trace};
}
if(process.argv[1]?.replaceAll('\\','/').split('/').at(-1)==='probe.mjs')for(const strategy of['center','late']){const r=run({strategy});console.log(JSON.stringify({...r,events:undefined,trace:undefined}));}
