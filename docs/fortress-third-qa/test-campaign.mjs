import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../../versions/v4/games/fortress/campaign.mjs';
import * as Old from '../../versions/v3/games/fortress/campaign.mjs';
import {CampaignStore,KEY} from '../../versions/v4/games/fortress/storage.mjs';
const results=[];const test=(name,fn)=>{fn();results.push(name);};
// These result-shaped fixtures test the journey, never a completed engine battle.
const result=(stage,mode=1,kind='won')=>({index:stage,mode,state:kind,time:11.5+stage,score:100*(stage+1),kills:kind==='won'?6:2,base:{hp:kind==='won'?3:0},players:Array.from({length:mode},()=>({lives:kind==='won'?2:0})),resultReason:kind==='lost'?'Fixture: base lost':''});
const win=(s)=>C.settle(C.begin(s),result(s.stage,s.mode),[60,120]);
function storage(initial=[]){
 const data=new Map(initial),calls=[];let writeFail=false,readFail=false;
 return {data,calls,set writeFail(v){writeFail=v;},set readFail(v){readFail=v;},
  getItem(k){calls.push(['get',k]);if(readFail)throw Error('SecurityError');return data.get(k)??null;},
  setItem(k,v){calls.push(['set',k]);if(writeFail)throw Error('QuotaExceededError');data.set(k,v);}};
}
let completed;
test('Three sequential wins require two distinct intermissions; final cannot advance or settle twice',()=>{
 let s=C.fresh();assert.equal(s.schema,2);assert.equal(C.STAGE_COUNT,3);assert(C.validCampaign(s));
 for(let stage=0;stage<3;stage++){
  assert.equal(s.stage,stage);s=win(s);assert(C.validCampaign(s));assert.equal(s.wins.length,stage+1);
  assert.equal(C.settle(s,result(stage),[60]),s);
  if(stage<2){assert.equal(s.phase,'intermission');assert.equal(C.restored(s).data.phase,'intermission');s=C.advance(s);assert.equal(s.phase,'briefing');}
 }
 assert.equal(s.phase,'complete');assert.equal(C.advance(s),s);assert.equal(C.prepareCurrent(s),s);
 assert.equal(C.summary(s).score,600);assert.equal(C.summary(s).time,37.5);assert(C.validCampaign(C.restored(s).data));completed=s;
});
test('Loss and retry on each map preserve earlier wins and keep the same map',()=>{
 let s=C.fresh();
 for(let stage=0;stage<3;stage++){
  const prior=JSON.stringify(s.wins);s=C.settle(C.begin(s),result(stage,1,'lost'),[]);
  assert.equal(s.phase,'defeat');assert.equal(s.stage,stage);assert.equal(s.failures[stage],1);assert(C.validCampaign(s));
  assert.deepEqual(C.restored(s).data,s);assert.equal(C.settle(s,result(stage,1,'lost')),s);
  s=C.prepareCurrent(s);assert.equal(s.phase,'briefing');assert.equal(s.stage,stage);assert.equal(JSON.stringify(s.wins),prior);
  s=win(s);if(stage<2)s=C.advance(s);
 }
 assert.deepEqual(s.failures,[1,1,1]);assert.equal(C.summary(s).failures,3);assert.equal(s.phase,'complete');
});
test('Active refresh returns to current briefing for every map, retaining only ended results',()=>{
 let s=C.fresh();
 for(let stage=0;stage<3;stage++){
  const active=C.begin(s),raw=JSON.stringify(active),restored=C.restored(active);
  assert(restored.restartedBattle);assert.equal(restored.data.phase,'briefing');assert.equal(restored.data.stage,stage);
  assert.deepEqual(restored.data.wins,s.wins);assert.equal(JSON.stringify(active),raw);assert(C.validCampaign(restored.data));
  s=win(s);if(stage<2)s=C.advance(s);
 }
});
test('Two-player participation and mode lock survive all three maps',()=>{
 let s=C.selectMode(C.fresh(),2);s=C.begin(s);assert.equal(C.selectMode(s,1),s);
 assert.throws(()=>C.settle(s,result(0,1),[60]));
 for(let stage=0;stage<3;stage++){
  if(stage)s=C.begin(s);s=C.settle(s,result(stage,2),[60*(stage+1),120*(stage+1)]);
  if(stage<2)s=C.advance(s);
 }
 assert(C.validCampaign(s));assert.deepEqual(C.summary(s).participants,[{number:1,inputSeconds:6},{number:2,inputSeconds:12}]);
 assert.equal(C.restored(s).data.mode,2);
});
test('Malformed stage/result/schema and incomplete wins cannot masquerade as a finished journey',()=>{
 for(const bad of [{...completed,schema:1},{...completed,stage:3},{...completed,wins:completed.wins.slice(0,2)},{...completed,failures:[0,0]},{...completed,phase:'intermission'}])assert.equal(C.restored(bad),null);
 const active=C.begin(C.fresh());assert.throws(()=>C.settle(active,result(1)));
 assert.throws(()=>C.settle(active,{...result(0),kills:5}));
 assert.equal(C.advance(C.fresh()).stage,0);assert.equal(C.prepareCurrent(C.fresh()).stage,0);
});
test('V4 reads/writes only its key; valid and corrupt v3 raw bytes are never inspected or changed',()=>{
 let old=Old.settle(Old.begin(Old.fresh()),result(0),[60]);old=Old.settle(Old.begin(Old.advance(old)),result(1),[120]);assert(Old.validCampaign(old));
 for(const raw of [JSON.stringify(old),'{unknown-old-bytes']){
  const st=storage([['classic-atlas.fortress.campaign.v3',raw],['classic-atlas.fortress.v2','v2-raw'],['classic-atlas.fortress.v1','v1-raw']]),store=new CampaignStore(st);
  assert(store.wasEmpty);assert.equal(store.data.phase,'briefing');assert.equal(store.data.wins.length,0);assert(store.save(completed));
  assert(st.calls.every(c=>c[1]===KEY));assert.equal(st.data.get('classic-atlas.fortress.campaign.v3'),raw);
  assert.equal(st.data.get('classic-atlas.fortress.v2'),'v2-raw');assert.equal(st.data.get('classic-atlas.fortress.v1'),'v1-raw');
  assert.deepEqual(new CampaignStore(st).data,completed);
 }
});
test('Corrupt/unknown v4 record is preserved byte-for-byte and blocks writes even for explicit fresh journey',()=>{
 for(const raw of ['{bad',JSON.stringify({...completed,schema:1}),JSON.stringify({...completed,stage:4})]){
  const st=storage([[KEY,raw]]),store=new CampaignStore(st);assert(store.blocked);assert.equal(store.reason,'corrupt');
  assert.equal(store.save(C.fresh()),false);assert.equal(st.data.get(KEY),raw);assert(st.calls.every(c=>c[0]!=='set'));
 }
});
test('Quota/write failures preserve last valid record and later success clears warning',()=>{
 const raw=JSON.stringify(C.fresh()),st=storage([[KEY,raw]]),store=new CampaignStore(st);st.writeFail=true;
 for(let i=0;i<3;i++){assert.equal(store.save(completed),false);assert.equal(store.reason,'write');assert.equal(st.data.get(KEY),raw);}
 st.writeFail=false;assert(store.save(completed));assert.equal(store.reason,'');assert.deepEqual(JSON.parse(st.data.get(KEY)),completed);
});
test('Read denial protects unknown bytes and allows a truthful temporary fresh journey',()=>{
 const st=storage([[KEY,'prior-unknown']]);st.readFail=true;const store=new CampaignStore(st);assert(store.blocked);assert.equal(store.reason,'read');
 assert(C.validCampaign(store.data));assert.equal(store.save(completed),false);assert.equal(st.data.get(KEY),'prior-unknown');assert(st.calls.every(c=>c[0]!=='set'));
});
test('HTML integration has all three unique steps and a persistent original-v3 route',()=>{
 const html=fs.readFileSync(new URL('../../versions/v4/games/fortress/index.html',import.meta.url),'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length);for(let i=0;i<3;i++)assert(ids.includes('step-'+i));
 assert(html.includes('href="../../../v3/games/fortress/"'));assert(html.includes('原两图战役 v3 与记录保留'));
 const game=fs.readFileSync(new URL('../../versions/v4/games/fortress/game.mjs',import.meta.url),'utf8');assert(game.includes("from './engine.mjs'"));assert(game.includes("from './levels.mjs'"));
});
console.log(JSON.stringify({passed:true,groups:results.length,results,method:'Journey/storage state transitions using explicit result-shaped fixtures, storage-error fixtures and static HTML integration checks. No engine win, browser, touch, visual-layout or human-cooperation claim.'},null,2));
