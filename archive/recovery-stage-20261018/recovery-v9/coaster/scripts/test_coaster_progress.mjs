import assert from 'node:assert/strict';
import { PROGRESS_KEY, CURRENT_KEY, CHAPTER_COUNT, emptyProgress, parseProgress, recordVictory, createProgressStore, isPointerActivation } from '../games/coaster/progress.mjs';
let checks = 0;
function test(name, run) { run(); checks++; console.log(`PASS ${name}`); }
function memory(initial = {}) { const values = new Map(Object.entries(initial)); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; }
const victory = { state: 'won', levelIndex: 0, runs: 3, revenue: 480, reputation: 90, cost: 170 };
const record = { runs: 3, revenue: 480, reputation: 90, cost: 170 };
test('only bounded recognized v1 campaign fields survive', () => {
  for (const raw of [null, '', 'broken', 'null', '[]', '1', '{}', '{"version":2,"unlocked":7}', '{"version":1,"unlocked":8}', ' '.repeat(250001)]) assert.deepEqual(parseProgress(raw), emptyProgress());
  assert.equal(CHAPTER_COUNT, 8); assert.notEqual(CURRENT_KEY, PROGRESS_KEY);
  assert.equal(PROGRESS_KEY, 'atlas-coaster-progress-v1'); assert.equal(CURRENT_KEY, 'atlas-coaster-current-v1');
});
test('synthetic victory fixtures unlock only available matching chapters; non-wins never unlock', () => {
  let p = emptyProgress();
  assert.equal(recordVictory(p, 1, { ...victory, levelIndex: 1 }), p);
  for (const state of ['design', 'testing', 'operating', 'paused', 'lost']) assert.equal(recordVictory(p, 0, { ...victory, state }), p);
  for (let i = 0; i < 8; i++) { p = recordVictory(p, i, { ...victory, levelIndex: i }); assert.equal(p.unlocked, Math.min(i + 1, 7)); assert.deepEqual(p.best[i], record); }
  assert.deepEqual(parseProgress(JSON.stringify(p)), p);
});
test('best favors fewer runs then lower module cost; repeat award is idempotent', () => {
  const p = recordVictory(emptyProgress(), 0, victory);
  assert.deepEqual(recordVictory(p, 0, victory), p);
  assert.deepEqual(recordVictory(p, 0, { ...victory, runs: 4, cost: 0 }), p);
  assert.equal(recordVictory(p, 0, { ...victory, runs: 2, cost: 200 }).best[0].runs, 2);
  assert.equal(recordVictory(p, 0, { ...victory, cost: 160 }).best[0].cost, 160);
  assert.equal(recordVictory(p, 0, { ...victory, reputation: 91 }).best[0].reputation, 91);
  assert.equal(recordVictory(p, 0, { ...victory, revenue: 481 }).best[0].revenue, 481);
  assert.deepEqual(p.best[0], record, 'input unchanged');
});
test('invalid values, mismatched chapters and prototype names are rejected', () => {
  const p = emptyProgress();
  for (const game of [null, [], {}, { ...victory, levelIndex: 1 }, { ...victory, runs: 0 }, { ...victory, runs: 1.5 }, { ...victory, revenue: Infinity }, { ...victory, reputation: -1 }, { ...victory, cost: NaN }]) assert.equal(recordVictory(p, 0, game), p);
  for (const index of [-1, 8, NaN, 0.5]) assert.equal(recordVictory(p, index, victory), p);
  assert.deepEqual(parseProgress('{"version":1,"best":{"__proto__":{"runs":1,"revenue":99,"reputation":99,"cost":0},"8":{"runs":1,"revenue":99,"reputation":99,"cost":0}}}'), p);
  assert.equal(Object.prototype.runs, undefined);
});
test('good record survives unrelated damaged fields', () => {
  assert.deepEqual(parseProgress(JSON.stringify({ version: 1, unlocked: 'bad', best: { 0: record, 1: { runs: -1 } } })), { version: 1, unlocked: 1, best: { 0: record } });
});
test('current checkpoint is separate; clearing cannot erase campaign', () => {
  const p = recordVictory(emptyProgress(), 0, victory), storage = memory({ [PROGRESS_KEY]: JSON.stringify(p) }), store = createProgressStore(storage);
  const checkpoint = { version: 1, levelIndex: 1, modules: ['rail'] };
  assert.equal(store.saveCurrent(checkpoint), true); assert.deepEqual(store.loadCurrent(), checkpoint);
  assert.equal(store.clearCurrent(), true); assert.equal(store.loadCurrent(), null); assert.deepEqual(store.loadProgress(), p);
});
test('malformed or engine-rejected current data is discarded independently', () => {
  const p = recordVictory(emptyProgress(), 0, victory);
  for (const raw of ['bad', 'null', '[]', '{"version":2,"checkpoint":{}}', '{"version":1,"checkpoint":[]}', ' '.repeat(250001)]) {
    const storage = memory({ [PROGRESS_KEY]: JSON.stringify(p), [CURRENT_KEY]: raw }), store = createProgressStore(storage);
    assert.equal(store.loadCurrent(), null); assert.equal(store.damagedCurrent, true); store.rejectCurrent();
    assert.equal(storage.getItem(CURRENT_KEY), null); assert.deepEqual(store.loadProgress(), p);
  }
  const store = createProgressStore(memory({ [PROGRESS_KEY]: JSON.stringify(p) })); store.saveCurrent({ impossible: true }); assert.ok(store.loadCurrent()); store.rejectCurrent(); assert.equal(store.damagedCurrent, true); assert.deepEqual(store.loadProgress(), p);
});
test('unavailable or quota storage and circular serialization fail safely and remain visible', () => {
  const absent = createProgressStore(null); assert.deepEqual(absent.loadProgress(), emptyProgress()); assert.equal(absent.unavailable, true); assert.equal(absent.clearCurrent(), false);
  let block = true; const storage = memory(), normalWrite = storage.setItem; storage.setItem = (...args) => { if (block) throw Error('quota'); return normalWrite(...args); };
  const store = createProgressStore(storage); assert.equal(store.saveCurrent({ version: 1 }), false); block = false;
  assert.equal(store.saveCurrent({ version: 1 }), true); assert.equal(store.unavailable, true);
  const cycle = {}; cycle.loop = cycle; assert.equal(store.saveCurrent(cycle), false);
});
test('tap rejects drag, cancel, mismatched/incomplete/nonfinite contacts', () => {
  const a = { pointerId: 2, x: 10, y: 20 };
  assert.equal(isPointerActivation(a, { ...a, x: 15, y: 25 }), true);
  for (const b of [null, {}, { ...a, x: 99 }, { ...a, pointerId: 3 }, { ...a, cancelled: true }, { ...a, x: NaN }]) assert.equal(isPointerActivation(a, b), false);
  assert.equal(isPointerActivation({ ...a, cancelled: true }, a), false);
  assert.equal(isPointerActivation(a, a, -1), false);
});
console.log(`\n${checks} coaster progress/input groups passed. Pure Node fixtures, not browser/device verification.`);
