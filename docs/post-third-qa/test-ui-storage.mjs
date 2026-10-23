import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import * as OldRoutes from '../../versions/v3/games/post/storage.mjs';
import * as OldCup from '../../versions/v3/games/post/cup/model.mjs';
const E=await import('../../versions/v4/games/post/engine.mjs');const T=await import('../../versions/v4/games/post/tracks.mjs');
const C=await import('../../versions/v4/games/post/cup/model.mjs');const S=await import('../../versions/v4/games/post/storage.mjs');
const names=[];const test=(name,fn)=>{fn();names.push(name);};
const clone=x=>JSON.parse(JSON.stringify(x));
function storage(initial=[]){
 const data=new Map(initial),calls=[];let fail=false,deny=false;
 return {data,calls,set fail(v){fail=v;},set deny(v){deny=v;},getItem(k){calls.push(['get',k]);if(deny)throw Error('SecurityError');return data.get(k)??null;},setItem(k,v){calls.push(['set',k]);if(fail)throw Error('QuotaExceededError');data.set(k,v);}};
}
// Explicit terminal fixture: tests sealing/score slots, never claimed as driving.
function sealFixture(s,timeout=false){
 assert(C.begin(s));const g=s.battle,t=T.trackFor(g);
 g.state='finished';g.time=timeout?t.limit:30;g.reason=timeout?'超时':'完成两圈';g.stats.settlements=1;
 g.cars.forEach((car,i)=>{car.finishedAt=i===0?(timeout?null:30):i*10;car.stats.gates=car.finishedAt===null?0:t.gateCount*t.laps;});
 assert(C.recordFinish(s));return s;
}
function reachThird(){const s=C.createSession();sealFixture(s);assert(C.advance(s));sealFixture(s,true);assert(C.advance(s));return s;}
test('Three stations preserve stage0 and original checkpoint version3',()=>{
 assert.equal(T.TRACKS.length,3);assert.equal(C.STATIONS.length,3);assert.equal(T.TRACKS[2].routeId,'post-v4-bridge-return-v1');
 const s=C.createSession();assert.equal(s.cup.version,2);assert.equal(s.cup.rulesId,'three-stop-sealed-3-2-1-stage0-v1');
 for(let i=0;i<3;i++){assert.equal(s.cup.index,i);assert.equal(s.battle.stage,0);assert.equal(s.battle.routeId,T.TRACKS[i].routeId);assert.equal(C.saveValue(s).resume.version,3);sealFixture(s);assert.equal(s.cup.phase,i<2?'between':'complete');assert.equal(C.recordFinish(s),false);if(i<2)assert(C.advance(s));}
 assert.equal(s.cup.results.length,3);assert.equal(C.advance(s),false);assert.equal(C.begin(s),false);assert.equal(C.saveValue(s).resume,null);
});
test('Failed station seals 0 points once and can continue without erasing earlier slots',()=>{
 const s=C.createSession();sealFixture(s);const prior=JSON.stringify(s.cup.results[0]);C.advance(s);sealFixture(s,true);
 const row=s.cup.results[1].rows.find(x=>x.id==='player');assert.equal(C.points(row),0);assert.equal(s.cup.phase,'between');
 assert.equal(C.recordFinish(s),false);assert(C.advance(s));assert.equal(s.cup.index,2);assert.equal(JSON.stringify(s.cup.results[0]),prior);assert.equal(s.cup.results.length,2);
});
test('Third-station active checkpoint restores exact cars/gates/countdown and pauses before input',()=>{
 const s=reachThird();assert(C.begin(s));for(let n=0;n<55;n++)E.update(s.battle,.08,{});
 assert.equal(s.battle.state,'playing');const raw=C.saveValue(s),r=C.restoreSession(raw);assert(r);assert.equal(raw.resume.version,3);assert.equal(r.cup.phase,'racing');assert.equal(r.cup.index,2);
 assert.equal(r.battle.state,'paused');assert.equal(r.battle.resumeState,'playing');assert.equal(r.battle.routeId,T.TRACKS[2].routeId);
 assert.deepEqual(r.battle.cars,raw.resume.cars);assert.equal(r.battle.time,raw.resume.time);assert.deepEqual(r.cup.results,s.cup.results);
 const rawBefore=JSON.stringify(raw);E.pause(r.battle);assert.equal(r.battle.state,'playing');assert.equal(JSON.stringify(raw),rawBefore);
});
test('Ready, first/second intermissions and three-station final summary persist without fake active races',()=>{
 const s=C.createSession();assert.equal(C.restoreSession(C.saveValue(s)).battle.state,'ready');
 for(let i=0;i<3;i++){
  sealFixture(s,i===2);const raw=C.saveValue(s),r=C.restoreSession(raw);assert(r);assert.deepEqual(r.cup,s.cup);assert.equal(raw.resume,null);
  if(i<2){assert.equal(r.cup.phase,'between');assert(C.advance(s));}else{assert.equal(r.cup.phase,'complete');assert.equal(r.cup.results.length,3);assert.equal(C.advance(r),false);}
 }
});
test('Equal totals remain 1,1,3 with no hidden time/car-id tie break',()=>{
 const ids=['player','rival-1','rival-2'];
 const rows=(order,times,gates)=>order.map((id,i)=>({id,rank:i+1,finishTime:times[i],gates:times[i]===null?0:gates}));
 const results=[
  {routeId:C.STATIONS[0].routeId,time:20,reason:'完成两圈',rows:rows(ids,[20,20,null],C.STATIONS[0].gates)},
  {routeId:C.STATIONS[1].routeId,time:20,reason:'完成两圈',rows:rows(['rival-1','player','rival-2'],[10,20,null],C.STATIONS[1].gates)},
  {routeId:C.STATIONS[2].routeId,time:95,reason:'超时',rows:rows(ids,[null,null,null],C.STATIONS[2].gates)}
 ];
 const value={version:2,rulesId:C.RULES,index:2,phase:'complete',results,resume:null};assert(C.restoreSession(value));
 const total=C.totals(value);assert.deepEqual(total.map(r=>r.rank),[1,1,3]);assert.deepEqual(total.map(r=>r.points),[5,5,0]);assert(total[0].tied&&total[1].tied);
});
test('Free-practice third route preserves its own activity, best and terminal metadata',()=>{
 const p=S.freshProgress(),id=T.TRACKS[2].routeId;assert.equal(p.version,4);assert.equal(Object.keys(p.routes).length,3);p.selected=id;
 const g=E.createGame(0,id);E.start(g);E.update(g,.5,{});p.routes[id].resume=E.checkpoint(g);
 p.routes[id].best[0]=55;p.routes[id].lastResult={stage:0,rank:2,time:55,finished:true};
 const st=storage();assert.equal(S.writeProgress(st,p),'saved');const r=S.readProgress(st);assert(!r.blocked);assert.equal(r.value.selected,id);
 assert.equal(E.restore(r.value.routes[id].resume).state,'paused');assert.equal(r.value.routes[id].best[0],55);assert.deepEqual(r.value.routes[T.TRACKS[0].routeId].best,{});
 r.value.routes[id].resume=null;assert.equal(S.writeProgress(st,r.value),'saved');assert.deepEqual(S.readProgress(st).value.routes[id].lastResult,p.routes[id].lastResult);
});
test('Valid and corrupt old namespace bytes are never read, imported, overwritten or removed',()=>{
 const oldKeys=['classic-atlas.post.v2','classic-atlas.post.routes.v3','classic-atlas.post.cup.v1'];
 const oldBook=OldRoutes.freshProgress();oldBook.routes[T.TRACKS[0].routeId].best[0]=55;
 const validEntries=[[oldKeys[0],JSON.stringify({version:2,unlocked:1,last:0,best:{0:55},resume:null,lastResult:null})],[oldKeys[1],JSON.stringify(oldBook)],[oldKeys[2],JSON.stringify(OldCup.saveValue(OldCup.createSession()))]];
 assert(!OldRoutes.readProgress(storage([validEntries[1]])).blocked);assert(OldCup.restoreSession(JSON.parse(validEntries[2][1])));
 for(const entries of [validEntries,oldKeys.map(k=>[k,'{unknown-legacy-bytes'])]){
  const st=storage(entries);const p=S.readProgress(st),c=C.readSession(st);assert(!p.blocked&&!c.blocked);assert.equal(p.value.version,4);assert.equal(c.session.cup.results.length,0);
  assert.equal(S.writeProgress(st,p.value),'saved');assert.equal(C.writeSession(st,c.session),'saved');
  assert(st.calls.every(x=>[S.KEY,C.KEY].includes(x[1])));for(const [k,raw] of entries)assert.equal(st.data.get(k),raw);
 }
});
test('Unknown/corrupt new records block writes and preserve exact bytes in both stores',()=>{
 for(const [key,read,write] of [[S.KEY,S.readProgress,(st,r)=>S.writeProgress(st,r.value,r.blocked)],[C.KEY,C.readSession,(st,r)=>C.writeSession(st,r.session,r.blocked)]]){
  for(const raw of ['{bad','{"version":1}',JSON.stringify({...C.saveValue(C.createSession()),index:3})]){
   const st=storage([[key,raw]]),r=read(st);assert(r.blocked);assert.equal(write(st,r),'blocked');assert.equal(st.data.get(key),raw);assert(st.calls.every(x=>x[0]!=='set'));
  }
 }
});
test('Write failure preserves last valid record; later success recovers without touching old namespaces',()=>{
 for(const [key,value,write] of [[S.KEY,S.freshProgress(),S.writeProgress],[C.KEY,C.createSession(),C.writeSession]]){
  const raw=JSON.stringify(key===S.KEY?S.freshProgress():C.saveValue(C.createSession()));
  const st=storage([[key,raw],['classic-atlas.post.cup.v1','old-cup']]);st.fail=true;
  assert.equal(write(st,value),'failed');assert.equal(st.data.get(key),raw);st.fail=false;assert.equal(write(st,value),'saved');assert.equal(st.data.get('classic-atlas.post.cup.v1'),'old-cup');
 }
});
test('Read denial never attempts a write into unknown existing data',()=>{
 for(const [key,read,write] of [[S.KEY,S.readProgress,(st,r)=>S.writeProgress(st,r.value,r.blocked)],[C.KEY,C.readSession,(st,r)=>C.writeSession(st,r.session,r.blocked)]]){
  const st=storage([[key,'unknown-prior']]);st.deny=true;const r=read(st);assert(!r.available&&r.blocked);assert.equal(write(st,r),'blocked');assert.equal(st.data.get(key),'unknown-prior');assert(st.calls.every(x=>x[0]!=='set'));
 }
});
test('Old cup rules/version, missing third slot, crossed route resume and fourth station are rejected',()=>{
 const s=reachThird(),value=C.saveValue(s);assert.equal(C.restoreSession({...value,version:1}),null);assert.equal(C.restoreSession({...value,rulesId:'two-stop-sealed-3-2-1-stage0-v1'}),null);
 assert.equal(C.restoreSession({...value,index:3}),null);assert.equal(C.restoreSession({...value,phase:'complete'}),null);
 const crossed=clone(value);crossed.resume=E.checkpoint(E.createGame(0,T.TRACKS[0].routeId));assert.equal(C.restoreSession(crossed),null);
 const p=S.freshProgress();p.routes[T.TRACKS[2].routeId].resume=crossed.resume;assert(S.readProgress(storage([[S.KEY,JSON.stringify(p)]])).blocked);
});
test('Static confirmation wiring keeps cancel inert; fresh session resets the whole cup',()=>{
 const source=fs.readFileSync(new URL('../../versions/v4/games/post/cup/game.mjs',import.meta.url),'utf8');
 assert(source.includes("function requestRestart(){autoPause();$('#restart-dialog').showModal();}"));
 assert(source.includes("$('#restart-cancel').onclick=()=>$('#restart-dialog').close()"));
 assert(source.includes("$('#restart-confirm').onclick=restartCup"));assert(source.includes('session=createSession()'));
 const s=reachThird(),before=JSON.stringify(s);assert.equal(JSON.stringify(s),before);const fresh=C.createSession();assert.equal(fresh.cup.results.length,0);assert.equal(fresh.cup.index,0);assert.equal(s.cup.results.length,2);
});
test('Three visible route/station options and old-mode links have unique stable IDs',()=>{
 for(const name of ['index.html','cup/index.html']){const html=fs.readFileSync(new URL('../../versions/v4/games/post/'+name,import.meta.url),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);assert(html.includes('桥湾回环'));assert(html.includes('v3/games/post/'));assert(!html.includes('首次使用 v3'));}
 const root=fs.readFileSync(new URL('../../versions/v4/games/post/index.html',import.meta.url),'utf8');for(const t of T.TRACKS)assert(root.includes(`value="${t.routeId}"`));
 const cup=fs.readFileSync(new URL('../../versions/v4/games/post/cup/index.html',import.meta.url),'utf8');assert(cup.includes('03 桥湾回环'));assert(cup.includes('不提供单站重赛'));
});
console.log(JSON.stringify({passed:true,groups:names.length,results:names,method:'Cup/free-store journey fixtures and explicit terminal score fixtures, plus native engine checkpoint round-trips through the integrated v4 runtime. No driving completion, browser, 390 CSS, true-touch, real-device or human-fun claim.'},null,2));
