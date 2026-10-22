import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createGame,start,pause,update,toggleDraw,inspectDraw,isClaimed,previewCapture,checkpoint,restore,perimeter,LEVELS,WIDTH,HEIGHT} from './engine.mjs';
import {chooseAction,chooseFailureAction,PLANS} from './policy.mjs';
const clone=v=>JSON.parse(JSON.stringify(v)),key=p=>p.y*WIDTH+p.x;
const proofs=[];
function play(index,variant='main',sample=.05){const g=createGame(index);start(g);const commands=[];while(g.state==='playing'){
 const a=chooseAction(g,variant);if(a.toggleDraw){const r=toggleDraw(g);assert.equal(r.ok,true);commands.push({time:g.time,action:'toggleDraw',x:g.player.x,y:g.player.y});}
 update(g,sample,{dir:a.dir});
 }assert.equal(g.state,'won',JSON.stringify({index,variant,state:g.state,percent:g.percent,events:g.events}));assert.ok(restore(checkpoint(g)));proofs.push({level:g.level,variant,sample,plans:PLANS[variant][index],state:g.state,time:g.time,lives:g.lives,percent:g.percent,cuts:g.stats.cuts,commands});return g;}

// Initial authored geometry has no enemy-free disconnected water to claim for free.
for(let i=0;i<3;i++){const g=createGame(i);assert.equal(previewCapture(g,[]).length,0);assert.equal(g.totalClaimable,i===0?280:271);assert.equal(g.percent,0);assert.ok(restore(checkpoint(g)));}

// Capture fixtures are unit-level topology checks, not ordinary UI play.
{
 const g=createGame(),line=Array.from({length:14},(_,i)=>({x:10,y:i+1})),cells=previewCapture(g,line);assert.equal(cells.length,140);assert.ok(cells.every(p=>p.x<=10));assert.ok(!cells.some(p=>p.x===g.enemies[0].x&&p.y===g.enemies[0].y));
 const h=createGame(2);Object.assign(h.enemies[0],{x:5,y:8});Object.assign(h.enemies[1],{x:17,y:8});const twoSeedLine=line.filter(p=>!isClaimed(h,p.x,p.y));const onlyTrail=previewCapture(h,twoSeedLine);assert.equal(onlyTrail.length,twoSeedLine.length);assert.ok(onlyTrail.every(p=>p.x===10));
}

// Safe movement needs explicit arm; an open line cannot be erased by disarming.
{
 const g=createGame();start(g);update(g,.1,{dir:'D'});update(g,.1,{dir:'D'});assert.equal(g.player.y,0);assert.equal(g.trail.length,0);assert.equal(g.lives,3);
 assert.equal(toggleDraw(g).ok,true);update(g,.1,{dir:'D'});assert.equal(g.trail.length,1);assert.equal(inspectDraw(g).ok,false);assert.equal(toggleDraw(g).ok,false);assert.equal(g.drawArmed,true);
 // Immediately stepping back to the safe start is a backtrack, not a free one-cell claim.
 update(g,.1,{dir:'U'});update(g,.04,{dir:'U'});assert.equal(g.lives,2);assert.equal(g.trail.length,0);assert.equal(g.claimedCount,0);assert.equal(g.drawArmed,false);
}

// Every enemy seed is collision-capable; the last life is resolved before a victory check.
{
 const g=createGame();start(g);toggleDraw(g);update(g,.1,{dir:'D'});update(g,.04,{dir:'D'});assert.equal(g.trail.length,1);
 Object.assign(g.enemies[0],{x:2,y:1,dir:3,clock:.31});g.lives=1;g.stats.losses=2;g.percent=100; // collision-priority fixture only
 update(g,.02,{});assert.equal(g.state,'lost');assert.equal(g.lives,0);assert.equal(g.trail.length,0);
}

