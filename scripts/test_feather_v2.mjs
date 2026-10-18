import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  SAVE_KEY, SPECIES, WALKABLE, SITES, WILD, createGame, input, allowed,
  checkpoint, restore, invariants, partner, active, maxHP, power,
  captureChance, nextIntent, incoming, estimateHit, factor,
} from '../versions/v2/games/feather/model.mjs';

// Model-only QA. All scenario, replay, resource, defeat, and fuzz tests use
// ordinary input() commands. Only tests explicitly labelled isolated_fixture
// mutate a copy to reach arithmetic boundaries. No browser claim is made.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.join(root, 'docs/feather-v2-qa/model-report.json');
const copy = value => JSON.parse(JSON.stringify(value));
const sha = file => { const local = path.join(root, file); const actual = fs.existsSync(local) ? local : path.join(root, file.replace(/^reference\//, '')); return crypto.createHash('sha256').update(fs.readFileSync(actual)).digest('hex'); };
const tests = [], scenarios = [], captureAttempts = [];
let acceptedCommands = 0, rejectedCommands = 0, invariantChecks = 0;
const legacyHashes = {
  'reference/README.md': 'f5d8910a6b6fae93fa9cec1fa4cfe8983f788c093c161c0e4cfb7a5d02ac5388',
  'reference/games/feather/chapters.mjs': '0b1cb5ca43cba82bd6fa070089b80b82157d41d62f1dd658f8237142a1a60461',
  'reference/games/feather/engine.mjs': 'caedbaec367b9df38d03143feacefa1d3206fde4f46559b7957812cf67aa0f07',
  'reference/games/feather/game.mjs': '66f0312310cad453b106812a7bcc98ca5aa9a0cab727f155a8c050e10e1f7f1f',
  'reference/games/feather/index.html': '1cfd617bff8df2f0ab2b740d23e30e259603d06255dce21f0aaceaa9f6b6ec19',
  'reference/games/feather/renderer.mjs': '39085b89de7a12d52b772fcdd425e3591c7225160f82941bdba2bfb4c2a00dfe',
  'reference/scripts/test_feather.mjs': 'f3236c636a030d5634862f06a5dc086325be3d8098d2444b24ef81edcb978614',
};
// The local candidate carries exact fetched references; the published repository uses the unchanged real legacy paths.
if (!fs.existsSync(path.join(root, 'reference/README.md'))) delete legacyHashes['reference/README.md'];
function checkState(s) {
  for (const [key, ok] of Object.entries(invariants(s))) assert.equal(ok, true, `Invariant ${key} at revision ${s.revision}`);
  assert.equal(s.roster.length, new Set(s.roster.map(p => p.id)).size);
  for (const p of [...s.roster, ...s.pending]) {
    assert(Object.hasOwn(SPECIES, p.id));
    for (const key of ['hp', 'energy', 'shield', 'xp', 'rank', 'encounters']) assert(Number.isInteger(p[key]), `${p.id}.${key} must be an integer`);
    assert(p.shield >= 0 && p.shield <= 18);
    assert(p.encounters >= p.xp);
  }
  assert.equal(s.seed >>> 0, s.seed);
  assert(s.rng > 0 && s.rng <= 0xffffffff);
  assert(Number.isInteger(s.daylight));
  assert(Number.isInteger(s.bag.knots) && Number.isInteger(s.bag.berries));
  assert(s.seen.every(id => Object.hasOwn(WILD, id)));
  if (s.phase !== 'camp') assert.equal(s.team.length, 2);
  if (s.phase === 'encounter') {
    assert(active(s).hp > 0);
    assert.deepEqual(s.pos, {x: SITES[s.wild.id].x, y: SITES[s.wild.id].y});
    assert(s.sites[s.wild.id]);
    assert(s.wild.participants.every(id => s.team.includes(id)));
    assert.equal(new Set(s.wild.participants).size, s.wild.participants.length);
  }
  invariantChecks++;
}
function send(s, kind, arg) {
  const command = {kind, ...(arg === undefined ? {} : {arg}), revision: s.revision};
  assert.equal(allowed(s, kind, arg), '', `Unexpected rejection: ${kind} ${arg ?? ''}`);
  assert.equal(input(s, command), true);
  acceptedCommands++;
  checkState(s);
  return command;
}
function reject(s, command) {
  const before = copy(s);
  assert.equal(input(s, command), false, `Unexpected acceptance: ${JSON.stringify(command)}`);
  assert.deepEqual(s, before, 'Rejected input must be atomic, including RNG and log');
  rejectedCommands++;
  checkState(s);
}
function deny(s, kind, arg) { reject(s, {kind, ...(arg === undefined ? {} : {arg}), revision: s.revision}); }
function test(name, fn, mode = 'ordinary_input') {
  try { const detail = fn(); tests.push({name, mode, status: 'passed', ...(detail ? {detail} : {})}); }
  catch (error) { tests.push({name, mode, status: 'failed', error: error.message, stack: error.stack?.split('\n').slice(0, 7).join('\n')}); }
}
const routes = {
  bud: ['right', 'right', 'up', 'up', 'right'],
  fin: ['right', 'right', 'right', 'right', 'right', 'right', 'up', 'up'],
  berryBud: ['up', 'up', 'right', 'right', 'right'],
};
function walk(s, directions) { for (const d of directions) send(s, 'move', d); }
function encounter(s, id = 'bud', viaBerry = false) {
  send(s, 'depart'); walk(s, routes[viaBerry ? 'berryBud' : id]);
  assert.equal(s.phase, 'encounter'); assert.equal(s.wild.id, id); return s;
}
function setTeam(s, ids, lead = ids[0]) {
  for (const id of [...s.team]) if (!ids.includes(id)) send(s, 'team', id);
  for (const id of ids) if (!s.team.includes(id)) send(s, 'team', id);
  if (s.active !== lead) send(s, 'lead', lead);
}
function capture(s, label) {
  const before = {revision: s.revision, rng: s.rng, chance: captureChance(s), knots: s.bag.knots, daylight: s.daylight, wild: copy(s.wild)};
  send(s, 'capture');
  const record = {
    scenario: label, seed: s.seed, outing: s.outing, before,
    result: s.wild ? 'failed' : 'captured',
    after: {rng: s.rng, knots: s.bag.knots, daylight: s.daylight, phase: s.phase},
    notice: s.notice,
  };
  // A remaining wild is the authoritative outcome; failed rolls are retained.
  captureAttempts.push(record); return record;
}
function recordScenario(name, s, detail = {}) {
  scenarios.push({name, mode: 'ordinary_input', seed: s.seed, commands: copy(s.log), stats: copy(s.stats), roster: copy(s.roster), report: copy(s.report), ...detail});
}
let collected;
function collectAndGrow() {
  if (collected) return restore(checkpoint(collected));
  const s = createGame(123456789);
  encounter(s); capture(s, 'collection:first-outing'); capture(s, 'collection:first-outing');
  assert.equal(s.stats.failedCaptures, 2); deny(s, 'capture'); send(s, 'home');
  encounter(s); send(s, 'attack'); send(s, 'soothe'); send(s, 'soothe');
  capture(s, 'collection:retry-bud'); assert.equal(s.pending[0].id, 'bud'); assert(!partner(s, 'bud'));
  send(s, 'home'); assert(partner(s, 'bud')); setTeam(s, ['b', 'bud'], 'bud');
  encounter(s, 'fin'); send(s, 'attack'); send(s, 'soothe'); send(s, 'soothe');
  capture(s, 'collection:first-fin'); assert(s.wild); capture(s, 'collection:second-fin'); assert(!s.wild);
  send(s, 'home'); assert(partner(s, 'fin')); assert.equal(partner(s, 'bud').xp, 1);
  encounter(s, 'fin'); send(s, 'soothe'); send(s, 'soothe'); send(s, 'farewell'); send(s, 'home');
  assert.equal(partner(s, 'bud').rank, 1); assert.equal(maxHP(partner(s, 'bud')), 78);
  setTeam(s, ['bud', 'fin'], 'fin');
  for (let i = 0; i < 3; i++) {
    encounter(s, 'bud'); while (s.phase === 'encounter') send(s, 'attack'); send(s, 'home');
    if (i >= 1) { assert.equal(partner(s, 'fin').rank, 1); assert.equal(maxHP(partner(s, 'fin')), 84); assert.equal(power(partner(s, 'fin')), 20); }
  }
  assert.equal(partner(s, 'fin').xp, 2); assert.equal(partner(s, 'fin').encounters, 3);
  assert.deepEqual(s.roster.map(p => p.id), ['a', 'b', 'c', 'bud', 'fin']);
  assert.equal(s.stats.failedCaptures, 3); assert.equal(s.stats.captures, 2);
  assert.deepEqual(restore(checkpoint(s)), s);
  recordScenario('Real failed captures, return/retry, recruit both species, replace team and cap both new partners at one growth', s);
  collected = copy(s); return s;
}
function leadEncounter(id, wild = 'bud') {
  const s = ['bud', 'fin'].includes(id) ? collectAndGrow() : createGame(123456789);
  setTeam(s, [id, id === 'b' ? 'a' : 'b'], id); return encounter(s, wild);
}

test('Independent storage namespace and no legacy engine imports; legacy baseline files remain byte-identical', () => {
  assert.equal(SAVE_KEY, 'classic-atlas.feather.expedition.v2'); assert.notEqual(SAVE_KEY, 'classic-atlas.feather.v1');
  const source = fs.readFileSync(path.join(root, 'versions/v2/games/feather/model.mjs'), 'utf8');
  assert(!/^\s*import\b/m.test(source), 'Independent model must not import legacy engine');
  for (const [file, hash] of Object.entries(legacyHashes)) assert.equal(sha(file), hash, file);
  assert.match(fs.readFileSync(path.join(root, 'reference/games/feather/game.mjs'), 'utf8'), /KEY='classic-atlas\.feather\.v1'/);
}, 'static_read_only');

test('Initial camp exposes three original partners, two slots, 24 daylight and authored 2/2 resources', () => {
  const s = createGame(123456789); checkState(s);
  assert.deepEqual(s.roster.map(p => p.id), ['a', 'b', 'c']); assert.deepEqual(s.team, ['a', 'b']);
  assert.equal(s.daylight, 24); assert.deepEqual(s.bag, {knots: 2, berries: 2});
  assert.equal(s.phase, 'camp'); assert.deepEqual(s.pos, {x: 1, y: 3}); assert.equal(s.pending.length, 0);
});

test('9 by 5 logical grid has connected walkable cells and reachable named sites', () => {
  const keys = new Set(WALKABLE.map(([x, y]) => `${x},${y}`)); assert.equal(keys.size, WALKABLE.length);
  assert(WALKABLE.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < 9 && y >= 0 && y < 5));
  const queue = [[1, 3]], visited = new Set(['1,3']);
  for (let i = 0; i < queue.length; i++) for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const point = [queue[i][0] + dx, queue[i][1] + dy], key = point.join(',');
    if (keys.has(key) && !visited.has(key)) { visited.add(key); queue.push(point); }
  }
  assert.equal(visited.size, WALKABLE.length);
  for (const site of Object.values(SITES)) assert(visited.has(`${site.x},${site.y}`));
}, 'static_read_only');

test('Camp team selection refuses unowned/unknown species and requires exactly two before departure', () => {
  const s = createGame(); for (const id of ['bud', 'fin', 'missing', '__proto__', null, 1, {}]) deny(s, 'team', id);
  deny(s, 'team', 'c'); send(s, 'team', 'a'); deny(s, 'team', 'b'); deny(s, 'depart');
  send(s, 'team', 'c'); send(s, 'lead', 'c'); send(s, 'depart');
  assert.deepEqual(s.team, ['b', 'c']); assert.equal(s.active, 'c'); deny(s, 'team', 'a'); deny(s, 'lead', 'b');
});

test('Ordinary walking spends one daylight, collects berry once and starts encounters only at their cells', () => {
  const s = createGame(); send(s, 'depart'); deny(s, 'attack'); deny(s, 'move', 'left'); deny(s, 'move', 'down');
  for (const d of ['north', '', null, 4, {}, '__proto__']) deny(s, 'move', d);
  walk(s, ['up', 'up']); assert.equal(s.bag.berries, 3); assert.equal(s.daylight, 22);
  walk(s, ['right', 'left']); assert.equal(s.bag.berries, 3);
  walk(s, ['right', 'right', 'right']); assert.equal(s.wild.id, 'bud'); assert.equal(s.daylight, 17); deny(s, 'move', 'left');
  send(s, 'home'); encounter(s, 'fin'); assert.equal(s.daylight, 16); assert.deepEqual(s.seen, ['bud', 'fin']);
});

test('Real failed rolls are retained, free retry continues RNG, both recruits join only on return and each new partner grows once', () => {
  const s = collectAndGrow(); return {seed: s.seed, commands: s.log.length, outings: s.outing, captures: 2, failedCaptures: 3, newPartners: ['bud', 'fin'], growth: {bud: partner(s, 'bud').rank, fin: partner(s, 'fin').rank}};
});

test('A weakened target has higher capture chance; a high 88 percent chance can genuinely fail', () => {
  const attempts = (collectAndGrow(), captureAttempts);
  const failedHigh = attempts.find(a => a.before.chance === 88 && a.result === 'failed'); assert(failedHigh);
  assert.match(failedHigh.notice, /判定89/);
  assert.equal(attempts.find(a => a.scenario === 'collection:retry-bud').before.chance, 88);
  return {failedHighChance: {chance: 88, roll: 89}, retainedCaptureAttempts: attempts.length};
});

test('Each original partner also grows exactly once after ordinary encounters; a third reward cannot add another rank', () => {
  for (const id of ['a', 'b', 'c']) {
    const s = createGame(123456789); setTeam(s, [id, id === 'b' ? 'a' : 'b'], id);
    for (let outing = 0; outing < 3; outing++) {
      encounter(s); while (s.phase === 'encounter') send(s, 'attack'); send(s, 'home');
      const p = partner(s, id);
      assert.equal(p.encounters, outing + 1); assert.equal(p.xp, Math.min(2, outing + 1));
      assert.equal(p.rank, Number(outing >= 1));
      assert.equal(maxHP(p), SPECIES[id].hp + (outing >= 1 ? 8 : 0));
      assert.equal(power(p), SPECIES[id].power + (outing >= 1 ? 2 : 0));
    }
  }
});

test('Already recruited species cannot consume another knot, roster duplicates remain impossible', () => {
  const s = collectAndGrow(); encounter(s); deny(s, 'capture'); assert.equal(s.bag.knots, 2);
  assert.equal(s.roster.filter(p => p.id === 'bud').length, 1);
});

test('Departure freely replenishes all health, energy, shields, daylight, sites and bag without reseeding', () => {
  const s = createGame(123456789); encounter(s); send(s, 'skill'); send(s, 'capture'); send(s, 'soothe'); send(s, 'home');
  const rng = s.rng, seed = s.seed; send(s, 'depart');
  assert.equal(s.rng, rng); assert.equal(s.seed, seed); assert.deepEqual(s.bag, {knots: 2, berries: 2});
  assert.deepEqual(s.sites, {berry: false, bud: false, fin: false}); assert.equal(s.daylight, 24);
  for (const p of s.roster) { assert.equal(p.hp, maxHP(p)); assert.equal(p.energy, 3); assert.equal(p.shield, 0); }
});

test('Checkpoint before failed capture restores exact RNG and cannot refresh-reroll that action', () => {
  const s = encounter(createGame(123456789)), cp = checkpoint(s), restored = restore(copy(cp));
  assert.deepEqual(restored, s); send(s, 'capture'); send(restored, 'capture'); assert.deepEqual(restored, s);
  assert.equal(s.stats.failedCaptures, 1); assert.match(s.notice, /判定64/);
  for (let i = 0; i < 5; i++) { const again = restore(cp); send(again, 'capture'); assert.deepEqual(again, s); }
  recordScenario('Save/reload before the same failed roll does not reroll', s, {restoresChecked: 6});
});

test('Every prefix of the complete normal-input collection campaign restores an identical state', () => {
  const end = collectAndGrow(), s = createGame(end.seed);
  for (const command of end.log) { assert(input(s, copy(command))); acceptedCommands++; checkState(s); assert.deepEqual(restore(checkpoint(s)), s); }
  assert.deepEqual(s, end); return {prefixes: end.log.length};
});

test('Checkpoint is a detached command log; forged snapshot fields have no authority', () => {
  const s = encounter(createGame(7)), cp = checkpoint(s), before = copy(s);
  cp.commands[0].kind = 'attack'; assert.deepEqual(s, before); assert.equal(restore(cp), null);
  assert.deepEqual(restore({...checkpoint(s), roster: [{id: 'fin', hp: 999}], bag: {knots: 999}, rng: 1, phase: 'camp'}), s);
});

test('Malformed, old-version, out-of-range-seed and impossible checkpoints reject', () => {
  const cp = checkpoint(createGame(123));
  for (const bad of [null, {}, [], {...cp, version: 1}, {...cp, seed: 0}, {...cp, seed: -1}, {...cp, seed: 1.5}, {...cp, seed: 0x100000000}, {...cp, seed: '123'}, {...cp, commands: {}}, {...cp, commands: [null]}, {...cp, commands: [{kind: 'move', arg: 'up', revision: 0}]}, {...cp, commands: [{kind: 'depart', revision: 1}]}, {...cp, commands: Array(4001).fill({kind: 'lead', arg: 'a', revision: 0})}]) assert.equal(restore(bad), null);
});

test('Duplicate/stale/future commands are atomic and cannot repeat RNG, spend or enemy replies', () => {
  const s = encounter(createGame(123456789)), command = send(s, 'capture');
  reject(s, command); reject(s, {...command, revision: 0}); reject(s, {...command, revision: s.revision + 1});
  reject(s, {...command, revision: String(s.revision)}); reject(s, {...command, revision: NaN});
  reject(s, null); reject(s, {}); reject(s, {kind: 3, revision: s.revision}); deny(s, 'missing');
});

test('Finite knots and berries reject spending at zero, invalid species and unsupported resource actions reject atomically', () => {
  const s = encounter(createGame(123456789)); send(s, 'capture'); send(s, 'capture'); deny(s, 'capture');
  send(s, 'soothe'); send(s, 'soothe'); assert.equal(s.bag.berries, 0); deny(s, 'soothe'); deny(s, 'heal');
  deny(s, 'switch', 'bud'); deny(s, 'switch', 'missing'); deny(s, 'switch', s.active);
  for (const kind of ['item', 'revive', 'ether', 'buy', 'recruit', 'teleport', '__proto__']) deny(s, kind, 'fin');
});

test('Guard restores energy only to three, skill costs two, low energy rejects and guard shield is consumed once', () => {
  const s = encounter(createGame()); send(s, 'skill'); assert.equal(active(s).energy, 1); deny(s, 'skill');
  send(s, 'guard'); assert.equal(active(s).energy, 2); assert.equal(active(s).shield, 0);
  send(s, 'guard'); assert.equal(active(s).energy, 3); send(s, 'guard'); assert.equal(active(s).energy, 3);
});

test('Attack uses cyclic type factors and defeating a wild rewards experience without recruiting it', () => {
  for (const [a, b] of [['wind', 'moss'], ['moss', 'water'], ['water', 'wind']]) { assert.equal(factor(a, b), 1.5); assert.equal(factor(b, a), 0.75); assert.equal(factor(a, a), 1); }
  const s = encounter(createGame()); assert.equal(estimateHit(s), 24); send(s, 'attack'); assert.equal(s.wild.hp, 18);
  assert.equal(estimateHit(s), 18); send(s, 'attack'); assert.equal(s.phase, 'explore'); assert.equal(s.stats.won, 1);
  assert.equal(partner(s, 'a').xp, 1); assert.equal(s.pending.length, 0); assert.equal(s.stats.captures, 0);
});

test('Two actual incoming attacks consume wind weakness; an observation consumes no charge (regression)', () => {
  const s = encounter(createGame()); send(s, 'skill'); assert.equal(s.wild.weak, 1); assert.equal(nextIntent(s), '观察');
  send(s, 'guard'); assert.equal(s.wild.weak, 1); assert.equal(nextIntent(s), '重击'); assert.equal(incoming(s), 6);
  send(s, 'guard'); assert.equal(s.wild.weak, 0); assert.equal(incoming(s), 9);
});

test('Recruited bud skill survives an observation and reduces exactly the next attack (regression)', () => {
  const s = leadEncounter('bud', 'fin'); send(s, 'guard'); assert.equal(nextIntent(s), '观察');
  send(s, 'skill'); assert.equal(s.wild.calm, 22); assert.equal(s.wild.weak, 1); assert.equal(incoming(s), 7);
  send(s, 'guard'); assert.equal(s.wild.weak, 0); assert.equal(active(s).energy, 2);
});

test('All five species skill effects execute with ordinary acquired partners', () => {
  const b = leadEncounter('b'); send(b, 'attack'); const injured = active(b).hp; assert(injured < maxHP(active(b)));
  send(b, 'skill'); assert.equal(active(b).hp, Math.min(maxHP(active(b)), injured + 28)); assert.equal(active(b).energy, 1);
  const c = leadEncounter('c', 'fin'); send(c, 'attack'); const chp = active(c).hp; send(c, 'skill');
  assert.equal(active(c).hp, Math.min(maxHP(active(c)), chp + 18)); assert.equal(c.wild.calm, 10); assert.equal(active(c).energy, 1);
  const fin = leadEncounter('fin'); const hp = active(fin).hp; send(fin, 'skill'); assert.equal(fin.wild.hp, 35);
  assert.equal(active(fin).hp, hp); assert.equal(active(fin).shield, 0); assert.equal(active(fin).energy, 1);
  return {a: 'wind regression above', b: 'bounded 28 heal', c: 'bounded 18 heal and calm +10', bud: 'bud regression above', fin: '7 type-adjusted damage and 18 shield absorb'};
});

test('Soothe and heal share the same finite berry stock; healing is capped at max health', () => {
  const s = encounter(createGame()); deny(s, 'heal'); send(s, 'attack'); const injured = active(s).hp;
  assert(injured < maxHP(active(s))); send(s, 'heal'); assert.equal(active(s).hp, maxHP(active(s))); assert.equal(s.bag.berries, 1);
  send(s, 'soothe'); assert.equal(s.bag.berries, 0); deny(s, 'heal'); deny(s, 'soothe');
});

test('Peaceful farewell requires 60 calm, rewards only participants and never recruits', () => {
  const s = createGame(); setTeam(s, ['b', 'c'], 'b'); encounter(s); deny(s, 'farewell');
  send(s, 'soothe'); deny(s, 'farewell'); send(s, 'soothe'); assert.equal(s.wild.calm, 60); deny(s, 'soothe');
  send(s, 'farewell'); assert.equal(s.stats.calmed, 1); assert.equal(s.stats.captures, 0); assert.equal(s.pending.length, 0);
  assert.equal(partner(s, 'b').xp, 1); assert.equal(partner(s, 'c').xp, 0); assert.equal(partner(s, 'a').xp, 0);
});

test('Switch costs one daylight and shares reward with both actual participants; free field lead does not', () => {
  const s = encounter(createGame()); const light = s.daylight; send(s, 'switch', 'b'); assert.equal(s.daylight, light - 1);
  send(s, 'attack'); send(s, 'attack'); send(s, 'attack'); assert.equal(s.phase, 'explore');
  assert.equal(partner(s, 'a').xp, 1); assert.equal(partner(s, 'b').xp, 1);
  const now = s.daylight; send(s, 'leadField', 'a'); assert.equal(s.daylight, now); deny(s, 'leadField', 'c');
});

test('Leave marks the encounter spent this outing and returning next outing permits a real retry', () => {
  const s = encounter(createGame()); const light = s.daylight; send(s, 'leave'); assert.equal(s.daylight, light - 1);
  walk(s, ['left', 'right']); assert.equal(s.phase, 'explore'); assert.equal(s.stats.won, 0);
  send(s, 'home'); encounter(s); assert.equal(s.wild.id, 'bud'); assert.equal(s.wild.hp, 42);
});

test('Walking back to the camp safely recruits a captured pending partner', () => {
  const s = encounter(createGame(1)); send(s, 'capture'); assert.equal(s.pending[0].id, 'bud');
  walk(s, ['left', 'down', 'down', 'left', 'left']); assert.equal(s.phase, 'camp'); assert(partner(s, 'bud'));
  assert.equal(s.report.reason, '你走回了归羽营地。'); assert.deepEqual(s.report.recruited, ['bud']);
});

test('Ordinary daylight exhaustion during exploration returns safely and free departure restores the full budget', () => {
  const s = createGame(); send(s, 'depart'); send(s, 'move', 'right');
  while (s.phase === 'explore') send(s, 'move', s.pos.x === 2 ? 'right' : 'left');
  assert.equal(s.daylight, 0); assert.equal(s.phase, 'camp'); assert.equal(s.stats.exhausted, 1);
  assert.match(s.report.reason, /暮色/); assert.equal(s.stats.moves, 24); recordScenario('Real daylight exhaustion by ordinary walking', s);
  send(s, 'depart'); assert.equal(s.daylight, 24); assert.deepEqual(s.bag, {knots: 2, berries: 2});
});

test('Ordinary daylight exhaustion during an encounter returns once without negative resources or a dangling wild', () => {
  const s = encounter(createGame()); while (s.phase === 'encounter') send(s, 'guard');
  assert.equal(s.daylight, 0); assert.equal(s.phase, 'camp'); assert.equal(s.wild, null); assert.equal(s.stats.exhausted, 1);
  assert.equal(s.stats.returned, 1); deny(s, 'guard'); deny(s, 'home'); recordScenario('Real daylight exhaustion during an unresolved encounter', s);
});

test('Both partners genuinely fall through ordinary actions; automatic safe return and full retry work', () => {
  const s = createGame(123456789); setTeam(s, ['a', 'c'], 'a'); encounter(s, 'fin');
  while (s.phase === 'encounter') {
    const other = s.team.find(id => id !== s.active);
    if (!allowed(s, 'switch', other)) send(s, 'switch', other);
    else if (!allowed(s, 'capture')) capture(s, 'all-down');
    else send(s, 'attack');
  }
  assert.equal(s.phase, 'camp'); assert.match(s.report.reason, /都累倒/);
  assert.equal(partner(s, 'a').hp, 0); assert.equal(partner(s, 'c').hp, 0); assert.equal(s.daylight, 1);
  assert.equal(s.stats.exhausted, 0); assert.equal(s.stats.returned, 1); recordScenario('Genuine full-team defeat, not an HP fixture', s);
  send(s, 'depart'); assert(s.team.every(id => partner(s, id).hp === maxHP(partner(s, id))));
  assert.equal(s.daylight, 24); assert.deepEqual(s.bag, {knots: 2, berries: 2}); walk(s, routes.fin); assert.equal(s.phase, 'encounter');
});

test('Isolated arithmetic fixture clamps capture chance to 5..88 and never guarantees capture', () => {
  const s = encounter(createGame()); s.wild.hp = s.wild.maxHP; s.wild.calm = 0; s.wild.wariness = 30;
  assert.equal(captureChance(s), 5); s.wild.hp = 1; s.wild.calm = 60; s.wild.wariness = 0;
  assert.equal(captureChance(s), 88);
}, 'isolated_fixture');

test('Isolated exact-last-day capture fixture settles/recruits once before safe automatic return', () => {
  const s = encounter(createGame(1)); s.daylight = 1; send(s, 'capture');
  assert.equal(s.phase, 'camp'); assert.equal(s.daylight, 0); assert(partner(s, 'bud'));
  assert.equal(s.stats.captures, 1); assert.equal(s.stats.returned, 1); assert.equal(s.stats.exhausted, 1);
}, 'isolated_fixture');

test('Record capacity accepts 4000 ordinary commands then rejects atomically; its checkpoint remains restorable', () => {
  const s = createGame(); for (let i = 0; i < 4000; i++) send(s, 'lead', 'a');
  deny(s, 'depart'); assert.equal(s.revision, 4000); assert.deepEqual(restore(checkpoint(s)), s);
});

const fuzz = {seeds: 80, commandsPerSeed: 450, accepted: 0, rejected: 0, checkpoints: 0, phaseVisits: {camp: 0, explore: 0, encounter: 0}, actions: {}, aggregateGameplayOutcomes: {captures: 0, failedCaptures: 0, won: 0, calmed: 0, exhausted: 0}};
test('80 seeded random legal-command campaigns preserve invariants, reject probes and replay sampled checkpoints', () => {
  let randomState = 0xabc123;
  const pick = n => { randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5; return (randomState >>> 0) % n; };
  for (let run = 0; run < fuzz.seeds; run++) {
    const s = createGame((0x9e3779b9 * (run + 1)) >>> 0);
    for (let i = 0; i < fuzz.commandsPerSeed; i++) {
      const candidates = [];
      const offer = (kind, arg) => { if (!allowed(s, kind, arg)) candidates.push({kind, arg}); };
      if (s.phase === 'camp') {
        offer('depart'); offer('depart'); offer('depart'); offer('depart');
        for (const id of Object.keys(SPECIES)) { offer('team', id); offer('lead', id); }
      } else if (s.phase === 'explore') {
        for (const direction of ['up', 'down', 'left', 'right']) for (let j = 0; j < 5; j++) offer('move', direction);
        offer('home'); for (const id of s.team) offer('leadField', id);
      } else {
        for (const kind of ['attack', 'attack', 'skill', 'guard', 'soothe', 'heal', 'capture', 'capture', 'farewell', 'leave', 'home']) offer(kind);
        for (const id of s.team) offer('switch', id);
      }
      assert(candidates.length > 0); const choice = candidates[pick(candidates.length)];
      const command = send(s, choice.kind, choice.arg); fuzz.accepted++;
      fuzz.actions[choice.kind] = (fuzz.actions[choice.kind] || 0) + 1; fuzz.phaseVisits[s.phase]++;
      if (i % 19 === 0) { reject(s, command); deny(s, 'invalid-fuzz-action'); fuzz.rejected += 2; }
      if (i % 73 === 0 || i === fuzz.commandsPerSeed - 1) { assert.deepEqual(restore(checkpoint(s)), s); fuzz.checkpoints++; }
    }
    for (const key of Object.keys(fuzz.aggregateGameplayOutcomes)) fuzz.aggregateGameplayOutcomes[key] += s.stats[key];
  }
  assert(fuzz.phaseVisits.encounter > 0); assert(fuzz.aggregateGameplayOutcomes.captures > 0); assert(fuzz.aggregateGameplayOutcomes.failedCaptures > 0);
  return fuzz;
});

const failed = tests.filter(t => t.status === 'failed');
const weakRegressionTests = tests.filter(t => t.name.includes('(regression)'));
const report = {
  generatedAt: new Date().toISOString(), command: 'node scripts/test_feather_v2.mjs',
  scope: 'Independent v2 model only. Not browser, visual, device, audio, deployment, or human-play QA.',
  model: {path: 'versions/v2/games/feather/model.mjs', sha256: sha('versions/v2/games/feather/model.mjs'), saveKey: SAVE_KEY},
  passed: failed.length === 0, summary: {tests: tests.length, passed: tests.length - failed.length, failed: failed.length, acceptedCommands, rejectedCommands, invariantChecks, ordinaryInputTests: tests.filter(t => t.mode === 'ordinary_input').length, isolatedFixtures: tests.filter(t => t.mode === 'isolated_fixture').length, staticChecks: tests.filter(t => t.mode === 'static_read_only').length},
  provenance: {
    ordinaryInput: 'All scenario states are created with createGame(seed), then changed only through input with current revisions. Collected-partner setup replays the full ordinary-input collection campaign.',
    isolatedFixtures: 'Exactly two named fixture tests directly change copied combat fields: probability clamp boundaries and exact-last-day capture. These do not count as full gameplay runs.',
    failureDisclosure: 'Gameplay capture failures and a real full-team defeat are recorded below even when the corresponding tests pass. Assertion failures, if any, keep passed=false and exit code 1.',
    legacy: {referenceFilesUnchanged: Object.entries(legacyHashes).every(([file, hash]) => sha(file) === hash), hashes: legacyHashes, limitation: 'This subtest hashes the available original reference files, or unchanged legacy runtime paths in a full checkout and did not execute the legacy harness. A separate baseline run completed the original legacy harness with all 33 groups passing; see docs/feather-v2-qa/legacy-model-baseline.log. No live deployed v1 was inspected.'},
    browser: {run: false, reason: 'Task explicitly excludes local Chromium due to known socket denial. No substitute browser pass is claimed.'},
  },
  findings: [{id: 'FEATHER-V2-001', severity: 'medium', title: 'Observation incorrectly consumed next-incoming-attack weakness', initialObservation: 'Before the developer fix: depart, right, right, up, up, right, skill, guard changed weak 1 -> 0 on observation; subsequent heavy intent was 12 rather than 6. No state mutation was needed.', resolution: 'The implementation now decrements weakness only on actual incoming attacks, excluding observation turns.', status: weakRegressionTests.every(t => t.status === 'passed') ? 'fixed-and-regression-passed' : 'regression-failed', regressionTests: weakRegressionTests.map(t => t.name)}],
  tests, captureAttempts, scenarios, fuzz,
  limitations: ['No browser/UI click, keyboard/touch, responsive layout, screen reader, screenshot or network/storage availability validation in this report.', 'Model invariants and deterministic random campaigns are finite tests, not a proof for every possible command sequence.', 'Same seed plus the same commands yields the same future roll. Alternate legal actions may intentionally change capture probability; that is distinct from refresh rerolling.'],
};
fs.mkdirSync(path.dirname(reportPath), {recursive: true});
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
if (collected) fs.writeFileSync(path.join(root, 'docs/feather-v2-qa/ordinary-campaign.json'), `${JSON.stringify(checkpoint(collected), null, 2)}\n`);
console.log(JSON.stringify({passed: report.passed, summary: report.summary, failures: failed.map(t => ({name: t.name, error: t.error})), report: path.relative(root, reportPath)}, null, 2));
if (failed.length) process.exitCode = 1;
