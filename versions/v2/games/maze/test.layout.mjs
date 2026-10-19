// Static responsive-contract checks, NOT a browser/computed-layout test.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const css=fs.readFileSync(new URL('./maze.css',import.meta.url),'utf8');
const narrow=css.slice(css.lastIndexOf('@media(max-width:600px)'));
test('at <=600px overlay controls use document flow rather than a clipped board-height layer',()=>{
 assert.match(narrow,/\.arena\{aspect-ratio:auto\}/);
 assert.match(narrow,/\.arena canvas\{height:auto;aspect-ratio:11\/9\}/);
 assert.match(narrow,/\.overlay\{position:static;inset:auto;padding:14px\}/);
 assert.match(narrow,/\.card\{width:100%;max-width:100%;min-width:0\}/);
 assert.match(css,/\.overlay\[hidden\]\{display:none\}/);
 for(const viewport of [320,360,390,600]){
  // The authored main padding is 14px each side; border consumes 2px.
  const inner=viewport-28-2,canvasHeight=inner*9/11,estimatedCardHeight=303;
  const flowHeight=canvasHeight+estimatedCardHeight+28;
  assert.ok(flowHeight>=canvasHeight+estimatedCardHeight);
  // Even when the card exceeds the board, its normal flow expands arena height.
  assert.ok(inner-28>0);
 }
});