// Pausing freezes clocks and queued intent is not part of the model or the checkpoint.
{
 const g=createGame(2);start(g);toggleDraw(g);for(let n=0;n<4;n++)update(g,.05,{dir:'D'});pause(g);const frozen=checkpoint(g);update(g,.1,{dir:'R'});assert.deepEqual(checkpoint(g),frozen);
 const r=restore(frozen);assert.deepEqual(r,frozen);start(r);const p={x:r.player.x,y:r.player.y};for(let n=0;n<10;n++)update(r,.05,{});assert.deepEqual({x:r.player.x,y:r.player.y},p);
 const active=clone(frozen);active.state='playing';assert.equal(restore(active).state,'paused');
}

// Model proofs use only the exported normal input and arm action, sampled at 50ms.
for(let i=0;i<3;i++)play(i);
for(const i of [1,2])play(i,'alternate');
// Bounded input sampling checks; these do not emulate a real browser or human.
for(let i=0;i<3;i++)play(i,'main',.1);
for(const i of [1,2])play(i,'alternate',.1);

// Finite, naturally losing legitimate inputs; no injected terminal state.
{
 const g=createGame();start(g);while(g.state==='playing'){const a=chooseFailureAction(g);if(a.toggleDraw)assert.equal(toggleDraw(g).ok,true);update(g,.05,{dir:a.dir});}
 assert.equal(g.state,'lost');assert.equal(g.lives,0);assert.equal(g.claimedCount,0);assert.ok(g.time<3);assert.equal(restore(checkpoint(g)).state,'lost');proofs.push({level:1,variant:'legal-backtrack-failure',state:g.state,time:g.time,lives:g.lives});
}
// A no-movement run ends by the existing shore patrol or deadline, without injected state.
{
 const g=createGame();start(g);while(g.state==='playing')update(g,.1,{});assert.equal(g.state,'lost');assert.ok(g.time<=g.limit);assert.ok(restore(checkpoint(g)));proofs.push({level:1,variant:'no-input-failure',state:g.state,time:g.time,lives:g.lives});
}

// Terminal checkpoint stays terminal. Known malformed records are refused, not repaired.
{
 const w=createGame(),base=checkpoint(w);const invalid=[
  g=>g.level=4,g=>g.grid.claimed[0]=false,g=>g.grid.claimed[30]=1,g=>g.player.x=-1,g=>g.player.clock=5,g=>g.time=NaN,g=>g.ticks=.5,g=>g.lives=4,g=>g.totalClaimable++,g=>g.percent=100,g=>g.stats.filled=1,g=>g.enemies[0].x=0,g=>g.enemies[0].dir=9,g=>g.enemies[0].id=2,g=>g.patroller.index=99,g=>g.patroller.x=0,g=>g.trail=[{x:1,y:1}],g=>g.effects=[{kind:'capture',cells:[{x:-1,y:1}],ttl:.5,duration:.8}],g=>g.events=[{time:-1,text:'bad'}],g=>g.lastCapture={added:1,percent:2,time:0},g=>g.state='won',g=>g.state='lost'
 ];for(const mutate of invalid){const c=clone(base);mutate(c);assert.equal(restore(c),null,String(mutate));}assert.equal(restore(null),null);assert.equal(restore({}),null);assert.deepEqual(checkpoint(w),base);
 const coast=perimeter();assert.equal(new Set(coast.map(key)).size,coast.length);assert.ok(coast.every(p=>p.x===0||p.x===WIDTH-1||p.y===0||p.y===HEIGHT-1));
}
writeFileSync(new URL('./model.json',import.meta.url),JSON.stringify({kind:'bounded-model-proof-not-ui',rules:{playerStep:.12,enemyStep:.32,patrolStep:.38,lives:3},proofs,limits:['No browser, device, human fun or exhaustive reachability claim.','Failed early candidate routes are retained in local evidence, not counted as wins.']},null,2)+'\n');
console.log(JSON.stringify({ok:true,modelWins:proofs.filter(p=>p.state==='won').length,naturalLosses:proofs.filter(p=>p.state==='lost').length,levels:LEVELS.length,proof:'model.json'}));
