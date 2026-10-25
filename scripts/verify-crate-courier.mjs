// Local preservation and runtime dependency audit for this first-level candidate.
// Read-only. Does not fetch, launch a browser, update refs or deploy.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',maxBuffer:8e6});
const args=process.argv.slice(2),scopeAt=args.indexOf('--scope');
const expected=JSON.parse(readFileSync(path.resolve(root,scopeAt<0?'docs/crate-courier-qa/scope.json':args[scopeAt+1]),'utf8'));
const base=expected.baseMain;assert(/^[a-f0-9]{40}$/.test(base));
const changed=git('diff','--name-only',base,'--').trim().split('\n').filter(Boolean);
const added=git('ls-files','--others','--exclude-standard').trim().split('\n').filter(Boolean).concat(changed.filter(p=>!git('ls-tree',base,'--',p).trim()));
const oldModified=changed.filter(p=>git('ls-tree',base,'--',p).trim());
assert.deepEqual(oldModified.sort(),expected.modifiedPaths.slice().sort());
assert.deepEqual([...new Set(added)].sort(),expected.addedPaths.slice().sort());
assert(!added.some(p=>/\.(png|gif|zip|gz|log)$/i.test(p)));
const html=readFileSync(path.join(root,'experiments/crate-courier/index.html'),'utf8');
const runtime=new Set(),versions=new Set();
function visit(ref,from){const [clean,query]=ref.split('?');assert(!/^(https?:|\/)/.test(ref),'external runtime dependency');if(query)versions.add(query);const local=path.posix.normalize(path.posix.join(path.posix.dirname(from),clean));assert(local.startsWith('experiments/crate-courier/'));assert(existsSync(path.join(root,local)),`missing runtime ${local}`);if(runtime.has(local))return;runtime.add(local);const text=readFileSync(path.join(root,local),'utf8');if(local.endsWith('.mjs')){assert(!/sessionStorage|fetch\(|XMLHttpRequest/.test(text),'runtime must stay offline');if(/localStorage/.test(text))assert.equal(local,'experiments/crate-courier/main.mjs','storage access belongs to the isolated adapter');for(const m of text.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g))visit(m[1],local);}}
for(const m of html.matchAll(/(?:href="|import\(')(\.\/(?:main\.mjs)[^'"]*|style\.css[^'"]*)/g))visit(m[1],'experiments/crate-courier/index.html');
assert(runtime.has('experiments/crate-courier/main.mjs'));
assert(runtime.has('experiments/crate-courier/style.css'));
const currentVersion=html.match(/<span>(crate-slice-\d+)<\/span>/)?.[1];assert(currentVersion,'visible runtime version missing');
assert.equal(runtime.size,expected.runtimeFileCount||5);assert.deepEqual([...versions],['v='+currentVersion]);
if(runtime.has('experiments/crate-courier/storage.mjs'))assert(readFileSync(path.join(root,'experiments/crate-courier/storage.mjs'),'utf8').includes("SAVE_KEY='classic-games-atlas:crate-courier:journey:v1'"));
const entries=JSON.parse(readFileSync(path.join(root,'play-entries.mjs'),'utf8').match(/PLAY_ENTRIES=Object\.freeze\((\[[\s\S]*?\])\.map\(Object\.freeze\)\)/)[1]);
assert.equal(entries.length,99);assert.equal(new Set(entries.map(x=>x.slug)).size,45);
const oldFiles=git('ls-tree','-r','--name-only',base).trim().split('\n');
console.log(JSON.stringify({passed:true,baseMain:base,baselineFiles:oldFiles.length,unchangedBaselineFiles:oldFiles.length-oldModified.length,modifiedExisting:oldModified,newFiles:expected.addedPaths.length,registeredWorks:45,registeredEntries:99,runtime:[...runtime].sort(),version:[...versions][0],storage:runtime.has('experiments/crate-courier/storage.mjs')?'one isolated journey key':'no reads or writes',scope:'Git worktree/dependency preservation; not browser UI acceptance'},null,2));
