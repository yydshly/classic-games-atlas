import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createGame,start,update,command,checkpoint,restore,snapshot,deriveStats} from '../preview/glimmer/engine.mjs';
import {chooseInput} from './fixtures/glimmer-policy.mjs';
export function solve(index,weapon='blade',charm='ward',skipSide=false){
 const g=createGame(index,{gear:{weapon:index===0?'worn':weapon,charm:index===2?charm:null}}),trace=[],phases=new Set();start(g);let peakWindups=0;
 // Policy is re-read at 10 Hz and every decision is held for 0.1s, not frame-perfect input.
 while(g.state!=='won'&&g.state!=='lost'&&g.time<150){
  const plan=chooseInput(g,{weapon,charm,skipSide});if(plan.command){let r;if(plan.command.type==='start')r={ok:start(g)};else r=command(g,plan.command);assert.equal(r.ok,true,JSON.stringify(plan.command)+':'+r.reason);trace.push({time:g.time,command:plan.command,reason:r.reason});}
  else for(let i=0;i<3;i++){update(g,1/30,plan.input);if(g.state!=='playing')break;}
  for(const e of g.enemies)if(e.type==='warden')phases.add(e.phase);peakWindups=Math.max(peakWindups,g.enemies.filter(e=>e.state==='windup').length);
  if(g.ticks%30===0)assert.notEqual(restore(checkpoint(g)),null,'invalid checkpoint at '+g.time);
 }
 assert.equal(g.state,'won',JSON.stringify({level:index+1,state:g.state,time:g.time,hp:g.player.hp,pos:{x:g.player.x,y:g.player.y},alive:g.enemies.filter(e=>e.alive),trace}));assert.deepEqual(restore(checkpoint(g)),snapshot(g));
 return {level:g.level,build:g.player.gear,time:g.time,hp:g.player.hp,stats:g.stats,kills:g.kills,phase2:phases.has(2),peakWindups,trace,final:snapshot(g)};
}
const results=[solve(0,'blade'),solve(0,'hammer'),solve(1,'blade','ward'),solve(1,'hammer','spark'),solve(2,'blade','ward'),solve(2,'hammer','spark'),solve(1,'blade','ward',true)];
console.log(JSON.stringify({ok:true,results:results.map(({level,build,time,hp,kills,phase2,stats})=>({level,build,time,hp,kills,phase2,stats}))}));
