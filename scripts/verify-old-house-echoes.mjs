// Exact local scope and baseline preservation. No network or browser.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {PLAY_ENTRIES} from '../play-entries.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8'),git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:8e6}).trim();
const scope=JSON.parse(read('docs/old-house-echoes-qa/scope.json')),base=scope.baseMain;
git('merge-base','--is-ancestor',base,'HEAD');assert.equal(git('rev-parse',base+'^{tree}'),scope.baseTree);
const changes=git('diff','--name-status',base,'--').split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
assert(changes.every(s=>/^[AM]\t/.test(s)),'No deletions, moves or type changes allowed');
const modified=changes.filter(s=>s.startsWith('M\t')).map(s=>s.slice(2)).sort(),added=[...new Set([...changes.filter(s=>s.startsWith('A\t')).map(s=>s.slice(2)),...untracked])].sort();
assert.deepEqual(modified,scope.modifiedPaths.slice().sort());assert.deepEqual(added,scope.addedPaths.slice().sort());
for(const p of [...modified,...added]){assert(existsSync(new URL(p,root)));assert(!/\.(png|jpg|jpeg|webp|gif|zip|gz|log)$/i.test(p));assert(!readFileSync(new URL(p,root)).includes(0),'No binary deliverables');}
const baseText=p=>execFileSync('git',['show',base+':'+p],{cwd:root,encoding:'utf8',maxBuffer:8e6});
const rootRestored=read('index.html').replace(/^    <section class="featured-library-heading" id="old-house-local"[^\n]*\n/m,'');assert.equal(rootRestored,baseText('index.html'),'Only one additive homepage section');
const entries=JSON.parse(read('play/entries.json')),oldEntries=JSON.parse(baseText('play/entries.json'));assert.deepEqual(entries.slice(1),oldEntries);assert.equal(entries.length,8);assert.equal(entries[0].id,'old-house-echoes');assert(entries[0].label.includes('未部署'));
assert.equal(PLAY_ENTRIES.length,99);assert.equal(new Set(PLAY_ENTRIES.map(e=>e.slug)).size,45);
for(const p of ['data/games.json','data/comparisons.json','data/experiments.json','play-entries.mjs','play-recent.mjs'])assert.equal(read(p),baseText(p));
const runtime=['world.mjs','engine.mjs','storage.mjs','input.mjs','renderer.mjs','main.mjs'];for(const name of runtime){const text=read('experiments/old-house-echoes/'+name);assert(!/fetch\s*\(|XMLHttpRequest|https?:\/\//.test(text),name+' has no runtime network');for(const m of text.matchAll(/from\s*['"]([^'"]+)['"]/g)){assert(m[1].startsWith('./')&&m[1].endsWith('?v=echoes-slice-1'));assert(existsSync(new URL('experiments/old-house-echoes/'+m[1].split('?')[0],root)));}}
const html=read('experiments/old-house-echoes/index.html');assert(html.includes('echoes-slice-1'));assert(html.includes('返回游戏大厅'));assert(read('experiments/old-house-echoes/storage.mjs').includes("SAVE_KEY='classic-games-atlas:old-house-echoes:rescue:v1'"));
execFileSync('node',['scripts/build-play-index.mjs'],{cwd:root});
const baseline=git('ls-tree','-r','--name-only',base).split('\n').length;
console.log(JSON.stringify({passed:true,baseMain:base,baseTree:scope.baseTree,baselineFiles:baseline,baselineFilesByteIdentical:baseline-modified.length,modified,added,deleted:0,registeredWorks:45,historicalVersions:99,oldExperimentAddresses:7,currentExperimentAddresses:8,evidence:'Local source/tree preservation and generated index checks. Not browser, deployment or human acceptance.'},null,2));
