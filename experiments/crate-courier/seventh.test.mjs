import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,command,step,LEVELS,hint} from './engine.mjs';
import {chapterFiveLower,chapterSixLower,chapterSevenBarrier,chapterSevenClear,chapterSevenLowHealth} from './routes.mjs';
import {decodeSave,encodeSave,openStore,SAVE_KEY} from './storage.mjs';
import {getLevel} from './levels.mjs';
const oldFixture=name=>readFileSync(new URL(`./fixtures/legacy-seven-${name}.json`,import.meta.url),'utf8').trim();

function replayUntil(route,stop){
  const g=createGame();assert(command(g,'start'));
  outer:for(const segment of route.runs){
    if(segment.command){assert(command(g,segment.command));continue;}
    for(let i=0;i<segment.frames;i++){step(g,JSON.parse(segment.keys));if(stop?.(g))break outer;}
  }
  return g;
}

test('placed box turns a patrol early and creates a zero-shot upper alternative to clearing the lower route',()=>{
  const upper=chapterSevenBarrier(),lower=chapterSevenClear();
  for(const route of [upper,lower]){
    assert.equal(route.game.phase,'won');assert.equal(route.game.stageIndex,6);
    assert.equal(route.game.player.hp,3);assert.equal(route.game.journey.completed.length,7);
    assert.deepEqual(replayUntil(route),route.game);
    assert.equal(decodeSave(encodeSave(route.game)).journey.completed.length,7);
  }
  const turn=upper.observations.find(o=>o.label==='box-turns-patrol').snapshot;
  assert.equal(turn.boxes[0].mode,'rest');assert.equal(turn.enemies[0].dir,1);
  assert(turn.enemies[0].x>turn.enemies[0].min+10,'the crate must reverse the patrol before its natural end');
  assert.equal(upper.game.run.shots,0);assert.equal(upper.game.run.places,1);
  assert.equal(lower.game.run.hits,2);assert.equal(lower.game.run.shots,2);
  assert(lower.game.run.jumps<upper.game.run.jumps);
  assert.equal(getLevel(upper.game).goalY,440);assert.equal(upper.game.boxes.length,2);
  assert.equal(lower.game.run.places,0);assert(upper.game.tick>lower.game.tick);
  assert(upper.game.enemies.every(e=>e.alive));assert(lower.game.enemies.every(e=>!e.alive));
  assert.match(hint(turn),/轻放|上层/);
  const boxStep=replayUntil(upper,g=>g.stageIndex===6&&g.player.support==='box-0');
  assert.match(hint(boxStep),/从箱顶朝右跳上第一段货架/);
});

test('two ordinary patrol contacts still leave a one-health route to the seventh station',()=>{
  const route=chapterSevenLowHealth(),g=route.game;
  assert.equal(route.observations.find(o=>o.label==='two-visible-patrol-hits').snapshot.player.hp,1);
  assert.equal(g.phase,'won');assert.equal(g.player.hp,1);assert.equal(g.run.damage,2);
  assert.deepEqual(replayUntil(route),g);
  assert.equal(decodeSave(encodeSave(g)).player.hp,1);
});

test('a completed or in-progress six-chapter save can enter seven without changing old records',()=>{
  const old=chapterSixLower().game;old.journey.retries.length=6;
  const raw=JSON.stringify({version:1,game:old}),completed=structuredClone(old.journey.completed);
  const loaded=decodeSave(raw);assert.equal(loaded.phase,'won');assert.equal(loaded.stageIndex,5);
  assert.equal(loaded.journey.retries.length,7);assert.deepEqual(loaded.journey.completed,completed);
  assert.equal(JSON.stringify({version:1,game:old}),raw,'decoding may not rewrite the old bytes');
  assert(command(loaded,'next'));assert.equal(loaded.stageIndex,6);assert.equal(loaded.levelVersion,2);assert.equal(loaded.boxes.length,2);assert(command(loaded,'start'));
  assert(command(loaded,'retry'));assert.equal(loaded.journey.retries[6],1);
  assert.deepEqual(loaded.journey.completed,completed);assert.equal(decodeSave(encodeSave(loaded)).stageIndex,6);
  const ongoing=chapterSixLower().game;assert(command(ongoing,'retry'));ongoing.journey.retries.length=6;
  const resumed=decodeSave(JSON.stringify({version:1,game:ongoing}));
  assert.equal(resumed.phase,'paused');assert.equal(resumed.stageIndex,5);
  assert.deepEqual(resumed.journey.completed,ongoing.journey.completed);
  assert.equal(resumed.journey.retries.length,7);
});

