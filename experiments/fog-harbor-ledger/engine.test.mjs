import test from 'node:test';
import assert from 'node:assert/strict';
import { SHIFTS, SAVE_KEY, createGame, currentCase, reasonsFor, start, chooseEvidence, inspect, decide,
  pause, resume, restart, selectShift, nextShift, checkpoint, restore } from './engine.mjs';

const script = [
  ['none', 'expiry', 'seal', 'route', 'none'],
  ['none', 'none', 'cargo', 'none', 'expiry', 'none'],
  ['none', 'weight', 'none', 'seal', 'none', 'expiry'],
];
function play(s, method = 'scan') {
  assert(start(s));
  while (s.phase === 'active') {
    const i = s.cursor, entry = currentCase(s);
    if (entry.shownSeal === '墨渍遮号' && (s.stage !== 2 || i !== 0 || method !== 'risk')) {
      const choice = method === 'copy' || s.stage === 2 && i === 3 && method !== 'risk' ? 'copy' : 'scan';
      assert(inspect(s, choice));
    }
    const reason = entry.route === '东汐' && s.minute >= SHIFTS[s.stage].closeAt ? 'route' : script[s.stage][i];
    assert(chooseEvidence(s, reason));
    assert(decide(s, reason === 'none' ? 'release' : 'hold', reason));
  }
  return { phase: s.phase, minute: s.minute, correct: s.correct, errors: s.errors,
    released: s.released, scansUsed: s.scansUsed, copies: s.copies };
}
test('three shifts have different rules and retain earlier results', () => {
  const s = createGame();
  for (let stage = 0; stage < 3; stage++) {
    assert.equal(s.stage, stage);
    const result = play(s); assert.equal(result.phase, 'won');
    assert(result.correct >= SHIFTS[stage].quota);
    assert(s.records[stage]);
    if (stage < 2) assert(nextShift(s));
  }
  assert.equal(s.records.filter(Boolean).length, 3);
  assert.equal(nextShift(s), false);
  assert.notEqual(SHIFTS[1].brief, SHIFTS[2].brief);
});
test('fast check and slow copy change the closing-route verdict and traffic', () => {
  const scan = createGame(), copy = createGame();
  scan.unlocked = copy.unlocked = 1;
  assert(selectShift(scan, 1)); assert(selectShift(copy, 1));
  const fast = play(scan, 'scan'), careful = play(copy, 'copy');
  assert.equal(fast.phase, 'won'); assert.equal(careful.phase, 'won');
  assert(fast.minute < careful.minute);
  assert(fast.released > careful.released);
  assert.equal(fast.errors + careful.errors, 0);
});
test('night shift can spend time to verify or accept a visible risk', () => {
  const safe = createGame(), risk = createGame(); safe.unlocked = risk.unlocked = 2;
  assert(selectShift(safe, 2)); assert(selectShift(risk, 2));
  const slow = play(safe), fast = play(risk, 'risk');
  assert.equal(slow.phase, 'won'); assert.equal(fast.phase, 'won');
  assert.equal(slow.copies, 1); assert.equal(fast.copies, 0);
  assert(fast.minute < slow.minute); assert(fast.released > slow.released);
});
test('bad evidence is penalized, time and limited checks cannot be duplicated', () => {
  const s = createGame(); assert(start(s));
  assert.equal(inspect(s, 'scan'), false); assert.equal(s.minute, 0);
  assert.equal(decide(s, 'hold', 'none'), false); assert.equal(s.minute, 0);
  assert(chooseEvidence(s, 'expiry'));
  assert(decide(s, 'hold', 'expiry')); assert.equal(s.errors, 1);
  assert(chooseEvidence(s, 'none'));
  assert(decide(s, 'release', 'none')); assert.equal(s.errors, 2);
  assert.equal(s.phase, 'lost'); assert.equal(s.minute, 2);
  assert.equal(decide(s, 'release', 'none'), false);
  assert(restart(s)); assert.equal(s.cursor, 0); assert.equal(s.minute, 0);
  assert.equal(s.errors, 0);
});
test('scan and copy show the same serial, with different scarce-resource cost', () => {
  for (const method of ['scan', 'copy']) {
    const s = createGame(); s.unlocked = 1; assert(selectShift(s, 1)); assert(start(s));
    assert(chooseEvidence(s, 'none')); assert(decide(s, 'release', 'none')); assert.equal(currentCase(s).shownSeal, '墨渍遮号');
    const before = s.minute; assert(inspect(s, method)); assert(s.revealed);
    assert.equal(s.minute, before + (method === 'scan' ? 1 : 2));
    assert.equal(s.scans, method === 'scan' ? 0 : 1);
    assert.equal(inspect(s, method), false);
    assert.deepEqual(reasonsFor(s), []);
  }
});
test('pause, restore, failed shift retry and old records stay isolated', () => {
  assert(SAVE_KEY.includes('fog-harbor-ledger'));
  const s = createGame(); play(s); const record = checkpoint(s.records[0]);
  assert(nextShift(s)); assert(start(s)); assert(chooseEvidence(s, 'none')); assert(decide(s, 'release', 'none'));
  const active = checkpoint(s), saved = restore(active);
  assert.equal(saved.phase, 'paused'); assert.equal(saved.minute, active.minute);
  assert.equal(decide(saved, 'release', 'none'), false);
  assert(resume(saved)); assert(pause(saved)); assert.equal(pause(saved), false);
  assert(restore({ ...active, log: [{ bad: true }, { bad: true }] }) === null);
  assert(restore({ ...active, log: [{ bad: true }] }) === null);
  assert(restore({ ...active, records: ['broken', null, null] }) === null);
  assert(restart(saved)); assert.deepEqual(saved.records[0], record);
  assert(selectShift(saved, 0)); assert.deepEqual(saved.records[0], record);
});
test('selected evidence survives pause and reload, then clears for the next ship', () => {
  const s = createGame(); assert(start(s));
  assert.equal(s.evidence, null);
  assert.equal(decide(s, 'release', 'none'), false);
  assert(chooseEvidence(s, 'none'));
  assert(pause(s));
  const saved = restore(checkpoint(s)); assert.equal(saved.phase, 'paused');
  assert.equal(saved.evidence, 'none');
  assert(resume(saved)); assert(decide(saved, 'release', 'none'));
  assert.equal(saved.cursor, 1); assert.equal(saved.evidence, null);
  assert.equal(decide(saved, 'hold', 'expiry'), false);
  assert(chooseEvidence(saved, 'expiry'));
  assert(decide(saved, 'hold', 'expiry'));
  assert.equal(saved.evidence, null);
});
test('new information and old saves require an explicit current-ship choice', () => {
  const s = createGame(); s.unlocked = 1;
  assert(selectShift(s, 1)); assert(start(s));
  assert(chooseEvidence(s, 'none')); assert(decide(s, 'release', 'none'));
  assert(chooseEvidence(s, 'seal'));
  assert(inspect(s, 'scan')); assert.equal(s.evidence, null);
  assert.equal(decide(s, 'hold', 'seal'), false);
  assert(chooseEvidence(s, 'none'));
  const old = checkpoint(s); delete old.evidence;
  const migrated = restore(old);
  assert.equal(migrated.phase, 'paused'); assert.equal(migrated.evidence, null);
  assert.match(migrated.message, /旧档未保存本船证据/);
  assert(resume(migrated));
  assert.equal(decide(migrated, 'release', 'none'), false);
  assert(chooseEvidence(migrated, 'none'));
  assert(decide(migrated, 'release', 'none'));
  assert.equal(migrated.evidence, null);
  assert.equal(restore({ ...checkpoint(migrated), evidence: 'fake' }), null);
});
test('confirmed retry clears the current-ship choice', () => {
  const s = createGame(); assert(start(s)); assert(chooseEvidence(s, 'expiry'));
  assert(restart(s)); assert.equal(s.phase, 'ready'); assert.equal(s.evidence, null);
  assert.equal(s.cursor, 0); assert.equal(s.minute, 0);
});
