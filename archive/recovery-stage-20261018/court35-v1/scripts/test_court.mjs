import assert from 'node:assert/strict';
import { createGame, start, pause, resume, retry, step, action, snapshot, shootingInfo, LEVELS, FIXED_DT } from '../games/court/engine.mjs';

// Deterministic engine simulations, not browser or visual acceptance tests.
let checks = 0;
function test(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
function advance(s, ticks, controls = {}) { for (let i = 0; i < ticks; i++) step(s, FIXED_DT, controls); }
function invariant(s) {
  assert.equal(s.players.length, 4);
  assert.ok(s.controlled === 0 || s.controlled === 1);
  assert.ok(s.time >= 0 && Number.isFinite(s.time));
  assert.ok(s.score.every(n => Number.isInteger(n) && n >= 0));
  assert.ok(Number.isFinite(s.ball.x) && Number.isFinite(s.ball.y) && Number.isFinite(s.ball.z));
  for (const p of s.players) { assert.ok(p.x >= 30 && p.x <= 970 && p.y >= 30 && p.y <= 530); assert.ok(Number.isFinite(p.vx) && Number.isFinite(p.vy)); }
  const holders = s.players.filter(p => p.hasBall);
  if (s.ball.owner === null) assert.equal(holders.length, 0);
  else { assert.equal(holders.length, 1); assert.equal(holders[0].id, s.ball.owner); assert.equal(s.ball.mode, 'held'); }
}
function arrangeShot(distance) {
  const s = start(createGame()); s.players[0].x = 930 - distance; s.players[0].y = 280;
  s.players[1].x = 500; s.players[1].y = 450;
  s.players[2].x = 180; s.players[2].y = 80; s.players[3].x = 180; s.players[3].y = 480;
  return s;
}
const directionKey = delta => Math.abs(delta) < 5 ? 0 : Math.sign(delta);
function assertUIControls(controls) {
  assert.ok([-1, 0, 1].includes(controls.x)); assert.ok([-1, 0, 1].includes(controls.y));
  assert.equal(typeof controls.shoot, 'boolean');
}
function pilot(s, tick) {
  const p = s.players[s.controlled], b = s.ball; let tx = p.x, ty = p.y, shoot = false;
  if (b.owner === p.id) {
    const info = shootingInfo(s); tx = 875; ty = p.y < 280 ? 160 : 400;
    if (s.charging) shoot = s.charge < 0.65;
    else if ((info.distance < 200 && info.chance > 0.42 && p.hold > 0.3) || s.shotClock < 3) shoot = true;
    else if (info.contest > 0.65 && p.hold > 1) action(s, 'pass');
  } else if (b.mode === 'loose') { tx = b.x; ty = b.y; }
  else if (b.owner !== null && s.players[b.owner].team === 1) {
    const owner = s.players[b.owner]; tx = owner.x - 25; ty = owner.y;
    if (Math.hypot(p.x - owner.x, p.y - owner.y) < 60) action(s, 'steal');
  } else { tx = 780; ty = 400; }
  return { x: directionKey(tx - p.x), y: directionKey(ty - p.y), shoot };
}
// The winning-evidence replay uses the same discrete wing strategy as the
// ordinary-play campaign. It never changes score, player locations, RNG,
// clocks, possession, difficulty, or shot outcomes. Every user shot holds the
// UI-mappable shoot input for 32 ticks (~0.533 s) before releasing, including
// the engine's real charge movement slowdown.
function winningPilot(s) { return pilot(s, s.tick); }

test('eight authored levels, supported match durations, unique seeds', () => {
  assert.equal(LEVELS.length, 8); assert.equal(new Set(LEVELS.map(x => x.seed)).size, 8);
  LEVELS.forEach(l => { assert.ok(l.duration >= 75 && l.duration <= 90); assert.ok(l.title && l.brief && l.tip && l.opponent && l.theme); });
});
test('ready, pause, resume and retry preserve state correctly', () => {
  const s = createGame(4), initial = snapshot(s); advance(s, 60, { x: 1 }); assert.deepEqual(s, initial);
  start(s); advance(s, 30, { x: 1 }); assert.ok(s.elapsed > 0); pause(s); const paused = snapshot(s);
  advance(s, 60, { shoot: true }); action(s, 'shoot'); assert.deepEqual(s, paused);
  resume(s); advance(s, 2); assert.ok(s.elapsed > paused.elapsed);
  retry(s); assert.deepEqual(s, createGame(4));
});
test('60 Hz stepping is independent of 30/60 Hz caller frames', () => {
  const a = start(createGame()), b = start(createGame());
  for (let n = 0; n < 180; n++) step(a, 1 / 60, { x: 0.7, y: -0.3 });
  for (let n = 0; n < 90; n++) step(b, 1 / 30, { x: 0.7, y: -0.3 });
  assert.deepEqual(a, b);
});
test('movement is bounded, diagonal is normalized and invalid inputs are safe', () => {
  const s = start(createGame()); advance(s, 400, { x: 999, y: -999 }); invariant(s);
  step(s, 1 / 60, { x: Infinity, y: NaN }); step(s, NaN); step(s, -1); invariant(s);
});
test('pass transfers possession and control to teammate', () => {
  const s = start(createGame()); Object.assign(s.players[0], { x: 300, y: 150 }); Object.assign(s.players[1], { x: 450, y: 150 });
  Object.assign(s.players[2], { x: 850, y: 450 }); Object.assign(s.players[3], { x: 900, y: 450 });
  action(s, 'pass'); assert.equal(s.ball.mode, 'pass'); advance(s, 20);
  assert.equal(s.ball.owner, 1); assert.equal(s.controlled, 1); assert.equal(s.stats.passes[0], 1); invariant(s);
});
test('release timing, defensive contest and range change shot chance', () => {
  const s = arrangeShot(200), good = shootingInfo(s, s.players[0], 0.65), poor = shootingInfo(s, s.players[0], 0.05);
  assert.ok(good.chance > poor.chance);
  s.players[2].x = s.players[0].x + 40; s.players[2].y = 280; assert.ok(shootingInfo(s).chance < good.chance);
  assert.equal(shootingInfo(arrangeShot(80)).layup, true); assert.equal(shootingInfo(arrangeShot(280)).points, 3);
});
test('two-point and three-point shot values are fixed at release', () => {
  for (const [distance, points] of [[80, 2], [280, 3]]) {
    const s = arrangeShot(distance); action(s, 'shoot'); assert.equal(s.ball.points, points); const made = s.ball.made;
    const frames = Math.ceil(s.ball.duration * 60) + 1; advance(s, frames);
    assert.equal(s.score[0], made ? points : 0); assert.equal(s.stats.shots[0], 1); invariant(s);
  }
});
test('holding then releasing charges a real shot', () => {
  const s = arrangeShot(180); advance(s, 32, { shoot: true }); assert.ok(s.charge > 0.60 && s.charge < 0.70); assert.equal(s.charging, true);
  step(s, 1 / 60, { shoot: false }); assert.equal(s.ball.mode, 'shot'); assert.equal(s.charging, false);
});
test('pause paths cancel charging without a spontaneous resume shot', () => {
  // Pause button, help overlay and window blur all call the same pause API.
  for (const source of ['pause button', 'help overlay', 'window blur']) {
    const s = arrangeShot(180); advance(s, 22, { shoot: true }); assert.ok(s.charging, source);
    if (source === 'pause button') action(s, 'pause'); else pause(s);
    assert.equal(s.charging, false); assert.equal(s.charge, 0); assert.equal(s.lastShoot, false);
    const frozen = snapshot(s); advance(s, 30); assert.deepEqual(s, frozen);
    resume(s); advance(s, 2, { shoot: false }); assert.equal(s.stats.shots[0], 0); assert.equal(s.ball.mode, 'held');
  }
});
test('passes can be intercepted without awarding points', () => {
  const s = start(createGame());
  Object.assign(s.players[0], { x: 300, y: 280 }); Object.assign(s.players[1], { x: 600, y: 280 });
  Object.assign(s.players[2], { x: 450, y: 280 }); Object.assign(s.players[3], { x: 900, y: 450 });
  action(s, 'pass'); advance(s, 35); assert.equal(s.stats.steals[1], 1); assert.equal(s.stats.turnovers[0], 1);
  assert.equal(s.ball.owner, 2); assert.deepEqual(s.score, [0, 0]); invariant(s);
});
test('missed shots create collectable rebounds while the game clock runs', () => {
  const s = arrangeShot(180); s.rng = 100000; action(s, 'shoot'); assert.equal(s.ball.made, false);
  let sawLoose = false;
  for (let n = 0; n < 240 && s.stats.rebounds[0] + s.stats.rebounds[1] === 0; n++) {
    const p = s.players[s.controlled], b = s.ball, d = Math.hypot(b.x - p.x, b.y - p.y);
    step(s, FIXED_DT, b.mode === 'loose' && d ? { x: (b.x - p.x) / d, y: (b.y - p.y) / d } : {});
    if (s.ball.mode === 'loose') sawLoose = true; invariant(s);
  }
  assert.equal(sawLoose, true); assert.equal(s.stats.rebounds[0] + s.stats.rebounds[1], 1);
  assert.ok(s.time < s.level.duration - 1); assert.ok(s.shotClock > 19); assert.deepEqual(s.score, [0, 0]);
});
test('loose balls bounce inside the bounds and do not stop the match clock', () => {
  const s = start(createGame()); s.players.forEach(p => p.hasBall = false);
  s.ball = { x: 969, y: 529, z: 0, vx: 220, vy: 200, vz: 0, owner: null, mode: 'loose', t: 0, lastTeam: 0, rebound: true };
  step(s, FIXED_DT); assert.equal(s.ball.x, 970); assert.equal(s.ball.y, 530); assert.ok(s.ball.vx < 0 && s.ball.vy < 0);
  advance(s, 5); assert.ok(s.ball.x <= 970 && s.ball.y <= 530); assert.ok(s.time < s.level.duration); invariant(s);
});
test('steals have a windup, cooldown and can change possession', () => {
  const s = start(createGame()); s.rng = 1;
  s.players.forEach(p => p.hasBall = p.id === 2); s.ball.owner = 2; s.possession = 1;
  Object.assign(s.players[0], { x: 430, y: 280 }); Object.assign(s.players[2], { x: 470, y: 280, windup: 2, action: 'windup' });
  Object.assign(s.players[1], { x: 80, y: 80 }); Object.assign(s.players[3], { x: 800, y: 500 });
  action(s, 'steal'); assert.equal(s.ball.owner, 2); assert.ok(s.players[0].windup > 0);
  advance(s, 12, { x: 1 }); assert.equal(s.stats.steals[0], 1); assert.equal(s.ball.owner, 0); assert.ok(s.players[0].cooldown > 0); invariant(s);
});
test('shot clock turns possession over without awarding points', () => {
  const s = start(createGame()); s.shotClock = 0.01; step(s, FIXED_DT); assert.equal(s.possession, 1); assert.deepEqual(s.score, [0, 0]);
});
test('a missed pass remains on the possession clock until turnover', () => {
  const s = start(createGame());
  Object.assign(s.players[0], { x: 200, y: 280 }); Object.assign(s.players[1], { x: 650, y: 280 });
  Object.assign(s.players[2], { x: 100, y: 40 }); Object.assign(s.players[3], { x: 100, y: 520 });
  s.shotClock = 1; action(s, 'pass'); action(s, 'switch'); advance(s, 48, { y: 1 });
  assert.equal(s.ball.mode, 'loose'); assert.equal(s.ball.rebound, false); assert.ok(s.shotClock < 0.21);
  advance(s, 57, { y: 1 }); assert.equal(s.possession, 1); assert.equal(s.stats.turnovers[0], 1);
  assert.ok(s.shotClock > 18); assert.deepEqual(s.score, [0, 0]); invariant(s);
});
test('ties enter overtime; ahead and behind produce win/loss', () => {
  const tie = start(createGame()); tie.time = 0.01; step(tie, FIXED_DT); assert.equal(tie.overtime, 1); assert.equal(tie.time, 20); assert.equal(tie.resetT, 0); invariant(tie);
  for (const [score, outcome] of [[[2, 0], 'won'], [[0, 3], 'lost']]) { const s = start(createGame()); s.score = score; s.time = 0.01; step(s, FIXED_DT); assert.equal(s.state, outcome); const end = snapshot(s); advance(s, 60); assert.deepEqual(s, end); }
});
test('a buzzer shot resolves before the match result', () => {
  const s = arrangeShot(80); s.time = 0.01; s.score = [0, 1]; action(s, 'shoot'); const made = s.ball.made;
  step(s, FIXED_DT); assert.equal(s.state, 'playing'); assert.equal(s.time, 0); advance(s, 45); assert.equal(s.state, made ? 'won' : 'lost');
});
test('snapshot is detached and replay is deterministic', () => {
  const a = start(createGame(7)), b = start(createGame(7));
  for (let n = 0; n < 1800; n++) { step(a, FIXED_DT, pilot(a, n)); step(b, FIXED_DT, pilot(b, n)); }
  assert.deepEqual(a, b); const copy = snapshot(a); copy.score[0] = 999; assert.notEqual(a.score[0], 999);
});
test('ordinary-play simulation completes all eight matches with invariants', () => {
  for (let level = 0; level < 8; level++) {
    const s = start(createGame(level)); let ticks = 0;
    while (s.state === 'playing' && ticks < 60 * 300) { const controls = pilot(s, ticks); assertUIControls(controls); step(s, FIXED_DT, controls); if (ticks % 60 === 0) invariant(s); ticks++; }
    assert.ok(['won', 'lost'].includes(s.state), `level ${level + 1} failed to finish`); invariant(s);
    assert.ok(s.stats.shots[0] > 0); assert.ok(s.stats.passes[0] > 0);
    console.log(`  match ${level + 1}: ${s.score.join('-')} ${s.state}, shots ${s.stats.shots.join('/')}, ${ticks} ticks`);
  }
});
test('idle-player simulations show all eight opponents can score and finish', () => {
  for (let level = 0; level < 8; level++) {
    const s = start(createGame(level)); let ticks = 0;
    while (s.state === 'playing' && ticks++ < 60 * 300) step(s, FIXED_DT);
    assert.equal(s.state, 'lost'); assert.ok(s.score[1] > 0); invariant(s);
  }
});
test('discrete-key hold/release simulation wins all eight', () => {
  for (let level = 0; level < 8; level++) {
    const s = start(createGame(level)); let ticks = 0, heldTicks = 0, releasedShots = 0;
    while (s.state === 'playing' && ticks++ < 60 * 300) {
      const controls = winningPilot(s); assertUIControls(controls);
      if (controls.shoot) heldTicks++;
      const releasing = s.charging && s.lastShoot && !controls.shoot && s.ball.owner === s.controlled;
      step(s, FIXED_DT, controls); if (releasing && s.ball.mode === 'shot') releasedShots++;
      if (ticks % 60 === 0) invariant(s);
    }
    assert.equal(s.state, 'won', `level ${level + 1} should be winnable using normal inputs`); invariant(s);
    assert.ok(heldTicks > 0 && releasedShots > 0);
    console.log(`  winning match ${level + 1}: ${s.score.join('-')}, rebounds ${s.stats.rebounds.join('/')}, shots ${s.stats.shots.join('/')}, held ticks ${heldTicks}, release shots ${releasedShots}`);
  }
});
console.log(`\n${checks} engine simulation checks passed. Browser visuals and input remain separate QA.`);
