import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from './engine.mjs';
import * as first from './legacy-engine.mjs';

function fight(g, policy = 'normal') {
  let actions = 0;
  while (g.status === 'battle' && actions++ < 100) {
    const actor = g.battle.actor;
    const target = g.party.findIndex((member, i) => member.hp > 0 && member.hp <= game.HEROES[i].maxHp - 5);
    if (actor === 1 && target >= 0 && g.party[1].mp >= 2 && policy === 'normal') game.battleAction(g, 'skill', target);
    else game.battleAction(g, actor === 0 ? 'skill' : actor === 2 && g.party[2].mp >= 2 && policy === 'normal' ? 'skill' : 'attack');
  }
  assert.ok(actions < 100, 'finite combat with legal actions');
}
function walk(g, dx, dy, n, policy = 'normal') {
  for (let i = 0; i < n; i++) {
    assert.equal(game.move(g, dx, dy), true, `step ${i + 1} of ${n} in region ${g.region}: ${g.message}`);
    if (g.status === 'battle') fight(g, policy);
    assert.notEqual(g.status, 'lost');
  }
}
function firstRegion(g, side = 'upper', policy = 'normal') {
  assert.equal(game.start(g), true);
  if (side === 'upper') { walk(g, 0, -1, 2, policy); walk(g, 1, 0, 18, policy); walk(g, 0, 1, 2, policy); }
  else { walk(g, 0, 1, 4, policy); walk(g, 1, 0, 18, policy); walk(g, 0, -1, 4, policy); }
  assert.equal(g.status, 'stageClear');
  return g;
}
function archive(g, side = 'ward', policy = 'normal') {
  assert.equal(game.advanceRegion(g), true);
  if (side === 'ward') {
    if (g.party[2].mp < 2) assert.equal(game.useItem(g, 'tonic', 2), true);
    walk(g, 0, -1, 2, policy); walk(g, 1, 0, 7, policy);
    assert.equal(game.canOpenWard(g), true);
    assert.equal(game.interact(g), true);
    walk(g, 1, 0, 11, policy); walk(g, 0, 1, 2, policy);
  } else { walk(g, 0, 1, 4, policy); walk(g, 1, 0, 18, policy); walk(g, 0, -1, 4, policy); }
  assert.equal(g.status, 'stageClear');
  return g;
}
function finalRegion(g, policy = 'normal') {
  assert.equal(game.advanceRegion(g), true);
  game.interact(g); // finite paid rest or, if no ration, one-time emergency shelter
  walk(g, 1, 0, 18, policy);
  assert.equal(g.status, 'won');
  return g;
}

test('short upper + ward + direct main lamp completes with carried resources', () => {
  const g = finalRegion(archive(firstRegion(game.createGame(), 'upper'), 'ward'));
  assert.equal(g.results[0].steps, 22);
  assert.equal(g.results[1].steps, 22);
  assert.equal(g.results[2].steps, 18);
  assert.equal(g.stock.ration, 1);
  assert.equal(g.stock.tonic, 0);
  assert.equal(g.visited.ward, true);
  assert.equal(g.regionsCleared.every(Boolean), true);
});

test('long lower routes complete with a different carried kit and tonic budget', () => {
  const g = finalRegion(archive(firstRegion(game.createGame(), 'lower'), 'lower'));
  assert.equal(g.results[0].steps, 26);
  assert.equal(g.results[1].steps, 26);
  assert.equal(g.stock.ration, 0);
  assert.equal(g.stock.tonic, 2);
  assert.equal(g.stock.kit, 2);
  assert.equal(g.visited.cache && g.visited.bridge && g.visited.archiveCache, true);
});

test('archive ward rejects zero MP without cost; lower route remains available', () => {
  const g = firstRegion(game.createGame(), 'upper'); game.advanceRegion(g);
  g.party[2].mp = 0; g.stock.tonic = 0;
  walk(g, 0, -1, 2); walk(g, 1, 0, 7);
  const before = game.checkpoint(g);
  assert.equal(game.interact(g), false);
  assert.equal(game.move(g, 1, 0), false);
  assert.equal(g.party[2].mp, 0); assert.equal(g.stock.tonic, 0);
  assert.deepEqual(g.pos, before.pos);
  walk(g, -1, 0, 7); walk(g, 0, 1, 6); walk(g, 1, 0, 18); walk(g, 0, -1, 4);
  assert.equal(g.status, 'stageClear');
});

