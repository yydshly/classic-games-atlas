import test from 'node:test';
import assert from 'node:assert/strict';
import {BaseFeedback} from '../../versions/v2/games/fortress/base-feedback.mjs';
import {createGame,start,update,snapshot} from '../../versions/v2/games/fortress/engine.mjs';
const game=()=>({state:'ready',time:0,base:{hp:3},players:[{lives:3}]});
test('initial observation and player hits never impersonate base damage',()=>{
 const g=game(),f=new BaseFeedback(g);assert.equal(f.update(g).message,'');
 g.state='playing';g.players[0].lives=2;g.time=1;assert.equal(f.update(g).kind,'');
 g.base.flash=.5;assert.equal(f.update(g).kind,'');
});
test('actual health loss reports remaining health and a later hit replaces it',()=>{
 const g=game(),f=new BaseFeedback(g);g.state='playing';g.time=10;g.base.hp=2;
 assert.deepEqual(f.update(g),{kind:'hit',label:'基地受击',message:'基地受击 · 耐久 2/3，请回防信标。'});
 g.time=12;g.base.hp=1;assert.match(f.update(g).message,/仅剩 1\/3/);
 g.time=16;assert.equal(f.update(g).kind,'hit');g.time=17;assert.equal(f.update(g).kind,'');
});
test('rendering repeatedly does not extend the notice deadline',()=>{
 const g=game(),f=new BaseFeedback(g);g.state='playing';g.base.hp=2;g.time=2;f.update(g);
 for(const t of [2.1,3,4,6.9]){g.time=t;assert.equal(f.update(g).kind,'hit');}
 g.time=7;assert.equal(f.update(g).label,'共享信标');
});
test('pause preserves the activity-time window and repair supersedes stale health',()=>{
 const g=game(),f=new BaseFeedback(g);g.state='playing';g.base.hp=2;g.time=4;f.update(g);
 g.state='paused';assert.equal(f.update(g).kind,'hit');assert.equal(f.update(g).kind,'hit');
 g.state='playing';g.time=5;g.base.hp=3;assert.match(f.update(g).message,/已修复.*3\/3/);
 g.time=10;assert.equal(f.update(g).message,'');
});
test('terminal result and new preparation take priority over battle prompts',()=>{
 for(const end of ['lost','won']){
  const g=game(),f=new BaseFeedback(g);g.state='playing';g.base.hp=1;f.update(g);
  g.state=end;if(end==='lost')g.base.hp=0;assert.equal(f.update(g).kind,'');
  g.state='ready';g.base.hp=3;g.time=0;f.reset(g);assert.equal(f.update(g).message,'');
 }
});
test('presentation never writes to the observed game or save-shaped fields',()=>{
 const g=Object.freeze({state:'playing',time:1,base:Object.freeze({hp:2}),players:Object.freeze([Object.freeze({lives:1})])});
 const before=JSON.stringify(g),f=new BaseFeedback({base:{hp:3}});assert.equal(f.update(g).kind,'hit');assert.equal(JSON.stringify(g),before);
});
test('thirty seconds of engine updates match with or without feedback observation',()=>{
 const baseline=createGame(0),observed=createGame(0),f=new BaseFeedback(observed);let hitSeen=false;
 start(baseline);start(observed);
 for(let tick=0;tick<1800;tick++){
  update(baseline,{},1/60);update(observed,{},1/60);hitSeen=f.update(observed).kind==='hit'||hitSeen;
  if(tick%60===0)assert.deepEqual(snapshot(observed),snapshot(baseline));
 }
 assert.ok(hitSeen,'fixture must encounter actual engine base damage');
 assert.deepEqual(snapshot(observed),snapshot(baseline));
});
