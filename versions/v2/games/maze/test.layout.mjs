// Semantic markup checks only. Computed geometry belongs to the browser test.
// The old <=600px flow-card CSS contract is superseded by viewport fitting.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const play=html.slice(html.indexOf('<section class="play">'),html.indexOf('</section>'));
test('live HUD and gameplay controls have unique IDs inside the play region',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ['clock','player-state','rival-state','player-bombs','rival-bombs','pause','bomb','restart'])assert.ok(play.includes(`id="${id}"`),id);
});
test('original board resolution and labelled movement/bomb controls remain present',()=>{
 assert.match(play,/<canvas[^>]+width="440" height="360"/);
 for(const d of [0,1,2,3])assert.equal([...play.matchAll(new RegExp(`data-dir="${d}"`,'g'))].length,1);
 assert.match(play,/id="bomb" aria-label="放置炸弹"/);
 for(const id of ['primary','other-map'])assert.ok(play.includes(`id="${id}"`));
 assert.match(html,/href="\.\.\/\.\.\/\.\.\/v1\/games\/maze\/"/);
});
