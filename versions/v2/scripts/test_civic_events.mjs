#!/usr/bin/env node
/**
 * Node-only event tests of the actual civic/game.mjs controller.
 * Real engine, progress, markup and renderer; only browser surfaces are simulated.
 * All game mutations occur through ordinary DOM controls. civicSnapshot is read-only.
 * The campaign follows public civic_pilot.mjs PLANS; two explicit variants test choice.
 * No private-state injection, browser launch, network or dependency installation.
 * Canvas operations are no-ops: this is not a visual/browser-layout/device test.
 * Keyboard default activation is explicitly simulated, not proven browser behavior.
 * Run from any directory: node scripts/test_civic_events.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PLANS } from './civic_pilot.mjs';
import { PROGRESS_KEY, CURRENT_KEY } from '../games/civic/progress.mjs';
import { hitTile } from '../games/civic/renderer.mjs';
const frozenFiles = ['index.html', 'civic.css', 'game.mjs', 'engine.mjs', 'levels.mjs', 'progress.mjs', 'renderer.mjs'];
const hashFiles = () => Object.fromEntries(frozenFiles.map(file => [file, createHash('sha256').update(readFileSync(new URL(`../games/civic/${file}`, import.meta.url))).digest('hex')]));
const initialHashes = hashFiles();
const markup = readFileSync(new URL('../games/civic/index.html', import.meta.url), 'utf8');
const gameURL = new URL('../games/civic/game.mjs', import.meta.url);
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
    read() { return window.civicSnapshot(); },
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
      const canvas = this.el('coast');
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
const outcomes = [];
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
function stableAcrossFrames(f) { const before = f.read(); f.frames(12, 60000); assert.deepEqual(f.read(), before, 'Wall-clock/RAF time must never advance turns or grant income'); }
function usable(button) {
  for (let node = button; node; node = node.parentElement) assert.equal(node.hidden, false, `#${button.id || button.dataset.commandKey || button.dataset.tileId} must be visible`);
  assert.equal(button.disabled, false, 'Control must be natively enabled');
}
function checkedClick(f, id) {
  const button = typeof id === 'string' ? f.el(id) : id;
  usable(button); button.focus(); button.click();
  assert.equal(f.document.activeElement.isConnected, true, 'Click must leave focus on a live control');
}
function tiles(f) { return f.el('tile-grid').querySelectorAll('[data-tile-id]'); }
function chapters(f) { return f.el('chapter-list').querySelectorAll('[data-chapter-index]'); }
function action(f, key) { const button = f.document.querySelector(`[data-command-key="${key}"]`); assert.ok(button, `Missing command ${key}`); return button; }
function select(f, id) { checkedClick(f, tiles(f)[id]); assert.equal(f.read().selectedTile, id); }
function begin(f) { assert.ok(['ready', 'paused'].includes(f.read().state)); checkedClick(f, 'primary-action'); assert.equal(f.read().state, 'playing'); }
function commandThroughUI(f, command) {
  const prior = f.read();
  if (command.tileId !== undefined) select(f, command.tileId);
  if (command.type === 'endTurn') checkedClick(f, 'end-turn');
  else {
    const key = command.type === 'build' ? `build-${command.building}` : command.type === 'research' ? `research-${command.research}` : command.type === 'assign' ? command.worker ? 'assign' : 'unassign' : command.type;
    const button = action(f, key); assert.equal(button.getAttribute('aria-disabled'), 'false', `${JSON.stringify(command)} must be available: ${button.title}`);
    checkedClick(f, button);
  }
  const after = f.read();
  assert.equal(after.commandLog.length, prior.commandLog.length + 1, `UI must execute exactly one ${JSON.stringify(command)}`);
  if (command.type !== 'endTurn') assert.equal(after.actions, prior.actions - 1);
  else for (const key of Object.keys(prior.resources)) assert.equal(after.resources[key], Math.max(0, prior.forecast.after[key]), `Forecast ${key} must match actual settlement`);
  return after;
}
function playPlan(f, plan) {
  begin(f);
  for (const turn of plan) {
    for (const command of turn) commandThroughUI(f, command);
    commandThroughUI(f, { type: 'endTurn' });
    if (['won', 'lost'].includes(f.read().state)) break;
  }
  const result = f.read(); assert.equal(result.state, 'won'); assert.ok(result.objectives.every(goal => goal.complete));
  return { chapter: result.levelIndex + 1, turn: result.turn, commands: result.commandLog.length, food: result.resources.food, wood: result.resources.wood, stone: result.resources.stone, trade: result.tradeDelivered };
}
function keyPair(f, key, init = {}) { f.key(key, init); f.keyup(key, init); }
// Fake DOM has no native browser default activation. Explicitly model Enter-down,
// Space-up and respect preventDefault. Browser/device parity remains unverified.
function nativeKeyDown(f, key, init = {}) {
  const button = f.document.activeElement, event = f.key(key, init);
  if (!event.defaultPrevented && key === 'Enter' && button instanceof FakeButton) button.click();
  return event;
}
function nativeKeyUp(f, key, init = {}) {
  const button = f.document.activeElement, event = f.keyup(key, init);
  if (!event.defaultPrevented && key === ' ' && button instanceof FakeButton) button.click();
  return event;
}
function normalized(view) {
  const copy = structuredClone(view); delete copy.selectedTile; delete copy.state; delete copy.undoAvailable; return copy;
}
function saved(f) { return Object.fromEntries(f.storage); }
function canvasLocation(f, id) {
  // Use actual exported hit geometry, not a parallel map/hit implementation.
  const points = [];
  for (let y = 2; y < 800; y += 6) for (let x = 2; x < 1200; x += 6) if (hitTile(x, y) === id) points.push([x, y]);
  assert.ok(points.length, `Renderer needs an interactive point for tile ${id}`);
  let x = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  let y = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  if (hitTile(x, y) !== id) [x, y] = points[Math.floor(points.length / 2)];
  const rect = f.el('coast').getBoundingClientRect(), scale = Math.min(rect.width / 1200, rect.height / 800);
  return { x: rect.left + (rect.width - 1200 * scale) / 2 + x * scale, y: rect.top + (rect.height - 800 * scale) / 2 + y * scale };
}

await test('real markup/controller/renderer initialize read-only diagnostics and one unlocked chapter', f => {
  assert.equal(f.read().state, 'ready'); assert.equal(tiles(f).length, 42); assert.equal(chapters(f).length, 8);
  assert.equal(chapters(f).filter(b => !b.disabled).length, 1); assert.ok(f.el('coast').renderCalls > 20);
  const descriptor = Object.getOwnPropertyDescriptor(f.window, 'civicSnapshot'); assert.equal(descriptor.writable, false); assert.equal(descriptor.configurable, false);
  assert.equal(f.window.civicSetState, undefined); assertDeepFrozen(f.read()); assert.throws(() => { f.read().resources.food = 999; }, TypeError);
  stableAcrossFrames(f); const before = f.read(); chapters(f)[7].click(); assert.deepEqual(f.read(), before);
});

await test('first chapter is completed through ordinary buttons with forecast/record agreement', f => {
  outcomes.push({ label: 'tutorial baseline', ...playPlan(f, PLANS[0]) });
  assert.equal(f.read().turn, 3); assert.equal(f.read().resources.food, 16);
  const progress = JSON.parse(f.storage.get(PROGRESS_KEY)); assert.equal(progress.unlocked, 1); assert.equal(progress.best[0].turns, 3);
  assert.equal(f.storage.has(CURRENT_KEY), false); assert.equal(chapters(f)[1].disabled, false); assert.equal(chapters(f)[2].disabled, true);
  stableAcrossFrames(f); checkedClick(f, 'primary-action'); assert.equal(f.read().levelIndex, 1); assert.equal(f.read().state, 'ready');
});

let fullCampaignSave;
await test('all eight chapters sequentially win through real UI, with unlocks and independent best records', f => {
  for (let i = 0; i < 8; i++) {
    assert.equal(f.read().levelIndex, i); assert.equal(chapters(f)[i].disabled, false);
    if (i < 7) assert.equal(chapters(f)[i + 1].disabled, true);
    outcomes.push({ label: 'sequential campaign', ...playPlan(f, PLANS[i]) });
    const progress = JSON.parse(f.storage.get(PROGRESS_KEY));
    assert.equal(progress.unlocked, Math.min(7, i + 1)); assert.equal(Object.keys(progress.best).length, i + 1); assert.equal(f.storage.has(CURRENT_KEY), false);
    if (i < 7) checkedClick(f, 'primary-action');
  }
  fullCampaignSave = saved(f); checkedClick(f, 'primary-action'); assert.equal(f.el('chapters-dialog').open, true);
  assert.equal(chapters(f).filter(b => !b.disabled).length, 8);
});

await test('automatic saves restore exact interrupted work paused and require explicit resume', async f => {
  begin(f); commandThroughUI(f, PLANS[0][0][0]); commandThroughUI(f, PLANS[0][0][1]); commandThroughUI(f, { type: 'endTurn' });
  const before = f.read(); assert.ok(f.storage.has(CURRENT_KEY));
  const loaded = await fixture({ saved: saved(f) });
  try {
    assert.equal(loaded.read().state, 'paused'); assert.deepEqual(normalized(loaded.read()), normalized(before));
    assert.equal(loaded.el('restore-note').hidden, false); stableAcrossFrames(loaded);
    const paused = loaded.read(); loaded.click('end-turn'); action(loaded, 'road').click(); assert.deepEqual(loaded.read(), paused);
    begin(loaded); commandThroughUI(loaded, { type: 'endTurn' }); commandThroughUI(loaded, { type: 'endTurn' }); assert.equal(loaded.read().state, 'won');
  } finally { loaded.restoreGlobals(); }
});

await test('pause, blur, visibility, pagehide and help never advance a turn or resume implicitly', f => {
  begin(f); commandThroughUI(f, PLANS[0][0][0]);
  for (const trigger of [() => f.click('pause'), () => f.window.emit('blur'), () => f.hide(), () => f.window.emit('pagehide'), () => f.click('help')]) {
    const before = f.read(); trigger(); assert.equal(f.read().state, 'paused'); assert.deepEqual(normalized(f.read()), normalized(before)); stableAcrossFrames(f);
    f.hide(false); f.window.emit('focus'); assert.equal(f.read().state, 'paused');
    if (f.el('help-dialog').open) { f.click('help-close'); assert.equal(f.read().state, 'paused'); }
    begin(f);
  }
});

await test('retry cancel/Escape preserves work; confirmation replaces only the interrupted chapter', f => {
  begin(f); commandThroughUI(f, PLANS[0][0][0]); const before = f.read();
  checkedClick(f, 'retry'); assert.equal(f.el('confirm-dialog').open, true); assert.equal(f.read().state, 'paused');
  checkedClick(f, 'confirm-cancel'); assert.equal(f.el('confirm-dialog').open, false); assert.deepEqual(normalized(f.read()), normalized(before));
  begin(f); checkedClick(f, 'retry'); const event = f.el('confirm-dialog').emit('cancel'); assert.equal(event.defaultPrevented, true); assert.deepEqual(normalized(f.read()), normalized(before));
  begin(f); checkedClick(f, 'retry'); checkedClick(f, 'confirm-accept');
  assert.equal(f.read().state, 'ready'); assert.equal(f.read().commandLog.length, 0); assert.equal(f.read().tiles[15].building, null); assert.equal(f.read().resources.wood, 10);
});

await test('chapter switch asks before replacing work, preserves completed best records, and reload retains unlocks', async f => {
  assert.equal(chapters(f).filter(b => !b.disabled).length, 8); assert.equal(f.read().levelIndex, 0);
  begin(f); commandThroughUI(f, PLANS[0][0][0]); const before = f.read();
  f.click('chapters'); checkedClick(f, chapters(f)[5]); assert.equal(f.el('confirm-dialog').open, true);
  f.click('confirm-cancel'); assert.deepEqual(normalized(f.read()), normalized(before));
  f.click('chapters'); checkedClick(f, chapters(f)[5]); f.click('confirm-accept');
  assert.equal(f.read().levelIndex, 5); assert.equal(f.read().state, 'ready'); assert.equal(Object.keys(JSON.parse(f.storage.get(PROGRESS_KEY)).best).length, 8);
  const loaded = await fixture({ saved: saved(f) });
  try { assert.equal(loaded.read().levelIndex, 5); assert.equal(loaded.read().state, 'paused'); assert.equal(chapters(loaded).filter(b => !b.disabled).length, 8); }
  finally { loaded.restoreGlobals(); }
}, { saved: fullCampaignSave });

await test('undo button withdraws all current-turn actions but never settled production', f => {
  begin(f); const initial = f.read(); commandThroughUI(f, PLANS[0][0][0]); commandThroughUI(f, PLANS[0][0][1]);
  checkedClick(f, 'undo'); assert.deepEqual(normalized(f.read()), normalized(initial)); assert.equal(f.el('undo').disabled, true);
  for (const c of PLANS[0][0]) commandThroughUI(f, c); commandThroughUI(f, { type: 'endTurn' });
  const settled = f.read(); assert.equal(f.el('undo').disabled, true); f.click('undo'); assert.deepEqual(f.read(), settled);
});

await test('keyboard repeat and held keys execute one native action, reject stale activation, and recover on release', f => {
  f.el('primary-action').focus(); nativeKeyDown(f, 'Enter'); assert.equal(f.read().state, 'playing');
  for (let i = 0; i < 4; i++) assert.equal(nativeKeyDown(f, 'Enter', { repeat: true }).defaultPrevented, true);
  nativeKeyUp(f, 'Enter'); select(f, 15); action(f, 'build-farm').focus();
  nativeKeyDown(f, 'Enter'); assert.equal(f.read().tiles[15].building, 'farm'); const count = f.read().commandLog.length;
  assert.equal(nativeKeyDown(f, 'Enter').defaultPrevented, true); assert.equal(nativeKeyDown(f, 'Enter', { repeat: true }).defaultPrevented, true); nativeKeyUp(f, 'Enter'); assert.equal(f.read().commandLog.length, count);
  action(f, 'assign').focus(); nativeKeyDown(f, ' '); nativeKeyUp(f, ' '); assert.equal(f.read().tiles[15].worker, true);
  f.el('end-turn').focus(); nativeKeyDown(f, 'Enter'); const turn = f.read().turn;
  for (let i = 0; i < 5; i++) nativeKeyDown(f, 'Enter', { repeat: true }); assert.equal(f.read().turn, turn); nativeKeyUp(f, 'Enter');
  select(f, 15); keyPair(f, 'ArrowRight'); assert.equal(f.read().selectedTile, 16);
  f.key('ArrowDown'); assert.equal(f.read().selectedTile, 23); f.key('ArrowDown', { repeat: true }); assert.equal(f.read().selectedTile, 23); f.keyup('ArrowDown');
  f.key('p'); assert.equal(f.read().state, 'paused'); f.key('p', { repeat: true }); assert.equal(f.read().state, 'paused'); f.keyup('p'); keyPair(f, 'p'); assert.equal(f.read().state, 'playing');
  f.el('end-turn').focus(); nativeKeyDown(f, ' '); f.window.emit('blur'); assert.equal(f.read().state, 'paused');
  f.el('primary-action').focus(); assert.equal(nativeKeyUp(f, ' ').defaultPrevented, true); assert.equal(f.read().state, 'paused');
  nativeKeyDown(f, ' '); nativeKeyUp(f, ' '); assert.equal(f.read().state, 'playing');
});

await test('pointer tap selects; drag, return-drag, cancellation, wrong ID, modal and stale generation cannot select', f => {
  const a = canvasLocation(f, 15), b = canvasLocation(f, 23), home = f.read().selectedTile;
  const tap = p => { f.pointer('pointerdown', p.x, p.y); f.pointer('pointerup', p.x, p.y); };
  tap(a); assert.equal(f.read().selectedTile, 15); assert.notEqual(home, 15);
  const expectNoSelect = run => { select(f, 15); run(); assert.equal(f.read().selectedTile, 15); };
  expectNoSelect(() => { f.pointer('pointerdown', b.x, b.y); f.pointer('pointermove', b.x + 30, b.y); f.pointer('pointerup', b.x + 30, b.y); });
  expectNoSelect(() => { f.pointer('pointerdown', b.x, b.y); f.pointer('pointermove', b.x + 30, b.y); f.pointer('pointerup', b.x, b.y); });
  for (const type of ['pointercancel', 'lostpointercapture', 'pointerleave']) expectNoSelect(() => { f.pointer('pointerdown', b.x, b.y); f.pointer(type, b.x, b.y); f.pointer('pointerup', b.x, b.y); });
  expectNoSelect(() => { f.pointer('pointerdown', b.x, b.y); f.pointer('pointerup', b.x, b.y, { pointerId: 2 }); f.pointer('pointercancel', b.x, b.y); });
  expectNoSelect(() => { f.pointer('pointerdown', b.x, b.y, { button: 2 }); f.pointer('pointerup', b.x, b.y, { button: 2 }); });
  expectNoSelect(() => { f.pointer('pointerdown', b.x, b.y); f.window.emit('blur'); f.pointer('pointerup', b.x, b.y); });
  f.click('help'); tap(b); assert.equal(f.read().selectedTile, 15); f.click('help-close'); tap(b); assert.equal(f.read().selectedTile, 23);
  f.el('coast').rect = { left: 10, top: 20, width: 600, height: 500 }; const letterboxed = canvasLocation(f, 16); tap(letterboxed); assert.equal(f.read().selectedTile, 16);
  f.pointer('pointerdown', 20, 22); f.pointer('pointerup', 20, 22); assert.equal(f.read().selectedTile, 16);
});

await test('corrupt current save is discarded while valid best records and unlocks survive', f => {
  assert.equal(f.read().state, 'ready'); assert.equal(f.read().levelIndex, 0); assert.equal(f.storage.has(CURRENT_KEY), false);
  assert.equal(f.el('restore-note').hidden, false); assert.match(f.el('restore-note').textContent, /损坏|不兼容/);
  assert.equal(chapters(f).filter(b => !b.disabled).length, 8); assert.equal(Object.keys(JSON.parse(f.storage.get(PROGRESS_KEY)).best).length, 8);
}, { saved: { ...fullCampaignSave, [CURRENT_KEY]: '{invalid json' } });

await test('invalid replay checkpoint is rejected without awarding a victory', f => {
  assert.equal(f.read().state, 'ready'); assert.equal(f.storage.has(CURRENT_KEY), false); assert.equal(chapters(f).filter(b => !b.disabled).length, 1);
  assert.equal(f.el('restore-note').hidden, false); assert.equal(f.storage.has(PROGRESS_KEY), false);
}, { saved: { [CURRENT_KEY]: JSON.stringify({ version: 1, checkpoint: { version: 1, levelIndex: 7, started: true, commands: [], checksum: '0000' } }) } });

await test('corrupt progress returns safely to first chapter and remains playable', f => {
  assert.equal(chapters(f).filter(b => !b.disabled).length, 1); outcomes.push({ label: 'corrupt progress recovery', ...playPlan(f, PLANS[0]) });
  assert.equal(JSON.parse(f.storage.get(PROGRESS_KEY)).unlocked, 1);
}, { saved: { [PROGRESS_KEY]: '{invalid json' } });

await test('denied storage shows honest warning while the first chapter remains winnable in session', f => {
  assert.match(f.el('save-note').textContent, /无法可靠保存/); outcomes.push({ label: 'storage denied', ...playPlan(f, PLANS[0]) });
  assert.equal(chapters(f)[1].disabled, false); assert.equal(f.writes.length, 0);
}, { readDenied: true, writeDenied: true });

await test('alternative one relocates the opening farm from B3 to C4 and still wins', f => {
  const plan = structuredClone(PLANS[0]); for (const turn of plan) for (const command of turn) if (command.tileId === 15) command.tileId = 23;
  outcomes.push({ label: 'alternative farm C4', ...playPlan(f, plan) }); assert.equal(f.read().turn, 3); assert.equal(f.read().tiles[15].building, null); assert.equal(f.read().tiles[23].worker, true);
});

await test('alternative two invests 3 extra wood in a second farm and wins one turn sooner with more grain', f => {
  const plan = structuredClone(PLANS[0]); plan[0].push({ type: 'build', tileId: 23, building: 'farm' }); plan[1].push({ type: 'assign', tileId: 23, worker: true });
  outcomes.push({ label: 'two farms: wood vs speed', ...playPlan(f, plan) });
  assert.equal(f.read().turn, 2); assert.equal(f.read().resources.food, 19); assert.equal(f.read().resources.wood, 4); assert.equal(f.read().tiles.filter(tile => tile.worker).length, 2);
});

assert.deepEqual(hashFiles(), initialHashes, 'Controller tests must not change any game file');
console.log(`\n${passed} passed; ${failed} failed`);
console.log(JSON.stringify({ outcomes, sourceHashes: initialHashes, limitations: ['Node fake DOM; no actual browser, layout, accessibility tree, device or visual verification.', 'Canvas operations are no-ops while the real renderer executes.', 'Native Enter/Space activation is modeled explicitly; browser default behavior is not verified.', 'Campaign actions use public PLANS and real user controls; two documented chapter-one plan variants are additional evidence, not exhaustive balance analysis.'] }, null, 2));
if (failed) process.exitCode = 1;