test('archive kit stays behind its guard and is claimed once by stepping past it', () => {
  const g = firstRegion(game.createGame(), 'upper'); game.advanceRegion(g);
  walk(g, 0, 1, 4); walk(g, 1, 0, 10);
  const kits = g.stock.kit;
  assert.equal(g.cleared.archive, false);
  assert.equal(g.visited.archiveCache, false);
  game.move(g, 1, 0);
  assert.equal(g.status, 'battle'); assert.equal(g.stock.kit, kits);
  fight(g);
  assert.equal(g.stock.kit, kits);
  game.move(g, 1, 0);
  assert.equal(g.stock.kit, kits + 1);
  game.move(g, -1, 0); game.move(g, 1, 0);
  assert.equal(g.stock.kit, kits + 1);
});

test('stage-one cache lies beyond bridge and enemy, so detouring cannot claim free tonic', () => {
  const g = game.createGame(); game.start(g);
  walk(g, 0, 1, 4); walk(g, 1, 0, 7);
  assert.equal(g.stock.tonic, 1);
  walk(g, 1, 0, 6);
  assert.equal(g.cleared.lower, true); assert.equal(g.stock.tonic, 1);
  walk(g, 1, 0, 4);
  assert.equal(g.stock.ration, 1); assert.equal(g.stock.tonic, 2);
  walk(g, -1, 0, 1); walk(g, 1, 0, 1);
  assert.equal(g.stock.tonic, 2);
});

test('observatory detours are dead ends and their supplies require declared costs', () => {
  const g = archive(firstRegion(game.createGame(), 'upper'), 'ward'); game.advanceRegion(g);
  walk(g, 1, 0, 6); walk(g, 0, -1, 3);
  walk(g, 1, 0, 2);
  const ration = g.stock.ration;
  walk(g, 1, 0, 1); assert.equal(g.stock.ration, ration - 1);
  walk(g, 1, 0, 2); assert.equal(g.stock.tonic, 1);
  assert.equal(game.move(g, 0, 1), false, 'far end cannot bypass hatch from central corridor');
  walk(g, -1, 0, 5); walk(g, 0, 1, 6);
  walk(g, 1, 0, 3); assert.equal(g.cleared.south, true);
  walk(g, 1, 0, 2); assert.equal(g.stock.kit, 2);
});

test('emergency shelter is once per later region, finite, and zero MP still has an exit', () => {
  const g = archive(firstRegion(game.createGame(), 'upper'), 'ward'); game.advanceRegion(g);
  g.stock.ration = 0; g.stock.tonic = 0; g.stock.kit = 0;
  g.party.forEach(p => { p.hp = 1; p.mp = 0; });
  assert.equal(game.interact(g), true);
  assert.deepEqual(g.party.map(p => p.hp), [8, 8, 8]);
  assert.deepEqual(g.party.map(p => p.mp), [0, 2, 2]);
  assert.equal(game.interact(g), false);
  assert.equal(g.stock.ration, 0);
  walk(g, 1, 0, 18, 'physical');
  assert.equal(g.status, 'won');
});

test('current-region retry restores entry stock without erasing previous result', () => {
  const g = firstRegion(game.createGame(), 'lower'); const firstResult = JSON.stringify(g.results[0]);
  game.advanceRegion(g); const entry = game.checkpoint(g.entry);
  game.useItem(g, 'tonic', 2); walk(g, 0, 1, 4); walk(g, 1, 0, 13);
  assert.equal(g.visited.archiveCache, true);
  assert.equal(game.retryCurrentStage(g), true);
  assert.deepEqual(g.stock, entry.stock);
  assert.deepEqual(g.party, entry.party);
  assert.equal(g.visited.archiveCache, false);
  assert.equal(JSON.stringify(g.results[0]), firstResult);
  assert.equal(g.region, 1);
});

