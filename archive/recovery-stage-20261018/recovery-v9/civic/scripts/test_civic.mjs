import assert from 'node:assert/strict';
import { LEVELS, BUILDINGS, RESEARCH, createGame, start, pause, resume, retry, command, canCommand, previewTurn, objectives, snapshot, checkpoint, restore, undo, connectivity } from '../games/civic/engine.mjs';
import { PLANS, runPilot } from './civic_pilot.mjs';
let checks=0;
const test=(name,fn)=>{fn();checks++;console.log(`ok ${checks} - ${name}`);};
const fresh=i=>start(createGame(i));
const doIt=(s,c)=>{assert.equal(canCommand(s,c).ok,true,JSON.stringify(c));const r=command(s,c);assert.equal(r.ok,true,r.reason);return r;};
const end=s=>doIt(s,{type:'endTurn'});
const build=(s,tileId,building)=>doIt(s,{type:'build',tileId,building});
const assign=(s,tileId,worker=true)=>doIt(s,{type:'assign',tileId,worker});
const rejectAtomic=(s,c)=>{const before=JSON.stringify(snapshot(s));assert.equal(command(s,c).ok,false);assert.equal(JSON.stringify(snapshot(s)),before);};
const normalized=s=>{const view=JSON.parse(JSON.stringify(snapshot(s)));if(!view.result)view.state=view.started?'playing':'ready';view.undoAvailable=false;return view;};
const checkReplay=s=>{const loaded=restore(checkpoint(s));assert.ok(loaded);assert.equal(loaded.state,s.result?s.state:'paused');assert.deepEqual(normalized(loaded),normalized(s));return loaded;};

