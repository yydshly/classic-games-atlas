import assert from 'node:assert/strict';
import { createGame, start, pause, resume, retry, step, command, canCommand, snapshot, checkpoint, restore, LEVELS, SLOTS, COSTS, FIXED_DT } from '../../preview/repair/engine.mjs';
import { prepareRepair, pilotRepair } from './repair_pilot.mjs';

// Deterministic, ordinary-input simulation tests. This is not a browser, pointer,
// keyboard, touch or visual acceptance report; those require the actual UI.
let checks = 0;
function test(name, run) { run(); checks++; console.log(`PASS ${name}`); }
function ticks(s, n, pilot = false) { for (let i = 0; i < n && s.state === 'playing'; i++) { if (pilot) pilotRepair(s); step(s, FIXED_DT); } }
function until(s, condition, limit = 2500, pilot = false) { for (let n = 0; n < limit && s.state === 'playing' && !condition(s); n++) { if (pilot) pilotRepair(s); step(s, FIXED_DT); } assert.ok(condition(s), `Condition not reached: ${s.state}, ${s.elapsed}`); }
function invariant(s, previous = null) {
  assert.ok(Number.isInteger(s.credits) && s.credits >= 0);
  assert.ok(Number.isFinite(s.time) && s.time >= 0 && s.time <= s.level.duration);
  assert.equal(s.elapsed, s.tick * FIXED_DT);
  assert.equal(s.credits, s.level.credits + s.earnings - s.spent - s.wagesPaid);
  assert.equal(s.earnings, s.robots.reduce((sum, r) => sum + r.receipt, 0));
  assert.equal(s.completed, s.robots.filter(r => r.receipt > 0).length);
  assert.ok(s.lost >= 0 && Number.isInteger(s.lost));
  assert.ok(s.completed >= 0 && Number.isInteger(s.completed));
  assert.equal(new Set(s.stations.map(st => st.slot)).size, s.stations.length);
  assert.equal(new Set(s.staff.map(w => w.id)).size, s.staff.length);
  const assigned = s.stations.map(st => st.workerId).filter(Boolean);
  assert.equal(assigned.length, new Set(assigned).size);
  const occupying = [];
  for (const st of s.stations) {
    assert.ok(st.queue.length + (st.robotId ? 1 : 0) <= st.capacity);
    assert.equal(st.queue.length, new Set(st.queue).size);
    assert.ok(Number.isFinite(st.progress) && st.progress >= 0);
    assert.ok(st.level >= 1 && st.level <= 3);
    if (st.workerId) assert.equal(s.staff.find(w => w.id === st.workerId).stationId, st.id);
    const targets = st.queue.map(id => {
      const r = s.robots.find(r => r.id === id); assert.equal(r.stationId, st.id);
      assert.ok(r.queueTarget); return `${r.queueTarget.x},${r.queueTarget.y}`;
    });
    assert.equal(targets.length, new Set(targets).size, 'Distinct queue reservation targets');
    occupying.push(...st.queue, ...(st.robotId ? [st.robotId] : []));
    if (st.robotId) assert.equal(s.robots.find(r => r.id === st.robotId).stationId, st.id);
  }
  assert.equal(occupying.length, new Set(occupying).size, 'No visitor belongs to two stations');
  for (const e of [...s.robots, ...s.staff]) {
    assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y));
    assert.ok(e.x >= 30 && e.x <= 970 && e.y >= 190 && e.y <= 520);
    assert.ok(Array.isArray(e.path) && e.path.length <= 3);
    for (const p of e.path) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 30 && p.x <= 970 && p.y >= 190 && p.y <= 520);
    if (e.patience !== undefined) assert.ok(Number.isFinite(e.patience) && e.patience >= 0 && e.patience <= e.maxPatience);
    const old = previous && [...previous.robots, ...previous.staff].find(p => p.id === e.id);
    if (old) assert.ok(Math.hypot(e.x - old.x, e.y - old.y) <= 100 * FIXED_DT + 1e-7, `${e.id} teleported`);
  }
}
function comparable(s) { const copy = JSON.parse(JSON.stringify(s)); delete copy.state; delete copy.accumulator; return copy; }

