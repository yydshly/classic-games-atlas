import assert from 'node:assert/strict';
import {QuietWorld} from '../experiments/quiet-workbench/physics.mjs';
import {feedback} from '../experiments/quiet-workbench/feedback.mjs';
function run(w,input,until,dt=1/120){for(let i=0;i<12/dt&&w.state==='playing';i++){if(until(w))return;w.step(input,dt);}assert(until(w),JSON.stringify(w.snapshot()));}
const evidence=[];
for(const dt of [1/120,1/30,.1]){
 const w=new QuietWorld();run(w,{x:1,z:-.5},w=>w.state==='fell',dt);
 const metal=w.snapshot();assert.equal(metal.lastImpact,null);assert.deepEqual(metal.fallFrom,{id:'metal-table',material:'metal'});assert.match(feedback(metal).title,/金属/);assert.doesNotMatch(feedback(metal).message,/软垫/);
 const event=w.drainEvents().find(e=>e.type==='fell');assert.deepEqual(event.from,metal.fallFrom);
 // Diagnostics and events cannot rewrite the remembered attribution.
 metal.fallFrom.material='soft';event.from.material='soft';assert.equal(w.snapshot().fallFrom.material,'metal');
 w.retry();assert.equal(w.snapshot().fallFrom,null);assert.equal(w.snapshot().lastSupport,null);
 run(w,{x:-1},w=>w.player.position.x< -4.65,dt);run(w,{z:-1},w=>w.state==='fell',dt);
 const soft=w.snapshot();assert.equal(soft.fallFrom.material,'soft');assert.match(feedback(soft).title,/软垫/);assert.match(feedback(soft).message,/横向速度/);
 w.retry();run(w,{x:1,z:-.5},w=>w.state==='fell',dt);assert.equal(w.snapshot().fallFrom.material,'metal');
 evidence.push({dt,metal:'metal-table',soft:soft.fallFrom.id,retryChangedAttribution:true});
}
const unknown=feedback({state:'fell'});assert.doesNotMatch(unknown.message,/软垫|金属/);assert.match(unknown.message,/提前制动/);
console.log(JSON.stringify({passed:true,kind:'legal-control real-Cannon falls; not visual/player acceptance',evidence,unknownSource:'neutral',defensiveCopies:true}));
