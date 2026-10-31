// Three Seats: original, single-bout 3-on-3 relay. No source-game assets or rules code.
export const SAVE_KEY = 'classic-atlas.three-seats.slice1.v1';
export const STEP = 1 / 60;
export const FIGHTERS = Object.freeze({
  swift: { name: '汐', title: '近身快攻', maxHp: 76, speed: 225, color: '#63d4c5',
    light: { reach: 72, damage: 10, startup: .12, active: .10, recovery: .22 },
    heavy: { reach: 88, damage: 20, startup: .24, active: .12, recovery: .40 } },
  reach: { name: '芦', title: '中距牵制', maxHp: 88, speed: 168, color: '#e0c584',
    light: { reach: 106, damage: 11, startup: .18, active: .10, recovery: .27 },
    heavy: { reach: 138, damage: 21, startup: .33, active: .12, recovery: .48 } },
  anchor: { name: '砾', title: '守势反击', maxHp: 116, speed: 148, color: '#cc8a6e',
    light: { reach: 77, damage: 13, startup: .20, active: .10, recovery: .30 },
    heavy: { reach: 91, damage: 27, startup: .42, active: .13, recovery: .59 } }
});
export const OPPONENT_PLANS = Object.freeze([
  Object.freeze({ id: 'tide', title: '潮线阵', order: Object.freeze(['reach', 'swift', 'anchor']) }),
  Object.freeze({ id: 'rush', title: '疾潮阵', order: Object.freeze(['swift', 'anchor', 'reach']) })
]);
export const ENEMY_ORDER = OPPONENT_PLANS[0].order;
const TYPES = Object.keys(FIGHTERS);
const copy = x => JSON.parse(JSON.stringify(x));
const cleanOrder = x => Array.isArray(x) && x.length === 3 && new Set(x).size === 3 && x.every(id => TYPES.includes(id));
const actor = (side, x, id) => ({ side, id, x, facing: side === 'player' ? 1 : -1,
  phase: 'idle', move: null, elapsed: 0, struck: false, stun: 0, guard: false, moving: false });
