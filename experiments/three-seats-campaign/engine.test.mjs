import assert from 'node:assert/strict';
import { SAVE_KEY, STAGES, FIGHTERS, STEP, createGame, setOrder, start, step, checkpoint, restore } from './engine.mjs';
import { createCampaign, chooseStage, retryStage, recordWin, checkpointCampaign, restoreCampaign } from './campaign.mjs';

assert.equal(STAGES.length, 3);
assert.notEqual(SAVE_KEY, 'classic-atlas.three-seats.slice1.v1');
for (let i = 0; i < 3; i++) {
  const game = createGame(i);
  assert.deepEqual(game.enemyOrder, STAGES[i].order);
  assert.deepEqual(game.teams.enemy.map(f => f.hp), game.enemyOrder.map(id => FIGHTERS[id].maxHp));
  assert.equal(restore(checkpoint(game)).scenario, i);
}
console.log('PASS three public enemy orders, no altered fighter health, isolated save key');

const firstCue = stage => {
  const g=createGame(stage);start(g);
  for(let i=0;i<360;i++){
    step(g,{right:true},STEP);
    if(g.actors.enemy.phase==='startup'||g.actors.enemy.guard)
      return {gap:g.actors.enemy.x-g.actors.player.x, move:g.actors.enemy.move, guard:g.actors.enemy.guard,
        lightReach:FIGHTERS[g.actors.enemy.id].light.reach, turn:g.aiTurn};
  }
  throw Error('No first cue');
};
const opening=STAGES.map((_,i)=>firstCue(i));
assert(opening[0].gap<=opening[0].lightReach+5 && opening[0].move==='heavy' && opening[0].turn===1);
assert(opening[1].gap>opening[1].lightReach+5 && opening[1].move==='heavy' && opening[1].turn===1);
assert(opening[2].guard && opening[2].move===null && opening[2].turn===1);
console.log('PASS chase closes before striking, long reach opens beyond light range, guard stage announces guard first');

const openingBeat=createGame(0);start(openingBeat);
let firstStrike=false, recovered=false, idleFrames=0, secondStrike=false;
for(let i=0;i<360;i++){
  step(openingBeat,{right:!firstStrike},STEP);
  const enemy=openingBeat.actors.enemy;
  if(!firstStrike && enemy.phase==='startup'){firstStrike=true;continue;}
  if(firstStrike && !recovered && enemy.phase==='idle'){recovered=true;continue;}
  if(recovered){
    if(enemy.phase==='startup'){secondStrike=true;break;}
    idleFrames++;
  }
}
assert(firstStrike && recovered && secondStrike && idleFrames>=12,
  `Expected a readable opening counter window, got ${idleFrames} idle frames`);
console.log('PASS opening strike leaves a readable recovery beat before the follow-up');

function play(stage, order, cautious) {
  const g=createGame(stage); assert(setOrder(g,order)); assert(start(g));
  let contact=-1;
  for(let i=0;i<60*80 && !['won','lost'].includes(g.status);i++){
    const a=g.actors.player,b=g.actors.enemy,gap=b.x-a.x;
    if(g.status==='running' && contact<0 && gap<=FIGHTERS[b.id].heavy.reach+5)contact=i;
    const t=contact<0?0:(i-contact)%72,target=FIGHTERS[a.id].light.reach-7;
    const guard=cautious && contact>=0 && gap<=FIGHTERS[b.id].heavy.reach+5 && t<36;
    const right=g.status==='running' && !guard && gap>target;
    const light=g.status==='running' && !guard && gap<=target+8 &&
      (cautious?t>=36 && (i-contact)%12===0:i%24===0);
    step(g,{right,guard,light},STEP);
  }
  return g;
}
const orders=[['reach','swift','anchor'],['anchor','reach','swift'],['anchor','reach','swift']];
const wins=orders.map((order,stage)=>play(stage,order,true));
assert(wins.every(g=>g.status==='won'), wins.map(g=>g.status));
assert.equal(play(1,orders[1],false).status,'lost');
assert.equal(play(2,orders[2],false).status,'lost');
console.log('PASS coarse half-second guard/attack cycles clear three distinct bouts; simple rush can lose');

const c=createCampaign();
assert.equal(chooseStage(c,1),false);
for(let stage=0;stage<3;stage++){
  c.game=wins[stage];assert(recordWin(c));assert.equal(recordWin(c),false);
  assert(c.cleared[stage]?.seconds>0);
  if(stage<2){assert.equal(c.unlocked,stage+1);assert(chooseStage(c,stage+1));}
}
assert(c.cleared.every(Boolean));
const copy=restoreCampaign(checkpointCampaign(c));assert(copy?.cleared.every(Boolean));
assert.equal(copy.stage,2);
const original=JSON.stringify(checkpointCampaign(copy));
const bad=JSON.parse(original);bad.unlocked=0;
assert.equal(restoreCampaign(bad),null);
assert.equal(JSON.stringify(checkpointCampaign(copy)),original);
assert(retryStage(copy));assert.equal(copy.stage,2);assert.equal(copy.game.status,'running');
assert(copy.cleared.every(Boolean));
const paused=restoreCampaign(checkpointCampaign(copy));assert.equal(paused?.game.status,'paused');
assert.equal(paused.game.resumeStatus,'running');
console.log('PASS ordered unlock, win idempotency, stage-only retry, pause-on-restore, malformed save rejection');
