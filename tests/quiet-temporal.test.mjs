import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {baselineSource} from '../docs/quiet-gentle-home-qa/baseline-source.mjs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {sequences} from '../docs/quiet-gentle-home-qa/temporal/sequences.mjs';
import {evaluate,metrics,BASE} from '../docs/quiet-gentle-home-qa/temporal/evaluate.mjs';
const runs=sequences(),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),streamHash=hash(runs);
const before=evaluate(runs,true),after=evaluate(runs),oldMetrics=metrics(before),newMetrics=metrics(after),checks=[];
assert.equal(hash(runs),streamHash,'presentation never rewrites physical samples');assert.equal(hash(sequences()),streamHash,'binary input policy is reproducible');
const physics=readFileSync(new URL('../experiments/quiet-workbench-preview/physics.mjs',import.meta.url));assert(physics.equals(Buffer.from(baselineSource(BASE,'physics.mjs'))));
for(const frames of Object.values(runs))for(const f of frames)for(const k of ['x','z'])assert([undefined,-1,0,1].includes(f.input[k]));
for(const frames of Object.values(after))for(const f of frames){assert.deepEqual(f.shell,f.quaternion);assert.equal(f.faceRoll,0);assert.equal(f.contacts,f.state==='charged');}
const roll=after['rolling-brake'].filter(f=>f.phase==='roll'),turn=after['rolling-brake'].filter(f=>f.phase==='turn');
assert(roll.reduce((n,f)=>n+f.angularVelocity[0]*f.pose.speed,0)<0);assert(turn.some(f=>f.angularVelocity[2]>0));
assert(oldMetrics['rolling-brake'].brake.pitchStep>.16);assert(newMetrics['rolling-brake'].brake.pitchStep<.05);assert(newMetrics['rolling-brake'].release.pitchStep<.04);
checks.push('binary inputs only; exact physical stream preserved; real rolling quaternion reaches shell; self-levelled face; brake press/release continuity');
assert(oldMetrics['light-recovery'].recovery.headStep>.08);assert(newMetrics['light-recovery'].recovery.headStep<.005);
assert(after['light-recovery'].every(f=>f.state==='playing'));assert.equal(after['light-recovery'].at(-1).noise,0);assert(Math.abs(after['light-recovery'].at(-1).headY-1.37)<1e-9);
checks.push('real non-terminal impact naturally decays through 0.55 without the archived head/hand step');
const hits=[];let key='';for(const f of after['two-tools'])if(f.impactKey&&f.impactKey!==key){hits.push(f);key=f.impactKey;}
assert.deepEqual(hits.map(f=>f.impactTool),['spanner-tray','practice-metal']);assert(hits[1].time-hits[0].time<1.1);assert(hits.every(f=>f.impact===1));assert.equal(hits[1].state,'woke');assert(after['two-tools'].at(-1).impact<1e-6);
checks.push('two real tools hit 0.983s apart; latest tool reacts once and noise reaches a genuine wake terminal');
const dock=after.dock,c=dock.findIndex(f=>f.state==='charged');assert(c>0);assert(dock.slice(0,c).some(f=>f.fastMark&&!f.contacts));assert.equal(newMetrics.dock.connection.pitchStep,0);assert(oldMetrics.dock.connection.pitchStep>.1);
assert(Math.abs(dock.filter(f=>f.state==='charged').at(-1).facePitch)<1e-10);
checks.push('actual fast approach remains unconnected; binary brake reaches charged; no connection pose snap; nod settles to zero');
for(const name of ['dock','fall','wake']){
 const trace=after[name],terminal=trace.filter(f=>f.state!=='playing'),first=terminal[0];assert(first);
 assert(terminal.every(f=>JSON.stringify(f.position)===JSON.stringify(first.position)&&JSON.stringify(f.quaternion)===JSON.stringify(first.quaternion)&&f.time===first.time));
 const retry=trace.filter(f=>f.phase==='retry');assert(retry.length);assert(retry.every(f=>f.state==='playing'&&f.resets===1&&f.noise===0&&f.impactTool===null&&f.impact<1e-8&&!f.connected));
 if(name==='wake'){assert(Math.abs(terminal.at(-1).headY-terminal.at(-10).headY)<1e-9);assert(Math.abs(terminal.at(-1).handX-terminal.at(-10).handX)<1e-9);}
}
checks.push('genuine fall/wake/charged freeze world time, position and quaternion; existing wake/nod finish; commanded retry clears reaction history');
const report={passed:true,base:BASE,method:'60Hz real Cannon binary-control stream; real Three rig matrices; no browser, frame-rate or player-quality acceptance',frames:Object.fromEntries(Object.entries(runs).map(([k,v])=>[k,v.length])),totalFrames:Object.values(runs).reduce((n,v)=>n+v.length,0),physicalStreamSha256:streamHash,physicsByteIdentical:true,checks,before:oldMetrics,after:newMetrics,twoToolSeconds:hits[1].time-hits[0].time,terminalScope:'World freezes. Existing bounded wake/nod and ambient breathing have separate presentation time; no claim that every decorative animation freezes.'};
// Persist evidence only on an explicit audit run, not every ordinary test run.
if(process.env.QUIET_TEMPORAL_EVIDENCE==='1'){
 const root=new URL('../docs/quiet-gentle-home-qa/temporal/',import.meta.url);mkdirSync(root,{recursive:true});
 writeFileSync(new URL('report.json',root),JSON.stringify(report,null,2)+'\n');
 writeFileSync(new URL('trace.json.gz',root),gzipSync(JSON.stringify({method:report.method,before,after}),{level:9}));
 const local=new URL('../.local/quiet-temporal/',import.meta.url);mkdirSync(local,{recursive:true});writeFileSync(new URL('streams.json',local),JSON.stringify(runs));
}
console.log(JSON.stringify(report,null,2));
