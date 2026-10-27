import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {command,step,hint} from './engine.mjs';
import {LEVELS,LEGACY_SIXTH,getLevel} from './levels.mjs';
import {chapterFiveLower,chapterSixLower} from './routes.mjs';
import {decodeSave,encodeSave,openStore,SAVE_KEY} from './storage.mjs';

const fixture=name=>readFileSync(new URL(`./fixtures/legacy-six-${name}.json`,import.meta.url),'utf8').trim();

test('old sixth layout and in-progress/complete saves remain readable without writing old bytes',()=>{
  assert.equal(createHash('sha256').update(JSON.stringify(LEGACY_SIXTH)).digest('hex'),'d80f368e183d95441311ddf0e3ecb5709941e9a7ee7383e389c9ea3e2bcd3e3e');
  let writes=0;const raw=fixture('progress');
  const store=openStore({getItem:key=>key===SAVE_KEY?raw:null,setItem(){writes++;}});
  const progress=store.read();assert.equal(writes,0);assert.equal(progress.phase,'paused');
  assert.equal(progress.levelVersion,undefined);assert.equal(getLevel(progress).width,2640);
  assert.equal(progress.boxes.length,4);assert.equal(raw,fixture('progress'));
  const earlier=structuredClone(progress.journey.completed);
  assert(command(progress,'retry'));assert.equal(progress.levelVersion,1);
  assert.equal(getLevel(progress),LEGACY_SIXTH);assert.equal(progress.boxes.length,4);
  assert.deepEqual(progress.journey.completed,earlier);
  assert.equal(decodeSave(encodeSave(progress)).levelVersion,1);
  const won=decodeSave(fixture('won'));
  assert.equal(won.phase,'won');assert.equal(won.run.hits,4);
  assert.equal(getLevel(won),LEGACY_SIXTH);
  assert(command(won,'next'));assert.equal(won.stageIndex,6);assert.equal(won.levelVersion,2);
  assert.equal(won.journey.completed[5].hits,4);
  assert.equal(decodeSave(encodeSave(won)).journey.completed[5].hits,4);
});

test('new sixth is entered explicitly and ends on the ground with one carried throw',()=>{
  const prior=chapterFiveLower().game,completed=structuredClone(prior.journey.completed);
  assert(command(prior,'next'));assert.equal(prior.stageIndex,5);assert.equal(prior.levelVersion,2);
  assert.equal(getLevel(prior),LEVELS[5]);assert.equal(prior.boxes.length,1);
  assert.deepEqual(prior.journey.completed,completed);
  const route=chapterSixLower(),g=route.game;
  assert.equal(g.phase,'won');assert.equal(g.player.y,440);
  assert.deepEqual([g.run.shots,g.run.hits,g.run.places,g.player.hp],[1,1,0,3]);
  assert(g.tick<decodeSave(fixture('won')).tick);
  assert.equal(decodeSave(encodeSave(g)).phase,'won');
  assert(command(g,'retry'));assert.equal(g.levelVersion,2);
  assert.equal(g.boxes.length,1);assert.deepEqual(g.journey.completed.slice(0,5),completed);
});

test('waiting for the visible patrol turn also permits an unarmed, unharmed finish',()=>{
  const g=chapterFiveLower().game;assert(command(g,'next'));assert(command(g,'start'));
  while(g.player.x<480)step(g,{right:true});
  step(g,{action:true});step(g,{});
  while(g.player.x<590)step(g,{right:true});
  step(g,{right:true,jump:true});
  while(g.player.x<900&&g.phase==='playing')step(g,{right:true});
  let observed=false;
  for(let i=0;i<900;i++){
    if(g.enemies[0].x<980&&g.enemies[0].dir<0){observed=true;break;}
    step(g,{});
  }
  assert(observed);
  step(g,{right:true,jump:true});
  while(g.player.x<1180&&g.phase==='playing')step(g,{right:true});
  step(g,{right:true,jump:true});
  for(let i=0;i<400&&g.phase==='playing';i++)step(g,{right:true});
  assert.equal(g.phase,'won');assert.equal(g.player.hp,3);
  assert.equal(g.run.shots,0);assert.equal(g.run.hits,0);
  assert.equal(g.enemies[0].alive,true);
});

