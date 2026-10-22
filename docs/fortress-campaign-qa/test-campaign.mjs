import assert from 'node:assert/strict';
import {createGame,start,update,snapshot} from '../../versions/v2/games/fortress/engine.mjs';
import * as C from '../../versions/v3/games/fortress/campaign.mjs';
import {CampaignStore,KEY} from '../../versions/v3/games/fortress/storage.mjs';
import {decide} from './policy.mjs';
const results=[],test=(name,fn)=>{fn();results.push(name);};
function play(stage,win=true){
 const g=createGame(stage,{players:1});start(g);let input={dir:null,fire:false},ticks=0;
 for(let n=0;n<9000&&g.state==='playing';n++){
  if(win&&n%6===0)input=decide(snapshot(g));
  if(!g.player.dead&&(input.dir!==null||input.fire))ticks++;
  update(g,input,1/60);g.events=[];
 }
 assert.equal(g.state,win?'won':'lost');return {game:g,ticks:[ticks]};
}
const first=play(0),loss=play(1,false),second=play(1);
let s=C.fresh();
test('Mode fixed after departure, invalid phase actions are inert',()=>{
 s=C.selectMode(s,2);assert.equal(s.mode,2);s=C.selectMode(s,1);s=C.begin(s);
 assert.equal(C.selectMode(s,2),s);assert.equal(C.advance(s),s);assert(C.validCampaign(s));
});
test('First legal engine win creates exactly one intermission result',()=>{
 s=C.settle(s,first.game,first.ticks);assert.equal(s.phase,'intermission');assert.equal(s.wins.length,1);
 assert.equal(C.settle(s,first.game,first.ticks),s);assert.equal(C.restored(s).data.phase,'intermission');assert(C.validCampaign(s));
});
test('Second legal idle loss retains first result; retry stays second map',()=>{
 s=C.advance(s);assert.equal(s.stage,1);assert.equal(s.phase,'briefing');const prior=JSON.stringify(s.wins[0]);
 s=C.settle(C.begin(s),loss.game,loss.ticks);assert.equal(s.phase,'defeat');assert.equal(s.failures[1],1);
 assert.equal(C.restored(s).data.phase,'defeat');s=C.prepareCurrent(s);assert.equal(s.stage,1);
 assert.equal(JSON.stringify(s.wins[0]),prior);assert.equal(s.phase,'briefing');
});
test('Second win completes two maps; no third, no duplicate result or reward',()=>{
 s=C.settle(C.begin(s),second.game,second.ticks);assert.equal(s.phase,'complete');assert.equal(s.wins.length,2);
 assert.equal(C.advance(s),s);assert.equal(C.prepareCurrent(s),s);assert.equal(C.settle(s,second.game,second.ticks),s);
 assert.equal(C.summary(s).score,first.game.score+second.game.score);assert.equal(C.summary(s).failures,1);assert(C.validCampaign(s));
});
test('Active refresh is current-stage briefing, never a fake battle snapshot',()=>{
 const active=C.begin(C.advance(C.settle(C.begin(C.fresh()),first.game,first.ticks)));
 const r=C.restored(active);assert(r.restartedBattle);assert.equal(r.data.stage,1);assert.equal(r.data.phase,'briefing');assert.equal(r.data.wins.length,1);
});
function storage(initial){
 const data=new Map(initial),calls=[];let fail=false,readFail=false;
 return {data,calls,set fail(v){fail=v;},set readFail(v){readFail=v;},
  getItem(k){calls.push(['get',k]);if(readFail)throw Error('SecurityError');return data.get(k)??null;},
  setItem(k,v){calls.push(['set',k]);if(fail)throw Error('QuotaExceededError');data.set(k,v);}};
}
test('Only new key read/written; valid old v1/v2 bytes untouched',()=>{
 const st=storage([['classic-atlas.fortress.v1','old-v1-bytes'],['classic-atlas.fortress.v2','old-v2-bytes']]),store=new CampaignStore(st);
 assert(store.wasEmpty);assert(store.save(s));assert(st.calls.every(c=>c[1]===KEY));assert.equal(st.data.get('classic-atlas.fortress.v1'),'old-v1-bytes');assert.equal(st.data.get('classic-atlas.fortress.v2'),'old-v2-bytes');
 const copy=new CampaignStore(st);assert.equal(copy.data.phase,'complete');assert.deepEqual(copy.data,s);
});
test('Corrupt/unknown new records preserved and never auto-overwritten',()=>{
 for(const raw of['{bad',JSON.stringify({...s,schema:9}),JSON.stringify({...s,stage:2})]){
  const st=storage([[KEY,raw]]),store=new CampaignStore(st);assert(store.blocked);assert.equal(store.reason,'corrupt');assert(!store.save(C.fresh()));assert.equal(st.data.get(KEY),raw);assert(st.calls.every(c=>c[0]!=='set'));
 }
});
test('Write failure preserves last valid record and later success clears warning',()=>{
 const raw=JSON.stringify(C.fresh()),st=storage([[KEY,raw]]),store=new CampaignStore(st);
 st.fail=true;assert(!store.save(s));assert.equal(store.reason,'write');assert.equal(st.data.get(KEY),raw);
 st.fail=false;assert(store.save(s));assert.equal(store.reason,'');assert.deepEqual(JSON.parse(st.data.get(KEY)),s);
});
test('Read denial never risks writing unknown prior data',()=>{
 const st=storage([[KEY,'unknown-prior']]);st.readFail=true;const store=new CampaignStore(st);
 assert(store.blocked);assert.equal(store.reason,'read');assert(!store.save(s));assert.equal(st.data.get(KEY),'unknown-prior');
});
test('Explicit two-player result-shape fixture keeps separate participation, rejects wrong mode',()=>{
 const fixture=g=>({...g,mode:2,players:[{...g.players[0]},{...g.players[0],lives:2}]});
 let dual=C.begin(C.selectMode(C.fresh(),2));
 assert.throws(()=>C.settle(dual,first.game,[60,120]));
 dual=C.settle(dual,fixture(first.game),[60,120]);
 dual=C.settle(C.begin(C.advance(dual)),fixture(second.game),[180,60]);
 assert(C.validCampaign(dual));assert.equal(C.restored(dual).data.mode,2);
 assert.deepEqual(C.summary(dual).participants,[{number:1,inputSeconds:4},{number:2,inputSeconds:3}]);
});
console.log(JSON.stringify({passed:true,groups:results.length,results,method:'Legal engine simulations, campaign/storage state-machine and explicit storage-failure fixtures. Not browser play or human cooperation.',legalEngineRuns:[first,loss,second].map(x=>({state:x.game.state,stage:x.game.index,time:x.game.time,score:x.game.score,kills:x.game.kills,base:x.game.base.hp})),completed:s},null,2));
