// Limited, deterministic strategy evidence. Public input only; no state edits.
import assert from 'node:assert/strict';
import {createGame,start,update} from '../versions/v2/games/trail/engine.mjs';
const DT=1/120;
function play(level,strategy){
 const g=createGame(level);start(g);let ticks=0,foodJump=null,previousDeaths=0;
 const highFood=strategy==='high-platform-food',attack=strategy!=='no-attacks';
 while(g.state==='playing'&&ticks++<18000){
  const p=g.player;
  if(g.deaths!==previousDeaths){foodJump=null;previousDeaths=g.deaths;}
  if(foodJump&&p.grounded)foodJump=null;
  const gap=g.solids.some(s=>s.kind==='ground'&&s.x+s.w<g.width&&s.x+s.w-p.x>0&&s.x+s.w-p.x<39);
  const ledge=highFood&&g.solids.some(s=>s.kind==='ledge'&&p.x>s.x-45&&p.x<s.x-25);
  const leaveLedge=highFood&&g.solids.some(s=>s.kind==='ledge'&&s.x>2000&&p.support===s.id&&s.x+s.w-p.x<13);
  const fruit=strategy==='avoid-all-food'&&g.coins.find(c=>!c.collected&&c.y===310&&c.x-p.x>45&&c.x-p.x<65);
  let jump=p.grounded&&(gap||ledge||leaveLedge||fruit);
  if(p.grounded&&fruit&&!gap)foodJump=fruit;
  // Finish a food-avoidance hop before approaching the following gap.
  const axis=foodJump&&p.x>foodJump.x+15?0:1;
  update(g,DT,{axis,jumpHeld:true,jumpPressed:!!jump,attackPressed:attack&&ticks%40===1});
 }
 return {level:level+1,strategy,state:g.state,seconds:+g.time.toFixed(2),endingEnergy:+g.energy.toFixed(2),food:g.stats.collected,hits:g.events.filter(e=>e.type==='hit').length,deaths:g.deaths,lives:g.lives,jumps:g.stats.jumps,reasons:g.events.filter(e=>e.type==='hurt').map(e=>e.reason)};
}
const results=[];
for(let level=0;level<3;level++)for(const strategy of ['fast-ground-route','high-platform-food','no-attacks','avoid-all-food'])results.push(play(level,strategy));
for(const r of results.filter(r=>['fast-ground-route','high-platform-food'].includes(r.strategy)))assert.equal(r.state,'won');
for(const r of results.filter(r=>r.strategy==='avoid-all-food'))assert.equal(r.food,0,'food avoidance must actually avoid every pickup');
console.log(JSON.stringify({method:'120 Hz fixed-step public inputs; moving right at full speed; gap-triggered jumps; attack tapped every 40 frames when enabled. No-attacks uses the ground route, not an optimized pacifist strategy. Avoid-food hops stop briefly beyond each ground fruit to land safely before the next gap. Run ends at won/lost or 150 simulated seconds.',caveats:['Limited deterministic strategies, not a balance or user-experience proof.','High-platform pickups cost no horizontal distance or time with this policy. They are effectively free if the player executes the jumps correctly.','Deaths reset energy to 72, so ending energy cannot be read alone as a strategy reward.','No-attacks results show this specific policy failing to evade patrols, not that attacks are necessary to win.'],results},null,2));
