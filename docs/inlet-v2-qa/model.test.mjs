import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createGame,start,pause,update,toggleDraw,inspectDraw,isClaimed,previewCapture,checkpoint,restore,perimeter,LEVELS,WIDTH,HEIGHT} from './engine.mjs';
import * as legacy from '../../preview/inlet/engine.mjs';
import {chooseAction,chooseFailureAction,PLANS} from './policy.mjs';
import {audit} from './audit.mjs';
const clone=v=>JSON.parse(JSON.stringify(v)),key=p=>p.y*WIDTH+p.x;
const routes=[];
function play(index,variant='main',sample=.05){const g=createGame(index);start(g);const trace=[];let cuts=0;while(g.state==='playing'){
 const a=chooseAction(g,variant);if(a.toggleDraw)assert.equal(toggleDraw(g).ok,true);update(g,sample,{dir:a.dir});
 if(g.stats.cuts!==cuts){cuts=g.stats.cuts;trace.push(clone(g.lastCapture));}
 }assert.equal(g.state,'won',JSON.stringify({index,variant,state:g.state,percent:g.percent}));assert.equal(g.lives,3);assert.ok(g.objectives.every(o=>o.complete));assert.ok(restore(checkpoint(g)));assert.ok(trace.length>=(index===1?2:index===2?3:1));routes.push({level:g.level,variant,sample,plan:PLANS[variant][index],state:g.state,time:g.time,lives:g.lives,percent:g.percent,cuts:g.stats.cuts,steps:g.stats.steps,objectives:g.objectives.map(({id,percent,complete})=>({id,percent,complete})),trace});return g;}

for(let i=0;i<3;i++){const g=createGame(i),expected=[280,259,236][i];assert.equal(previewCapture(g,[]).length,0);assert.equal(g.totalClaimable,expected);assert.equal(g.objectives.reduce((n,o)=>n+o.total,0),expected);assert.equal(new Set(g.objectives.flatMap(o=>o.cells.map(key))).size,expected);assert.ok(g.objectives.every(o=>o.claimed===0&&!o.complete));assert.ok(restore(checkpoint(g)));assert.equal(restore(legacy.checkpoint(legacy.createGame(i))),null);}

// Controlled topology fixtures; these are not ordinary UI evidence.
{
 const g=createGame(),line=Array.from({length:14},(_,i)=>({x:10,y:i+1}));assert.equal(previewCapture(g,line).length,140);
 g.enemies=[{...g.enemies[0],x:5,y:8},{...g.enemies[0],id:2,x:17,y:8}];const both=previewCapture(g,line);assert.equal(both.length,14);assert.ok(both.every(p=>p.x===10));
}
{
 const g=createGame();start(g);update(g,.1,{dir:'D'});update(g,.1,{dir:'D'});assert.equal(g.player.y,0);assert.equal(toggleDraw(g).ok,true);update(g,.1,{dir:'D'});assert.equal(g.trail.length,1);assert.equal(inspectDraw(g).ok,false);assert.equal(toggleDraw(g).ok,false);update(g,.1,{dir:'U'});update(g,.04,{dir:'U'});assert.equal(g.lives,2);assert.equal(g.trail.length,0);assert.equal(g.claimedCount,0);
 const h=createGame();start(h);toggleDraw(h);update(h,.1,{dir:'D'});update(h,.04,{dir:'D'});Object.assign(h.enemies[0],{x:2,y:1,dir:3,clock:.31});h.lives=1;h.stats.losses=2;h.percent=100;update(h,.02,{});assert.equal(h.state,'lost');assert.equal(h.lives,0);
}

// Global target alone cannot skip an untouched basin; reasons name its real state.
{
 const g=createGame(2);for(const o of g.objectives.slice(0,2))for(const p of o.cells)g.grid.claimed[key(p)]=true;
 for(const e of g.enemies)g.grid.claimed[key(e)]=false;
 Object.assign(g.player,{x:21,y:1});Object.assign(g.enemies[2],{x:16,y:1});g.claimedCount=g.initialClaimable.reduce((n,v,i)=>n+(v&&g.grid.claimed[i]?1:0),0);g.percent=g.claimedCount/g.totalClaimable*100;g.stats.filled=g.claimedCount;g.objectives=checkpoint(g).objectives;start(g);assert.ok(g.percent>=65);assert.equal(g.objectives[2].complete,false);assert.ok(restore(checkpoint(g)));
 toggleDraw(g);for(const dir of ['L','D','R']){update(g,.06,{dir});update(g,.06,{dir});}
 assert.equal(g.state,'playing');assert.ok(g.percent>=65);assert.ok(g.reason.includes('总体已达标'));assert.ok(g.reason.includes('潮湾'));assert.equal(g.objectives[2].complete,false);assert.ok(restore(checkpoint(g)));
}

