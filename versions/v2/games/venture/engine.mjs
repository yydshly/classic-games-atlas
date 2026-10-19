/** Venture Rivals: deterministic, serializable, DOM-free rules. */
export const scenarios = [
  { id: 'morning', name: '晨间开市', rounds: 8, ai: 'conservative', market: 70, tax: 60 },
  { id: 'rain', name: '雨夜商街', rounds: 10, ai: 'acquire', market: 50, tax: 90 },
  { id: 'lantern', name: '灯会盛市', rounds: 12, ai: 'balanced', market: 100, tax: 70 },
];
export const board = [
  { name: '起点', type: 'start' },
  { name: '热笼包铺', type: 'shop', category: 'food', price: 180, baseRent: 45, upgradeCost: 110 },
  { name: '锦云绸庄', type: 'shop', category: 'craft', price: 160, baseRent: 40, upgradeCost: 100 },
  { name: '街心公园', type: 'park' },
  { name: '晨露茶坊', type: 'shop', category: 'culture', price: 200, baseRent: 50, upgradeCost: 120 },
  { name: '听雨茶舍', type: 'shop', category: 'culture', price: 220, baseRent: 55, upgradeCost: 130 },
  { name: '周末集市', type: 'market' },
  { name: '青罗绣坊', type: 'shop', category: 'craft', price: 180, baseRent: 45, upgradeCost: 110 },
  { name: '桂香点心', type: 'shop', category: 'food', price: 240, baseRent: 60, upgradeCost: 140 },
  { name: '街区维护', type: 'tax' },
  { name: '兰亭茶馆', type: 'shop', category: 'culture', price: 200, baseRent: 50, upgradeCost: 120 },
  { name: '金线织铺', type: 'shop', category: 'craft', price: 220, baseRent: 55, upgradeCost: 130 },
];
const shopPositions = board.flatMap((cell, i) => cell.type === 'shop' ? [i] : []);
scenarios.forEach((scenario, level) => {
  scenario.title = scenario.name; scenario.style = scenario.ai;
  const layout = board.map(cell => ({ ...cell }));
  shopPositions.forEach((position, slot) => {
    layout[position] = { ...board[shopPositions[(slot + level * 3) % shopPositions.length]] };
  });
  scenario.layout = layout; scenario.board = layout;
});
const copy = s => JSON.parse(JSON.stringify(s));
const scenarioFor = s => scenarios.find(x => x.id === s.scenario);
const boardFor = s => scenarioFor(s).board;
const emit = (s, event) => {
  const entry = { id: ++s.eventId, ...event };
  s.events.push(entry); s.log.push({ round: s.round, ...entry });
  s.log = s.log.slice(-30);
};
function seedNumber(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return (seed >>> 0) || 0x9e3779b9;
  let n = 2166136261;
  for (const c of String(seed)) n = Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0;
  return n || 0x9e3779b9;
}
/** level may be scenario index or id. Start cash/vouchers and all rules are symmetric. */
export function fresh(level = 0, seed = 1) {
  const scenario = typeof level === 'string' ? scenarios.find(s => s.id === level) : scenarios[level];
  if (!scenario) throw new RangeError('Unknown scenario');
  return {
    version: 2, scenario: scenario.id, round: 1, turn: 0, phase: 'ready', rng: seedNumber(seed),
    players: [0, 1].map(id => ({ id, cash: 850, position: 0, vouchers: 2, bankrupt: false })),
    shops: board.map(() => ({ owner: null, level: 0 })), events: [], log: [], winner: null,
    lastRoll: null, eventId: 0, error: null,
  };
}
/** Unbiased rejection sampling, consuming only persisted RNG state. */
function die(s) {
  let n;
  do {
    let x = s.rng;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    s.rng = x >>> 0;
    n = s.rng - 1; // xorshift32 emits 1..2^32-1, never zero
  } while (n >= 4294967292);
  return n % 6 + 1;
}
export function netWorth(s, id) {
  return s.players[id].cash + s.shops.reduce((sum, shop, i) => sum + (shop.owner === id ? boardFor(s)[i].price + boardFor(s)[i].upgradeCost * (shop.level - 1) : 0), 0);
}
/** Two or more shops of a category give a 50% rent bonus; owned level 1/2 gives 1x/2x. */
export function rent(s, index) {
  const cell = boardFor(s)[index], shop = s.shops[index];
  if (!cell || cell.type !== 'shop' || shop.owner === null) return 0;
  const count = s.shops.filter((x, i) => x.owner === shop.owner && boardFor(s)[i].type === 'shop' && boardFor(s)[i].category === cell.category).length;
  return Math.floor(cell.baseRent * shop.level * (count >= 2 ? 1.5 : 1));
}
export function saleValue(s, index) {
  const b = boardFor(s)[index];
  return b?.type === 'shop' ? Math.floor((b.price + b.upgradeCost * Math.max(0, s.shops[index].level - 1)) * 70 / 100) : 0;
}
function sell(s, actor, index, automatic = false) {
  const amount = saleValue(s, index);
  s.shops[index] = { owner: null, level: 0 };
  s.players[actor].cash += amount;
  emit(s, { type: 'transaction', kind: automatic ? 'liquidate' : 'sell', actor, index, amount, from: 'bank', to: actor });
}
/** Debt is resolved immediately: cheapest holdings first; bankruptcy only after exhaustion. */
function pay(s, actor, amount, recipient = 'bank', kind = 'tax', index = null) {
  const player = s.players[actor];
  const owned = s.shops.map((shop, i) => shop.owner === actor ? i : -1).filter(i => i >= 0)
    .sort((a, b) => saleValue(s, a) - saleValue(s, b) || a - b);
  for (const i of owned) { if (player.cash >= amount) break; sell(s, actor, i, true); }
  const paid = Math.min(amount, player.cash);
  player.cash -= paid;
  if (typeof recipient === 'number') s.players[recipient].cash += paid;
  emit(s, { type: 'transaction', kind, actor, index, amount: paid, due: amount, unpaid: amount - paid, from: actor, to: recipient });
  if (paid < amount) {
    player.bankrupt = true; s.phase = 'finished'; s.winner = 1 - actor;
    emit(s, { type: 'finish', reason: 'bankruptcy', winner: s.winner });
  }
}
function credit(s, actor, amount, kind) {
  s.players[actor].cash += amount;
  emit(s, { type: 'transaction', kind, actor, amount, from: 'bank', to: actor });
}
function move(s, steps, voucher) {
  const actor = s.turn, player = s.players[actor], from = player.position;
  if (voucher) player.vouchers--;
  else s.lastRoll = steps;
  player.position = (from + steps) % board.length;
  emit(s, { type: 'move', actor, from, to: player.position, steps, voucher });
  if (from + steps >= board.length) credit(s, actor, 100, 'pass-start');
  s.phase = 'landed';
  const index = player.position, cell = boardFor(s)[index], shop = s.shops[index];
  if (cell.type === 'shop' && shop.owner !== null && shop.owner !== actor) pay(s, actor, rent(s, index), shop.owner, 'rent', index);
  if (cell.type === 'park') credit(s, actor, 40, 'park');
  if (cell.type === 'market') credit(s, actor, scenarioFor(s).market, 'market');
  if (cell.type === 'tax') pay(s, actor, scenarioFor(s).tax, 'bank', 'tax', index);
}
function finishRound(s) {
  if (s.round >= scenarioFor(s).rounds) {
    const values = [netWorth(s, 0), netWorth(s, 1)];
    s.phase = 'finished'; s.winner = values[0] === values[1] ? 'draw' : values[0] > values[1] ? 0 : 1;
    emit(s, { type: 'finish', reason: 'round-limit', winner: s.winner, netWorth: values });
  } else { s.round++; s.turn = 0; s.phase = 'ready'; }
}
/** Illegal commands never consume RNG, money, vouchers, events, or a turn. */
export function act(state, action, value) {
  const s = copy(state);
  s.error = null;
  const fail = message => { const unchanged = copy(state); unchanged.error = message; return unchanged; };
  if (s.phase === 'finished') return fail('本局已经结束');
  const actor = s.turn, player = s.players[actor], index = player.position, cell = boardFor(s)[index], shop = s.shops[index];
  if (action === 'roll' || action === 'move') {
    if (s.phase !== 'ready') return fail('本回合已经移动');
    if (action === 'move' && (!Number.isInteger(value) || value < 1 || value > 6 || player.vouchers < 1)) return fail('请选择 1–6 步并持有步数券');
    s.events = [];
    move(s, action === 'roll' ? die(s) : value, action === 'move');
    return s;
  }
  if (action === 'sell') {
    if (!Number.isInteger(value) || boardFor(s)[value]?.type !== 'shop' || s.shops[value].owner !== actor) return fail('只能出售自己的商铺');
    s.events = []; sell(s, actor, value); return s;
  }
  if (s.phase !== 'landed') return fail('请先移动');
  if (action === 'buy') {
    if (cell.type !== 'shop' || shop.owner !== null || player.cash < cell.price) return fail('无法购买这间商铺');
    s.events = []; shop.owner = actor; shop.level = 1; player.cash -= cell.price;
    emit(s, { type: 'transaction', kind: 'buy', actor, index, amount: cell.price, from: actor, to: 'bank' });
  } else if (action === 'upgrade') {
    if (cell.type !== 'shop' || shop.owner !== actor || shop.level >= 2 || player.cash < cell.upgradeCost) return fail('无法升级这间商铺');
    s.events = []; shop.level++; player.cash -= cell.upgradeCost;
    emit(s, { type: 'transaction', kind: 'upgrade', actor, index, amount: cell.upgradeCost, level: shop.level, from: actor, to: 'bank' });
  } else if (action === 'end') {
    s.events = [];
    if (actor === 0) { s.turn = 1; s.phase = 'ready'; }
    else finishRound(s);
  } else return fail('未知操作');
  return s;
}
/** AI reads only present public state. It uses the same act() rules as the player. */
export function aiTurn(state) {
  if (state.turn !== 1 || state.phase === 'finished') return copy(state);
  let s = copy(state), events = [];
  const run = (action, value) => { s = act(s, action, value); if (!s.error) events.push(...s.events); };
  const style = scenarioFor(s).ai;
  if (s.phase === 'ready') {
    const p = s.players[1];
    // Public destination scores only; the RNG is not read or advanced for planning.
    const choices = Array.from({ length: 6 }, (_, i) => {
      const steps = i + 1, target = (p.position + steps) % 12, b = boardFor(s)[target], shop = s.shops[target];
      let score = b.type === 'tax' ? -scenarioFor(s).tax : b.type === 'market' ? scenarioFor(s).market : b.type === 'park' ? 40 : 0;
      if (p.position + steps >= 12) score += 100;
      if (b.type === 'shop') score += shop.owner === 0 ? -rent(s, target) : shop.owner === null && p.cash >= b.price ? 60 : 15;
      return { steps, score };
    }).sort((a, b) => b.score - a.score || a.steps - b.steps);
    if (p.vouchers > 0 && (s.round >= Math.ceil(scenarioFor(s).rounds / 2) || choices.some(x => x.score <= -100))) run('move', choices[0].steps);
    else run('roll');
  }
  if (s.phase === 'landed') {
    const p = s.players[1], b = boardFor(s)[p.position], shop = s.shops[p.position];
    const reserve = style === 'conservative' ? 280 : style === 'acquire' ? 80 : 180;
    if (b.type === 'shop' && shop.owner === null && p.cash - b.price >= reserve) run('buy');
    // One upgrade per AI visit; player may choose up to the same level cap.
    if (b.type === 'shop' && s.shops[p.position].owner === 1 && s.shops[p.position].level < 2 && s.players[1].cash - b.upgradeCost >= reserve + 100 && style !== 'acquire') run('upgrade');
    run('end');
  }
  s.events = events;
  return s;
}
