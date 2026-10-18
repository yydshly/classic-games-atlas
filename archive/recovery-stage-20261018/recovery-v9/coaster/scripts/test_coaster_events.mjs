#!/usr/bin/env node
/**
 * Node-only event tests of the actual games/coaster/game.mjs controller.
 * Real engine, progress and renderer; only the browser surfaces are simulated.
 * No private state writes, copied handlers, browser launch, network, or installs.
 * Canvas drawing is a no-op: these are NOT visual, browser-layout, or device tests.
 * Run: node scripts/test_coaster_events.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as engine from '../games/coaster/engine.mjs';
import * as pilot from './coaster_pilot.mjs';
import { PROGRESS_KEY, CURRENT_KEY } from '../games/coaster/progress.mjs';

const markup = readFileSync(new URL('../games/coaster/index.html', import.meta.url), 'utf8');
const gameURL = new URL('../games/coaster/game.mjs', import.meta.url);
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
  if (s === 'button:not(:disabled)') return element.tagName === 'BUTTON' && !element.disabled;
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
    this.hidden = false; this.disabled = false; this.open = false; this.value = '';
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
  appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
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
  showModal() { this.open = true; }
  close() { this.open = false; this.emit('close'); }
  scrollIntoView() {}
  setPointerCapture(id) { this.capturedPointers.add(id); }
  hasPointerCapture(id) { return this.capturedPointers.has(id); }
  releasePointerCapture(id) { if (this.capturedPointers.delete(id)) this.emit('lostpointercapture', { pointerId: id }); }
}
class FakeButton extends FakeElement { constructor(document) { super('button', document); } }
class FakeCanvas extends FakeElement {
  constructor(document) {
    super('canvas', document); this.width = 1200; this.height = 800; this.renderCalls = 0;
    this.rect = { left: 24, top: 40, width: 600, height: 400 };
    this.context = new Proxy({ canvas: this }, {
      get: (object, key) => {
        if (key in object) return object[key];
        if (['createLinearGradient', 'createRadialGradient', 'createConicGradient'].includes(key)) return () => ({ addColorStop() {} });
        if (key === 'measureText') return text => ({ width: String(text).length * 8 });
        return (..._args) => { this.renderCalls++; };
      },
    });
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
    document, window, localStorage, HTMLElement: FakeElement, HTMLButtonElement: FakeButton,
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
    read() { return window.coasterSnapshot(); },
    frames(n, ms = FRAME_MS) { for (let i = 0; i < n; i++) frame(ms); },
    click(id) { return this.el(id).click(); },
    button(container, text) {
      const button = this.el(container).querySelectorAll('button').find(el => el.textContent.includes(text));
      assert.ok(button, `Missing button ${text} in #${container}`); return button;
    },
    key(key, init = {}) { return document.activeElement.emit('keydown', { key, code: key === ' ' ? 'Space' : /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key, repeat: false, ctrlKey: false, altKey: false, metaKey: false, ...init }); },
    keyup(key, init = {}) { return document.activeElement.emit('keyup', { key, code: key === ' ' ? 'Space' : /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key, ...init }); },
    hide(hidden = true) { document.hidden = hidden; document.visibilityState = hidden ? 'hidden' : 'visible'; document.emit('visibilitychange'); },
    pointer(type, x, y, init = {}) {
      const canvas = this.el('park');
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
function until(f, predicate, label, maximumFrames = 20000) {
  for (let frame = 0; frame < maximumFrames; frame++) {
    if (predicate(f.read())) return f.read();
    f.frame(100);
  }
  assert.fail(`Controller did not ${label}: ${JSON.stringify(f.read())}`);
}
function checkedClick(f, id) {
  const button = f.el(id);
  assert.equal(button.disabled, false, `#${id} must be enabled`);
  assert.equal(button.hidden, false, `#${id} must be visible`);
  button.focus(); button.click();
  assert.equal(f.document.activeElement.isConnected, true, `#${id} must leave focus on a live control`);
}
function savedCommands(f) {
  return JSON.parse(f.storage.get(CURRENT_KEY)).checkpoint.history.filter(event => event.kind === 'command').map(event => event.command);
}
function segmentButtons(f) { return f.el('segment-list').querySelectorAll('[data-segment]'); }
function selected(f) {
  const buttons = segmentButtons(f).filter(button => button.getAttribute('aria-pressed') === 'true');
  assert.equal(buttons.length, 1, 'Exactly one native track-segment button is selected');
  assert.equal(Number(buttons[0].dataset.segment), f.read().selectedSegment);
  return Number(buttons[0].dataset.segment);
}
function select(f, segment) {
  const button = segmentButtons(f).find(button => Number(button.dataset.segment) === segment);
  assert.ok(button, `Missing track segment ${segment}`);
  button.click();
  assert.equal(selected(f), segment);
}
function install(f, module) {
  const button = f.el('module-controls').querySelector(`[data-module="${module}"]`);
  assert.ok(button, `Missing module control ${module}`);
  assert.equal(button.disabled, false, `${module} module must be available`);
  assert.equal(button.hidden, false, `${module} module must be visible`);
  assert.notEqual(button.getAttribute('aria-disabled'), 'true', `${module} module must be engine-legal`);
  button.focus(); button.click();
  assert.equal(f.document.activeElement.isConnected, true, 'Module installation retains live keyboard focus');
}
function engineView(view, reference) {
  return Object.fromEntries(Object.keys(reference).map(key => [key, view[key]]));
}

await test('actual controller initializes native controls and renderer; diagnostics are deeply read-only', f => {
  assert.equal(f.read().state, 'design');
  assert.equal(segmentButtons(f).length, 12);
  assert.equal(f.el('module-controls').querySelectorAll('[data-module]').length, 6);
  assert.equal(f.el('pause').disabled, true);
  assert.ok(f.el('park').renderCalls > 100, 'Real renderer must execute mocked canvas methods');
  const descriptor = Object.getOwnPropertyDescriptor(f.window, 'coasterSnapshot');
  assert.equal(descriptor.writable, false); assert.equal(descriptor.configurable, false);
  assert.equal(f.window.coasterSetState, undefined);
  const snapshot = f.read(); assertDeepFrozen(snapshot);
  assert.throws(() => { snapshot.state = 'won'; }, TypeError);
  assert.equal(f.read().state, 'design');
  selected(f); frozen(f);
  f.click('chapters');
  assert.equal(f.el('chapter-list').children.length, 8);
  assert.equal(f.el('chapter-list').children.filter(button => !button.disabled).length, 1);
  f.el('chapter-7').click();
  assert.equal(f.read().levelIndex, 0, 'A disabled later chapter cannot bypass the campaign lock');
  f.click('chapters-close'); assert.equal(f.read().state, 'design');
});

await test('native segment arrow/Home/End navigation keeps live focus without installing modules', f => {
  select(f, 0); f.el('segment-0').focus();
  const before = f.read();
  for (const [key, target] of [['ArrowRight', 1], ['End', 11], ['ArrowLeft', 10], ['Home', 0]]) {
    assert.equal(f.key(key).defaultPrevented, true);
    assert.equal(selected(f), target);
    assert.equal(f.document.activeElement.dataset.segment, String(target));
    assert.ok(f.document.activeElement.isConnected); f.keyup(key);
  }
  assert.deepEqual(f.read(), before, 'Selection round trip has no engineering or business side effects');
});

const { projectTrackPoint, hitSegment, VIEW } = await import('../games/coaster/renderer.mjs');
function pointerPoint(f, segment) {
  const logical = projectTrackPoint(f.read(), segment, .5);
  assert.ok(logical, `Renderer must project segment ${segment}`);
  assert.equal(hitSegment(logical.x, logical.y, f.read()), segment, 'Fixture targets a visible rendered track segment');
  const r = f.el('park').getBoundingClientRect();
  return { x: r.left + logical.x * r.width / VIEW.width, y: r.top + logical.y * r.height / VIEW.height };
}
function tap(f, segment) {
  const { x, y } = pointerPoint(f, segment);
  f.pointer('pointerdown', x, y); f.pointer('pointerup', x, y);
}
function startTest(f) {
  checkedClick(f, 'test-ride'); assert.equal(f.read().state, 'testing');
  f.frame();
}
function completeTest(f) {
  startTest(f);
  const result = until(f, view => view.state !== 'testing', 'finish its empty test ride');
  assert.equal(result.state, 'design'); assert.ok(result.report);
  return result.report;
}
function startOperating(f) {
  checkedClick(f, 'open-park'); assert.equal(f.read().state, 'operating');
  f.frame();
}
function configurePlan(f, levelIndex = f.read().levelIndex) {
  const plan = pilot.COASTER_PLANS[levelIndex];
  assert.equal(plan.length, 12, 'Public pilot specifies exactly twelve module choices');
  for (let segment = 0; segment < plan.length; segment++) {
    if (f.read().modules[segment] === plan[segment]) continue;
    select(f, segment); install(f, plan[segment]);
    assert.equal(f.read().modules[segment], plan[segment]);
  }
  assert.deepEqual(f.read().modules, plan);
}
function independentDesign(levelIndex) {
  const state = engine.createGame(levelIndex);
  for (const [segment, module] of pilot.COASTER_PLANS[levelIndex].entries()) {
    if (state.modules[segment] === module) continue;
    assert.equal(engine.command(state, { type: 'module', segment, module }).ok, true);
  }
  return state;
}
function assertReportDisplayed(f, report) {
  assert.equal(f.el('thrill').textContent, report.thrill.toFixed(1));
  assert.equal(f.el('comfort').textContent, report.comfort.toFixed(1));
  assert.ok(f.el('max-speed').textContent.includes(report.maxSpeed.toFixed(1)));
  assert.ok(f.el('report-summary').textContent.length > 10);
  assert.ok(f.el('diagnosis-list').children.length > 0);
}

await test('canvas selection follows the actual full-canvas projection after narrow and wide resize', f => {
  const initial = f.read();
  tap(f, 3); assert.equal(selected(f), 3);
  assert.deepEqual(f.read().modules, initial.modules); assert.equal(f.read().cash, initial.cash);
  f.el('park').rect = { left: 70, top: 90, width: 360, height: 600 };
  f.window.emit('resize'); tap(f, 6); assert.equal(selected(f), 6);
  f.pointer('pointerdown', 60, 80); f.pointer('pointerup', 60, 80);
  assert.equal(selected(f), 6, 'Coordinates outside the canvas are not a track hit region');
  f.el('park').rect = { left: 10, top: 20, width: 960, height: 300 };
  f.window.emit('resize'); tap(f, 9); assert.equal(selected(f), 9);
});

await test('pointer cancellation, lost capture, drags, secondary buttons and multitouch never activate', f => {
  const initial = selected(f), target = 6, { x, y } = pointerPoint(f, target);
  for (const ending of ['pointercancel', 'lostpointercapture', 'pointerleave']) {
    f.pointer('pointerdown', x, y); f.pointer(ending, x, y); f.pointer('pointerup', x, y);
    assert.equal(selected(f), initial, `${ending} cancels selection`);
  }
  f.pointer('pointerdown', x, y); f.pointer('pointermove', x + 40, y); f.pointer('pointermove', x, y); f.pointer('pointerup', x, y);
  assert.equal(selected(f), initial, 'A drag returning to its start stays canceled');
  f.pointer('pointerdown', x, y, { button: 2 }); f.pointer('pointerup', x, y, { button: 2 });
  assert.equal(selected(f), initial, 'Secondary mouse buttons do not select');
  f.pointer('pointerdown', x, y); f.pointer('pointerdown', x, y, { pointerId: 99, isPrimary: false }); f.pointer('pointerup', x, y);
  assert.equal(selected(f), initial, 'A second active contact invalidates the first tap');
  f.pointer('pointerdown', x, y); f.click('help'); f.click('help-close'); f.pointer('pointerup', x, y);
  assert.equal(selected(f), initial, 'Opening a modal invalidates stale contacts');
});

await test('mismatched pointer endings cannot finish or cancel the existing primary contact', f => {
  const initial = selected(f), target = 6, { x, y } = pointerPoint(f, target);
  for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave']) {
    f.pointer('pointerdown', x, y);
    f.pointer(ending, x, y, { pointerId: 99, isPrimary: false });
    assert.equal(selected(f), initial, `Unrelated ${ending} cannot select`);
    f.pointer('pointerup', x, y);
    assert.equal(selected(f), target, `Unrelated ${ending} preserves the primary contact`);
    select(f, initial);
  }
});

await test('module costs, refunds, same-module repeats and budget denial use real button handlers', f => {
  const initial = f.read(); select(f, 0); install(f, 'lift');
  assert.equal(f.read().cost, initial.cost + engine.MODULES.lift.cost);
  assert.equal(f.read().cash, initial.cash - engine.MODULES.lift.cost);
  const paid = f.read().cash; f.el('module-lift').click(); f.el('module-lift').click();
  assert.equal(f.read().cash, paid, 'Repeated installation cannot charge for an already installed module');
  select(f, 5); install(f, 'bank'); select(f, 2);
  const beforeDenied = f.read();
  f.el('module-drive').click();
  assert.deepEqual(f.read(), beforeDenied, 'An unaffordable module cannot be purchased');
  select(f, 0); install(f, 'rail');
  assert.equal(f.read().cash, initial.cash - engine.MODULES.bank.cost, 'Replacement refunds the displaced module exactly');
  assert.equal(f.read().cost + f.read().cash, f.read().level.budget);
  assert.equal(f.read().runs, 0); assert.equal(f.read().revenue, 0); assert.equal(f.read().reputation, 0);
});

await test('unsafe empty test publishes the exact physics report and can recover by actual redesign controls', f => {
  const unsafe = engine.inspectDesign(engine.createGame(0));
  assert.equal(unsafe.safe, false);
  const report = completeTest(f);
  assert.deepEqual(report, unsafe, 'Displayed data is the exact engine report, including every speed, force and failure');
  assertReportDisplayed(f, report);
  assert.equal(f.read().runs, 0); assert.equal(f.read().revenue, 0); assert.equal(f.read().reputation, 0);
  const state = f.read(); f.click('open-park'); assert.deepEqual(f.read(), state, 'Unsafe trial cannot board passengers');
  assert.equal(f.writes.filter(write => write.key === PROGRESS_KEY).length, 0);
  configurePlan(f); assert.equal(f.read().report, null, 'Any track edit invalidates the unsafe report');
  const certified = completeTest(f);
  assert.deepEqual(certified, engine.inspectDesign(independentDesign(0)));
  assert.equal(certified.safe, true); assert.equal(certified.approved, true);
  assertReportDisplayed(f, certified);
  const earnings = f.read(); startOperating(f);
  assert.equal(f.read().revenue, earnings.revenue, 'Boarding is not settlement');
  until(f, view => view.runs >= 1, 'safely return its first passenger loop');
  assert.equal(f.read().runs, 1);
  assert.equal(f.read().revenue, certified.rideRevenue);
  assert.equal(f.read().reputation, certified.rideReputation);
  assert.equal(f.read().visitors, certified.riders);
  f.click('redesign'); assert.equal(f.read().state, 'design');
  assert.equal(f.read().runs, 1); assert.equal(f.read().revenue, certified.rideRevenue);
  frozen(f);
});

await test('editing a certified design removes approval until a new exact trial finishes', f => {
  configurePlan(f); const report = completeTest(f);
  select(f, 0); install(f, 'rail');
  assert.equal(f.read().report, null);
  assert.equal(f.el('thrill').textContent, '—');
  const edited = f.read(); f.click('open-park'); assert.deepEqual(f.read(), edited);
  install(f, 'lift'); assert.equal(f.read().report, null);
  assert.deepEqual(completeTest(f), report);
});

await test('native Enter/Space repeat guards protect module costs and retain live button focus', f => {
  select(f, 0);
  for (const [key, module] of [['Enter', 'lift'], [' ', 'rail']]) {
    const button = f.el(`module-${module}`); button.focus();
    const before = f.read(), oldModule = before.modules[0];
    assert.equal(f.key(key).defaultPrevented, false, 'First key is left to native button activation');
    // Reproduce only browser default activation: Enter on keydown, Space on keyup.
    // No controller handler or engine command is reimplemented in this fixture.
    if (key === 'Enter') button.click();
    assert.equal(f.key(key, { repeat: true }).defaultPrevented, true, 'Held activation cannot purchase again');
    assert.equal(f.key(key).defaultPrevented, true, 'Missing repeat flag does not bypass the held-key guard');
    const released = f.keyup(key);
    if (key === ' ' && !released.defaultPrevented) button.click();
    assert.equal(f.read().modules[0], module);
    assert.equal(f.read().cash, before.cash + engine.MODULES[oldModule].cost - engine.MODULES[module].cost);
    assert.equal(f.document.activeElement, button, 'Stable module buttons retain focus');
    assert.ok(button.isConnected);
  }
  assert.equal(savedCommands(f).filter(command => command.type === 'module').length, 2);
});

await test('repeated test/open controls do not duplicate rides or settle passengers early', f => {
  configurePlan(f); startTest(f);
  const started = f.read(); f.click('test-ride'); f.click('test-ride'); f.click('open-park');
  assert.deepEqual(f.read(), started);
  until(f, view => view.state === 'design', 'finish trial');
  const report = f.read().report; assert.equal(report.safe, true);
  startOperating(f); const opened = f.read();
  f.click('open-park'); f.click('open-park'); f.click('test-ride');
  assert.deepEqual(f.read(), opened);
  assert.equal(savedCommands(f).filter(command => command.type === 'test').length, 1);
  assert.equal(savedCommands(f).filter(command => command.type === 'open').length, 1);
  assert.equal(f.read().runs, 0); assert.equal(f.read().revenue, 0);
});

await test('pause freezes the train and resume discards background wall time', f => {
  configurePlan(f); startTest(f); f.frames(12);
  assert.ok(f.read().tick > 0);
  f.click('pause'); assert.equal(f.read().state, 'paused');
  const tick = f.read().tick; frozen(f);
  f.click('primary-action'); assert.equal(f.read().state, 'testing');
  f.frame(120000); assert.equal(f.read().tick, tick, 'Resume starts a fresh animation baseline');
  f.frames(6); assert.ok(f.read().tick > tick);
  f.click('redesign'); assert.equal(f.read().state, 'design');
  assert.equal(f.read().runs, 0); assert.equal(f.read().revenue, 0);
  frozen(f);
});

for (const source of ['blur', 'visibilitychange']) {
  await test(`help → ${source} → close stays paused until explicit resume`, f => {
    configurePlan(f); completeTest(f); startOperating(f); f.frames(10);
    f.click('help'); assert.equal(f.el('help-dialog').open, true); assert.equal(f.read().state, 'paused');
    const before = f.read();
    if (source === 'blur') f.window.emit('blur'); else f.hide();
    f.click('primary-action'); assert.equal(f.read().state, 'paused', 'An open modal blocks resume');
    f.click('help-close'); assert.equal(f.el('help-dialog').open, false);
    if (source === 'blur') f.window.emit('focus'); else f.hide(false);
    assert.equal(f.read().state, 'paused'); assert.equal(f.read().tick, before.tick);
    assert.equal(f.read().runs, before.runs); assert.equal(f.read().revenue, before.revenue);
    frozen(f); f.click('primary-action'); f.frame();
    assert.equal(f.read().state, 'operating'); f.frames(6); assert.ok(f.read().tick > before.tick);
  });
}

await test('shortcut keys prevent scrolling, ignore repeat/modifiers/editables and preserve modal pause', f => {
  configurePlan(f); f.document.body.focus();
  assert.equal(f.key('t').defaultPrevented, true); assert.equal(f.read().state, 'testing'); f.keyup('t'); f.frame();
  assert.equal(f.key('p').defaultPrevented, true); assert.equal(f.read().state, 'paused');
  f.key('p', { repeat: true }); f.key('p'); assert.equal(f.read().state, 'paused'); f.keyup('p');
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    assert.equal(f.key('p', { [modifier]: true }).defaultPrevented, false);
    assert.equal(f.read().state, 'paused'); f.keyup('p');
  }
  const input = f.document.createElement('input'); f.document.body.append(input); input.focus();
  assert.equal(f.key('p').defaultPrevented, false); assert.equal(f.read().state, 'paused'); f.keyup('p');
  f.document.body.focus(); f.key('p'); f.keyup('p'); assert.equal(f.read().state, 'testing');
  f.key('h'); f.keyup('h'); assert.equal(f.el('help-dialog').open, true); assert.equal(f.read().state, 'paused');
  assert.equal(f.el('help-dialog').emit('cancel').defaultPrevented, true);
  assert.equal(f.el('help-dialog').open, false); assert.equal(f.read().state, 'paused'); frozen(f);
});

await test('pause and modal transitions invalidate unfinished canvas contacts', f => {
  configurePlan(f); startTest(f); select(f, 0);
  const { x, y } = pointerPoint(f, 6);
  f.pointer('pointerdown', x, y); f.click('pause'); f.click('primary-action'); f.pointer('pointerup', x, y);
  assert.equal(selected(f), 0);
  f.pointer('pointerdown', x, y); f.click('help'); f.click('help-close'); f.click('primary-action'); f.pointer('pointerup', x, y);
  assert.equal(selected(f), 0);
});

let activeTestSaved;
await test('running trial autosave restores paused without advancing or publishing an unfinished report', f => {
  configurePlan(f); startTest(f); f.frames(12);
  assert.equal(f.read().state, 'testing'); assert.equal(f.read().report, null);
  f.window.emit('beforeunload');
  activeTestSaved = Object.fromEntries(f.storage);
  const saved = engine.restore(JSON.parse(activeTestSaved[CURRENT_KEY]).checkpoint);
  assert.equal(saved.state, 'testing'); assert.equal(saved.tick, f.read().tick);
});
await test('an active-trial refresh is an exact paused replay requiring explicit continuation', f => {
  assert.ok(activeTestSaved, 'Actual active UI save is available');
  const expected = engine.restore(JSON.parse(activeTestSaved[CURRENT_KEY]).checkpoint);
  assert.ok(expected); engine.pause(expected);
  const view = engine.snapshot(expected);
  assert.equal(f.read().state, 'paused'); assert.equal(f.read().priorState, 'testing');
  assert.deepEqual(engineView(f.read(), view), view);
  assert.equal(f.read().report, null); assert.equal(f.read().revenue, 0);
  assert.equal(f.el('restore-note').hidden, false); frozen(f);
  f.click('primary-action'); f.frame(120000); assert.equal(f.read().tick, view.tick);
  until(f, snapshot => snapshot.state === 'design', 'finish restored trial');
  assert.equal(f.read().report.safe, true); assert.equal(f.read().runs, 0);
  assert.equal(f.writes.filter(write => write.key === PROGRESS_KEY).length, 0);
}, { saved: activeTestSaved });

let interruptedSaved, interruptedView;
await test('actual UI saves a partly completed passenger loop without awarding unfinished riders', f => {
  configurePlan(f); completeTest(f); startOperating(f);
  until(f, view => view.runs === 1, 'return the first passenger lap'); f.frames(10);
  assert.equal(f.read().state, 'operating');
  assert.equal(f.read().runs, 1); assert.equal(f.read().visitors, f.read().report.riders);
  f.click('pause'); assert.equal(f.read().state, 'paused');
  interruptedView = f.read(); interruptedSaved = Object.fromEntries(f.storage);
  const checkpoint = JSON.parse(interruptedSaved[CURRENT_KEY]).checkpoint;
  assert.ok(checkpoint.history.some(event => event.kind === 'ticks'));
  assert.ok(checkpoint.history.some(event => event.kind === 'command' && event.command.type === 'open'));
  assert.equal(f.writes.filter(write => write.key === PROGRESS_KEY).length, 0);
  frozen(f);
});

await test('refresh restores the actual saved loop paused and exact; explicit resume completes once', f => {
  assert.ok(interruptedView, 'Previous actual UI checkpoint fixture must exist');
  const restored = f.read(); assert.equal(restored.state, 'paused');
  const expected = engine.snapshot(engine.restore(JSON.parse(interruptedSaved[CURRENT_KEY]).checkpoint));
  assert.deepEqual(engineView(restored, expected), expected);
  assert.equal(restored.runs, interruptedView.runs); assert.equal(restored.revenue, interruptedView.revenue);
  assert.equal(f.el('restore-note').hidden, false); assert.equal(restored.wasRestored, true);
  frozen(f);
  f.click('primary-action'); f.frame(120000);
  assert.equal(f.read().tick, restored.tick, 'Refresh/resume never awards offline simulation');
  until(f, view => view.state === 'won', 'complete the remaining operating run');
  assert.equal(f.read().revenue, f.read().runs * f.read().report.rideRevenue);
  assert.equal(f.read().visitors, f.read().runs * f.read().report.riders);
  assert.equal(f.writes.filter(write => write.key === PROGRESS_KEY).length, 1);
  assert.equal(f.storage.has(CURRENT_KEY), false); frozen(f);
  assert.equal(f.writes.filter(write => write.key === PROGRESS_KEY).length, 1);
}, { saved: interruptedSaved });

let firstVictoryRecord, completeCampaignSaved;
await test('all eight public designs win through actual buttons with sequential natural unlocks and exact reports', f => {
  assert.equal(pilot.COASTER_PLANS.length, 8);
  const usedModules = new Set();
  for (let chapter = 0; chapter < pilot.COASTER_PLANS.length; chapter++) {
    assert.equal(f.read().state, 'design'); assert.equal(f.read().levelIndex, chapter);
    assert.equal(f.read().unlocked, chapter);
    configurePlan(f, chapter); pilot.COASTER_PLANS[chapter].forEach(module => usedModules.add(module));
    const reference = independentDesign(chapter), expectedReport = engine.inspectDesign(reference);
    assert.equal(expectedReport.safe, true); assert.equal(expectedReport.approved, true);
    const actualReport = completeTest(f);
    assert.deepEqual(actualReport, expectedReport, `Park ${chapter + 1}: exact engine speed/force/experience report`);
    assertReportDisplayed(f, actualReport);
    startOperating(f);
    until(f, view => view.state !== 'operating', `complete park ${chapter + 1}`);
    const result = f.read(); assert.equal(result.state, 'won', `Actual UI must win park ${chapter + 1}`);
    assert.equal(result.revenue, result.runs * actualReport.rideRevenue);
    assert.equal(result.reputation, result.runs * actualReport.rideReputation);
    assert.equal(result.visitors, result.runs * actualReport.riders);
    assert.equal(result.cost + result.cash, result.level.budget);
    assert.ok(result.runs <= result.level.maxRuns);
    // Independent engine oracle uses public commands and fixed physics ticks.
    // It never supplies or mutates any private controller state.
    assert.equal(engine.command(reference, { type: 'test' }).ok, true);
    for (let i = 0; i < 30000 && reference.state === 'testing'; i++) engine.step(reference, engine.FIXED_DT);
    assert.equal(engine.command(reference, { type: 'open' }).ok, true);
    for (let i = 0; i < 100000 && reference.state === 'operating'; i++) engine.step(reference, engine.FIXED_DT);
    assert.equal(reference.state, 'won');
    const expected = engine.snapshot(reference);
    assert.deepEqual(engineView(result, expected), expected, `Park ${chapter + 1}: actual UI outcome equals independent legal engine play`);
    const progress = JSON.parse(f.storage.get(PROGRESS_KEY));
    assert.equal(progress.unlocked, Math.min(chapter + 1, 7));
    assert.equal(Object.keys(progress.best).length, chapter + 1);
    assert.equal(f.storage.has(CURRENT_KEY), false);
    assert.equal(f.writes.filter(write => write.key === PROGRESS_KEY).length, chapter + 1);
    if (chapter === 0) firstVictoryRecord = progress.best[0];
    const settled = f.read(); f.click('open-park'); f.click('test-ride'); f.click('redesign'); frozen(f);
    assert.deepEqual(f.read(), settled, 'Terminal controls and time cannot settle or award again');
    assert.equal(f.writes.filter(write => write.key === PROGRESS_KEY).length, chapter + 1);
    f.click('chapters');
    assert.equal(f.el('chapter-list').children.filter(button => !button.disabled).length, Math.min(chapter + 2, 8));
    f.click('chapters-close');
    if (chapter < 7) f.click('primary-action');
  }
  assert.ok(usedModules.has('lift') && usedModules.has('brake') && usedModules.has('bank') && usedModules.has('trim') && usedModules.has('drive'), 'Campaign exercises every engineering role');
  completeCampaignSaved = Object.fromEntries(f.storage);
  f.click('primary-action'); assert.equal(f.read().state, 'design'); assert.equal(f.read().levelIndex, 7);
  assert.equal(Object.keys(f.read().best).length, 8, 'Final-park replay preserves all campaign records');
});

await test('safe but weak passenger service genuinely loses, awards nothing, and retries cleanly', f => {
  select(f, 0); install(f, 'lift'); select(f, 1); install(f, 'trim'); select(f, 11); install(f, 'brake');
  const report = completeTest(f); assert.equal(report.safe, true); assert.equal(report.approved, false);
  startOperating(f);
  until(f, view => view.state !== 'operating', 'finish its limited underperforming service');
  assert.equal(f.read().state, 'lost'); assert.equal(f.read().runs, f.read().level.maxRuns);
  assert.equal(f.read().revenue, report.rideRevenue * f.read().runs);
  assert.equal(f.read().reputation, report.rideReputation * f.read().runs);
  assert.equal(f.read().unlocked, 0); assert.equal(f.storage.has(CURRENT_KEY), false);
  assert.equal(f.writes.filter(write => write.key === PROGRESS_KEY).length, 0);
  const terminal = f.read(); f.click('open-park'); f.click('test-ride'); frozen(f); assert.deepEqual(f.read(), terminal);
  f.click('primary-action'); assert.equal(f.read().state, 'design');
  assert.equal(f.read().runs, 0); assert.equal(f.read().revenue, 0); assert.equal(f.read().report, null);
  assert.deepEqual(f.read().modules, engine.createGame(0).modules);
});

await test('retry resets only the current engineering attempt and keeps the naturally earned campaign', f => {
  assert.equal(Object.keys(f.read().best).length, 8); assert.equal(f.read().unlocked, 7);
  select(f, 0); install(f, 'lift'); startTest(f); f.frames(6); f.click('retry');
  assert.equal(f.read().state, 'design'); assert.equal(f.read().tick, 0); assert.equal(f.read().runs, 0);
  assert.equal(f.read().cost, 0); assert.equal(f.read().report, null);
  assert.deepEqual(f.read().modules, engine.createGame(0).modules);
  assert.equal(Object.keys(f.read().best).length, 8); assert.equal(f.read().unlocked, 7);
  assert.equal(f.storage.get(PROGRESS_KEY), completeCampaignSaved[PROGRESS_KEY]);
}, { saved: completeCampaignSaved });

const completedReplay = engine.checkpoint(pilot.runPilot(0).state);
await test('a terminal replay in the current-save slot cannot award a previously completed park again', f => {
  assert.ok(firstVictoryRecord, 'Actual campaign supplied the existing record');
  assert.equal(f.read().state, 'design', 'Current-save restoration accepts only unfinished attempts');
  assert.equal(f.read().discardedResume, true);
  assert.equal(f.storage.get(PROGRESS_KEY), completeCampaignSaved[PROGRESS_KEY]);
  assert.equal(f.writes.filter(write => write.key === PROGRESS_KEY).length, 0);
  assert.deepEqual(f.read().best[0], firstVictoryRecord); frozen(f);
}, { saved: { ...completeCampaignSaved, [CURRENT_KEY]: JSON.stringify({ version: 1, checkpoint: completedReplay }) } });

const damagedProgress = JSON.stringify({ version: 1, unlocked: 'broken', best: { 0: firstVictoryRecord, 2: { runs: -4, revenue: 999, reputation: 999, cost: 0 } } });
const validInterruptedCheckpoint = JSON.parse(interruptedSaved?.[CURRENT_KEY] || '{"checkpoint":null}').checkpoint;
const corruptHistory = validInterruptedCheckpoint ? JSON.parse(JSON.stringify(validInterruptedCheckpoint)) : {};
if (corruptHistory.history) corruptHistory.history.unshift({ kind: 'command', command: { type: 'module', segment: 0, module: 'impossible' } });
for (const [label, current] of [
  ['malformed JSON', '{not valid JSON'],
  ['illegal replay command', JSON.stringify({ version: 1, checkpoint: corruptHistory })],
  ['fabricated victory fields', JSON.stringify({ version: 1, checkpoint: { ...validInterruptedCheckpoint, state: 'won', revenue: 999999 } })],
]) {
  await test(`${label} is rejected without erasing salvageable campaign records`, f => {
    assert.ok(firstVictoryRecord, 'Natural UI campaign must have produced a real record');
    assert.equal(f.read().state, 'design'); assert.equal(f.read().levelIndex, 0);
    assert.equal(f.read().cash, engine.createGame(0).cash);
    assert.equal(f.read().unlocked, 1); assert.deepEqual(f.read().best[0], firstVictoryRecord);
    assert.equal(f.read().best[2], undefined);
    assert.equal(f.el('restore-note').hidden, false);
    assert.notEqual(f.storage.get(CURRENT_KEY), current, 'Invalid current save is discarded or replaced with a valid fresh checkpoint');
    const replacement = f.storage.get(CURRENT_KEY);
    if (replacement) assert.ok(engine.restore(JSON.parse(replacement).checkpoint), 'Any replacement save must replay legally');
    assert.equal(f.storage.get(PROGRESS_KEY), damagedProgress);
    assert.equal(f.writes.filter(write => write.key === PROGRESS_KEY).length, 0);
    f.click('chapters');
    assert.equal(f.el('chapter-list').children.filter(button => !button.disabled).length, 2);
    f.el('chapter-7').click(); assert.equal(f.read().levelIndex, 0);
    f.click('chapters-close');
    configurePlan(f); assert.equal(completeTest(f).safe, true, 'Discarded save must not disable ordinary legal play');
  }, { saved: { [PROGRESS_KEY]: damagedProgress, [CURRENT_KEY]: current } });
}

for (const options of [{ readDenied: true, writeDenied: true }, { writeDenied: true }]) {
  await test(`storage ${options.readDenied ? 'read/write denial' : 'quota/write denial'} stays visible without blocking a legal win`, f => {
    configurePlan(f); completeTest(f); startOperating(f);
    assert.match(f.el('save-note').textContent, /阻止|空间|存储|保存/);
    assert.equal(f.read().storageAvailable, false);
    f.click('pause'); assert.equal(f.read().state, 'paused'); frozen(f);
    f.click('primary-action'); f.frame(); until(f, view => view.state === 'won', 'win despite unavailable storage');
    assert.equal(f.read().unlocked, 1, 'In-session campaign progression remains available');
    assert.equal(f.read().storageAvailable, false); assert.equal(f.writes.length, 0);
    f.click('primary-action'); assert.equal(f.read().levelIndex, 1);
  }, options);
}

console.log(`\n${passed} passed; ${failed} failed. Actual coaster game.mjs handlers, engine, progress and renderer executed with Node-only browser surfaces.`);
console.log('Eight sequential wins above use actual native-control clicks; independent engine references are comparison oracles only.');
console.log('Not browser, visual, layout, accessibility, real-device pointer-capture, or audio verification.');
process.exitCode = failed ? 1 : 0;
