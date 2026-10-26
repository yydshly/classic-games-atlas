// Scope/preservation audit for the local second-chapter candidate, separate from first-release scope.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {PLAY_ENTRIES} from '../play-entries.mjs';
const base='1410870e14f6bd68212c24343f775fdde1c34fa7',baseTree='12606aba4f49b06dd037e02f5cff8c6bc0601ce3';
const chapter='c074215850ac719c68e779d2a2214502488e103c',chapterTree='1acd1c5320f102845340418cb232592c371cd3ab';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const baseText=path=>execFileSync('git',['show',baseTree+':'+path],{encoding:'utf8'});
const chapterText=path=>execFileSync('git',['show',chapterTree+':'+path],{encoding:'utf8'});
// Trees survive local-candidate -> public-main publication even when commit IDs differ.
assert.equal(git('cat-file','-t',baseTree),'tree');
assert.equal(git('cat-file','-t',chapterTree),'tree');
const expected={
 'docs/old-house-echoes-qa/README.md':'M','experiments/old-house-echoes/README.md':'M','experiments/old-house-echoes/index.html':'M','experiments/old-house-echoes/main.mjs':'M',
 'index.html':'M','play/entries.json':'M','play/index.html':'M','scripts/test-old-house-browser.py':'M',
 'experiments/old-house-echoes/courtyard/README.md':'A','experiments/old-house-echoes/courtyard/engine.mjs':'A','experiments/old-house-echoes/courtyard/index.html':'A','experiments/old-house-echoes/courtyard/main.mjs':'A','experiments/old-house-echoes/courtyard/renderer.mjs':'A','experiments/old-house-echoes/courtyard/storage.mjs':'A','experiments/old-house-echoes/courtyard/style.css':'A','experiments/old-house-echoes/courtyard/world.mjs':'A',
 'scripts/old-house-courtyard-routes.mjs':'A','scripts/test-old-house-courtyard-browser.py':'A','scripts/verify-old-house-courtyard.mjs':'A','tests/old-house-courtyard.test.mjs':'A','docs/old-house-echoes-qa/courtyard.md':'A'
};
// Audit the historical release against its own snapshot; later releases may add new entries.
const diff=git('diff','--name-status',baseTree,chapterTree).split('\n').filter(Boolean).map(line=>line.split('\t'));
assert.deepEqual(Object.fromEntries(diff.map(([status,path])=>[path,status])),Object.fromEntries(Object.entries(expected).sort()),'Exact second-chapter file scope');
for(const [status,path] of diff){assert(existsSync(path),path);assert(!/\.(png|jpg|jpeg|webp|gif|zip|gz|log)$/i.test(path),path);assert(!path.includes('guide')&&!path.includes('指南'),path);if(status==='A')assert(path.startsWith('experiments/old-house-echoes/courtyard/')||path.startsWith('scripts/')||path.startsWith('tests/')||path.startsWith('docs/old-house-echoes-qa/'));}
for(const path of ['experiments/old-house-echoes/world.mjs','experiments/old-house-echoes/engine.mjs','experiments/old-house-echoes/storage.mjs','experiments/old-house-echoes/input.mjs','experiments/old-house-echoes/renderer.mjs','data/games.json','data/comparisons.json','data/experiments.json','play-entries.mjs','play-recent.mjs'])assert.equal(chapterText(path),baseText(path),path+' changed in the chapter release');
const old=JSON.parse(baseText('play/entries.json')),released=JSON.parse(chapterText('play/entries.json')),entries=JSON.parse(readFileSync('play/entries.json','utf8'));
assert.equal(released.length,9);assert.deepEqual(released.slice(1),old);assert.equal(released[0].id,'old-house-courtyard');assert.equal(released[0].token,'echoes-courtyard-1');
assert.equal(new Set(entries.map(e=>e.id)).size,entries.length,'duplicate independent id');
assert.equal(new Set(entries.map(e=>e.path)).size,entries.length,'duplicate independent path');
for(const previous of released)assert.deepEqual(entries.find(e=>e.id===previous.id),previous,'published independent entry lost or replaced: '+previous.id);
const historical=JSON.parse(baseText('play-entries.mjs').match(/PLAY_ENTRIES=Object\.freeze\((\[[\s\S]*?\])\.map\(Object\.freeze\)\)/)[1]);
assert.equal(historical.length,99);assert.equal(new Set(historical.map(e=>e.slug)).size,45);
assert.equal(new Set(PLAY_ENTRIES.map(e=>e.path)).size,PLAY_ENTRIES.length,'duplicate historical path');
for(const previous of historical)assert.deepEqual(PLAY_ENTRIES.find(e=>e.path===previous.path),previous,'historical version entry lost or replaced: '+previous.path);
for(const entry of entries){assert(/^(?:experiments)\/[a-z0-9/-]+\/$/.test(entry.path),entry.path);assert(existsSync(entry.path+'index.html'),entry.path);if(entry.token)assert(readFileSync(entry.path+'index.html','utf8').includes(entry.token),entry.path+' stale token');}
const game=readFileSync('experiments/old-house-echoes/courtyard/index.html','utf8');assert(game.includes('已上线试玩')&&game.includes('echoes-courtyard-1'));assert(readFileSync('experiments/old-house-echoes/courtyard/storage.mjs','utf8').includes("SAVE_KEY='classic-games-atlas:old-house-echoes:courtyard:v1'"));
assert(readFileSync('index.html','utf8').includes('id="old-house-local"'));assert(readFileSync('index.html','utf8').includes('./play/?v=echoes-courtyard-1#independent'));
execFileSync('node',['scripts/build-play-index.mjs'],{stdio:'pipe'});
console.log(JSON.stringify({passed:true,base,baseTree,chapter,chapterTree,head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),exactChapterChanges:diff,preservedIndependentEntries:released.length,currentIndependentEntries:entries.length,preservedHistoricalEntries:historical.length,currentHistoricalEntries:PLAY_ENTRIES.length,currentRegisteredWorks:new Set(PLAY_ENTRIES.map(e=>e.slug)).size,evidence:'Historical release scope plus current manifest/index and local-file audit; not deployment or human acceptance.'},null,2));
