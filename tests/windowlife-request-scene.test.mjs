import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, command, update, checkpoint, restore, snapshot, summary, canCancel, canResume } from '../experiments/windowlife-request/scene.mjs';
import { KEY, readSave, writeSave } from '../experiments/windowlife-request/storage.mjs';
import { LEVELS } from '../preview/windowlife/levels.mjs';

function choose(kind) { const g = createScene(); assert.equal(command(g, 'start').ok, true); assert.equal(command(g, kind).ok, true); return g; }
function finish(g) { for (let i = 0; i < 1000 && g.state === 'playing'; i++) update(g, .1); assert.equal(g.state, 'settled'); return g; }
function until(g, check) { for (let i = 0; i < 1000 && g.state === 'playing' && !check(g); i++) update(g, .1); assert.ok(check(g)); }
function core(g) { return Object.fromEntries(['ticks','time','accumulator','phase','choice','request','art','actors','objects'].map(k => [k, g[k]])); }
function validLocations(g) {
  for (const a of g.actors) {
    assert.ok(!g.grid.walls.some(p => p.x === a.x && p.y === a.y));
    assert.ok(!g.objects.some(p => p.x === a.x && p.y === a.y));
  }
}

test('opening is an authored half-page, offered once and frozen for deliberation', () => {
  const g = createScene(); assert.equal(g.art.note.remaining, 4); assert.equal(g.history.length, 0);
  command(g, 'start'); assert.equal(g.state, 'paused'); assert.equal(g.request.status, 'offered');
  const before = snapshot(g); update(g, 300); assert.deepEqual(g, before); assert.equal(command(g, 'start').ok, false);
  assert.equal(command(g, 'resume').ok, false); command(g, 'alone'); assert.equal(command(g, 'now').ok, false);
});
test('immediate choice physically walks, co-creates, returns and resumes rather than losing the note', () => {
  const g = choose('now'), start = { x: g.actors[0].x, y: g.actors[0].y };
  update(g, .3); assert.notDeepEqual({ x: g.actors[0].x, y: g.actors[0].y }, start); assert.equal(g.art.note.remaining, 4);
  until(g, s => s.phase === 'co-creating'); assert.equal(g.art.note.remaining, 4); assert.equal(g.art.sketch.contributors.includes('a'), false);
  update(g, .1); assert.ok(g.art.sketch.contributors.includes('a')); finish(g);
  assert.equal(summary(g).outcome, 'shared-drawing'); assert.equal(g.art.note.finished, true); assert.equal(g.art.note.location, 'desk');
  assert.deepEqual({ x: g.actors[0].x, y: g.actors[0].y }, start); assert.ok(g.objects.every(o => o.busyBy === null));
});
test('later finishes two separate objects, carries the note and genuinely completes sharing', () => {
  const g = choose('later'); until(g, s => s.phase === 'meeting-later');
  assert.equal(g.art.note.finished, true); assert.equal(g.art.sketch.mode, 'solo'); assert.equal(g.art.note.location, 'carried');
  assert.equal(g.art.share.completed, false); until(g, s => s.phase === 'sharing'); assert.equal(g.art.note.location, 'bench');
  finish(g); assert.equal(summary(g).outcome, 'exchanged'); assert.equal(g.art.share.progress, 6); assert.deepEqual(g.art.sketch.contributors, ['b']);
});
test('alone is a normal complete ending, with no joint lock or moral/relationship metric', () => {
  const g = finish(choose('alone')); assert.equal(summary(g).outcome, 'separate-works'); assert.equal(g.art.sketch.mode, 'solo');
  assert.equal(g.art.note.finished, true); assert.equal(g.art.share.completed, false); assert.equal(g.actors[0].x, 7); assert.equal(g.actors[0].y, 4);
  assert.equal('score' in g, false); assert.equal('relationship' in g, false); assert.equal('needs' in g.actors[0], false);
  assert.equal(command(g, 'close').ok, true); assert.equal(g.state, 'closed'); assert.equal(command(g, 'close').ok, false);
});
test('cancel on the way backtracks from actual coordinates and creates no false contribution', () => {
  const g = choose('now'); update(g, .3); const at = { x: g.actors[0].x, y: g.actors[0].y };
  assert.equal(command(g, 'cancel').ok, true); assert.deepEqual({ x: g.actors[0].x, y: g.actors[0].y }, at);
  assert.equal(g.art.note.remaining, 4); assert.equal(canCancel(g), false); finish(g);
  assert.equal(summary(g).outcome, 'separate-works'); assert.deepEqual(g.art.sketch.contributors, ['b']);
});
test('cancel during drawing retains an actual mark but never labels it fully co-created', () => {
  const g = choose('now'); until(g, s => s.phase === 'co-creating'); update(g, .5); const progress = g.art.sketch.progress;
  command(g, 'pause'); command(g, 'cancel'); assert.equal(g.state, 'paused'); assert.equal(g.art.sketch.progress, progress);
  command(g, 'resume'); finish(g); assert.equal(g.art.sketch.mode, 'mixed'); assert.equal(summary(g).sharedDrawingFinished, false);
  assert.equal(summary(g).outcome, 'kept-mark'); assert.equal(g.art.note.finished, true);
});
test('each artist advances only while drawing; cancelled ink stays frozen through replay and solo completion', () => {
  for (let sharedTicks = 0; sharedTicks < 60; sharedTicks++) {
    const g = choose('now'); until(g, s => s.phase === 'co-creating');
    for (let i = 0; i < sharedTicks; i++) update(g, .1);
    const drawn = sharedTicks / 10;
    assert.deepEqual(g.art.sketch.inkProgress, { a: drawn, b: drawn });
    command(g, 'cancel');
    while (g.state === 'playing') {
      assert.equal(g.art.sketch.inkProgress.a, drawn);
      assert.equal(g.art.sketch.inkProgress.b, g.art.sketch.progress);
      const replayed = restore(checkpoint(g)); assert.ok(replayed);
      assert.deepEqual(replayed.art.sketch, g.art.sketch);
      update(g, .1);
    }
    assert.deepEqual(g.art.sketch.inkProgress, { a: drawn, b: 6 });
  }
  assert.deepEqual(finish(choose('now')).art.sketch.inkProgress, { a: 6, b: 6 });
  for (const choice of ['later', 'alone']) assert.deepEqual(finish(choose(choice)).art.sketch.inkProgress, { a: 0, b: 6 });
});
test('cancel deferred before meeting, during travel, and during sharing releases only this arrangement', () => {
  for (const target of ['separate', 'meeting-later', 'sharing']) {
    const g = choose('later'); until(g, s => s.phase === target); if (target === 'sharing') update(g, .5);
    const shared = g.art.share.progress; assert.equal(command(g, 'cancel').ok, true);
    if (target !== 'separate') assert.equal(g.art.note.location, 'carried');
    finish(g); assert.equal(g.art.share.progress, shared); assert.equal(g.art.share.completed, false);
    assert.equal(g.art.note.location, 'desk'); assert.equal(g.art.sketch.mode, 'solo'); assert.ok(g.objects.every(o => !o.busyBy));
  }
});
test('every tick of all three arrangements restores exact artwork, positions, locks and phase', () => {
  let snapshots = 0;
  for (const choice of ['now', 'later', 'alone']) {
    const g = choose(choice);
    for (let i = 0; i < 1000; i++) {
      const restored = restore(checkpoint(g)); assert.ok(restored); assert.deepEqual(core(restored), core(g));
      assert.equal(restored.state, g.state === 'playing' ? 'paused' : g.state); validLocations(g); snapshots++;
      if (g.state === 'settled') break; update(g, .1);
    }
  }
  assert.ok(snapshots > 300);
});
test('fractional progress freezes through pause/restore and resumes without lost time', () => {
  const g = choose('now'); update(g, .15); command(g, 'pause'); const restored = restore(checkpoint(g));
  assert.ok(restored); assert.deepEqual(core(restored), core(g)); const before = snapshot(restored); update(restored, 10); assert.deepEqual(restored, before);
  command(restored, 'resume'); finish(restored); assert.equal(summary(restored).outcome, 'shared-drawing');
});
test('cancellation snapshots replay without reoffering or inventing completed work', () => {
  for (const choice of ['now','later']) {
    const g = choose(choice); until(g, s => s.phase === (choice === 'now' ? 'co-creating' : 'sharing')); update(g, .4); command(g, 'cancel');
    while (g.state === 'playing') { const restored = restore(checkpoint(g)); assert.ok(restored); assert.deepEqual(core(restored), core(g)); update(g, .1); }
    const restored = restore(checkpoint(g)); assert.equal(restored.request.status, 'cancelled'); assert.equal(command(restored, 'start').ok, false);
  }
});
test('invalid command histories, time jumps and forged completion payloads are rejected or ignored', () => {
  const cp = checkpoint(createScene());
  assert.equal(restore({ ...cp, ticks: 10 }), null);
  assert.equal(restore({ ...cp, commands: [{ tick: 0, type: 'now' }] }), null);
  assert.equal(restore({ ...cp, commands: [{ tick: 0, type: 'start' }, { tick: 0, type: 'start' }] }), null);
  assert.equal(restore({ ...cp, commands: [{ tick: 0, type: 'start', win: true }] }), null);
  assert.equal(restore({ ...cp, accumulator: -1 }), null);
  assert.equal(restore({ ...cp, art: { note: { finished: true } } }).art.note.finished, false);
});
test('the accepted history limit retains a safety pause and every saved limit state restores', () => {
  const g = choose('alone'); update(g, .3);
  for (let i = 0; i < 2047; i++) {
    assert.equal(command(g, 'pause').ok, true);
    assert.equal(command(g, 'resume').ok, true);
  }
  assert.equal(g.history.length, 4096); assert.equal(g.state, 'playing');
  const activeSave = checkpoint(g), recovered = restore(activeSave);
  assert.ok(recovered); assert.equal(recovered.state, 'paused'); assert.deepEqual(core(recovered), core(g));
  assert.equal(recovered.history.length, 4097); assert.equal(canResume(recovered), false);
  assert.equal(command(recovered, 'resume').ok, false);
  assert.ok(restore(checkpoint(recovered)));
  const completed = finish(snapshot(g));
  assert.equal(command(completed, 'close').ok, true);
  assert.equal(restore(checkpoint(completed)).state, 'closed');
  assert.equal(command(g, 'pause').ok, true); assert.ok(restore(checkpoint(g)));
  assert.equal(restore({ ...activeSave, commands: [...activeSave.commands, { tick: g.ticks, type: 'resume' }] }), null);
});
test('candidate storage accesses one new key only; bad saves and read denial remain protected', () => {
  const old = 'original-three-days-untouched', data = new Map([['classic-atlas.windowlife.v1', old]]), reads = [], writes = [];
  const store = { getItem(k) { reads.push(k); return data.get(k) ?? null; }, setItem(k,v) { writes.push(k); data.set(k,v); } };
  let loaded = readSave(store); assert.equal(writeSave(store, finish(choose('later')), loaded.protection), true);
  loaded = readSave(store); assert.equal(summary(loaded.game).outcome, 'exchanged'); assert.equal(data.get('classic-atlas.windowlife.v1'), old);
  assert.ok(reads.every(k => k === KEY)); assert.ok(writes.every(k => k === KEY));
  data.set(KEY, '{bad'); loaded = readSave(store); assert.equal(loaded.protection, 'invalid'); assert.equal(writeSave(store, createScene(), loaded.protection), false); assert.equal(data.get(KEY), '{bad');
  loaded = readSave({ getItem() { throw Error('denied'); } }); assert.equal(loaded.protection, 'unavailable');
});
test('write failure preserves last valid candidate bytes and can safely recover', () => {
  let data = null, denied = false;
  const store = { getItem() { return data; }, setItem(k,v) { if (denied) throw Error('quota'); data = v; } };
  const g = choose('now'); assert.equal(writeSave(store,g,null), true); const old = data; denied = true; update(g,.5);
  assert.equal(writeSave(store,g,null), false); assert.equal(data, old); denied = false; assert.equal(writeSave(store,g,null), true); assert.notEqual(data, old);
});
test('original level data is deep-copied and reset only resets this scene', () => {
  const original = JSON.stringify(LEVELS); const g = finish(choose('now')); g.objects[0].x = 99;
  const fresh = createScene(); assert.equal(fresh.state, 'ready'); assert.equal(fresh.request.offered, false); assert.equal(fresh.art.note.remaining, 4);
  assert.equal(JSON.stringify(LEVELS), original); assert.notEqual(fresh.objects[0].x, 99);
});
