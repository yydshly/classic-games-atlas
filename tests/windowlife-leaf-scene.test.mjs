import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../experiments/windowlife-request-preview/source/scene.mjs';
import * as V1 from '../experiments/windowlife-request-preview/source/legacy-scene.mjs';
import {response,leaf,normalizeGesture,MIN_GESTURE,validMark} from '../experiments/windowlife-request-preview/source/marks.mjs';
const LEFT={x1:250,y1:730,x2:410,y2:350},RIGHT={x1:730,y1:650,x2:580,y2:260};
function choose(type){const g=E.createScene();E.command(g,'start');E.command(g,type);return g;}
function until(g,p){for(let i=0;i<2000&&!p(g)&&g.state==='playing';i++)E.update(g,.1);assert(p(g),g.phase);}
const core=g=>({art:g.art,paper:g.paper,actors:g.actors,objects:g.objects,ticks:g.ticks,time:g.time,phase:g.phase,choice:g.choice,request:g.request,accumulator:g.accumulator});
const end=g=>{until(g,s=>s.state==='settled');assert.equal(E.summary(g).noteFinished,true);assert.equal(E.summary(g).sketchFinished,true);};

for(const type of ['now','later','alone'])test(`${type}: waiting never places or completes the player's artwork`,()=>{
  const g=choose(type);for(let i=0;i<600;i++)E.update(g,.1);
  assert.equal(g.state,'playing');assert.equal(g.art.note.marks.length,0);assert.equal(g.art.sketch.marks.length,0);
  assert.equal(g.paper.note.done,false);assert.equal(g.paper.sketch.done,false);assert.equal(g.art.sketch.inkProgress.a,0);
  assert.equal(E.command(g,'finish-paper').ok,false);
});
for(const [type,outcome]of [['now','shared-drawing'],['later','exchanged'],['alone','separate-works']])test(`${type}: one actual leaf and an explicit finish produce a complete valid outcome`,()=>{
  const g=choose(type);until(g,s=>!!E.activePaper(s));const target=E.activePaper(g);
  assert.equal(E.command(g,'mark',LEFT).ok,true);assert.deepEqual(g.art[target].marks,[LEFT]);
  assert.equal(E.command(g,'finish-paper').ok,true);end(g);
  assert.equal(E.summary(g).outcome,outcome);assert.equal(E.summary(g).exchangeFinished,type==='later');
  assert(!('mood'in g));assert(!('score'in g));assert.equal(E.command(g,'close').ok,true);
  const restored=E.restore(E.checkpoint(g));assert.equal(restored.state,'closed');assert.deepEqual(core(restored),core(g));
});
test('different placements alter leaf geometry and actual NPC branch endpoints, not only a label',()=>{
  const outcomes=[];
  for(const mark of [LEFT,RIGHT]){const g=choose('now');until(g,s=>!!E.activePaper(s));E.command(g,'mark',mark);E.update(g,.4);assert.equal(g.art.sketch.responses[0],.5);outcomes.push({leaf:leaf(g.art.sketch.marks[0]),branch:response(g.art.sketch.marks[0]),ink:g.art.sketch.inkProgress.a});}
  assert.notDeepEqual(outcomes[0].leaf,outcomes[1].leaf);assert.notDeepEqual(outcomes[0].branch,outcomes[1].branch);
  assert.equal(outcomes[0].ink,outcomes[1].ink);
});
test('two-leaf cap, explicit undo and dependent NPC ink remain one coherent saved action',()=>{
  const g=choose('now');until(g,s=>!!E.activePaper(s));E.command(g,'mark',LEFT);E.update(g,.4);E.command(g,'mark',RIGHT);
  const before=E.checkpoint(g);assert.equal(E.command(g,'mark',LEFT).ok,false);assert.deepEqual(E.checkpoint(g),before);
  E.command(g,'undo-mark');assert.deepEqual(g.art.sketch.marks,[LEFT]);assert.deepEqual(g.art.sketch.responses,[.5]);
  E.command(g,'undo-mark');assert.equal(g.art.sketch.inkProgress.a,0);assert.deepEqual(g.art.sketch.contributors,['b']);assert.equal(E.command(g,'finish-paper').ok,false);
});
test('one NPC pen finishes the current branch before starting a queued second one',()=>{
  const g=choose('now');until(g,s=>!!E.activePaper(s));E.command(g,'mark',LEFT);E.update(g,.3);E.command(g,'mark',RIGHT);E.update(g,.1);
  assert.deepEqual(g.art.sketch.responses,[.5,0]);for(let i=0;i<4;i++)E.update(g,.1);assert.deepEqual(g.art.sketch.responses,[1,0]);
  E.update(g,.1);assert.deepEqual(g.art.sketch.responses,[1,.125]);
});
test('cancel preserves committed partial work, freezes the response, and never claims joint completion',()=>{
  const g=choose('now');until(g,s=>!!E.activePaper(s));E.command(g,'mark',LEFT);E.update(g,.3);
  const marks=structuredClone(g.art.sketch.marks),responses=[...g.art.sketch.responses];E.command(g,'cancel');
  until(g,s=>E.activePaper(s)==='note');assert.deepEqual(g.art.sketch.marks,marks);assert.deepEqual(g.art.sketch.responses,responses);
  E.command(g,'mark',RIGHT);E.command(g,'finish-paper');end(g);assert.equal(E.summary(g).outcome,'kept-mark');assert.equal(E.summary(g).sharedDrawingFinished,false);
});
test('cancelling while paused preserves committed geometry and cannot advance the return walk',()=>{
  const g=choose('now');until(g,s=>!!E.activePaper(s));E.command(g,'mark',LEFT);E.update(g,.3);E.command(g,'pause');E.command(g,'cancel');
  const before=E.snapshot(g);E.update(g,20);assert.deepEqual(g,before);const restored=E.restore(E.checkpoint(g));assert.deepEqual(core(restored),core(g));
  E.command(restored,'resume');until(restored,s=>E.activePaper(s)==='note');assert.deepEqual(restored.art.sketch.marks,[LEFT]);
});
for(const when of ['separate','meeting-later','sharing'])test(`later cancellation during ${when} retains the actual personal artwork`,()=>{
  const g=choose('later');E.command(g,'mark',LEFT);if(when!=='separate'){E.command(g,'finish-paper');until(g,s=>s.phase===when);}E.command(g,'cancel');
  if(!g.paper.note.done){E.command(g,'finish-paper');}end(g);assert.deepEqual(g.art.note.marks,[LEFT]);assert.equal(E.summary(g).exchangeFinished,false);
});
test('every response tick, undo, pause and finish restore the same positions and paper geometry',()=>{
  const g=choose('now');until(g,s=>!!E.activePaper(s));E.command(g,'mark',LEFT);
  for(let i=0;i<4;i++){E.update(g,.1);const restored=E.restore(E.checkpoint(g));assert.equal(restored.state,'paused');assert.deepEqual(core(restored),core(g));}
  E.command(g,'pause');const paused=E.snapshot(g);E.update(g,30);assert.deepEqual(g,paused);E.command(g,'resume');
  E.command(g,'undo-mark');E.command(g,'mark',RIGHT);E.command(g,'finish-paper');
  while(g.state==='playing'){const restored=E.restore(E.checkpoint(g));assert.deepEqual(core(restored),core(g));E.update(g,.1);}end(g);
});
test('a fractional response checkpoint resumes from its actual remaining fraction',()=>{
  const g=choose('now');until(g,s=>!!E.activePaper(s));E.command(g,'mark',LEFT);E.update(g,.15);E.command(g,'pause');
  const restored=E.restore(E.checkpoint(g));assert(restored);assert.deepEqual(core(restored),core(g));E.command(g,'resume');E.command(restored,'resume');
  E.update(g,.15);E.update(restored,.15);assert.deepEqual(core(restored),core(g));
});
test('v1 checkpoints resume the original scene, without inventing player marks or changing the old outcome',()=>{
  for(const type of ['now','later','alone']){const old=V1.createScene();V1.command(old,'start');V1.command(old,type);V1.update(old,.5);
    const restored=E.restore(V1.checkpoint(old));assert.equal(restored.version,1);assert.equal(restored.paper,undefined);
    assert.deepEqual(restored.art,old.art);E.command(restored,'resume');end(restored);assert.equal(E.summary(restored).outcome,type==='now'?'shared-drawing':type==='later'?'exchanged':'separate-works');}
});
test('payload validation and history budget cannot bypass authored progress or erase old bytes',()=>{
  const g=choose('alone');for(const bad of [null,{...LEFT,x1:-1},{...LEFT,x2:NaN},{...LEFT,bonus:true}])assert.equal(E.command(g,'mark',bad).ok,false);
  for(let i=0;i<2047;i++){E.command(g,'pause');E.command(g,'resume');}
  assert.equal(g.history.length,4096);assert.equal(E.command(g,'mark',LEFT).ok,false);
  const restored=E.restore(E.checkpoint(g));assert(restored);assert.equal(restored.state,'paused');assert.equal(E.canResume(restored),false);
  assert.equal(E.restore({...E.checkpoint(g),commands:[{tick:0,type:'start'},{tick:0,type:'alone'},{tick:0,type:'mark',mark:{...LEFT,win:true}}]}),null);
  const tap=normalizeGesture({x:500,y:500},{x:500,y:500});assert(validMark(tap));assert(tap.x2>tap.x1&&tap.y2<tap.y1);assert(Math.hypot(tap.x2-tap.x1,tap.y2-tap.y1)>=MIN_GESTURE);
});
test('saved v2 small marks retain their exact geometry after the UI minimum changes',()=>{
  const g=choose('alone'),oldMark={x1:500,y1:500,x2:560,y2:500};assert.equal(E.command(g,'mark',oldMark).ok,true);
  const restored=E.restore(E.checkpoint(g));assert.deepEqual(restored.art.note.marks,[oldMark]);
});
test('bounded short drafts leave non-overlapping 44px endpoint targets at 320px width',()=>{
  const stage=320-24-22,shortAxis=stage*.9*.8;
  for(const x of [0,80,90,250,500,910,920,1000])for(const y of [0,80,90,500,910,920,1000])for(const dx of [-40,-1,0,1,40])for(const dy of [-40,-1,0,1,40]) {
    const m=normalizeGesture({x,y},{x:x+dx,y:y+dy});assert(validMark(m));const distance=Math.hypot(m.x2-m.x1,m.y2-m.y1);
    assert(distance>=MIN_GESTURE);assert(distance/1000*shortAxis>=44,'source CSS arithmetic only, not measured browser pixels');
  }
});
