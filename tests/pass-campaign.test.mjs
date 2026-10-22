import assert from 'node:assert/strict';
import {createGame,build,upgrade,nextWave,deploy,update,checkpoint,restore,TYPES,point,mapFor,MAPS} from '../versions/v3/games/pass/engine.mjs';
import {fresh,valid,enter,retry,settle,CampaignStore,KEY} from '../versions/v3/games/pass/campaign.mjs';
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name)};
const storage=()=>{const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}};
function play(g,branch='snare'){
 const plan=g.mapIndex===0?[['build',4,'bolt'],['upgrade',4,'snare'],...[3,2,1,5].map(i=>['build',i,'mortar'])]:[['build',2,'bolt'],['upgrade',2,branch],['build',3,'mortar'],['build',4,'bolt'],['upgrade',4,branch],['build',1,'mortar'],['build',5,'mortar']];
 for(let n=0;n<3000&&g.state==='playing';n++){
  for(const [kind,id,type]of plan){const t=g.towers.find(t=>t.id===id);if(kind==='build'&&t||kind==='upgrade'&&t?.type===type)continue;if(g.gold>=TYPES[type].cost)(kind==='build'?build:upgrade)(g,id,type);break;}
  if(g.phase==='build')nextWave(g);
  const front=g.enemies.filter(e=>e.hp>0&&!e.escaped).sort((a,b)=>b.d-a.d)[0],l=mapFor(g).length;
  if(front&&front.d>l*.22&&g.cooldown<=0){const at=[.28,.52,.76].map(v=>v*l).find(v=>v>=front.d-18);if(at!==undefined){const p=point(at,g.mapIndex);deploy(g,p.x,p.y);}}
  update(g,.1);if(n%10===0)assert.deepEqual(restore(checkpoint(g)),g);
 }
 assert.equal(g.state,'won');return g;
}
test('fresh isolated key and entry',()=>{const s=fresh();assert(valid(s));const g=enter(s);assert.equal(g.mapIndex,0);assert(valid(s));assert.equal(enter(s),null);assert.equal(KEY,'classic-atlas.pass.campaign.v3')});
let complete;
test('three-map transition and exactly-once settlement',()=>{const s=fresh();for(let i=0;i<3;i++){const g=enter(s);play(g);assert(settle(s,g));assert(!settle(s,g));assert.equal(s.results.length,i+1);assert(valid(s));assert.deepEqual(restore(s.resume),g);}assert.equal(s.phase,'complete');assert.equal(enter(s),null);complete=s});
test('current retry keeps prior map result and resets map only',()=>{const s=structuredClone(complete);s.mapIndex=1;s.phase='battle';s.results=s.results.slice(0,1);s.resume=checkpoint(createGame(1));const before=structuredClone(s.results);const g=retry(s);assert.equal(g.mapIndex,1);assert.equal(g.gold,230);assert.equal(g.hp,12);assert.equal(g.wave,0);assert.deepEqual(g.towers,[]);assert.deepEqual(s.results,before);assert(valid(s))});
test('write failure preserves previous bytes and later success clears warning',()=>{const mem=storage(),st=new CampaignStore(mem);st.save(fresh());const old=mem.getItem(KEY),write=mem.setItem;mem.setItem=()=>{throw Error('QuotaExceededError')};assert.equal(st.save(complete),false);assert.equal(st.reason,'write');assert.equal(mem.getItem(KEY),old);mem.setItem=write;assert(st.save(complete));assert.equal(st.reason,'');assert.equal(new CampaignStore(mem).data.phase,'complete')});
test('corrupt bytes and foreign legacy save are protected',()=>{const mem=storage(),bad='{bad save',old='{"hp":6,"time":217}';mem.values.set(KEY,bad);mem.values.set('classic-atlas.pass.v2.bounded',old);const st=new CampaignStore(mem);assert.equal(st.reason,'corrupt');assert.equal(st.save(fresh()),false);assert.equal(mem.getItem(KEY),bad);assert.equal(mem.getItem('classic-atlas.pass.v2.bounded'),old)});
test('read failure is bounded and playable memory remains',()=>{const st=new CampaignStore({getItem(){throw Error('SecurityError')},setItem(){throw Error()}});assert.equal(st.reason,'read');assert(valid(st.data));assert(enter(st.data));assert.equal(st.save(st.data),false)});
test('invalid map cross-reference and malformed checkpoint refused',()=>{const s=structuredClone(complete);s.resume.mapIndex=0;assert(!valid(s));assert.equal(restore({...createGame(0),gold:999}),null);assert.equal(restore({...createGame(0),time:null}),null);assert.equal(restore({...createGame(0),towers:[{}]}),null)});
test('paused and loss checkpoints retain exact legal model state',()=>{const g=createGame(2);g.state='paused';assert.deepEqual(restore(checkpoint(g)),g);g.state='playing';for(let n=0;n<2000&&g.state!=='lost';n++){if(g.phase==='build')nextWave(g);update(g,.1)}assert.equal(g.state,'lost');assert.deepEqual(restore(checkpoint(g)),g)});
test('new maps also allow heavy specialization under the same budget',()=>{for(const i of[1,2]){const g=play(createGame(i),'heavy');assert(g.gold>=0&&g.hp>0)}});
console.log(JSON.stringify({passed:true,groups:checks,maps:MAPS.length,evidence:'Model/controller storage tests, not normal UI or human/device proof'}));