test('old seventh snapshots keep their original geometry, result and retry without rewriting storage',()=>{
  let writes=0,raw=oldFixture('progress');
  const store=openStore({getItem:key=>key===SAVE_KEY?raw:null,setItem(){writes++;}});
  const progress=store.read();assert.equal(writes,0);assert.equal(progress.phase,'paused');
  assert.equal(progress.levelVersion,undefined);assert.equal(getLevel(progress).goalY,332);
  assert.equal(progress.boxes.length,3);assert.equal(raw,oldFixture('progress'));
  const earlier=structuredClone(progress.journey.completed);
  assert(command(progress,'retry'));assert.equal(progress.levelVersion,1);
  assert.equal(getLevel(progress).goalY,332);assert.equal(progress.boxes.length,3);
  assert.deepEqual(progress.journey.completed,earlier);
  assert.equal(decodeSave(encodeSave(progress)).levelVersion,1);
  const won=decodeSave(oldFixture('won'));
  assert.equal(won.phase,'won');assert.equal(won.levelVersion,undefined);
  assert.equal(getLevel(won).goalY,332);assert.equal(won.journey.completed.length,7);
});

test('the original seventh can still be finished with its exact recorded input',()=>{
  const g=decodeSave(oldFixture('ready'));
  for(const segment of JSON.parse(oldFixture('route'))){
    if(segment.command)assert(command(g,segment.command));
    else for(let i=0;i<segment.frames;i++)step(g,JSON.parse(segment.keys));
  }
  const oldWon=decodeSave(oldFixture('won'));
  assert.equal(g.phase,'won');assert.equal(g.levelVersion,undefined);
  assert.equal(getLevel(g).goalY,332);
  assert.deepEqual(g.journey.completed,oldWon.journey.completed);
  assert.equal(decodeSave(encodeSave(g)).phase,'won');
});

test('the map edition is explicit and malformed or cross-chapter markers are rejected',()=>{
  const seventh=JSON.parse(encodeSave(chapterSevenClear().game));
  seventh.game.levelVersion=3;
  assert.throws(()=>decodeSave(JSON.stringify(seventh)),/关卡版本无效/);
  const sixth=JSON.parse(encodeSave(chapterSixLower().game));
  sixth.game.levelVersion=3;
  assert.throws(()=>decodeSave(JSON.stringify(sixth)),/关卡版本无效/);
  const fifth=JSON.parse(encodeSave(chapterFiveLower().game));
  fifth.game.levelVersion=2;
  assert.throws(()=>decodeSave(JSON.stringify(fifth)),/关卡版本无效/);
});

test('normal input water failure retries only chapter seven, and a lost box refills once',()=>{
  const route=chapterSevenClear();
  const failed=replayUntil(route,g=>g.stageIndex===6&&g.player.x>=590&&g.player.y===440);
  for(let i=0;i<300&&failed.phase==='playing';i++)step(failed,{right:true});
  assert.equal(failed.phase,'failed');assert.match(failed.result.cause,/水道/);
  assert.equal(failed.journey.completed.length,6);assert.equal(failed.player.hp,3);
  const prior=structuredClone(failed.journey.completed);assert(command(failed,'retry'));
  assert.equal(failed.stageIndex,6);assert.equal(failed.player.x,110);
  assert.deepEqual(failed.journey.completed,prior);assert.equal(failed.journey.retries[6],1);

  const spent=replayUntil(route,g=>g.stageIndex===6&&g.run.hits===2);
  assert.equal(spent.boxes[1].mode,'spent');
  for(let i=0;i<350;i++)step(spent,{});
  assert.equal(spent.phase,'playing');assert.equal(spent.boxes[1].mode,'rest');
  assert.equal(spent.boxes[1].x,LEVELS[6].supplies[1].x);
  assert.equal(spent.events.filter(e=>e.type==='supply'&&e.box==='box-1').length,1);
  assert.equal(spent.boxes.filter(b=>b.id==='box-1').length,1);
});