// Pause/active/terminal recovery, no held movement, and objective integrity.
{
 const g=createGame(2);start(g);toggleDraw(g);for(let n=0;n<4;n++)update(g,.05,{dir:'D'});pause(g);const frozen=checkpoint(g);update(g,.1,{dir:'R'});assert.deepEqual(checkpoint(g),frozen);assert.deepEqual(restore(frozen),frozen);const active=clone(frozen);active.state='playing';const r=restore(active);assert.equal(r.state,'paused');start(r);const p={x:r.player.x,y:r.player.y};for(let n=0;n<5;n++)update(r,.05,{});assert.deepEqual({x:r.player.x,y:r.player.y},p);
 const tamper=clone(frozen);tamper.objectives[0].complete=true;assert.equal(restore(tamper),null);tamper.objectives[0].complete=false;tamper.objectives[0].claimed=3;assert.equal(restore(tamper),null);assert.deepEqual(checkpoint(g),frozen);
}

// First-map mechanics still reproduce the v1 normal-input world exactly.
{
 const g=createGame(),h=legacy.createGame();start(g);legacy.start(h);const fields=['time','ticks','accumulator','state','grid','initialSafe','initialClaimable','player','trail','trailStart','drawArmed','enemies','patroller','lives','stats','effects','claimedCount','percent'];
 while(g.state==='playing'){const a=chooseAction(g);if(a.toggleDraw){toggleDraw(g);legacy.toggleDraw(h);}update(g,.05,{dir:a.dir});legacy.update(h,.05,{dir:a.dir});for(const k of fields)assert.deepEqual(g[k],h[k],k);}
}
for(const sample of [.05,.1]){for(let i=0;i<3;i++)play(i,'main',sample);for(const i of [1,2])play(i,'alternate',sample);}
const losses=[];
for(const kind of ['legal-backtrack','no-input']){const g=createGame();start(g);while(g.state==='playing'){const a=kind==='no-input'?{dir:null}:chooseFailureAction(g);if(a.toggleDraw)toggleDraw(g);update(g,.05,{dir:a.dir});}assert.equal(g.state,'lost');assert.equal(g.claimedCount,0);assert.ok(restore(checkpoint(g)));losses.push({kind,time:g.time,lives:g.lives});}

{
 const base=checkpoint(createGame());const invalid=[g=>g.version=1,g=>g.level=4,g=>g.grid.claimed[0]=false,g=>g.grid.claimed[30]=1,g=>g.player.x=-1,g=>g.player.clock=5,g=>g.time=NaN,g=>g.ticks=.5,g=>g.lives=4,g=>g.totalClaimable++,g=>g.percent=100,g=>g.stats.filled=1,g=>g.enemies[0].x=0,g=>g.enemies[0].dir=9,g=>g.enemies[0].id=2,g=>g.patroller.index=99,g=>g.patroller.x=0,g=>g.trail=[{x:1,y:1}],g=>g.effects=[{kind:'capture',cells:[{x:-1,y:1}],ttl:.5,duration:.8}],g=>g.events=[{time:-1,text:'bad'}],g=>g.lastCapture={added:1,percent:2,time:0},g=>g.state='won',g=>g.state='lost',g=>g.objectives[0].cells.pop(),g=>g.objectives[0].percent=100,g=>g.objectives[0].total=1];for(const mutate of invalid){const c=clone(base);mutate(c);assert.equal(restore(c),null,String(mutate));}assert.equal(restore(null),null);assert.equal(restore({}),null);
 const coast=perimeter();assert.equal(new Set(coast.map(key)).size,coast.length);assert.ok(coast.every(p=>p.x===0||p.x===WIDTH-1||p.y===0||p.y===HEIGHT-1));
}
const audits=audit();for(const a of audits){assert.equal(a.won,0);assert.equal(a.maxChanged,1);assert.equal(a.sweeps.filter(x=>x.won).length,0);assert.equal(a.old.filter(x=>x.won).length,0);}
const coverage=audits.map(({level,initialSafeDirectedEntries,closed,collided,won,maxChanged,sweeps,old})=>({level,kind:'initial-anchor-fixtures-not-ui-or-all-timings',initialSafeDirectedEntries,closed,collided,won,maxChanged,axisSweepTrials:sweeps.length,axisSweepWon:sweeps.filter(x=>x.won).length,old}));
const samplingChecks=routes.filter(r=>r.sample!==.05).map(({level,variant,sample,state,time,lives,cuts,steps,percent})=>({level,variant,sample,state,time,lives,cuts,steps,percent}));
writeFileSync(new URL('./proof.json',import.meta.url),JSON.stringify({kind:'bounded-model-proof-not-ui',version:2,rules:{global:[50,60,65],eachBasin:40,playerStep:.12,enemyStep:.32,patrolStep:.38,lives:3},routes:routes.filter(r=>r.sample===.05),samplingChecks,losses,coverage,limits:['Input strategy and topology fixtures are distinct from ordinary browser UI.','Initial-anchor enumeration fixes initial hazard phase; it is not exhaustive over every later timing.','Each contiguous water trail lies within one initial basin, so it cannot advance other untouched basin objectives.','No claim about human fun or real-device touch/performance.']},null,2)+'\n');
console.log(JSON.stringify({ok:true,modelWins:routes.length,levels:LEVELS.length,naturalLosses:losses.length,initialDirectedCuts:coverage.reduce((n,a)=>n+a.initialSafeDirectedEntries,0),axisSweeps:coverage.reduce((n,a)=>n+a.axisSweepTrials,0),oldStrategies:coverage.reduce((n,a)=>n+a.old.length,0)}));
