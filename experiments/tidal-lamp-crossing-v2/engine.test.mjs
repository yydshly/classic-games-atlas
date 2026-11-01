import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_KEY, STAGES, createGame, start, move, advance, pause, resume, retry,
  selectStage, nextStage, checkpoint, restore, laneAt } from './engine.mjs';
import { SAVE_KEY as FIRST_SAVE_KEY } from '../tidal-lamp-crossing/engine.mjs';

// The first three preserve the published tutorial layouts. Later routes are bounded plans,
// separately replayed through normal browser input; they are not difficulty ratings.
const routes = [
  ['left','left','up','up','up','up','right','up','up','up','up'],
  ['up','up','up','left','up','up','up','right','up','up'],
  ['left','left','up','up','up','up','up','down','up','right','wait','up','right','up','up'],
  ['left','up','up','up','up','right','up','up','up','up'],
  ['left','left','left','up','up','wait','up','right','up','up','right','up','up','up'],
  ['left','up','up','up','up','up','up','left','up','up','right'],
];
const stage5Right = ['right','up','up','up','left','right','left','right','up','up','right','up','wait','up','up','left','left'];
const stage6Right = ['right','up','up','up','up','up','up','up','up','left'];
function tick(s, count) { for (let i = 0; i < count && s.phase === 'active'; i++) advance(s, .05); }
function play(s, actions, count = s.stage < 3 ? 6 : 5) {
  assert(start(s));
  for (const action of actions) {
    if (action !== 'wait') assert(move(s, action), `${STAGES[s.stage].name}: ${action}`);
    tick(s, count);
    assert.notEqual(s.phase, 'lost', `${STAGES[s.stage].name}: ${action} at ${s.elapsed}`);
  }
  assert.equal(s.phase, 'won', STAGES[s.stage].name);
}
test('six stages unlock in order, preserve records and stop at the final result', () => {
  assert.notEqual(SAVE_KEY, FIRST_SAVE_KEY);
  const s = createGame(); assert.equal(STAGES.length, 6);
  for (let stage = 0; stage < STAGES.length; stage++) {
    assert.equal(s.stage, stage); play(s, routes[stage]);
    assert(s.records[stage]); assert.equal(s.unlocked, Math.min(stage + 1, 5));
    if (stage < 5) assert(nextStage(s));
  }
  assert.equal(nextStage(s), false); assert.match(s.message, /六盏灯都已送达/);
  assert.equal(s.records.filter(Boolean).length, 6);
});
test('narrow gate requires moving from a raft, and both gate approaches are viable', () => {
  const s = createGame(); s.unlocked = 4; assert(selectStage(s, 4));
  assert(start(s)); assert.equal(move(s, 'up'), true); assert.equal(laneAt(s).kind, 'water');
  assert.equal(move(s, 'up'), true); assert.equal(move(s, 'up'), true);
  assert.equal(move(s, 'up'), false); assert.match(s.message, /封栏/);
  assert(retry(s)); play(s, routes[4]);
  assert(selectStage(s, 4)); play(s, stage5Right);
});
test('final left road route and right raft route both reach the lamp', () => {
  const s = createGame(); s.unlocked = 5; assert(selectStage(s, 5));
  assert(start(s)); assert.equal(move(s, 'up'), false); assert.match(s.message, /封栏/);
  assert(retry(s)); play(s, routes[5]);
  assert(selectStage(s, 5)); play(s, stage6Right);
});
test('road collision, missing raft, timeout and retry are explained', () => {
  const road = createGame(); assert(start(road)); assert(move(road, 'up'));
  tick(road, 6); assert.equal(road.phase, 'lost'); assert.match(road.message, /货车/);
  assert(retry(road)); assert.equal(road.elapsed, 0); assert.equal(road.player.row, 8);
  const river = createGame(); river.unlocked = 1; assert(selectStage(river, 1)); assert(start(river));
  assert(move(river, 'left')); assert(move(river, 'up'));
  assert.equal(river.phase, 'lost'); assert.match(river.message, /浮梁/);
  const clock = createGame(); assert(start(clock));
  for (let i = 0; i <= STAGES[0].limit * 20 && clock.phase === 'active'; i++) advance(clock, .05);
  assert.equal(clock.phase, 'lost'); assert.match(clock.message, /时限/);
});
test('raft movement, pause, refresh, malformed save and older records stay separate', () => {
  const s = createGame(); s.unlocked = 1; assert(selectStage(s, 1)); assert(start(s));
  assert(move(s, 'up')); const x = s.player.x; advance(s, .2); assert(s.player.x > x);
  assert(pause(s)); const frozen = checkpoint(s); assert.equal(advance(s, 2), false);
  assert.deepEqual(checkpoint(s), frozen);
  const loaded = restore(frozen); assert.equal(loaded.phase, 'paused');
  assert.equal(loaded.player.x, frozen.player.x); assert(resume(loaded));
  assert.equal(restore(checkpoint(loaded)).phase, 'paused');
  assert.equal(restore({ ...frozen, version: 1 }), null);
  assert.equal(restore({ ...frozen, records: [null, null, null] }), null);
  assert.equal(restore({ ...frozen, player: { ...frozen.player, x: 999 } }), null);
});
test('retry and selection never erase earlier stage records', () => {
  const s = createGame(); play(s, routes[0]);
  const previous = checkpoint(s.records[0]); assert(nextStage(s));
  assert(start(s)); assert(retry(s)); assert.deepEqual(s.records[0], previous);
  assert(selectStage(s, 0)); assert.deepEqual(s.records[0], previous);
  assert.equal(selectStage(s, 5), false);
});
