import assert from 'node:assert/strict';
import {KineticWorld,COURSE} from '../experiments/kinetic/physics.mjs';
import {ferryDeparture,dockFeedback} from '../experiments/kinetic/feedback.mjs';

for(const [phase,early,late] of [['dwellNear','靠岸停留','即将离岸'],['dwellFar','对岸停靠','即将返航']]){
 for(const remaining of [undefined,NaN,Infinity,-1,0,2.01,6]){
  assert.deepEqual(ferryDeparture({phase,dwellRemaining:remaining}),{leavingSoon:false,label:early});
 }
 for(const remaining of [.001,1,2]){
  assert.deepEqual(ferryDeparture({phase,dwellRemaining:remaining}),{leavingSoon:true,label:late});
 }
}
for(const [phase,label] of [['outbound','驶向对岸'],['inbound','正在返航'],['unknown','渡台正在往返']]){
 assert.deepEqual(ferryDeparture({phase,dwellRemaining:1}),{leavingSoon:false,label});
}
assert.deepEqual(ferryDeparture({}),{leavingSoon:false,label:'渡台正在往返'});

const near={player:{position:[0,.45,-4]},completed:false,onBoat:false,grounded:true,plateBy:'crate',dockStage:'near',ferry:{phase:'dwellNear',dwellRemaining:1},gate:{heldClosing:false}};
const nearFeedback=dockFeedback(near,COURSE);
assert.equal(nearFeedback.context,'near');
assert.match(nearFeedback.objective+' '+nearFeedback.message,/启航|离岸/);
assert.match(nearFeedback.objective+' '+nearFeedback.message,/下一趟/);
const aboard={...near,onBoat:true,player:{position:[0,.45,-8]}};
assert.match(dockFeedback(aboard,COURSE).message,/制动/);
const far={...aboard,player:{position:[0,.45,-18]},ferry:{phase:'dwellFar',dwellRemaining:1}};
assert.match(dockFeedback(far,COURSE).objective+' '+dockFeedback(far,COURSE).message,/返航/);
const landed={...far,onBoat:false,dockStage:'arrival',player:{position:[0,.45,-20.6]}};
assert.equal(dockFeedback(landed,COURSE).context,'arrival');
assert.match(dockFeedback(landed,COURSE).objective,/已经上岸/);
assert.doesNotMatch(dockFeedback(landed,COURSE).message,/返航/);

// Step the actual world, never inject time/poses. Feedback must consume the
// frozen physics snapshot rather than advancing a separate display clock.
const world=new KineticWorld();
while(world.snapshot().time<4.2)world.step({brake:true},1/120);
const frozen=world.snapshot(),before=ferryDeparture(frozen.ferry);
assert.equal(before.leavingSoon,true);
for(let i=0;i<100;i++)assert.deepEqual(ferryDeparture(world.snapshot().ferry),before);
assert.deepEqual(world.snapshot(),frozen);
while(world.snapshot().time<6.2)world.step({brake:true},1/120);
assert.deepEqual(ferryDeparture(world.snapshot().ferry),{leavingSoon:false,label:'驶向对岸'});
while(world.snapshot().time<16.2)world.step({brake:true},1/120);
assert.deepEqual(ferryDeparture(world.snapshot().ferry),{leavingSoon:true,label:'即将返航'});
while(world.snapshot().time<18.2)world.step({brake:true},1/120);
assert.deepEqual(ferryDeparture(world.snapshot().ferry),{leavingSoon:false,label:'正在返航'});

console.log(JSON.stringify({passed:true,scope:'departure threshold and invalid values; phase labels; near, aboard and landed guidance; real-world frozen snapshot and both departure transitions'}));
