import assert from 'node:assert/strict';
import * as preview from '../progress.mjs';
import * as engine from '../engine.mjs';
import * as original from '../../../../../preview/kart/progress.mjs';
const coaster={PROGRESS_KEY:'atlas-preview-coaster-20261018-progress-v1',CURRENT_KEY:'atlas-preview-coaster-20261018-current-v1'};

const productionProgress = JSON.stringify({ version: 1, unlocked: 2, last: 1, tutorialSeen: true, best: { 1: { place: 2, time: 80 } } });
const productionCurrent = JSON.stringify({ version: 1, marker: 'production-race' });
const sentinels = new Map([
  [original.PROGRESS_KEY, productionProgress],
  [original.CURRENT_KEY, productionCurrent],
  [coaster.PROGRESS_KEY, 'existing-coaster-preview-progress'],
  [coaster.CURRENT_KEY, 'existing-coaster-preview-current'],
  ['atlas-escort-progress-v1', 'existing-34-game-sentinel'],
  ['unrelated-site-preference', 'untouched'],
]);
const values = new Map(sentinels), operations = [];
const storage = {
  getItem(key) { operations.push(['read', key]); return values.get(key) ?? null; },
  setItem(key, value) { operations.push(['write', key]); values.set(key, value); },
  removeItem(key) { operations.push(['remove', key]); values.delete(key); },
};
assert.equal(preview.PROGRESS_KEY, 'atlas-v2-kart-20261018-progress-v1');
assert.equal(preview.CURRENT_KEY, 'atlas-v2-kart-20261018-current-v1');
assert.equal(new Set([preview.PROGRESS_KEY, preview.CURRENT_KEY, original.PROGRESS_KEY, original.CURRENT_KEY, coaster.PROGRESS_KEY, coaster.CURRENT_KEY]).size, 6);
assert.deepEqual(preview.loadProgress(storage).progress, preview.emptyProgress());
assert.equal(preview.loadCurrent(storage, engine.restore).game, null);
const progress = preview.emptyProgress();
assert.equal(preview.recordFinish(progress, 1, { won: true, place: 2, time: 80 }), true);
assert.equal(preview.saveProgress(storage, progress), true);
assert.deepEqual(preview.loadProgress(storage).progress, progress);
const game = engine.createGame(0);
assert.equal(preview.saveCurrent(storage, game, engine.checkpoint), true);
assert.equal(preview.loadCurrent(storage, engine.restore).game.state, 'ready');
engine.start(game); engine.step(game, 0.1);
assert.equal(preview.saveCurrent(storage, game, engine.checkpoint), true);
const reloaded = preview.loadCurrent(storage, engine.restore);
assert.equal(reloaded.game.state, 'paused');
assert.equal(reloaded.game.countdown, game.countdown);
assert.equal(preview.saveCurrent(storage, { state: 'won' }, () => { throw Error('must not checkpoint terminal games'); }), true);
assert.equal(preview.loadCurrent(storage, engine.restore).game, null);
values.set(preview.CURRENT_KEY, 'invalid-preview-race');
assert.equal(preview.loadCurrent(storage, engine.restore).damaged, true);
assert.equal(values.has(preview.CURRENT_KEY), false);
assert.deepEqual(preview.loadProgress(storage).progress, progress);
assert.ok(operations.every(([, key]) => [preview.PROGRESS_KEY, preview.CURRENT_KEY].includes(key)));
for (const [key, value] of sentinels) assert.equal(values.get(key), value, key);
console.log('PASS preview reads, writes, reloads, pauses restoration and clears only its two dedicated keys');
console.log('PASS production kart, coaster preview and existing-game sentinel saves remain byte-for-byte unchanged');
console.log('Node storage-contract test with actual engine checkpoint/restore only. Browser persistence is not claimed.');
