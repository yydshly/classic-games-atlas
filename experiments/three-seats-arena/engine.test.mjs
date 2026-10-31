import assert from 'node:assert/strict';
import { createGame, setOrder, setOpponentPlan, start, pause, step, checkpoint, restore, FIGHTERS, STEP } from './engine.mjs';

const run = (order, policy, opponent = 'tide', seconds = 100) => {
  const g = createGame(); assert(setOrder(g, order)); assert(setOpponentPlan(g, opponent)); assert(start(g));
  for (let i = 0; i < seconds / STEP && !['won', 'lost'].includes(g.status); i++) {
    const p = g.actors.player, e = g.actors.enemy, gap = e.x - p.x;
    const incoming = e.phase === 'startup' && gap < FIGHTERS[e.id][e.move].reach + 4 && e.elapsed > .05;
    const guard = policy === 'measured' && incoming;
    step(g, policy === 'idle' ? {} : { right: gap > FIGHTERS[p.id].light.reach - 8 && !guard,
      guard, light: p.phase === 'idle' && gap <= FIGHTERS[p.id].light.reach + 5 && !guard }, STEP);
  }
  return g;
};

const ready = createGame();
assert.equal(ready.status, 'ready');
assert.equal(setOrder(ready, ['swift', 'swift', 'anchor']), false);
assert.equal(setOrder(ready, ['anchor', 'reach', 'swift']), true);
assert.equal(setOpponentPlan(ready, 'rush'), true);
assert.deepEqual(ready.enemyOrder, ['swift', 'anchor', 'reach']);
assert.deepEqual(ready.teams.enemy.map(f => f.hp), ready.enemyOrder.map(id => FIGHTERS[id].maxHp));
assert.equal(setOpponentPlan(ready, 'unknown'), false);
assert.deepEqual(ready.teams.player.map(f => f.id), ready.order);
assert.equal(start(ready), true);
assert.equal(setOrder(ready, ['swift', 'reach', 'anchor']), false);
assert.equal(setOpponentPlan(ready, 'tide'), false);
assert.equal(pause(ready), true); const frozen = checkpoint(ready);
step(ready, { light: true }, STEP); assert.deepEqual(checkpoint(ready), frozen);
const loaded = restore(frozen); assert(loaded && loaded.status === 'paused');
assert.equal(pause(loaded), true); assert.equal(loaded.status, 'running');
assert.equal(restore({ ...frozen, enemyOrder: ['swift', 'reach', 'anchor'] }), null);
assert.equal(restore({ ...frozen, teams: { ...frozen.teams, player: [{ ...frozen.teams.player[0], hp: 999 }, ...frozen.teams.player.slice(1)] } }), null);
const oldSave = checkpoint(createGame()); delete oldSave.departed;
assert(restore(oldSave), 'default-plan version-one saves remain readable');
console.log('PASS setup, order uniqueness, active order lock, pause freeze, restore and malformed-save rejection');

const undefended = createGame(); start(undefended);
const defended = createGame(); start(defended);
for (let i = 0; i < 8 / STEP; i++) { step(undefended, {}, STEP); step(defended, { guard: true }, STEP); }
assert(defended.teams.player[0].hp > undefended.teams.player[0].hp);
assert(defended.teams.player[0].hp < FIGHTERS.swift.maxHp);
assert.equal(undefended.teams.enemy[0].hp, FIGHTERS.reach.maxHp);
console.log('PASS guard reduces but does not erase damage; doing nothing does not defeat an opponent');

const seat = createGame(); start(seat);
for (let i = 0; i < 1000 && seat.status !== 'between'; i++) step(seat, {}, STEP);
assert.equal(seat.status, 'between'); assert.equal(seat.departed.length, 1);
const resumedSeat = restore(checkpoint(seat));
assert.equal(resumedSeat.status, 'paused'); assert.equal(resumedSeat.resumeStatus, 'between');
assert.deepEqual(resumedSeat.departed, seat.departed);
pause(resumedSeat);
for (let i = 0; i < 70; i++) step(resumedSeat, {}, STEP);
assert.equal(resumedSeat.status, 'running'); assert.deepEqual(resumedSeat.departed, []);
console.log('PASS visible retreat survives pause/restore and clears before next exchange');

const heavy = createGame(); start(heavy);
heavy.actors.enemy.x = heavy.actors.player.x + 82; // Unit fixture for startup/hit timing, not a claimed playable route.
step(heavy, { heavy: true }, STEP);
assert.equal(heavy.teams.enemy[0].hp, FIGHTERS.reach.maxHp);
assert.equal(heavy.actors.player.phase, 'startup');
for (let i = 0; i < 20; i++) step(heavy, {}, STEP);
assert(heavy.teams.enemy[0].hp < FIGHTERS.reach.maxHp);
const firstHitHp = heavy.teams.enemy[0].hp;
for (let i = 0; i < 35; i++) step(heavy, {}, STEP);
assert.equal(heavy.teams.enemy[0].hp, firstHitHp);
console.log('PASS heavy startup is visible before damage and each press hits at most once');

const idle = run(['swift', 'reach', 'anchor'], 'idle');
assert.equal(idle.status, 'lost'); assert.equal(idle.active.player, 3);
const first = run(['swift', 'reach', 'anchor'], 'measured');
const second = run(['anchor', 'reach', 'swift'], 'measured');
for (const g of [first, second]) {
  assert.equal(g.status, 'won'); assert.equal(g.active.enemy, 3);
  assert.equal(g.teams.enemy.every(f => f.hp === 0), true);
  assert.equal(restore(checkpoint(g)).status, 'won');
}
const wonSave = checkpoint(first);
assert.equal(restore({ ...wonSave, actors: { ...wonSave.actors, enemy: null } }), null);
assert.notDeepEqual(first.teams.player.map(f => f.hp), second.teams.player.map(f => f.hp));
const tideReach = run(['reach', 'swift', 'anchor'], 'measured', 'tide');
const rushSwift = run(['swift', 'reach', 'anchor'], 'measured', 'rush');
const rushReach = run(['reach', 'swift', 'anchor'], 'measured', 'rush');
assert.equal(tideReach.status, 'won');
assert.equal(rushSwift.status, 'won');
assert.equal(rushReach.status, 'lost');
console.log('PASS two ordinary-control orders win with different remaining health; idle loses');
console.log(JSON.stringify({ first: { seconds: first.tick * STEP, playerHp: first.teams.player.map(f => f.hp) },
  second: { seconds: second.tick * STEP, playerHp: second.teams.player.map(f => f.hp) },
  tideReach: { seconds: tideReach.tick * STEP, playerHp: tideReach.teams.player.map(f => f.hp) },
  rushSwift: { seconds: rushSwift.tick * STEP, playerHp: rushSwift.teams.player.map(f => f.hp) },
  rushReach: { seconds: rushReach.tick * STEP, playerHp: rushReach.teams.player.map(f => f.hp) },
  idle: { seconds: idle.tick * STEP, playerHp: idle.teams.player.map(f => f.hp) } }));
