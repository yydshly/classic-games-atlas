import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readJson, validateRecommendations} from '../../catalogue-load.mjs';

test('successful JSON and request options', async () => {
  const value = await readJson('/fixture', {fetcher: async (url, options) => {
    assert.equal(url, '/fixture'); assert.equal(options.cache, 'no-cache');
    assert.ok(options.signal instanceof AbortSignal);
    return {ok: true, json: async () => ({items: [1]})};
  }});
  assert.deepEqual(value, {items: [1]});
});
test('HTTP, network and JSON failures propagate', async () => {
  for (const fetcher of [async () => ({ok: false, status: 503}),
    async () => {throw new Error('offline');},
    async () => ({ok: true, json: async () => {throw new Error('bad JSON');}})]) {
    await assert.rejects(readJson('/fixture', {fetcher}));
  }
});
for (const stage of ['connection', 'body']) test(`${stage} stall has a deadline and aborts`, async () => {
  let signal;
  const fetcher = async (_, options) => {
    signal = options.signal;
    if (stage === 'connection') return new Promise(() => {});
    return {ok: true, json: () => new Promise(() => {})};
  };
  await assert.rejects(readJson('/fixture', {fetcher, timeoutMs: 20}), /超时/);
  assert.equal(signal.aborted, true);
});
test('complete current forty recommendations validate without changing data', async () => {
  const data = JSON.parse(await readFile(new URL('../../data/games.json', import.meta.url)));
  const comparisons = JSON.parse(await readFile(new URL('../../data/comparisons.json', import.meta.url)));
  const candidates = comparisons.items.filter(item => Number(item.number) > 34);
  assert.equal(comparisons.items.length, 40);
  assert.equal(validateRecommendations(data, comparisons, candidates), comparisons.items);
  for (const items of [[], comparisons.items.slice(1), [...comparisons.items.slice(1), comparisons.items[1]],
    comparisons.items.map((item, i) => i === 0 ? {...item, play_url: ''} : item)]) {
    assert.throws(() => validateRecommendations(data, {items}, candidates), /不完整/);
  }
});
