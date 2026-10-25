import assert from 'node:assert/strict';
import {createGame,start,update,previewThreat,toggleDraw,checkpoint,STEP} from '../experiments/inlet-deadline-preview/source/engine.mjs';
function at(time){const g=createGame(1);start(g);for(let i=0;i<42;i++)update(g,STEP,{dir:'R'});for(let i=0;i<6;i++)update(g,STEP,{dir:'D'});while(g.time<time)update(g,STEP,{});assert.deepEqual([g.player.x,g.player.y],[8,1]);return g;}
const evidence=[];
for(const launch of [84,84.12,84.14,84.16,84.18,84.4,84.8])for(const dir of ['L','R']){
 const g=at(launch),before=checkpoint(g),f=previewThreat(g,dir);assert.deepEqual(checkpoint(g),before);
 toggleDraw(g);while(g.state==='playing'&&!g.stats.cuts)update(g,STEP,{dir});
 const expected=g.state==='lost'&&g.time===85?'timeout':g.stats.losses?'danger':g.stats.cuts?'safe':'incomplete';
 assert.equal(f.risk,expected,`${launch}/${dir}: ${g.reason}`);
 if(expected==='timeout')assert.match(f.reason,/潮时/);
 if(g.stats.cuts)assert(Math.abs(f.closeIn-(g.time-launch))<1e-8,'ETA must equal actual closure time');
 if(expected==='timeout'&&!g.stats.cuts)assert(f.closeIn>g.time-launch,'unfinished closure ETA is after deadline');
 evidence.push({launch,dir,risk:f.risk,closeIn:f.closeIn,hitIn:f.hitIn,actualState:g.state,actualTime:g.time,cuts:g.stats.cuts});
}
// Read-only paused forecasts keep the same deadline outcome; closure-at-deadline copy is distinct.
for(const launch of [84,84.14,84.4]){const g=at(launch);g.state='paused';const before=checkpoint(g),f=previewThreat(g,'L');assert.deepEqual(checkpoint(g),before);if(launch===84.14){assert.equal(f.closed,true);assert.match(f.reason,/连回汀地.*整湾目标/);}if(launch===84.4){assert.equal(f.closed,false);assert.match(f.reason,/0\.60秒/);}}
// Existing collision classification remains separate from timeout.
const collision=previewThreat(createGame(2),'D');assert.equal(collision.risk,'danger');assert(collision.hitIn!==null);

// Runtime UI wiring must not round a real 0.60s into a misleading 1s.
const {readFileSync}=await import('node:fs');
const ui=readFileSync(new URL('../experiments/inlet-deadline-preview/source/game.mjs',import.meta.url),'utf8');
assert(ui.includes("Math.max(0,g.limit-g.time).toFixed(2)+'s'"));
assert(ui.includes("timeout:'潮时不足'"));
assert(ui.includes("f.closed?'闭合时整湾仍将超时':'剩余潮时不足以闭合'"));

// Forecast durations use the same fixed-step phase as actual movement, even before the clock is full.
for(const launch of [.96,.98,1,1.02,1.04,1.06,1.08,84]){
 const g=at(launch),f=previewThreat(g,'L'),time=g.time;toggleDraw(g);
 while(g.state==='playing'&&!g.stats.cuts&&!g.stats.losses)update(g,STEP,{dir:'L'});
 if(g.stats.cuts)assert(Math.abs(f.closeIn-(g.time-time))<1e-8);
 if(g.stats.losses)assert(Math.abs(f.hitIn-(g.time-time))<1e-8);
}
const hitGame=createGame(2);start(hitGame);const hitForecast=previewThreat(hitGame,'D');toggleDraw(hitGame);while(hitGame.state==='playing'&&!hitGame.stats.losses)update(hitGame,STEP,{dir:'D'});assert.equal(hitForecast.risk,'danger');assert(Math.abs(hitForecast.hitIn-hitGame.time)<1e-8);

console.log(JSON.stringify({scope:'legal-input model, not browser/playtest',evidence}));
