import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as engine from '../../preview/court/engine.mjs';
import * as progress from '../../preview/court/progress.mjs';

// NEW recovery QA. This exercises the actual controller and engine against a
// minimal event/DOM model. It does not claim browser layout, focus, or touch QA.
const source = fs.readFileSync(new URL('../../preview/court/game.mjs', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
const html = fs.readFileSync(new URL('../../preview/court/index.html', import.meta.url), 'utf8');
let checks = 0, failures = 0;
function test(name, fn) {
  try { fn(); checks++; console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
function harness({ storage = null, storageEntries = [], storageGetThrows = false, storageSetThrows = false } = {}) {
  let document, clock = 1000, nextFrame, renders = 0;
  class Element {
    constructor(tag = 'div', id = '') { this.tagName = tag.toUpperCase(); this.id = id; this.listeners = new Map(); this.children = []; this.dataset = {}; this.style = {}; this.attributes = {}; this.hidden = false; this.open = false; this.disabled = false; this.textContent = ''; }
    addEventListener(type, fn) { const list = this.listeners.get(type) || []; list.push(fn); this.listeners.set(type, list); }
    dispatch(event) { for (const fn of this.listeners.get(event.type) || []) fn(event); }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    replaceChildren(...children) { this.children = children; }
    querySelector(tag) { return this.children.find(x => x.tagName === tag.toUpperCase()); }
    set innerHTML(value) { this._html = value; this.children = [...value.matchAll(/<(b|span|small)>/g)].map(m => new Element(m[1])); }
    get innerHTML() { return this._html || ''; }
    focus() { const prior = document.activeElement; if (prior && prior !== this) prior.dispatch(event('blur', prior)); document.activeElement = this; }
    setPointerCapture(id) { this.pointerId = id; }
    getContext() { return {}; }
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  class Button extends Element { constructor(id = '') { super('button', id); } }
  const elements = new Map();
  for (const m of html.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const element = m[1] === 'button' ? new Button(m[2]) : new Element(m[1], m[2]);
    element.hidden = /\bhidden\b/.test(m[0]); elements.set(m[2], element);
  }
  const directions = ['up', 'left', 'down', 'right'].map(dir => { const b = new Button(); b.dataset.dir = dir; return b; });
  const window = new Element('window');
  document = new Element('document');
  Object.assign(document, {
    activeElement: null, hidden: false,
    getElementById: id => elements.get(id),
    createElement: tag => tag === 'button' ? new Button() : new Element(tag),
    querySelectorAll: selector => { assert.equal(selector, '[data-dir],#touch-shoot'); return [...directions, elements.get('touch-shoot')]; }
  });
  const stored = new Map(storageEntries);
  if (storage !== null) stored.set(progress.STORAGE_KEY, storage);
  const writes = [], reads = [], writeAttempts = [];
  const context = { ...engine, ...progress, document, window, HTMLButtonElement: Button,
    localStorage: {
      getItem(key) { reads.push(key); if (storageGetThrows) throw new Error('storage denied'); return stored.get(key) ?? null; },
      setItem(key, value) { writeAttempts.push(key); if (storageSetThrows) throw new Error('storage denied'); stored.set(key, value); writes.push([key, value]); }
    },
    matchMedia: () => ({ matches: false }), requestAnimationFrame: fn => { nextFrame = fn; },
    render: () => { renders++; }
  };
  vm.runInNewContext(source, context, { filename: 'preview/court/game.mjs' });
  function event(type, target, extra = {}) { return { type, target, key: '', repeat: false, ctrlKey: false, metaKey: false, altKey: false, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra }; }
  function dispatch(target, type, extra = {}) { const e = event(type, target, extra); target.dispatch(e); if (target !== window && type.startsWith('key')) window.dispatch(e); return e; }
  function frame(delta = 1000 / 60) { clock += delta; const callback = nextFrame; nextFrame = null; assert.ok(callback); callback(clock); }
  const api = {
    elements, directions, window, document, stored, writes, reads, writeAttempts,
    el: id => elements.get(id), snapshot: () => window.courtSnapshot(),
    click(id) { const el = typeof id === 'string' ? elements.get(id) : id; assert.ok(!el.disabled); el.onclick?.(event('click', el)); },
    key(type, key, target = document.activeElement || window, extra = {}) { return dispatch(target, type, { key, ...extra }); },
    pointer(type, target, pointerId = 1) { return dispatch(typeof target === 'string' ? elements.get(target) : target, type, { pointerId }); },
    dispatch, frame, frames(n) { for (let i = 0; i < n; i++) frame(); },
    play() { api.click('primary'); frame(); }, renders: () => renders
  };
  return api;
}

test('ready screen, eight matches, lock state and detached diagnostics', () => {
  const h = harness(); assert.equal(h.snapshot().state, 'ready'); assert.equal(h.el('matches').children.length, 8);
  assert.equal(h.el('matches').children.filter(x => x.disabled).length, 7); assert.equal(h.el('panel').hidden, false);
  const detached = h.snapshot(); detached.score[0] = 99; assert.equal(h.snapshot().score[0], 0);
});
test('start, keyboard movement and key release run real engine', () => {
  const h = harness(); h.play(); assert.equal(h.snapshot().state, 'playing'); assert.equal(h.document.activeElement, h.el('court'));
  h.key('keydown', 'd'); h.frames(30); assert.ok(h.snapshot().players[0].x > 370);
  h.key('keyup', 'd'); const x = h.snapshot().players[0].x; h.frames(5); assert.equal(h.snapshot().players[0].x, x);
});
test('J hold/release shoots once and repeated keydown is ignored', () => {
  const h = harness(); h.play(); h.key('keydown', 'j'); h.frames(15); h.key('keydown', 'j', h.el('court'), { repeat: true }); h.frames(17);
  assert.ok(h.snapshot().charge > .64); h.key('keyup', 'j'); h.frame(); assert.equal(h.snapshot().stats.shots[0], 1);
});
test('modifier shortcuts do not move a player', () => {
  const h = harness(); h.play(); h.key('keydown', 'd', h.el('court'), { ctrlKey: true }); h.frames(15); assert.equal(h.snapshot().players[0].x, 290);
});
test('K passes and L switches from the actual controller', () => {
  const h = harness(); h.play(); h.key('keydown', 'k'); assert.equal(h.snapshot().stats.passes[0], 1); h.key('keyup', 'k');
  const player = h.snapshot().controlled; h.key('keydown', 'l'); assert.notEqual(h.snapshot().controlled, player);
});
test('pause freezes state, cancels charge, and resumed first frame has zero dt', () => {
  const h = harness(); h.play(); h.key('keydown', 'j'); h.frames(20); h.key('keydown', 'p'); const before = h.snapshot();
  assert.equal(before.state, 'paused'); assert.equal(before.charging, false); h.frames(30); assert.deepEqual(h.snapshot(), before);
  h.click('primary'); const tick = h.snapshot().tick; h.frame(60000); assert.equal(h.snapshot().tick, tick); h.frames(2); assert.equal(h.snapshot().stats.shots[0], 0);
});
test('restart clears held movement and resets ready state', () => {
  const h = harness(); h.play(); h.key('keydown', 'd'); h.frames(20); h.click('restart'); assert.equal(h.snapshot().state, 'ready');
  h.play(); h.frames(5); assert.equal(h.snapshot().players[0].x, 290);
});
test('help pauses and resumes only an active match', () => {
  const h = harness(); h.click('help'); h.click('help-done'); assert.equal(h.snapshot().state, 'ready');
  h.play(); h.click('help'); assert.equal(h.snapshot().state, 'paused'); assert.equal(h.el('help-dialog').open, true);
  h.key('keydown', 'r'); assert.equal(h.snapshot().state, 'paused'); h.click('help-done'); assert.equal(h.snapshot().state, 'playing');
  h.click('pause'); h.click('help'); h.click('help-done'); assert.equal(h.snapshot().state, 'paused');
});
test('repeated help opening preserves resume intent and dialog cancel closes', () => {
  const h = harness(); h.play(); h.click('help'); h.click('help'); const e = h.dispatch(h.el('help-dialog'), 'cancel');
  assert.equal(e.defaultPrevented, true); assert.equal(h.el('help-dialog').open, false); assert.equal(h.snapshot().state, 'playing');
});
test('blur and hidden-tab transitions do not auto-resume through help', () => {
  for (const kind of ['blur', 'hidden']) {
    const h = harness(); h.play(); h.click('help');
    if (kind === 'blur') h.dispatch(h.window, 'blur'); else { h.document.hidden = true; h.dispatch(h.document, 'visibilitychange'); }
    h.click('help-done'); assert.equal(h.snapshot().state, 'paused', kind);
  }
});
test('window blur clears keyboard, pointer and button holds', () => {
  const h = harness(); h.play(); h.key('keydown', 'd'); h.pointer('pointerdown', 'touch-shoot'); h.frames(15); h.dispatch(h.window, 'blur');
  assert.equal(h.snapshot().state, 'paused'); h.click('primary'); h.frames(3); assert.equal(h.snapshot().stats.shots[0], 0); assert.equal(h.snapshot().players[0].vx, 0);
});
test('simultaneous pointer movement and charge release are independent', () => {
  const h = harness(); h.play(); const right = h.directions.find(x => x.dataset.dir === 'right');
  h.pointer('pointerdown', right, 1); h.pointer('pointerdown', 'touch-shoot', 2); h.frames(32);
  assert.ok(h.snapshot().players[0].x > 320); assert.ok(h.snapshot().charging); h.pointer('pointerup', 'touch-shoot', 2); h.frame();
  assert.equal(h.snapshot().stats.shots[0], 1); assert.ok(h.snapshot().players[0].vx > 0); h.pointer('pointerup', right, 1); h.frame(); assert.equal(h.snapshot().players[0].vx, 0);
});
test('pointercancel cancels a charge without releasing a shot', () => {
  const h = harness(); h.play(); h.pointer('pointerdown', 'touch-shoot', 1); h.frames(22); h.pointer('pointercancel', 'touch-shoot', 1); h.frames(2);
  assert.equal(h.snapshot().stats.shots[0], 0); assert.equal(h.snapshot().charging, false); assert.equal(h.snapshot().charge, 0);
});
test('lost pointer capture cancels a charge without releasing a shot', () => {
  const h = harness(); h.play(); h.pointer('pointerdown', 'touch-shoot', 1); h.frames(22); h.pointer('lostpointercapture', 'touch-shoot', 1); h.frames(2);
  assert.equal(h.snapshot().stats.shots[0], 0); assert.equal(h.snapshot().charging, false);
});
test('normal pointerup followed by lost capture still releases one shot', () => {
  const h = harness(); h.play(); h.pointer('pointerdown', 'touch-shoot', 1); h.frames(32); h.pointer('pointerup', 'touch-shoot', 1); h.pointer('lostpointercapture', 'touch-shoot', 1); h.frame();
  assert.equal(h.snapshot().stats.shots[0], 1);
});
test('one cancelled pointer does not cancel another held shot control', () => {
  const h = harness(); h.play(); h.key('keydown', 'j'); h.pointer('pointerdown', 'touch-shoot', 1); h.frames(20); h.pointer('pointercancel', 'touch-shoot', 1); h.frames(12);
  assert.equal(h.snapshot().stats.shots[0], 0); assert.ok(h.snapshot().charging); h.key('keyup', 'j'); h.frame(); assert.equal(h.snapshot().stats.shots[0], 1);
});
test('Space and Enter activate focused direction and shot buttons as holds', () => {
  for (const key of [' ', 'Enter']) {
    const h = harness(); h.play(); const right = h.directions.find(x => x.dataset.dir === 'right'); right.focus();
    assert.ok(h.key('keydown', key, right).defaultPrevented); h.frames(20); h.key('keyup', key, right); h.frame(); assert.ok(h.snapshot().players[0].x > 340); assert.equal(h.snapshot().players[0].vx, 0);
    h.el('touch-shoot').focus(); h.key('keydown', key, h.el('touch-shoot')); h.frames(32); h.key('keyup', key, h.el('touch-shoot')); h.frame(); assert.equal(h.snapshot().stats.shots[0], 1);
  }
});
test('blurring a keyboard-held shot button cancels rather than shoots', () => {
  const h = harness(); h.play(); h.el('touch-shoot').focus(); h.key('keydown', 'Enter', h.el('touch-shoot')); h.frames(20); h.el('court').focus(); h.frames(2);
  assert.equal(h.snapshot().stats.shots[0], 0); assert.equal(h.snapshot().charging, false);
});
test('rerendering the match list restores focused match selection', () => {
  const h = harness({ storage: '{"unlocked":3,"best":{},"sound":false}' }); const before = h.el('matches').children[2]; before.focus(); h.click(before);
  assert.equal(h.snapshot().levelIndex, 2); assert.equal(h.document.activeElement, h.el('matches').children[2]); assert.notEqual(h.document.activeElement, before);
});
test('all eight saved matches select and restart with original duration', () => {
  const h = harness({ storage: '{"unlocked":7,"best":{"7":3},"sound":true}' });
  for (let i = 0; i < 8; i++) { h.click(h.el('matches').children[i]); assert.equal(h.snapshot().levelIndex, i); assert.equal(h.snapshot().time, engine.LEVELS[i].duration); assert.equal(h.snapshot().state, 'ready'); }
  assert.equal(h.el('sound').attributes['aria-pressed'], 'true');
});
test('bad or unavailable storage falls back and exposes the read failure', () => {
  const bad = harness({ storage: 'not json' }); assert.equal(bad.el('matches').children.filter(x => !x.disabled).length, 1);
  const denied = harness({ storageGetThrows: true }); assert.equal(denied.el('storage-note').hidden, false); denied.play(); assert.equal(denied.snapshot().state, 'playing');
});
test('sound preference serializes and write failure does not stop play', () => {
  const h = harness(); h.click('sound'); assert.equal(JSON.parse(h.stored.get(progress.STORAGE_KEY)).sound, true); assert.equal(h.writes.length, 1);
  const denied = harness({ storageSetThrows: true }); denied.click('sound'); assert.equal(denied.el('storage-note').hidden, false); denied.play(); assert.equal(denied.snapshot().state, 'playing');
});
test('full eight-match controller campaign unlocks, saves, advances and reloads', () => {
  const h = harness();
  for (let level = 0; level < 8; level++) {
    assert.equal(h.el('matches').children[level].disabled, false); h.play();
    const held = new Set(); let ticks = 0;
    while (h.snapshot().state === 'playing' && ticks++ < 60 * 300) {
      const s = h.snapshot(), p = s.players[s.controlled], b = s.ball;
      let tx = p.x, ty = p.y, shoot = false;
      if (b.owner === p.id) {
        const info = engine.shootingInfo(s); tx = 875; ty = p.y < 280 ? 160 : 400;
        if (s.charging) shoot = s.charge < .65;
        else if ((info.distance < 200 && info.chance > .42 && p.hold > .3) || s.shotClock < 3) shoot = true;
        else if (info.contest > .65 && p.hold > 1) { h.key('keydown', 'k'); h.key('keyup', 'k'); }
      } else if (b.mode === 'loose') { tx = b.x; ty = b.y; }
      else if (b.owner !== null && s.players[b.owner].team === 1) {
        const owner = s.players[b.owner]; tx = owner.x - 25; ty = owner.y;
        if (Math.hypot(p.x - owner.x, p.y - owner.y) < 60) { h.key('keydown', 'k'); h.key('keyup', 'k'); }
      } else { tx = 780; ty = 400; }
      const wanted = new Set(); const x = Math.abs(tx-p.x)<5 ? 0 : Math.sign(tx-p.x), y = Math.abs(ty-p.y)<5 ? 0 : Math.sign(ty-p.y);
      if (x) wanted.add(x > 0 ? 'd' : 'a'); if (y) wanted.add(y > 0 ? 's' : 'w'); if (shoot) wanted.add('j');
      for (const key of held) if (!wanted.has(key)) h.key('keyup', key);
      for (const key of wanted) if (!held.has(key)) h.key('keydown', key);
      held.clear(); for (const key of wanted) held.add(key); h.frame();
    }
    const final = h.snapshot(); assert.equal(final.state, 'won', `match ${level+1}`);
    const saved = JSON.parse(h.stored.get(progress.STORAGE_KEY)); assert.equal(saved.unlocked, Math.min(7, level+1)); assert.ok(saved.best[level] > 0);
    assert.equal(h.el('panel').hidden, false); assert.equal(h.writes.length, level+1);
    console.log(`  controller match ${level+1}: ${final.score.join('-')}, ${ticks} ticks, saved unlock ${saved.unlocked+1}`);
  }
  const raw = h.stored.get(progress.STORAGE_KEY); h.click('primary'); assert.equal(h.snapshot().levelIndex, 7); assert.equal(h.snapshot().state, 'playing');
  const reload = harness({ storage: raw }); assert.equal(reload.snapshot().state, 'ready'); assert.equal(reload.snapshot().levelIndex, 0);
  assert.ok(reload.el('matches').children.every(x => !x.disabled)); assert.equal(Object.keys(JSON.parse(raw).best).length, 8);
});
test('idle loss does not save a win and retry starts a clean match', () => {
  const h = harness(); h.play(); let ticks = 0;
  while (h.snapshot().state === 'playing' && ticks++ < 60 * 300) h.frame();
  assert.equal(h.snapshot().state, 'lost'); assert.equal(h.writes.length, 0); assert.equal(h.el('matches').children[1].disabled, true);
  h.click('primary'); assert.equal(h.snapshot().state, 'playing'); assert.deepEqual(h.snapshot().score, [0, 0]); assert.equal(h.snapshot().time, 75);
});
test('preview ignores production saves and writes only its own key', () => {
  const untouched = [['atlas-court-v1', '{"unlocked":7,"best":{"7":10},"sound":true}'], ['atlas-unrelated-sentinel', 'keep exactly']];
  const h = harness({ storageEntries: untouched });
  assert.deepEqual(h.reads, ['atlas-preview-court-20261018-v1']); assert.equal(h.el('matches').children.filter(x => !x.disabled).length, 1);
  assert.equal(h.el('sound').attributes['aria-pressed'], 'false'); h.click('sound');
  assert.deepEqual(h.writeAttempts, ['atlas-preview-court-20261018-v1']);
  for (const [key, value] of untouched) assert.equal(h.stored.get(key), value);
  assert.equal(JSON.parse(h.stored.get(progress.STORAGE_KEY)).sound, true);
});
test('preview reload uses preview progress without migrating production data', () => {
  const production = '{"unlocked":7,"best":{"7":10},"sound":false}';
  const preview = '{"unlocked":3,"best":{"0":6},"sound":true}';
  const entries = [['atlas-court-v1', production], [progress.STORAGE_KEY, preview]];
  const h = harness({ storageEntries: entries });
  assert.equal(h.el('matches').children.filter(x => !x.disabled).length, 4); assert.equal(h.el('sound').attributes['aria-pressed'], 'true');
  h.play(); h.frames(10); const reload = harness({ storageEntries: [...h.stored] });
  assert.equal(reload.snapshot().state, 'ready'); assert.equal(reload.snapshot().tick, 0);
  assert.equal(reload.stored.get('atlas-court-v1'), production); assert.equal(reload.stored.get(progress.STORAGE_KEY), preview);
});
test('unavailable preview storage does not fall back to a production key', () => {
  const production = '{"unlocked":7,"best":{},"sound":true}';
  const h = harness({ storageEntries: [['atlas-court-v1', production]], storageGetThrows: true, storageSetThrows: true });
  h.click('sound'); h.play(); assert.equal(h.snapshot().state, 'playing'); assert.equal(h.el('storage-note').hidden, false);
  assert.deepEqual(h.reads, [progress.STORAGE_KEY]); assert.deepEqual(h.writeAttempts, [progress.STORAGE_KEY]); assert.equal(h.stored.get('atlas-court-v1'), production);
});
console.log(`\n${checks} controller model checks passed; ${failures} failed. Real browser/native input/layout acceptance remains pending.`);
if (failures) process.exitCode = 1;
