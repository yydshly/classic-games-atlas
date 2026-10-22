import assert from 'node:assert/strict';
import {createGame,start,pause,update,toggleDraw,previewThreat,checkpoint,restore,WARNING_TIME,STEP} from './engine.mjs';
import * as v2 from '../../versions/v2/preview/inlet/engine.mjs';
import {chooseAction,resetPolicy} from './policy.mjs';
const clone=v=>JSON.parse(JSON.stringify(v));
for(const state of ['ready','paused']){const g=createGame(2);if(state==='paused'){start(g);pause(g);}const before=checkpoint(g),p=previewThreat(g,'D');assert.ok(p.ok);assert.equal(p.risk,'danger');assert.ok(p.enemies.some(e=>e.hitIn!==null));assert.deepEqual(checkpoint(g),before);assert.ok(restore(before));}
{
 const g=createGame(2);start(g);toggleDraw(g);for(let n=0;n<6;n++)update(g,STEP,{dir:'D'});const e=g.enemies[0];assert.equal(e.behavior,'warning');assert.equal(e.tellTimer,WARNING_TIME);const p={x:e.x,y:e.y};for(let n=0;n<10;n++)update(g,STEP,{});assert.deepEqual({x:e.x,y:e.y},p);assert.ok(e.tellTimer>0);assert.ok(restore(checkpoint(g)));pause(g);const frozen=checkpoint(g);update(g,.1,{dir:'R'});assert.deepEqual(checkpoint(g),frozen);start(g);for(let n=0;n<16;n++)update(g,STEP,{});assert.equal(e.behavior,'chasing');assert.ok(e.target);const cp=checkpoint(g);assert.equal(restore(cp).state,'paused');
 for(const mutate of [h=>h.enemies[0].tellTimer=.6,h=>h.enemies[0].target=null,h=>h.enemies[0].behavior='patrol',h=>h.enemies[0].behavior='teleport',h=>h.version=2]){const bad=clone(cp);mutate(bad);assert.equal(restore(bad),null);}
 let previous={x:e.x,y:e.y},clock=e.clock,moves=0;while(g.state==='playing'&&moves<2){update(g,STEP,{});const distance=Math.abs(e.x-previous.x)+Math.abs(e.y-previous.y);assert.ok(distance<=1);if(distance){moves++;previous={x:e.x,y:e.y};assert.ok(e.clock<.03);}}
 assert.equal(g.stats.losses,0);assert.ok(moves>0);
}
// Lesson 1 retains original movement/capture rules and never gains pursuit metadata state.
{
 const g=createGame(),h=v2.createGame();start(g);v2.start(h);resetPolicy();while(g.state==='playing'){const a=chooseAction(g);if(a.toggleDraw){toggleDraw(g);v2.toggleDraw(h);}update(g,.05,{dir:a.dir});v2.update(h,.05,{dir:a.dir});for(const k of ['state','time','player','grid','trail','stats','lives','percent'])assert.deepEqual(g[k],h[k],k);assert.ok(g.enemies.every(e=>e.behavior==='patrol'&&e.tellTimer===0&&e.target===null));}assert.equal(g.state,'won');assert.ok(restore(checkpoint(g)));assert.equal(restore(v2.checkpoint(h)),null);
}
console.log(JSON.stringify({ok:true,checks:['ready/paused preview readonly','warning stationary .5s','original pursuit step speed','pause/restore warning and chasing','malformed pursuit metadata rejected','lesson1 replay exact','version2 checkpoint isolated']}));
