import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STORAGE_KEY, parseProgress, recordWin } from '../../preview/court/progress.mjs';

// Preview-specific source contracts. Controller tests separately exercise
// actual storage reads/writes against a store containing production sentinels.
const base = new URL('../../preview/court/', import.meta.url);
const html = fs.readFileSync(new URL('index.html', base), 'utf8');
const controller = fs.readFileSync(new URL('game.mjs', base), 'utf8');
const progress = fs.readFileSync(new URL('progress.mjs', base), 'utf8');
assert.equal(STORAGE_KEY, 'atlas-preview-court-20261018-v1');
assert.notEqual(STORAGE_KEY, 'atlas-court-v1');
assert.equal(progress.includes("'atlas-court-v1'"), false);
assert.equal(controller.includes('atlas-court-v1'), false);
assert.equal((controller.match(/localStorage\.getItem\(KEY\)/g) || []).length, 1);
assert.equal((controller.match(/localStorage\.setItem\(KEY,/g) || []).length, 1);
assert.doesNotMatch(controller, /localStorage\.(?:clear|removeItem)\s*\(/);
assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
assert.match(html, /独立预览 \/ 尚未验收 35/);
assert.match(html, /尚未完成真实浏览器验收/);
assert.match(html, /href="\.\.\/\.\.\/#experiments"/);
assert.match(html, /href="\.\.\/\.\.\/games\/escort\/"/);
assert.match(html, /href="\.\.\/\.\.\/assets\/favicon\.svg"/);
assert.doesNotMatch(html, /href="\.\.\/escort\/"/);
assert.doesNotMatch(html, /href="\.\.\/\.\.\/index\.html"/);
for (const name of ['court.css', 'game.mjs', 'engine.mjs', 'levels.mjs', 'progress.mjs', 'renderer.mjs']) assert.ok(fs.existsSync(new URL(name, base)));
const saved = recordWin(parseProgress(null), 0, [10, 4]);
assert.deepEqual(parseProgress(JSON.stringify(saved)), { unlocked: 1, best: { 0: 6 }, sound: false });
console.log('PASS preview contracts: isolated key, no production migration/clear, unchanged save schema, explicit pending-acceptance label, noindex, catalog/escort/favicon links and runtime dependency files.');
