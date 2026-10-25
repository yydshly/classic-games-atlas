import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,KEY} from './helpers/inlet-preview-dom.mjs';
const move=f=>{f.step();f.events.keydown({code:'ArrowRight',target:f.nodes.get('#battlefield'),preventDefault(){}});for(let i=0;i<12;i++)f.step();f.events.keyup({code:'ArrowRight'});};

test('current bundle starts, accepts keyboard input, pauses and restores only its isolated checkpoint',()=>{
  const f=fixture();assert.equal(f.diagnostics().state,'ready');f.click('start');move(f);f.click('pause');
  const paused=f.diagnostics();assert.equal(paused.state,'paused');assert(paused.time>0);assert(paused.player.x>1);assert.equal(paused.input.keys.length,0);
  const reload=fixture(new Map(f.storage));assert.equal(reload.diagnostics().state,'paused');
  assert.deepEqual(reload.diagnostics().player,paused.player);assert.equal(reload.diagnostics().time,paused.time);
  assert([...f.reads,...f.writes,...reload.reads,...reload.writes].every(k=>k===KEY));
  assert.equal(f.storage.get('classic-atlas.preview.inlet-v3-threat.v1'),'formal sentinel');assert.equal(f.storage.get('classic-atlas.inlet.v1'),'legacy sentinel');
});
test('manual and retry cancellation preserve paused progress; native summary keeps Space',()=>{
  const f=fixture();f.click('start');move(f);f.click('pause');const paused=f.diagnostics();
  let prevented=false;f.events.keydown({code:'Space',target:f.summary(),preventDefault(){prevented=true;}});assert.equal(prevented,false);
  f.click('help');assert(f.nodes.get('#help-dialog').open);f.click('close-help');assert(!f.nodes.get('#help-dialog').open);
  f.click('retry');assert(f.nodes.get('#retry-dialog').open);f.click('retry-no');
  assert.equal(f.diagnostics().state,'paused');assert.equal(f.diagnostics().time,paused.time);assert.equal(f.focus,'retry');
});
test('blur clears held inputs and confirmed retry returns to a clean ready state',()=>{
  const f=fixture();f.click('start');f.step();const pad=f.nodes.get('#move-right');pad.handlers.pointerdown({preventDefault(){},pointerId:7});
  for(let i=0;i<8;i++)f.step();assert.equal(f.diagnostics().input.touches,1);
  f.windowEvents.blur();assert.equal(f.diagnostics().state,'paused');assert.equal(f.diagnostics().input.touches,0);
  f.click('retry');f.click('retry-yes');const reset=f.diagnostics();assert.equal(reset.state,'ready');assert.equal(reset.time,0);assert.equal(reset.lives,3);
  assert.equal(reset.input.keys.length,0);assert.equal(reset.input.touches,0);
});
test('storage write denial stays recoverable and cannot silently look saved',()=>{
  const storage=new Map();storage.set=()=>{throw new Error('storage full fixture');};const f=fixture(storage);
  assert.equal(f.diagnostics().storageReason,'write');assert.equal(f.nodes.get('#save-warning').hidden,false);
  f.click('start');move(f);assert.equal(f.diagnostics().state,'playing');assert(f.diagnostics().time>0);
});
