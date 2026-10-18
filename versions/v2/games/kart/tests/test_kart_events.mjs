#!/usr/bin/env node
/**
 * Node-only event tests of the actual games/kart/game.mjs controller.
 * Real engine, progress and renderer; only the browser surfaces are simulated.
 * No private state writes, copied handlers, browser launch, network, or installs.
 * The pilot emits only ordinary keydown/keyup controls with discrete steer -1/0/+1.
 * Track/snapshot reads guide that pilot; they cannot set position or award wins.
 * Canvas drawing is a no-op: these are NOT visual, browser-layout, or device tests.
 * Run: node scripts/test_kart_events.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as engine from '../engine.mjs';
import {drivingCue,pulseTargets} from '../guidance.mjs';
import { pilotInput } from './kart_pilot.mjs';
import { PROGRESS_KEY, CURRENT_KEY } from '../progress.mjs';

const frozenFiles = ['index.html', 'kart.css', 'game.mjs', 'engine.mjs', 'levels.mjs', 'progress.mjs', 'renderer.mjs', 'guidance.mjs'];
const hashFiles = () => Object.fromEntries(frozenFiles.map(file => [file, createHash('sha256').update(readFileSync(new URL(`../${file}`, import.meta.url))).digest('hex')]));
const initialHashes = hashFiles();
const supportingHashes = () => Object.fromEntries(['test_kart_events.mjs', 'kart_pilot.mjs'].map(file => [file, createHash('sha256').update(readFileSync(new URL(`./${file}`, import.meta.url))).digest('hex')]));
const initialSupportingHashes = supportingHashes();
const markup = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const gameURL = new URL('../game.mjs', import.meta.url);
const FRAME_MS = 1000 / 60;
let fixtureNumber = 0;

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
  focus(options) {
    (this.focusCalls ??= []).push(options);
    const previous = this.ownerDocument.activeElement;
    if (previous === this) return;
    previous?.emit('blur', { relatedTarget: this });
    this.ownerDocument.activeElement = this;
    this.emit('focus', { relatedTarget: previous });
  }
  click() { if (!this.disabled) return this.emit('click'); }
  showModal() { this.open = true; this.querySelector('button:not(:disabled)')?.focus(); }
  close() { this.open = false; this.emit('close'); }
  scrollIntoView(options) { (this.scrollIntoViewCalls ??= []).push(options); }
  matches(selector) { return selector.split(',').some(s => matches(this, s)); }
  getBoundingClientRect() { const r = this.rect || { left: 0, top: 0, width: 100, height: 50 }; return { ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height }; }
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
    getItem(key) { assert.ok([PROGRESS_KEY, CURRENT_KEY].includes(key)); if (options.readDenied) throw Error('Storage read denied'); return storage.get(key) ?? null; },
    setItem(key, value) { assert.ok([PROGRESS_KEY, CURRENT_KEY].includes(key)); if (options.writeDenied) throw Error('Storage write denied'); storage.set(key, String(value)); writes.push({ key, value }); },
    removeItem(key) { assert.ok([PROGRESS_KEY, CURRENT_KEY].includes(key)); if (options.writeDenied) throw Error('Storage removal denied'); storage.delete(key); removals.push(key); },
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
    read() { return window.kartSnapshot(); },
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
      const canvas = this.el('race');
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
  if (f.el('help-dialog').open) checkedClick(f, 'help-confirm');
  assert.equal(f.read().state, 'countdown');
  f.el('race').focus();
  if (playing) until(f, v => v.state === 'playing', 'finish the natural start countdown', 600);
}
function assertReleased(f) {
  const input = f.read().input;
  assert.equal(input.steer, 0); assert.equal(input.brake, false); assert.equal(input.drift, false);
  assert.equal(input.pointers.length, 0); assert.equal(input.keys.length, 0);
  for (const entries of Object.values(input.sources)) assert.equal(entries.length, 0);
}
function chapterButtons(f) { return f.el('chapter-list').querySelectorAll('[data-level]'); }
function engineView(view, reference) { return Object.fromEntries(Object.keys(reference).map(key => [key, view[key]])); }

await test('actual controller starts ready with real renderer, native controls and deeply read-only diagnostics', f => {
  assert.equal(f.read().state, 'ready');
  assert.ok(f.el('race').renderCalls > 100, 'Real renderer executes canvas calls');
  const descriptor = Object.getOwnPropertyDescriptor(f.window, 'kartSnapshot');
  assert.equal(descriptor.writable, false); assert.equal(descriptor.configurable, false);
  assert.equal(f.window.kartSetState, undefined);
  const view = f.read(); assertDeepFrozen(view);
  assert.throws(() => { view.state = 'won'; }, TypeError);
  assert.equal(f.read().state, 'ready'); assertReleased(f); frozen(f);
  f.click('chapters');
  assert.equal(chapterButtons(f).length, 8);
  assert.equal(chapterButtons(f).filter(button => !button.disabled).length, 1);
  const locked = chapterButtons(f).find(button => Number(button.dataset.level) === 8);
  locked.click(); assert.equal(f.read().level, 1);
  f.click('chapters-close'); assert.equal(f.read().state, 'ready');
});

await test('first primary action shows instructions; background controls cannot start behind the modal', f => {
  f.click('primary-action'); assert.equal(f.el('help-dialog').open, true);
  const before = f.read();
  for (const id of ['primary-action', 'pause', 'retry', 'steer-left', 'brake', 'drift', 'use-item', 'chapters']) f.click(id);
  f.controlPointer('steer-left', 'pointerdown', 1);
  f.controlPointer('use-item', 'pointerdown', 2);
  assert.deepEqual(f.read(), before, 'Modal admission checks block even synthetic background activation');
  f.click('help-confirm'); assert.equal(f.read().state, 'countdown'); assertReleased(f);
});

await test('keyboard aliases remain independently held and opposite directions cancel without sticky steering', f => {
  start(f);
  assert.equal(f.key('ArrowLeft').defaultPrevented, true); assert.equal(f.read().input.steer, -1);
  f.key('a'); f.keyup('ArrowLeft'); assert.equal(f.read().input.steer, -1);
  f.key('ArrowRight'); assert.equal(f.read().input.steer, 0);
  f.keyup('a'); assert.equal(f.read().input.steer, 1);
  f.keyup('ArrowRight'); assertReleased(f);
  f.key('ArrowDown'); f.key('s'); f.keyup('ArrowDown'); assert.equal(f.read().input.brake, true);
  f.keyup('s'); f.key(' '); f.key('Shift', { code: 'ShiftLeft' }); f.keyup(' ');
  assert.equal(f.read().input.drift, true); f.keyup('Shift', { code: 'ShiftLeft' }); assertReleased(f);
});

await test('independent pointer IDs and mixed keyboard/touch sources release only their own holds', f => {
  start(f);
  f.controlPointer('steer-left', 'pointerdown', 1);
  f.controlPointer('steer-left', 'pointerdown', 9);
  assert.equal(f.read().input.steer, -1); assert.equal(f.read().input.pointers.length, 2);
  for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    f.controlPointer('steer-left', ending, 99);
    assert.equal(f.read().input.steer, -1); assert.equal(f.read().input.pointers.length, 2);
  }
  f.controlPointer('steer-left', 'pointerup', 1); assert.equal(f.read().input.steer, -1);
  f.key('ArrowLeft'); f.controlPointer('steer-left', 'pointercancel', 9);
  assert.equal(f.read().input.steer, -1); assert.equal(f.read().input.pointers.length, 0);
  f.keyup('ArrowLeft'); assertReleased(f);
  f.key('ArrowRight'); f.controlPointer('steer-right', 'pointerdown', 2); f.keyup('ArrowRight');
  assert.equal(f.read().input.steer, 1);
  f.controlPointer('steer-right', 'lostpointercapture', 2); assertReleased(f);
  f.controlPointer('brake', 'pointerdown', 3); f.controlPointer('drift', 'pointerdown', 4);
  f.controlPointer('brake', 'pointercancel', 3); assert.equal(f.read().input.drift, true);
  assert.equal(f.read().input.brake, false); f.controlPointer('drift', 'pointerup', 4); assertReleased(f);
});

await test('secondary mouse presses are rejected and cancelled contacts do not reappear on release', f => {
  start(f);
  f.controlPointer('steer-left', 'pointerdown', 1, { pointerType: 'mouse', button: 2 }); assertReleased(f);
  for (const ending of ['pointercancel', 'lostpointercapture']) {
    f.controlPointer('brake', 'pointerdown', 1); assert.equal(f.read().input.brake, true);
    f.controlPointer('brake', ending, 1); assertReleased(f);
    f.controlPointer('brake', 'pointerup', 1); assertReleased(f);
  }
});

await test('focused native hold buttons support Enter and Space, missing repeat flags, keyup and blur release', f => {
  start(f);
  for (const [id, field, value] of [['steer-left', 'steer', -1], ['steer-right', 'steer', 1], ['brake', 'brake', true], ['drift', 'drift', true]]) {
    for (const key of ['Enter', ' ']) {
      const button = f.el(id); button.focus();
      assert.equal(f.key(key).defaultPrevented, true, 'Hold buttons own native activation while held');
      assert.equal(f.read().input[field], value);
      f.key(key, { repeat: true }); f.key(key, { repeat: undefined });
      assert.equal(f.read().input[field], value);
      f.keyup(key); assertReleased(f);
      f.key(key); assert.equal(f.read().input[field], value);
      f.el('race').focus(); assertReleased(f);
      f.keyup(key); assertReleased(f);
    }
  }
});

await test('pause shortcut ignores held repeats even when repeat is absent; modifiers/editables stay native', f => {
  start(f); f.el('race').focus();
  assert.equal(f.key('p').defaultPrevented, true); assert.equal(f.read().state, 'paused');
  f.key('p', { repeat: true }); f.key('p', { repeat: undefined }); assert.equal(f.read().state, 'paused');
  f.keyup('p');
  for (const modifier of ['ctrlKey', 'altKey', 'metaKey']) {
    assert.equal(f.key('p', { [modifier]: true }).defaultPrevented, false);
    assert.equal(f.read().state, 'paused'); f.keyup('p');
  }
  const input = f.document.createElement('input'); f.document.body.append(input); input.focus();
  assert.equal(f.key('p').defaultPrevented, false); f.keyup('p'); assert.equal(f.read().state, 'paused');
  f.el('race').focus(); keyPair(f, 'p'); assert.equal(f.read().state, 'playing');
});

await test('native focused pause/resume activation runs once for Enter and Space despite repeat flags being omitted', f => {
  start(f);
  for (const key of ['Enter', ' ']) {
    f.el('pause').focus();
    const first = f.key(key);
    if (!first.defaultPrevented && key === 'Enter') f.el('pause').click();
    // A browser activates Space on keyup if the page did not claim that key.
    if (!first.defaultPrevented && key === ' ') { const up = f.keyup(key); if (!up.defaultPrevented) f.el('pause').click(); }
    assert.equal(f.read().state, 'paused');
    f.key(key, { repeat: true }); f.key(key, { repeat: undefined }); assert.equal(f.read().state, 'paused');
    f.keyup(key);
    f.el('primary-action').focus(); nativeActivation(f, key);
    assert.equal(f.read().state, 'playing');
    f.el('race').focus();
  }
});

await test('retry shortcut is edge-triggered and clears all sources for a fresh ready race', f => {
  start(f); f.frames(12); f.key('ArrowLeft'); f.controlPointer('drift', 'pointerdown', 6);
  f.key('r'); assert.equal(f.read().state, 'ready'); assert.equal(f.read().ticks, 0); assertReleased(f);
  const before = f.read(); f.key('r', { repeat: true }); f.key('r', { repeat: undefined });
  assert.deepEqual(f.read(), before); f.keyup('r'); f.keyup('ArrowLeft');
  f.controlPointer('drift', 'pointerup', 6); assertReleased(f);
});

await test('countdown can pause and resume without consuming background wall time or stale holds', f => {
  start(f, false); f.frames(10);
  f.key('ArrowLeft'); f.controlPointer('brake', 'pointerdown', 3);
  f.click('pause'); assert.equal(f.read().state, 'paused'); assertReleased(f); frozen(f);
  const before = f.read(); f.click('primary-action'); assert.equal(f.read().state, 'countdown');
  f.frame(120000); assert.equal(f.read().ticks, before.ticks, 'First resumed frame establishes a new clock baseline');
  assertReleased(f); until(f, v => v.state === 'playing', 'finish resumed countdown', 600);
});

for (const source of ['blur', 'visibilitychange']) {
  await test(`help, ${source}, close and explicit resume preserve pause and discard the first-frame gap`, f => {
    start(f); f.frames(12); f.key('ArrowRight'); f.controlPointer('drift', 'pointerdown', 7);
    f.click('help'); assert.equal(f.el('help-dialog').open, true); assert.equal(f.read().state, 'paused'); assertReleased(f);
    if (source === 'blur') f.window.emit('blur'); else f.hide();
    const before = f.read();
    for (const id of ['primary-action', 'secondary-action', 'pause', 'retry', 'chapters', 'use-item']) f.click(id);
    f.key('p'); f.keyup('p'); f.controlPointer('steer-left', 'pointerdown', 1);
    assert.deepEqual(f.read(), before, 'Background controls cannot change a modal-paused race');
    f.click('help-close');
    if (source === 'blur') f.window.emit('focus'); else f.hide(false);
    assert.equal(f.read().state, 'paused'); assertReleased(f); frozen(f);
    const tick = f.read().ticks; f.click('primary-action'); assert.equal(f.read().state, 'playing');
    f.frame(120000); assert.equal(f.read().ticks, tick);
    f.frames(6); assert.ok(f.read().ticks > tick); assertReleased(f);
  });
}

await test('Escape closes a modal but held repeats cannot resume until a real release', f => {
  start(f); f.click('help'); assert.equal(f.read().state, 'paused');
  const down = f.key('Escape');
  if (!down.defaultPrevented) f.el('help-dialog').emit('cancel');
  assert.equal(f.el('help-dialog').open, false); assert.equal(f.read().state, 'paused');
  f.key('Escape', { repeat: true }); f.key('Escape', { repeat: undefined });
  assert.equal(f.read().state, 'paused'); assertReleased(f); frozen(f);
  f.keyup('Escape'); keyPair(f, 'Escape'); assert.equal(f.read().state, 'playing');
});

await test('window blur clears held sources, pauses ordinary play, and never resumes on focus alone', f => {
  start(f); f.key('ArrowLeft'); f.key(' '); f.controlPointer('brake', 'pointerdown', 8);
  f.window.emit('blur'); assert.equal(f.read().state, 'paused'); assertReleased(f);
  f.window.emit('focus'); assert.equal(f.read().state, 'paused'); frozen(f);
  f.click('primary-action'); f.frame(120000); assert.equal(f.read().state, 'playing'); assertReleased(f);
  f.controlPointer('brake', 'pointerup', 8); f.keyup('ArrowLeft'); f.keyup(' '); assertReleased(f);
});

// This is the sole bridge from the test pilot to the actual page controller.
// It sends ordinary digital controls. It does not call step/start/action on the
// controller's game, and cannot access or replace that private game object.
function driveFrame(f, { useItems = true, ms = FRAME_MS } = {}) {
  const view = f.read();
  // read() returns a new frozen object, so the pilot's WeakMap cannot provide
  // cadence here. Keep the decision outside the game and hold it for 6 ticks
  // (100 ms). Only the next ordinary input decision is cached, never game state.
  if (!f.pilotDecision || view.level !== f.pilotDecision.level || view.ticks < f.pilotDecision.tick || view.ticks - f.pilotDecision.tick >= 6) {
    f.pilotDecision = { level: view.level, tick: view.ticks, input: pilotInput(view, { holdTicks: 6 }) };
    f.pilotDecisionCount = (f.pilotDecisionCount || 0) + 1;
  }
  const input = f.pilotDecision.input;
  assert.ok([-1, 0, 1].includes(input.steer), 'Controller pilot steering must be digital');
  assert.ok(input.throttle === undefined || input.throttle === 1, 'Controller auto-accelerates without hidden throttle controls');
  f.pilotHeld ??= new Set();
  const desired = new Map([
    ['ArrowLeft', input.steer === -1], ['ArrowRight', input.steer === 1],
    ['ArrowDown', Boolean(input.brake)], [' ', Boolean(input.drift)],
  ]);
  if (useItems) desired.set('e', Boolean(input.item));
  for (const [key, held] of desired) if (!held && f.pilotHeld.has(key)) { f.keyup(key); f.pilotHeld.delete(key); }
  for (const [key, held] of desired) if (held && !f.pilotHeld.has(key)) { f.key(key); f.pilotHeld.add(key); }
  f.frame(ms);
}
function driveUntil(f, predicate, label, options = {}) {
  const maximumFrames = options.maximumFrames ?? 18000;
  for (let frame = 0; frame < maximumFrames; frame++) {
    const view = f.read(); if (predicate(view)) return { view, frames: frame };
    assert.ok(['playing', 'countdown'].includes(view.state), `Race terminated before ${label}: ${JSON.stringify(view.result)}`);
    driveFrame(f, options);
  }
  assert.fail(`Digital event pilot did not ${label}: ${JSON.stringify(f.read())}`);
}
function releasePilot(f) {
  for (const key of f.pilotHeld || []) f.keyup(key);
  f.pilotHeld = new Set();
}

await test('item keys are edge-triggered across missing repeats and natural later pickups', f => {
  start(f);
  driveUntil(f, v => v.cars[0].item !== null, 'collect a natural item', { useItems: false });
  const used = f.read().stats.itemsUsed;
  f.key('e'); assert.equal(f.read().stats.itemsUsed, used + 1); assert.equal(f.read().cars[0].item, null);
  f.key('e', { repeat: true }); f.key('e', { repeat: undefined }); assert.equal(f.read().stats.itemsUsed, used + 1);
  driveUntil(f, v => v.cars[0].item !== null, 'collect a second natural item while the key is held', { useItems: false });
  assert.equal(f.read().stats.itemsUsed, used + 1, 'Holding an item key cannot consume the next pickup');
  f.key('e', { repeat: undefined }); assert.equal(f.read().stats.itemsUsed, used + 1);
  f.keyup('e'); f.key('e'); assert.equal(f.read().stats.itemsUsed, used + 2); f.keyup('e'); releasePilot(f);
});

await test('item pointer cancellation and lost capture cannot activate again on trailing pointerup/click', f => {
  start(f);
  for (const ending of ['pointercancel', 'lostpointercapture']) {
    driveUntil(f, v => v.cars[0].item !== null && !f.el('use-item').disabled, 'collect and display a natural pointer-test item', { useItems: false });
    const used = f.read().stats.itemsUsed;
    f.controlPointer('use-item', 'pointerdown', 33); assert.equal(f.read().stats.itemsUsed, used + 1);
    f.controlPointer('use-item', 'pointerdown', 33); assert.equal(f.read().stats.itemsUsed, used + 1);
    f.controlPointer('use-item', ending, 33);
    driveUntil(f, v => v.cars[0].item !== null, 'collect a subsequent item after cancellation', { useItems: false });
    f.controlPointer('use-item', 'pointerup', 33);
    f.el('use-item').emit('click', { detail: 1, pointerId: 33 });
    assert.equal(f.read().stats.itemsUsed, used + 1, `${ending} cannot turn the cancelled source into another item press`);
    f.key('e'); f.keyup('e');
  }
  releasePilot(f);
});

const savedRuns = {};
for (const phase of ['countdown', 'playing', 'paused']) {
  await test(`actual ${phase} race checkpoint preserves unfinished state without awarding`, f => {
    start(f, phase !== 'countdown');
    if (phase === 'countdown') f.frames(12);
    else { for (let i = 0; i < 150; i++) driveFrame(f); releasePilot(f); }
    if (phase === 'paused') f.click('pause');
    assert.equal(f.read().state, phase);
    f.window.emit('beforeunload');
    savedRuns[phase] = { storage: Object.fromEntries(f.storage), view: f.read() };
    const restored = engine.restore(JSON.parse(f.storage.get(CURRENT_KEY)));
    assert.ok(restored, `Actual ${phase} save must pass the real engine validator`);
    assert.equal(restored.state, 'paused'); assert.equal(restored.pausedFrom, phase === 'countdown' ? 'countdown' : 'playing');
    assert.equal(restored.ticks, f.read().ticks); assert.equal(restored.time, f.read().time);
    assert.equal(f.read().unlocked, 1); assert.equal(Object.keys(f.read().best).length, 0);
  });
  await test(`${phase} refresh restores exact authoritative physics paused and needs explicit resume`, f => {
    assert.ok(savedRuns[phase], 'Prior actual controller checkpoint must exist');
    const expected = engine.snapshot(engine.restore(JSON.parse(savedRuns[phase].storage[CURRENT_KEY])));
    assert.deepEqual(engineView(f.read(), expected), expected);
    assert.equal(f.read().state, 'paused'); assert.equal(f.read().wasRestored, true); assertReleased(f); frozen(f);
    const ticks = f.read().ticks; f.click('primary-action');
    f.frame(120000); assert.equal(f.read().ticks, ticks, 'Restoration and resume cannot simulate offline time');
    f.frames(6); assert.ok(f.read().ticks > ticks);
    assert.equal(Object.keys(f.read().best).length, 0); assert.equal(f.read().unlocked, 1);
  }, { saved: savedRuns[phase]?.storage });
}

let completeCampaignSaved, firstVictoryRecord, completedCheckpoint;
const raceResults = [];
await test('eight sequential digital-input victories naturally unlock every course through actual page handlers', f => {
  for (let chapter = 1; chapter <= 8; chapter++) {
    assert.equal(f.read().state, 'ready'); assert.equal(f.read().level, chapter); assert.equal(f.read().unlocked, chapter);
    assert.equal(f.read().cars.length, 4); assert.equal(engine.LEVELS[chapter - 1].laps, 2);
    start(f); f.pilotHeld = new Set(); f.pilotDecision = null; f.pilotDecisionCount = 0;
    const { view, frames } = driveUntil(f, v => ['won', 'lost'].includes(v.state), `finish course ${chapter}`);
    assert.equal(view.state, 'won', `Actual controller digital-input race ${chapter} must meet the course goal`);
    assert.equal(view.result.won, true); assert.ok(view.result.place <= engine.LEVELS[chapter - 1].targetPlace);
    assert.ok(view.cars[0].s >= engine.LEVELS[chapter - 1].track.length * 2 - 1e-6);
    assert.equal(view.cars[0].finishTime, view.result.time); assert.equal(view.unlocked, Math.min(8, chapter + 1));
    assert.equal(Object.keys(view.best).length, chapter);
    const progress = JSON.parse(f.storage.get(PROGRESS_KEY));
    assert.equal(progress.unlocked, Math.min(8, chapter + 1)); assert.equal(Object.keys(progress.best).length, chapter);
    assert.deepEqual(progress.best[chapter], { place: view.result.place, time: view.result.time });
    if (chapter === 1) { firstVictoryRecord = progress.best[1]; completedCheckpoint = engine.checkpoint(view); }
    assert.equal(f.storage.has(CURRENT_KEY), false, 'Terminal race removes unfinished checkpoint');
    releasePilot(f); assertReleased(f);
    const writes = f.writes.filter(write => write.key === PROGRESS_KEY).length;
    const settled = f.read();
    f.frames(15, 1000); f.click('use-item'); f.click('pause');
    f.controlPointer('use-item', 'pointerdown', 5); f.controlPointer('use-item', 'pointerup', 5);
    assert.deepEqual(f.read(), settled, 'Terminal race cannot advance or settle again');
    assert.equal(f.writes.filter(write => write.key === PROGRESS_KEY).length, writes, 'Each finish is recorded once');
    raceResults.push({ course: chapter, place: view.result.place, time: Number(view.result.time.toFixed(3)), frames, decisions: f.pilotDecisionCount, holdTicks: 6, items: view.stats.itemsUsed, driftBoosts: view.stats.driftBoosts, collisions: view.stats.collisions, offroadTime: Number(view.stats.offroadTime.toFixed(3)) });
    console.log(`  ACTUAL-INPUT course ${chapter}: place=${view.result.place}, time=${view.result.time.toFixed(3)}, frames=${frames}, items=${view.stats.itemsUsed}, driftBoosts=${view.stats.driftBoosts}, decisions=${f.pilotDecisionCount}, hold=100ms`);
    f.click('chapters'); assert.equal(chapterButtons(f).filter(button => !button.disabled).length, Math.min(8, chapter + 1)); f.click('chapters-close');
    if (chapter < 8) checkedClick(f, 'primary-action');
  }
  completeCampaignSaved = Object.fromEntries(f.storage);
  f.click('primary-action'); assert.equal(f.read().level, 8); assert.equal(f.read().state, 'ready');
  assert.equal(Object.keys(f.read().best).length, 8);
});

await test('holding the ordinary brake naturally times out, awards nothing and retries without unlock', f => {
  start(f); f.key('ArrowDown');
  until(f, v => v.state === 'lost', 'reach the natural time limit while braking', 10000, 100);
  assert.equal(f.read().result.won, false); assert.equal(f.read().time, engine.LEVELS[0].timeLimit);
  assert.equal(f.read().unlocked, 1); assert.equal(Object.keys(f.read().best).length, 0);
  assert.equal(f.storage.has(CURRENT_KEY), false);
  const writes = f.writes.filter(write => write.key === PROGRESS_KEY).length;
  f.keyup('ArrowDown'); frozen(f); assert.equal(f.writes.filter(write => write.key === PROGRESS_KEY).length, writes);
  f.click('retry'); assert.equal(f.read().state, 'ready'); assert.equal(f.read().ticks, 0); assert.equal(f.read().time, 0); assertReleased(f);
});

await test('retry and native campaign navigation preserve all naturally earned records', f => {
  assert.ok(completeCampaignSaved, 'Actual eight-race sequence supplied the campaign');
  assert.equal(f.read().unlocked, 8); assert.equal(Object.keys(f.read().best).length, 8);
  f.click('chapters'); const first = chapterButtons(f).find(b => Number(b.dataset.level) === 1); first.click();
  assert.equal(f.read().level, 1); assert.equal(f.read().state, 'ready');
  start(f); for (let i = 0; i < 90; i++) driveFrame(f);
  f.click('retry'); f.pilotHeld = new Set();
  assert.equal(f.read().state, 'ready'); assert.equal(f.read().ticks, 0); assert.equal(f.read().time, 0); assertReleased(f);
  assert.equal(f.read().unlocked, 8); assert.equal(Object.keys(f.read().best).length, 8);
}, { saved: completeCampaignSaved });

await test('a genuine terminal checkpoint in the unfinished slot cannot award a course again', f => {
  assert.ok(completedCheckpoint); assert.equal(engine.restore(completedCheckpoint).state, 'won');
  assert.equal(f.read().state, 'ready'); assert.equal(f.read().discardedResume, true);
  assert.equal(f.read().unlocked, 8); assert.equal(Object.keys(f.read().best).length, 8);
  assert.deepEqual(JSON.parse(f.storage.get(PROGRESS_KEY)), JSON.parse(completeCampaignSaved[PROGRESS_KEY]));
  assert.deepEqual(f.read().best[1], firstVictoryRecord); frozen(f);
}, { saved: { ...completeCampaignSaved, [CURRENT_KEY]: JSON.stringify(completedCheckpoint) } });

await test('resumed actual mid-race checkpoint reaches the finish through ordinary controls and awards exactly once', f => {
  assert.equal(f.read().state, 'paused');
  f.click('primary-action'); f.el('race').focus(); f.frame(120000);
  const { view } = driveUntil(f, v => ['won', 'lost'].includes(v.state), 'finish a restored race');
  assert.equal(view.state, 'won'); assert.equal(view.unlocked, 2); assert.equal(Object.keys(view.best).length, 1);
  assert.deepEqual(view.best[1], { place: view.result.place, time: view.result.time });
  assert.equal(f.storage.has(CURRENT_KEY), false);
  releasePilot(f); const writes = f.writes.filter(w => w.key === PROGRESS_KEY).length;
  frozen(f); assert.equal(f.writes.filter(w => w.key === PROGRESS_KEY).length, writes);
}, { saved: savedRuns.paused?.storage });

const damagedProgress = () => JSON.stringify({ version: 1, unlocked: 'broken', best: { 1: firstVictoryRecord, 3: { place: -1, time: -4 } } });
const corruptCurrent = () => {
  const actual = JSON.parse(savedRuns.playing?.storage[CURRENT_KEY] || '{}');
  if (actual.state?.cars) actual.state.cars[0].speed = 99999;
  return JSON.stringify(actual);
};
for (const [label, current] of [['malformed JSON', () => '{not valid'], ['impossible physics', corruptCurrent], ['forged terminal result', () => {
  const actual = JSON.parse(savedRuns.playing?.storage[CURRENT_KEY] || '{}');
  if (actual.state) { actual.state.state = 'won'; actual.state.result = { won: true, place: 1, time: 1 }; }
  return JSON.stringify(actual);
}]]) {
  await test(`${label} current save is rejected without erasing salvageable completed records`, f => {
    assert.ok(firstVictoryRecord, 'Natural first victory record is available');
    assert.equal(f.read().state, 'ready'); assert.equal(f.read().discardedResume, true);
    assert.equal(f.read().unlocked, 2); assert.deepEqual(f.read().best[1], firstVictoryRecord); assert.equal(f.read().best[3], undefined);
    const salvaged = JSON.parse(f.storage.get(PROGRESS_KEY));
    assert.deepEqual(salvaged.best, { 1: firstVictoryRecord }, 'Rejected current race preserves valid independent records');
    assert.equal(salvaged.unlocked, 2);
    f.click('chapters'); assert.equal(chapterButtons(f).filter(button => !button.disabled).length, 2);
    chapterButtons(f).find(b => Number(b.dataset.level) === 8).click(); assert.equal(f.read().level, 1); f.click('chapters-close');
    start(f); f.frames(6); assert.equal(f.read().state, 'playing');
  }, { saved: { [PROGRESS_KEY]: damagedProgress(), [CURRENT_KEY]: current() } });
}

for (const options of [{ readDenied: true, writeDenied: true }, { writeDenied: true }]) {
  await test(`storage ${options.readDenied ? 'read/write denial' : 'quota/write denial'} remains visible without blocking actual input victory`, f => {
    start(f);
    assert.equal(f.read().storageAvailable, false);
    assert.match(f.el('save-note').textContent, /保存|存储|空间|阻止/);
    const { view } = driveUntil(f, v => ['won', 'lost'].includes(v.state), 'win despite unavailable storage');
    assert.equal(view.state, 'won'); assert.equal(view.unlocked, 2); assert.equal(view.storageAvailable, false);
    assert.equal(f.writes.length, 0);
    f.click('primary-action'); assert.equal(f.read().level, 2);
  }, options);
}

// Geometry below is deliberately simulated: these assert controller decisions,
// not browser layout. Existing 32 event groups above remain unchanged.
function drivingViewport(f, { height = 768, width = 1024, headingTop = -330, circuitTop = -180, circuitHeight = 520, controlsTop = 440, controlsHeight = 90, visualViewport } = {}) {
  Object.assign(f.window, { innerHeight: height, innerWidth: width, visualViewport });
  const heading = f.document.querySelector('.race-heading'), controls = f.document.querySelector('.touch-controls'), canvas = f.el('race');
  heading.rect = { left: 0, top: headingTop, width, height: circuitTop - headingTop };
  canvas.rect = { left: 0, top: circuitTop, width, height: circuitHeight };
  controls.rect = { left: 0, top: controlsTop, width, height: controlsHeight };
  const scrolls = [];
  f.window.scrollBy = options => {
    scrolls.push({ ...options, state: f.read().state, cardHidden: f.el('state-card').hidden });
    for (const element of [heading, canvas, controls]) element.rect.top -= options.top;
  };
  return { heading, controls, canvas, scrolls };
}
function assertCanvasVisible(f, geometry) {
  const top = f.window.visualViewport?.offsetTop || 0;
  const bottom = top + (f.window.visualViewport?.height || f.window.innerHeight);
  const rect = geometry.canvas.getBoundingClientRect();
  assert.ok(rect.top >= top && rect.bottom <= bottom, 'Full circuit must be within the simulated viewport');
  assert.equal(f.document.activeElement, geometry.canvas);
  assert.ok(geometry.canvas.focusCalls.some(options => options?.preventScroll === true), 'Controller focus must suppress its own automatic scrolling');
}
await test('visibility: tutorial confirmation reveals offscreen desktop circuit with the HUD after hiding the start card', f => {
  const g = drivingViewport(f);
  f.click('primary-action');
  assert.equal(f.read().state, 'ready'); assert.equal(g.scrolls.length, 0);
  f.click('help-confirm');
  assert.deepEqual(g.scrolls, [{ top: -330, left: 0, behavior: 'instant', state: 'countdown', cardHidden: true }]);
  assertCanvasVisible(f, g); assert.equal(g.heading.getBoundingClientRect().top, 0);
  f.click('primary-action'); assert.equal(g.scrolls.length, 1, 'Repeated activation cannot start or scroll again');
});
await test('visibility: narrow screen keeps HUD, whole circuit and touch controls together without per-frame jumps', f => {
  const g = drivingViewport(f, { width: 390, height: 844, headingTop: -240, circuitTop: -100, circuitHeight: 244, controlsTop: 240, controlsHeight: 75 });
  start(f);
  assert.equal(g.scrolls.length, 1); assert.equal(g.scrolls[0].top, -240);
  assertCanvasVisible(f, g); assert.equal(g.heading.getBoundingClientRect().top, 0);
  assert.ok(g.controls.getBoundingClientRect().bottom <= f.window.innerHeight);
  const positions = [g.heading.rect.top, g.canvas.rect.top, g.controls.rect.top];
  f.frames(120); assert.equal(g.scrolls.length, 1);
  assert.deepEqual([g.heading.rect.top, g.canvas.rect.top, g.controls.rect.top], positions);
});
await test('visibility: an already visible driving area stays still on start, pause and explicit resume', f => {
  const g = drivingViewport(f, { width: 390, height: 844, headingTop: 60, circuitTop: 200, circuitHeight: 244, controlsTop: 520, controlsHeight: 75 });
  start(f); assertCanvasVisible(f, g); assert.equal(g.scrolls.length, 0);
  f.click('pause'); assert.equal(f.read().state, 'paused'); assert.equal(g.scrolls.length, 0);
  f.click('primary-action'); assert.equal(f.read().state, 'playing'); assertCanvasVisible(f, g); assert.equal(g.scrolls.length, 0);
});
await test('visibility: a driving area below the viewport uses only the necessary downward offset', f => {
  const g = drivingViewport(f, { width: 390, height: 844, headingTop: 500, circuitTop: 650, circuitHeight: 244, controlsTop: 1000, controlsHeight: 75 });
  start(f, false); assertCanvasVisible(f, g);
  assert.equal(g.scrolls.length, 1); assert.equal(g.scrolls[0].top, 231);
  assert.equal(g.controls.getBoundingClientRect().bottom, 844);
});
await test('visibility: circuit taller than the viewport uses nearest-edge native scrolling, not a forced page-top jump', f => {
  const g = drivingViewport(f, { height: 600, headingTop: -100, circuitTop: 50, circuitHeight: 900, controlsTop: 1100 });
  start(f, false); assert.equal(g.scrolls.length, 0);
  assert.deepEqual(g.canvas.scrollIntoViewCalls, [{ block: 'nearest', inline: 'nearest', behavior: 'instant' }]);
});
await test('visibility: absent scroll APIs in a test host do not break explicit start or resume', f => {
  f.window.scrollBy = undefined; f.el('race').scrollIntoView = undefined;
  start(f); assert.equal(f.read().state, 'playing');
  f.click('pause'); assert.equal(f.read().state, 'paused');
  f.click('primary-action'); assert.equal(f.read().state, 'playing');
  assert.equal(f.document.activeElement, f.el('race'));
});
await test('visibility: cancelling either first tutorial path does not start or scroll; reopening and confirming does', f => {
  const g = drivingViewport(f);
  f.click('primary-action'); f.click('help-close');
  assert.equal(f.read().state, 'ready'); assert.equal(g.scrolls.length, 0); frozen(f);
  f.click('primary-action'); f.el('help-dialog').emit('cancel');
  assert.equal(f.read().state, 'ready'); assert.equal(g.scrolls.length, 0); frozen(f);
  f.click('primary-action'); f.click('help-confirm');
  assert.equal(f.read().state, 'countdown'); assert.equal(g.scrolls.length, 1); assertCanvasVisible(f, g);
});
await test('visibility: closing or confirming a manual/chapter dialog leaves play paused and never scrolls', f => {
  start(f);
  const g = drivingViewport(f);
  f.click('help'); assert.equal(f.read().state, 'paused');
  f.click('help-confirm'); assert.equal(f.read().state, 'paused'); assert.equal(g.scrolls.length, 0); frozen(f);
  f.click('help'); f.el('help-dialog').emit('cancel');
  assert.equal(f.read().state, 'paused'); assert.equal(g.scrolls.length, 0);
  f.click('chapters'); f.click('chapters-close');
  assert.equal(f.read().state, 'paused'); assert.equal(g.scrolls.length, 0); frozen(f);
  f.click('primary-action'); assert.equal(f.read().state, 'playing'); assert.equal(g.scrolls.length, 1); assertCanvasVisible(f, g);
});
await test('visibility: ordinary pause, focus/visibility recovery and retry cannot silently start or scroll', f => {
  start(f);
  const g = drivingViewport(f);
  f.click('pause'); f.window.emit('blur'); f.window.emit('focus'); f.hide(); f.hide(false);
  assert.equal(f.read().state, 'paused'); assert.equal(g.scrolls.length, 0); frozen(f);
  f.click('retry'); assert.equal(f.read().state, 'ready'); assert.equal(g.scrolls.length, 0);
  f.click('primary-action'); assert.equal(f.read().state, 'countdown'); assert.equal(g.scrolls.length, 1); assertCanvasVisible(f, g);
});
await test('visibility: a refreshed checkpoint remains paused and reveals the circuit only on explicit resume', f => {
  const g = drivingViewport(f);
  assert.equal(f.read().state, 'paused'); assert.equal(g.scrolls.length, 0); frozen(f);
  f.click('primary-action'); assert.equal(f.read().state, 'playing'); assert.equal(g.scrolls.length, 1); assertCanvasVisible(f, g);
}, { saved: savedRuns.playing?.storage });
await test('visibility: a reduced visual viewport uses its actual top and height', f => {
  const g = drivingViewport(f, { height: 844, headingTop: 10, circuitTop: 150, circuitHeight: 360, controlsTop: 650, controlsHeight: 80, visualViewport: { offsetTop: 50, height: 600 } });
  start(f, false); assertCanvasVisible(f, g);
  assert.equal(g.scrolls.length, 1); assert.equal(g.scrolls[0].top, -40);
  assert.equal(g.heading.getBoundingClientRect().top, 50);
});


let assistedSaved;
await test('v2 assist checkbox opts in only while ready; in-race change is rejected and mode is visible', f=>{
 assert.equal(f.read().assist,false);assert.equal(f.el('assist-mode').checked,false);
 f.el('assist-mode').checked=true;f.el('assist-mode').emit('change');assert.equal(f.read().assist,true);assert.match(f.el('drive-mode').textContent,/已开启/);
 start(f);f.el('assist-mode').checked=false;f.el('assist-mode').emit('change');assert.equal(f.read().assist,true);assert.equal(f.el('assist-mode').checked,true);
 f.frames(120);f.click('pause');assistedSaved=Object.fromEntries(f.storage);assert.equal(f.read().assist,true);
});
await test('v2 actual checkbox opt-in survives refreshed checkpoint and explicit resume',f=>{
 assert.equal(f.read().assist,true);assert.equal(f.read().state,'paused');assert.equal(f.el('assist-mode').disabled,true);assert.match(f.el('state-summary').textContent,/辅助成绩/);frozen(f);f.click('primary-action');assert.equal(f.read().state,'playing');assert.equal(f.read().assist,true);
},{saved:assistedSaved});
await test('v2 assisted race completes via 500ms digital key decisions and records only assisted best',f=>{
 f.el('assist-mode').checked=true;f.el('assist-mode').emit('change');start(f);let held=new Set(),input={},last=-100;
 for(let n=0;n<7000&&!['won','lost'].includes(f.read().state);n++){const v=f.read();if(v.ticks-last>=30){last=v.ticks;const c=v.cars[0],cue=drivingCue(v);input={steer:c.lateral< -8?1:c.lateral>8?-1:0,drift:Math.abs(cue.curvature)>.003&&!c.offroad,brake:cue.sharp&&c.speed>80,item:c.item==='boost'?!cue.sharp:c.item==='pulse'?pulseTargets(v).length>0:!!c.item};const desired=new Map([['ArrowLeft',input.steer===-1],['ArrowRight',input.steer===1],['ArrowDown',input.brake],[' ',input.drift],['e',input.item]]);for(const[k,on]of desired)if(!on&&held.has(k)){f.keyup(k);held.delete(k);}for(const[k,on]of desired)if(on&&!held.has(k)){f.key(k);held.add(k);}}f.frame();}
 releasePilot(f);const result=f.read();assert.equal(result.state,'won');assert.equal(result.result.assisted,true);assert.ok(result.stats.driftBoosts>0);assert.ok(result.stats.itemsUsed>0);assert.equal(result.best[1],undefined);assert.ok(result.assistedBest[1]);assert.match(f.el('state-summary').textContent,/辅助成绩/);const saved=JSON.parse(f.storage.get(PROGRESS_KEY));assert.equal(saved.best[1],undefined);assert.ok(saved.assistedBest[1]);
 console.log('ASSISTED_INPUT_RESULT '+JSON.stringify({result:result.result,stats:result.stats,inputHoldMs:500}));
});

const finalHashes = hashFiles();
const finalSupportingHashes = supportingHashes();
try {
  assert.deepEqual(finalHashes, initialHashes, 'Production game files changed during the test run; rerun against a frozen build');
  assert.deepEqual(finalSupportingHashes, initialSupportingHashes, 'Fixture or digital pilot changed during the run; rerun the frozen files');
}
catch (error) { failed++; console.error(`FAIL production freeze\n  ${error.stack}`); }
console.log(`\n${passed} passed; ${failed} failed. Actual kart game.mjs handlers, engine, progress and renderer ran with Node-only browser surfaces.`);
console.log(`${raceResults.length}/8 campaign victories verified using native keydown/keyup, discrete steer -1/0/+1 held for 100ms (6 physics ticks), brake/drift holds and item edges. No state setters or synthetic win injection.`);
console.log('Not browser, visual, layout, accessibility, real-device pointer-capture, audio or deployment verification.');
console.log(`ACTUAL_INPUT_RESULTS ${JSON.stringify(raceResults)}`);
console.log(`TESTED_SHA256 ${JSON.stringify(finalHashes)}`);
console.log(`TEST_SUPPORT_SHA256 ${JSON.stringify(finalSupportingHashes)}`);
process.exitCode = failed ? 1 : 0;
