import assert from 'node:assert/strict';
import { Game, LEVELS, LIMIT, DT } from '../versions/v2/games/paper/engine.mjs';

function finish(game) {
  let allDownAt = null;
  let maximumBodies = game.world.getBodyCount();
  let steps = 0;
  while (game.state === 'flight' && steps++ < 7500) {
    game.step();
    maximumBodies = Math.max(maximumBodies, game.world.getBodyCount());
    if (!allDownAt && game.items.filter(item => item.kind === 'target').every(item => item.down)) {
      allDownAt = { state: game.state, tick: game.tick, quiet: game.quiet };
    }
  }
  assert.notEqual(game.state, 'flight', 'Flight must resolve within the bounded simulation');
  assert.notEqual(game.state, 'timeout', 'Ordinary shots must settle, not use a timeout as an outcome');
  assert.ok(maximumBodies <= 24);
  return { state: game.state, shots: game.shots, seconds: game.shotAge,
    quiet: game.quiet, broken: game.broken, down: game.items.filter(item => item.down).length,
    allDownAt, maximumBodies };
}

assert.equal(LEVELS.length, 2);
assert.equal(LIMIT, 3);
const results = { idle: [], routes: [], sweep: {}, contact: {} };
for (let level = 0; level < LEVELS.length; level++) {
  const game = new Game(level);
  game.start();
  const initial = game.items.map(item => ({ id: item.id, x: item.body.getPosition().x, y: item.body.getPosition().y }));
  for (let i = 0; i < 1200; i++) game.step();
  assert.equal(game.broken, 0);
  assert.ok(game.items.every(item => !item.down));
  assert.equal(game.events.length, 0, 'Resting contact must not emit impact effects');
  for (const item of game.items) {
    const original = initial.find(entry => entry.id === item.id);
    assert.ok(Math.abs(item.body.getPosition().x - original.x) < .08);
    assert.ok(Math.abs(item.body.getPosition().y - original.y) < .35);
  }
  results.idle.push({ level, seconds: game.tick * DT, bodies: game.world.getBodyCount(), events: game.events.length });
  const route = level ? [40, 24] : [18, 45];
  game.launch(...route);
  for (let i = 0; i < 30; i++) game.step();
  game.pause();
  const paused = JSON.stringify({ snapshot: game.snapshot(), events: game.events });
  for (let i = 0; i < 600; i++) game.step();
  assert.equal(JSON.stringify({ snapshot: game.snapshot(), events: game.events }), paused);
  game.resume();
  const win = finish(game);
  assert.equal(win.state, 'won');
  assert.ok(win.quiet > .85);
  assert.equal(win.allDownAt.state, 'flight', 'Win must wait until the collapse settles');
  results.routes.push({ level, route, afterIdle: true, ...win });

  const lastShot = new Game(level);
  lastShot.start();
  for (let i = 0; i < 2; i++) {
    assert.ok(lastShot.launch(75, 15));
    assert.equal(finish(lastShot).state, 'aim');
  }
  lastShot.launch(...route);
  const third = finish(lastShot);
  assert.equal(third.state, 'won');
  assert.equal(third.shots, 3);
  assert.equal(third.allDownAt.state, 'flight');
  assert.ok(lastShot.tick > third.allDownAt.tick);
  assert.equal(lastShot.launch(...route), false);
  results.routes.push({ level, route, finalShot: true, ...third });

  const misses = new Game(level);
  misses.start();
  for (let i = 0; i < 3; i++) {
    misses.launch(75, 15);
    assert.equal(finish(misses).state, i === 2 ? 'lost' : 'aim');
  }
}

// The normal arc crosses the wall and first contacts the upper paper support.
const arc = new Game(1);
arc.start();
let firstStructureHit = null;
arc.world.on('post-solve', contact => {
  const items = [contact.getFixtureA().getBody().getUserData(), contact.getFixtureB().getBody().getUserData()];
  if (!items.some(item => item?.kind === 'shot')) return;
  const other = items.find(item => item && item.kind !== 'shot');
  if (other && !firstStructureHit) firstStructureHit = { id: other.id, kind: other.kind, material: other.material, y: other.start.y };
});
arc.launch(40, 24);
const arcResult = finish(arc);
assert.equal(arcResult.state, 'won');
assert.deepEqual(firstStructureHit, { id: 4, kind: 'block', material: 'paper', y: 3.85 });
results.routes.push({ level: 1, route: [40, 24], firstStructureHit, ...arcResult });

