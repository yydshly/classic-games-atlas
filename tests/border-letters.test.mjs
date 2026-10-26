import assert from 'node:assert/strict';
import test from 'node:test';
import { CAMPAIGNS } from '../experiments/border-letters/world.mjs';
import { continueTurn, endTurn, forage, fortify, march, newGame, undo, validSave } from '../experiments/border-letters/engine.mjs';

function action(state, fn, ...args) {
  const result = fn(state, ...args);
  assert.equal(result.ok, true, result.reason);
  return result.state;
}
function play(stage, script) {
  let state = newGame(stage);
  for (const [fn, ...args] of script) {
    state = action(state, fn, ...args);
    if (fn === endTurn && state.settlementPending) state = action(state, continueTurn);
  }
  assert.equal(state.phase, 'won', `${CAMPAIGNS[stage].name}: ${state.logs.join(' | ')}`);
  return state;
}
const E = [endTurn];
test('five missions finish through normal commands with different goals', () => {
  const routes = [
    [[forage,'camp'],E,[fortify,'courier'],[forage,'camp'],E,E],
    [[march,'guard','pass'],[forage,'camp'],E,[march,'guard','relay'],E,E,E,E],
    [[march,'courier','granary'],[march,'guard','pass'],E,[march,'courier','ford'],[forage,'camp'],E,[march,'courier','granary'],[forage,'camp'],E,[march,'courier','pass'],E,[forage,'camp'],E],
    [[march,'guard','pass'],[march,'courier','granary'],[forage,'camp'],E,[march,'guard','beacon'],[march,'courier','ford'],[forage,'camp'],E,[march,'courier','relay'],[forage,'camp'],E,[march,'courier','outpost'],[forage,'camp'],E,[fortify,'courier'],[forage,'camp'],E,[fortify,'courier'],E],
    [[march,'courier','granary'],[forage,'camp'],E,[march,'courier','ford'],[forage,'camp'],E,[march,'guard','pass'],[march,'courier','relay'],[forage,'camp'],E,[march,'guard','relay'],[march,'courier','outpost'],[forage,'camp'],E,[march,'guard','pass'],[march,'courier','relay'],[forage,'camp'],E,[march,'guard','granary'],[march,'guard','camp'],[forage,'camp'],E],
  ];
  const results = routes.map((script, stage) => play(stage, script));
  assert.equal(results[2].visits.includes('pass'), true);
  assert.equal(results[2].visits.includes('ford'), true);
  assert.equal(results[4].visits.includes('outpost'), true);
});
test('courier ford route and guard pass route carry different order and grain costs', () => {
  const guard = play(1, [[march,'guard','pass'],[forage,'camp'],E,[march,'guard','relay'],E,E,E,E]);
  const courier = play(1, [[march,'courier','granary'],[forage,'camp'],E,[march,'courier','ford'],E,[march,'courier','relay'],[fortify,'courier'],E,E,E]);
  assert.ok(guard.metrics.spent > courier.metrics.spent, 'mountain guard costs more grain');
  assert.equal(guard.metrics.harvests, courier.metrics.harvests);
  assert.equal(guard.metrics.guarded, 0);
  assert.equal(courier.metrics.guarded, 1);
  assert.equal(guard.metrics.marches, 2);
  assert.equal(courier.metrics.marches, 3);
});
test('fourth mission requires two garrisons at the openly signaled final attacks', () => {
  let solo = newGame(3);
  for (const [fn, ...args] of [
    [march,'guard','pass'],[forage,'camp'],E,
    [march,'guard','beacon'],[forage,'camp'],E,E,
    [march,'guard','outpost'],E,E,E,
  ]) { solo = action(solo,fn,...args); if (fn === endTurn && solo.settlementPending) solo = action(solo,continueTurn); }
  assert.equal(solo.phase,'lost');
  assert.equal(solo.ownership.beacon,'enemy');
  assert.equal(solo.ownership.outpost,'ally');
});
test('blocked actions are non-mutating, undo is pre-settlement only, and saved state validates', () => {
  const start = newGame(0), before = JSON.stringify(start);
  assert.equal(march(start,'courier','beacon').ok, false);
  assert.equal(JSON.stringify(start), before);
  const moved = action(start,march,'courier','camp');
  const loaded = JSON.parse(JSON.stringify(moved));
  assert.equal(validSave(loaded), true);
  assert.deepEqual({ ...action(loaded, undo), undo: [] }, start);
  const restored = action(moved,undo);
  assert.deepEqual({ ...restored, undo: [] }, start);
  const settled = action(moved,endTurn);
  assert.equal(undo(settled).ok, false);
  assert.equal(validSave(JSON.parse(JSON.stringify(settled))), true);
  assert.equal(validSave({ ...settled, version: 99 }), false);
  assert.equal(validSave({ ...settled, stage: 99 }), false);
  assert.equal(validSave({ ...settled, units: [settled.units[0], settled.units[0]] }), false);
  assert.equal(validSave({ ...settled, ownership: { ...settled.ownership, ford: 'enemy' }, garrison: { ford: -1 } }), false);
  assert.equal(validSave({ ...moved, undo: [{ ...start, undo: [start] }] }), false);
});
test('insufficient grain does not lock camp forage and repeated settlement is rejected after result', () => {
  let state = newGame(0); state.food = 0;
  assert.equal(march(state,'guard','granary').ok, false);
  state = action(state,forage,'camp');
  assert.equal(state.food,4);
  state = newGame(0);
  for (let t=0;t<3;t++) { state = action(state,endTurn); if (state.settlementPending) state = action(state,continueTurn); }
  assert.equal(state.phase,'lost');
  assert.equal(endTurn(state).ok,false);
});
test('shortage reduces next-turn orders but always leaves one forage command', () => {
  const state = newGame(0); state.food = 1;
  const next = action(action(state,endTurn),continueTurn);
  assert.equal(next.orders,1);
  assert.equal(next.food,0);
  assert.equal(forage(next,'camp').ok,true);
});
test('one settlement intent advances once until a separately confirmed next turn', () => {
  const initial = newGame(0);
  const settled = action(initial,endTurn);
  assert.equal(settled.turn,2);
  assert.equal(settled.settlementPending,true);
  assert.equal(settled.logs.filter(line => line.includes('第 1 回合补给')).length,1);
  const bytes = JSON.stringify(settled);
  assert.equal(endTurn(settled).ok,false);
  assert.equal(forage(settled,'camp').ok,false);
  assert.equal(undo(settled).ok,false);
  assert.equal(JSON.stringify(settled),bytes);
  assert.equal(validSave(JSON.parse(bytes)),true);
  const paused = { ...JSON.parse(bytes), paused:true };
  assert.equal(continueTurn(paused).ok,false);
  const ready = action({ ...paused, paused:false },continueTurn);
  assert.equal(ready.turn,2);
  assert.equal(ready.food,settled.food);
  assert.deepEqual(ready.logs,settled.logs);
  assert.equal(ready.settlementPending,false);
  const deliberateEmpty = action(ready,endTurn);
  assert.equal(deliberateEmpty.turn,3);
  assert.equal(deliberateEmpty.logs.filter(line => line.includes('第 2 回合补给')).length,1);
  const legacy = newGame(0); delete legacy.settlementPending;
  assert.equal(validSave(legacy),true);
  assert.equal(endTurn(legacy).ok,true);
});
