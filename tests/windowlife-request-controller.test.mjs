import test from 'node:test';
import assert from 'node:assert/strict';
import { mount } from '../experiments/windowlife-request/controller.mjs';
import { KEY } from '../experiments/windowlife-request/storage.mjs';

// Deliberately a DOM/event fixture, not a browser or native input test.
function fixture(data = new Map()) {
  let frame, stamp = 0, confirmResult = true;
  const docEvents = {}, winEvents = {}, nodes = new Map();
  const document = { hidden: false, activeElement: null, addEventListener(t,f) { docEvents[t] = f; }, getElementById(id) { if (!nodes.has(id)) nodes.set(id, node(id)); return nodes.get(id); }, createElement(tag) { return node(tag); } };
  function node(id) { return { id, hidden: false, textContent: '', dataset: {}, children: [], listeners: {}, addEventListener(t,f) { this.listeners[t] = f; }, replaceChildren(...children) { this.children = children; }, focus() { document.activeElement = this; }, closest() { return null; } }; }
  const reads = [], writes = [], storage = { getItem(k) { reads.push(k); return data.get(k) ?? null; }, setItem(k,v) { writes.push(k); data.set(k,v); } };
  const window = { addEventListener(t,f) { winEvents[t] = f; }, confirm() { return confirmResult; } };
  let drawings = 0;
  class Renderer { draw() { drawings++; } }
  const api = mount({ document, window, storage, requestFrame(f) { frame = f; }, Renderer });
  const get = id => document.getElementById(id);
  const click = id => get(id).listeners.click({ target: get(id) });
  const step = (ms = 100) => { stamp += ms; frame(stamp); };
  function finish() { for (let n=0;n<1000&&api.snapshot().state==='playing';n++) step(); assert.equal(api.snapshot().state,'settled'); }
  return { api, get, click, step, finish, data, reads, writes, document, docEvents, winEvents, confirm(value) { confirmResult = value; }, drawings: () => drawings };
}

test('all three visible choices lead to distinct genuine outcomes and explicit close', () => {
  for (const [choice,outcome] of [['now','shared-drawing'],['later','exchanged'],['alone','separate-works']]) {
    const f=fixture(new Map([['classic-atlas.windowlife.v1','OLD SAVE']]));
    f.click('toggle'); assert.equal(f.get('request').hidden,false); assert.equal(f.document.activeElement.id,'request-title');
    f.click('choose-'+choice); assert.equal(f.get('request').hidden,true); assert.equal(f.document.activeElement.id,'toggle');
    f.finish(); assert.equal(f.api.summary().outcome,outcome); assert.equal(f.get('result').hidden,false); assert.equal(f.document.activeElement.id,'result');
    f.click('close'); assert.equal(f.api.snapshot().state,'closed'); assert.equal(f.get('close').hidden,true);
    assert.equal(f.data.get('classic-atlas.windowlife.v1'),'OLD SAVE'); assert.ok(f.reads.every(k=>k===KEY)); assert.ok(f.writes.every(k=>k===KEY));
  }
});
test('repeated decisions cannot re-trigger the request; dismiss chooses independent work', () => {
  const f=fixture();f.click('toggle');f.click('choose-now');const history=f.api.snapshot().history.length;f.click('choose-later');
  assert.equal(f.api.snapshot().choice,'now');assert.equal(f.api.snapshot().history.length,history);
  const d=fixture();d.click('toggle');d.click('dismiss');d.finish();assert.equal(d.api.summary().outcome,'separate-works');assert.equal(d.api.snapshot().request.offered,true);
});
test('blur, hidden and a long foreground gap pause instead of advancing offscreen', () => {
  for (const interrupt of ['blur','hidden','gap']) {
    const f=fixture();f.click('toggle');f.click('choose-now');f.step();f.step();const ticks=f.api.snapshot().ticks;
    if(interrupt==='blur')f.winEvents.blur();else if(interrupt==='hidden'){f.document.hidden=true;f.docEvents.visibilitychange();}else f.step(2000);
    assert.equal(f.api.snapshot().state,'paused');f.step(2000);assert.equal(f.api.snapshot().ticks,ticks);
    f.document.hidden=false;f.click('toggle');f.finish();assert.equal(f.api.summary().outcome,'shared-drawing');
  }
});
test('retry cancellation retains a paused exact scene; confirmation resets only the candidate', () => {
  const f=fixture(new Map([['classic-atlas.windowlife.v1','OLD']]));f.click('toggle');f.click('choose-now');for(let n=0;n<15;n++)f.step();
  const artwork=f.api.snapshot().art;f.confirm(false);f.click('retry');assert.equal(f.api.snapshot().state,'paused');assert.deepEqual(f.api.snapshot().art,artwork);
  f.step(5000);assert.deepEqual(f.api.snapshot().art,artwork);f.confirm(true);f.click('retry');assert.equal(f.api.snapshot().state,'ready');assert.equal(f.api.snapshot().request.offered,false);assert.equal(f.data.get('classic-atlas.windowlife.v1'),'OLD');
});
test('pagehide saves a real in-progress scene; next mount restores paused and resumes', () => {
  const f=fixture();f.click('toggle');f.click('choose-later');for(let n=0;n<75;n++)f.step();f.winEvents.pagehide();const before=f.api.snapshot();
  const r=fixture(f.data);assert.equal(r.api.snapshot().state,'paused');assert.deepEqual(r.api.snapshot().art,before.art);assert.deepEqual(r.api.snapshot().actors,before.actors);
  r.step(3000);assert.deepEqual(r.api.snapshot().art,before.art);r.click('toggle');r.finish();assert.equal(r.api.summary().outcome,'exchanged');
});
test('cancel button returns focus to visible controls and preserves a partial contribution', () => {
  const f=fixture();f.click('toggle');f.click('choose-now');for(let n=0;n<20;n++)f.step();assert.equal(f.api.snapshot().phase,'co-creating');
  f.click('cancel');assert.equal(f.document.activeElement.id,'toggle');assert.equal(f.get('cancel').hidden,true);f.finish();assert.equal(f.api.summary().outcome,'kept-mark');
});
test('P does not steal modified keys or native interactive targets', () => {
  const f=fixture();f.click('toggle');f.click('choose-alone');let prevented=0;
  const key=(extra={})=>f.docEvents.keydown({key:'p',target:{closest:()=>null},preventDefault(){prevented++;},...extra});
  key({ctrlKey:true});key({metaKey:true});key({altKey:true});key({repeat:true});key({target:{closest:()=>({})}});assert.equal(f.api.snapshot().state,'playing');assert.equal(prevented,0);
  key();assert.equal(f.api.snapshot().state,'paused');assert.equal(prevented,1);key();assert.equal(f.api.snapshot().state,'playing');
});
test('invalid candidate save remains byte-for-byte protected during play and retry', () => {
  const f=fixture(new Map([[KEY,'{invalid']]));assert.equal(f.get('storage-warning').hidden,false);f.click('toggle');f.click('choose-alone');f.finish();f.click('retry');assert.equal(f.data.get(KEY),'{invalid');assert.equal(f.writes.length,0);
});
