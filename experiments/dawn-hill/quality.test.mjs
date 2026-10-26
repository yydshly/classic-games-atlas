// Finite normal-input and compatibility checks, not real browser/play acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createGame,command,step,getLevel,body,overlap,hint} from './engine.mjs';
import {runner,qualityLowRoute,qualityHighRoute,qualitySmallHighRoute,stageUnpoweredRoute,legacyStageSnapshot} from './routes.mjs';
import {encodeSave,decodeSave,openStore,SAVE_KEY} from './storage.mjs';
const low=qualityLowRoute(),high=qualityHighRoute();
function prefix(route,stage,tick,revision=2){
 const g=command(createGame(0,0,false,null,revision,3),'start');
 for(const run of route.runs){
  if(g.stageIndex===stage&&g.tick===tick)return g;
  if(run.command)command(g,run.command);
  else for(let n=0;n<run.frames;n++){
   if(g.stageIndex===stage&&g.tick===tick)return g;
   assert.equal(g.phase,'playing');step(g,JSON.parse(run.keys));
  }
 }
 assert.fail('normal prefix not reached');
}
const advance=(g,n,keys={})=>{for(let i=0;i<n;i++)step(g,keys);};
test('new full normal routes replay and make a real stop-on-island versus direct-high-crossing choice',()=>{
 for(const route of [low,high]){
  const g=command(createGame(0,0,false,null,2,3),'start');
  for(const run of route.runs){if(run.command)command(g,run.command);else advance(g,run.frames,JSON.parse(run.keys));}
  assert.deepEqual(g,route.game);assert.equal(g.phase,'won');assert.equal(g.journey.completed.length,3);
 }
 const stop=low.observations.find(o=>o.label==='quality-island-rest').game;
 assert(stop.player.grounded&&stop.player.y===420&&stop.player.x>1583&&stop.player.x<1637);
 assert(stop.seeds.includes('ridge-c'));assert(high.game.seeds.includes('ridge-b'));assert(!high.game.seeds.includes('ridge-c'));
 const g=command(createGame(0,0,false,null,2,3),'start');let fromHigh=false,islandTouch=false;
 for(const run of high.runs){if(run.command)command(g,run.command);else for(let n=0;n<run.frames;n++){step(g,JSON.parse(run.keys));if(g.stageIndex===2&&g.player.x>=1510&&g.player.x<1605&&g.player.grounded&&g.player.y===235)fromHigh=true;if(fromHigh&&g.player.x>=1570&&g.player.x<=1650&&g.player.grounded&&g.player.y===420)islandTouch=true;}}
 assert(fromHigh);assert.equal(islandTouch,false);
});
test('five bounded jump holds land on the wide island after normal approach and completely releasing input',()=>{
 const at=low.observations.find(o=>o.label==='quality-low-bank').game;
 for(const held of [45,50,55,60,65]){
  const g=prefix(low,2,at.tick);advance(g,held,{right:true,run:true,jump:true});advance(g,120);
  assert.equal(g.phase,'playing');assert(g.player.grounded);assert.equal(g.player.y,420);
  assert(g.player.x>=1583&&g.player.x<=1637);assert.equal(g.player.vx,0);
  assert.deepEqual(decodeSave(encodeSave(g)),g);const before=structuredClone(g);command(g,'pause');const paused=structuredClone(g);advance(g,120,{right:true,jump:true});assert.deepEqual(g,paused);command(g,'resume');advance(g,120);assert.equal(g.player.x,before.player.x);
 }
 const level=getLevel(low.game);assert.equal(level.width,2680);assert.equal(level.goal,2530);
 assert(level.enemies[2].left-1720>=100);
});
test('both new bounded coarse plans complete; a small entrant has an ordinary low-route completion',()=>{
 for(const run of [qualityLowRoute,qualityHighRoute])assert.equal(run(4).game.phase,'won');
 const small=prefix(stageUnpoweredRoute(),2,0);assert.equal(small.player.big,false);command(small,'start');
 const at=low.runs.findLastIndex(r=>r.command==='start');for(const run of low.runs.slice(at+1))advance(small,run.frames,JSON.parse(run.keys));
 if(small.phase==='playing')advance(small,30,{right:true});assert.equal(small.phase,'won');assert.equal(small.stats.damage,0);assert.equal(small.stats.fruit,0);
 // A big-body plan's later enemy timing is not asserted to work unchanged for a small body.
});
test('one underside jump followed by forward movement and waiting catches the same real fruit without going back',()=>{
 const r=runner();r.until(g=>g.player.x>=362,{right:true});r.advance({},24);r.advance({jump:true},14);
 const hitX=r.game.player.x;r.advance({right:true},36);r.until(g=>g.player.big,{},360);
 assert.equal(r.game.stats.jumps,1);assert.equal(r.game.stats.fruit,1);assert(r.game.player.x>hitX);assert.equal(r.game.player.y,420);
 const f=runner();f.advance({right:true},232);f.advance({},24);f.advance({jump:true},70);f.advance({right:true,run:true},90);f.advance({},100);
 assert(f.game.fruits[0].alive&&f.game.fruits[0].y===420&&f.game.fruits[0].vy===0);
 assert(hint(f.game).includes('已离开匣顶'));assert(!hint(f.game).includes('正落'));
});
test('a real published-r3 input sequence stays on its original geometry through restore and normal continuation',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'dawn-r3-compat-'));
 try{
  for(const p of ['engine.mjs','level.mjs'])writeFileSync(path.join(dir,p),execFileSync('git',['show','4226fc811d51e036caa8568993f75a5ca3c6e85d:experiments/dawn-hill/'+p]));
  const old=await import(pathToFileURL(path.join(dir,'engine.mjs')).href),fixture=JSON.parse(readFileSync(new URL('../../docs/dawn-hill-qa/stage-inputs.json',import.meta.url))).routes[0];
  const a=old.command(old.createGame(),'start'),b=decodeSave(JSON.stringify({version:2,game:a}));let checked=0;
  for(const run of fixture.runs){if(run.command){old.command(a,run.command);command(b,run.command);}else for(let n=0;n<run.frames;n++){const input=JSON.parse(run.keys);old.step(a,input);step(b,input);assert.deepEqual(legacyStageSnapshot(b),a);if(a.stageIndex===2&&a.tick%120===0){assert.deepEqual(decodeSave(encodeSave(b)),b);checked++;}}}
  assert.equal(b.layoutRevision,1);assert.equal(b.phase,'won');assert(checked>10);assert.deepEqual(a,fixture.expected);
  const raw=JSON.stringify({version:2,game:a}),data=new Map([[SAVE_KEY,raw]]),store=openStore(()=>({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)})),loaded=store.load();
  assert.equal(data.get(SAVE_KEY),raw);assert.deepEqual(loaded.journey,a.journey);command(loaded,'retry');assert.equal(loaded.layoutRevision,1);assert.equal(loaded.journey.completed.length,2);
  const restart=store.load();command(restart,'restart');assert.equal(restart.layoutRevision,2);assert.equal(restart.phase,'ready');assert.equal(restart.stageIndex,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('unknown layout identifiers are protected as invalid saves rather than interpreted as a new map (corrupt fixtures)',()=>{
 for(const revision of [0,3,null,'2']){const bad=structuredClone(low.game);bad.layoutRevision=revision;const raw=JSON.stringify({version:2,game:bad}),data=new Map([[SAVE_KEY,raw]]),store=openStore(()=>({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}));store.load();assert(store.protected);assert.equal(data.get(SAVE_KEY),raw);}
});
test('current route checkpoints have no terrain overlap, serialize and recover the same per-map retry state',()=>{
 for(const route of [low,high])for(const o of route.observations){const g=structuredClone(o.game),level=getLevel(g);assert(![...level.terrain,...level.blocks].some(t=>overlap(body(g.player),t)),o.label);const restored=decodeSave(encodeSave(g));assert.deepEqual(restored,g);if(g.stageIndex===2){command(restored,'retry');assert.equal(restored.layoutRevision,2);assert.equal(restored.journey.completed.length,2);assert.equal(restored.player.big,g.entryBig);assert.equal(getLevel(restored).terrain.find(t=>t.id==='stepping-isle').w,80);}}
});

test('a small high-route journey crosses the isle, jumps past the last enemy and reaches the goal without injected state',()=>{
 const route=qualitySmallHighRoute(),g=command(createGame(0,0,false,null,2,3),'start');let highLaunch=false,isleContact=false,farBank=false,bypassed=false,checked=0;
 for(const run of route.runs){if(run.command)command(g,run.command);else for(let n=0;n<run.frames;n++){step(g,JSON.parse(run.keys));if(g.stageIndex===2){checked++;assert.equal(g.phase==='failed',false);assert.equal(g.player.big,false);assert.equal(g.stats.fruit,0);assert.equal(g.stats.damage,0);assert(![...getLevel(g).terrain,...getLevel(g).blocks].some(t=>overlap(body(g.player),t)));if(g.player.grounded&&g.player.y===235&&g.player.x>=1510&&g.player.x<=1605)highLaunch=true;if(highLaunch&&g.player.grounded&&g.player.y===420&&g.player.x>=1570&&g.player.x<=1650)isleContact=true;if(highLaunch&&g.player.grounded&&g.player.y===420&&g.player.x>=1720)farBank=true;if(g.player.x>1935&&g.enemies[2].alive)bypassed=true;if(g.tick%120===0)assert.deepEqual(decodeSave(encodeSave(g)),g);}}}
 assert.deepEqual(g,route.game);assert.equal(g.phase,'won');assert.equal(g.tick,2145);assert.equal(checked,2145);assert(highLaunch&&farBank&&bypassed);assert.equal(isleContact,false);assert.equal(g.retries,0);assert.equal(g.journey.completed.length,3);assert.equal(g.stats.stomps,2);assert.equal(g.enemies[2].alive,true);
});
