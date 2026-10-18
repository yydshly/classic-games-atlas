import assert from 'node:assert/strict';
import {
  DAY_COUNT,
  PROGRESS_KEY,
  SHIFT_KEY,
  emptyProgress,
  parseProgress,
  recordVictory,
  createProgressStore,
  isPointerActivation,
} from '../games/repair/progress.mjs';

let checks = 0;
function test(name, run) {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
}
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
}
const victory = { completed: 8, lost: 1, credits: 120 };

test('campaign default, malformed JSON, incorrect schema and bounds are safe', () => {
  for (const raw of [null, '', 'bad', 'null', '[]', '1', '{}', '{"version":2,"unlocked":7}', '{"version":1,"unlocked":8}']) {
    assert.deepEqual(parseProgress(raw), emptyProgress());
  }
  assert.equal(DAY_COUNT, 8);
});

test('valid victories unlock the next day; locked-day results are rejected', () => {
  let progress = emptyProgress();
  assert.equal(recordVictory(progress, 2, victory), progress);
  for (let day = 0; day < DAY_COUNT; day += 1) {
    progress = recordVictory(progress, day, victory);
    assert.equal(progress.unlocked, Math.min(day + 1, DAY_COUNT - 1));
    assert.deepEqual(progress.best[day], victory);
  }
  assert.deepEqual(parseProgress(JSON.stringify(progress)), progress);
});

test('best compares completed, then fewer losses, then credits without downgrade', () => {
  const initial = recordVictory(emptyProgress(), 0, victory);
  const lower = recordVictory(initial, 0, { completed: 7, lost: 0, credits: 999 });
  assert.deepEqual(lower.best[0], victory);
  const cleaner = recordVictory(initial, 0, { completed: 8, lost: 0, credits: 10 });
  assert.equal(cleaner.best[0].lost, 0);
  const richer = recordVictory(cleaner, 0, { completed: 8, lost: 0, credits: 200 });
  assert.equal(richer.best[0].credits, 200);
  assert.equal(recordVictory(richer, 0, { completed: 8, lost: 0, credits: 5 }).best[0].credits, 200);
  assert.equal(recordVictory(richer, 1, victory).unlocked, 2);
  assert.equal(initial.unlocked, 1, 'input is not mutated');
});

test('invalid result and prototype-like keys cannot enter records', () => {
  const initial = emptyProgress();
  for (const result of [null, [], {}, { ...victory, lost: -1 }, { ...victory, completed: 2.5 }, { ...victory, credits: Infinity }]) {
    assert.equal(recordVictory(initial, 0, result), initial);
  }
  for (const index of [-1, 8, 0.5, NaN]) assert.equal(recordVictory(initial, index, victory), initial);
  assert.deepEqual(parseProgress('{"version":1,"unlocked":0,"best":{"__proto__":{"completed":8,"lost":0,"credits":500},"99":{"completed":8,"lost":0,"credits":500}}}'), emptyProgress());
  assert.equal(Object.prototype.completed, undefined);
});

test('valid best records survive other damaged progress fields', () => {
  const recovered = parseProgress(JSON.stringify({ version: 1, unlocked: 'broken', best: { 0: victory, 1: { completed: -2, lost: 0, credits: 100 } } }));
  assert.deepEqual(recovered, { version: 1, unlocked: 1, best: { 0: victory } });
});

test('current-shift round trip is isolated from independent campaign records', () => {
  const progress = recordVictory(emptyProgress(), 0, victory);
  const storage = memoryStorage({ [PROGRESS_KEY]: JSON.stringify(progress) });
  const store = createProgressStore(storage);
  assert.deepEqual(store.loadProgress(), progress);
  const checkpoint = { version: 1, levelIndex: 1, tick: 100, commands: [] };
  assert.equal(store.saveShift(checkpoint), true);
  assert.deepEqual(store.loadShift(), checkpoint);
  assert.equal(store.clearShift(), true);
  assert.equal(store.loadShift(), null);
  assert.deepEqual(store.loadProgress(), progress);
});

test('corrupt or unsupported shift cannot erase a valid best or unlock', () => {
  const progress = recordVictory(emptyProgress(), 0, victory);
  for (const corrupt of ['bad json', 'null', '[]', '{"version":99,"checkpoint":{}}', '{"version":1,"checkpoint":[]}']) {
    const storage = memoryStorage({ [PROGRESS_KEY]: JSON.stringify(progress), [SHIFT_KEY]: corrupt });
    const store = createProgressStore(storage);
    assert.deepEqual(store.loadProgress(), progress);
    assert.equal(store.loadShift(), null);
    assert.equal(store.damagedShift, true);
    store.rejectShift();
    assert.equal(storage.getItem(SHIFT_KEY), null);
    assert.deepEqual(store.loadProgress(), progress);
  }
});

test('engine-rejected checkpoint removes only the shift key', () => {
  const progress = recordVictory(emptyProgress(), 0, victory);
  const storage = memoryStorage({ [PROGRESS_KEY]: JSON.stringify(progress), [SHIFT_KEY]: '{"version":1,"checkpoint":{"version":1,"tick":9999999}}' });
  const store = createProgressStore(storage);
  assert.ok(store.loadShift());
  store.rejectShift();
  assert.equal(store.damagedShift, true);
  assert.deepEqual(store.loadProgress(), progress);
});

test('blocked storage, missing storage and quota errors are nonfatal and sticky', () => {
  const absent = createProgressStore(null);
  assert.deepEqual(absent.loadProgress(), emptyProgress());
  assert.equal(absent.unavailable, true);
  assert.equal(absent.saveShift({ tick: 0 }), false);
  assert.equal(absent.clearShift(), false);
  let blocked = true;
  const normal = memoryStorage();
  const storage = {
    ...normal,
    setItem(key, value) {
      if (blocked) throw new Error('quota');
      normal.setItem(key, value);
    },
  };
  const store = createProgressStore(storage);
  const progress = recordVictory(emptyProgress(), 0, victory);
  assert.equal(store.saveProgress(progress), false);
  assert.equal(store.unavailable, true);
  blocked = false;
  assert.equal(store.saveProgress(progress), true);
  assert.equal(store.unavailable, true, 'later success must not hide the warning');
  assert.deepEqual(store.loadProgress(), progress);
});

test('cancel, drag, wrong contact and incomplete contact never activate', () => {
  const start = { pointerId: 7, x: 100, y: 100 };
  assert.equal(isPointerActivation(start, { pointerId: 7, x: 103, y: 104 }), true);
  assert.equal(isPointerActivation({ ...start, cancelled: true }, { pointerId: 7, x: 100, y: 100 }), false);
  assert.equal(isPointerActivation(start, { pointerId: 7, x: 100, y: 100, cancelled: true }), false);
  assert.equal(isPointerActivation(start, { pointerId: 7, x: 120, y: 100 }), false);
  assert.equal(isPointerActivation(start, { pointerId: 8, x: 100, y: 100 }), false);
  assert.equal(isPointerActivation(null, start), false);
  assert.equal(isPointerActivation(start, {}), false);
});

console.log(`\n${checks} repair progress/input unit groups passed. Pure Node checks only; no browser or touch-device claim.`);
