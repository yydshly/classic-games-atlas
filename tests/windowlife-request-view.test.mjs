import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../experiments/windowlife-request/view.mjs';
import { createScene, command, update, snapshot } from '../experiments/windowlife-request/scene.mjs';

test('actual model states draw without mutation or non-finite coordinates (non-browser canvas fixture)', () => {
  let calls=0;const gradient={addColorStop(){}};
  const ctx=new Proxy({}, {get(target,key){if(key in target)return target[key];if(['createLinearGradient','createRadialGradient'].includes(key))return()=>gradient;if(key==='measureText')return s=>({width:String(s).length*8});return(...args)=>{calls++;for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),String(key));};},set(target,key,value){target[key]=value;return true;}});
  const renderer=new Renderer({getContext:()=>ctx});let states=0;
  for(const choice of ['now','later','alone']){
    const g=createScene();const draw=()=>{const before=snapshot(g);renderer.draw(g,g.time);assert.deepEqual(g,before);states++;};draw();command(g,'start');draw();command(g,choice);
    for(let i=0;i<300&&g.state==='playing';i++){update(g,.1);if(i%5===0)draw();}draw();command(g,'close');draw();
  }
  const g=createScene();command(g,'start');command(g,'later');while(g.phase!=='sharing')update(g,.1);command(g,'cancel');assert.equal(g.art.note.location,'carried');renderer.draw(g,g.time);
  assert.ok(states>60);assert.ok(calls>10000);
});