test('new sixth lost box refills at its same source and retry keeps earlier records',()=>{
  const g=chapterFiveLower().game,prior=structuredClone(g.journey.completed);
  assert(command(g,'next'));assert(command(g,'start'));
  while(g.player.x<480)step(g,{right:true});
  step(g,{action:true});step(g,{});assert.equal(g.player.holding,'box-0');
  while(g.player.x<630)step(g,{right:true});
  step(g,{action:true,down:true});
  for(let i=0;i<320;i++)step(g,{});
  assert(g.events.some(e=>e.type==='box-water'));
  assert.equal(g.boxes.length,1);assert.equal(g.boxes[0].mode,'rest');
  assert.equal(g.boxes[0].x,LEVELS[5].supplies[0].x);
  assert.equal(g.events.filter(e=>e.type==='supply').length,1);
  assert.equal(decodeSave(encodeSave(g)).phase,'paused');
  for(let i=0;i<150&&g.phase==='playing';i++)step(g,{right:true});
  assert.equal(g.phase,'failed');assert.match(g.result.cause,/水道/);
  assert(command(g,'retry'));assert.equal(g.levelVersion,2);
  assert.equal(g.journey.retries[5],1);assert.deepEqual(g.journey.completed,prior);
});

test('patrol damage names the cause during the existing blink window',()=>{
  const route=chapterSixLower(),g=chapterFiveLower().game;
  assert(command(g,'next'));assert(command(g,'start'));
  for(const segment of route.runs.slice(chapterFiveLower().runs.length+2)){
    if(segment.command)continue;
    for(let i=0;i<segment.frames;i++){
      if(g.player.x>=810)break;
      step(g,JSON.parse(segment.keys));
    }
    if(g.player.x>=810)break;
  }
  for(let i=0;i<240&&g.run.damage===0;i++)step(g,{right:true});
  assert.equal(g.run.damage,1);assert(g.player.invulnerable>0);
  assert.match(hint(g),/巡逻机撞到你，体力减一/);
  for(let i=0;i<91&&g.phase==='playing';i++)step(g,{});
  assert.equal(g.run.damage,1);
  assert.doesNotMatch(hint(g),/巡逻机撞到你/);
});

test('a real crate hit briefly confirms the result; a miss never claims a hit',()=>{
  const before=chapterFiveLower(),route=chapterSixLower(),g=structuredClone(before.game);
  assert(command(g,'next'));assert(command(g,'start'));
  outer:for(const segment of route.runs.slice(before.runs.length+2)){
    if(segment.command)continue;
    for(let i=0;i<segment.frames;i++){
      step(g,JSON.parse(segment.keys));
      if(g.run.hits===1)break outer;
    }
  }
  assert.equal(g.run.hits,1);
  assert.match(hint(g),/投中巡逻机！这台已清除/);
  step(g,{right:true,jump:true});
  assert.match(hint(g),/投中巡逻机！这台已清除/,'another event must not erase the brief confirmation');
  for(let i=0;i<91&&g.phase==='playing';i++)step(g,{});
  assert.doesNotMatch(hint(g),/投中巡逻机/);

  const miss=structuredClone(before.game);assert(command(miss,'next'));assert(command(miss,'start'));
  while(miss.player.x<480)step(miss,{right:true});
  step(miss,{action:true});step(miss,{});step(miss,{action:true});
  for(let i=0;i<90;i++)step(miss,{});
  assert.equal(miss.run.shots,1);assert.equal(miss.run.hits,0);
  assert.doesNotMatch(hint(miss),/投中巡逻机/);
});
