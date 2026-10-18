#!/usr/bin/env node
/**
 * Node-only event tests of the actual games/meadow/game.mjs controller.
 * Real engine, progress and renderer; only the browser surfaces are simulated.
 * No private state writes, copied handlers, browser launch, network, or installs.
 * The pilot emits ordinary keyboard/pointer movement and hold-release shots at
 * 100 ms decision cadence. Read-only snapshots cannot set position or award wins.
 * Canvas drawing is a no-op: these are NOT visual, browser-layout, or device tests.
 * Run: node scripts/test_meadow_events.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as engine from '../engine.mjs';
import { pilotInput } from './meadow_pilot.mjs';
import { PROGRESS_KEY, CURRENT_KEY } from '../progress.mjs';

const frozenFiles = ['index.html', 'meadow.css', 'game.mjs', 'engine.mjs', 'levels.mjs', 'progress.mjs', 'renderer.mjs'];
const hashFiles = () => Object.fromEntries(frozenFiles.map(file => [file, createHash('sha256').update(readFileSync(new URL(`../${file}`, import.meta.url))).digest('hex')]));
const initialHashes = hashFiles();
const supportingHashes = () => Object.fromEntries(['test_meadow_events.mjs', 'meadow_pilot.mjs'].map(file => [file, createHash('sha256').update(readFileSync(new URL(`./${file}`, import.meta.url))).digest('hex')]));
const initialSupportingHashes = supportingHashes();
const markup = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const gameURL = new URL('../game.mjs', import.meta.url);
const FRAME_MS = 1000 / 60;
let fixtureNumber = 0;
const renderedStates = new Set();
const campaignLog = [];

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
    // the real multi-match renderer loop. Only drawing surfaces are no-ops.
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
    getItem(key) { assert.ok([PROGRESS_KEY, CURRENT_KEY].includes(key)); if (options.readDenied) throw Error('Storage read denied'); return storage.get(key) ?? null; },
    setItem(key, value) { assert.ok([PROGRESS_KEY, CURRENT_KEY].includes(key)); if (options.writeDenied) throw Error('Storage write denied'); storage.set(key, String(value)); writes.push({ key, value }); },
    removeItem(key) { assert.ok([PROGRESS_KEY, CURRENT_KEY].includes(key)); if (options.writeDenied) throw Error('Storage removal denied'); storage.delete(key); removals.push(key); },
  };
  Object.assign(window, { document, localStorage, innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1 });
  const NativeDate = globalThis.Date;
  class FixtureDate extends NativeDate { static now() { return timestamp; } }
  const globals = {
    Date: FixtureDate, document, window, localStorage, HTMLElement: FakeElement, HTMLButtonElement: FakeButton, HTMLCanvasElement: FakeCanvas,
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
    const [id, callback] = callbacks.entries().next().value; callbacks.delete(id);
    const canvas = document.getElementById('meadow'), beforeCalls = canvas.renderCalls;
    callback(timestamp);
    if (canvas.renderCalls > beforeCalls && window.meadowSnapshot) renderedStates.add(window.meadowSnapshot().state);
  }
  const f = {
    document, window, writes, removals, storage, frame, restoreGlobals,
    el(id) { const element = document.getElementById(id); assert.ok(element, `Missing #${id}`); return element; },
    read() { return window.meadowSnapshot(); },
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
      const canvas = this.el('meadow');
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

function assertDeepFrozen(value, path = 'snapshot') {
  if (!value || typeof value !== 'object') return;
  assert.equal(Object.isFrozen(value), true, `${path} must be frozen`);
  for (const [key, child] of Object.entries(value)) assertDeepFrozen(child, `${path}.${key}`);
}
function frozen(f) {
  const before = f.read();
  f.frames(8, 1000);
  assert.deepEqual(f.read(), before, 'Inactive controller state must not advance with RAF time');
}
function checkedClick(f, id) {
  const button = f.el(id);
  assert.equal(button.disabled, false, `#${id} must be enabled`);
  assert.equal(button.hidden, false, `#${id} must be visible`);
  button.focus(); button.click();
  assert.equal(f.document.activeElement.isConnected, true, `#${id} leaves focus on a live control`);
}
function keyPair(f, key, options = {}) { f.key(key, options); f.keyup(key, options); }
function nativeActivation(f, key, repeat = false) {
  const button = f.document.activeElement;
  const down = f.key(key, { repeat });
  if (!down.defaultPrevented && key === 'Enter' && button instanceof FakeButton) button.click();
  const up = f.keyup(key);
  if (!up.defaultPrevented && key === ' ' && button instanceof FakeButton) button.click();
  return { down, up };
}
function until(f, predicate, label, maximumFrames = 30000, ms = FRAME_MS) {
  for (let i = 0; i < maximumFrames; i++) {
    const view = f.read();
    if (predicate(view)) return view;
    f.frame(ms);
  }
  assert.fail(`Controller did not ${label}: ${JSON.stringify(f.read())}`);
}
function start(f, playing = true) {
  assert.equal(f.read().state, 'ready');
  checkedClick(f, 'primary-action');
  if (f.el('help-dialog').open) checkedClick(f, 'help-done');
  assert.equal(f.read().state, 'kickoff');
  f.el('meadow').focus();
  if (playing) { until(f, v => v.state === 'playing', 'finish the natural kickoff', 600); f.frame(); }
}
function assertReleased(f) {
  const s = f.read();
  assert.equal(s.charging, false, 'No stale shot charge');
  if (s.input) {
    assert.equal(s.input.x, 0); assert.equal(s.input.y, 0); assert.equal(s.input.shoot, false);
    if (s.input.sources) assert.equal(s.input.sources.length, 0);
    if (s.input.pointers) assert.equal(s.input.pointers.length, 0);
  }
}
function chapterButtons(f) { return f.el('dialog-matches').querySelectorAll('[data-level]'); }
function engineView(view, reference) { return Object.fromEntries(Object.keys(reference).map(key => [key, view[key]])); }

function player(f) { const s = f.read(); return s.players[s.controlled]; }
function shotCount(f) { return f.read().stats.shots[0]; }
function motion(f, before, axis, sign) { assert.ok((player(f)[axis] - before[axis]) * sign > 0, `Expected ${axis} movement ${sign}`); }
function samePosition(f, before) {
  const p = player(f);
  assert.ok(Math.abs(p.vx) <= Math.abs(before.vx) + 1e-8, 'Released horizontal velocity must coast down');
  assert.ok(Math.abs(p.vy) <= Math.abs(before.vy) + 1e-8, 'Released vertical velocity must coast down');
  if (f.read().input) { assert.equal(f.read().input.x, 0); assert.equal(f.read().input.y, 0); }
}
function noShot(f, before = 0) { assert.equal(shotCount(f), before, 'Cancelled/repeated source must not fire'); }
function beginCharge(f, source = 'keyboard', pointerId = 11) {
  if (source === 'keyboard') f.key(' ');
  else f.controlPointer('shoot', 'pointerdown', pointerId);
  f.frames(10); assert.equal(f.read().charging, true); noShot(f);
}
function closeModal(f, id) { f.click(id); assert.equal(f.read().state, 'paused'); }

await test('actual module starts ready, renders real Canvas, and exposes deeply immutable diagnostics', f => {
  assert.equal(f.read().state, 'ready');
  assert.ok(f.el('meadow').renderCalls > 100, 'The actual renderer must execute Canvas calls');
  const descriptor = Object.getOwnPropertyDescriptor(f.window, 'meadowSnapshot');
  assert.equal(descriptor.writable, false); assert.equal(descriptor.configurable, false);
  assert.equal(f.window.meadowSetState, undefined);
  const view = f.read(); assertDeepFrozen(view);
  assert.throws(() => { view.state = 'won'; }, TypeError);
  assert.throws(() => { view.players[0].x = 9999; }, TypeError);
  assert.equal(f.read().state, 'ready'); assertReleased(f); frozen(f);
  f.click('chapters'); assert.equal(chapterButtons(f).length, 8);
  assert.equal(chapterButtons(f).filter(button => !button.disabled).length, 1);
  const before = f.read(); chapterButtons(f).at(-1).click(); assert.deepEqual(f.read(), before);
  f.click('chapters-close'); assert.equal(f.read().state, 'ready');
});

await test('ordinary primary action starts a natural kickoff, then playing with no held input', f => {
  start(f, false); assertReleased(f);
  until(f, s => s.state === 'playing', 'finish kickoff', 180);
  assertReleased(f); assert.equal(f.read().players.length, 6);
  assert.deepEqual(f.read().score, [0, 0]); noShot(f);
});

await test('keyboard movement aliases, uppercase, independent releases and opposite directions', f => {
  start(f); const before = player(f);
  assert.equal(f.key('D').defaultPrevented, true); f.frames(3); motion(f, before, 'x', 1);
  f.key('ArrowRight'); f.keyup('D'); const right = player(f); f.frames(3); motion(f, right, 'x', 1);
  f.key('a'); const cancelled = player(f); f.frames(3); samePosition(f, cancelled);
  f.keyup('ArrowRight'); const left = player(f); f.frames(3); motion(f, left, 'x', -1);
  f.keyup('a'); const released = player(f); f.frames(3); samePosition(f, released);
  for (const [key, sign] of [['w', -1], ['ArrowDown', 1]]) {
    const p = player(f); f.key(key); f.frames(3); motion(f, p, 'y', sign); f.keyup(key);
  }
  assertReleased(f);
});

await test('modified browser shortcuts, editable targets and unrelated keys remain native', f => {
  start(f);
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) for (const key of ['ArrowRight', ' ', 'j', 'k', 'p']) {
    assert.equal(f.key(key, { [modifier]: true }).defaultPrevented, false); f.keyup(key);
  }
  assert.equal(f.key('unhandled').defaultPrevented, false);
  const input = f.document.createElement('input'); f.document.body.append(input); input.focus();
  for (const key of ['ArrowRight', ' ', 'p']) { assert.equal(f.key(key).defaultPrevented, false); f.keyup(key); }
  f.el('meadow').focus(); assert.equal(f.read().state, 'playing'); assertReleased(f); noShot(f);
});

await test('Space shooting holds charge and releases exactly once through ordinary keyup', f => {
  start(f); beginCharge(f); const charge = f.read().charge;
  f.key(' ', { repeat: true }); f.key(' ', { repeat: undefined }); f.frames(2);
  assert.ok(f.read().charge >= charge); noShot(f);
  f.keyup(' '); f.frames(2); assert.equal(shotCount(f), 1); assert.equal(f.read().charging, false);
  f.keyup(' '); f.frames(2); assert.equal(shotCount(f), 1);
});

for (const key of ['Enter', ' ']) {
  for (const [direction, axis, sign] of [['left', 'x', -1], ['right', 'x', 1], ['up', 'y', -1], ['down', 'y', 1]]) {
    await test(`native ${direction} button ${JSON.stringify(key)} holds through absent-repeat keydowns`, f => {
      start(f); f.el(`move-${direction}`).focus(); const before = player(f);
      assert.equal(f.key(key).defaultPrevented, true); f.frames(3); motion(f, before, axis, sign);
      f.key(key, { repeat: true }); f.key(key, { repeat: undefined });
      assert.equal(f.keyup(key).defaultPrevented, true);
      const released = player(f); f.frames(3); samePosition(f, released); noShot(f);
      // A trailing browser compatibility click must not restart a hold.
      f.el(`move-${direction}`).emit('click', { detail: 0 }); f.frames(3); samePosition(f, released);
    });
  }
  await test(`native shoot ${JSON.stringify(key)} holds and fires once with trailing click suppressed`, f => {
    start(f); f.el('shoot').focus(); assert.equal(f.key(key).defaultPrevented, true); f.frames(10);
    assert.equal(f.read().charging, true); const charge = f.read().charge;
    f.key(key, { repeat: true }); f.key(key, { repeat: undefined }); f.frames(2);
    assert.ok(f.read().charge >= charge); noShot(f);
    assert.equal(f.keyup(key).defaultPrevented, true); f.frames(2); assert.equal(shotCount(f), 1);
    f.el('shoot').emit('click', { detail: 0 }); f.frames(2); assert.equal(shotCount(f), 1);
  });
  await test(`native ${JSON.stringify(key)} focus blur releases movement and cancels sole shot source`, f => {
    start(f); f.el('move-right').focus(); f.key(key); f.frames(3);
    f.el('shoot').focus(); const p = player(f); f.frames(3); samePosition(f, p);
    f.keyup(key); f.key(key); f.frames(10); assert.equal(f.read().charging, true);
    f.el('meadow').focus(); f.frames(3); noShot(f); assertReleased(f);
    f.keyup(key); f.frames(2); noShot(f);
  });
}

await test('focused non-hold native buttons do not use Space to shoot', f => {
  start(f); f.el('pause').focus();
  f.key(' '); f.frames(5); assert.equal(f.read().charging, false); noShot(f); f.keyup(' ');
});

for (const ending of ['pointercancel', 'lostpointercapture']) {
  await test(`${ending} cancels a sole charged shot and trailing pointerup/click cannot fire`, f => {
    start(f); beginCharge(f, 'pointer', 31);
    f.controlPointer('shoot', ending, 31); f.frames(3); noShot(f); assertReleased(f);
    f.controlPointer('shoot', 'pointerup', 31); f.el('shoot').emit('click', { detail: 1, pointerId: 31 });
    f.frames(3); noShot(f); assertReleased(f);
  });
  await test(`${ending} releases only its pointer ID, preserving another shooting pointer`, f => {
    start(f); f.controlPointer('shoot', 'pointerdown', 41); f.controlPointer('shoot', 'pointerdown', 42);
    f.frames(10); const charge = f.read().charge;
    f.controlPointer('shoot', ending, 41); f.frames(2);
    assert.equal(f.read().charging, true); assert.ok(f.read().charge >= charge); noShot(f);
    f.controlPointer('shoot', 'pointerup', 42); f.frames(2); assert.equal(shotCount(f), 1);
  });
  await test(`${ending} of a pointer preserves an independent global Space hold`, f => {
    start(f); f.key(' '); f.controlPointer('shoot', 'pointerdown', 51); f.frames(10);
    const charge = f.read().charge; f.controlPointer('shoot', ending, 51); f.frames(2);
    assert.equal(f.read().charging, true); assert.ok(f.read().charge >= charge); noShot(f);
    f.keyup(' '); f.frames(2); assert.equal(shotCount(f), 1);
  });
  await test(`${ending} movement source cannot clear another direction or duplicate pointer`, f => {
    start(f); f.controlPointer('move-right', 'pointerdown', 61); f.controlPointer('move-right', 'pointerdown', 62);
    f.controlPointer('move-up', 'pointerdown', 63); f.frames(3); const diagonal = player(f);
    f.controlPointer('move-right', ending, 61); f.frames(3); motion(f, diagonal, 'x', 1); motion(f, diagonal, 'y', -1);
    f.controlPointer('move-right', ending, 62); const up = player(f); f.frames(3);
    assert.ok(Math.abs(player(f).vx) < Math.abs(up.vx)); motion(f, up, 'y', -1);
    f.controlPointer('move-up', 'pointerup', 63); const p = player(f); f.frames(3); samePosition(f, p);
  });
}

await test('normal pointerup followed by implicit lostcapture releases exactly one shot', f => {
  start(f); const down = f.controlPointer('shoot', 'pointerdown', 21);
  assert.equal(down.defaultPrevented, true); assert.equal(f.el('shoot').hasPointerCapture(21), true);
  f.frames(10); assert.equal(f.read().charging, true);
  f.controlPointer('shoot', 'pointerup', 21); f.frames(2); assert.equal(shotCount(f), 1);
  f.el('shoot').emit('click', { detail: 1, pointerId: 21 }); f.frames(2); assert.equal(shotCount(f), 1);
});

await test('untracked capture loss and secondary mouse buttons cannot cancel or create a source', f => {
  start(f); f.controlPointer('shoot', 'pointerdown', 8, { pointerType: 'mouse', button: 2 });
  f.frames(3); noShot(f); assertReleased(f);
  beginCharge(f, 'pointer', 71); const charge = f.read().charge;
  f.controlPointer('shoot', 'lostpointercapture', 999); f.frames(2);
  assert.ok(f.read().charge >= charge); noShot(f);
  f.controlPointer('shoot', 'pointerup', 71); f.frames(2); assert.equal(shotCount(f), 1);
});

await test('native Enter and Space source IDs release independently on the same shoot button', f => {
  start(f); f.el('shoot').focus(); f.key('Enter'); f.key(' '); f.frames(10);
  const charge = f.read().charge; f.keyup('Enter'); f.frames(2);
  assert.equal(f.read().charging, true); assert.ok(f.read().charge >= charge); noShot(f);
  f.keyup(' '); f.frames(2); assert.equal(shotCount(f), 1);
});

for (const survivor of ['pointer', 'global Space']) {
  await test(`native button blur preserves independent ${survivor} shot source`, f => {
    start(f);
    if (survivor === 'global Space') f.key(' ');
    f.el('shoot').focus(); f.key('Enter');
    if (survivor === 'pointer') f.controlPointer('shoot', 'pointerdown', 81);
    f.frames(10); const charge = f.read().charge;
    f.el('meadow').focus(); f.frames(2); assert.equal(f.read().charging, true);
    assert.ok(f.read().charge >= charge); noShot(f);
    if (survivor === 'pointer') f.controlPointer('shoot', 'pointerup', 81); else f.keyup(' ');
    f.frames(2); assert.equal(shotCount(f), 1);
  });
}

await test('switch cancels charge, selects the other outfielder, and stale release never shoots', f => {
  start(f); const first = f.read().controlled; beginCharge(f);
  keyPair(f, 'k'); assert.notEqual(f.read().controlled, first); assert.ok([0, 1].includes(f.read().controlled));
  f.frames(2); assertReleased(f); noShot(f); f.keyup(' '); f.frames(2); noShot(f);
  keyPair(f, 'k'); assert.equal(f.read().controlled, first);
});

await test('pass and switch actual keyboard/native button actions are edge-triggered', f => {
  start(f); f.key('j'); f.frames(1); assert.equal(f.read().stats.passes[0], 1);
  f.key('j', { repeat: true }); f.key('j', { repeat: undefined }); f.frames(1);
  assert.equal(f.read().stats.passes[0], 1); f.keyup('j');
  const initial = f.read().controlled; f.key('k'); f.frames(1); assert.notEqual(f.read().controlled, initial);
  f.key('k', { repeat: true }); f.key('k', { repeat: undefined }); f.frames(1); assert.notEqual(f.read().controlled, initial);
  f.keyup('k'); f.el('switch').click(); f.frames(1); assert.equal(f.read().controlled, initial);
});

for (const phase of ['kickoff', 'playing']) {
  await test(`${phase} pause clears inputs, freezes world, and discards the first resumed RAF gap`, f => {
    start(f, phase === 'playing');
    if (phase === 'playing') { f.key('d'); beginCharge(f, 'pointer', 91); }
    f.click('pause'); assert.equal(f.read().state, 'paused'); assertReleased(f); noShot(f); frozen(f);
    const before = f.read(); f.click('primary-action'); assert.equal(f.read().state, phase);
    f.frame(120000); assert.equal(f.read().elapsed, before.elapsed, 'Discard wall-time gap');
    if ('tick' in before) assert.equal(f.read().tick, before.tick, 'Discard first resumed RAF entirely');
    f.keyup('d'); f.controlPointer('shoot', 'pointerup', 91); f.frames(3); noShot(f); assertReleased(f);
  });
}

for (const interruption of ['blur', 'visibilitychange', 'help', 'chapters', 'retry']) {
  await test(`${interruption} cancels mixed shooting/movement, freezes safely and requires explicit resume`, f => {
    start(f); f.key('d'); f.el('shoot').focus(); f.key('Enter'); f.controlPointer('shoot', 'pointerdown', 92);
    f.frames(8); assert.equal(f.read().charging, true);
    if (interruption === 'blur') f.window.emit('blur');
    else if (interruption === 'visibilitychange') f.hide();
    else f.click(interruption);
    assert.equal(f.read().state, 'paused'); assertReleased(f); noShot(f);
    if (interruption === 'help') f.click('help-close');
    else if (interruption === 'chapters') f.click('chapters-close');
    else if (interruption === 'retry') f.click('confirm-cancel');
    else if (interruption === 'visibilitychange') f.hide(false);
    else f.window.emit('focus');
    assert.equal(f.read().state, 'paused'); frozen(f);
    const before = f.read(); f.click('primary-action'); f.frame(120000);
    assert.equal(f.read().elapsed, before.elapsed); assertReleased(f);
    f.keyup('d'); f.keyup('Enter'); f.controlPointer('shoot', 'pointerup', 92); f.frames(3); noShot(f);
  });
}

await test('pause/retry one-shot shortcuts reject repeats even when repeat flag is omitted', f => {
  start(f); f.key('p'); assert.equal(f.read().state, 'paused');
  f.key('p', { repeat: true }); f.key('p', { repeat: undefined }); assert.equal(f.read().state, 'paused');
  f.keyup('p'); keyPair(f, 'p'); assert.equal(f.read().state, 'playing');
  f.key('r'); assert.equal(f.el('confirm-dialog').open, true);
  f.key('r', { repeat: undefined }); assert.equal(f.el('confirm-dialog').open, true);
  f.click('confirm-cancel'); assert.equal(f.read().state, 'paused');
  f.key('r', { repeat: undefined }); assert.equal(f.el('confirm-dialog').open, false);
  f.keyup('r');
});

await test('all open dialogs block synthetic background controls and gameplay keys', f => {
  start(f); f.click('help'); assert.equal(f.el('help-dialog').open, true); assertReleased(f);
  const before = f.read();
  for (const id of ['primary-action', 'pause', 'retry', 'chapters', 'pass', 'switch']) f.click(id);
  // The gameplay-key target is the background canvas, not the focused native
  // dialog close button (whose Space activation is intentionally allowed).
  f.el('meadow').focus();
  for (const key of ['d', ' ', 'j', 'k', 'p', 'r']) { f.key(key); f.keyup(key); }
  f.controlPointer('move-right', 'pointerdown', 5); f.controlPointer('shoot', 'pointerdown', 6); f.frames(3);
  assert.deepEqual(f.read(), before);
  assert.equal(f.el('chapters-dialog').open, false, 'Background chapters cannot open a nested dialog');
  assert.equal(f.el('confirm-dialog').open, false, 'Background retry cannot open a nested dialog');
  f.click('help-close'); assert.equal(f.read().state, 'paused'); assertReleased(f);
  f.click('primary-action'); f.frame(120000); f.frames(3); noShot(f);
  assert.equal(f.read().state, 'playing');
});

await test('retry requires an explicit confirmation and replaces an unfinished match only after accept', f => {
  start(f); f.frames(12); f.key('d'); f.frames(3); f.click('retry');
  assert.equal(f.el('confirm-dialog').open, true); const paused = f.read();
  f.click('confirm-cancel'); assert.equal(f.read().state, 'paused'); assert.equal(f.read().elapsed, paused.elapsed);
  f.click('retry'); f.click('confirm-accept'); assert.equal(f.read().state, 'ready');
  assert.equal(f.read().elapsed, 0); assert.deepEqual(f.read().score, [0, 0]); noShot(f); assertReleased(f);
  f.keyup('d'); start(f); const p = player(f); f.frames(3); samePosition(f, p);
});

// Edge fixtures are valid public checkpoint inputs, never writes to the
// controller's private engine. The campaign below never uses any fixture.
function checkpointFixture(edit = () => {}) {
  const game = engine.createGame(0); engine.start(game);
  for (let i = 0; game.state !== 'playing' && i < 100; i++) engine.step(game, FRAME_MS / 1000, {});
  engine.step(game, FRAME_MS / 1000, {});
  const checkpoint = engine.checkpoint(game);
  edit(checkpoint.data);
  assert.ok(engine.restoreCheckpoint(checkpoint), 'Edge fixture must pass the real engine validator');
  return { [CURRENT_KEY]: JSON.stringify({ version: 1, checkpoint }) };
}
function nearGoalFixture() {
  return checkpointFixture(d => {
    d.players.forEach(p => { p.hasBall = false; p.vx = 0; p.vy = 0; });
    Object.assign(d.ball, { x: 969, y: 235, z: 10, vx: 450, vy: 0, vz: 0,
      owner: null, mode: 'shot', lastTeam: 0, lastPlayer: 0, pickupLock: .2, flight: .2 });
    d.charging = false; d.charge = 0; d.lastShoot = false; d.blockShoot = false;
  });
}
function resumeFixture(f) {
  assert.equal(f.read().state, 'paused'); f.click('primary-action');
  f.el('meadow').focus(); f.frame(120000); return f.read();
}

await test('goal fixture updates score once, renders celebration, pauses, then restarts exactly once', f => {
  resumeFixture(f); until(f, s => s.state === 'goal', 'cross the goal plane', 10);
  assert.deepEqual(f.read().score, [1, 0]); assert.deepEqual(f.read().stats.goals, [1, 0]);
  assert.equal(f.el('home-score').textContent, '1'); assert.equal(f.el('away-score').textContent, '0');
  f.key('d'); f.controlPointer('shoot', 'pointerdown', 113); f.click('pause');
  assert.equal(f.read().state, 'paused'); assertReleased(f); frozen(f);
  const before = f.read(); f.click('primary-action'); assert.equal(f.read().state, 'goal');
  f.frame(120000); assert.equal(f.read().tick, before.tick);
  f.keyup('d'); f.controlPointer('shoot', 'pointerup', 113);
  until(f, s => s.state === 'kickoff', 'leave one celebration', 180);
  assert.deepEqual(f.read().score, [1, 0]); assert.equal(f.read().resetTeam, 1);
  assert.equal(f.read().ball.owner, 3); assertReleased(f);
  until(f, s => s.state === 'playing', 'finish one opponent kickoff', 90);
  assert.deepEqual(f.read().score, [1, 0]); assert.deepEqual(f.read().stats.goals, [1, 0]);
  f.frames(8); assert.deepEqual(f.read().score, [1, 0]);
}, { saved: nearGoalFixture() });

for (const score of [[0, 0], [0, 1]]) {
  await test(`ordinary time expiry with ${score.join(':')} finishes lost without progress award`, f => {
    resumeFixture(f); until(f, s => s.state === 'lost', 'reach an ordinary losing/tied final whistle', 20);
    assert.equal(f.read().time, 0); assert.deepEqual(f.read().score, score); assertReleased(f); frozen(f);
    assert.equal(f.writes.filter(w => w.key === PROGRESS_KEY).length, 0);
    assert.equal(f.storage.has(CURRENT_KEY), false, 'Terminal match cannot remain as resumable current');
    assert.equal(f.el('matches').querySelectorAll('[data-level]').filter(b => !b.disabled).length, 1);
    assert.equal(f.el('state-card').hidden, false);
  }, { saved: checkpointFixture(d => { d.time = .04; d.elapsed = d.levelIndex === 0 ? 72 - d.time : d.elapsed; d.score = [...score]; d.stats.goals = [...score]; }) });
}

await test('ball lost to a real tackle cancels held charge and stale release cannot fire', f => {
  resumeFixture(f); f.frame(); f.key(' '); f.frames(1); assert.equal(f.read().charging, true);
  until(f, s => s.ball.owner !== s.controlled, 'lose possession to an opponent tackle', 120);
  assert.equal(f.read().charging, false); noShot(f);
  f.keyup(' '); f.frames(2); noShot(f);
}, { saved: checkpointFixture(d => {
  // The live opponent AI performs the tackle. No possession or charge is
  // changed after the controller imports this validated starting position.
  d.players[3].x = d.players[0].x + 44; d.players[3].y = d.players[0].y;
  d.players[3].cooldown = .1; d.players[4].x = 800; d.players[4].y = 470;
}) });

const activeSaves = {};
for (const phase of ['kickoff', 'playing', 'goal', 'paused']) {
  await test(`actual ${phase} save uses the real checkpoint and preserves active progress`, f => {
    if (phase === 'goal') { resumeFixture(f); until(f, view => view.state === 'goal', 'reach the natural goal fixture transition', 10); }
    else start(f, phase !== 'kickoff');
    if (phase === 'playing' || phase === 'paused') { f.key('d'); f.frames(6); f.keyup('d'); }
    if (phase === 'paused') f.click('pause');
    f.window.emit('pagehide');
    const raw = f.storage.get(CURRENT_KEY); assert.ok(raw, 'Current match should persist');
    const saved = JSON.parse(raw); const restored = engine.restoreCheckpoint(saved.checkpoint);
    assert.ok(restored, 'The engine must accept the exact controller checkpoint');
    assert.equal(restored.state, 'paused');
    assert.equal(restored.pausedState, phase === 'paused' ? 'playing' : phase);
    assert.equal(restored.elapsed, f.read().elapsed); assert.deepEqual(restored.score, f.read().score);
    activeSaves[phase] = { saved: Object.fromEntries(f.storage), snapshot: f.read(), restored };
    assert.equal(f.writes.filter(w => w.key === PROGRESS_KEY).length, 0);
  }, phase === 'goal' ? { saved: nearGoalFixture() } : undefined);
}
for (const phase of ['kickoff', 'playing', 'goal', 'paused']) {
  await test(`reload of real ${phase} save is paused, frozen, and resumes without offline catch-up`, f => {
    const expected = activeSaves[phase].restored;
    assert.equal(f.read().state, 'paused'); assert.equal(f.read().pausedState, expected.pausedState);
    assert.equal(f.read().elapsed, expected.elapsed); assert.deepEqual(f.read().score, expected.score);
    assertReleased(f); frozen(f);
    const before = f.read(); f.click('primary-action'); f.frame(3600000);
    assert.equal(f.read().state, expected.pausedState); assert.equal(f.read().tick, before.tick);
    assert.equal(f.read().elapsed, before.elapsed); assertReleased(f);
  }, { saved: activeSaves[phase]?.saved });
}

const validProgress = { version: 1, unlocked: 3, best: { 0: { score: [2, 1] }, 2: { score: [3, 1] } } };
for (const [label, current] of [
  ['malformed JSON', '{bad'],
  ['terminal won checkpoint', (() => { const parsed = JSON.parse(checkpointFixture()[CURRENT_KEY]); parsed.checkpoint.data.state = 'won'; parsed.checkpoint.data.score = [1, 0]; parsed.checkpoint.data.stats.goals = [1, 0]; return JSON.stringify(parsed); })()],
  ['invalid numeric checkpoint', (() => { const saved = checkpointFixture(); const parsed = JSON.parse(saved[CURRENT_KEY]); parsed.checkpoint.data.players[0].x = 999999; return JSON.stringify(parsed); })()],
]) {
  await test(`${label} is discarded while valid campaign progress survives`, f => {
    assert.equal(f.read().state, 'ready'); assertReleased(f); assert.deepEqual(f.read().score, [0, 0]);
    assert.equal(f.el('matches').querySelectorAll('[data-level]').filter(b => !b.disabled).length, 4);
    assert.equal(f.storage.has(CURRENT_KEY), false);
    assert.equal(f.el('restore-note').hidden, false);
    assert.equal(f.writes.filter(w => w.key === PROGRESS_KEY).length, 0, 'Bad current must never award or overwrite campaign');
  }, { saved: { [PROGRESS_KEY]: JSON.stringify(validProgress), [CURRENT_KEY]: current } });
}

await test('valid current for a locked match cannot bypass campaign locks', f => {
  assert.equal(f.read().state, 'ready'); assert.equal(f.read().levelIndex, 0);
  assert.equal(f.el('matches').querySelectorAll('[data-level]').filter(b => !b.disabled).length, 4);
  assert.equal(f.storage.has(CURRENT_KEY), false); assert.equal(f.el('restore-note').hidden, false);
}, { saved: (() => {
  const game = engine.createGame(7); engine.start(game);
  return { [PROGRESS_KEY]: JSON.stringify(validProgress), [CURRENT_KEY]: JSON.stringify({ version: 1, checkpoint: engine.checkpoint(game) }) };
})() });

await test('a corrupt best-score neighbor is discarded without erasing valid campaign records', f => {
  assert.equal(f.read().state, 'ready');
  assert.equal(f.el('matches').querySelectorAll('[data-level]').filter(b => !b.disabled).length, 4);
  assert.match(f.el('matches').children[2].textContent, /3 : 1/);
  assert.equal(f.el('restore-note').hidden, false);
}, { saved: { [PROGRESS_KEY]: JSON.stringify({ ...validProgress, best: { ...validProgress.best, 7: { score: [9999, 0] } } }) } });

await test('corrupt progress falls back safely, and an invalid current cannot unlock a match', f => {
  assert.equal(f.read().state, 'ready');
  assert.equal(f.el('matches').querySelectorAll('[data-level]').filter(b => !b.disabled).length, 1);
  start(f); f.key('d'); const p = player(f); f.frames(3); motion(f, p, 'x', 1);
}, { saved: { [PROGRESS_KEY]: '{not JSON', [CURRENT_KEY]: JSON.stringify({ version: 1, checkpoint: { state: 'won', levelIndex: 7 } }) } });

for (const denied of ['readDenied', 'writeDenied']) {
  await test(`${denied} shows storage notice while real gameplay remains usable`, f => {
    start(f); f.frames(4); f.window.emit('pagehide');
    assert.match(f.el('save-note').textContent, /无法|不可|未能|失败|暂时|阻止/);
    assert.equal(f.read().state, 'paused'); f.click('primary-action'); f.frame(120000); f.frame();
    const p = player(f); f.key('d'); f.frames(3); motion(f, p, 'x', 1); f.keyup('d');
  }, { [denied]: true });
}

await test('charge caps at 1.2 seconds and never fires before an actual release', f => {
  resumeFixture(f); f.frame(); f.key(' '); f.frames(84);
  assert.equal(f.read().charging, true); assert.equal(f.read().charge, 1.2); noShot(f);
  f.keyup(' '); f.frames(2); assert.equal(shotCount(f), 1);
}, { saved: checkpointFixture(d => {
  d.players[3].x = 920; d.players[3].y = 80;
  d.players[4].x = 920; d.players[4].y = 520;
}) });

await test('pointer cancellation preserves a focused Enter shoot source', f => {
  start(f); f.el('shoot').focus(); f.key('Enter'); f.controlPointer('shoot', 'pointerdown', 151); f.frames(10);
  assert.deepEqual(f.read().input.pointers, [{ id: 151, control: 'shoot' }]);
  assert.ok(f.read().input.sources.some(source => source.kind === 'button' && source.key === 'enter'));
  f.controlPointer('shoot', 'pointercancel', 151); f.frames(2); noShot(f); assert.equal(f.read().charging, true);
  f.keyup('Enter'); f.frames(2); assert.equal(shotCount(f), 1);
});

await test('wrong-target pointerup cannot release an independently captured direction', f => {
  start(f); f.controlPointer('move-right', 'pointerdown', 171);
  f.controlPointer('move-left', 'pointerup', 171); assert.equal(f.read().input.x, 1);
  assert.deepEqual(f.read().input.pointers, [{ id: 171, control: 'right' }]);
  f.controlPointer('move-right', 'pointerup', 171); assertReleased(f);
});

for (const key of ['Enter', ' ']) {
  await test(`native command ${JSON.stringify(key)} executes once, suppresses absent repeats and trailing clicks`, f => {
    start(f); const before = f.read().controlled; f.el('switch').focus();
    assert.equal(f.key(key).defaultPrevented, true); assert.notEqual(f.read().controlled, before);
    f.key(key, { repeat: true }); f.key(key, { repeat: undefined }); assert.notEqual(f.read().controlled, before);
    f.keyup(key); f.el('switch').emit('click', { detail: 0 }); assert.notEqual(f.read().controlled, before);
    f.frames(50); f.el('switch').click(); assert.equal(f.read().controlled, before, 'A later deliberate click remains available');
  });
}
for (const ending of ['pointercancel', 'lostpointercapture']) {
  await test(`command ${ending} suppresses cancelled-contact trailing click`, f => {
    start(f); const before = f.read().controlled;
    f.controlPointer('switch', 'pointerdown', 191); f.controlPointer('switch', ending, 191);
    f.controlPointer('switch', 'pointerup', 191); f.el('switch').emit('click', { detail: 1, pointerId: 191 });
    assert.equal(f.read().controlled, before);
  });
}

await test('after window blur, absent-repeat keydown cannot resurrect a held source before real keyup', f => {
  start(f); f.key('d'); beginCharge(f); f.window.emit('blur');
  f.click('primary-action'); f.frame(120000); f.key('d', { repeat: undefined }); f.key(' ', { repeat: undefined });
  f.frames(3); assertReleased(f); noShot(f);
  f.keyup('d'); f.keyup(' '); f.frame(); f.key('d'); f.frames(3); assert.equal(f.read().input.x, 1);
  f.keyup('d');
});

// This is the only bridge from pilot decisions to the actual controller. No
// engine action/step/start call receives the controller's private game. Desired
// digital input changes only once per six fixed simulation ticks (100 ms).
function digitalDecision(f, transport) {
  const s = f.read();
  f.pilotMemory ??= {};
  const input = pilotInput(s, f.pilotMemory);
  assert.ok([-1, 0, 1].includes(input.x)); assert.ok([-1, 0, 1].includes(input.y));
  f.pilotHeld ??= new Set(); f.pilotEvents ??= { keydown: 0, keyup: 0, pointerdown: 0, pointerup: 0, decisions: 0, holds: [] };
  f.pilotEvents.decisions++;
  const desired = new Map([
    ['left', input.x === -1], ['right', input.x === 1], ['up', input.y === -1], ['down', input.y === 1],
    ['shoot', !!input.shoot], ['pass', !!input.pass], ['switch', !!input.switch],
  ]);
  const keys = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', shoot: ' ', pass: 'j', switch: 'k' };
  const pointers = { left: 201, right: 202, up: 203, down: 204, shoot: 205, pass: 206, switch: 207 };
  const pointerControl = control => ['left', 'right', 'up', 'down'].includes(control) ? `move-${control}` : control;
  const event = (control, down) => {
    // One-shot J/K remain ordinary keyboard controls even in the touch route;
    // movement and shooting there use independent actual pointer IDs.
    if (transport === 'pointer' && !['pass', 'switch'].includes(control)) {
      const type = down ? 'pointerdown' : 'pointerup';
      f.controlPointer(pointerControl(control), type, pointers[control]); f.pilotEvents[type]++;
    } else { const type = down ? 'keydown' : 'keyup'; down ? f.key(keys[control]) : f.keyup(keys[control]); f.pilotEvents[type]++; }
    if (control === 'shoot') {
      if (down) f.shootHoldTick = s.tick;
      else if (f.shootHoldTick !== undefined) { f.pilotEvents.holds.push(Number(((s.tick - f.shootHoldTick) / 60).toFixed(3))); delete f.shootHoldTick; }
    }
  };
  for (const [control, held] of desired) if (!held && f.pilotHeld.has(control)) { event(control, false); f.pilotHeld.delete(control); }
  for (const [control, held] of desired) if (held && !f.pilotHeld.has(control)) { event(control, true); f.pilotHeld.add(control); }
}
function resetPilot(f) { f.pilotMemory = {}; f.pilotHeld = new Set(); f.pilotEvents = undefined; f.pilotLastDecisionTick = undefined; }
function playActualMatch(f, transport = 'keyboard') {
  resetPilot(f); f.el('meadow').focus();
  let frameCount = 0, observedGoals = 0, previousScore = [...f.read().score], previousState = f.read().state;
  for (; frameCount < 15000; frameCount++) {
    const s = f.read();
    if (['won', 'lost'].includes(s.state)) break;
    assert.ok(['kickoff', 'playing', 'goal'].includes(s.state), `Campaign paused unexpectedly: ${s.state}`);
    if (f.pilotLastDecisionTick === undefined || s.tick - f.pilotLastDecisionTick >= 6) {
      digitalDecision(f, transport); f.pilotLastDecisionTick = s.tick;
    }
    f.frame();
    const next = f.read();
    if (next.state === 'goal' && previousState !== 'goal') {
      observedGoals++;
      assert.equal(next.score[0] + next.score[1], previousScore[0] + previousScore[1] + 1, 'Every goal transition scores once');
      previousScore = [...next.score];
      assert.equal(next.charging, false);
    } else if (previousState === 'goal') assert.deepEqual(next.score, previousScore, 'Goal and restart phases cannot score again');
    previousState = next.state;
  }
  const result = f.read();
  assert.ok(['won', 'lost'].includes(result.state), 'Natural match must terminate within its duration');
  assert.equal(observedGoals, result.score[0] + result.score[1], 'All actual goals were observed in controller states');
  return { match: result.levelIndex + 1, transport, state: result.state, score: result.score, tick: result.tick,
    elapsed: result.elapsed, frameCount, decisionCadenceMs: 100, observedGoals,
    inputs: f.pilotEvents, stats: result.stats };
}

await test('all eight matches win and unlock naturally through 100 ms digital DOM input, no winner injection', f => {
  for (let index = 0; index < 8; index++) {
    assert.equal(f.read().levelIndex, index); assert.equal(f.read().state, index === 0 ? 'ready' : 'kickoff');
    const writesBefore = f.writes.filter(w => w.key === PROGRESS_KEY).length;
    if (index === 0) start(f, false);
    const result = playActualMatch(f, index % 2 ? 'pointer' : 'keyboard'); campaignLog.push(result);
    console.log(`CAMPAIGN ${JSON.stringify(result)}`);
    assert.equal(result.state, 'won', `Ordinary event pilot must win match ${index + 1}`);
    assert.ok(result.score[0] > result.score[1]); assert.ok(result.stats.shots[0] > 0, 'Player must take actual charged shots');
    const records = JSON.parse(f.storage.get(PROGRESS_KEY));
    assert.equal(records.unlocked, Math.min(index + 1, 7)); assert.deepEqual(records.best[index].score, result.score);
    assert.equal(f.writes.filter(w => w.key === PROGRESS_KEY).length - writesBefore, 1, 'A terminal victory records progress once');
    assert.equal(f.storage.has(CURRENT_KEY), false, 'A victory must clear resumable current');
    assertReleased(f); frozen(f);
    assert.equal(f.writes.filter(w => w.key === PROGRESS_KEY).length - writesBefore, 1, 'Further terminal RAF calls cannot award again');
    assert.equal(f.el('matches').querySelectorAll('[data-level]').filter(b => !b.disabled).length, Math.min(index + 2, 8));
    if (index < 7) f.click('primary-action');
  }
  assert.equal(Object.keys(JSON.parse(f.storage.get(PROGRESS_KEY)).best).length, 8);
});

const finalHashes = hashFiles(), finalSupportingHashes = supportingHashes();
try {
  assert.deepEqual(finalHashes, initialHashes, 'All seven tested runtime files must remain identical throughout this run');
  assert.deepEqual(finalSupportingHashes, initialSupportingHashes, 'Pilot and test hashes must remain identical throughout this run');
  assert.deepEqual([...renderedStates].sort(), ['ready', 'kickoff', 'playing', 'goal', 'paused', 'won', 'lost'].sort(), 'Real renderer must execute in every actual state');
  passed++; console.log('PASS runtime/pilot/test immutability during run and seven actual rendered states');
} catch (error) { failed++; console.error(`FAIL final evidence checks\n  ${error.stack}`); }
console.log(`\n${passed} passed; ${failed} failed. Actual game.mjs DOM handlers, engine, progress and renderer executed.`);
console.log(`RENDERED_STATES ${JSON.stringify([...renderedStates].sort())}`);
console.log(`RUNTIME_HASHES_BEFORE ${JSON.stringify(initialHashes)}`);
console.log(`RUNTIME_HASHES_AFTER ${JSON.stringify(finalHashes)}`);
console.log(`SUPPORT_HASHES_BEFORE ${JSON.stringify(initialSupportingHashes)}`);
console.log(`SUPPORT_HASHES_AFTER ${JSON.stringify(finalSupportingHashes)}`);
console.log('Scope: Node fake DOM/RAF/Canvas/storage; not browser, visual, layout, accessibility, real-device pointer capture, or audio verification.');
console.log('Campaign: normal 60 Hz simulation, digital decisions each 100 ms, ordinary keydown/keyup and pointerdown/pointerup; no direct campaign engine actions, state writes, ideal instant shots, winner mutation, installs, network, browser, auth, push or deploy.');
process.exitCode = failed ? 1 : 0;