const roster = order => order.map(id => ({ id, hp: FIGHTERS[id].maxHp }));
export function createGame() {
  const order = [...TYPES];
  return { version: 1, status: 'ready', order, enemyOrder: [...ENEMY_ORDER],
    teams: { player: roster(order), enemy: roster(ENEMY_ORDER) },
    active: { player: 0, enemy: 0 }, actors: { player: actor('player', 250, order[0]), enemy: actor('enemy', 710, ENEMY_ORDER[0]) },
    tick: 0, roundTick: 0, between: 0, aiTurn: 0, aiWait: .38, aiGuard: 0,
    lastHit: null, departed: [], result: null, events: ['赛前排定三人顺序。对方依次为芦、汐、砾。'] };
}
export function setOrder(g, order) {
  if (g.status !== 'ready' || !cleanOrder(order)) return false;
  g.order = [...order]; g.teams.player = roster(order); g.actors.player.id = order[0];
  g.events = ['已排定：' + order.map(id => FIGHTERS[id].name).join(' → ') + '。对方顺序公开。'];
  return true;
}
export function setOpponentPlan(g, planId) {
  const plan = OPPONENT_PLANS.find(item => item.id === planId);
  if (g.status !== 'ready' || !plan) return false;
  g.enemyOrder = [...plan.order]; g.teams.enemy = roster(plan.order); g.actors.enemy.id = plan.order[0];
  g.events = [`对照 ${plan.title}：${plan.order.map(id => FIGHTERS[id].name).join(' → ')}。没有额外伤害倍率。`];
  return true;
}
export function start(g) {
  if (g.status !== 'ready') return false;
  g.status = 'running'; g.events = ['第一位上场。胜者留场，余血带入下一位对手。'];
  return true;
}
export function pause(g) {
  if (g.status === 'running' || g.status === 'between') { g.resumeStatus = g.status; g.status = 'paused'; return true; }
  if (g.status === 'paused') { g.status = g.resumeStatus || 'running'; delete g.resumeStatus; return true; }
  return false;
}
const round = (x, places = 3) => +x.toFixed(places);
const guardValid = a => a.phase === 'idle' && a.stun <= 0;
function beginAttack(a, kind) {
  if (!guardValid(a) || a.guard || !['light', 'heavy'].includes(kind)) return false;
  a.phase = 'startup'; a.move = kind; a.elapsed = 0; a.struck = false; return true;
}
function applyHit(g, attacker, defender) {
  const spec = FIGHTERS[attacker.id][attacker.move];
  const gap = Math.abs(defender.x - attacker.x);
  const facing = (defender.x - attacker.x) * attacker.facing > 0;
  if (!facing || gap > spec.reach) return;
  const target = g.teams[defender.side][g.active[defender.side]];
  const blocked = defender.guard && guardValid(defender) && defender.facing === -attacker.facing;
  const damage = blocked ? Math.max(2, Math.ceil(spec.damage * .23)) : spec.damage;
  target.hp = Math.max(0, target.hp - damage);
  if (!blocked) { defender.phase = 'stunned'; defender.move = null; defender.elapsed = 0; defender.stun = .22; defender.guard = false; }
  g.lastHit = { tick: g.tick, side: defender.side, blocked, damage, x: round(defender.x) };
  g.events.push(`${attacker.side === 'player' ? '己方' : '对方'}${FIGHTERS[attacker.id].name}${attacker.move === 'heavy' ? '重击' : '轻击'}${blocked ? '被挡住' : '命中'}，造成 ${damage} 点。`);
  if (g.events.length > 8) g.events.shift();
}
function advanceActor(g, a, defender, dt) {
  if (a.phase === 'stunned') { a.stun = Math.max(0, a.stun - dt); if (a.stun === 0) a.phase = 'idle'; return; }
  if (a.phase === 'idle') return;
  a.elapsed += dt;
  const spec = FIGHTERS[a.id][a.move];
  if (a.phase === 'startup' && a.elapsed >= spec.startup) { a.phase = 'active'; a.elapsed -= spec.startup; }
  if (a.phase === 'active' && !a.struck) { a.struck = true; applyHit(g, a, defender); }
  if (a.phase === 'active' && a.elapsed >= spec.active) { a.phase = 'recovery'; a.elapsed -= spec.active; }
  if (a.phase === 'recovery' && a.elapsed >= spec.recovery) { a.phase = 'idle'; a.move = null; a.elapsed = 0; }
}
function enemyControl(g, dt) {
  const e = g.actors.enemy, p = g.actors.player, spec = FIGHTERS[e.id], gap = Math.abs(e.x - p.x);
  g.aiWait = Math.max(0, g.aiWait - dt); g.aiGuard = Math.max(0, g.aiGuard - dt);
  e.guard = g.aiGuard > 0 && guardValid(e);
  if (e.phase !== 'idle') return 0;
  if (g.aiWait === 0) {
    g.aiTurn++;
    if (gap < spec.light.reach + 18 && p.phase === 'startup' && g.aiTurn % 3 === 0) {
      g.aiGuard = .38; g.aiWait = .45; e.guard = true;
    } else if (gap <= spec.light.reach + 5) {
      e.guard = false; beginAttack(e, g.aiTurn % 4 === 0 ? 'heavy' : 'light'); g.aiWait = .34;
    } else if (gap <= spec.heavy.reach + 5 && g.aiTurn % 2 === 0) {
      e.guard = false; beginAttack(e, 'heavy'); g.aiWait = .36;
    } else g.aiWait = .24;
  }
  if (e.guard || e.phase !== 'idle') return 0;
  return gap > Math.max(66, spec.light.reach - 12) ? -1 : 0;
}
function moveActor(a, direction, dt) {
  a.moving = false;
  if (!direction || a.phase !== 'idle' || a.guard) return;
  const before = a.x;
  a.x = Math.max(45, Math.min(915, a.x + direction * FIGHTERS[a.id].speed * dt));
  a.moving = a.x !== before;
}
function nextSeat(g) {
  const p = g.teams.player[g.active.player], e = g.teams.enemy[g.active.enemy];
  if (p.hp > 0 && e.hp > 0) return;
  g.departed = [p.hp <= 0 ? { side: 'player', id: p.id, x: g.actors.player.x, facing: g.actors.player.facing } : null,
    e.hp <= 0 ? { side: 'enemy', id: e.id, x: g.actors.enemy.x, facing: g.actors.enemy.facing } : null].filter(Boolean);
  g.events.push(p.hp <= 0 && e.hp <= 0 ? '双方同时倒下，下一位接替。' : p.hp <= 0 ? '己方下一位接替。' : '对方下一位接替。');
  if (g.events.length > 8) g.events.shift();
  if (p.hp <= 0) g.active.player++;
  if (e.hp <= 0) g.active.enemy++;
  if (g.active.player >= 3 || g.active.enemy >= 3) {
    g.status = g.active.enemy >= 3 && g.active.player < 3 ? 'won' : 'lost';
    g.result = g.status === 'won' ? '对方三席尽退，擂台守住了。' : '己方三席尽退，可以重新排阵。';
    g.events.push(g.result); if (g.events.length > 8) g.events.shift();
    return;
  }
  g.status = 'between'; g.between = 1.05; g.aiWait = .40; g.aiGuard = 0;
  g.actors.player = actor('player', 250, g.order[g.active.player]);
  g.actors.enemy = actor('enemy', 710, g.enemyOrder[g.active.enemy]);
}
export function step(g, control = {}, dt = STEP) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > .1) throw Error('Invalid step');
  if (!['running', 'between'].includes(g.status)) return g;
  g.tick++; g.roundTick++;
  if (g.status === 'between') { g.between = Math.max(0, g.between - dt); if (g.between === 0) { g.status = 'running'; g.roundTick = 0; g.departed = []; } return g; }
  const p = g.actors.player, e = g.actors.enemy;
  p.facing = p.x <= e.x ? 1 : -1; e.facing = -p.facing;
  p.guard = !!control.guard && guardValid(p);
  if (!p.guard) {
    if (control.light) beginAttack(p, 'light');
    else if (control.heavy) beginAttack(p, 'heavy');
  }
  moveActor(p, control.left && !control.right ? -1 : control.right && !control.left ? 1 : 0, dt);
  const emove = enemyControl(g, dt); moveActor(e, emove, dt);
  const minGap = 42; if (e.x - p.x < minGap) { const mid = (e.x + p.x) / 2; p.x = mid - minGap / 2; e.x = mid + minGap / 2; }
  advanceActor(g, p, e, dt); advanceActor(g, e, p, dt);
  nextSeat(g); return g;
}
export function checkpoint(g) {
  return copy({ version: 1, status: g.status, order: g.order, enemyOrder: g.enemyOrder, teams: g.teams,
    active: g.active, actors: g.actors, tick: g.tick, roundTick: g.roundTick, between: g.between,
    aiTurn: g.aiTurn, aiWait: g.aiWait, aiGuard: g.aiGuard, lastHit: g.lastHit, departed: g.departed,
    result: g.result, resumeStatus: g.resumeStatus || null, events: g.events });
}
const finite = (x, min, max) => Number.isFinite(x) && x >= min && x <= max;
function validActor(a, side, id) {
  return a && a.side === side && a.id === id && finite(a.x, 0, 960) && [-1, 1].includes(a.facing) &&
    ['idle', 'startup', 'active', 'recovery', 'stunned'].includes(a.phase) &&
    (a.move === null || ['light', 'heavy'].includes(a.move)) && finite(a.elapsed, 0, 2) &&
    finite(a.stun, 0, 1) && typeof a.struck === 'boolean' && typeof a.guard === 'boolean' && typeof a.moving === 'boolean';
}
export function restore(raw) {
  try {
    if (!raw || raw.version !== 1 || !cleanOrder(raw.order) ||
      !OPPONENT_PLANS.some(plan => raw.enemyOrder?.join(',') === plan.order.join(',')) ||
      !['ready', 'running', 'between', 'paused', 'won', 'lost'].includes(raw.status) ||
      !Number.isInteger(raw.tick) || raw.tick < 0 || raw.tick > 216000 ||
      !Number.isInteger(raw.roundTick) || raw.roundTick < 0 || raw.roundTick > raw.tick ||
      !Number.isInteger(raw.aiTurn) || raw.aiTurn < 0 || raw.aiTurn > raw.tick ||
      !finite(raw.aiWait, 0, 2) || !finite(raw.aiGuard, 0, 2) || !finite(raw.between, 0, 2) ||
      (raw.result !== null && (typeof raw.result !== 'string' || raw.result.length > 120)) ||
      (raw.lastHit !== null && (!raw.lastHit || !Number.isInteger(raw.lastHit.tick) || raw.lastHit.tick > raw.tick ||
        !['player', 'enemy'].includes(raw.lastHit.side) || typeof raw.lastHit.blocked !== 'boolean' ||
        !finite(raw.lastHit.damage, 0, 30) || !finite(raw.lastHit.x, 0, 960))) ||
      !Array.isArray(raw.departed ?? []) || (raw.departed ?? []).length > 2 ||
      (raw.departed ?? []).some(a => !a || !['player', 'enemy'].includes(a.side) || !TYPES.includes(a.id) ||
        !finite(a.x, 0, 960) || ![-1, 1].includes(a.facing)) ||
      !Array.isArray(raw.events) || raw.events.length > 8 || raw.events.some(s => typeof s !== 'string' || s.length > 180)) return null;
    const g = createGame(); g.order = [...raw.order]; g.enemyOrder = [...raw.enemyOrder]; g.teams = copy(raw.teams); g.active = copy(raw.active);
    for (const side of ['player', 'enemy']) {
      const order = side === 'player' ? raw.order : raw.enemyOrder;
      const team = g.teams[side]; const n = g.active[side];
      if (!Array.isArray(team) || team.length !== 3 || !Number.isInteger(n) || n < 0 || n > 3) return null;
      if (team.some((f, i) => f.id !== order[i] || !finite(f.hp, 0, FIGHTERS[f.id].maxHp))) return null;
      // The final actor still renders after a team's third defeat.
      if (!validActor(raw.actors?.[side], side, order[Math.min(n, 2)])) return null;
      if (team.slice(0, n).some(f => f.hp !== 0)) return null;
    }
    if (raw.status === 'ready' && (raw.tick !== 0 || g.active.player !== 0 || g.active.enemy !== 0)) return null;
    if (raw.status === 'won' && (g.active.enemy !== 3 || g.active.player >= 3 || !raw.result)) return null;
    if (raw.status === 'lost' && (g.active.player !== 3 || !raw.result)) return null;
    if (['running', 'between', 'paused'].includes(raw.status) && (g.active.player >= 3 || g.active.enemy >= 3)) return null;
    if (raw.status === 'between' && raw.between <= 0) return null;
    g.actors = copy(raw.actors); g.tick = raw.tick; g.roundTick = raw.roundTick;
    g.between = raw.between; g.aiTurn = raw.aiTurn; g.aiWait = raw.aiWait; g.aiGuard = raw.aiGuard;
    g.lastHit = raw.lastHit; g.departed = copy(raw.departed ?? []); g.result = raw.result; g.events = [...raw.events];
    g.status = raw.status === 'running' || raw.status === 'between' ? 'paused' : raw.status;
    if (g.status === 'paused') g.resumeStatus = raw.status === 'paused' ? raw.resumeStatus : raw.status;
    if (g.status === 'paused' && !['running', 'between'].includes(g.resumeStatus)) return null;
    return g;
  } catch { return null; }
}
