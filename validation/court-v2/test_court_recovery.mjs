import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGame, start, step, action, snapshot, LEVELS, FIXED_DT } from '../../versions/v2/games/court/engine.mjs';

// NEW recovery-specific regression tests; not historical recovered tests.
let checks = 0;
function test(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
function advance(s, n, input = {}) { for (let i = 0; i < n; i++) step(s, FIXED_DT, input); }
test('cancel-shot drops charge and release edge without points or a shot', () => {
  const s = start(createGame()); advance(s, 22, { shoot: true }); const shots = s.stats.shots[0];
  action(s, 'cancel-shot'); assert.equal(s.charging, false); assert.equal(s.charge, 0); assert.equal(s.lastShoot, false);
  advance(s, 2); assert.equal(s.stats.shots[0], shots); assert.equal(s.ball.owner, 0); assert.deepEqual(s.score, [0, 0]);
});
test('cancel-shot is idempotent, and a fresh hold can still shoot normally', () => {
  const s = start(createGame()); advance(s, 22, { shoot: true }); action(s, 'cancel-shot'); const before = snapshot(s);
  action(s, 'cancel-shot'); assert.deepEqual(s, before); advance(s, 32, { shoot: true }); advance(s, 1); assert.equal(s.stats.shots[0], 1);
});
test('cancel-shot cannot change a ready or paused match', () => {
  for (const state of ['ready', 'paused']) { const s = createGame(); s.state = state; const before = snapshot(s); action(s, 'cancel-shot'); assert.deepEqual(s, before); }
});
test('cancel-shot cannot recall an already released ball', () => {
  const s = start(createGame()); advance(s, 32, { shoot: true }); advance(s, 1); const ball = structuredClone(s.ball);
  action(s, 'cancel-shot'); assert.deepEqual(s.ball, ball); assert.equal(s.stats.shots[0], 1);
});
test('all eight original match identifiers and durations remain unchanged', () => {
  assert.deepEqual(LEVELS.map(x => x.id), ['first-light', 'paint-patrol', 'wing-runners', 'long-distance', 'pressure-test', 'give-and-go', 'night-shift', 'rooftop-final']);
  assert.deepEqual(LEVELS.map(x => x.duration), [75,75,80,80,85,85,90,90]);
});
test('restored help dialog has an exact matching accessible heading', () => {
  const html = fs.readFileSync(new URL('../../versions/v2/games/court/index.html', import.meta.url), 'utf8');
  assert.match(html, /<dialog id="help-dialog" aria-labelledby="help-title">/);
  assert.match(html, /<h2 id="help-title">先说好，怎么打。<\/h2>/);
});
test('captured phone CSS retains intrinsic canvas and separate panel grid rows', () => {
  const css = fs.readFileSync(new URL('../../versions/v2/games/court/court.css', import.meta.url), 'utf8');
  const phone = css.slice(css.indexOf('@media(max-width:560px)'));
  assert.match(phone, /\.view\{aspect-ratio:auto;max-height:none;display:grid;grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(phone, /\.view canvas\{grid-column:1;grid-row:1;height:auto;aspect-ratio:3\/2\}/);
  assert.match(phone, /\.panel\{position:static;grid-column:1;grid-row:2;/);
  assert.match(phone, /\.court-label\{position:static;grid-column:1;grid-row:1;/);
});
console.log(`\n${checks} recovery-specific checks passed. CSS checks are source contracts, not browser rendering.`);
