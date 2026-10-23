import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as E from '../versions/v3/games/starline/engine.mjs';
import {LEVELS} from '../versions/v3/games/starline/levels.mjs';
import {freshJourney,readJourney,settleJourney,retryJourney,advanceJourney} from '../versions/v3/games/starline/journey.mjs';
import {journeyStorage,KEY} from '../versions/v3/games/starline/storage.mjs';
const plans=JSON.parse(await readFile(new URL('./fixtures/starline-journey-plans.json',import.meta.url)));
function run(stage,actions,dt=.05,jitter=0){const g=E.createGame(stage);E.start(g);for(const a of actions){if(a.swap)assert.ok(E.swap(g));assert.ok(E.fire(g,a.angle+jitter));for(let n=0;g.flight&&n<2000;n++)E.update(g,dt);assert.ok(!g.flight);}return g;}
const old=await readFile(new URL('../versions/v2/games/starline/engine.mjs',import.meta.url),'utf8'),newEngine=await readFile(new URL('../versions/v3/games/starline/engine.mjs',import.meta.url),'utf8');
assert.equal(newEngine.replace('!Number.isInteger(raw.level)||raw.level<1||raw.level>LEVELS.length','![1,2].includes(raw.level)'),old);
assert.equal(LEVELS.length,3);
for(const p of plans)for(const [dt,jitter] of [[1/120,0],[.05,0],[.05,-.001],[.05,.001]])assert.equal(run(p.level-1,p.actions,dt,jitter).state,'won');
for(let stage=0;stage<3;stage++){
 const init=E.createGame(stage);assert.equal(E.anchored(init).size,E.cells(init).length);
 for(let n=0;n<=500;n++)for(const swap of [false,true])assert.notEqual(E.simulateShot(init,-1.25+n*.005,swap).state,'won');
 let g=init;for(let n=0;n<40&&!['won','lost'].includes(g.state);n++)g=E.simulateShot(g,0);assert.equal(g.state,'lost');
 assert.equal(E.restoreSnapshot(E.snapshot(g)).state,'lost');
}
const j=freshJourney();assert.ok(readJourney(j));
for(let i=0;i<3;i++){
 j.phase='active';const lost=E.createGame(i);E.start(lost);while(!['won','lost'].includes(lost.state)){const next=E.simulateShot(lost,0);Object.assign(lost,next);}
 assert.ok(settleJourney(j,lost));assert.equal(j.failures[i],1);assert.equal(settleJourney(j,lost),false);assert.ok(readJourney(j));
 assert.ok(retryJourney(j));assert.equal(j.results.length,i);assert.equal(j.board.stats.shots,0);assert.ok(readJourney(j));
 j.phase='active';const win=run(i,plans.find(p=>p.level===i+1).actions);assert.ok(settleJourney(j,win));assert.equal(settleJourney(j,win),false);assert.ok(readJourney(j));
 const sealed=JSON.stringify(j.results);assert.equal(retryJourney(j),false);assert.equal(JSON.stringify(j.results),sealed);
 if(i<2){assert.ok(advanceJourney(j));assert.equal(advanceJourney(j),false);assert.equal(j.stage,i+1);assert.ok(readJourney(j));}
}
assert.equal(j.phase,'complete');assert.equal(advanceJourney(j),false);assert.equal(j.results.length,3);
for(const mutate of [x=>x.chapter='old',x=>x.board.level=4,x=>x.stage=1,x=>x.results.push(x.results[0]),x=>x.failures[0]=-1]){const raw=structuredClone(j);mutate(raw);assert.equal(readJourney(raw),null);}
const active=freshJourney();active.phase='active';const playing=E.createGame(0);E.start(playing);active.board=E.snapshot(playing);assert.equal(readJourney(active).board.state,'paused');
E.fire(playing,0);active.board=E.snapshot(playing);assert.equal(readJourney(active),null);
let quota=false;const records=new Map([['classic-atlas.starline.v2.descending','old v2 bytes']]);const mock={getItem:k=>records.get(k)??null,setItem:(k,v)=>{if(quota)throw new Error('QuotaExceededError');records.set(k,v);}};
let store=journeyStorage(mock);assert.ok(store.write(j));const valid=records.get(KEY);quota=true;assert.equal(store.write(freshJourney()),false);assert.equal(records.get(KEY),valid);assert.ok(store.message().includes('写入失败'));quota=false;assert.ok(store.write(j));assert.equal(store.status().failed,false);assert.equal(records.get('classic-atlas.starline.v2.descending'),'old v2 bytes');
for(const raw of ['{broken',JSON.stringify({schema:99})]){records.set(KEY,raw);store=journeyStorage(mock);assert.ok(store.status().blocked);assert.equal(store.write(freshJourney()),false);assert.equal(records.get(KEY),raw);}
store=journeyStorage({getItem(){throw Error('SecurityError');}});assert.ok(store.status().blocked);assert.equal(store.write(j),false);
console.log(JSON.stringify({passed:true,alternativeRoutes:6,flightAndJitterRuns:24,oneShotSamples:3006,centralFailure:3,journey:'loss/retry/three settlements/idempotence/refresh/new schema',storage:'write failure + recovery, malformed/read protection, old key preservation'}));
