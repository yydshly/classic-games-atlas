import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {baselineSource} from '../docs/quiet-gentle-home-qa/baseline-source.mjs';
import vm from 'node:vm';
import * as T from '../experiments/kinetic/vendor/three.module.min.js';
import {QuietWorld,ROOM} from '../experiments/quiet-workbench-preview/physics.mjs';
import {QuietPresentation,dockState} from '../experiments/quiet-workbench-preview/presentation.mjs';
import {buildWorkshop} from '../experiments/quiet-workbench-preview/scene.mjs';
import {feedback} from '../experiments/quiet-workbench-preview/feedback.mjs';
const checks=[];
const before=baselineSource('7e58eb5778e13534147f712f3da593130224625a','physics.mjs');
assert.equal(readFileSync(new URL('../experiments/quiet-workbench-preview/physics.mjs',import.meta.url),'utf8'),before);
checks.push('physics, ROOM and every collision/threshold byte-identical to published preview');
function go(w,x,z,speed=1.6,dt=1/120){for(let i=0;i<30/dt&&w.state==='playing';i++){const p=w.player.position,v=w.player.velocity,dx=x-p.x,dz=z-p.z,n=Math.hypot(dx,dz);if(n<.08&&Math.hypot(v.x,v.z)<.2)return;const f=Math.min(speed,n*2);w.step({x:((n?dx/n*f:0)-v.x)*1.2,z:((n?dz/n*f:0)-v.z)*1.2,brake:n<.12},dt);}}
const routes=[];
for(const dt of [1/120,1/30,.1])for(const [name,route]of [['metal',[[-1.95,2.5],[-1.95,.55],[-.3,.55],[-.3,-3.65],[0,-3.65]]],['soft',[[-4.9,3.7],[-4.9,-3.6],[0,-3.65]]]]){
 const w=new QuietWorld();for(const p of route)go(w,...p,1.6,dt);assert.equal(w.state,'charged');routes.push({name,dt,time:w.time,noise:w.noise});
}
checks.push('both unchanged routes finish under legal control at three frame intervals');
const workshop=buildWorkshop(ROOM),w=new QuietWorld(),motion=new QuietPresentation();
for(let i=0;i<30;i++)w.step({x:-.4,brake:true});
let s=w.snapshot(),pose=motion.update(s,.1,{brake:true});const raw=JSON.stringify(s);workshop.pose(s,pose);
assert.equal(JSON.stringify(s),raw);assert.deepEqual(workshop.rig.shell.quaternion.toArray(),s.player.quaternion);
assert.notDeepEqual(workshop.rig.face.quaternion.toArray(),s.player.quaternion);assert(Math.abs(workshop.rig.face.rotation.z)<1e-12);
assert.equal(workshop.rig.face.parent,workshop.rig.robot);assert.notEqual(workshop.rig.face.parent,workshop.rig.shell);
for(const surface of ROOM.surfaces){const mesh=workshop.rig.supports.find(o=>o.name==='support:'+surface.id);assert.deepEqual(mesh.position.toArray(),surface.position);assert.deepEqual(mesh.scale.toArray(),surface.size);}
for(const tool of ROOM.tools){const entry=workshop.rig.tools.get(tool.id);assert.deepEqual(entry.group.position.toArray(),tool.position);assert.deepEqual(entry.group.getObjectByName('collider-body').scale.toArray(),tool.size);}
checks.push('real quaternion drives shell only; face self-levelled; support and all six tool bodies match physical bounds');
for(const [width,height]of [[1280,800],[390,700],[320,600]]){
 workshop.fit(width,height);workshop.scene.updateMatrixWorld(true);workshop.camera.updateMatrixWorld(true);
 for(const surface of ROOM.surfaces)for(const signX of [-1,1])for(const signZ of [-1,1]){
  const v=new T.Vector3(surface.position[0]+signX*surface.size[0]/2,0,surface.position[2]+signZ*surface.size[2]/2).project(workshop.camera);
  assert(Math.abs(v.x)<1&&Math.abs(v.y)<1,`${width}: support within camera bounds`);
 }
}
checks.push('camera projection retains real support at 1280, 390 and 320 widths (geometry only, not layout acceptance)');
const fast=new QuietWorld();for(const p of [[-1.95,2.5],[-1.95,.55],[-.3,.55]])go(fast,...p);
for(let i=0;i<2400&&fast.state==='playing';i++){fast.step({z:-1});if(Math.hypot(fast.player.position.x,fast.player.position.z+3.65)<.65)break;}
s=fast.snapshot();assert.equal(s.state,'playing');assert.equal(dockState(s),'too-fast');assert.match(feedback(s).message,/尚未接通/);
pose=motion.update(s,.1);workshop.pose(s,pose);assert(workshop.rig.fastMark.visible);assert(workshop.rig.connectedContacts.every(o=>!o.visible));
// Even an artificially located slow snapshot cannot light contacts without charged.
const fixture={...s,player:{...s.player,position:[0,.34,-3.65],velocity:[0,0,0]}};workshop.pose(fixture,motion.update(fixture,.1));assert(workshop.rig.connectedContacts.every(o=>!o.visible));
const success=new QuietWorld();for(const p of [[-1.95,2.5],[-1.95,.55],[-.3,.55],[-.3,-3.65],[0,-3.65]])go(success,...p);
s=success.snapshot();pose=motion.update(s,.1);pose=motion.update(s,.1);workshop.pose(s,pose);assert(workshop.rig.connectedContacts.every(o=>o.visible));assert.notEqual(workshop.rig.face.rotation.x,0);assert.equal(dockState(s),'connected');
checks.push('legal too-fast approach remains unconnected; only charged connects contacts and triggers settling nod');
const impact=new QuietWorld();for(let i=0;i<2400&&!impact.lastImpact;i++)impact.step({z:-1,brake:true});
s=impact.snapshot();const pm=new QuietPresentation();const first=pm.update(s,.01);workshop.pose(s,first);assert(workshop.rig.face.rotation.x<0);assert(workshop.rig.eyes.every(o=>o.scale.y<.046));for(let i=0;i<10;i++)pose=pm.update(s,.1);assert(pose.impact<first.impact*.001);
pm.update(s,.1,{brake:true});const frozen=JSON.stringify(pm.update(s,0,{paused:true}));assert.equal(JSON.stringify(pm.update(s,.1,{paused:true,brake:false})),frozen);
impact.retry();pose=pm.update(impact.snapshot(),.01);assert(pose.impact<1e-8);assert.equal(pose.impactTool,null);assert.equal(pose.connected,false);
const awake=new QuietWorld();for(let i=0;i<2400&&awake.state==='playing';i++)awake.step({z:-1});assert.equal(awake.state,'woke');
const shoulder=workshop.rig.forearm.position.toArray();
const am=new QuietPresentation();am.update(awake.snapshot(),0);for(let i=0;i<7;i++)pose=am.update(awake.snapshot(),.1);workshop.pose(awake.snapshot(),pose);assert(pose.headLift>.4&&pose.handLift>.6&&pose.awake);
assert.deepEqual(workshop.rig.forearm.position.toArray(),shoulder,'wake rotates arm at the attached shoulder rather than translating the sleeve off the body');
assert(Math.abs(workshop.rig.forearm.rotation.x)>.4);
const lampBounds=new T.Box3().setFromObject(workshop.rig.deskLamp);
assert(lampBounds.min.x>3.8+ROOM.radius*2,'entire lamp is outside even a twice-radius expansion of real support');
checks.push('real impact latches once, decays without repeated contact animation; pause freezes; retry clears; real wake raises head and hand');
checks.push('composition: arm stays attached at shoulder during wake; lamp remains outside foreground corridor');
// Actual controller with DOM/render fixtures, never a browser or WebGL.
const nodes=new Map(),events={},windowEvents={},draws=[];
function el(sel){if(!nodes.has(sel))nodes.set(sel,{textContent:'',hidden:false,disabled:false,dataset:{},handlers:{},focus(){},addEventListener(t,f){this.handlers[t]=f;},showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();}});return nodes.get(sel);}
const document={body:{dataset:{}},hidden:false,querySelector:s=>s==='dialog[open]'?(el('#help-dialog').open?el('#help-dialog'):null):el(s),querySelectorAll:()=>[],addEventListener:(t,f)=>events[t]=f};
let now=1000;const context=vm.createContext({document,window:{addEventListener:(t,f)=>windowEvents[t]=f,quietBootReady(){}},performance:{now:()=>now},requestAnimationFrame(){},location:{reload(){}},QuietWorld,ROOM,feedback,createView:()=>({draw:(snapshot,meta)=>draws.push({snapshot,meta})})});
const source=readFileSync(new URL('../experiments/quiet-workbench-preview/game.mjs',import.meta.url),'utf8').replace(/^import .*\n/gm,'').replace(/^export /gm,'');
vm.runInContext(source+'\nglobalThis.check={frame,diagnostics};',context);
assert.equal(document.body.dataset.mode,'ready');el('#start').onclick();
const key=code=>({code,target:{closest:()=>null},preventDefault(){},repeat:false});events.keydown(key('KeyD'));events.keydown(key('ShiftLeft'));now+=100;context.check.frame(now);assert(draws.at(-1).meta.brake);
el('#pause').onclick();const paused=JSON.stringify(context.check.diagnostics());now+=100;context.check.frame(now);assert.equal(JSON.stringify(context.check.diagnostics()),paused);assert(draws.at(-1).meta.paused);
el('#start').onclick();el('#help').onclick();assert.equal(context.check.diagnostics().mode,'paused');assert(el('#help-dialog').open);el('#close-help').onclick();assert(!el('#help-dialog').open);assert.equal(context.check.diagnostics().mode,'paused');
el('#retry').onclick();assert.equal(context.check.diagnostics().mode,'playing');assert.deepEqual(Array.from(context.check.diagnostics().player.position),ROOM.spawn);
vm.runInContext("world.state='charged';sync()",context);assert.equal(el('#overlay').hidden,true);assert.equal(el('#result').hidden,false);el('#result-retry').onclick();assert.equal(el('#result').hidden,true);
checks.push('actual controller passes brake metadata, freezes simulation/presentation on pause, manual preserves pause, retry clears, terminal keeps scene unobscured');
console.log(JSON.stringify({passed:true,scope:'Node legal-control physics, actual Three scene objects, DOM/render fixtures; not browser pixels or human play',checks,routes},null,2));
