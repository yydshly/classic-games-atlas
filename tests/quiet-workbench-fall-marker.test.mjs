import assert from 'node:assert/strict';
import {QuietWorld} from '../experiments/quiet-workbench-preview/physics.mjs';
import {fallMarker} from '../experiments/quiet-workbench-preview/feedback.mjs';
const evidence=[];
for(const input of [{x:1,z:-.5},{x:-1}])for(const dt of [1/120,1/30,.1]){
 const w=new QuietWorld();
 for(let i=0;i<12/dt&&w.state==='playing';i++){
  w.step(input,dt);const s=w.snapshot();
  if(s.lastSupportPoint){const copy=s.lastSupportPoint;copy[0]=999;assert.notEqual(w.snapshot().lastSupportPoint[0],999);}
 }
 const s=w.snapshot();assert.equal(s.state,'fell');assert(s.fallPoint.every(Number.isFinite));
 assert.deepEqual(s.fallPoint,s.lastSupportPoint);assert(Math.abs(s.fallPoint[1])<.01,'actual supporting surface, not airborne robot');
 assert(s.player.position[1]<-3);assert(Math.hypot(s.player.position[0]-s.fallPoint[0],s.player.position[2]-s.fallPoint[2])>.1);
 const point=[...s.fallPoint];w.step({x:1},.1);assert.deepEqual(w.snapshot().fallPoint,point);
 assert.deepEqual(fallMarker(s),[point[0],point[1]+.045,point[2]]);
 const event=w.drainEvents().find(e=>e.type==='fell');assert.deepEqual(event.point,point);event.point[0]=999;s.fallPoint[0]=999;assert.deepEqual(w.snapshot().fallPoint,point);
 evidence.push({input,dt,point,material:s.fallFrom.material});w.retry();assert.equal(w.snapshot().fallPoint,null);assert.equal(w.snapshot().lastSupportPoint,null);assert.equal(fallMarker(w.snapshot()),null);
}
for(const state of ['playing','woke','charged'])assert.equal(fallMarker({state,fallPoint:[0,0,0]}),null);
for(const fallPoint of [null,[NaN,0,0],[0,0],[0,Infinity,0]])assert.equal(fallMarker({state:'fell',fallPoint}),null);
const noSupport=new QuietWorld();noSupport.player.position.set(20,-4,20);noSupport.step();assert.equal(noSupport.state,'fell');assert.equal(noSupport.snapshot().fallPoint,null);assert.equal(fallMarker(noSupport.snapshot()),null);
console.log(JSON.stringify({passed:true,evidence,scope:'real Cannon contact data; marker appearance still requires visual QA'}));
// A later real landing replaces the old point; brief unsupported motion never invents one.
const landing=new QuietWorld();for(let i=0;i<90;i++)landing.step();const first=landing.snapshot().lastSupportPoint;
landing.player.position.set(-4.9,1,1);landing.player.velocity.setZero();landing.step();assert.equal(landing.grounded,false);assert.deepEqual(landing.snapshot().lastSupportPoint,first);
for(let i=0;i<120&&!landing.grounded;i++)landing.step();assert(landing.grounded);assert.equal(landing.snapshot().lastSupport.material,'soft');assert(Math.abs(landing.snapshot().lastSupportPoint[0]+4.9)<.01);assert.notDeepEqual(landing.snapshot().lastSupportPoint,first);
