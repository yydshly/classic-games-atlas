import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as original from '../../versions/v2/games/fortress/engine.mjs';
import {LEVELS as ORIGINAL_LEVELS} from '../../versions/v2/games/fortress/levels.mjs';
import * as engine from '../../versions/v4/games/fortress/engine.mjs';
import {LEVELS} from '../../versions/v4/games/fortress/levels.mjs';
import {decide} from './policy.mjs';
import {run} from './probe.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
const jsonHash=x=>hash(JSON.stringify(x));
const path=name=>new URL(['engine.mjs','levels.mjs','./engine.mjs','./levels.mjs'].includes(name)?'../../versions/v4/games/fortress/'+name.replace('./',''):name,import.meta.url);
const oldEngine=await readFile(path('../../versions/v2/games/fortress/engine.mjs'));
const newEngine=await readFile(path('./engine.mjs'));
assert.ok(oldEngine.equals(newEngine),'No engine rules or physical constants changed');
const oldLevels=await readFile(path('../../versions/v2/games/fortress/levels.mjs'));
const newLevels=await readFile(path('./levels.mjs'));
const prefix=oldLevels.subarray(0,oldLevels.lastIndexOf(Buffer.from('];'))).toString().trimEnd();
assert.ok(newLevels.subarray(0,Buffer.byteLength(prefix)).equals(Buffer.from(prefix)),'Old level source bytes remain before appended level');
assert.deepEqual(LEVELS.slice(0,2),ORIGINAL_LEVELS);
assert.equal(LEVELS.length,3);
assert.equal(LEVELS[2].queue.length,6);
assert.equal(LEVELS[2].spawnGap,12);
assert.equal(LEVELS[2].maxActive,2);
for(const row of LEVELS[2].map){assert.equal(row.length,25);assert.match(row,/^[SBW.]+$/);}
const replay=[];
for(let i=0;i<2;i++){
 const a=original.createGame(i),b=engine.createGame(i);original.start(a);engine.start(b);
 for(let frame=0;frame<2400;frame++){
  const input={dir:[null,0,1,2,3][Math.floor(frame/53)%5],fire:frame%7!==0};
  original.update(a,input,1/60);engine.update(b,input,1/60);
  assert.deepEqual(b,a,`Original map ${i+1}, replay frame ${frame}`);
 }
 replay.push({map:i+1,frames:2400,actualTime:a.time,state:a.state,fullStateSHA256:jsonHash(a)});
}
const freeze=x=>{Object.freeze(x);for(const v of Object.values(x))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);return x;};
const readOnly=freeze(engine.snapshot(engine.createGame(2))),before=JSON.stringify(readOnly);
for(const strategy of ['flank','breach','overextend']){const a=decide(readOnly,{strategy});assert.ok(a.dir===null||[0,1,2,3].includes(a.dir));assert.equal(typeof a.fire,'boolean');}
assert.equal(JSON.stringify(readOnly),before);
// Declared structural fixture only: opening a copied map is not ordinary play.
const closed=engine.createGame(2),opened=engine.createGame(2);
for(const [x,y] of [[11,18],[11,14]]){opened.tiles[y][x]='.';opened.brickHP[y][x]=0;}
const point=(x,y)=>({x:x*24+12,y:y*24+12});
const cross=(g,a,b)=>engine.route(g,point(...a),point(...b),{includeBricks:false}).length;
const firstSouthBlock=g=>{for(let y=18;y<=23;y++)if(['B','S'].includes(g.tiles[y][11]))return{x:11,y,type:g.tiles[y][11]};return null;};
const structureFixture={kind:'Static copied-map comparison, not an input replay or UI evidence',lowerGate:{from:[11,19],to:[11,17],closedSteps:cross(closed,[11,19],[11,17]),openedSteps:cross(opened,[11,19],[11,17])},upperGate:{from:[11,15],to:[11,13],closedSteps:cross(closed,[11,15],[11,13]),openedSteps:cross(opened,[11,15],[11,13])},southRayFrom:[11,17],closedFirstBlockingTile:firstSouthBlock(closed),openedFirstBlockingTile:firstSouthBlock(opened),baseCoverStillIntact:[[11,22],[12,22],[13,22],[11,23],[13,23]].every(([x,y])=>opened.tiles[y][x]==='B')};
assert.ok(structureFixture.lowerGate.closedSteps>structureFixture.lowerGate.openedSteps);
assert.equal(structureFixture.lowerGate.openedSteps,2);
assert.equal(structureFixture.closedFirstBlockingTile.y,18);
assert.equal(structureFixture.openedFirstBlockingTile.y,22);
assert.ok(structureFixture.baseCoverStillIntact);
const compact=r=>({strategy:r.strategy,interval:r.interval,seed:r.seed,state:r.state,time:r.time,kills:r.kills,base:r.base,lives:r.lives,shots:r.shots,score:r.score,removed:r.removed,centralRemaining:r.centralRemaining,baseRemaining:r.baseRemaining,centralGateVisits:r.centralGateVisits,distanceTiles:r.distanceTiles,visitedCells:r.visitedCells,terrain:r.terrain,pickups:r.events.filter(e=>e.type==='power'),drops:r.events.filter(e=>e.type==='drop'),baseHits:r.events.filter(e=>e.type==='base-hit')});
const matrix=[],traces=[];
for(const strategy of ['flank','breach'])for(const interval of [.05,.1,.2,[.1,.15,.2,.1]]){
 const r=run({strategy,interval});assert.equal(r.state,'won',`${strategy} ${interval}`);assert.equal(r.kills,6);assert.equal(r.base,3);assert.equal(r.lives,3);
 assert.deepEqual(r.events.filter(e=>e.type==='drop').map(e=>e.powerType),['shield','repair','rapid'],'Original index-2 drop rotation retained');
 if(strategy==='flank'){assert.equal(r.centralRemaining,9);assert.equal(r.baseRemaining,5);assert.deepEqual(r.centralGateVisits,[]);assert.ok(r.events.some(e=>e.type==='power'&&e.powerType==='rapid'));}
 else{assert.ok(r.centralRemaining<9);assert.ok(r.centralGateVisits.length>0);assert.ok(!r.events.some(e=>e.type==='power'&&e.powerType==='rapid'));}
 matrix.push(compact(r));
 if(interval===.1)traces.push({strategy,routeEverySecond:r.route,decisionSamples:r.inputs.filter((_,i)=>i%20===0),terrain:r.terrain});
}
const failures=[];
for(const strategy of ['overextend','idle','fixed-north']){
 const decider=strategy==='idle'?()=>({dir:null,fire:false}):strategy==='fixed-north'?()=>({dir:null,fire:true}):decide;
 const r=run({strategy,decider});assert.equal(r.state,'lost');assert.equal(r.base,0);
 if(strategy==='overextend')assert.ok(r.centralGateVisits.length>0);
 failures.push({...compact(r),terminalReason:r.events.findLast(x=>x.type==='lose')?.reason,routeEverySecond:strategy==='overextend'?r.route:undefined});
}
const hashes={};for(const name of ['engine.mjs','levels.mjs','policy.mjs'])hashes[name]=hash(await readFile(path(name)));
const proof={scope:'Bounded deterministic model simulation; no ordinary browser, physical-device or human-fun claim.',rules:'Original engine bytes; first two level source/objects retained. Decision intervals are held inputs with actual 1/60-second substeps, not one capped update per interval.',hashes,preserved:{oldEngineIdentical:true,oldLevelPrefix:true,oldLevelObjectSHA256:ORIGINAL_LEVELS.map(jsonHash),replay},structureFixture,matrix,traces,failures,limits:['Default deterministic third-map seed only; no claim about all seeds or optimal play.','Eight successful third-map simulations prove legal strategies, not depth, balance, cooperation or aesthetic quality.','The lower breach removes a rear-field screen, not all protection of the base. Five base bricks remain in the 50/100ms examples.','200ms breach can remove extra base cover while still winning; it is recorded rather than presented as identical to 100ms.','Damage events cannot attribute every removed brick to a bullet owner; removed tiles are world changes, while central gate entry and explicit breach actions show actual route use.']};
await writeFile(path('proof.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({passed:true,legacyReplays:2,thirdMapWins:matrix.length,legalFailures:failures.map(x=>({strategy:x.strategy,time:x.time})),hashes}));
