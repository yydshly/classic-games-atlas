import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_KEY, SHIFTS, availableCases, checkpoint, chooseEvidence, createGame, currentCase,
  decide, inspect, nextShift, pause, reasonsFor, restart, restore, resume, selectCase, selectShift, start } from './engine.mjs';

function finishShift(s, first = 0) {
  assert(start(s));
  while (s.phase === 'active') {
    const choices = availableCases(s);
    const chosen = s.cursor === 0 ? choices[first] : s.stage === 3 && first === 1 && s.cursor === 1 ? choices[1] : choices[0];
    assert(selectCase(s, chosen.index));
    const entry = currentCase(s);
    if (entry.shownSeal === '墨渍遮号' && !reasonsFor(s, entry).includes('route') && s.minute + 2 < SHIFTS[s.stage].limit) {
      const method = s.scans ? 'scan' : 'copy';
      assert(inspect(s, method));
    }
    const reason = reasonsFor(s, entry)[0] ?? 'none';
    assert(chooseEvidence(s, reason));
    assert(decide(s, reason === 'none' ? 'release' : 'hold', reason));
  }
  return s;
}

test('all five shifts have a complete route and preserve earlier records', () => {
  const s = createGame();
  assert.notEqual(SAVE_KEY, 'classic-games-atlas:fog-harbor-ledger:v1');
  for (let stage = 0; stage < SHIFTS.length; stage++) {
    finishShift(s);
    assert.equal(s.phase, 'won', `${stage + 1}: ${s.message}`);
    assert(s.records[stage]);
    if (stage + 1 < SHIFTS.length) assert(nextShift(s));
  }
  assert.equal(SHIFTS.length, 5);
  assert.equal(nextShift(s), false);
  assert.equal(s.records.filter(Boolean).length, 5);
});

test('two visible orders trade priority cargo at the berth window', () => {
  const high = createGame(), quick = createGame();
  high.unlocked = quick.unlocked = 3;
  assert(selectShift(high, 3)); assert(selectShift(quick, 3));
  finishShift(high, 0); finishShift(quick, 1);
  assert.equal(high.phase, 'won'); assert.equal(quick.phase, 'won');
  assert(high.delivered > quick.delivered, `${high.delivered} vs ${quick.delivered}`);
  assert(high.minute > quick.minute, `${high.minute} vs ${quick.minute}`);
  assert(high.copies > quick.copies);
  assert(high.log.some(row => row.name === '鱼灯号' && row.verdict === 'release' && row.right));
  assert(quick.log.some(row => row.name === '浅帆号' && row.verdict === 'release' && row.right));
  assert.notDeepEqual(high.log.map(row => row.caseIndex), quick.log.map(row => row.caseIndex));
});

test('selection and revealed evidence restore safely without leaking to next ship', () => {
  const s = createGame(); assert(start(s));
  assert.equal(chooseEvidence(s, 'none'), false);
  assert(selectCase(s, 0)); assert(chooseEvidence(s, 'none'));
  assert(selectCase(s, 1)); assert.equal(s.evidence, null);
  assert(selectCase(s, 0)); assert(chooseEvidence(s, 'none'));
  const paused = restore(checkpoint(s));
  assert.equal(paused.phase, 'paused'); assert.equal(paused.selectedIndex, 0);
  assert.equal(paused.evidence, 'none'); assert(resume(paused));
  assert(decide(paused, 'release', 'none'));
  assert.equal(paused.selectedIndex, null); assert.equal(paused.evidence, null);
  assert.equal(decide(paused, 'release', 'none'), false);
  assert.equal(selectCase(paused, 0), false);
  assert.equal(availableCases(paused)[0].index, 1);
  assert(pause(paused)); assert.equal(selectCase(paused, 1), false);
});

test('inspection locks the current ship until verdict, and retry resets only current shift', () => {
  const s = createGame(); s.unlocked = 3; assert(selectShift(s, 3)); assert(start(s));
  assert(selectCase(s, 0)); assert(inspect(s, 'scan'));
  assert.equal(selectCase(s, 1), false);
  assert.equal(s.scans, 0); assert.equal(s.selectedIndex, 0);
  const saved = restore(checkpoint(s)); assert.equal(saved.phase, 'paused');
  assert.equal(saved.revealed, true); assert.equal(saved.selectedIndex, 0);
  assert(resume(saved)); assert(chooseEvidence(saved, 'none'));
  assert(decide(saved, 'release', 'none')); assert.equal(saved.delivered, 3);
  const old = checkpoint(saved); old.selectedIndex = 0;
  assert.equal(restore(old), null);
  assert(restart(saved)); assert.equal(saved.stage, 3); assert.equal(saved.cursor, 0);
  assert.equal(saved.scans, 1); assert.equal(saved.delivered, 0);
  assert.equal(restore({ ...checkpoint(saved), records: [null] }), null);
  assert.equal(restore({ ...checkpoint(saved), log: [{ bad: true }] }), null);
});

test('mistaken choices fail and repeated verdicts cannot double advance', () => {
  const s = createGame(); assert(start(s)); assert(selectCase(s, 0));
  assert(chooseEvidence(s, 'expiry')); assert(decide(s, 'hold', 'expiry'));
  assert.equal(decide(s, 'hold', 'expiry'), false);
  assert.equal(s.cursor, 1); assert.equal(s.errors, 1);
  assert(selectCase(s, 1)); assert(chooseEvidence(s, 'none'));
  assert(decide(s, 'release', 'none')); assert.equal(s.phase, 'lost');
  assert.equal(s.cursor, 2); assert.equal(decide(s, 'release', 'none'), false);
});
