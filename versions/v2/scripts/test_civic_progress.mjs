import assert from 'node:assert/strict';
import { PROGRESS_KEY, CURRENT_KEY, CHAPTER_COUNT, emptyProgress, parseProgress, recordVictory, createProgressStore, isPointerActivation } from '../games/civic/progress.mjs';
let checks = 0;
function test(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
function memory(initial = {}) { const values = new Map(Object.entries(initial)); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; }
const victory = { state: 'won', turn: 5, resources: { food: 20 }, tradeDelivered: 4 };
const record = { turns: 5, food: 20, trade: 4 };
test('defaults, malformed and oversized records are safe', () => {
  for (const raw of [null, '', 'broken', 'null', '[]', '1', '{}', '{"version":2,"unlocked":7}', '{"version":1,"unlocked":8}', ' '.repeat(250001)]) assert.deepEqual(parseProgress(raw), emptyProgress());
  assert.equal(CHAPTER_COUNT, 8); assert.notEqual(CURRENT_KEY, PROGRESS_KEY);
});
test('synthetic victory fixtures unlock eight chapters, not locked or nonterminal games', () => {
  let p = emptyProgress();
  assert.equal(recordVictory(p, 1, victory), p);
  for (const state of ['ready', 'playing', 'paused', 'lost']) assert.equal(recordVictory(p, 0, { ...victory, state }), p);
  for (let i = 0; i < 8; i++) { p = recordVictory(p, i, victory); assert.equal(p.unlocked, Math.min(i + 1, 7)); assert.deepEqual(p.best[i], record); }
  assert.deepEqual(parseProgress(JSON.stringify(p)), p);
});
test('best minimizes turns, then maximizes food and trade; duplicate award idempotent', () => {
  const p = recordVictory(emptyProgress(), 0, victory);
  assert.deepEqual(recordVictory(p, 0, victory), p);
  assert.deepEqual(recordVictory(p, 0, { ...victory, turn: 6, resources: { food: 999 } }), p);
  const fast = recordVictory(p, 0, { ...victory, turn: 4, resources: { food: 1 } });
  assert.equal(fast.best[0].turns, 4);
  const food = recordVictory(p, 0, { ...victory, resources: { food: 21 } });
  assert.equal(food.best[0].food, 21);
  assert.equal(recordVictory(p, 0, { ...victory, tradeDelivered: 5 }).best[0].trade, 5);
  assert.deepEqual(p.best[0], record, 'no input mutation');
});
test('invalid fields and prototype-like keys never enter records', () => {
  const p = emptyProgress();
  for (const game of [null, [], {}, { ...victory, turn: 0 }, { ...victory, turn: 1.5 }, { ...victory, tradeDelivered: Infinity }, { ...victory, resources: { food: -1 } }]) assert.equal(recordVictory(p, 0, game), p);
  for (const index of [-1, 8, NaN, 0.5]) assert.equal(recordVictory(p, index, victory), p);
  assert.deepEqual(parseProgress('{"version":1,"best":{"__proto__":{"turns":1,"food":99,"trade":99},"8":{"turns":1,"food":99,"trade":99}}}'), p);
  assert.equal(Object.prototype.turns, undefined);
});
test('valid records survive unrelated damage', () => {
  assert.deepEqual(parseProgress(JSON.stringify({ version: 1, unlocked: 'bad', best: { 0: record, 1: { turns: -1 } } })), { version: 1, unlocked: 1, best: { 0: record } });
});
test('current checkpoint uses separate key and clearing cannot erase campaign', () => {
  const p = recordVictory(emptyProgress(), 0, victory), storage = memory({ [PROGRESS_KEY]: JSON.stringify(p) }), store = createProgressStore(storage);
  const checkpoint = { version: 1, levelIndex: 1, commands: [{ type: 'endTurn' }] };
  assert.equal(store.saveCurrent(checkpoint), true); assert.deepEqual(store.loadCurrent(), checkpoint);
  assert.equal(store.clearCurrent(), true); assert.equal(store.loadCurrent(), null); assert.deepEqual(store.loadProgress(), p);
});
test('corruption rejection discards only current log', () => {
  const p = recordVictory(emptyProgress(), 0, victory);
  for (const raw of ['bad', 'null', '[]', '{"version":2,"checkpoint":{}}', '{"version":1,"checkpoint":[]}', ' '.repeat(250001)]) {
    const storage = memory({ [PROGRESS_KEY]: JSON.stringify(p), [CURRENT_KEY]: raw }), store = createProgressStore(storage);
    assert.equal(store.loadCurrent(), null); assert.equal(store.damagedCurrent, true); store.rejectCurrent();
    assert.equal(storage.getItem(CURRENT_KEY), null); assert.deepEqual(store.loadProgress(), p);
  }
});
test('engine-rejected log is removed without touching independent best', () => {
  const p = recordVictory(emptyProgress(), 0, victory), storage = memory({ [PROGRESS_KEY]: JSON.stringify(p) }), store = createProgressStore(storage);
  store.saveCurrent({ version: 1, impossible: true }); assert.ok(store.loadCurrent()); store.rejectCurrent();
  assert.equal(store.damagedCurrent, true); assert.deepEqual(store.loadProgress(), p);
});
test('missing, blocked, quota and serialization storage failures stay visible', () => {
  const absent = createProgressStore(null); assert.deepEqual(absent.loadProgress(), emptyProgress()); assert.equal(absent.unavailable, true); assert.equal(absent.clearCurrent(), false);
  let block = true; const storage = memory(), normalWrite = storage.setItem; storage.setItem = (...args) => { if (block) throw new Error('quota'); return normalWrite(...args); };
  const store = createProgressStore(storage); assert.equal(store.saveCurrent({ version: 1 }), false); block = false;
  assert.equal(store.saveCurrent({ version: 1 }), true); assert.equal(store.unavailable, true);
  const cycle = {}; cycle.loop = cycle; assert.equal(store.saveCurrent(cycle), false);
});
test('tap validity excludes drag, cancel, mismatched or incomplete contact', () => {
  const a = { pointerId: 2, x: 10, y: 20 };
  assert.equal(isPointerActivation(a, { ...a, x: 15, y: 25 }), true);
  for (const b of [null, {}, { ...a, x: 99 }, { ...a, pointerId: 3 }, { ...a, cancelled: true }, { ...a, x: NaN }]) assert.equal(isPointerActivation(a, b), false);
  assert.equal(isPointerActivation({ ...a, cancelled: true }, a), false);
});
console.log(`\n${checks} civic progress/input unit groups passed. Pure Node only; no browser or device claim.`);
