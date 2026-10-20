// Offline replay of read-only checkpoints captured by the public UI test.
// This does not drive a browser and is not additional play evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {restore, checkpoint, LEVELS} from '../../versions/v2/games/expedition/engine.mjs';
const here=new URL('./',import.meta.url);
const report=JSON.parse(fs.readFileSync(new URL('public-report.json',here),'utf8'));
assert.equal(report.passed,true);
assert.equal(report.stages.length,3);
const stages=[];
for(const [index,row] of report.stages.entries()){
 assert.equal(row.level,index+1);assert.equal(row.attempts,1);assert.equal(row.passed,true);
 const g=restore(row.finalCheckpoint),goal=LEVELS[index].goal;
 assert.equal(g.status,'won');assert.equal(g.tick,LEVELS[index].duration*4);
 assert.deepEqual(checkpoint(g),row.finalCheckpoint);
 assert.equal(row.finalUI.remaining,0);assert.equal(row.finalUI.base,g.base.hp+' / '+g.base.maxHp);
 assert.equal(row.finalUI.food,g.stock.food);assert.equal(row.finalUI.wood,g.stock.wood);
 assert.ok(g.delivered.food>=goal.food&&g.delivered.wood>=goal.wood);
 assert.ok(goal.buildings.every(b=>g.buildings[b]===1));assert.ok(g.raids.every(r=>r.resolved));
 for(const c of row.captures){
  if(c.checkpointBefore)assert.deepEqual(checkpoint(restore(c.checkpointBefore)),c.checkpointBefore);
  if(c.checkpointAfter)assert.deepEqual(checkpoint(restore(c.checkpointAfter)),c.checkpointAfter);
  assert.ok(c.entities.every(e=>e.loaded));
  if(c.running)assert.ok(c.entities.filter(e=>e.visible&&e.className.includes('person')).length>=4);
 }
 if(index){const ready=row.captures.find(c=>c.label==='stage-'+(index+1)+'-ready');
  assert.deepEqual(ready.checkpointBefore,{version:2,levelIndex:index,tick:0,log:[]});
  assert.equal(row.freshStageResources.food,32);assert.equal(row.freshStageResources.wood,36);
 }
 stages.push({level:index+1,status:g.status,tick:g.tick,baseHP:g.base.hp,stock:g.stock,delivered:g.delivered,buildings:g.buildings,
  survivingWorkers:g.workers.filter(w=>w.alive).length,guards:g.guards.filter(a=>a.hp>0).map(a=>({front:a.front,hp:a.hp})),
  allRaidsResolved:true,acceptedCommands:g.log.length,runningCaptures:row.captures.filter(c=>c.running).map(c=>c.label)});
}
const dual=report.stages[2].captures.find(c=>c.label==='stage-3-dual-77');assert.ok(dual);
assert.equal(dual.entities.filter(e=>e.className.includes('raider')&&e.visible).length,2);
const dualStates=[dual.checkpointBefore,dual.checkpointAfter].map(restore);
assert.ok(dualStates.some(g=>g.raids.filter(r=>r.at===77&&r.phase==='battle'&&!r.resolved).length===2));
assert.equal(report.thirdStageDualRaidSeen,true);assert.equal(report.finalCompletionRefreshExact,true);
assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.badResponses,[]);
const result={kind:'offline checkpoint replay; separate from normal public UI play',baseline:report.baseline,passed:true,stages,
 dualRaidCheckpointTimes:dualStates.map(g=>g.time),finalCompletionRefreshExact:true,consoleErrors:0,httpErrors:0,
 requestFailures:report.requestFailures,verifiedRuntimeFiles:report.files.length};
fs.writeFileSync(new URL('checkpoint-audit.json',here),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
