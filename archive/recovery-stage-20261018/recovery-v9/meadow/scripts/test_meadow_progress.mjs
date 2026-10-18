#!/usr/bin/env node
/** Pure Node storage/schema tests. No browser, network, installation or state-mutating hooks. */
import assert from 'node:assert/strict';
import { PROGRESS_KEY, CURRENT_KEY, MATCH_COUNT, MAX_SAVE_LENGTH, emptyProgress, parseProgress, recordVictory, createProgressStore } from '../games/meadow/progress.mjs';
import { createGame, start, step, checkpoint, restoreCheckpoint } from '../games/meadow/engine.mjs';
let assertions = 0;
const equal = (a, b, message) => { assert.deepEqual(a, b, message); assertions += 1; };
const ok = (value, message) => { assert.ok(value, message); assertions += 1; };
function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed)), writes = [], removes = [];
  return { values, writes, removes, getItem: key => values.get(key) ?? null,
    setItem(key, value) { writes.push({ key, value }); values.set(key, value); },
    removeItem(key) { removes.push(key); values.delete(key); } };
}
const raw = value => JSON.stringify(value);
equal(PROGRESS_KEY, 'atlas-meadow-progress-v1'); equal(CURRENT_KEY, 'atlas-meadow-current-v1'); equal(MATCH_COUNT, 8);
for (const value of [null, undefined, '', '{', 'null', '[]', 'true', '12', raw({ version: 2 }), ' '.repeat(MAX_SAVE_LENGTH + 1)]) equal(parseProgress(value), emptyProgress());
for (const unlocked of [-1, 8, 1.1, '2', null, Infinity, NaN]) equal(parseProgress(raw({ version: 1, unlocked, best: {} })).unlocked, 0);
for (let unlocked = 0; unlocked < MATCH_COUNT; unlocked++) equal(parseProgress(raw({ version: 1, unlocked, best: {} })).unlocked, unlocked);
const salvage = parseProgress(raw({ version: 1, unlocked: 'bad', best: {
  0: { score: [3, 1], ignored: 5 }, 1: { score: [0, 0] }, 2: { score: [1, 4] },
  3: { score: [100, 1] }, 4: { score: [4, -1] }, 5: { score: [3, '1'] },
  6: { score: [2, 1] }, 7: null, 8: { score: [9, 1] }, __proto__: { score: [8, 0] },
} }));
equal(salvage, { version: 1, unlocked: 7, best: { 0: { score: [3, 1] }, 6: { score: [2, 1] } } }, 'Good records survive malformed neighbors; unknown records never copied.');
const baseline = emptyProgress();
for (const state of ['ready', 'playing', 'paused', 'lost', 'goal', 'kickoff']) equal(recordVictory(baseline, 0, { state, score: [3, 0] }), baseline);
for (const score of [[0, 0], [0, 1], [100, 0], [2, -1], [2.5, 0], ['2', 0], [3], [3, 0, 1]]) equal(recordVictory(baseline, 0, { state: 'won', score }), baseline);
for (const index of [-1, 1, 8, .5, '0']) equal(recordVictory(baseline, index, { state: 'won', score: [3, 0] }), baseline);
const victory = { state: 'won', score: [3, 1] };
const first = recordVictory(baseline, 0, victory);
equal(first, { version: 1, unlocked: 1, best: { 0: { score: [3, 1] } } });
equal(baseline, emptyProgress(), 'Awards do not mutate earlier progress.');
victory.score[0] = 12; equal(first.best[0].score, [3, 1], 'Records copy the observed score.');
equal(recordVictory(first, 0, { state: 'won', score: [3, 1] }), first, 'Repeated victory is idempotent.');
equal(recordVictory(first, 0, { state: 'won', score: [2, 1] }), first, 'Worse margin does not replace best.');
equal(recordVictory(first, 0, { state: 'won', score: [4, 2] }).best[0].score, [4, 2], 'Equal margin prefers more goals.');
equal(recordVictory(first, 0, { state: 'won', score: [3, 0] }).best[0].score, [3, 0], 'Better margin wins.');
let campaign = emptyProgress();
for (let index = 0; index < 8; index++) campaign = recordVictory(campaign, index, { state: 'won', score: [index + 1, 0] });
equal(campaign.unlocked, 7); equal(Object.keys(campaign.best).length, 8);

