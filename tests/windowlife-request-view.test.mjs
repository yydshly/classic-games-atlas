import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../experiments/windowlife-request-preview/source/view.mjs';
import { createScene, command, update, snapshot } from '../experiments/windowlife-request-preview/source/scene.mjs';

// Record real renderer output in the fixed sketch close-up, not inferred colors
// from the model. This is still a Canvas command fixture, not browser UI QA.
function warmSketchMarks(g) {
  const calls = [], stack = []; let path = [], transform = { x: 0, y: 0, sx: 1, sy: 1 };
  const point = (x, y) => [transform.x + x * transform.sx, transform.y + y * transform.sy];
  const ctx = new Proxy({
    save() { stack.push({ ...transform, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle }); },
    restore() { const prior = stack.pop(); transform = prior; this.fillStyle = prior.fillStyle; this.strokeStyle = prior.strokeStyle; },
    translate(x, y) { transform.x += x * transform.sx; transform.y += y * transform.sy; },
    scale(x, y) { transform.sx *= x; transform.sy *= y; },
    beginPath() { path = []; },
    moveTo(x, y) { path.push(['moveTo', ...point(x, y)]); },
    lineTo(x, y) { path.push(['lineTo', ...point(x, y)]); },
    ellipse(x, y, rx, ry) { path.push(['ellipse', ...point(x, y), rx * transform.sx, ry * transform.sy]); },
    stroke() { if (this.strokeStyle === '#c47746') calls.push({ op: 'stroke', path: structuredClone(path) }); },
    fill() { if (this.fillStyle === '#c47746') calls.push({ op: 'fill', path: structuredClone(path) }); }
  }, { get(target, key) { if (key in target) return target[key]; if (String(key).includes('Gradient')) return () => ({ addColorStop() {} }); return () => {}; } });
  new Renderer({ getContext: () => ctx }).draw(g, g.time);
  return calls.filter(p => p.path.length && p.path.every(v => v[1] > 780 && v[2] > 240 && v[2] < 330));
}

test('cancelling after any partial shared stroke freezes the actual orange geometry', () => {
  for (let sharedTicks = 1; sharedTicks < 60; sharedTicks++) {
    const g = createScene(); command(g, 'start'); command(g, 'now');
    while (g.phase !== 'co-creating') update(g, .1);
    for (let i = 0; i < sharedTicks; i++) update(g, .1);
    const before = warmSketchMarks(g);
    if (sharedTicks === 1) assert.equal(before.length, 1);
    command(g, 'cancel');
    while (g.state === 'playing') update(g, .1);
    assert.equal(g.art.sketch.mode, 'mixed');
    assert.deepEqual(warmSketchMarks(g), before, `orange marks changed after cancellation at ${sharedTicks} ticks`);
  }
});

test('true shared completion retains all warm details, while separate endings have none', () => {
  for (const choice of ['now', 'later', 'alone']) {
    const g = createScene(); command(g, 'start'); command(g, choice);
    while (g.state === 'playing') update(g, .1);
    assert.equal(warmSketchMarks(g).length, choice === 'now' ? 5 : 0);
  }
});

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
