import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,command,step,LEVELS,hint} from './engine.mjs';
import {campaignLower,chapterFourRoute,chapterFiveLower,chapterFiveBypass,chapterFiveUpper,chapterSixLower} from './routes.mjs';
import {decodeSave,encodeSave} from './storage.mjs';

const replay=route=>{const g=createGame();command(g,'start');for(const segment of route.runs){
  if(segment.command)assert(command(g,segment.command));
  else for(let i=0;i<segment.frames;i++)step(g,JSON.parse(segment.keys));
}assert.deepEqual(g,route.game);};

test('fourth through sixth chapters replay normal held inputs, keep old completions and finish with six records',()=>{
  for(const route of [chapterFourRoute(),chapterFiveLower(),chapterSixLower()]){
    assert.equal(route.game.phase,'won');assert.equal(route.game.journey.completed.length,route.game.stageIndex+1);
    assert.equal(route.game.journey.completed[0].title,LEVELS[0].title);replay(route);
  }
  const final=chapterSixLower().game;assert.equal(final.stageIndex,5);assert.equal(final.levelVersion,2);assert.equal(final.player.y,440);
  const fourthStep=chapterFourRoute().observations.find(o=>o.label==='box-step-3').snapshot;
  assert.equal(fourthStep.player.support,'box-3');assert.match(hint(fourthStep),/先向上跳.*再按右/);
  assert.equal(final.journey.completed[3].places,1);
  assert.deepEqual([final.run.shots,final.run.hits,final.run.places,final.player.hp],[1,1,0,3]);
  assert.equal(decodeSave(encodeSave(final)).journey.completed.length,6);
});

test('fifth chapter has a real lower clearing and patrol bypass choice',()=>{
  const clear=chapterFiveLower().game,bypass=chapterFiveBypass().game,upper=chapterFiveUpper();
  assert.equal(clear.phase,'won');assert.equal(bypass.phase,'won');assert.equal(upper.game.phase,'won');
  assert.deepEqual([clear.run.shots,clear.run.hits,clear.run.damage,clear.player.hp],[4,4,0,3]);
  assert.deepEqual([bypass.run.shots,bypass.run.hits,bypass.run.damage,bypass.player.hp],[2,2,2,1]);
  assert(bypass.tick<clear.tick);assert(bypass.enemies.slice(2).every(e=>e.alive));
  assert.deepEqual([upper.game.run.shots,upper.game.run.hits,upper.game.run.damage,upper.game.player.hp],[3,3,0,3]);
  assert(upper.game.enemies[0].alive);assert.equal(upper.observations.find(o=>o.label==='upper-avoids-first-patrol').snapshot.player.hp,3);
  replay(upper);
});

test('old three-chapter v1 completion imports without losing records and can enter fourth chapter',()=>{
  const old=campaignLower().game;old.journey.retries.length=3;
  const bytes=JSON.stringify({version:1,game:old}),restored=decodeSave(bytes);
  assert.equal(restored.phase,'won');assert.equal(restored.stageIndex,2);
  assert.deepEqual(restored.journey.completed,old.journey.completed);
  assert.deepEqual(restored.journey.retries,[0,0,0,0,0,0,0]);
  assert(command(restored,'next'));assert.equal(restored.stageIndex,3);assert(command(restored,'start'));
  assert(command(restored,'retry'));assert.equal(restored.journey.retries[3],1);
  assert.deepEqual(old.journey.retries,[0,0,0]);
  const oldPlaying=campaignLower().game;command(oldPlaying,'retry');oldPlaying.journey.retries.length=3;
  const paused=decodeSave(JSON.stringify({version:1,game:oldPlaying}));
  assert.equal(paused.phase,'paused');assert.equal(paused.stageIndex,2);assert.equal(paused.player.x,110);
});

test('spent fifth-chapter box returns at its original supply after a hit and remains saveable',()=>{
  const route=chapterFiveLower(),g=createGame();command(g,'start');let hit=false;
  outer:for(const segment of route.runs){if(segment.command){assert(command(g,segment.command));continue;}
    for(let i=0;i<segment.frames;i++){step(g,JSON.parse(segment.keys));if(g.stageIndex===4&&g.events.some(e=>e.type==='enemy-hit'&&e.enemy==='crawler-1')){hit=true;break outer;}}
  }
  assert(hit);assert.equal(g.boxes[0].mode,'spent');assert.equal(g.enemies[0].alive,false);
  for(let i=0;i<240;i++)step(g,{});
  assert.equal(g.boxes[0].mode,'rest');assert.equal(g.boxes[0].x,LEVELS[4].supplies[0].x);
  assert.equal(decodeSave(encodeSave(g)).phase,'paused');
});

test('fourth-chapter water loss refills the same box once without duplicating crates or hits',()=>{
  const route=chapterFourRoute(),g=createGame();command(g,'start');let holding=false;
  outer:for(const segment of route.runs){if(segment.command){assert(command(g,segment.command));continue;}
    for(let i=0;i<segment.frames;i++){
      if(g.stageIndex===3&&g.player.holding==='box-3'&&g.player.x>=2160){holding=true;break outer;}
      step(g,JSON.parse(segment.keys));
    }
  }
  assert(holding);while(g.player.x<2460)step(g,{right:true});step(g,{action:true});step(g,{});
  for(let i=0;i<180&&g.boxes[3].mode!=='spent';i++)step(g,{});
  assert.equal(g.boxes[3].mode,'spent');assert(g.events.some(e=>e.type==='box-water'&&e.box==='box-3'));
  for(let i=0;i<360;i++)step(g,{});
  assert.equal(g.boxes.length,LEVELS[3].supplies.length);
  assert.equal(g.boxes.filter(b=>b.id==='box-3').length,1);
  assert.equal(g.boxes[3].mode,'rest');assert.equal(g.boxes[3].x,1920);
  assert.equal(g.sources[3].cooldown,0);assert.equal(g.run.hits,0);
  assert.equal(g.events.filter(e=>e.type==='supply'&&e.box==='box-3').length,1);
  assert.equal(decodeSave(encodeSave(g)).phase,'paused');
});

test('water failure and retry in a new chapter preserve the first four completed records',()=>{
  const g=chapterFourRoute().game,old=structuredClone(g.journey.completed);
  assert(command(g,'next'));assert(command(g,'start'));
  for(let i=0;i<1200&&g.phase==='playing';i++){
    const p=g.player,obstacle=LEVELS[4].solids.some(s=>s.material==='cargo'&&s.x>p.x&&s.x-p.x<55)
      ||g.boxes.some(b=>b.mode==='rest'&&b.x>p.x&&b.x-p.x<55);
    step(g,{right:true,jump:p.grounded&&obstacle});
  }
  assert.equal(g.phase,'failed');assert.match(g.result.cause,/水道/);
  assert(command(g,'retry'));assert.equal(g.stageIndex,4);assert.equal(g.player.x,110);
  assert.deepEqual(g.journey.completed,old);assert.equal(g.journey.retries[4],1);
});
