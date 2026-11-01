import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES, SAVE_KEY, createGame, start, move, rest, useItem, battleAction, pause, resume, checkpoint, restore, intentText } from './legacy-engine.mjs';

function fight(game, policy = 'normal') {
  let actions = 0;
  while (game.status === 'battle' && actions++ < 90) {
    const actor = game.battle.actor;
    if (actor === 0) battleAction(game, 'skill');
    else if (actor === 2 && policy === 'normal' && game.party[2].mp >= 2) battleAction(game, 'skill');
    else battleAction(game, 'attack');
  }
  assert.ok(actions < 90, 'combat terminates without a hidden resource requirement');
}

function route(side, policy = 'normal') {
  const game = createGame();
  if (policy === 'empty-mp') { game.party[1].mp = 0; game.party[2].mp = 0; }
  assert.equal(start(game), true);
  const segments = side === 'upper' ? [[0, -1, 2], [1, 0, 18], [0, 1, 2]] : [[0, 1, 4], [1, 0, 18], [0, -1, 4]];
  for (const [dx, dy, count] of segments) for (let i = 0; i < count; i++) {
    assert.equal(move(game, dx, dy), true);
    if (game.status === 'battle') fight(game, policy);
  }
  return game;
}

test('upper short route is complete, risky and conserves ration', () => {
  const game = route('upper');
  assert.equal(game.status, 'won');
  assert.equal(game.steps, 22);
  assert.equal(game.stock.ration, 2);
  assert.equal(game.visited.cache, false);
  assert.equal(game.cleared.upper, true);
});

test('lower supply route is longer and spends one ration for one tonic', () => {
  const game = route('lower');
  assert.equal(game.status, 'won');
  assert.equal(game.steps, 26);
  assert.equal(game.stock.ration, 1);
  assert.equal(game.stock.tonic, 2);
  assert.equal(game.visited.bridge, true);
  assert.equal(game.cleared.lower, true);
});

test('zero MP still permits a complete route through ordinary attacks and guarding', () => {
  const game = route('upper', 'empty-mp');
  assert.equal(game.status, 'won');
  assert.equal(game.party[1].mp, 0);
  assert.equal(game.party[2].mp, 0);
  assert.ok(game.party.some(member => member.hp > 0));
});

test('camp rest has a visible finite cost and cannot waste food at full strength', () => {
  const game = createGame(); start(game);
  assert.equal(rest(game), false); assert.equal(game.stock.ration, 2);
  game.party[0].hp -= 6; game.party[1].mp -= 4;
  assert.equal(rest(game), true); assert.equal(game.stock.ration, 1);
  assert.equal(game.party[0].hp, 10); assert.equal(game.party[1].mp, 3);
  assert.equal(rest(game), true); assert.equal(game.stock.ration, 0);
  assert.equal(rest(game), false); assert.equal(game.stock.ration, 0);
});

test('bridge charges once; depleted food refuses crossing without trapping player', () => {
  const game = createGame(); start(game);
  for (let i = 0; i < 4; i++) move(game, 0, 1);
  for (let i = 0; i < 11; i++) { move(game, 1, 0); if (game.status === 'battle') fight(game); }
  assert.equal(game.pos.x, 13);
  game.stock.ration = 0;
  move(game, 1, 0); move(game, 1, 0);
  assert.equal(move(game, 1, 0), false); assert.equal(game.pos.x, 15);
  assert.equal(move(game, -1, 0), true);
  game.stock.ration = 1;
  move(game, 1, 0); move(game, 1, 0);
  assert.equal(game.stock.ration, 0);
  move(game, -1, 0); move(game, 1, 0);
  assert.equal(game.stock.ration, 0);
});

test('cache is one-use across backtracking', () => {
  const game = createGame(); start(game);
  for (let i = 0; i < 4; i++) move(game, 0, 1);
  for (let i = 0; i < 7; i++) move(game, 1, 0);
  assert.equal(game.stock.tonic, 2);
  move(game, -1, 0); move(game, 1, 0);
  assert.equal(game.stock.tonic, 2);
});

test('invalid skill and unusable items consume neither action nor supplies', () => {
  const game = createGame(); start(game);
  assert.equal(useItem(game, 'kit', 0), false); assert.equal(game.stock.kit, 1);
  for (let i = 0; i < 2; i++) move(game, 0, -1);
  for (let i = 0; i < 8; i++) move(game, 1, 0);
  assert.equal(game.status, 'battle');
  battleAction(game, 'attack');
  const actor = game.battle.actor;
  assert.equal(battleAction(game, 'skill', 1), false);
  assert.equal(game.battle.actor, actor);
  assert.equal(game.party[1].mp, HEROES[1].maxMp);
});

test('enemy intent is declared before damage and defending actually reduces it', () => {
  const game = createGame(); start(game);
  for (let i = 0; i < 2; i++) move(game, 0, -1);
  for (let i = 0; i < 8; i++) move(game, 1, 0);
  assert.match(intentText(game), /前排队员.*4/);
  battleAction(game, 'skill'); battleAction(game, 'attack'); battleAction(game, 'attack');
  assert.equal(game.party[0].hp, 10);
  assert.match(intentText(game), /后排队员.*3/);
});

test('a battle item restores its selected target and costs exactly one party action', () => {
  const game = createGame(); start(game);
  game.party[2].hp -= 5;
  for (let i = 0; i < 2; i++) move(game, 0, -1);
  for (let i = 0; i < 8; i++) move(game, 1, 0);
  assert.equal(game.status, 'battle');
  const hp = game.party[2].hp;
  assert.equal(battleAction(game, 'kit', 2), true);
  assert.equal(game.party[2].hp, hp + 5);
  assert.equal(game.stock.kit, 0);
  assert.equal(game.battle.actor, 1);
  assert.equal(battleAction(game, 'kit', 2), false);
  assert.equal(game.battle.actor, 1);
});

test('save restore pauses in-progress battle and preserves turn, resources and other key namespace', () => {
  const game = createGame(); start(game);
  for (let i = 0; i < 2; i++) move(game, 0, -1);
  for (let i = 0; i < 8; i++) move(game, 1, 0);
  battleAction(game, 'attack');
  const before = checkpoint(game);
  const restored = restore(before);
  assert.equal(restored.status, 'paused');
  assert.equal(restored.resumeStatus, 'battle');
  assert.equal(restored.battle.actor, 1);
  assert.deepEqual(restored.stock, before.stock);
  assert.equal(resume(restored), true);
  assert.equal(restored.status, 'battle');
  assert.match(SAVE_KEY, /mist-lamp-pass/);
});

test('pause is idempotent; invalid save is rejected; no result can be advanced again', () => {
  const game = createGame(); start(game);
  assert.equal(pause(game), true); assert.equal(pause(game), false);
  assert.equal(move(game, 0, -1), false);
  assert.equal(resume(game), true);
  const bad = checkpoint(game); bad.party[0].hp = -1;
  assert.equal(restore(bad), null);
  const won = route('upper');
  assert.equal(move(won, -1, 0), false);
  assert.equal(battleAction(won, 'attack'), false);
});
