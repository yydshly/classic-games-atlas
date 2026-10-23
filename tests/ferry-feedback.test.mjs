import assert from 'node:assert/strict';
import {COURSE} from '../experiments/kinetic/physics.mjs';
import {dockFeedback} from '../experiments/kinetic/feedback.mjs';
const s={player:{position:[0,.45,3]},completed:false,onBoat:false,grounded:true,plateBy:'crate',dockStage:'near',ferry:{phase:'dwellNear'},gate:{heldClosing:false}};
assert.equal(dockFeedback(s,COURSE).context,'near');
const onBoat={...s,onBoat:true,player:{position:[0,.45,-18]},ferry:{phase:'dwellFar'}};
assert.equal(dockFeedback(onBoat,COURSE).context,'ferry');
assert.ok(!dockFeedback(onBoat,COURSE).message.includes('回岸边等'));
for(const by of ['crate','player',null]){
 const landed={...s,plateBy:by,dockStage:'arrival',player:{position:[0,.45,-20.6]}};
 const d=dockFeedback(landed,COURSE);assert.equal(d.context,'arrival');assert.ok(d.objective.includes('已经上岸'));assert.ok(!d.message.includes('来接你'));assert.ok(!d.message.includes('回岸边'));
}
// A previous arrival flag must not override a current return boat or near-shore respawn.
assert.equal(dockFeedback({...s,dockStage:'arrival'},COURSE).context,'near');
assert.equal(dockFeedback({...onBoat,dockStage:'arrival',ferry:{phase:'inbound'}},COURSE).context,'ferry');
assert.equal(dockFeedback({...s,player:{position:[0,-3,-15]},dockStage:'arrival'},COURSE).context,'air');
assert.equal(dockFeedback({...onBoat,completed:true},COURSE).context,'complete');
assert.equal(dockFeedback({...s,gate:{heldClosing:true}},COURSE).context,'near');
console.log(JSON.stringify({passed:true,scope:'arriving aboard, stepping ashore before terminal, unrelated plate state, current near-shore respawn vs prior arrival, return boat, airborne, terminal'}));
