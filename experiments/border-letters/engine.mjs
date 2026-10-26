import { CAMPAIGNS, NODES, grainCost, neighbors, node } from './world.mjs?v=border-slice-1-settle-1';

const clone = value => structuredClone(value);
export function newGame(stage = 0) {
  if (!Number.isInteger(stage) || stage < 0 || stage >= CAMPAIGNS.length) throw new Error('关卡无效');
  const level = CAMPAIGNS[stage];
  return { version: 1, stage, turn: 1, orders: level.orders, food: level.food,
    ownership: Object.fromEntries(NODES.map(place => [place.id, ['camp', 'granary'].includes(place.id) ? 'ally' : 'neutral'])),
    garrison: {}, units: [{ id: 'guard', role: 'guard', name: '谷卫', at: level.start?.guard || 'granary', fort: 0 },
      { id: 'courier', role: 'courier', name: '驿骑', at: level.start?.courier || 'camp', fort: 0 }],
    visits: [], logs: ['两名守使已到位。先点队伍，再选相邻地点并下令。'],
    undo: [], phase: 'playing', paused: false, settlementPending: false,
    metrics: { spent: 0, marches: 0, harvests: 0, guarded: 0 } };
}
export const levelOf = state => CAMPAIGNS[state.stage];
export const unitOf = (state, id) => state.units.find(unit => unit.id === id);
export function isSupplied(state, at) {
  const seen = new Set(['camp']);
  const queue = ['camp'];
  while (queue.length) for (const next of neighbors(queue.shift())) {
    if (state.ownership[next] === 'ally' && !seen.has(next)) { seen.add(next); queue.push(next); }
  }
  return seen.has(at);
}
const pushLog = (state, message) => { state.logs.unshift(message); state.logs.length = Math.min(state.logs.length, 10); };
const commit = (state, next) => { next.undo = [...state.undo, { ...clone(state), undo: [] }].slice(-3); return next; };
function reject(reason) { return { ok: false, reason }; }
function requireOrder(state) {
  if (state.phase !== 'playing' || state.paused) return '当前不能下令';
  if (state.settlementPending) return '先查看上一回合结算，再继续部署';
  if (!state.orders) return '本回合命令已用尽，请结算';
  return '';
}
export function march(state, unitId, target) {
  const bad = requireOrder(state); if (bad) return reject(bad);
  const unit = unitOf(state, unitId);
  if (!unit || !node(target) || !neighbors(unit.at).includes(target)) return reject('只能向相邻地点行军');
  const cost = grainCost(unit.role, target) + (isSupplied(state, unit.at) ? 0 : 1);
  if (state.food < cost) return reject(`需要 ${cost} 粮；可在已控制的松驿或谷仓筹粮`);
  const enemy = state.ownership[target] === 'enemy' ? (state.garrison[target] || 1) : 0;
  const force = unit.role === 'guard' ? 3 : 1;
  if (enemy && force < enemy) return reject(`${node(target).name}敌力 ${enemy}，${unit.name}战力 ${force}，需换队或等敌撤离`);
  const next = clone(state), mover = unitOf(next, unitId);
  next.food -= cost; next.orders--; next.metrics.spent += cost; next.metrics.marches++;
  mover.at = target; mover.fort = 0; next.ownership[target] = 'ally'; delete next.garrison[target];
  if (unitId === 'courier' && !next.visits.includes(target)) next.visits.push(target);
  pushLog(next, `${unit.name}到达${node(target).name}，耗粮 ${cost}${enemy ? '，驱散敌兵' : ''}。`);
  return { ok: true, state: commit(state, next) };
}
export function forage(state, at) {
  const bad = requireOrder(state); if (bad) return reject(bad);
  if (!['camp', 'granary'].includes(at) || state.ownership[at] !== 'ally') return reject('只能在已控制的松驿或谷仓筹粮');
  const next = clone(state), gain = at === 'camp' ? 4 : 3;
  next.orders--; next.food += gain; next.metrics.harvests++;
  pushLog(next, `${node(at).name}筹到 ${gain} 粮。`);
  return { ok: true, state: commit(state, next) };
}
export function fortify(state, unitId) {
  const bad = requireOrder(state); if (bad) return reject(bad);
  const unit = unitOf(state, unitId); if (!unit) return reject('先选择队伍');
  if (unit.fort) return reject('该队本回合已驻防');
  const next = clone(state), defender = unitOf(next, unitId);
  next.orders--; defender.fort = unit.role === 'guard' ? 2 : 1; next.metrics.guarded++;
  pushLog(next, `${unit.name}在${node(unit.at).name}驻防，抵御本回合突袭。`);
  return { ok: true, state: commit(state, next) };
}
export function undo(state) {
  if (state.phase !== 'playing' || state.paused || state.settlementPending || !state.undo.length) return reject('本回合无可撤销命令');
  const next = clone(state.undo.at(-1)); next.undo = state.undo.slice(0, -1);
  return { ok: true, state: next };
}
export function goalMet(state) {
  const goal = levelOf(state).goal;
  return goal.hold.every(at => state.ownership[at] === 'ally') &&
    (goal.courierVisits || []).every(at => state.visits.includes(at));
}
export function endTurn(state) {
  if (state.phase !== 'playing' || state.paused) return reject('当前不能结算');
  if (state.settlementPending) return reject('先查看上一回合结算，再继续部署');
  const next = clone(state), level = levelOf(state);
  next.undo = [];
  const upkeep = next.units.length;
  next.food -= upkeep;
  const shortage = next.food < 0;
  if (shortage) { next.food = 0; pushLog(next, '军粮不足！下回合少一命令；若这是期限回合则任务失败。'); }
  else pushLog(next, `第 ${next.turn} 回合补给消耗 ${upkeep} 粮。`);
  for (const wave of level.waves.filter(item => item.turn === next.turn)) {
    const defenders = next.units.filter(unit => unit.at === wave.at);
    const total = defenders.reduce((sum, unit) => sum + (unit.role === 'guard' ? 3 : 1) + unit.fort, 0);
    if (total >= wave.power) pushLog(next, `${node(wave.at).name}守住突袭：守力 ${total} / 敌力 ${wave.power}。`);
    else {
      next.ownership[wave.at] = 'enemy'; next.garrison[wave.at] = wave.power;
      for (const unit of defenders) { unit.at = 'camp'; unit.fort = 0; }
      pushLog(next, `${node(wave.at).name}失守：守力 ${total} / 敌力 ${wave.power}；守军退回松驿。`);
    }
  }
  for (const unit of next.units) unit.fort = 0;
  if (next.ownership.camp !== 'ally') { next.phase = 'lost'; pushLog(next, '松驿失守，传信线中断。'); }
  else if (next.turn >= level.maxTurn) {
    next.phase = goalMet(next) && !shortage ? 'won' : 'lost';
    pushLog(next, next.phase === 'won' ? '任务达成，边郡来信送出。' : shortage ? '期限回合军粮不足，无法完成交接。' : '期限已到，目标尚未齐备。');
  } else { next.turn++; next.orders = shortage ? Math.max(1, level.orders - 1) : level.orders; }
  next.settlementPending = next.phase === 'playing';
  return { ok: true, state: next };
}
export function continueTurn(state) {
  if (state.phase !== 'playing' || state.paused || !state.settlementPending) return reject('当前没有待确认的回合结算');
  const next = clone(state); next.settlementPending = false;
  return { ok: true, state: next };
}
export function validSave(value) {
  if (!value || value.version !== 1 || !Number.isInteger(value.stage) || value.stage < 0 || value.stage >= CAMPAIGNS.length) return false;
  if (!Number.isInteger(value.turn) || value.turn < 1 || value.turn > levelOf(value).maxTurn ||
    !Number.isInteger(value.orders) || value.orders < 0 || value.orders > levelOf(value).orders ||
    !Number.isFinite(value.food) || value.food < 0 || value.food > 999 ||
    !['playing', 'won', 'lost'].includes(value.phase) || !Array.isArray(value.units) || value.units.length !== 2 ||
    !Array.isArray(value.visits) || !Array.isArray(value.logs) || value.logs.length > 10 ||
    !value.metrics || !['spent','marches','harvests','guarded'].every(key => Number.isInteger(value.metrics[key]) && value.metrics[key] >= 0) ||
    (value.settlementPending !== undefined && typeof value.settlementPending !== 'boolean') ||
    (value.settlementPending === true && value.phase !== 'playing')) return false;
  return ['guard','courier'].every(id => value.units.filter(unit => unit.id === id).length === 1) &&
    value.units.every(unit => unit.role === unit.id && node(unit.at) && Number.isInteger(unit.fort) && unit.fort >= 0 && unit.fort <= 2) &&
    value.visits.every(at => !!node(at)) && value.logs.every(log => typeof log === 'string' && log.length < 300) &&
    NODES.every(place => ['ally', 'neutral', 'enemy'].includes(value.ownership?.[place.id]) &&
      (value.ownership[place.id] !== 'enemy' || (Number.isInteger(value.garrison?.[place.id]) && value.garrison[place.id] > 0 && value.garrison[place.id] <= 5))) &&
    Array.isArray(value.undo) && value.undo.length <= 3 &&
    value.undo.every(snapshot => snapshot && Array.isArray(snapshot.undo) && snapshot.undo.length === 0 && validSave(snapshot));
}
