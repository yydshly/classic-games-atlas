import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as E from '../../versions/v3/games/brook/engine.mjs';
import * as OLD from '../../versions/v2/games/brook/engine.mjs';
import {LEVELS,UNITS,ENEMIES} from '../../versions/v3/games/brook/levels.mjs';
import {LEVELS as ORIGINAL} from '../../versions/v2/games/brook/levels.mjs';
import * as C from '../../versions/v3/games/brook/campaign.mjs';
import {CampaignStore,KEY} from '../../versions/v3/games/brook/storage.mjs';
import {laneFeedback} from '../../versions/v3/games/brook/lane-feedback.mjs';
import {simulate,firstPlan,secondPlan,finalePlans} from './strategies.mjs';
const checks=[],test=(n,f)=>{f();checks.push(n);};
let first=simulate(0,firstPlan),second=simulate(1,secondPlan),roots=simulate(2,finalePlans.roots),slow=simulate(2,finalePlans.slow),idle=simulate(2,[]),noCollect=simulate(2,finalePlans.roots,{noCollect:true});
function active(s){const g=E.createGame(s.stage);E.start(g);return {...s,phase:'active',resume:E.checkpoint(g)};}
let s=C.fresh();
test('Original two levels/data and engine body unchanged; existing command replay matches old engine',()=>{
 assert.deepEqual(LEVELS.slice(0,2),ORIGINAL);
 assert.equal(fs.readFileSync('versions/v3/games/brook/engine.mjs','utf8').replace(/\r\n/g,'\n'),execFileSync('git',['show','HEAD:versions/v2/games/brook/engine.mjs'],{encoding:'utf8'}).replace(/\r\n/g,'\n'));
 for(const [stage,plan]of [[0,firstPlan],[1,secondPlan]]){
  const r=simulate(stage,plan),g=OLD.createGame(stage);OLD.start(g);let at=0;
  while(g.state==='playing'){while(r.log[at]?.tick===g.ticks)assert(OLD.command(g,r.log[at++]));OLD.update(g,1/60);g.events=[];}
  assert.deepEqual(OLD.snapshot(g),r.snapshot);
 }
});
test('New mixed routes have the original enemy and unit values; two distinct legal approaches win',()=>{
 assert.equal(LEVELS.length,3);assert.equal(LEVELS[2].spawns.length,12);
 assert(roots.state==='won'&&slow.state==='won');assert(roots.stats.triggers>=3&&roots.stats.slowHits===0);
 assert(slow.stats.triggers===0&&slow.stats.slowHits>20&&slow.stats.jumps>roots.stats.jumps);
 for(const r of [first,second,roots,slow])assert.equal(r.snapshot.resource,LEVELS[r.snapshot.level-1].budget+r.stats.collected-r.stats.spent);
});
test('Finite difficulty controls: empty defense and not collecting resources naturally fail',()=>{assert.equal(idle.state,'lost');assert.equal(noCollect.state,'lost');});
test('Third-stage display reads extended data before/after natural spawn and in terminal state',()=>{
 const g=E.createGame(2);assert.equal(laneFeedback(g).warning,false);E.start(g);for(let i=0;i<490;i++)E.update(g,1/60);
 assert(g.enemies.length);assert.equal(laneFeedback(g).warning,false);
 const near={...E.snapshot(g),enemies:g.enemies.map(e=>({...e,x:200}))};assert.deepEqual(laneFeedback(near).rows,[1]);
 assert.equal(laneFeedback(idle.snapshot).warning,false);
});
test('Two original wins progress to third; a real third loss preserves both results and retries only third',()=>{
 s=C.settle(active(s),first.snapshot,first.score);assert.equal(s.phase,'intermission');assert(C.valid(s));
 s=C.settle(active(C.advance(s)),second.snapshot,second.score);assert.equal(s.completed.length,2);
 s=C.settle(active(C.advance(s)),idle.snapshot,idle.score);assert.equal(s.phase,'lost');assert.deepEqual(s.failures,[0,0,1]);const old=JSON.stringify(s.completed);
 s=C.retry(s);assert.equal(s.stage,2);assert.equal(JSON.stringify(s.completed),old);assert(C.valid(s));
});
test('Third result ends campaign exactly once, no fourth or repeated settlement',()=>{
 s=C.settle(active(s),roots.snapshot,roots.score);assert.equal(s.phase,'complete');assert(C.valid(s));assert.equal(C.advance(s),s);assert.equal(C.retry(s),s);assert.equal(C.settle(s,roots.snapshot,roots.score),s);assert.equal(C.summary(s).completed,3);
});
const fake=(raw)=>{const data=new Map(raw),calls=[];let fail=false;return{data,calls,set fail(v){fail=v},getItem(k){calls.push(['get',k]);return data.get(k)??null},setItem(k,v){calls.push(['set',k]);if(fail)throw Error('QuotaExceededError');data.set(k,v)}};};
test('New key only; existing v1/v2 remain exact, terminal record reloads',()=>{const st=fake([['classic-atlas.brook.v2','old-v2']]),store=new CampaignStore(st);assert(store.save(s));assert.equal(new CampaignStore(st).data.phase,'complete');assert.equal(st.data.get('classic-atlas.brook.v2'),'old-v2');assert(st.calls.every(c=>c[1]===KEY));});
test('Third active legal replay restores paused with exact wave/resource/cooldown/world',()=>{
 const g=E.createGame(2);E.start(g);for(let i=0;i<800;i++){if(i===0)assert(E.command(g,{kind:'place',type:'root',row:0,col:6}));E.update(g,1/60);}
 const cp=E.checkpoint(g),r=E.restore(cp);assert(r&&r.state==='paused');
 for(const k of ['ticks','time','resource','cooldown','plants','enemies','bullets','nextSpawn','tokens','stats'])assert.deepEqual(r[k],g[k]);
 const rec={...C.advance(C.settle(active(C.advance(C.settle(active(C.fresh()),first.snapshot,first.score))),second.snapshot,second.score)),phase:'active',resume:cp};
 assert(C.valid(rec));assert.equal(new CampaignStore(fake([[KEY,JSON.stringify(rec)]])).data.stage,2);
});
test('Corrupt/unknown/malformed checkpoint preserved; write failure preserves valid bytes and later success clears',()=>{
 for(const raw of ['{bad',JSON.stringify({...s,version:99}),JSON.stringify({...s,stage:3})]){
  const st=fake([[KEY,raw]]),store=new CampaignStore(st);assert(store.blocked);assert(!store.save(C.fresh()));assert.equal(st.data.get(KEY),raw);
 }
 const raw=JSON.stringify(s),st=fake([[KEY,raw]]),store=new CampaignStore(st);st.fail=true;assert(!store.save(C.fresh()));assert.equal(st.data.get(KEY),raw);assert.equal(store.reason,'write');st.fail=false;assert(store.save(C.fresh()));assert.equal(store.reason,'');
});
console.log(JSON.stringify({passed:true,groups:checks.length,checks,method:'OFFLINE legal command simulation / explicit storage faults; not UI or human fun acceptance.',outcomes:[first,second,roots,slow,idle,noCollect].map((r,i)=>({name:['first','second','roots','slow','idle','noCollect'][i],state:r.state,time:r.time,score:r.score,stats:r.stats})),final:s},null,2));
