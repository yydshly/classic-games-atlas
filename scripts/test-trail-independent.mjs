// Independent black-box play tests: progression uses public inputs only.
// Never assign player coordinates, health, energy, or clock to win or fail.
import assert from 'node:assert/strict';
import {createGame,start,pause,update,serialize,restore,snapshot} from '../versions/v2/games/trail/engine.mjs';
const DT=1/120;
const summaries=[];
function step(g,input={}){update(g,DT,input);}
function drive(g,{highFood=false,stop=()=>false,max=7000}={}){
 let ticks=0,foods=new Set();
 while(g.state==='playing'&&!stop(g)&&ticks++<max){
  const p=g.player;
  const gap=g.solids.some(s=>s.kind==='ground'&&s.x+s.w<g.width&&s.x+s.w-p.x>0&&s.x+s.w-p.x<39);
  const leaveLedge=highFood&&g.solids.some(s=>s.kind==='ledge'&&s.x>2000&&p.support===s.id&&s.x+s.w-p.x<13);
  const ledge=highFood&&g.solids.some(s=>s.kind==='ledge'&&p.x>s.x-45&&p.x<s.x-25&&!foods.has(s.id));
  if(ledge)for(const s of g.solids)if(s.kind==='ledge'&&p.x>s.x-45&&p.x<s.x-25)foods.add(s.id);
  step(g,{axis:1,jumpHeld:true,jumpPressed:p.grounded&&(gap||ledge||leaveLedge),attackPressed:ticks%40===1});
 }
 return ticks;
}
for(let i=0;i<3;i++){
 const g=createGame(i);start(g);drive(g,{highFood:true});
 assert.equal(g.state,'won',`level ${i+1} reachable`);
 assert.equal(g.lives,3,'normal run should preserve all lives');
 assert(g.stats.jumps>=4,'gap jumping is required');
 assert.equal(g.stats.collected,5,'all five food pickups reachable');
 assert(g.events.some(e=>e.type==='hit'),'projectiles hit');
 assert(g.enemies.every(e=>!e.alive),'all patrols can be defeated');
 assert(g.checkpoint,'checkpoint activates on route');
 const energyEvents=g.events.filter(e=>e.type==='coin').length;
 assert.equal(energyEvents,5);assert(g.energy>0);
 const won=restore(serialize(g));assert.equal(won?.state,'won');
 summaries.push({level:g.level,state:g.state,seconds:+g.time.toFixed(2),lives:g.lives,food:g.stats.collected,jumps:g.stats.jumps});
}
// Food grants energy by contact rather than test state manipulation.
{
 const g=createGame();start(g);let lastEnergy=g.energy;
 for(let i=0;i<400&&!g.stats.collected;i++){lastEnergy=g.energy;step(g,{axis:1});}
 assert.equal(g.stats.collected,1);assert(g.energy>lastEnergy+31);
 const saved=snapshot(g);pause(g);const frozen=serialize(g);
 for(let i=0;i<240;i++)step(g,{axis:1,jumpPressed:true,attackPressed:true});
 assert.equal(serialize(g),frozen,'pause freezes every game field');pause(g);step(g,{axis:1});assert(g.time>saved.time);
}
// Deliberate no-jump run falls repeatedly, loses, then the controller retry pattern resets the same level.
{
 const g=createGame(1);start(g);
 for(let i=0;i<5000&&g.state==='playing';i++)step(g,{axis:1});
 assert.equal(g.state,'lost');assert.equal(g.lives,0);assert.equal(g.deaths,3);assert.equal(g.reason,'跌落');
 const lost=restore(serialize(g));assert.equal(lost?.state,'lost');assert.equal(lost.reason,'跌落');
 const retry=createGame(g.level-1);start(retry);assert.equal(retry.level,2);assert.equal(retry.lives,3);assert.equal(retry.deaths,0);drive(retry);assert.equal(retry.state,'won');
}
// Checkpoint respawn is reached and triggered only with player movement.
{
 const g=createGame();start(g);drive(g,{stop:g=>g.checkpoint});const savedPosition={...g.checkpointPos};
 for(let i=0;i<1000&&g.deaths===0;i++)step(g,{axis:1,attackPressed:i%40===0});
 assert.equal(g.deaths,1);assert.equal(g.player.x,savedPosition.x);assert.equal(g.player.y,savedPosition.y);assert(g.events.some(e=>e.type==='respawn'));
}
// A valid low-energy save receives protection on restore. Exhaustion must still cost a life,
// rather than freezing protection and clock progression forever at energy zero.
{
 const g=createGame();start(g);while(g.energy>1)step(g);
 const loaded=restore(serialize(g));assert.equal(loaded.state,'paused');assert.equal(loaded.player.support,null);assert.equal(loaded.player.coyote,0);pause(loaded);
 for(let i=0;i<240;i++)step(loaded);
 assert.equal(loaded.deaths,1);assert.equal(loaded.lives,2);assert(loaded.energy>50);
}
// Exhaustion alone reaches a terminal state through idle input.
{
 const g=createGame();start(g);for(let i=0;i<6000&&g.state==='playing';i++)step(g);
 assert.equal(g.state,'lost');assert.equal(g.reason,'体力耗尽');assert.equal(restore(serialize(g)).reason,g.reason);
}
// Mutation is limited to malformed serialized data rejection tests, never successful play.
{
 const g=createGame();const bad=edit=>{const data=JSON.parse(serialize(g));edit(data.game);assert.equal(restore(JSON.stringify(data)),null);};
 bad(s=>s.deaths=-1);bad(s=>s.state='lost');bad(s=>s.state='won');bad(s=>s.lives=0);bad(s=>s.player.x=NaN);bad(s=>s.enemies[0].alive='yes');
 assert.equal(restore('{bad'),null);assert.equal(restore('{"version":1}'),null);
}
console.log(JSON.stringify({result:'PASS',runs:summaries,checks:['three-level normal-input completion','five food pickups each','projectile hits','jumping','pause freeze/resume','fall loss','retry','checkpoint respawn','low-energy restore exhaustion','idle loss','save validation']},null,2));
