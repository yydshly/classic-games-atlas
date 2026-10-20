// Offline audit of UI-captured saved events. This does not operate the public page.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fresh,decode,encode,NODES,ENEMIES} from '../../versions/v2/games/beacon/model.mjs';
const reportFile=process.argv[2]||'.local/beacon-loss-qa/public/report.json';
const report=JSON.parse(fs.readFileSync(reportFile,'utf8'));
assert(report.confirmedRestartAndNormalActions&&report.restartCancelPreservedLostRun);
assert.equal(report.refreshChecks.length,3);
assert(report.refreshChecks.every(r=>r.rawSaveAndVisibleStateExact&&r.restoredPaused));
const states=Object.fromEntries(report.milestones.map(row=>[row.name,row.rawSave===null?fresh():decode(row.rawSave)]));
for(const row of report.milestones){assert(states[row.name],row.name);if(row.rawSave!==null)assert.equal(encode(states[row.name]),row.rawSave);}
const first=states['03-costly-retreat'];
assert.deepEqual({phase:first.phase,at:first.at,day:first.day,supply:first.supply,gold:first.gold,wood:first.wood,guardHP:first.guardHP,bowHP:first.bowHP},
 {phase:'map',at:'port',day:5,supply:6,gold:100,wood:0,guardHP:26,bowHP:12});
assert.deepEqual(first.cargo,{gold:0,wood:0,lens:0,core:0});
assert(first.collected.includes('wreck'));assert.deepEqual(first.cleared,[]);
const lens=states['04-lens-in-cargo'];
assert.equal(lens.phase,'map');assert.equal(lens.at,'ruins');assert.equal(lens.day,7);
assert.deepEqual(lens.cargo,{gold:70,wood:2,lens:1,core:0});
assert.equal(lens.gold,20);assert.equal(lens.guardHP,26);assert.equal(lens.bowHP,20);
assert.equal(lens.events.filter(c=>c.kind==='stance').length,2);
const failed=states['05-critical-lens-loss'];
assert.equal(failed.phase,'lost');assert.equal(failed.day,9);assert.equal(failed.at,'port');
assert.equal(failed.guardHP,22);assert.equal(failed.bowHP,20);assert.equal(failed.gold,20);
assert.equal(failed.lens,0);assert.deepEqual(failed.cargo,{gold:0,wood:0,lens:0,core:0});assert(failed.cleared.includes('ruins'));
const futureLens=Object.entries(NODES).filter(([id,n])=>n.enemy&&ENEMIES[n.enemy].lens&&!failed.cleared.includes(id)).reduce((n,[,site])=>n+ENEMIES[site.enemy].lens,0);
assert.equal(futureLens,1);assert(failed.log.at(-1).includes('关键修复物资'));
assert.deepEqual(states['06-confirmed-fresh-start'],fresh());
const continued=states['07-normal-action-after-restart'];
assert.equal(continued.phase,'map');assert.equal(continued.at,'wreck');assert.equal(continued.day,2);
assert.deepEqual(continued.cargo,{gold:65,wood:2,lens:0,core:0});assert.equal(continued.events.length,2);
const result={kind:'offline replay of captured normal browser UI event logs, not a separate UI playthrough',passed:true,
 firstRetreat:{day:5,bankGold:100,lostCargo:{gold:65,wood:2},guardHP:'30 -> 26',continues:true},
 lensAcquisition:{rounds:2,cargoLens:1,bankGold:20,guardHP:26,bowHP:20},
 criticalLoss:{day:9,phase:'lost',guardHP:22,bowHP:20,bankGold:20,remainingObtainableLens:futureLens,requiredLens:2},
 confirmedRestartExactFresh:true,normalPostRestartTravelAndCollect:true,
 checkedMilestones:Object.keys(states).length,states};
const target=process.argv[3]||'.local/beacon-loss-qa/replay-audit.json';fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,milestones:result.checkedMilestones,firstRetreatDay:5,failureDay:9,restartFresh:true}));
