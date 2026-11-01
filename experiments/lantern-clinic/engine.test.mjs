import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, SHIFTS, build, sell, hire, assign, route, start, tick,
  pause, resume, restart, selectStage, nextStage, checkpoint, restore } from './engine.mjs';

function playVisiblePlan(s, plan) {
  assert(build(s, 'tune', 0)); assert(build(s, 'steady', 1));
  if (plan === 'scan') assert(build(s, 'scan', 2));
  if (plan === 'hire') assert(hire(s));
  assert(start(s));
  while (s.phase === 'active') {
    for (const p of s.patients.filter(p => p.status === 'decision'))
      assert(route(s, p.id, p.known ? p.hint : plan === 'scan' ? 'scan' : 'tune'));
    const next = s.patients.filter(p => ['walking', 'queued'].includes(p.status) && s.rooms[p.plot] !== 'scan')
      .sort((a, b) => a.deadline - b.deadline)[0];
    if (next && !s.staffed[next.plot]) assert(assign(s, next.plot));
    assert(tick(s));
    assert(s.minute <= SHIFTS[s.stage].limit);
  }
  return { minute: s.minute, served: s.served, missed: s.missed, errors: s.errors, cash: s.cash };
}

test('three shifts finish in order with stage-specific quotas and preserved records', () => {
  const s = createGame();
  for (let stage = 0; stage < 3; stage++) {
    assert.equal(s.stage, stage);
    const result = playVisiblePlan(s, stage === 0 ? 'solo' : 'scan');
    assert.equal(s.phase, 'won'); assert(result.served >= SHIFTS[stage].quota);
    assert(result.missed <= SHIFTS[stage].maxMissed);
    assert(s.records[stage]);
    if (stage < 2) assert(nextStage(s));
  }
  assert.equal(s.unlocked, 2);
  assert.equal(s.records.filter(Boolean).length, 3);
  assert.equal(nextStage(s), false);
});

test('lab certainty versus second nurse speed yields different, feasible results', () => {
  const scan = createGame(), staffed = createGame();
  scan.unlocked = staffed.unlocked = 2;
  assert(selectStage(scan, 1)); assert(selectStage(staffed, 1));
  const cautious = playVisiblePlan(scan, 'scan');
  const fast = playVisiblePlan(staffed, 'hire');
  assert.equal(scan.phase, 'won'); assert.equal(staffed.phase, 'won');
  assert.equal(cautious.errors, 0); assert.equal(fast.errors, 1);
  assert(fast.minute < cautious.minute);
  assert(cautious.cash > fast.cash);
});

test('room placement, staffing and removal keep queued patients recoverable', () => {
  const s = createGame();
  assert(build(s, 'tune', 3)); assert(build(s, 'steady', 0)); assert(start(s));
  assert(tick(s)); assert.equal(s.patients[0].status, 'decision');
  assert(route(s, 1, 'tune')); assert.equal(s.patients[0].remaining, 4);
  assert(sell(s, 3)); assert.equal(s.patients[0].status, 'decision');
  assert.equal(s.patients[0].plot, null);
  assert.equal(route(s, 1, 'tune'), false);
  assert(build(s, 'tune', 1)); assert(route(s, 1, 'tune'));
  assert(assign(s, 1));
});

test('invalid assignments and room costs do not consume time or grant free resources', () => {
  const s = createGame();
  assert.equal(route(s, 1, 'scan'), false);
  assert.equal(build(s, 'scan', 0), true);
  assert.equal(build(s, 'scan', 1), false);
  assert.equal(s.cash, 11); assert.equal(s.minute, 0);
  assert.equal(hire(s), true); assert.equal(s.cash, 3);
  assert.equal(build(s, 'tune', 1), false);
  assert.equal(s.minute, 0);
  assert(sell(s, 0)); assert.equal(s.cash, 8);
});

test('loss, retry and replay preserve earlier unlocks and records', () => {
  const s = createGame(); playVisiblePlan(s, 'solo');
  const record = checkpoint(s.records[0]);
  assert(nextStage(s)); assert(start(s));
  while (s.phase === 'active') assert(tick(s));
  assert.equal(s.phase, 'lost'); assert.equal(s.stage, 1);
  assert(restart(s)); assert.equal(s.phase, 'ready'); assert.equal(s.minute, 0);
  assert.deepEqual(s.records[0], record); assert.equal(s.unlocked, 1);
  assert(selectStage(s, 0)); assert.equal(s.stage, 0);
  assert.deepEqual(s.records[0], record);
});

test('pause and save restore keep the exact queue, then require an explicit resume', () => {
  const s = createGame(); build(s, 'tune', 0); start(s); tick(s);
  const before = checkpoint(s), resumed = restore(checkpoint(s));
  assert.equal(resumed.phase, 'paused'); assert.equal(resumed.minute, before.minute);
  assert.deepEqual(resumed.patients, before.patients);
  assert.equal(tick(resumed), false);
  assert(resume(resumed)); assert.equal(resumed.phase, 'active');
  assert(pause(resumed)); assert.equal(pause(resumed), false);
  assert.equal(restore({ ...before, rooms: ['scan'] }), null);
});
