#!/usr/bin/env node
/** NEW recovery regression suite, authored 2026-10-18. The missing historical
 * Repair events test is NOT claimed recovered. Fake DOM primitives reused from
 * the recovered Kart events suite; tests below exercise the actual Repair
 * controller, engine and renderer. Drawing is no-op, never browser/visual QA.
 * Only ordinary button/pointer/keyboard events can change game state. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as engine from '../../preview/repair/engine.mjs';
import { project } from '../../preview/repair/renderer.mjs';
import { PROGRESS_KEY, SHIFT_KEY } from '../../preview/repair/progress.mjs';
const markup = readFileSync(new URL('../../preview/repair/index.html', import.meta.url), 'utf8');
const gameURL = new URL('../../preview/repair/game.mjs', import.meta.url);
const FRAME_MS = 50;
let fixtureNumber = 0;
const runtimeFiles = ['index.html','repair.css','engine.mjs','levels.mjs','progress.mjs','renderer.mjs','game.mjs'];
const hashes = () => Object.fromEntries(runtimeFiles.map(name => [name, createHash('sha256').update(readFileSync(new URL('../../preview/repair/' + name, import.meta.url))).digest('hex')]));
const beforeHashes = hashes();
class FakeEventTarget {
  listeners = new Map();
  addEventListener(type, listener, options = {}) {
    const list = this.listeners.get(type) || [];
    list.push({ listener, capture: options === true || Boolean(options.capture), once: Boolean(options.once) });
    this.listeners.set(type, list);
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter(entry => entry.listener !== listener));
  }
  emit(type, init = {}) {
    const event = {
      type, target: this, currentTarget: this, defaultPrevented: false,
      bubbles: ['click', 'pointerdown', 'pointerup', 'pointermove', 'keydown', 'keyup'].includes(type), detail: 0,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.cancelBubble = true; },
      stopImmediatePropagation() { this.cancelBubble = true; this.immediateStopped = true; },
      ...init,
    };
    const path = []; for (let node = this; node; node = node.parentElement || node.eventParent) path.push(node);
    const invoke = (current, capture) => {
      event.currentTarget = current;
      for (const entry of [...(current.listeners.get(type) || [])]) {
        if (entry.capture !== capture) continue;
        entry.listener.call(current, event);
        if (entry.once) current.removeEventListener(type, entry.listener);
        if (event.immediateStopped) break;
      }
      if (!capture && !event.immediateStopped) current[`on${type}`]?.call(current, event);
    };
    for (const current of path.slice(1).reverse()) { invoke(current, true); if (event.cancelBubble) return event; }
    invoke(this, true); if (!event.immediateStopped) invoke(this, false);
    if (event.bubbles && !event.cancelBubble) for (const current of path.slice(1)) { invoke(current, false); if (event.cancelBubble) break; }
    return event;
  }
}
function matches(element, selector) {
  const s = selector.trim();
  if (s === 'button:not([data-control])') return element.tagName === 'BUTTON' && !element.hasAttribute('data-control');
  if (s === 'button:not(:disabled)') return element.tagName === 'BUTTON' && !element.disabled;
  if (s === ':disabled') return element.disabled;
  if (s === '[contenteditable]') return element.hasAttribute('contenteditable');
  if (s === '[contenteditable=""]') return element.getAttribute('contenteditable') === ''; 
  if (s.startsWith('#')) return element.id === s.slice(1);
  if (s.startsWith('.')) return element.classList.contains(s.slice(1));
  const attribute = s.match(/^(\w+)?\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]$/);
  if (attribute) {
    const [, tag, name, value] = attribute;
    return (!tag || element.tagName.toLowerCase() === tag) && element.hasAttribute(name)
      && (value === undefined || element.getAttribute(name) === value);
  }
  if (/^[a-z][\w-]*$/i.test(s)) return element.tagName.toLowerCase() === s.toLowerCase();
  throw new Error(`Extend fake DOM explicitly for selector: ${selector}`);
}
class FakeElement extends FakeEventTarget {
  constructor(tag, ownerDocument) {
    super(); this.tagName = tag.toUpperCase(); this.ownerDocument = ownerDocument;
    this.attributes = new Map(); this.dataset = {}; this.style = {}; this.children = [];
    this.hidden = false; this.disabled = false; this.open = false; this.value = ''; this.inert = false; this.tabIndex = -1;
    this._text = ''; this.parentElement = null; this.capturedPointers = new Set();
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
      remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); },
      toggle: (name, force) => { const yes = force ?? !this.classList.contains(name); this.classList[yes ? 'add' : 'remove'](name); return yes; },
    };
  }
  get id() { return this.attributes.get('id') || ''; }
  set id(value) { this.attributes.set('id', String(value)); }
  get className() { return this.attributes.get('class') || ''; }
  set className(value) { this.attributes.set('class', String(value)); }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this.replaceChildren(); this._text = String(value); }
  get isConnected() { let node = this; while (node.parentElement) node = node.parentElement; return node === this.ownerDocument.root; }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
    if (['hidden', 'disabled', 'open'].includes(name)) this[name] = true;
    if (['width', 'height'].includes(name)) this[name] = Number(value);
  }
  getAttribute(name) {
    if (name.startsWith('data-')) return this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] ?? null;
    return this.attributes.get(name) ?? null;
  }
  hasAttribute(name) { return this.getAttribute(name) !== null; }
  removeAttribute(name) {
    this.attributes.delete(name);
    if (['hidden', 'disabled', 'open'].includes(name)) this[name] = false;
  }
  appendChild(child) {
    if (child.parentElement) { const old = child.parentElement.children; const index = old.indexOf(child); if (index !== -1) old.splice(index, 1); }
    child.parentElement = this; this.children.push(child); return child;
  }
  append(...children) { for (const child of children) this.appendChild(child); }
  replaceChildren(...children) {
    for (const child of this.children) {
      if (child.contains(this.ownerDocument.activeElement)) this.ownerDocument.activeElement = this.ownerDocument.body;
      child.parentElement = null;
    }
    this.children = []; this._text = ''; this.append(...children);
  }
  set innerHTML(value) { this.html = String(value); this.replaceChildren(); parseInto(this, this.html); }
  get innerHTML() { return this.html || ''; }
  querySelectorAll(selector) {
    const selectors = selector.split(','), results = [];
    const visit = node => { for (const child of node.children) { if (selectors.some(s => matches(child, s))) results.push(child); visit(child); } };
    visit(this); return results;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (matches(node, selector)) return node; return null; }
  contains(other) { for (let node = other; node; node = node.parentElement) if (node === this) return true; return false; }
  focus() {
    const previous = this.ownerDocument.activeElement;
    if (previous === this) return;
    previous?.emit('blur', { relatedTarget: this });
    this.ownerDocument.activeElement = this;
    this.emit('focus', { relatedTarget: previous });
  }
  click() { if (!this.disabled) return this.emit('click'); }
  showModal() { this.open = true; this.querySelector('button:not(:disabled)')?.focus(); }
  close() { this.open = false; this.emit('close'); }
  scrollIntoView() {}
  matches(selector) { return selector.split(',').some(s => matches(this, s)); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 50, right: 100, bottom: 50, x: 0, y: 0 }; }
  setPointerCapture(id) { this.capturedPointers.add(id); }
  hasPointerCapture(id) { return this.capturedPointers.has(id); }
  releasePointerCapture(id) { if (this.capturedPointers.delete(id)) this.emit('lostpointercapture', { pointerId: id }); }
}
class FakeButton extends FakeElement { constructor(document) { super('button', document); } }
class FakeCanvas extends FakeElement {
  constructor(document) {
    super('canvas', document); this.width = 1200; this.height = 800; this.renderCalls = 0;
    this.rect = { left: 24, top: 40, width: 600, height: 400 };
    // A plain object avoids allocating/proxying millions of canvas calls during
    // the real multi-race renderer loop. Only drawing surfaces are no-ops.
    this.context = { canvas: this };
    const count = () => { this.renderCalls++; };
    for (const method of ['arc', 'arcTo', 'beginPath', 'bezierCurveTo', 'clearRect', 'clip', 'closePath', 'drawImage', 'ellipse', 'fill', 'fillRect', 'fillText', 'lineTo', 'moveTo', 'quadraticCurveTo', 'rect', 'resetTransform', 'restore', 'rotate', 'roundRect', 'save', 'scale', 'setLineDash', 'setTransform', 'stroke', 'strokeRect', 'strokeText', 'transform', 'translate']) this.context[method] = count;
    for (const method of ['createLinearGradient', 'createRadialGradient', 'createConicGradient']) this.context[method] = () => ({ addColorStop: count });
    this.context.measureText = text => ({ width: String(text).length * 8 });
  }
  getContext(kind) { assert.equal(kind, '2d'); return this.context; }
  getBoundingClientRect() { const r = this.rect; return { ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height }; }
}
function parseInto(parent, html) {
  const stack = [parent], voidTags = new Set(['meta', 'link', 'br', 'img', 'input', 'hr', 'source', 'wbr']);
  for (const token of html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || []) {
    if (/^<!--|^<!/i.test(token)) continue;
    if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
    if (token.startsWith('<')) {
      const tag = token.match(/^<([\w-]+)/)?.[1]; if (!tag) continue;
      const element = parent.ownerDocument.createElement(tag);
      const attrs = token.slice(tag.length + 1, -1);
      for (const [, name, double, single, plain] of attrs.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) element.setAttribute(name, double ?? single ?? plain ?? '');
      stack.at(-1).appendChild(element);
      if (!voidTags.has(tag.toLowerCase()) && !token.endsWith('/>')) stack.push(element);
    } else stack.at(-1)._text += token;
  }
}
class FakeDocument extends FakeEventTarget {
  constructor() {
    super(); this.hidden = false; this.visibilityState = 'visible';
    this.root = new FakeElement('document', this); parseInto(this.root, markup);
    this.body = this.querySelector('body'); this.documentElement = this.querySelector('html'); this.activeElement = this.body;
  }
  createTextNode(text) { const node = new FakeElement('text', this); node.textContent = text; return node; }
  createElement(tag) { return tag.toLowerCase() === 'canvas' ? new FakeCanvas(this) : tag.toLowerCase() === 'button' ? new FakeButton(this) : new FakeElement(tag, this); }
  getElementById(id) { return this.root.querySelector(`#${id}`); }
  querySelector(selector) { return this.root.querySelector(selector); }
  querySelectorAll(selector) { return this.root.querySelectorAll(selector); }
}

async function fixture(options = {}) {
  const document = new FakeDocument(), window = new FakeEventTarget();
  document.root.eventParent = document; document.eventParent = window;
  const callbacks = new Map(), writes = [], removals = [], storage = new Map(Object.entries(options.saved || {}));
  let rafId = 0, timestamp = 1000;
  const localStorage = {
    getItem(key) { assert.ok([PROGRESS_KEY, SHIFT_KEY].includes(key)); if (options.readDenied) throw Error('Storage read denied'); return storage.get(key) ?? null; },
    setItem(key, value) { assert.ok([PROGRESS_KEY, SHIFT_KEY].includes(key)); if (options.writeDenied) throw Error('Storage write denied'); storage.set(key, String(value)); writes.push({ key, value }); },
    removeItem(key) { assert.ok([PROGRESS_KEY, SHIFT_KEY].includes(key)); if (options.writeDenied) throw Error('Storage removal denied'); storage.delete(key); removals.push(key); },
  };
  Object.assign(window, { document, localStorage, innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1 });
  const globals = {
    document, window, localStorage, HTMLElement: FakeElement, HTMLButtonElement: FakeButton, HTMLCanvasElement: FakeCanvas,
    performance: { now: () => timestamp },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame(callback) { const id = ++rafId; callbacks.set(id, callback); return id; },
    cancelAnimationFrame(id) { callbacks.delete(id); },
  };
  Object.assign(window, { matchMedia: globals.matchMedia, requestAnimationFrame: globals.requestAnimationFrame, cancelAnimationFrame: globals.cancelAnimationFrame });
  const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  function restoreGlobals() { for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } }
  function frame(ms = FRAME_MS) {
    timestamp += ms;
    assert.equal(callbacks.size, 1, 'Controller must have exactly one scheduled animation frame');
    const [id, callback] = callbacks.entries().next().value; callbacks.delete(id); callback(timestamp);
  }
  const f = {
    document, window, writes, removals, storage, frame, restoreGlobals,
    el(id) { const element = document.getElementById(id); assert.ok(element, `Missing #${id}`); return element; },
    read() { return window.repairSnapshot(); },
    frames(n, ms = FRAME_MS) { for (let i = 0; i < n; i++) frame(ms); },
    click(id) { return this.el(id).click(); },
    button(container, text) {
      const button = this.el(container).querySelectorAll('button').find(el => el.textContent.includes(text));
      assert.ok(button, `Missing button ${text} in #${container}`); return button;
    },
    key(key, init = {}) { return document.activeElement.emit('keydown', { key, code: key === ' ' ? 'Space' : /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key, repeat: false, ctrlKey: false, altKey: false, metaKey: false, ...init }); },
    keyup(key, init = {}) { return document.activeElement.emit('keyup', { key, code: key === ' ' ? 'Space' : /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key, ...init }); },
    hide(hidden = true) { document.hidden = hidden; document.visibilityState = hidden ? 'hidden' : 'visible'; document.emit('visibilitychange'); },
    controlPointer(id, type, pointerId = 1, init = {}) {
      const target = this.el(id);
      const event = target.emit(type, { pointerId, pointerType: 'touch', button: 0, buttons: type === 'pointerup' ? 0 : 1, isPrimary: pointerId === 1, clientX: 20, clientY: 20, ...init });
      if (['pointerup', 'pointercancel'].includes(type)) target.releasePointerCapture(pointerId);
      if (type === 'lostpointercapture') target.capturedPointers.delete(pointerId);
      return event;
    },
    pointer(type, x, y, init = {}) {
      const canvas = this.el('workshop');
      const event = canvas.emit(type, { pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true, clientX: x, clientY: y, ...init });
      if (type === 'pointerup' || type === 'pointercancel') canvas.releasePointerCapture(event.pointerId);
      if (type === 'lostpointercapture') canvas.capturedPointers.delete(event.pointerId);
      return event;
    },
  };
  try { await import(`${gameURL.href}?event-fixture=${++fixtureNumber}`); frame(); return f; }
  catch (error) { restoreGlobals(); throw error; }
}

let passed = 0, failed = 0;
async function test(name, fn, options) {
  let f;
  try { f = await fixture(options); await fn(f); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}\n  ${error.stack}`); }
  finally { f?.restoreGlobals(); }
}
function frozen(f) { const view=f.read(); f.frames(8,1000); assert.deepEqual(f.read(),view); }
function select(f,slot) { const b=f.el('slot-list').children.find(b=>b.dataset.slot===slot); assert.ok(b); b.click(); }
function commandButton(f,cmd) {
  if(cmd.slot) select(f,cmd.slot);
  else if(cmd.stationId) select(f,cmd.stationId.replace('station-',''));
  else select(f,'A');
  const key=cmd.type==='build'?`build-${cmd.slot}-${cmd.stationType}`:cmd.type==='assign'?`assign-${cmd.staffId}-${cmd.stationId}`:cmd.type==='hire'?'hire':`${cmd.type}-${cmd.stationId}`;
  return [...f.el('build-controls').children,...f.el('upgrade-controls').children,...f.el('worker-controls').children].find(b=>b.dataset.commandKey===key);
}
function act(f,cmd,required=true) {
  const b=commandButton(f,cmd); assert.ok(b,JSON.stringify(cmd));
  if(b.disabled) { if(required) assert.fail(`Disabled command ${JSON.stringify(cmd)}: ${b.title}`); return false; }
  b.focus(); b.click();
  assert.equal(f.document.activeElement.isConnected,true,'Command keeps focus on live controls');
  return true;
}
function start(f) { assert.equal(f.read().state,'ready'); f.click('primary-action'); assert.equal(f.read().state,'playing'); }
function keyPair(f,key,options={}) { f.key(key,options); f.keyup(key,options); }
function canvasXY(f,slot) {
  const p=engine.SLOTS.find(p=>p.id===slot), r=f.el('workshop').rect, q=project(p.x,p.y), scale=Math.min(r.width/1200,r.height/800);
  return [r.left+(r.width-1200*scale)/2+q.x*scale,r.top+(r.height-800*scale)/2+q.y*scale];
}
function tap(f,slot,init={}) { const [x,y]=canvasXY(f,slot); f.pointer('pointerdown',x,y,init); f.pointer('pointerup',x,y,init); }
function prepare(f) {
  if(f.read().levelIndex===1) act(f,{type:'build',slot:'B',stationType:'electrical'});
  if([1,3].includes(f.read().levelIndex)) { act(f,{type:'hire'}); act(f,{type:'assign',staffId:'t3',stationId:'station-B'}); }
}
function pilot(f) {
  let s=f.read(); if(s.state!=='playing'||s.tick%5) return;
  for(const st of s.stations) if(st.broken&&!st.maintenance) act(f,{type:'maintain',stationId:st.id},false);
  for(const type of ['mechanical','electrical','diagnosis']) {
    s=f.read(); const st=s.stations.find(x=>x.type===type&&x.level<3);
    if(st&&s.credits>=engine.COSTS.upgrade[st.level]+60) act(f,{type:'upgrade',stationId:st.id},false);
  }
}
function runDay(f,policy=pilot) {
  let limit=6000;
  while(f.read().state==='playing'&&limit--) { policy(f); f.frame(50); }
  assert.ok(limit>0,'Day must reach terminal state'); f.frames(4,50); return f.read();
}
function validShift(day=0) { const s=engine.createGame(day); engine.start(s); engine.step(s,.25); engine.step(s,.25); return JSON.stringify({version:1,checkpoint:engine.checkpoint(s)}); }
const campaignResults=[];
await test('actual controller initialises with real renderer and readonly diagnostics',f=>{
  assert.equal(f.read().state,'ready'); assert.ok(f.el('workshop').renderCalls>100);
  const d=Object.getOwnPropertyDescriptor(f.window,'repairSnapshot'); assert.equal(d.writable,false); assert.equal(d.configurable,false);
  const s=f.read(); assert.ok(Object.isFrozen(s)&&Object.isFrozen(s.stations)); assert.throws(()=>s.credits=999999,TypeError);
  assert.equal(f.window.repairSetState,undefined); frozen(f);
  assert.equal(f.el('canvas-wrap').dataset.state,'ready'); assert.equal(f.el('pause').disabled,true);
});
await test('day chooser only unlocks day one; locked choices do nothing',f=>{
  f.click('days'); const buttons=f.el('day-list').children;
  assert.equal(buttons.length,8); assert.equal(buttons.filter(b=>!b.disabled).length,1);
  buttons[7].click(); assert.equal(f.read().levelIndex,0); f.click('days-close'); assert.equal(f.read().state,'ready');
});
await test('native command buttons allow ready building, hiring, assignment and focus repair',f=>{
  const s=f.read(); act(f,{type:'build',slot:'B',stationType:'mechanical'});
  assert.equal(f.read().credits,s.credits-100); assert.ok(f.read().stations.some(x=>x.slot==='B')); frozen(f);
  const b=commandButton(f,{type:'hire'}); assert.equal(b.disabled,true); const v=f.read();b.click();assert.deepEqual(f.read(),v);
});
await test('pause/resume freezes clock and huge RAF gap is clamped',f=>{
  start(f); f.frames(5); f.click('pause'); assert.equal(f.read().state,'paused'); frozen(f);
  f.click('primary-action'); const before=f.read().tick; f.frame(999999); assert.equal(f.read().tick,before);
  f.frame(999999); assert.ok(f.read().tick-before<=2); assert.equal(f.read().state,'playing');
});
await test('P and Escape toggle once per fresh press; held key never resumes',f=>{
  start(f); f.key('p'); assert.equal(f.read().state,'paused'); f.key('p',{repeat:true}); assert.equal(f.read().state,'paused');
  f.keyup('p'); keyPair(f,'p'); assert.equal(f.read().state,'playing'); keyPair(f,'Escape'); assert.equal(f.read().state,'paused');
});
await test('modifier/editable shortcuts ignored; Enter and Space repeat defaults prevented',f=>{
  start(f); for(const opts of [{ctrlKey:true},{metaKey:true},{altKey:true},{target:{tagName:'INPUT'}},{target:{isContentEditable:true}}]) keyPair(f,'p',opts);
  assert.equal(f.read().state,'playing');
  for(const key of ['Enter',' ']) { assert.equal(f.key(key).defaultPrevented,false); assert.equal(f.key(key,{repeat:true}).defaultPrevented,true); f.keyup(key); }
});
await test('help and H pause; closing help never auto-resumes',f=>{
  start(f); f.frames(10); keyPair(f,'h'); assert.equal(f.el('help-dialog').open,true); assert.equal(f.read().state,'paused');
  frozen(f); f.click('help-close'); assert.equal(f.read().state,'paused'); frozen(f); f.click('primary-action');assert.equal(f.read().state,'playing');
});
await test('dialog native cancel prevents default and stays paused',f=>{
  start(f); f.click('help'); const e=f.el('help-dialog').emit('cancel'); assert.equal(e.defaultPrevented,true);
  assert.equal(f.el('help-dialog').open,false); assert.equal(f.read().state,'paused'); frozen(f);
});
await test('help then blur then close stays paused and requires explicit resume',f=>{
  start(f);f.click('help');f.window.emit('blur');f.click('help-close');assert.equal(f.read().state,'paused');frozen(f);
});
await test('visibility and pagehide persist paused checkpoint; return does not resume',f=>{
  start(f);f.frames(10);f.hide();assert.equal(f.read().state,'paused');frozen(f);f.hide(false);assert.equal(f.read().state,'paused');
  f.click('primary-action');f.frames(3);f.window.emit('pagehide');assert.equal(f.read().state,'paused');
  const saved=JSON.parse(f.storage.get(SHIFT_KEY)).checkpoint;assert.equal(engine.restore(saved).state,'paused');
});
await test('retry cancel and dialog Escape retain exact run and records',f=>{
  start(f);f.frames(10);f.click('retry');const v=f.read();assert.equal(f.el('confirm-dialog').open,true);f.click('confirm-cancel');assert.deepEqual(f.read(),v);
  f.click('retry');f.el('confirm-dialog').emit('cancel');assert.deepEqual(f.read(),v);f.click('confirm-accept');assert.deepEqual(f.read(),v);
});
await test('retry confirm produces fresh ready day and keeps focus connected',f=>{
  start(f);f.frames(10);f.click('retry');f.click('confirm-accept');assert.equal(f.read().state,'ready');assert.equal(f.read().tick,0);
  assert.equal(f.document.activeElement.id,'primary-action');assert.equal(f.document.activeElement.isConnected,true);
});
await test('canvas click selects correct projected station; buttons work while paused',f=>{
  start(f);tap(f,'C');assert.equal(f.el('selected-code').textContent,'C 号');f.click('pause');tap(f,'F');assert.equal(f.el('selected-code').textContent,'C 号');
  select(f,'F');assert.equal(f.el('selected-code').textContent,'F 号');
});
await test('pointer cancel, leave, capture loss and dragged contacts cannot select',f=>{
  start(f);const [x,y]=canvasXY(f,'C');
  for(const type of ['pointercancel','pointerleave','lostpointercapture']) { f.pointer('pointerdown',x,y);f.pointer(type,x,y);f.pointer('pointerup',x,y);assert.equal(f.el('selected-code').textContent,'A 号'); }
  f.pointer('pointerdown',x,y);f.pointer('pointermove',x+30,y);f.pointer('pointerup',x,y);assert.equal(f.el('selected-code').textContent,'A 号');
});
await test('unrelated pointer cancel/up preserves original contact and nonprimary is ignored',f=>{
  start(f);const[x,y]=canvasXY(f,'C');f.pointer('pointerdown',x,y);f.pointer('pointercancel',x,y,{pointerId:2});f.pointer('pointerup',x,y,{pointerId:2});f.pointer('pointerup',x,y);assert.equal(f.el('selected-code').textContent,'C 号');
  select(f,'A');tap(f,'F',{pointerId:2,isPrimary:false});assert.equal(f.el('selected-code').textContent,'A 号');tap(f,'F',{button:2});assert.equal(f.el('selected-code').textContent,'A 号');
});
await test('pause, blur and dialog invalidate held canvas contacts',f=>{
  start(f);const[x,y]=canvasXY(f,'C');for(const action of [()=>f.click('pause'),()=>f.window.emit('blur'),()=>{f.click('help');f.click('help-close');}]) {
    f.pointer('pointerdown',x,y);action();f.click('primary-action');f.pointer('pointerup',x,y);assert.equal(f.el('selected-code').textContent,'A 号');
  }
});
await test('object-fit letterbox input is rejected while painted coordinates still map',f=>{
  start(f);f.el('workshop').rect={left:20,top:50,width:360,height:390};f.pointer('pointerdown',200,55);f.pointer('pointerup',200,55);assert.equal(f.el('selected-code').textContent,'A 号');
  tap(f,'E');assert.equal(f.el('selected-code').textContent,'E 号');
});
await test('restored active checkpoint is paused and does not move until explicit resume',f=>{
  assert.equal(f.read().state,'paused');assert.equal(f.read().tick,10);assert.equal(f.el('restore-note').hidden,false);frozen(f);f.click('primary-action');f.frames(5);assert.ok(f.read().tick>10);
},{saved:{[SHIFT_KEY]:validShift()}});
await test('saved ready setup restores paused without losing spend',f=>{
  assert.equal(f.read().state,'paused');assert.equal(f.read().credits,30);assert.equal(f.read().stations.find(s=>s.slot==='D').level,2);frozen(f);f.click('primary-action');assert.equal(f.read().state,'playing');
},{saved:{[SHIFT_KEY]:(()=>{const s=engine.createGame(0);engine.command(s,{type:'upgrade',stationId:'station-D'});return JSON.stringify({version:1,checkpoint:engine.checkpoint(s)});})()}});
await test('malformed shift cleared without erasing valid campaign progress',f=>{
  assert.equal(f.read().state,'ready');assert.equal(f.storage.has(SHIFT_KEY),false);assert.equal(f.el('restore-note').hidden,false);f.click('days');assert.equal(f.el('day-list').children.filter(b=>!b.disabled).length,3);
},{saved:{[SHIFT_KEY]:'bad json',[PROGRESS_KEY]:JSON.stringify({version:1,unlocked:2,best:{0:{completed:8,lost:0,credits:100}}})}});
await test('engine-invalid or locked-day checkpoint cannot jump the campaign',f=>{
  assert.equal(f.read().state,'ready');assert.equal(f.read().levelIndex,0);assert.equal(f.storage.has(SHIFT_KEY),false);assert.equal(f.el('restore-note').hidden,false);
},{saved:{[SHIFT_KEY]:validShift(7)}});
await test('read/write storage failures are visible without preventing play',f=>{
  assert.match(f.el('save-note').textContent,/阻止了存档/);start(f);f.frames(20);assert.equal(f.read().state,'playing');assert.ok(f.read().tick>0);
},{readDenied:true,writeDenied:true});
await test('eight days naturally unlock via actual command buttons, maintain and finish',f=>{
  for(let day=0;day<8;day++) {
    assert.equal(f.read().levelIndex,day);prepare(f);start(f);const result=runDay(f);assert.equal(result.state,'won',`Day ${day+1}: ${result.reason}`);
    const progress=JSON.parse(f.storage.get(PROGRESS_KEY));assert.equal(progress.unlocked,Math.min(7,day+1));assert.ok(progress.best[day]);assert.equal(Object.keys(progress.best).length,day+1);assert.equal(f.storage.has(SHIFT_KEY),false);
    campaignResults.push({day:day+1,completed:result.completed,lost:result.lost,credits:result.credits,seconds:result.elapsed});
    frozen(f);f.click('primary-action');
  }
  assert.equal(f.el('days-dialog').open,true);assert.equal(f.el('day-list').children.filter(b=>!b.disabled).length,8);
  f.click('days-close');assert.match(f.el('overlay-title').textContent,/长明/);
});
await test('loss never unlocks next day; retry preserves previous victory',f=>{
  start(f);const first=runDay(f);assert.equal(first.state,'won');f.click('primary-action');start(f);const loss=runDay(f,()=>{});assert.equal(loss.state,'lost');
  const p=JSON.parse(f.storage.get(PROGRESS_KEY));assert.equal(p.unlocked,1);assert.deepEqual(Object.keys(p.best),['0']);assert.equal(f.storage.has(SHIFT_KEY),false);
  f.click('primary-action');assert.equal(f.read().state,'ready');assert.equal(f.read().levelIndex,1);
});
await test('finished records survive active save reload and canceled day switch',async f=>{
  start(f);assert.equal(runDay(f).state,'won');f.click('primary-action');prepare(f);start(f);f.frames(20);f.window.emit('blur');
  const saved=Object.fromEntries(f.storage);const before=f.read();f.restoreGlobals();const g=await fixture({saved});
  try { assert.deepEqual(g.read(),before);g.click('days');g.el('day-list').children[0].click();assert.equal(g.el('confirm-dialog').open,true);g.click('confirm-cancel');assert.deepEqual(g.read(),before);
    g.click('days');g.el('day-list').children[0].click();g.click('confirm-accept');assert.equal(g.read().state,'ready');assert.equal(g.read().levelIndex,0);assert.ok(JSON.parse(g.storage.get(PROGRESS_KEY)).best[0]);
  } finally {g.restoreGlobals();}
});
await test('terminal command buttons cannot spend money or mutate results',f=>{
  start(f);runDay(f);const before=f.read();for(const id of ['build-controls','upgrade-controls','worker-controls'])for(const b of f.el(id).children){assert.equal(b.disabled,true);b.click();}assert.deepEqual(f.read(),before);
});
assert.deepEqual(hashes(),beforeHashes,'Tests must not mutate runtime sources');
console.log(JSON.stringify({suite:'NEW_NODE_CONTROLLER_REGRESSION',passed,failed,campaignResults,realBrowser:false,sourceHashesUnchanged:true},null,2));
if(failed) process.exitCode=1;
