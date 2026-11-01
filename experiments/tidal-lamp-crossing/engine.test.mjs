import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_KEY, STAGES, createGame, start, move, advance, pause, resume, retry,
  selectStage, nextStage, checkpoint, restore } from './engine.mjs';

const routes = [
  ['left','left','up','up','up','up','right','up','up','up','up'],
  ['up','up','up','left','up','up','up','right','up','up'],
  ['left','left','up','up','up','up','up','down','up','right','wait','up','right','up','up'],
];
const rightRoute = ['right','up','right','up','up','up','down','left','left','left','left','up','up','right','up','right','right','up','up'];
function tick(s) { for (let i = 0; i < 6 && s.phase === 'active'; i++) advance(s, .05); }
function play(s, actions) {
  assert(start(s));
  for (const action of actions) {
    if (action !== 'wait') assert(move(s, action), action);
    tick(s);
    assert.notEqual(s.phase, 'lost', `${STAGES[s.stage].name}: ${action} at ${s.elapsed}`);
  }
  assert.equal(s.phase, 'won');
}
test('three connected challenges complete with records and no final next-stage prompt', () => {
  const s = createGame();
  for (let stage = 0; stage < STAGES.length; stage++) {
    assert.equal(s.stage, stage); play(s, routes[stage]);
    assert(s.records[stage]);
    assert.equal(s.unlocked, Math.min(stage + 1, 2));
    if (stage < 2) assert(nextStage(s));
  }
  assert.equal(nextStage(s), false);
  assert.match(s.message, /三盏灯都已送达/);
  assert.equal(s.records.filter(Boolean).length, 3);
});
test('third stage also has a distinct passable side', () => {
  const s = createGame(); s.unlocked = 2; assert(selectStage(s, 2));
  play(s, rightRoute); assert(s.hops > routes[2].filter(a => a !== 'wait').length);
});
test('road collision, missing raft and timeout explain failure and permit retry', () => {
  const road = createGame(); assert(start(road)); assert(move(road, 'up'));
  for (let i = 0; i < 6 && road.phase === 'active'; i++) advance(road, .05);
  assert.equal(road.phase, 'lost'); assert.match(road.message, /货车/);
  assert(retry(road)); assert.equal(road.elapsed, 0); assert.equal(road.player.row, 8);
  const river = createGame(); river.unlocked = 1; assert(selectStage(river, 1)); assert(start(river));
  assert(move(river, 'left')); assert(move(river, 'up'));
  assert.equal(river.phase, 'lost'); assert.match(river.message, /浮梁/);
  const clock = createGame(); assert(start(clock));
  for (let i = 0; i <= STAGES[0].limit * 20 && clock.phase === 'active'; i++) advance(clock, .05);
  assert.equal(clock.phase, 'lost'); assert.match(clock.message, /时限/);
});
test('raft carries the courier; pause and reload preserve position without advancing time', () => {
  assert(SAVE_KEY.includes('tidal-lamp-crossing'));
  const s = createGame(); s.unlocked = 1; assert(selectStage(s, 1)); assert(start(s));
  assert(move(s, 'up')); const x = s.player.x; advance(s, .2); assert(s.player.x > x);
  assert(pause(s)); const frozen = checkpoint(s); assert.equal(advance(s, 2), false);
  assert.deepEqual(checkpoint(s), frozen);
  const loaded = restore(frozen); assert.equal(loaded.phase, 'paused');
  assert.equal(loaded.player.x, frozen.player.x); assert(resume(loaded));
  const active = restore(checkpoint(loaded)); assert.equal(active.phase, 'paused');
  assert(restore({ ...frozen, player: { ...frozen.player, x: 999 } }) === null);
});
test('retry and stage selection preserve previous completed records', () => {
  const s = createGame(); play(s, routes[0]);
  const oldRecord = checkpoint(s.records[0]); assert(nextStage(s));
  assert(start(s)); assert(retry(s)); assert.equal(s.phase, 'ready');
  assert.deepEqual(s.records[0], oldRecord);
  assert(selectStage(s, 0)); assert.deepEqual(s.records[0], oldRecord);
  assert.equal(selectStage(s, 2), false);
});