// A forceful low shot creates a genuine visible impact but cannot bypass the wall.
for (const power of [45, 100]) {
  const game = new Game(1);
  game.start();
  game.launch(18, power);
  const result = finish(game);
  assert.equal(result.state, 'aim');
  assert.equal(result.down, 0);
  assert.equal(result.broken, 0);
  const impact = game.events.find(event => event.type === 'impact' && event.kind === 'obstacle');
  assert.ok(impact?.impulse > .65);
  assert.ok(Number.isFinite(impact.x) && Number.isFinite(impact.y));
  assert.equal(impact.material, 'wood');
  results.routes.push({ level: 1, route: [18, power], wallImpact: impact, ...result });
}

// Wall-side contact keeps flight damping; only true floor contact enables rolling resistance.
const damping = new Game(1);
damping.start();
damping.launch(18, 45);
let wallDampingChecked = false;
let groundDampingChecked = false;
for (let i = 0; i < 1200 && damping.state === 'flight'; i++) {
  const body = damping.activeShot.body;
  let touchingWall = false;
  let touchingGround = false;
  for (let edge = body.getContactList(); edge; edge = edge.next) {
    if (!edge.contact.isTouching() || !edge.other.isStatic()) continue;
    if (edge.other.getUserData()?.kind === 'obstacle') touchingWall = true;
    if (!edge.other.getUserData()) touchingGround = true;
  }
  damping.step();
  if (touchingWall && !touchingGround) {
    assert.equal(body.getLinearDamping(), .045);
    assert.equal(body.getAngularDamping(), .08);
    wallDampingChecked = true;
  }
  if (touchingGround) {
    assert.equal(body.getLinearDamping(), .8);
    assert.equal(body.getAngularDamping(), 1.2);
    groundDampingChecked = true;
  }
}
assert.ok(wallDampingChecked && groundDampingChecked);
results.damping = { wallDampingChecked, groundDampingChecked };

for (const event of arc.events.filter(event => event.type === 'break')) {
  assert.ok(['paper', 'wood'].includes(event.material));
  assert.ok(event.w > 0 && event.h > 0 && Number.isFinite(event.angle));
}
const lastImpact = new Map();
for (const event of arc.events.filter(event => event.type === 'impact')) {
  if (lastImpact.has(event.id)) assert.ok((event.tick - lastImpact.get(event.id)) * DT >= .12 - 1e-8);
  lastImpact.set(event.id, event.tick);
}
const deterministic = new Game(1);
deterministic.start();
deterministic.launch(40, 24);
finish(deterministic);
assert.deepEqual(deterministic.snapshot(), arc.snapshot());
assert.deepEqual(deterministic.events, arc.events);
const bounded = new Game();
for (let i = 0; i < 1000; i++) bounded.emit({ type: 'impact', id: 1, impulse: 1 });
assert.equal(bounded.events.length, 128);
assert.equal(bounded.events.at(-1).serial, 1000);
results.contact = { deterministic: true, maxEvents: bounded.events.length,
  genuineArcImpacts: arc.events.filter(event => event.type === 'impact').length,
  debrisMaterials: [...new Set(arc.events.filter(event => event.type === 'break').map(event => event.material))] };

for (const [angle, power, expected] of [[-10, -10, 11.6], [999, 999, 32]]) {
  const game = new Game();
  game.start();
  game.launch(angle, power);
  assert.ok(Math.abs(game.activeShot.body.getLinearVelocity().length() - expected) < 1e-9);
  const radians = Math.atan2(game.activeShot.body.getLinearVelocity().y, game.activeShot.body.getLinearVelocity().x);
  assert.ok(Math.abs(radians * 180 / Math.PI - (angle < 0 ? 12 : 75)) < 1e-9);
}
for (let level = 0; level < 2; level++) {
  const states = {};
  let longestSeconds = 0;
  for (const angle of [12, 18, 25, 35, 40, 45, 60, 75]) {
    for (const power of [15, 24, 25, 35, 45, 60, 80, 100]) {
      const game = new Game(level);
      game.start();
      game.launch(angle, power);
      const result = finish(game);
      states[result.state] = (states[result.state] || 0) + 1;
      longestSeconds = Math.max(longestSeconds, result.seconds);
      assert.ok(game.events.length <= 128);
    }
  }
  results.sweep[level] = { states, longestSeconds };
}
console.log(JSON.stringify(results, null, 2));
