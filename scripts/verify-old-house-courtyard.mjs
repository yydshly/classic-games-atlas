// Scope/preservation audit for the local second-chapter candidate, separate from first-release scope.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {PLAY_ENTRIES} from '../play-entries.mjs';
const base='1410870e14f6bd68212c24343f775fdde1c34fa7',baseTree='12606aba4f49b06dd037e02f5cff8c6bc0601ce3';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const baseText=path=>execFileSync('git',['show',base+':'+path],{encoding:'utf8'});
assert.equal(git('rev-parse',base+'^{tree}'),baseTree,'Local base must match the verified published main tree');
const expected={
 'docs/old-house-echoes-qa/README.md':'M','experiments/old-house-echoes/README.md':'M','experiments/old-house-echoes/index.html':'M','experiments/old-house-echoes/main.mjs':'M',
 'index.html':'M','play/entries.json':'M','play/index.html':'M','scripts/test-old-house-browser.py':'M',
 'experiments/old-house-echoes/courtyard/README.md':'A','experiments/old-house-echoes/courtyard/engine.mjs':'A','experiments/old-house-echoes/courtyard/index.html':'A','experiments/old-house-echoes/courtyard/main.mjs':'A','experiments/old-house-echoes/courtyard/renderer.mjs':'A','experiments/old-house-echoes/courtyard/storage.mjs':'A','experiments/old-house-echoes/courtyard/style.css':'A','experiments/old-house-echoes/courtyard/world.mjs':'A',
 'scripts/old-house-courtyard-routes.mjs':'A','scripts/test-old-house-courtyard-browser.py':'A','scripts/verify-old-house-courtyard.mjs':'A','tests/old-house-courtyard.test.mjs':'A','docs/old-house-echoes-qa/courtyard.md':'A'
};
const diff=git('diff','--name-status',base+'..HEAD').split('\n').filter(Boolean).map(line=>line.split('\t'));
assert.deepEqual(Object.fromEntries(diff.map(([status,path])=>[path,status])),Object.fromEntries(Object.entries(expected).sort()),'Exact second-chapter file scope');
for(const [status,path] of diff){assert(existsSync(path),path);assert(!/\.(png|jpg|jpeg|webp|gif|zip|gz|log)$/i.test(path),path);assert(!path.includes('guide')&&!path.includes('指南'),path);if(status==='A')assert(path.startsWith('experiments/old-house-echoes/courtyard/')||path.startsWith('scripts/')||path.startsWith('tests/')||path.startsWith('docs/old-house-echoes-qa/'));}
for(const path of ['experiments/old-house-echoes/world.mjs','experiments/old-house-echoes/engine.mjs','experiments/old-house-echoes/storage.mjs','experiments/old-house-echoes/input.mjs','experiments/old-house-echoes/renderer.mjs','data/games.json','data/comparisons.json','data/experiments.json','play-entries.mjs','play-recent.mjs'])assert.equal(readFileSync(path,'utf8'),baseText(path),path+' changed');
const entries=JSON.parse(readFileSync('play/entries.json','utf8')),old=JSON.parse(baseText('play/entries.json'));
assert.equal(entries.length,9);assert.deepEqual(entries.slice(1),old);assert.equal(entries[0].id,'old-house-courtyard');assert.equal(entries[0].token,'echoes-courtyard-1');assert(entries[0].label.includes('已上线试玩')&&entries[0].label.includes('线上体验验收中'));
assert.equal(PLAY_ENTRIES.length,99);assert.equal(new Set(PLAY_ENTRIES.map(e=>e.slug)).size,45);
const game=readFileSync('experiments/old-house-echoes/courtyard/index.html','utf8');assert(game.includes('已上线试玩')&&game.includes('echoes-courtyard-1'));assert(readFileSync('experiments/old-house-echoes/courtyard/storage.mjs','utf8').includes("SAVE_KEY='classic-games-atlas:old-house-echoes:courtyard:v1'"));
assert(readFileSync('index.html','utf8').includes('六室续段已上线试玩'));assert(readFileSync('play/index.html','utf8').includes('9</b> 个实验地址'));
console.log(JSON.stringify({passed:true,base,baseTree,head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),exactChanges:diff,firstChapterCoreByteIdentical:true,registeredWorks:45,historicalVersions:99,independentAddresses:9,evidence:'Local source/tree audit; deployment and human acceptance not claimed.'},null,2));
