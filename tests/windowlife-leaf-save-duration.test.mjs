import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as E from '../experiments/windowlife-request-preview/source/scene.mjs';
import {KEY,readSave,writeSave} from '../experiments/windowlife-request-preview/source/storage.mjs';

const MARK={x1:250,y1:730,x2:410,y2:350};
const other={x1:730,y1:650,x2:580,y2:260};
function choose(type){const g=E.createScene();E.command(g,'start');E.command(g,type);while(!E.activePaper(g))E.update(g,.1);return g;}
function advanceTo(g,ticks){while(g.ticks<ticks&&g.state==='playing')E.update(g,.1);assert.equal(g.ticks,ticks);}
function roundTrip(g){const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};assert.equal(writeSave(storage,g,null),true);const r=readSave(storage);assert.equal(r.protection,null);assert.deepEqual(r.game.art,g.art);assert.deepEqual(r.game.actors,g.actors);assert.equal(r.game.ticks,g.ticks);assert.equal(r.game.time,g.time);assert.equal(r.game.accumulator,g.accumulator);assert.equal(data.size,1);assert(data.has(KEY));return r.game;}

for(const type of ['now','later','alone'])test(`${type}: legal ink survives waiting before, at and after the old 100000 tick limit`,()=>{
  const g=choose(type);assert(E.command(g,'mark',MARK).ok);
  for(const ticks of [99999,100000,100001]){advanceTo(g,ticks);const r=roundTrip(g);assert.equal(r.state,'paused');assert.equal(r.art[E.activePaper(g)].marks.length,1);}
  assert(E.command(g,'finish-paper').ok);for(let i=0;i<1000&&g.state==='playing';i++)E.update(g,.1);
  assert.equal(g.state,'settled');roundTrip(g);
});

test('long waits interleaved with response, undo, cancellation and fractional refresh retain exact progress',()=>{
  const g=choose('now');advanceTo(g,100001);E.command(g,'mark',MARK);E.update(g,.35);
  let r=roundTrip(g);E.command(r,'resume');E.update(g,.05);E.update(r,.05);assert.deepEqual(r.art,g.art);assert.equal(r.accumulator,g.accumulator);
  advanceTo(g,200003);E.command(g,'undo-mark');E.command(g,'mark',other);E.update(g,.15);r=roundTrip(g);
  E.command(g,'pause');E.command(g,'cancel');E.command(r,'cancel');assert.deepEqual(r.art,g.art);assert.deepEqual(r.actors,g.actors);
  E.command(g,'resume');while(E.activePaper(g)!=='note')E.update(g,.1);advanceTo(g,300005);
  r=roundTrip(g);E.command(r,'resume');assert(E.command(r,'mark',MARK).ok);assert(E.command(r,'finish-paper').ok);
  for(let i=0;i<1000&&r.state==='playing';i++)E.update(r,.1);assert.equal(r.state,'settled');assert.equal(E.summary(r).outcome,'kept-mark');roundTrip(r);
});

test('cancelling a later arrangement normalizes its changed actor job before skipping the next idle wait',()=>{
  const g=choose('later');advanceTo(g,100001);E.command(g,'mark',MARK);assert(E.command(g,'cancel').ok);
  assert.equal(g.actors[0].current,null);roundTrip(g);
  E.update(g,.1);assert.equal(g.actors[0].current.remaining,1);roundTrip(g);
  advanceTo(g,200003);const r=roundTrip(g);assert.equal(r.actors[0].current.kind,'work');assert.equal(r.request.status,'cancelled');
});

test('very large historical v2 clocks and a near-full valid command history have bounded restore cost',()=>{
  // A synthetic checkpoint exercises parser bounds; this is not a played route.
  // Run in a child so an accidental per-elapsed-tick loop is killed, not hung.
  const code=`import assert from 'node:assert/strict';import * as E from ${JSON.stringify(new URL('../experiments/windowlife-request-preview/source/scene.mjs',import.meta.url).href)};
    const mark=${JSON.stringify(MARK)},commands=[{tick:0,type:'start'},{tick:0,type:'now'}];
    for(let i=0;i<2046;i++){commands.push({tick:1e12+i*2e6,type:'mark',mark},{tick:1e12+i*2e6+1e6,type:'undo-mark'});}
    commands.push({tick:Number.MAX_SAFE_INTEGER-100,type:'mark',mark});
    const cp={format:'windowlife-request-checkpoint',version:2,ticks:Number.MAX_SAFE_INTEGER-99,accumulator:.05,commands};
    const g=E.restore(cp);assert(g);assert.equal(g.state,'paused');assert.equal(g.ticks,cp.ticks);assert.equal(g.history.length,4096);assert.deepEqual(g.art.sketch.marks,[mark]);assert.deepEqual(g.art.sketch.responses,[.125]);assert.equal(g.accumulator,.05);
    const again=E.restore(E.checkpoint(g));assert(again);assert.deepEqual(again.art,g.art);assert.deepEqual(again.actors,g.actors);console.log('bounded historical replay passed');`;
  assert.match(execFileSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',timeout:5000}),/bounded historical replay passed/);
});

test('unsafe clocks and time advanced while ready/paused/settled remain invalid',()=>{
  const g=choose('alone'),cp=E.checkpoint(g);
  for(const ticks of [-1,.5,Infinity,Number.MAX_SAFE_INTEGER+1])assert.equal(E.restore({...cp,ticks}),null);
  const ready=E.checkpoint(E.createScene());assert.equal(E.restore({...ready,ticks:1e12}),null);
  E.command(g,'pause');assert.equal(E.restore({...E.checkpoint(g),ticks:1e12}),null);
  E.command(g,'resume');E.command(g,'mark',MARK);E.command(g,'finish-paper');while(g.state==='playing')E.update(g,.1);
  assert.equal(E.restore({...E.checkpoint(g),ticks:g.ticks+1}),null);
});
