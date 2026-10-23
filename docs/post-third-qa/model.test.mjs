import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{createHash}from'node:crypto';
import*as old from'../../versions/v3/games/post/engine.mjs';
import{TRACKS as OLD_TRACKS}from'../../versions/v3/games/post/tracks.mjs';
import*as model from'../../versions/v4/games/post/engine.mjs';
import{TRACKS,THIRD_TRACK as t,THIRD_DEFINITION,THIRD_ROUTE_ID,atArc,gates,project}from'../../versions/v4/games/post/tracks.mjs';
import{decide}from'./policy.mjs';
import{run}from'./probe.mjs';
const url=name=>new URL(['engine.mjs','tracks.mjs'].includes(name)?'../../versions/v4/games/post/'+name:name,import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex'),round=n=>+n.toFixed(3);
const oldSource=await readFile(url('../../versions/v3/games/post/engine.mjs'));
const newSource=await readFile(url('engine.mjs'));
assert.ok(oldSource.equals(Buffer.from(newSource.toString().replace('?v=post-v4-r1','?v=post-v3-r1'))));
assert.deepEqual(TRACKS.slice(0,2),OLD_TRACKS);assert.deepEqual(model.PHYSICS,old.PHYSICS);
assert.equal(t.id,10);assert.equal(t.routeId,THIRD_ROUTE_ID);assert.equal(t.laps,2);assert.equal(t.limit,95);assert.equal(t.halfWidth,43);
assert.equal(t.gateCount,14);assert.equal(t.gateArcs[0],0);
assert.ok(t.gateArcs.every((n,i)=>Number.isFinite(n)&&n>=0&&n<t.length&&(!i||n>t.gateArcs[i-1])));
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
let intersections=0;
for(let i=0;i<t.segments.length;i++)for(let j=i+2;j<t.segments.length;j++){
 if(i===0&&j===t.segments.length-1)continue;
 const a=t.segments[i],b=t.segments[j];
 if(cross(a.a,a.b,b.a)*cross(a.a,a.b,b.b)<0&&cross(b.a,b.b,a.a)*cross(b.a,b.b,a.b)<0)intersections++;
}
assert.equal(intersections,0);
const samples=Array.from({length:Math.ceil(t.length/4)},(_,i)=>atArc(t,i*4));let clearance=Infinity;
for(let i=0;i<samples.length;i++)for(let j=i+1;j<samples.length;j++){
 const gap=Math.min(Math.abs(samples[i].arc-samples[j].arc),t.length-Math.abs(samples[i].arc-samples[j].arc));
 if(gap>=260)clearance=Math.min(clearance,Math.hypot(samples[i].x-samples[j].x,samples[i].y-samples[j].y));
}
assert.ok(clearance>t.halfWidth*2+13,'sampled nonlocal road borders remain separate');
const geometry={length:round(t.length),gateCount:t.gateCount,width:t.halfWidth*2,centerlineIntersections:intersections,sampledNonlocalClearance:round(clearance),clearanceStep:4,minComparedArcGap:260,authorVertices:THIRD_DEFINITION[5],gateArcs:t.gateArcs.map(round)};
const replays=[];
for(const route of OLD_TRACKS){
 const a=old.createGame(1,route.routeId),b=model.createGame(1,route.routeId);old.start(a);model.start(b);
 for(let frame=0;frame<2400;frame++){
  const input={gas:frame%91<70?1:0,brake:frame%91>85?1:0,steer:[0,-1,0,1][Math.floor(frame/47)%4]};
  old.update(a,1/120,input);model.update(b,1/120,input);assert.deepEqual(b,a,`${route.routeId} frame ${frame}`);
 }
 replays.push({routeId:route.routeId,frames:2400,fullStateSHA256:hash(JSON.stringify(a))});
}
const freeze=x=>{Object.freeze(x);for(const v of Object.values(x))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);return x;};
const snap=freeze(model.snapshot(model.createGame(2,THIRD_ROUTE_ID))),snapBefore=JSON.stringify(snap);
for(const strategy of ['center','late','idle','reckless']){const a=decide(snap,{strategy});assert.ok([-1,0,1].includes(a.steer));assert.ok([0,1].includes(a.gas));assert.ok([0,1].includes(a.brake));}assert.equal(JSON.stringify(snap),snapBefore);
const compact=({trace,events,...rest})=>rest;
const matrix=[],traces=[];
for(const strategy of ['center','late'])for(const interval of [.05,.1,.2,[.033,.067,.05,.1]]){
 const r=run({strategy,interval,stage:2});assert.equal(r.state,'finished');assert.notEqual(r.finished,null);assert.equal(r.gates,28);assert.equal(r.resets,0);
 matrix.push(compact(r));if(interval===.05)traces.push({strategy,trace:r.trace,playerEvents:r.events.filter(x=>x.id==='player')});
}
const rivalFeasibility=[];
for(const stage of [0,1,2]){
 const g=model.createGame(stage,THIRD_ROUTE_ID);model.start(g);let wall=0;
 while(g.state!=='finished'&&g.cars.slice(1).some(c=>c.finishedAt===null)&&wall<99){model.update(g,1/120,{});wall+=1/120;}
 for(const c of g.cars.slice(1)){assert.notEqual(c.finishedAt,null);assert.equal(c.stats.gates,28);assert.equal(c.stats.resets,0);}
 rivalFeasibility.push({stage,observedTime:round(g.time),rivals:g.cars.slice(1).map(c=>({id:c.id,time:round(c.finishedAt),gates:c.stats.gates,resets:c.stats.resets,offroadSeconds:round(c.stats.offroadSeconds)}))});
}
const playing=()=>{const g=model.createGame(2,THIRD_ROUTE_ID);model.start(g);while(g.state!=='playing')model.update(g,1/120,{});return g;};
function placeFixture(g,arc,{speed=90,reverse=false}={}){const p=atArc(t,arc);Object.assign(g.car,{x:p.x,y:p.y,angle:Math.atan2(p.ty,p.tx)+(reverse?Math.PI:0),speed,previousArc:p.arc});}
const skipped=playing();placeFixture(skipped,t.gateArcs[4]+5);for(let i=0;i<24;i++)model.update(skipped,1/120,{gas:1});assert.equal(skipped.car.stats.gates,0);assert.equal(skipped.car.nextGate,1);assert.equal(skipped.car.lap,1);assert.ok(model.progress(skipped.car,t)<1);
placeFixture(skipped,t.length-.5);model.update(skipped,1/120,{gas:1});assert.equal(skipped.car.stats.gates,0);assert.equal(skipped.car.finishedAt,null);
const reversed=playing();placeFixture(reversed,t.gateArcs[1]+.5,{reverse:true});for(let i=0;i<6;i++)model.update(reversed,1/120,{});assert.equal(reversed.car.stats.gates,0);assert.equal(reversed.car.nextGate,1);assert.ok(reversed.car.wrongWay);
const manual=playing();placeFixture(manual,t.gateArcs[4]+8);assert.ok(model.resetCar(manual,'manual'));assert.equal(manual.car.lock,3);assert.equal(manual.car.speed,0);const resetPosition={x:manual.car.x,y:manual.car.y};assert.equal(model.resetCar(manual,'manual'),false);
for(let i=0;i<240;i++)model.update(manual,1/120,{gas:1,steer:1});assert.deepEqual({x:manual.car.x,y:manual.car.y},resetPosition);assert.ok(manual.car.lock>.99&&manual.car.lock<1.01);
const saved=model.checkpoint(manual),restored=model.restore(saved);assert.ok(restored);assert.equal(restored.state,'paused');assert.deepEqual(model.checkpoint(restored),saved);assert.equal(restored.version,3);
model.pause(restored);for(let i=0;i<140;i++)model.update(restored,1/120,{gas:1});assert.equal(restored.car.lock,0);assert.ok(restored.car.speed>0);assert.equal(restored.car.stats.resets,1);assert.equal(restored.car.stats.gates,0);
for(const mutate of [x=>x.routeId='missing-route',x=>x.cars[0].speed=NaN,x=>x.cars[0].nextGate=99,x=>x.level=1]){const bad=structuredClone(saved);mutate(bad);assert.equal(model.restore(bad),null);}assert.equal(old.restore(saved),null,'Old engine does not reinterpret a new-route checkpoint');
const mistakes=[];
for(const strategy of ['reckless','idle']){const r=run({strategy,stage:2});if(strategy==='idle'){assert.equal(r.time,95);assert.equal(r.finished,null);assert.equal(r.gates,0);}mistakes.push({...compact(r),resetEvents:r.events.filter(x=>x.type==='reset')});}
const hashes={};for(const name of ['engine.mjs','tracks.mjs','policy.mjs'])hashes[name]=hash(await readFile(url(name)));
const proof={scope:'Deterministic model/declared geometry and position fixtures only. Not browser, physical-device, human enjoyment or first-place acceptance.',hashes,unchanged:{engineOnlyImportQueryChanged:true,physics:model.PHYSICS,oldTrackSHA256:OLD_TRACKS.map(x=>hash(JSON.stringify(x))),oldReplays:replays},geometry,matrix,traces,rivalFeasibility,fixtures:{kind:'Explicit copied-position fixtures, not naturally driven or UI evidence',missedGateNoCredit:true,reverseGateNoCredit:true,manualResetPenalty:3,repeatedResetWhileLockedRejected:true,noMotionDuringLock:true,checkpointVersion:3,restoresPausedExact:true,invalidCheckpointRejected:true,oldEngineRejectsNewRoute:true},mistakes,limits:['Default original physics, no geometry/AI/stat mutation in driven runs.','Decisions held at listed intervals; time advances through real1/120s substeps, never one capped update per large interval.','Both strategies legally complete; ranks vary with traffic and are observations, not a first-place guarantee.','Full-throttle no-brake can still legally finish; it loses time to this observed traffic/line rather than proving braking is mandatory.','Road clearance is a4-unit sampled centerline diagnostic with260 minimum arc gap, not exhaustive swept-area proof.','Human feel, aesthetics, touch-device performance and UI journey remain root verification.']};
await writeFile(url('proof.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({passed:true,legacyReplays:2,drivenFinishes:matrix.length,rivalStages:3,fixtures:proof.fixtures,hashes,geometry}));
