import test from 'node:test';
import assert from 'node:assert/strict';
import {laneFeedback} from '../../versions/v2/games/brook/lane-feedback.mjs';
import {createGame,start,update,snapshot,checkpoint,restore} from '../../versions/v2/games/brook/engine.mjs';
const game=(enemies=[])=>({state:'playing',level:1,enemies});
const enemy=(row,x,hp=90)=>({row,x,hp});
test('display boundary is the left two cells and row numbers match the UI',()=>{
 assert.equal(laneFeedback(game([enemy(1,260.01)])).warning,false);
 assert.deepEqual(laneFeedback(game([enemy(1,260)])),{warning:true,rows:[2],text:'左岸附近：第 2 行有来敌。'});
});
test('simultaneous enemies produce sorted unique lanes',()=>{
 const g=game([enemy(2,200),enemy(0,190),enemy(2,210),enemy(1,240)]);
 assert.deepEqual(laneFeedback(g).rows,[1,2,3]);assert.match(laneFeedback(g).text,/第 1、2、3 行/);
 assert.deepEqual(laneFeedback(g),laneFeedback(g));
});
test('dead enemies and invalid positions cannot leave false warnings',()=>{
 assert.equal(laneFeedback(game([enemy(1,200,0),enemy(0,NaN),enemy(9,200),enemy(.5,200)])).warning,false);
 const g=game([enemy(1,220)]);assert.equal(laneFeedback(g).warning,true);g.enemies[0].hp=0;
 assert.deepEqual(laneFeedback(g),{warning:false,rows:[],text:'左岸附近暂无来敌。'});
});
test('pause retains physical lane information while ready and terminal clear it',()=>{
 const g=game([enemy(1,200)]),view=laneFeedback(g);g.state='paused';assert.deepEqual(laneFeedback(g),view);
 for(const state of ['ready','won','lost']){g.state=state;assert.equal(laneFeedback(g).warning,false);assert.deepEqual(laneFeedback(g).rows,[]);}
});
test('read-only observation cannot change entities or add save fields',()=>{
 const g=Object.freeze({state:'playing',level:1,enemies:Object.freeze([Object.freeze(enemy(1,200))])});
 const before=JSON.stringify(g);assert.equal(laneFeedback(g).warning,true);assert.equal(JSON.stringify(g),before);
});
test('existing checkpoint restores the same warning without storing feedback state',()=>{
 const g=createGame(0);start(g);for(let i=0;i<1455;i++)update(g,1/60);
 const saved=checkpoint(g),view=laneFeedback(g);assert.equal(view.warning,true);assert.deepEqual(checkpoint(g),saved);
 const restored=restore(saved);assert.equal(restored.state,'paused');assert.deepEqual(laneFeedback(restored),view);
});
test('thirty seconds of engine updates are identical with or without feedback',()=>{
 const baseline=createGame(0),observed=createGame(0);start(baseline);start(observed);let warned=false;
 for(let i=0;i<1800;i++){update(baseline,1/60);update(observed,1/60);warned=laneFeedback(observed).warning||warned;
  if(i%60===0)assert.deepEqual(snapshot(observed),snapshot(baseline));}
 assert.ok(warned);assert.deepEqual(snapshot(observed),snapshot(baseline));
});
