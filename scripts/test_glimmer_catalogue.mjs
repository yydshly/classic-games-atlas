// Release-specific compatibility check against the last41-entry publication.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {validateRecommendations} from '../catalogue-load.mjs';
import {rememberPlayReturn,consumePlayReturn} from '../play-return.mjs';
const baseline='8d16aca7710713f986cac0fd6f2300eb83a11e60',read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8')),old=p=>JSON.parse(execFileSync('git',['show',baseline+':'+p],{encoding:'utf8'}));
const d=read('data/games.json'),e=read('data/experiments.json'),c=read('data/comparisons.json'),coverage=read('docs/flow-coverage/coverage.json');
assert.equal(d.games.length,72);assert.equal(d.groups.length,10);assert.deepEqual(e,d.experiments);assert.equal(e.length,36);assert.deepEqual(e.slice(0,35),old('data/experiments.json'));assert.deepEqual(c.items.slice(0,41),old('data/comparisons.json').items);assert.deepEqual(coverage.items.slice(0,41),old('docs/flow-coverage/coverage.json').items);assert.deepEqual(d.games.map(x=>{const copy=structuredClone(x);if(x.id==='diablo-2')delete copy.experiment;return copy;}),old('data/games.json').games);
assert.equal(c.items.length,42);const entry=c.items.at(-1);assert.equal(entry.slug,'glimmer');assert.equal(entry.has_frozen_version,false);assert.equal(entry.levels,3);assert.equal(entry.reference_id,'diablo-2');assert.equal(validateRecommendations(d,c,c.items.filter(x=>Number(x.number)>=35&&Number(x.number)<=40)).length,42);
const store={raw:null,getItem(){return this.raw;},setItem(k,v){this.raw=v;},removeItem(){this.raw=null;}},base='https://example.test/atlas/',href=base+'preview/glimmer/',state={query:'砾光',version:'all',limit:42,y:1930,slug:'glimmer'};
assert(rememberPlayReturn(store,base,href,state,1000));assert.equal(consumePlayReturn(store,base,href,1001).limit,42);assert.equal(consumePlayReturn(store,base,href,1002),null);assert.equal(rememberPlayReturn(store,base,href,{...state,limit:43},1000),false);assert.equal(rememberPlayReturn(store,base,'https://foreign.test/atlas/preview/glimmer/',state,1000),false);assert(rememberPlayReturn(store,base,'preview/windowlife/',{...state,slug:'windowlife',limit:41},1000));
console.log(JSON.stringify({passed:true,catalogue:42,active:38,oldEntriesPreserved:41,classicReferences:72,returnLimit42:true,noInventedFrozenVersion:true}));