const game = createGame(0); start(game); for (let i = 0; i < 100; i++) step(game, 1 / 60, {});
const active = checkpoint(game); ok(active && active.data.state === 'playing');
const memory = memoryStorage(), store = createProgressStore(memory);
equal(store.loadProgress(), emptyProgress()); equal(store.loadCurrent(), null);
ok(store.saveProgress(first)); ok(store.saveCurrent(active));
equal([...memory.values.keys()].sort(), [CURRENT_KEY, PROGRESS_KEY].sort(), 'Only isolated keys are used.');
const loaded = store.loadCurrent(); equal(loaded, active); loaded.data.time = 0; ok(store.loadCurrent().data.time > 0, 'Current saves are detached copies.');
const restored = restoreCheckpoint(store.loadCurrent()); ok(restored); equal(restored.state, 'paused'); equal(restored.time, game.time); equal(restored.score, game.score); equal(restored.charging, false);
const beforeTime = restored.time; step(restored, 10, { x: 1, shoot: true }); equal(restored.time, beforeTime, 'A restored match cannot advance until explicitly resumed.');
const terminal = structuredClone(active); terminal.data.state = 'won'; terminal.data.score = [2, 0];
equal(store.saveCurrent(terminal), false, 'Terminal saves cannot enter current slot.');
for (const invalid of [null, {}, [], { version: 1, game: 'other', data: active.data }, { version: 2, game: 'meadow', data: active.data }, { version: 1, game: 'meadow', data: { state: 'ready' } }]) equal(store.saveCurrent(invalid), false);
for (const invalid of ['{', 'null', '[]', raw({ version: 2, checkpoint: active }), raw({ version: 1, checkpoint: terminal }), raw({ version: 1, checkpoint: {} }), ' '.repeat(MAX_SAVE_LENGTH + 1)]) {
  const data = memoryStorage({ [PROGRESS_KEY]: raw(first), [CURRENT_KEY]: invalid }), isolated = createProgressStore(data);
  equal(isolated.loadCurrent(), null); ok(isolated.damagedCurrent); isolated.rejectCurrent(); equal(data.getItem(CURRENT_KEY), null); equal(isolated.loadProgress(), first, 'Rejecting current cannot delete campaign.');
}
const malformed = memoryStorage({ [PROGRESS_KEY]: raw({ version: 1, unlocked: 0, best: { 0: { score: [3, 1] }, 1: { score: [-1, 8] } } }) });
const damaged = createProgressStore(malformed); equal(damaged.loadProgress(), first); ok(damaged.damagedProgress);
const engineBad = structuredClone(active); engineBad.data.players[0].x = -10000;
equal(restoreCheckpoint(engineBad), null, 'Engine owns strict bounds beyond envelope checks.');
const source = structuredClone(active); const resumedCopy = restoreCheckpoint(source); ok(resumedCopy); source.data.players[0].x = 9999; ok(resumedCopy.players[0].x !== 9999, 'Restored world is detached from incoming save.');
const denied = createProgressStore({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('denied'); } });
equal(denied.loadProgress(), emptyProgress()); equal(denied.loadCurrent(), null); ok(denied.unavailable); equal(denied.saveProgress(first), false); equal(denied.saveCurrent(active), false); equal(denied.clearCurrent(), false);
const missing = createProgressStore(null); equal(missing.loadProgress(), emptyProgress()); ok(missing.unavailable);
let fail = true;
const intermittent = createProgressStore({ getItem: () => null, setItem() { if (fail) throw new Error('quota'); }, removeItem() {} });
equal(intermittent.saveProgress(first), false); fail = false; equal(intermittent.saveProgress(first), true); ok(intermittent.unavailable, 'Storage warning remains visible after a later successful write.');
console.log(`Meadow progress: ${assertions} assertions passed. Campaign salvage, active envelopes, paused restore, terminal rejection, isolated keys and storage denial verified.`);
