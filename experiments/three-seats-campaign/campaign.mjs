import { STAGES, FIGHTERS, createGame, setOrder, start, checkpoint, restore } from './engine.mjs';

export function createCampaign() {
  return { version: 1, stage: 0, unlocked: 0, cleared: [null, null, null], game: createGame(0) };
}

export function chooseStage(c, stage) {
  if (!Number.isInteger(stage) || stage < 0 || stage > c.unlocked || stage >= STAGES.length ||
      !['ready', 'won', 'lost'].includes(c.game.status)) return false;
  c.stage = stage;
  c.game = createGame(stage);
  return true;
}

export function retryStage(c) {
  const order = [...c.game.order];
  c.game = createGame(c.stage);
  setOrder(c.game, order);
  start(c.game);
  return true;
}

export function recordWin(c) {
  if (c.game.status !== 'won' || c.cleared[c.stage]) return false;
  c.cleared[c.stage] = { order: [...c.game.order], hp: c.game.teams.player.map(f => f.hp),
    seconds: +(c.game.tick / 60).toFixed(1) };
  c.unlocked = Math.min(STAGES.length - 1, Math.max(c.unlocked, c.stage + 1));
  return true;
}

export function checkpointCampaign(c) {
  return JSON.parse(JSON.stringify({ version: 1, stage: c.stage, unlocked: c.unlocked,
    cleared: c.cleared, game: checkpoint(c.game) }));
}

export function restoreCampaign(raw) {
  try {
    if (!raw || raw.version !== 1 || !Number.isInteger(raw.stage) || !Number.isInteger(raw.unlocked) ||
        raw.stage < 0 || raw.stage >= STAGES.length || raw.unlocked < raw.stage || raw.unlocked >= STAGES.length ||
        !Array.isArray(raw.cleared) || raw.cleared.length !== STAGES.length) return null;
    const validResult = (item) => item && Array.isArray(item.order) && item.order.length === 3 &&
      new Set(item.order).size === 3 && item.order.every(id => FIGHTERS[id]) &&
      Array.isArray(item.hp) && item.hp.length === 3 && item.hp.every((hp, i) => Number.isInteger(hp) && hp >= 0 && hp <= FIGHTERS[item.order[i]].maxHp) &&
      Number.isFinite(item.seconds) && item.seconds >= 0 && item.seconds <= 3600;
    if (raw.cleared.some((item, i) => (item !== null && !validResult(item)) || (i < raw.unlocked && item === null))) return null;
    const game = restore(raw.game);
    if (!game || game.scenario !== raw.stage || (game.status === 'won' && !raw.cleared[raw.stage])) return null;
    return { version: 1, stage: raw.stage, unlocked: raw.unlocked, cleared: raw.cleared, game };
  } catch { return null; }
}