const reports = [];
test('eight distinct authored shifts, bounded times and documented tutorial exception', () => {
  assert.equal(LEVELS.length, 8); assert.equal(SLOTS.length, 6);
  for (const level of LEVELS) {
    assert.ok(level.duration >= 75 && level.duration <= 120);
    assert.ok(level.goal > 0 && level.goal <= level.arrivals.length);
    assert.ok(level.arrivals.every((v, i) => !i || v.at >= level.arrivals[i - 1].at));
    assert.ok(level.briefing && level.tip);
  }
  assert.ok(LEVELS[0].tip.includes('练习'));
  assert.ok(Object.isFrozen(LEVELS) && Object.isFrozen(LEVELS[0].arrivals));
});
for (let index = 0; index < LEVELS.length; index++) test(`day ${index + 1}: legal button-equivalent strategy wins, finite paths and budgets every tick`, () => {
  const s = createGame(index); assert.ok(prepareRepair(s).every(r => r.ok)); start(s);
  let maxQueue = 0;
  for (let n = 0; n < 2600 && s.state === 'playing'; n++) {
    assert.ok(pilotRepair(s).every(r => r.ok)); const before = snapshot(s); step(s, FIXED_DT); invariant(s, before);
    maxQueue = Math.max(maxQueue, ...s.stations.map(st => st.queue.length));
  }
  assert.equal(s.state, 'won', s.reason); assert.ok(s.completed >= s.goal); assert.ok(s.lost < s.maxLost);
  assert.ok(s.robots.some(r => r.receipt > 0)); assert.ok(s.robots.some(r => r.status === 'gone'));
  reports.push({ day: index + 1, completed: s.completed, lost: s.lost, credits: s.credits, seconds: Number(s.elapsed.toFixed(2)), commands: s.commandLog.length, maxQueue });
  const finished = JSON.stringify(s);
  for (let k = 0; k < 100; k++) { step(s, 1); start(s); pause(s); resume(s); assert.equal(command(s, { type: 'hire' }).ok, false); }
  assert.equal(JSON.stringify(s), finished, 'Terminal states must be absorbing');
});
for (let index = 0; index < LEVELS.length; index++) test(`day ${index + 1}: idle outcome is ${index ? 'loss' : 'tutorial win'}`, () => {
  const s = start(createGame(index)); ticks(s, 2600); assert.equal(s.state, index ? 'lost' : 'won');
});
test('ready planning, paused planning, duplicate purchase and invalid input are atomic', () => {
  const s = createGame(1);
  assert.equal(command(s, { type: 'build', slot: 'B', stationType: 'electrical' }).ok, true);
  const before = JSON.stringify(s);
  for (const cmd of [null, {}, { type: 'win' }, { type: 'hire', credits: 999 }, { type: 'build', slot: 'B', stationType: 'mechanical' }, { type: 'build', slot: 'A', stationType: 'payment' }, { type: 'assign', staffId: 'host', stationId: 'station-B' }, { type: 'assign', staffId: 't1', stationId: 'station-D' }, { type: 'upgrade', stationId: 'station-payment' }, { type: 'maintain', stationId: 'station-A' }]) {
    assert.equal(command(s, cmd).ok, false); assert.equal(JSON.stringify(s), before);
  }
  start(s); pause(s); assert.equal(command(s, { type: 'hire' }).ok, true);
  assert.equal(command(s, { type: 'assign', staffId: 't3', stationId: 'station-B' }).ok, true);
  assert.equal(s.credits, 40); assert.equal(s.staff.find(w => w.id === 't3').x, 100);
  assert.equal(canCommand(s, { type: 'upgrade', stationId: 'station-B' }).ok, false);
});
test('pause freezes live time, queues, walking, service, arrivals, wages and cash', () => {
  const s = start(createGame(4)); ticks(s, 300); pause(s); const paused = JSON.stringify(s);
  for (const dt of [FIXED_DT, .1, 1, 1000, Infinity, NaN, -1]) step(s, dt);
  assert.equal(JSON.stringify(s), paused); resume(s); step(s, FIXED_DT); assert.equal(s.tick, 301);
});
test('active service freezes patience; reassignment visibly walks and interrupted service loses patience', () => {
  const s = start(createGame(0));
  until(s, s => s.stations.find(st => st.slot === 'D').progress > .5);
  const st = s.stations.find(st => st.slot === 'D'), robot = s.robots.find(r => r.id === st.robotId), patience = robot.patience;
  ticks(s, 5); assert.equal(robot.patience, patience);
  assert.equal(command(s, { type: 'build', slot: 'E', stationType: 'mechanical' }).ok, true);
  const tech = s.staff.find(w => w.id === 't2'), position = { x: tech.x, y: tech.y };
  assert.equal(command(s, { type: 'assign', staffId: 't2', stationId: 'station-E' }).ok, true);
  assert.deepEqual({ x: tech.x, y: tech.y }, position);
  const progress = st.progress; ticks(s, 10);
  assert.equal(st.progress, progress); assert.equal(robot.status, 'blocked'); assert.ok(robot.patience < patience);
  assert.ok(tech.path.length && Math.hypot(tech.x - position.x, tech.y - position.y) > 0);
});
test('scheduled fault and maintenance stop service, preserve progress, drain patience and cost once', () => {
  const s = start(createGame(2)); until(s, s => s.stations.find(st => st.slot === 'D').broken);
  const st = s.stations.find(st => st.slot === 'D'), r = s.robots.find(r => r.id === st.robotId);
  assert.ok(r, 'Authored fault interrupts an occupied work bay');
  const progress = st.progress, patience = r.patience; ticks(s, 10);
  assert.equal(st.progress, progress); assert.equal(r.status, 'blocked'); assert.ok(r.patience < patience);
  const cash = s.credits; assert.equal(command(s, { type: 'maintain', stationId: st.id }).ok, true); assert.equal(s.credits, cash - 25);
  const saved = JSON.stringify(s); assert.equal(command(s, { type: 'maintain', stationId: st.id }).ok, false); assert.equal(JSON.stringify(s), saved);
  ticks(s, 79); assert.ok(st.maintenance > 0); assert.equal(st.progress, progress);
  ticks(s, 3); assert.equal(st.broken, false); assert.equal(st.maintenance, 0); assert.ok(st.progress > progress);
});
test('queues reflow to distinct positions through more arrivals than capacity', () => {
  const s = start(createGame(6)); let sawFull = false, sawReflow = false;
  for (let k = 0; k < 800 && s.state === 'playing'; k++) {
    const before = new Map(s.robots.map(r => [r.id, r.queueTarget ? { ...r.queueTarget } : null]));
    step(s, FIXED_DT); invariant(s);
    for (const st of s.stations) { if (st.queue.length >= 2) sawFull = true;
      for (const id of st.queue) { const old = before.get(id), r = s.robots.find(r => r.id === id); if (old && old.y !== r.queueTarget.y) { sawReflow = true; assert.ok(r.path.length || r.status === 'waiting'); } }
    }
  }
  assert.ok(sawFull && sawReflow); assert.ok(s.arrivalIndex > 3);
});
test('bay C and checkout reserve visually separate queues even with three unstaffed C visitors', () => {
  const s = createGame(7); assert.equal(command(s, { type: 'build', slot: 'C', stationType: 'diagnosis' }).ok, true); start(s);
  const seenC = new Map(), seenCheckout = new Map();
  while (s.state === 'playing') {
    step(s, FIXED_DT); invariant(s);
    for (const [slot, seen] of [['C', seenC], ['payment', seenCheckout]]) {
      const st = s.stations.find(st => st.slot === slot);
      st.queue.forEach((id, index) => seen.set(index, { ...s.robots.find(r => r.id === id).queueTarget }));
    }
  }
  assert.equal(seenC.size, 3, 'Regression exercises every C reservation, including unstaffed third spot');
  assert.ok(seenCheckout.size >= 2, 'Regression exercises a real checkout queue');
  for (const a of seenC.values()) for (const b of seenCheckout.values()) {
    assert.ok(Math.abs(a.x - b.x) >= 50 || Math.abs(a.y - b.y) * .86 >= 55, 'C and checkout faces must not overlap');
  }
  for (const [index, p] of seenCheckout) assert.deepEqual(p, { x: 960, y: 315 + index * 65 });
});
test('bay C queues horizontally without overlapping cashier or checkout service faces', () => {
  const s = createGame(7); assert.equal(command(s, { type: 'build', slot: 'C', stationType: 'diagnosis' }).ok, true); start(s);
  const bay = s.stations.find(st => st.slot === 'C');
  until(s, s => bay.queue.length === 3);
  const targets = bay.queue.map(id => s.robots.find(r => r.id === id).queueTarget);
  assert.deepEqual(targets, [0, 1, 2].map(index => ({ x: bay.x - 54 + index * 60, y: 320 })));
  // Conservative face bounds from the renderer: robot ears/antenna included,
  // human hat included, with the public x+100 / y*.86+146 projection.
  const face = (p, human = false) => ({
    left: 100 + p.x - (human ? 16 : 25), right: 100 + p.x + (human ? 16 : 25),
    top: 146 + p.y * .86 - (human ? 78 : 89), bottom: 146 + p.y * .86 - (human ? 45 : 47),
  });
  const separate = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
  const cashier = s.staff.find(w => w.id === 'cashier'), checkout = s.stations.find(st => st.type === 'payment');
  const otherFaces = [face(cashier, true), face({ x: checkout.x + 14, y: checkout.workY })];
  targets.forEach((p, index) => {
    const box = face(p);
    for (const other of otherFaces) assert.ok(separate(box, other), 'C visitor face must clear cashier and checkout customer faces');
    for (const q of targets.slice(index + 1)) assert.ok(separate(box, face(q)), 'C visitor faces must clear each other');
  });
});
test('bankruptcy is reachable by ordinary purchases before wage, never negative cash', () => {
  const s = createGame(5); assert.equal(command(s, { type: 'upgrade', stationId: 'station-A' }).ok, true); start(s);
  until(s, s => s.stations.find(st => st.slot === 'A').wear > 0);
  assert.equal(command(s, { type: 'maintain', stationId: 'station-A' }).ok, true);
  until(s, s => s.state === 'lost'); assert.match(s.reason, /工资/); assert.ok(s.credits >= 0);
});
test('snapshot is recursively immutable and disconnected from engine state', () => {
  const s = start(createGame()); ticks(s, 50); const snap = snapshot(s), cash = s.credits;
  assert.throws(() => { snap.credits = 99999; }, TypeError);
  assert.throws(() => { snap.stations[1].queue.push('fake'); }, TypeError);
  assert.throws(() => { snap.level.arrivals[0].at = 100; }, TypeError);
  assert.equal(s.credits, cash); assert.equal('commandLog' in snap, false);
});
test('retry replaces all progress, stations, hires and timer with fresh same-day state', () => {
  const s = createGame(1); prepareRepair(s); start(s); ticks(s, 700, true); retry(s); assert.deepEqual(s, createGame(1));
});
for (let index = 0; index < LEVELS.length; index++) test(`day ${index + 1}: checkpoint replay is exact, paused, deterministic and cannot duplicate income`, () => {
  const s = createGame(index); prepareRepair(s);
  const ready = restore(JSON.parse(JSON.stringify(checkpoint(s)))); assert.ok(ready); assert.equal(ready.state, 'paused'); assert.deepEqual(comparable(ready), comparable(s));
  start(s); resume(ready); assert.deepEqual(ready, s);
  ticks(s, 650, true); const data = checkpoint(s), recovered = restore(JSON.parse(JSON.stringify(data)));
  assert.ok(recovered); assert.equal(recovered.state, 'paused'); assert.deepEqual(comparable(recovered), comparable(s));
  const stopped = JSON.stringify(recovered); step(recovered, 86400); assert.equal(JSON.stringify(recovered), stopped);
  resume(recovered); assert.deepEqual(comparable(recovered), comparable(s));
  while (s.state === 'playing') { pilotRepair(s); pilotRepair(recovered); step(s, FIXED_DT); step(recovered, FIXED_DT); }
  assert.deepEqual(recovered, s); assert.equal(s.state, 'won');
});
test('restore rejects corrupt, oversized, impossible, future and forged-resource logs', () => {
  const good = checkpoint(createGame(1));
  const bad = [null, '', [], {}, { ...good, version: 2 }, { ...good, levelIndex: 8 }, { ...good, tick: -1 }, { ...good, tick: .5 }, { ...good, tick: 999999 }, { ...good, credits: 999 }, { ...good, startIndex: 500 },
    { ...good, commands: [{ tick: 1, command: { type: 'hire' } }] },
    { ...good, commands: [{ tick: 0, command: { type: 'build', slot: 'A', stationType: 'electrical' } }] },
    { ...good, commands: [{ tick: 0, command: { type: 'assign', staffId: 't99', stationId: 'station-A' } }] },
    { ...good, commands: Array.from({ length: 4 }, () => ({ tick: 0, command: { type: 'hire' } })) },
    { ...good, commands: Array.from({ length: 385 }, () => ({ tick: 0, command: { type: 'hire' } })) },
    { ...good, startIndex: 0, tick: 2, commands: [{ tick: 2, command: { type: 'hire' } }, { tick: 1, command: { type: 'hire' } }] },
    { ...good, commands: [{ tick: 0, command: { type: 'hire', amount: 9999 } }] },
    { ...good, commands: [{ tick: 0, command: { type: 'unknown' } }] },
  ];
  for (const data of bad) assert.equal(restore(data), null);
  const circular = { ...good }; circular.commands = [circular]; assert.equal(restore(circular), null);
});
test('dual-repair visitor follows every station in order and pays exactly once', () => {
  const s = start(createGame(4)), stages = []; let previous = '';
  until(s, s => s.robots.some(r => r.id === 'r1'));
  while (s.state === 'playing') {
    pilotRepair(s); step(s, FIXED_DT);
    const r = s.robots.find(r => r.id === 'r1');
    if (r.stage !== previous) { previous = r.stage; stages.push(r.stage); }
    if (r.status === 'gone') break;
  }
  assert.deepEqual(stages, ['reception', 'diagnosis', 'mechanical', 'electrical', 'payment', 'exit']);
  const r = s.robots.find(r => r.id === 'r1'); assert.equal(r.receipt, 76); assert.equal(r.paid, true);
  const receipt = r.receipt; ticks(s, 100); assert.equal(r.receipt, receipt); invariant(s);
});
test('new hires need assignment and travel time before a vacant work bay can run', () => {
  const s = start(createGame(3)); until(s, s => s.stations.find(st => st.slot === 'B').queue.length > 0);
  const st = s.stations.find(st => st.slot === 'B'); ticks(s, 10); assert.equal(st.progress, 0); assert.equal(st.robotId, null);
  assert.equal(command(s, { type: 'hire' }).ok, true); ticks(s, 10); assert.equal(st.progress, 0);
  assert.equal(command(s, { type: 'assign', staffId: 't3', stationId: st.id }).ok, true);
  const w = s.staff.find(w => w.id === 't3'); step(s, FIXED_DT); assert.ok(w.path.length); assert.equal(st.progress, 0);
  until(s, s => st.progress > 0); assert.equal(w.path.length, 0);
});
test('accepted command history is bounded and its maximum-size replay remains valid', () => {
  const s = createGame(0); assert.equal(command(s, { type: 'build', slot: 'C', stationType: 'diagnosis' }).ok, true);
  for (let n = 0; n < 383; n++) assert.equal(command(s, { type: 'assign', staffId: 't1', stationId: n % 2 ? 'station-A' : 'station-C' }).ok, true);
  assert.equal(s.commandLog.length, 384); const before = JSON.stringify(s);
  assert.equal(command(s, { type: 'assign', staffId: 't1', stationId: 'station-A' }).ok, false); assert.equal(JSON.stringify(s), before);
  const recovered = restore(checkpoint(s)); assert.ok(recovered); assert.deepEqual(comparable(recovered), comparable(s));
});
test('delta clamping prevents background/offline catch-up and rejects invalid deltas', () => {
  const s = start(createGame()); const before = JSON.stringify(s);
  for (const dt of [-1, NaN, Infinity, '1', 0]) step(s, dt);
  assert.equal(JSON.stringify(s), before); step(s, 100000); assert.equal(s.tick, 5);
});
console.log(`\n${checks} repair engine checks passed.`);
console.log(JSON.stringify(reports, null, 2));
