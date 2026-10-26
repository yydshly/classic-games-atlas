export const NODES = [
  { id: 'camp', name: '松驿', x: 12, y: 49, terrain: '驿站', color: '#d6b881' },
  { id: 'granary', name: '谷仓', x: 31, y: 49, terrain: '平原', color: '#b4bc79' },
  { id: 'pass', name: '岚隘', x: 48, y: 18, terrain: '山道', color: '#8c9a91' },
  { id: 'ford', name: '浅渡', x: 48, y: 80, terrain: '浅滩', color: '#7aa8ab' },
  { id: 'relay', name: '烽台', x: 68, y: 49, terrain: '高地', color: '#c5ad77' },
  { id: 'beacon', name: '北望', x: 78, y: 13, terrain: '山道', color: '#8c9a91' },
  { id: 'outpost', name: '远哨', x: 87, y: 75, terrain: '平原', color: '#b4bc79' },
];

export const EDGES = [
  ['camp', 'granary'], ['granary', 'pass'], ['granary', 'ford'],
  ['pass', 'relay'], ['ford', 'relay'], ['pass', 'beacon'],
  ['beacon', 'outpost'], ['relay', 'outpost'],
];

export const CAMPAIGNS = [
  {
    name: '一 · 守住谷仓', maxTurn: 3, food: 8, orders: 2, start: { guard: 'camp', courier: 'granary' },
    intro: '夜里断了粮信。守住松驿与谷仓直到第三回合结束；可驻守谷仓，或先回驿筹粮。',
    goal: { hold: ['camp', 'granary'] },
    waves: [{ turn: 2, at: 'granary', power: 2 }, { turn: 3, at: 'camp', power: 2 }],
  },
  {
    name: '二 · 烽台急报', maxTurn: 5, food: 10, orders: 2,
    intro: '第五回合前夺回烽台并保住松驿。谷卫走岚隘命令少、耗粮稍多；驿骑走浅渡省粮，却要多走一步并在第三回合驻防。',
    goal: { hold: ['camp', 'relay'] },
    waves: [{ turn: 3, at: 'relay', power: 2 }],
  },
  {
    name: '三 · 两路探报', maxTurn: 5, food: 10, orders: 2,
    intro: '驿骑须分别到达岚隘与浅渡，记下两路地形；松驿不能失守。',
    goal: { hold: ['camp'], courierVisits: ['pass', 'ford'] },
    waves: [{ turn: 2, at: 'pass', power: 2 }, { turn: 4, at: 'granary', power: 3 }],
  },
  {
    name: '四 · 北望与远哨', maxTurn: 6, food: 12, orders: 3,
    intro: '第六回合同时守住北望和远哨，两处会在末回合一起受袭。谷卫守力强，驿骑过浅渡省粮却需驻防；分兵与补给都要提前安排。',
    goal: { hold: ['camp', 'beacon', 'outpost'] },
    waves: [{ turn: 3, at: 'beacon', power: 2 }, { turn: 5, at: 'outpost', power: 2 },
      { turn: 6, at: 'beacon', power: 2 }, { turn: 6, at: 'outpost', power: 2 }],
  },
  {
    name: '五 · 最后一封信', maxTurn: 6, food: 12, orders: 3,
    intro: '让驿骑抵达远哨送信，并在第六回合守住谷仓与烽台。敌军会连试补给线。',
    goal: { hold: ['camp', 'granary', 'relay'], courierVisits: ['outpost'] },
    waves: [{ turn: 2, at: 'granary', power: 3 }, { turn: 4, at: 'relay', power: 3 }, { turn: 6, at: 'camp', power: 3 }],
  },
];

export const node = id => NODES.find(item => item.id === id);
export const neighbors = id => EDGES.filter(edge => edge.includes(id)).map(edge => edge.find(next => next !== id));
export function grainCost(role, destination) {
  const terrain = node(destination)?.terrain;
  return terrain === '山道' ? (role === 'guard' ? 3 : 2) : terrain === '浅滩' ? (role === 'guard' ? 4 : 1) : 1;
}
