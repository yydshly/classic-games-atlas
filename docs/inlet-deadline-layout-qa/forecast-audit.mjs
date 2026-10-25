import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as E from '../../experiments/inlet-deadline-preview/source/engine.mjs';
import {chooseAction,resetPolicy} from './policy.mjs';
const tally={states:0,forecasts:0,blocked:0,collision:0,safeClosed:0,safeDidNotClose:[]};
function check(g,label){tally.states++;for(const dir of Object.keys(E.DIRECTIONS)){
 const p=E.previewThreat(g,dir);tally.forecasts++;if(!p.ok){tally.blocked++;continue;}if(p.risk!=='safe'){tally.collision++;continue;}
 const sim=E.snapshot(g),cuts=sim.stats.cuts,losses=sim.stats.losses;
 if(sim.state!=='playing')E.start(sim);if(!sim.trail.length&&!sim.drawArmed)E.toggleDraw(sim);
 let steps=0;for(;steps<500&&sim.state==='playing'&&sim.stats.cuts===cuts&&sim.stats.losses===losses;steps++)E.update(sim,E.STEP,{dir});
 if(sim.stats.cuts>cuts){tally.safeClosed++;assert(Math.abs(p.closeIn-(sim.time-g.time))<1e-8,'safe ETA exact');}
 else tally.safeDidNotClose.push({label,level:g.level,time:g.time,dir,player:g.player,closeIn:p.closeIn,steps,state:sim.state,afterTime:sim.time,reason:sim.reason,lifeChange:sim.stats.losses-losses});
 }}
for(const variant of ['main','sheltered'])for(let level=0;level<3;level++){
 resetPolicy();const g=E.createGame(level);E.start(g);let n=0;
 while(g.state==='playing'&&n++<10000){if(n%5===0)check(g,variant);const a=chooseAction(g,variant);if(a.toggleDraw)E.toggleDraw(g);E.update(g,E.STEP,{dir:a.dir});}
 assert.equal(g.state,'won');
}
const g=E.createGame(1);E.start(g);for(let i=0;i<42;i++)E.update(g,E.STEP,{dir:'R'});for(let i=0;i<6;i++)E.update(g,E.STEP,{dir:'D'});
while(g.state==='playing'){if(g.time>82&&g.ticks%5===0)check(g,'late-safe-dyke');E.update(g,E.STEP,{});}
writeFileSync(new URL('./forecast-audit.json',import.meta.url),JSON.stringify(tally,null,2)+'\n');console.log(JSON.stringify({...tally,safeDidNotClose:tally.safeDidNotClose.map(({level,time,dir,closeIn,state,afterTime,lifeChange})=>({level,time,dir,closeIn,state,afterTime,lifeChange}))},null,2));
