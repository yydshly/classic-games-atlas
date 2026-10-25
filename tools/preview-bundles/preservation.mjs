// Release-scope audit, separate from sustainable source/behavior regression.
// Reads local Git objects only. Never fetches, writes refs or deploys.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {repositoryRoot} from './build.mjs';

const scope=JSON.parse(readFileSync(new URL('./integration-scope.json',import.meta.url),'utf8'));
const args=process.argv.slice(2),at=args.indexOf('--head'),head=at<0?'HEAD':args[at+1];
assert(head&&!head.startsWith('-'),'--head needs a local commit/tree');
const git=(...args)=>execFileSync('git',args,{cwd:repositoryRoot,encoding:'utf8',maxBuffer:8*1024*1024});
const entries=ref=>new Map(git('ls-tree','-r',ref).trim().split('\n').map(line=>{const [meta,path]=line.split('\t');return[path,meta];}));
const before=entries(scope.baseMain),after=entries(head),allowed=new Set(scope.modifiedPaths);
function unexpected(tree){return [...before].filter(([path,blob])=>!tree.has(path)||(!allowed.has(path)&&tree.get(path)!==blob)).map(([path])=>path);}
assert.deepEqual(unexpected(after),[],'an existing main file outside the explicit runtime edit was lost/replaced');
const modified=[...before].filter(([p,b])=>after.get(p)!==b).map(([p])=>p).sort();
assert.deepEqual(modified,[...allowed].sort(),'runtime edit list differs from reviewed scope');
const added=[...after.keys()].filter(p=>!before.has(p)).sort();
assert.deepEqual(added,[...scope.addedPaths].sort(),'new-file list differs from reviewed maintenance scope');
assert(!added.some(p=>/\.(png|gif|gz|zip|log)$/i.test(p)),'excluded offline evidence entered the integration');
const registry=git('show',`${head}:play-entries.mjs`).match(/PLAY_ENTRIES=Object\.freeze\((\[[\s\S]*?\])\.map\(Object\.freeze\)\)/);
assert(registry,'registry cannot be parsed without executing site code');
const plays=JSON.parse(registry[1]),slugs=new Set(plays.map(e=>e.slug));
assert.equal(plays.length,99);assert.equal(slugs.size,45);
assert.equal(new Set(plays.map(e=>e.path)).size,99);
for(const play of plays){const path=play.path+'index.html';assert(before.has(path),`baseline entry missing: ${path}`);assert.equal(after.get(path),before.get(path),`registered game changed: ${path}`);}
const catalogue=JSON.parse(git('show',`${head}:data/comparisons.json`));
assert.deepEqual([...new Set(catalogue.items.map(e=>e.slug))].sort(),[...slugs].sort());
const mutations=[];
if(args.includes('--self-test'))for(const [label,path,remove]of [
  ['game deletion','games/fortress/index.html',true],
  ['other game module replacement','versions/v3/preview/inlet/engine.mjs',false],
  ['homepage replacement','index.html',false],
  ['registry deletion','play-entries.mjs',true],
  ['other experiment physics replacement','experiments/quiet-workbench-preview/physics.mjs',false]
]){const trial=new Map(after);if(remove)trial.delete(path);else trial.set(path,'0'.repeat(40));assert(unexpected(trial).includes(path));mutations.push({label,path,caught:true});}
console.log(JSON.stringify({passed:true,scope:'local Git-tree/registry integrity; no HTTP, browser or gameplay claim',baseMain:scope.baseMain,head,baselineFiles:before.size,addedFiles:added.length,modifiedPaths:modified,preservedBaselineFiles:before.size-modified.length,registeredEntries:plays.length,works:slugs.size,frozenV1Files:[...before.keys()].filter(p=>p.startsWith('versions/v1/')).length,mutationChallenges:mutations},null,2));
