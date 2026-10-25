import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/windowlife-leaf-dom.mjs';
import {KEY} from '../experiments/windowlife-request-preview/source/storage.mjs';
test('a short pointer gesture previews the exact leaf that will be committed',()=>{
  const f=fixture();f.choose('now');f.pointer('pointerdown',80,180);f.pointer('pointermove',90,175);
  const preview=f.api.paper().draft;f.pointer('pointerup',90,175);assert.deepEqual(f.api.snapshot().art.sketch.marks[0],preview);
});
test('edge drafts also keep preview and release geometry identical',()=>{
  for(const [x,y,endX,endY]of [[280,220,285,225],[35,25,38,28],[15,15,18,20],[300,30,305,32]]) {
    const f=fixture();f.choose('alone');f.pointer('pointerdown',x,y);f.pointer('pointermove',endX,endY);
    const preview=f.api.paper().draft;f.pointer('pointerup',endX,endY);assert.deepEqual(f.api.snapshot().art.note.marks[0],preview);
  }
});
test('non-primary mouse buttons leave the page context action and artwork untouched',()=>{
  const f=fixture();f.choose('alone');let prevented=0;
  f.pointer('pointerdown',80,180,{button:2,buttons:2,preventDefault(){prevented++;}});f.pointer('pointerup',100,100,{button:2});
  assert.equal(f.api.paper().draft,null);assert.equal(f.api.snapshot().art.note.marks.length,0);assert.equal(prevented,0);
});
test('pausing a live draft clears its pose flag before the first paused room draw',()=>{
  const f=fixture();f.choose('now');f.key('Enter');assert(f.api.paper().draft);f.click('toggle');f.step();
  const paused=f.roomPictures.filter(p=>p.state==='paused'&&p.phase==='co-creating');assert(paused.length>=2);assert(paused.every(p=>!p.drawing));
});
for(const pointerType of ['mouse','touch'])test(`${pointerType} drag has a visible draft, commits once on release and stores bounded paper coordinates`,()=>{
  const f=fixture();f.choose('now');const before=f.api.snapshot().history.length;
  f.pointer('pointerdown',80,180,{pointerType});for(let i=0;i<20;i++)f.pointer('pointermove',120+i,80,{pointerType});
  assert(f.api.paper().draft);assert.equal(f.api.snapshot().history.length,before);assert.equal(f.pictures.at(-1).draft.x2,434);
  f.pointer('pointerup',139,80,{pointerType});const g=f.api.snapshot();assert.equal(g.art.sketch.marks.length,1);assert.equal(g.history.length,before+1);
  f.pointer('pointerup',139,80,{pointerType});assert.equal(f.api.snapshot().art.sketch.marks.length,1);
  assert.equal(f.api.paper().draft,null);assert.equal(g.history.at(-1).type,'mark');assert(f.get('paper-input').capture===1);
});
test('cancelled, outside and secondary pointers cannot leave accidental ink; pause drops only the draft',()=>{
  const f=fixture();f.choose('alone');
  f.pointer('pointerdown',80,180);f.pointer('pointercancel',80,180);assert.equal(f.api.snapshot().art.note.marks.length,0);
  f.pointer('pointerdown',80,180);f.pointer('pointerup',400,300);assert.equal(f.api.snapshot().art.note.marks.length,0);
  f.pointer('pointerdown',80,180);f.pointer('pointerdown',200,100,{pointerId:2,isPrimary:false});assert.equal(f.api.paper().pointer,1);
  f.winEvents.blur();assert.equal(f.api.snapshot().state,'paused');assert.equal(f.api.paper().draft,null);assert.equal(f.api.snapshot().art.note.marks.length,0);
});
test('keyboard handles change real geometry, commit with Enter and undo the same operation',()=>{
  const f=fixture();f.choose('later');assert.equal(f.document.activeElement.id,'paper-input');f.key('Enter');const start=f.api.paper().draft;
  f.key('ArrowLeft','paper-handle-start',{shiftKey:true});f.key('ArrowUp','paper-handle-end');const adjusted=f.api.paper().draft;
  assert.equal(adjusted.x1,start.x1-50);assert.equal(adjusted.y2,start.y2-10);f.key('Enter','paper-handle-end');
  assert.deepEqual(f.api.snapshot().art.note.marks,[adjusted]);assert.equal(f.document.activeElement.id,'paper-input');
  f.click('paper-undo');assert.equal(f.api.snapshot().art.note.marks.length,0);assert.equal(f.get('paper-finish').disabled,true);
});
test('pause/refresh keep committed marks and NPC response geometry, with no automatic resumed work',()=>{
  const f=fixture(new Map([['classic-atlas.windowlife.v1','FORMAL']]));f.choose('now');f.key('Enter');f.key('Enter');f.step();f.step();f.winEvents.pagehide();
  const before=f.api.snapshot();const r=fixture(f.data);assert.equal(r.api.snapshot().state,'paused');assert.deepEqual(r.api.snapshot().art,before.art);
  r.step(5000);assert.deepEqual(r.api.snapshot().art,before.art);assert.equal(r.get('paper-input').attributes['aria-disabled'],'true');
  r.click('toggle');r.click('paper-finish');for(let i=0;i<200&&r.api.snapshot().state==='playing';i++)r.step();
  assert.equal(r.api.summary().outcome,'shared-drawing');assert.equal(r.api.snapshot().state,'settled');
  assert.equal(r.data.get('classic-atlas.windowlife.v1'),'FORMAL');assert([...r.reads,...r.writes].every(k=>k===KEY));
});
test('quota failure, retry cancellation and repeated input keep a coherent current scene',()=>{
  const f=fixture();f.choose('alone');f.deny(true);f.key('Enter');f.key('Enter');assert.equal(f.get('storage-warning').hidden,false);
  const art=f.api.snapshot().art;f.confirm(false);f.click('retry');assert.equal(f.api.snapshot().state,'paused');assert.deepEqual(f.api.snapshot().art,art);
  f.deny(false);f.step(1200);assert.equal(f.get('storage-warning').hidden,true);
  f.confirm(true);f.click('retry');assert.equal(f.api.snapshot().version,2);assert.equal(f.api.snapshot().state,'ready');assert.equal(f.api.snapshot().art.note.marks.length,0);
});
test('current v2 writes retry safely in paused, settled, closed and reset states',()=>{
  for(const state of ['paused','settled','closed','ready']) {
    const f=fixture(new Map([['classic-atlas.windowlife.v1','ORIGINAL']]));f.choose('alone');f.key('Enter');f.key('Enter');
    const saved=f.data.get(KEY);f.deny(true);
    if(state==='paused')f.click('toggle');
    else if(state==='ready')f.click('retry');
    else {f.click('paper-finish');for(let i=0;i<200&&f.api.snapshot().state==='playing';i++)f.step();if(state==='closed')f.click('close');}
    f.step(1200);assert.equal(f.api.snapshot().state,state);assert.equal(f.data.get(KEY),saved);assert.equal(f.get('storage-warning').hidden,false);
    const before=f.api.snapshot();f.deny(false);f.step(1200);assert.equal(f.get('storage-warning').hidden,true);assert.deepEqual(f.api.snapshot(),before);
    const cp=JSON.parse(f.data.get(KEY));assert.equal(cp.version,2);assert.equal(f.data.get('classic-atlas.windowlife.v1'),'ORIGINAL');
  }
});
test('pause keeps the paper and control area present without repeated focus or scrolling',()=>{
  const f=fixture();f.choose('alone');const scrolls=f.get('paper-workspace').scrolls;f.click('toggle');
  assert.equal(f.get('paper-workspace').hidden,false);assert.equal(f.get('paper-tools').hidden,false);assert.equal(f.get('paper-finish').disabled,true);
  f.step(5000);f.click('toggle');assert.equal(f.get('paper-workspace').scrolls,scrolls);
});
