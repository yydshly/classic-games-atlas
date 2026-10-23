import assert from 'node:assert/strict';
import{FerryWorld,COURSE}from'../experiments/kinetic/physics.mjs';
export function steer(w,x,z){const p=w.player.position,v=w.player.velocity,dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);let vx=dx*2,vz=dz*2,n=Math.hypot(vx,vz);if(n>3){vx*=3/n;vz*=3/n;}return{x:(vx-v.x)*.35,z:(vz-v.z)*.35,brake:d<.12};}
export function go(w,x,z,dt=1/120,seconds=10){for(let n=0;n<seconds/dt;n++){if(w.completed)return true;const p=w.player.position;if(Math.hypot(x-p.x,z-p.z)<.16&&Math.hypot(w.player.velocity.x,w.player.velocity.z)<.25&&w.grounded)return true;w.step(steer(w,x,z),dt);}return false;}
function wait(w,test,seconds,input={brake:true},dt=1/120){for(let n=0;n<seconds/dt;n++){if(test())return true;w.step(input,dt);}return false;}
export function substitute(w,dt=1/120){
 assert.ok(go(w,-4.7,3.5,dt));assert.ok(go(w,-4.7,-1,dt));assert.ok(go(w,-3,-1,dt));
 assert.ok(wait(w,()=>w.snapshot().gateOpen,2,{brake:true},dt));assert.equal(w.plateBy,'player');const own=w.snapshot();
 assert.ok(go(w,-4.7,-1,dt));assert.ok(wait(w,()=>w.gateAmount===0,1,{brake:true},dt));const released=w.snapshot();
 assert.ok(go(w,-4.7,3.8,dt));assert.ok(go(w,-3,3.8,dt));
 assert.ok(wait(w,()=>w.player.position.z<.15,10,{z:-1,brake:true},dt));
 wait(w,()=>false,1,{brake:true},dt);assert.ok(go(w,-3,2.2,dt));
 assert.ok(wait(w,()=>w.stableCrateOnPlate,4,{brake:true},dt));assert.equal(w.plateBy,'crate');assert.ok(w.snapshot().gateOpen);const arranged=w.snapshot();
 wait(w,()=>false,6,{brake:true},dt);assert.equal(w.plateBy,'crate');assert.ok(w.stableCrateOnPlate);assert.ok(w.snapshot().gateOpen);
 return{own,released,arranged,settled:w.snapshot()};
}
export function ride(w,dt=1/120){
 assert.ok(go(w,0,-4,dt));
 assert.ok(wait(w,()=>w.snapshot().ferry.phase==='dwellNear'&&w.snapshot().ferry.dwellRemaining>4,26,{brake:true},dt));
 assert.ok(wait(w,()=>w.player.position.z< -8,6,{z:-1,brake:true},dt));assert.ok(w.onBoat);const boarded=w.snapshot();
 assert.ok(wait(w,()=>w.snapshot().ferry.phase==='dwellFar',14,{brake:true},dt));assert.ok(w.onBoat);const far=w.snapshot();
 assert.ok(wait(w,()=>w.dockStage==='arrival',6,{z:-1,brake:true},dt));const arrived=w.snapshot();
 assert.ok(go(w,0,-23.5,dt));assert.ok(w.completed);return{boarded,far,arrived,complete:w.snapshot()};
}
if(!process.argv.includes('--import-only')){
 const w=new FerryWorld();const setup=substitute(w),beforeFallCrate=[...w.snapshot().crate.position];
 assert.ok(go(w,0,-4));assert.ok(wait(w,()=>w.ferry.position.z< -13,26));const missAt=w.snapshot();
 assert.ok(wait(w,()=>w.falls===1,8,{z:-1}));assert.equal(w.dockStage,'near');assert.ok(w.stableCrateOnPlate);assert.equal(w.plateBy,'crate');const afterFall=w.snapshot(),fallEvent=w.drainEvents().findLast(e=>e.type==='fall');assert.equal(fallEvent.reason,'no-deck-at-departure');
 assert.ok(Math.abs(w.crate.position.z-beforeFallCrate[2])<.1);
 const travel=ride(w);assert.equal(w.jumps,0);
 const rush=new FerryWorld();assert.ok(go(rush,-4.7,3.5));assert.ok(go(rush,-4.7,-1));assert.ok(go(rush,-3,-1));assert.ok(wait(rush,()=>rush.gateAmount===1,2));
 for(let n=0;n<4*120;n++){const p=rush.player.position,dx=-p.x,dz=-8-p.z,length=Math.hypot(dx,dz);rush.step({x:dx/length,z:dz/length,jump:n===0},1/120);}assert.equal(rush.gateAmount,0);assert.ok(rush.player.position.z> -5.1);assert.equal(rush.onBoat,false);
 const safety=new FerryWorld();substitute(safety);assert.ok(go(safety,0,-5.5));assert.ok(safety.resetCrate().ok);wait(safety,()=>false,1);assert.equal(safety.plateBy,null);assert.equal(safety.gateState,'held');assert.equal(safety.gateAmount,1);assert.equal(safety.falls,0);assert.ok(go(safety,0,-3.5));assert.ok(wait(safety,()=>safety.gateAmount===0,1));assert.equal(safety.heldClosing,false);
 const lost=new FerryWorld();assert.ok(go(lost,-4.7,3.5));assert.ok(go(lost,-4.7,2));for(let k=0;k<35*120&&!lost.crateLost;k++)lost.step({x:1,z:Math.max(-1,Math.min(1,(lost.crate.position.z-lost.player.position.z)*4)),brake:true},1/120);assert.ok(lost.crateLost,JSON.stringify(lost.snapshot()));assert.equal(lost.plateBy,null);assert.equal(lost.gateAmount,0);assert.ok(lost.resetCrate().ok);wait(lost,()=>false,.8);assert.equal(lost.crateLost,false);assert.equal(lost.stableCrateOnPlate,false);assert.equal(lost.plateBy,null);assert.equal(lost.gateAmount,0);
 const jump=new FerryWorld();wait(jump,()=>false,1);let maxFeet=0;for(let k=0;k<240;k++){jump.step({jump:k===0,brake:true},1/120);maxFeet=Math.max(maxFeet,jump.player.position.y-COURSE.player.radius);}assert.ok(maxFeet<COURSE.gate.size[1]-.5);
 for(const x of[0,5,-5]){const fence=new FerryWorld();assert.ok(go(fence,x,-4));for(let k=0;k<5*120;k++)fence.step({z:-1,jump:k%180===0},1/120);assert.ok(fence.player.position.z> -5.1);assert.equal(fence.onBoat,false);assert.equal(fence.falls,0);}
 const stool=new FerryWorld();assert.ok(go(stool,-4.7,3.8));assert.ok(go(stool,-3,3.8));for(let k=0;k<16*120&&stool.crate.position.z> -4.58;k++)stool.step({z:-1,brake:true},1/120);for(let k=0;k<2.5*120;k++)stool.step({...steer(stool,-3,-4.5),jump:k===0},1/120);assert.ok(stool.grounded&&stool.player.position.y>1.5);assert.ok(wait(stool,()=>stool.snapshot().ferry.phase==='dwellNear'&&stool.snapshot().ferry.dwellRemaining>4,26));assert.equal(stool.gateAmount,0);assert.equal(stool.plateBy,null);let crossed=false,maxStoolFeet=0;for(let k=0;k<3*120&&!stool.onBoat;k++){stool.step({...steer(stool,-1,-8),jump:k===0},1/120);maxStoolFeet=Math.max(maxStoolFeet,stool.player.position.y-COURSE.player.radius);if(stool.player.position.z< -5.8)crossed=true;}assert.equal(crossed,true);assert.ok(stool.onBoat);assert.equal(stool.falls,0);assert.equal(stool.jumps,2);
 const overlap=new FerryWorld();substitute(overlap);assert.ok(go(overlap,-3,2.05));overlap.drainEvents();const beforeRejected=overlap.snapshot(),bodyCount=overlap.world.bodies.length;assert.deepEqual(overlap.resetCrate(),{ok:false,reason:'货箱原位被你占住了，请先挪开一点再归位。'});assert.deepEqual(overlap.snapshot(),beforeRejected);assert.equal(overlap.world.bodies.length,bodyCount);assert.deepEqual(overlap.drainEvents(),[]);assert.ok(go(overlap,-4.7,2.05));assert.ok(overlap.resetCrate().ok);assert.equal(overlap.crateResets,1);assert.deepEqual(overlap.snapshot().crate.position,COURSE.crate.position);
 const stableRecord=w.checkpointRecord(),restored=new FerryWorld(stableRecord);assert.equal(stableRecord.schema,2);assert.equal(stableRecord.crateStableOnPlate,true);assert.equal(restored.dockStage,'arrival');assert.ok(restored.completed);assert.deepEqual(restored.snapshot().player.position,COURSE.goal.position);assert.ok(restored.snapshot().gateOpen);
 const old=new FerryWorld({schema:1,checkpoint:2,gateOpen:true,completed:true});assert.equal(old.dockStage,'near');assert.equal(old.completed,false);assert.equal(old.gateAmount,0);assert.deepEqual(old.snapshot().player.position,COURSE.spawn);
 const safeNear=new FerryWorld({schema:2,dockStage:'near',crateStableOnPlate:true,completed:false,falls:1,jumps:0,player:{position:[999,999,999]},gateAmount:.5});assert.deepEqual(safeNear.snapshot().player.position,COURSE.spawn);assert.equal(safeNear.gateAmount,1);assert.deepEqual(safeNear.snapshot().crate.position,COURSE.crate.platePosition);
 const rates=[];for(const dt of[1/30,1/60,.1]){const frame=new FerryWorld();substitute(frame,dt);ride(frame,dt);assert.equal(frame.falls,0);assert.ok(frame.completed);rates.push({dt,time:frame.time,falls:frame.falls,completed:frame.completed});}
 console.log(JSON.stringify({passed:true,kind:'Legal-control real-Cannon model, not ordinary UI or human acceptance',setup:Object.fromEntries(Object.entries(setup).map(([k,s])=>[k,{time:s.time,plateBy:s.plateBy,gate:s.gate.openAmount,crate:s.crate.position,stable:s.stableCrateOnPlate}])),missedBoat:{time:missAt.time,boat:missAt.ferry.position,fall:afterFall.time,cratePreserved:afterFall.stableCrateOnPlate,event:fallEvent},travel:Object.fromEntries(Object.entries(travel).map(([k,s])=>[k,{time:s.time,player:s.player.position,ferry:s.ferry.position,onBoat:s.onBoat,dockStage:s.dockStage}])),rates,checks:{barrierHeight:COURSE.gate.size[1],maxJumpFeet:maxFeet,crateStoolAlternative:{boarded:stool.onBoat,time:stool.time,feetPeak:maxStoolFeet,gateClosed:stool.gateAmount===0,jumps:stool.jumps,falls:stool.falls},centreAndSideFenceCannotGroundJumpAcross:true,selfPlateRunJumpBlocked:true,overlappingResetRejectedWithoutMutation:true,moveAsideThenResetWorks:true,realSafetyHoldThenCloses:true,crateLostExplicitResetNoLatch:true,schema1Ignored:true,schema2OnlySafePositions:true,arrivalResponseBeforeCompletion:travel.arrived.time<travel.complete.time},final:{falls:w.falls,jumps:w.jumps,complete:w.completed}}));
}
