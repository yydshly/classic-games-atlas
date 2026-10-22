// Release-specific compatibility check against the pre-Windowlife baseline.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {validateRecommendations} from '../catalogue-load.mjs';
import {rememberPlayReturn,consumePlayReturn} from '../play-return.mjs';
const base='d564c3551631520199cb6326a5b7b26004924123',read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8')),old=p=>JSON.parse(execFileSync('git',['show',base+':'+p],{encoding:'utf8'}));
const d=read('data/games.json'),e=read('data/experiments.json'),c=read('data/comparisons.json'),coverage=read('docs/flow-coverage/coverage.json');
assert.equal(d.games.length,72);assert.equal(d.groups.length,10);assert.deepEqual(e,d.experiments);assert.equal(e.length,35);assert.deepEqual(e.slice(0,34),old('data/experiments.json'));assert.deepEqual(c.items.slice(0,40),old('data/comparisons.json').items);assert.deepEqual(coverage.items.slice(0,40),old('docs/flow-coverage/coverage.json').items);
assert.deepEqual(d.games.map(x=>{const copy=structuredClone(x);if(x.id==='sims')delete copy.experiment;return copy;}),old('data/games.json').games);
assert.equal(c.items.length,41);const newItem=c.items.at(-1);assert.equal(newItem.slug,'windowlife');assert.equal(newItem.has_frozen_version,false);assert.equal(newItem.levels,3);assert.equal(newItem.reference_id,'sims');assert.equal(validateRecommendations(d,c,c.items.filter(x=>Number(x.number)>=35&&Number(x.number)<=40)).length,41);
const store={raw:null,getItem(){return this.raw;},setItem(k,v){this.raw=v;},removeItem(){this.raw=null;}},url='https://example.test/atlas/',href=url+'preview/windowlife/',state={query:'栖窗',version:'all',limit:41,y:1930,slug:'windowlife'};
assert.equal(rememberPlayReturn(store,url,href,state,1000),true);assert.equal(consumePlayReturn(store,url,href,1001).limit,41);assert.equal(consumePlayReturn(store,url,href,1002),null);assert.equal(rememberPlayReturn(store,url,href,{...state,limit:42},1000),false);assert.equal(rememberPlayReturn(store,url,'https://foreign.test/atlas/preview/windowlife/',state,1000),false);
console.log(JSON.stringify({passed:true,catalogue:41,active:37,preservedOldEntries:40,classicReferences:72,returnLimit41:true,noInventedFrozenVersion:true}));
