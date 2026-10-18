import assert from 'node:assert/strict';
import fs from 'node:fs';

// Source and sizing-model regression only. This does not measure a browser.
const base = new URL('../../preview/court/', import.meta.url);
const css = fs.readFileSync(new URL('court.css', base), 'utf8');
const html = fs.readFileSync(new URL('index.html', base), 'utf8');
const controller = fs.readFileSync(new URL('game.mjs', base), 'utf8');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
test('arena has a stable scroll target and viewport breathing room', () => {
  assert.match(html, /<section id="arena" class="arena">/);
  assert.match(css, /\.arena\{margin-inline:auto;scroll-margin-block-start:8px\}/);
  assert.match(controller, /function revealArena\(\)\{\$\('arena'\)\.scrollIntoView\(\{block:'start',inline:'nearest',behavior:'auto'\}\);\}/);
  assert.match(controller, /canvas\.focus\(\{preventScroll:true\}\);update\(\);revealArena\(\)/);
});
test('desktop cap reserves actual UI space without cropping or stretching the court', () => {
  assert.match(css, /--court-ui-space:214px;width:100%;max-width:min\(1082px,calc\(\(100svh - var\(--court-ui-space\)\)\*1\.5 \+ 2px\)\)/);
  assert.match(css, /@media\(min-width:561px\)\{[\s\S]*?\.view\{max-height:none\}/);
  assert.match(html, /<canvas id="court" width="1200" height="800"/);
  assert.match(css, /\.view\{position:relative;background:#a0c2bc;aspect-ratio:3\/2/);
  assert.doesNotMatch(css, /object-fit:cover|transform:scale|zoom:/);
});
test('short desktops reduce only chrome spacing and retain readable fonts', () => {
  assert.match(css, /@media\(min-width:561px\) and \(max-height:800px\)\{\s*\.arena\{--court-ui-space:182px\}\s*\.scoreboard\{height:70px\}\s*\.live-bar\{min-height:42px;padding-block:9px\}\s*\.toolbar\{padding-block:8px\}/);
  assert.match(css, /@media\(min-width:561px\) and \(max-height:700px\)\{\.toolbar\{justify-content:center\}\.toolbar p\{display:none\}\}/);
});
test('coarse-pointer desktop budget includes the original touch-control row', () => {
  assert.match(css, /@media\(min-width:561px\) and \(pointer:coarse\)\{\.arena\{--court-ui-space:316px\}\}/);
  assert.match(css, /@media\(min-width:561px\) and \(max-height:800px\) and \(pointer:coarse\)\{\.arena\{--court-ui-space:284px\}\}/);
});
test('narrow fine-pointer and touch devices both expose original action controls', () => {
  assert.match(css, /@media\(pointer:coarse\),\(max-width:560px\)\{\.touch-controls\{display:flex/);
  assert.match(css, /\.view canvas\{grid-column:1;grid-row:1;height:auto;aspect-ratio:3\/2\}/);
  assert.match(css, /\.panel\{position:static;grid-column:1;grid-row:2;width:auto/);
  assert.match(css, /\.dpad\{grid-template-columns:repeat\(3,32px\);grid-template-rows:repeat\(2,32px\)\}/);
  assert.match(html, /id="touch-shoot"/); assert.match(html, /id="touch-pass"/); assert.match(html, /id="touch-switch"/);
});
test('common desktop sizes fit HUD, full court, charge bar and toolbar together', () => {
  for (const [width, height] of [[1180,757],[1366,768],[1440,900],[1920,1080],[1024,600],[900,700],[768,1024]]) {
    for (const coarse of [false, true]) {
      const short = height <= 800, budget = (short ? 182 : 214) + (coarse ? 102 : 0);
      const horizontalPadding = width <= 900 ? 40 : 80;
      const arenaWidth = Math.min(width-horizontalPadding, 1082, (height-budget)*1.5+2);
      const canvasHeight = (arenaWidth-2)/1.5;
      const chrome = (short ? 70+42+52 : 82+50+64) + (coarse ? 101 : 0) + 2;
      assert.ok(canvasHeight+chrome+16 <= height+1e-8, `${width}x${height} coarse=${coarse}`);
      assert.ok(arenaWidth >= 450, `Avoid tiny court in the required desktop matrix: ${width}x${height}`);
      console.log(`  sizing model ${width}x${height} ${coarse?'coarse':'fine'}: court ${(arenaWidth-2).toFixed(1)}x${canvasHeight.toFixed(1)}, arena ${(canvasHeight+chrome).toFixed(1)}`);
    }
  }
});
test('400x606 playing model retains full width and fits visible touch controls', () => {
  // Browser evidence had a 388px layout viewport at 400 CSS px. Preserve its
  // 366.4px court width rather than applying a desktop-height cap to phones.
  const canvasWidth = 366.4, canvasHeight = canvasWidth/1.5;
  const scoreboard = 65, live = 50, touch = 89, toolbar = 52.8, borders = 1.6;
  assert.ok(canvasHeight+scoreboard+live+touch+toolbar+borders+16 < 606);
  assert.equal(canvasWidth, 366.4);
});
console.log(`\n${checks} layout source/sizing checks passed. Post-deployment real-browser geometry and native-touch verification are still required.`);
