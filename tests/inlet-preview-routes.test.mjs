import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../experiments/inlet-deadline-preview/source/engine.mjs';
import {fixtures,replay,runner,deadline,goalRules} from '../docs/inlet-playability-qa/replay.mjs';

for(const route of fixtures.routes)test(`${route.id}: commands alone meet all targets without life loss`,()=>{
  const before=JSON.stringify(route),r=replay(route);
  assert.equal(r.g.state,route.expected.state);assert.equal(r.g.time,route.expected.time);
  assert.equal(r.g.percent,route.expected.percent);assert.equal(r.g.lives,3);
  assert.equal(r.g.stats.losses,0);assert.deepEqual(r.g.stats,route.expected.stats);
  assert(r.g.objectives.every(o=>o.complete));assert(r.g.time<r.g.limit);
  assert.equal(r.attempts.length,r.g.stats.cuts);assert(r.attempts.every(a=>a.straight&&a.risk==='safe'&&a.closed));
  assert.equal(JSON.stringify(route),before,'expected outputs are never fed back into the model');
});
test('all initial water is partitioned into the required per-region goals, with an enemy in every region',()=>{
  for(const level of [2,3]){const rules=goalRules(level);assert.equal(rules.components.length,level);
    assert(rules.components.every(o=>o.target===40&&o.enemyIds.length===1));}
});
test('overall 60% alone does not skip the missing second-bay region',()=>{
  const r=replay(fixtures.routes.find(r=>r.id==='bay2-stepping'));
  const partial=r.cuts.find(c=>c.overall&&!c.allObjectives);
  assert(partial);assert.equal(partial.state,'playing');assert.equal(partial.time,11.4);
  assert(partial.percent>=60);assert(r.g.state==='won'&&r.g.time>partial.time);
});
for(const [level,at,expectedRisk,closed]of [[2,84,'safe',true],[2,84.14,'timeout',true],[2,84.4,'timeout',false],[3,89,'safe',true],[3,89.38,'timeout',true],[3,89.4,'timeout',false]])
test(`bay${level} late departure at ${at}s: ${expectedRisk}, closed=${closed}`,()=>{
  const r=deadline(level,at),a=r.attempts.at(-1);assert(a);assert.equal(a.risk,expectedRisk);assert.equal(a.closed,closed);
  assert.equal(r.g.lives,3);if(expectedRisk==='timeout')assert.equal(r.g.time,r.g.limit);
});
test('a warned third-bay collision executes at the forecast time, with one real lost lamp',()=>{
  const r=runner(3),initial=E.previewThreat(r.g,'D');r.arm();while(r.g.state==='playing'&&!r.losses.length)r.step('D');
  assert.equal(r.g.time,1.76);assert.equal(r.g.lives,2);assert.equal(r.attempts[0].forecast.risk,'danger');
  assert.equal(initial.hitIn,1.76);assert(Math.abs(r.attempts[0].at+r.attempts[0].forecast.hitIn-r.g.time)<1e-8);
});
for(const level of [2,3])test(`bay${level}: three legal self-backtracks exhaust exactly three lamps`,()=>{
  const r=runner(level);
  for(let i=0;i<3;i++){r.arm();r.ticks(6,'D');r.ticks(6,'U');assert.equal(r.g.stats.losses,i+1);}
  assert.equal(r.g.state,'lost');assert.equal(r.g.lives,0);assert.equal(r.g.time,.72);
});
test('a timing shift can invalidate a fixed route, and the new departure forecast reports the collision',()=>{
  const route=fixtures.routes.find(r=>r.id==='bay3-long'),r=replay(route,10,true);
  assert.equal(r.g.lives,2);assert.equal(r.losses.length,1);assert.equal(r.g.time,1.12);
  const failed=r.attempts.find(a=>a.risk==='danger');assert(failed);assert.equal(failed.forecast.risk,'danger');
});
test('loss clears only the open line, preserving legitimately captured progress',()=>{
  const route=fixtures.routes.find(r=>r.id==='bay2-stepping'),r=replay(route,5,true),loss=r.losses[0];
  assert(loss);assert(loss.claimedBefore>0);assert.equal(loss.claimedAfter,loss.claimedBefore);
  assert.equal(r.g.trail.length,0);assert.equal(r.g.drawArmed,false);assert.equal(r.g.lives,2);
});