test('eight authored maps, weather calendars and building placements are valid and distinct',()=>{
  assert.equal(LEVELS.length,8);assert.equal(new Set(LEVELS.map(l=>l.map.join(''))).size,8);
  for(let i=0;i<8;i++){
    const s=createGame(i);assert.equal(s.tiles.length,42);assert.equal(s.level.weather.length,s.maxTurns);
    for(const t of s.tiles){assert.ok(['plain','forest','hill','water'].includes(t.terrain));if(t.building)assert.ok(BUILDINGS[t.building].terrain.includes(t.terrain),`chapter${i+1}tile${t.id}`);}
    assert.ok(s.tiles.some(t=>t.terrain==='forest'));assert.ok(s.tiles.some(t=>t.terrain==='hill'));assert.ok(s.tiles.some(t=>t.terrain==='water'));
  }
});
test('all eight chapters win via public validated commands and preview matches every settlement',()=>{
  for(let i=0;i<8;i++){
    const s=fresh(i);let n=0;
    for(const turn of PLANS[i]){
      for(const cmd of turn){doIt(s,cmd);n++;checkReplay(s);}
      const forecast=previewTurn(s), priorProduced={...s.produced}, priorDelivered=s.tradeDelivered, priorHarvest=s.harvested;
      end(s);n++;
      for(const k of Object.keys(forecast.after)){assert.equal(s.resources[k],Math.max(0,forecast.after[k]));assert.equal(s.produced[k],priorProduced[k]+forecast.production[k]);}
      assert.equal(s.tradeDelivered,priorDelivered+forecast.tradeGain);assert.equal(s.harvested,priorHarvest+forecast.production.food);assert.deepEqual(s.lastTurn,forecast);checkReplay(s);
      if(s.state==='won')break;
    }
    assert.equal(s.state,'won',`chapter${i+1}`);assert.ok(objectives(s).every(o=>o.complete));assert.ok(n>2);assert.ok(s.turn<=s.maxTurns);
    rejectAtomic(s,{type:'endTurn'});rejectAtomic(s,{type:'road',tileId:0});assert.equal(undo(s).ok,false);
  }
});
test('state, resource objects and snapshots are isolated; immutable diagnostics never alter simulation',()=>{
  const a=fresh(0),b=fresh(0),before=JSON.stringify(snapshot(b));build(a,15,'farm');assert.equal(JSON.stringify(snapshot(b)),before);
  const view=snapshot(a);assert.ok(Object.isFrozen(view));assert.ok(Object.isFrozen(view.resources));assert.ok(Object.isFrozen(view.tiles[0]));
  assert.throws(()=>{view.resources.food=999;},TypeError);assert.throws(()=>{previewTurn(a).after.food=999;},TypeError);assert.throws(()=>{BUILDINGS.farm.cost.wood=-9;},TypeError);
  const immutableBefore=JSON.stringify(a);for(let i=0;i<5;i++){previewTurn(a);snapshot(a);objectives(a);connectivity(a);canCommand(a,{type:'endTurn'});}assert.equal(JSON.stringify(a),immutableBefore);
});
test('ready, pause, resume, retry and terminal gates preserve finite turn semantics',()=>{
  const s=createGame(0);rejectAtomic(s,{type:'endTurn'});start(s);pause(s);const turn=s.turn;rejectAtomic(s,{type:'endTurn'});assert.equal(s.turn,turn);resume(s);end(s);assert.equal(s.turn,2);
  retry(s);assert.equal(s.state,'ready');assert.equal(s.turn,1);assert.equal(s.commandLog.length,0);assert.equal(s.resources.food,LEVELS[0].resources.food);
  const saved=restore(checkpoint(s));assert.equal(saved.state,'paused');resume(saved);assert.equal(saved.state,'playing');assert.equal(saved.started,true);
});
test('malformed commands, foreign cost fields, invalid terrain and unavailable construction are atomic',()=>{
  const s=fresh(0);
  for(const cmd of [null,[],{}, {type:'unknown'}, {type:'road',tileId:-1},{type:'road',tileId:Infinity},{type:'road',tileId:NaN},{type:'road',tileId:'15'},{type:'road',tileId:15,cost:-999},{type:'build',tileId:15,building:'farm',resources:{wood:999}},{type:'build',tileId:15,building:'__proto__'},{type:'assign',tileId:15,worker:1},{type:'endTurn',cost:-1},{type:'build',tileId:0,building:'farm'},{type:'build',tileId:6,building:'farm'},{type:'build',tileId:15,building:'village'},{type:'build',tileId:15,building:'port'},{type:'build',tileId:1,building:'study'},{type:'build',tileId:40,building:'study'},{type:'road',tileId:27},{type:'research',research:'navigation'}])rejectAtomic(s,cmd);
  build(s,15,'market');assert.equal(s.resources.wood,6);assert.equal(s.resources.stone,0);rejectAtomic(s,{type:'build',tileId:23,building:'study'});rejectAtomic(s,{type:'build',tileId:15,building:'farm'});
});
test('limited actions and population assignments are enforced, and a withdrawal frees one resident',()=>{
  const s=fresh(2);build(s,16,'farm');assign(s,16);build(s,21,'lumber');rejectAtomic(s,{type:'assign',tileId:21,worker:true});assert.equal(s.actions,0);end(s);
  assign(s,21);build(s,25,'quarry');assign(s,25);end(s);build(s,22,'study');rejectAtomic(s,{type:'assign',tileId:22,worker:true});assign(s,25,false);assign(s,22);assert.equal(s.tiles.filter(t=>t.worker).length,3);rejectAtomic(s,{type:'assign',tileId:22,worker:true});
});
test('fog exploration follows revealed frontier and hidden tiles cannot be built or roaded',()=>{
  const s=fresh(1);rejectAtomic(s,{type:'explore',tileId:12});rejectAtomic(s,{type:'build',tileId:12,building:'farm'});rejectAtomic(s,{type:'road',tileId:12});rejectAtomic(s,{type:'explore',tileId:22});
  doIt(s,{type:'explore',tileId:17});assert.equal(s.tiles[18].revealed,true);assert.equal(s.tiles[12].revealed,false);doIt(s,{type:'explore',tileId:11});assert.equal(s.tiles[12].revealed,true);assert.equal(objectives(s)[0].current,1);
});
test('trade requires every cardinal road segment, consumes actual goods and storm stops shipment',()=>{
  const s=fresh(3);assign(s,15);build(s,23,'market');doIt(s,{type:'road',tileId:26});assert.equal(previewTurn(s).tradeGain,0);end(s);
  doIt(s,{type:'road',tileId:24});assert.equal(previewTurn(s).tradeGain,0);doIt(s,{type:'road',tileId:25});assert.deepEqual(connectivity(s).routes,[[23,24,25,26,27]]);
  const f=previewTurn(s);assert.equal(f.tradeGain,2);assert.equal(f.tradeCost.wood,1);assert.equal(f.tradeCost.stone,1);const w=s.resources.wood,st=s.resources.stone;end(s);assert.equal(s.resources.wood,w-1);assert.equal(s.resources.stone,st-1);
  assert.equal(previewTurn(s).weather.id,'storm');assert.equal(previewTurn(s).tradeGain,0);const delivered=s.tradeDelivered;end(s);assert.equal(s.tradeDelivered,delivered);
});
test('water is a real break until researched bridge connects it; settlement needs range and road',()=>{
  const s=fresh(4);rejectAtomic(s,{type:'road',tileId:24});rejectAtomic(s,{type:'settle',tileId:26});rejectAtomic(s,{type:'settle',tileId:23});assign(s,15);assign(s,23);doIt(s,{type:'road',tileId:23});end(s);
  doIt(s,{type:'road',tileId:25});doIt(s,{type:'road',tileId:26});assert.equal(connectivity(s).reachable.includes(26),false);rejectAtomic(s,{type:'settle',tileId:26});rejectAtomic(s,{type:'research',research:'navigation'});end(s);
  doIt(s,{type:'research',research:'navigation'});assert.equal(s.resources.insight,0);rejectAtomic(s,{type:'research',research:'navigation'});doIt(s,{type:'road',tileId:24});assert.equal(connectivity(s).reachable.includes(26),true);const prior=s.population;doIt(s,{type:'settle',tileId:26});assert.equal(s.population,prior+2);assert.equal(s.tiles[26].building,'village');assert.equal(previewTurn(s).consumption.food,5);
});
test('research changes actual deterministic yields and never grants duplicate bonuses',()=>{
  const {state:s}=runPilot(6,{maxTurns:5});assert.ok(s.research.includes('harvest'));assert.equal(previewTurn(s).production.food,18);const before=previewTurn(s).production.stone;doIt(s,{type:'research',research:'stonecraft'});assert.equal(previewTurn(s).production.stone,before+1);rejectAtomic(s,{type:'research',research:'stonecraft'});
  assert.equal(Object.keys(RESEARCH).length,3);
});
test('undo restores exact costs, workers, exploration, roads, research and new-village population within current turn',()=>{
  const s=fresh(4);const exact=JSON.stringify(snapshot(s));assign(s,15);assert.equal(undo(s).ok,true);assert.equal(JSON.stringify(snapshot(s)),exact);
  assign(s,15);assign(s,23);doIt(s,{type:'road',tileId:23});end(s);assert.equal(undo(s).ok,false);
  doIt(s,{type:'road',tileId:25});doIt(s,{type:'road',tileId:26});end(s);const beforeResearch=JSON.stringify(snapshot(s));doIt(s,{type:'research',research:'navigation'});assert.equal(undo(s).ok,true);assert.equal(JSON.stringify(snapshot(s)),beforeResearch);
  doIt(s,{type:'research',research:'navigation'});doIt(s,{type:'road',tileId:24});const beforeVillage=JSON.stringify(snapshot(s));doIt(s,{type:'settle',tileId:26});assert.equal(s.population,5);assert.equal(undo(s).ok,true);assert.equal(JSON.stringify(snapshot(s)),beforeVillage);checkReplay(s);doIt(s,{type:'settle',tileId:26});end(s);assert.equal(undo(s).ok,false);checkReplay(s);
  const fog=fresh(1),beforeFog=JSON.stringify(snapshot(fog));doIt(fog,{type:'explore',tileId:17});undo(fog);assert.equal(JSON.stringify(snapshot(fog)),beforeFog);
});
test('checkpoint after undo and alternative rebuilding is exact; restored undo is bounded to current turn',()=>{
  const s=fresh(0);build(s,15,'farm');assign(s,15);undo(s);undo(s);build(s,23,'farm');assign(s,23);const loaded=checkReplay(s);resume(loaded);assert.equal(undo(loaded).ok,true);assert.equal(loaded.tiles[23].worker,false);assign(loaded,23);end(loaded);assert.equal(undo(loaded).ok,false);const again=checkReplay(loaded);resume(again);assert.equal(undo(again).ok,false);
});
test('corrupt, oversized, forged-state, impossible-cost, impossible-order and post-terminal replays are rejected',()=>{
  const valid=JSON.parse(JSON.stringify(checkpoint(runPilot(0).state)));
  assert.equal(restore('not json'),null);assert.equal(restore(' '.repeat(64001)),null);assert.equal(restore(null),null);assert.equal(restore([]),null);
  for(const change of [d=>d.version=2,d=>d.levelIndex=99,d=>d.levelIndex=0.5,d=>d.started=false,d=>d.checksum='badzz',d=>d.checksum='0000',d=>d.resources={food:999},d=>d.commands.push({type:'endTurn'}),d=>d.commands[0]={type:'build',tileId:15,building:'farm',cost:0},d=>d.commands[0]={type:'research',research:'harvest'},d=>d.commands=Array.from({length:257},()=>({type:'endTurn'}))]){const d=structuredClone(valid);change(d);assert.equal(restore(d),null);}
});
test('all idle colonies fail; maintained food without goals reaches precise turn limit',()=>{
  for(let i=0;i<8;i++){const s=fresh(i);let n=0;while(s.state==='playing'){end(s);n++;assert.ok(n<=s.maxTurns);}assert.equal(s.state,'lost');assert.ok(s.reason.includes('缺粮'));rejectAtomic(s,{type:'endTurn'});checkReplay(s);}
  const s=fresh(2);build(s,16,'farm');assign(s,16);while(s.state==='playing')end(s);assert.equal(s.state,'lost');assert.equal(s.turn,s.maxTurns);assert.ok(s.reason.includes('轮已经结束'));assert.ok(s.resources.food>0);
});
test('each declared drought and storm occurs exactly on forecasted turn; no duplicate passive income',()=>{
  const s=fresh(5);assign(s,16);build(s,24,'farm');assign(s,24);const weather=[];
  while(s.state==='playing'){const f=previewTurn(s);weather.push(f.weather.id);const unchanged=JSON.stringify(s);for(let i=0;i<20;i++)previewTurn(s);assert.equal(JSON.stringify(s),unchanged);end(s);assert.equal(s.lastTurn.weather.id,f.weather.id);}
  assert.deepEqual(weather,['sun','sun','drought','drought','drought','rain']);assert.equal(s.droughtsSurvived,3);assert.equal(s.harvested,56);assert.equal(s.state,'won');
});
console.log(`PASS ${checks} civic engine acceptance groups; all 8 chapters solved with public inputs.`);