test('backtracking preserves previously cleared enemies and cannot farm their cache', () => {
  const g = firstRegion(game.createGame(), 'lower'); game.advanceRegion(g);
  assert.equal(game.backtrack(g), true); assert.equal(g.region, 0);
  assert.equal(g.cleared.lower, true); assert.equal(g.visited.cache, true);
  const tonic = g.stock.tonic;
  walk(g, 0, -1, 1); walk(g, -1, 0, 18); walk(g, 0, 1, 6); walk(g, 1, 0, 17);
  assert.equal(g.stock.tonic, tonic);
});

test('retry after returning to a prior region uses that region entry, not the later snapshot', () => {
  const g = archive(firstRegion(game.createGame(), 'lower'), 'lower');
  const archiveEntry = game.checkpoint(g.entries[1]);
  const firstResult = JSON.stringify(g.results[0]);
  game.advanceRegion(g);
  assert.equal(game.backtrack(g), true);
  assert.equal(g.region, 1);
  assert.equal(game.retryCurrentStage(g), true);
  assert.deepEqual(g.party, archiveEntry.party);
  assert.deepEqual(g.stock, archiveEntry.stock);
  assert.equal(JSON.stringify(g.results[0]), firstResult);
  assert.equal(g.results[1], null);
});

test('stage review counts only movement in that region after a backtrack', () => {
  const g = archive(firstRegion(game.createGame(), 'lower'), 'lower');
  game.advanceRegion(g);
  assert.equal(game.backtrack(g), true);
  game.move(g, 0, 1);
  assert.equal(g.status, 'stageClear');
  assert.equal(g.results[0].steps, 26);
  assert.equal(g.results[1].steps, 27);
  assert.equal(g.regionSteps[0], 26);
  assert.equal(g.regionSteps[1], 27);
});

test('final mirror exposes armor and predictable damage reduction', () => {
  const g = archive(firstRegion(game.createGame(), 'upper'), 'ward'); game.advanceRegion(g);
  for (let i = 0; i < 18; i++) game.move(g, 1, 0);
  assert.equal(g.status, 'battle'); assert.match(game.intentText(g), /镜面闭合.*全队/);
  const hp = g.battle.hp;
  game.battleAction(g, 'attack'); assert.equal(g.battle.hp, hp - 1);
  game.battleAction(g, 'attack'); game.battleAction(g, 'attack');
  assert.match(game.intentText(g), /镜面敞开.*前排/);
});

test('v2 restore pauses active battle, rejects invalid data and preserves entry snapshot', () => {
  const g = firstRegion(game.createGame(), 'upper'); game.advanceRegion(g);
  for (let i = 0; i < 4; i++) game.move(g, 0, 1);
  for (let i = 0; i < 11; i++) game.move(g, 1, 0);
  game.battleAction(g, 'attack');
  const restored = game.restore(game.checkpoint(g));
  assert.equal(restored.status, 'paused'); assert.equal(restored.resumeStatus, 'battle');
  assert.equal(restored.battle.actor, 1); assert.deepEqual(restored.entry, g.entry);
  assert.equal(game.resume(restored), true);
  const bad = game.checkpoint(g); bad.entry.stock.ration = -1;
  assert.equal(game.restore(bad), null);
});

test('valid v1 first-pass completion migrates to stage-clear without mutating source', () => {
  const old = first.createGame(); first.start(old);
  const segments = [[0, -1, 2], [1, 0, 18], [0, 1, 2]];
  for (const [dx, dy, n] of segments) for (let i = 0; i < n; i++) {
    first.move(old, dx, dy);
    while (old.status === 'battle') {
      const actor = old.battle.actor;
      first.battleAction(old, actor === 0 ? 'skill' : actor === 2 && old.party[2].mp >= 2 ? 'skill' : 'attack');
    }
  }
  assert.equal(old.status, 'won');
  const frozen = JSON.stringify(old), migrated = game.migrateLegacy(old);
  assert.equal(JSON.stringify(old), frozen);
  assert.equal(migrated.status, 'stageClear'); assert.equal(migrated.region, 0);
  assert.equal(migrated.results[0].steps, old.steps);
  assert.deepEqual(migrated.stock, old.stock); assert.deepEqual(migrated.party, old.party);
  assert.equal(game.advanceRegion(migrated), true);
  assert.equal(migrated.region, 1);
});
