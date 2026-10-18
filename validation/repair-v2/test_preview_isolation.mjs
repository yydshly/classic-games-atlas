import assert from'node:assert/strict';import fs from'node:fs';import{PROGRESS_KEY,SHIFT_KEY}from'../../versions/v2/games/repair/progress.mjs';
assert.equal(PROGRESS_KEY,'atlas-v2-repair-20261018-progress-v1');assert.equal(SHIFT_KEY,'atlas-v2-repair-20261018-shift-v1');
const root=new URL('../../versions/v2/games/repair/',import.meta.url),html=fs.readFileSync(new URL('index.html',root),'utf8'),game=fs.readFileSync(new URL('game.mjs',root),'utf8');
assert.ok(html.includes('../../../../preview/repair/'));assert.ok(html.includes('href="../../../../#'));assert.ok(!game.includes('atlas-preview-repair'));
console.log('PASS isolated v2 keys and original-version/root link paths');
