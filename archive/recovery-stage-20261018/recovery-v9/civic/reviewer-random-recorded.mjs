import assert from 'node:assert/strict';
import {createGame,start,command,canCommand,snapshot,checkpoint,restore,undo} from './games/civic/engine.mjs';
let seed=37,checks=0;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32};
const norm=s=>{let v=JSON.parse(JSON.stringify(snapshot(s)));if(!v.result)v.state=v.started?'playing':'ready';v.undoAvailable=false;return v};
for(let chapter=0;chapter<8;chapter++)for(let run=0;run<12;run++){
 const s=start(createGame(chapter));
 for(let n=0;n<70&&s.state==='playing';n++){
  const candidates=[{type:'endTurn'},...['harvest','stonecraft','navigation'].map(research=>({type:'research',research}))];
  for(let tileId=0;tileId<42;tileId++)candidates.push(...['explore','road','settle'].map(type=>({type,tileId})),...['farm','lumber','quarry','study','market','beacon'].map(building=>({type:'build',tileId,building})),...[true,false].map(worker=>({type:'assign',tileId,worker})));
  const legal=candidates.filter(c=>canCommand(s,c).ok),c=legal[Math.floor(rand()*legal.length)];
  assert.ok(c);const before=JSON.stringify(snapshot(s));command(s,c);checks++;
  if(c.type!=='endTurn'&&rand()<.25){assert.ok(undo(s).ok);assert.equal(JSON.stringify(snapshot(s)),before);checks++;}
  const r=restore(checkpoint(s));assert.ok(r);assert.deepEqual(norm(r),norm(s));checks++;
 }
}
console.log('independent random legal-action/undo/replay checks',checks);
