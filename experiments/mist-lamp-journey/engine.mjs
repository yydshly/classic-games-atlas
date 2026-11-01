// 雾灯远行：三区短篇的纯规则。原首段规则保存在 legacy-engine.mjs，用于无损迁移。
import { restore as restoreFirstPass, SAVE_KEY as LEGACY_SAVE_KEY } from './legacy-engine.mjs?v=mist-lamp-three-regions-1';

export { LEGACY_SAVE_KEY };
export const SAVE_KEY = 'classic-games-atlas:mist-lamp-journey:v2';
export const WIDTH = 23, HEIGHT = 13;
export const CAMP = { x: 2, y: 6 }, EXIT = { x: 20, y: 6 };
export const REGIONS = [
  { name: '风墙山口', goal: '穿过上路强敌或下路耗粮渡道，点亮第一盏雾灯。', short: '上路近，哨兵强；下路远，渡道首次耗 1 口粮并有一次性饮剂。' },
  { name: '淹水档案馆', goal: '取回潮汐图册，找到通往观测站的路。', short: '上路封障需丘耗 2 法力永久拆除；下路绕行清敌，取得一次性药包。' },
  { name: '雾灯观测站', goal: '重启主灯，与镜面守机交锋，完成短篇撤离。', short: '中路直达；北侧耗 1 口粮取饮剂，南侧清敌取药包，补给均只可领取一次。' },
];

export const HEROES = [
  { id: 'lin', name: '岚', role: '护卫', maxHp: 12, maxMp: 0, attack: 2, skill: '结阵：本轮全队减伤' },
  { id: 'yao', name: '遥', role: '医者', maxHp: 8, maxMp: 5, attack: 1, skill: '疗愈：耗 2 法力，为指定队员恢复 5 生命' },
  { id: 'qiu', name: '丘', role: '测绘师', maxHp: 9, maxMp: 4, attack: 2, skill: '破甲：耗 2 法力，造成 5 伤害；可在档案馆拆除封障' },
];

export const FOES = {
  upper: { name: '风墙哨兵', hp: 17, pattern: [{ target: 'front', damage: 4 }, { target: 'rear', damage: 3 }, { target: 'all', damage: 2 }] },
  lower: { name: '石径游影', hp: 10, pattern: [{ target: 'front', damage: 2 }, { target: 'rear', damage: 2 }] },
  guardian: { name: '雾灯守机', hp: 17, pattern: [{ target: 'all', damage: 2 }, { target: 'front', damage: 4 }, { target: 'rear', damage: 3 }] },
  archive: { name: '卷柜巡影', hp: 11, pattern: [{ target: 'rear', damage: 2 }, { target: 'front', damage: 3 }] },
  south: { name: '镜廊游影', hp: 9, pattern: [{ target: 'front', damage: 2 }, { target: 'all', damage: 1 }] },
  final: { name: '镜面主灯', hp: 20, pattern: [{ target: 'all', damage: 3 }, { target: 'front', damage: 4 }, { target: 'rear', damage: 3 }] },
};

const ENCOUNTER = { '0:10,4': 'upper', '0:13,10': 'lower', '0:20,6': 'guardian', '1:13,10': 'archive', '2:11,9': 'south', '2:20,6': 'final' };
export function walkable(x, y, region = 0) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(region) || region < 0 || region > 2) return false;
  if (region < 2) return (x === 2 && y >= 4 && y <= 10) || (x === 20 && y >= 4 && y <= 10) ||
    (y === 4 && x >= 2 && x <= 20) || (y === 10 && x >= 2 && x <= 20);
  return (y === 6 && x >= 2 && x <= 20) ||
    (x === 8 && y >= 3 && y <= 9) ||
    ((y === 3 || y === 9) && x >= 8 && x <= 14);
}

function entrySnapshot(game) {
  return JSON.parse(JSON.stringify({ party: game.party, stock: game.stock, visited: game.visited,
    cleared: game.cleared, emergencyUsed: game.emergencyUsed, steps: game.steps,
    regionSteps: game.regionSteps, rests: game.rests }));
}

export function createGame() {
  const game = { version: 2, region: 0, status: 'ready', resumeStatus: null, pos: { ...CAMP },
    party: HEROES.map(h => ({ hp: h.maxHp, mp: h.maxMp })), stock: { ration: 2, kit: 1, tonic: 1 },
    visited: { cache: false, bridge: false, ward: false, archiveCache: false, northHatch: false, northCache: false, southCache: false },
    cleared: { upper: false, lower: false, guardian: false, archive: false, south: false, final: false },
    emergencyUsed: [false, false, false], regionsCleared: [false, false, false], results: [null, null, null],
    battle: null, steps: 0, regionSteps: [0, 0, 0], rests: 0,
    message: '从风墙山口出发。先看地图和路线代价，再带三人小队远行。', entry: null,
    entries: [null, null, null] };
  game.entry = entrySnapshot(game);
  game.entries[0] = checkpoint(game.entry);
  return game;
}

export function start(game) {
  if (game.status !== 'ready') return false;
  game.status = 'exploring'; game.message = REGIONS[0].goal; return true;
}

export function intent(game) {
  if (!game.battle) return null;
  return FOES[game.battle.kind].pattern[game.battle.round % FOES[game.battle.kind].pattern.length];
}

export function armored(game) { return game.battle?.kind === 'final' && game.battle.round % 3 !== 1; }

export function intentText(game) {
  const next = intent(game); if (!next) return '';
  const label = next.target === 'all' ? '全队' : next.target === 'front' ? '前排队员' : '后排队员';
  const shield = game.battle.kind === 'final' ? (armored(game) ? '镜面闭合：本轮普通攻击伤害 -2，破甲不受影响。' : '镜面敞开：普通攻击不受减伤。') : '';
  return `${shield}下一击：${label}，基础伤害 ${next.damage}。防守可减伤。`;
}

function beginBattle(game, kind) {
  game.battle = { kind, hp: FOES[kind].hp, round: 0, actor: 0, guard: [false, false, false], shelter: false };
  while (game.battle.actor < HEROES.length && game.party[game.battle.actor].hp === 0) game.battle.actor++;
  game.status = 'battle'; game.message = `${FOES[kind].name}拦路。${intentText(game)}`;
}

function finishRegion(game) {
  game.regionsCleared[game.region] = true;
  game.results[game.region] = { steps: game.regionSteps[game.region] - game.entry.regionSteps[game.region],
    party: game.party.map(p => ({ ...p })), stock: { ...game.stock } };
  game.status = game.region === 2 ? 'won' : 'stageClear';
  game.message = game.region === 2 ? '主灯重新亮起，三段短篇完成。' : `${REGIONS[game.region].name}已通过。生命、法力与物品会原样带入下一区；不会自动补满。`;
}

export function move(game, dx, dy) {
  if (game.status !== 'exploring' || Math.abs(dx) + Math.abs(dy) !== 1) return false;
  const x = game.pos.x + dx, y = game.pos.y + dy, region = game.region;
  if (!walkable(x, y, region)) { game.message = '岩壁或深水挡住去路。沿亮色路径移动。'; return false; }
  if (region === 0 && x === 16 && y === 10 && !game.visited.bridge) {
    if (!game.stock.ration) { game.message = '渡道首次需 1 口粮。可回营地改走上路；不会锁死。'; return false; }
    game.stock.ration--; game.visited.bridge = true; game.message = '渡道耗 1 口粮，后续往返不再重复支付。';
  }
  if (region === 1 && x === 10 && y === 4 && !game.visited.ward) {
    game.message = '封障未开。站在左侧按 E，丘耗 2 法力拆除；法力不足可走下路。'; return false;
  }
  if (region === 2 && x === 11 && y === 3 && !game.visited.northHatch) {
    if (!game.stock.ration) { game.message = '北侧舱门首次需 1 口粮。可走中路直达，或清理南侧取得药包。'; return false; }
    game.stock.ration--; game.visited.northHatch = true; game.message = '北侧舱门耗 1 口粮，往返不再收取。';
  }
  game.pos = { x, y }; game.steps++; game.regionSteps[region]++;
  if (region === 0 && x === 17 && y === 10 && !game.visited.cache) {
    game.stock.tonic++; game.visited.cache = true; game.message = '下路一次性饮剂 +1。';
  }
  if (region === 1 && x === 14 && y === 10 && !game.visited.archiveCache) {
    game.stock.kit++; game.visited.archiveCache = true; game.message = '清敌后取得下路一次性药包 +1。';
  }
  if (region === 2 && x === 13 && y === 3 && !game.visited.northCache) {
    game.stock.tonic++; game.visited.northCache = true; game.message = '北侧一次性饮剂 +1。';
  }
  if (region === 2 && x === 13 && y === 9 && !game.visited.southCache) {
    game.stock.kit++; game.visited.southCache = true; game.message = '南侧一次性药包 +1。';
  }
  const foe = ENCOUNTER[`${region}:${x},${y}`];
  if (foe && !game.cleared[foe]) beginBattle(game, foe);
  else if (x === EXIT.x && y === EXIT.y) finishRegion(game);
  else if (x === CAMP.x && y === CAMP.y) game.message = region === 0 ? '回到山口营地。E 休整耗 1 口粮。' : '回到本区入口。E 休整；可从这里返回上一区。';
  return true;
}

export function canOpenWard(game) {
  return game.status === 'exploring' && game.region === 1 && game.pos.x === 9 && game.pos.y === 4 && !game.visited.ward;
}

export function interact(game) {
  if (canOpenWard(game)) {
    if (game.party[2].hp === 0 || game.party[2].mp < 2) { game.message = '丘需要存活且有 2 法力；可用饮剂或绕下路，不消耗行动。'; return false; }
    game.party[2].mp -= 2; game.visited.ward = true;
    game.message = '丘耗 2 法力拆除封障。这条近路永久开启，回访无需再付。'; return true;
  }
  if (game.status !== 'exploring' || game.pos.x !== CAMP.x || game.pos.y !== CAMP.y) return false;
  const needs = game.party.some((p, i) => p.hp < HEROES[i].maxHp || p.mp < HEROES[i].maxMp);
  if (!needs) { game.message = '队伍已满，不消耗口粮。'; return false; }
  if (game.stock.ration > 0) {
    game.stock.ration--; game.rests++;
    game.party.forEach((p, i) => { p.hp = Math.min(HEROES[i].maxHp, p.hp + 4); p.mp = Math.min(HEROES[i].maxMp, p.mp + 2); });
    game.message = '营地休整：口粮 -1，每人最多恢复 4 生命和 2 法力。'; return true;
  }
  if (game.region > 0 && !game.emergencyUsed[game.region]) {
    game.emergencyUsed[game.region] = true; game.rests++;
    game.party.forEach((p, i) => { p.hp = Math.max(p.hp, Math.min(8, HEROES[i].maxHp)); p.mp = Math.max(p.mp, Math.min(2, HEROES[i].maxMp)); });
    game.message = '无粮应急布棚已用：每人生命至少 8（不超过上限），法力至少 2；本区只能用一次。'; return true;
  }
  game.message = '口粮已尽，本区应急布棚也已用。可返前区寻找未取补给，或重试当前区；普通攻击仍可用。'; return false;
}

export function rest(game) { return interact(game); }

export function backtrack(game) {
  if (game.status !== 'exploring' || game.region === 0 || game.pos.x !== CAMP.x || game.pos.y !== CAMP.y) return false;
  game.region--; game.pos = { x: EXIT.x, y: EXIT.y - 1 };
  game.entry = checkpoint(game.entries[game.region]);
  game.message = `返回${REGIONS[game.region].name}。已清敌人和已领补给不会重置；走回出口可继续前行。`;
  return true;
}

export function advanceRegion(game) {
  if (game.status !== 'stageClear' || game.region >= 2) return false;
  game.region++; game.pos = { ...CAMP }; game.status = 'exploring'; game.battle = null;
  game.entry = entrySnapshot(game);
  game.entries[game.region] = checkpoint(game.entry);
  game.message = `${REGIONS[game.region].name}：${REGIONS[game.region].short}资源原样结转。`;
  return true;
}

export function retryCurrentStage(game) {
  if (!game.entry || !Number.isInteger(game.region) || game.region < 0 || game.region > 2) return false;
  const entry = JSON.parse(JSON.stringify(game.entry));
  game.party = entry.party; game.stock = entry.stock; game.visited = entry.visited; game.cleared = entry.cleared;
  game.emergencyUsed = entry.emergencyUsed; game.steps = entry.steps;
  game.regionSteps = entry.regionSteps; game.rests = entry.rests;
  game.results[game.region] = null; game.regionsCleared[game.region] = false;
  game.pos = { ...CAMP }; game.battle = null; game.status = 'exploring'; game.resumeStatus = null;
  game.message = `${REGIONS[game.region].name}从本区起点重试；前区记录和资源结转点不变。`;
  return true;
}

export function useItem(game, item, target) {
  if (!['battle', 'exploring'].includes(game.status) || !Number.isInteger(target) || target < 0 || target >= HEROES.length) return false;
  const member = game.party[target], hero = HEROES[target];
  if (item === 'kit' && game.stock.kit > 0 && member.hp > 0 && member.hp < hero.maxHp) {
    game.stock.kit--; member.hp = Math.min(hero.maxHp, member.hp + 5); game.message = `给${hero.name}使用药包，恢复生命。`;
  } else if (item === 'tonic' && game.stock.tonic > 0 && member.hp > 0 && member.mp < hero.maxMp) {
    game.stock.tonic--; member.mp = Math.min(hero.maxMp, member.mp + 3); game.message = `给${hero.name}使用饮剂，恢复法力。`;
  } else { game.message = '物品不足，或所选队员无法受益；没有消耗物品和行动。'; return false; }
  if (game.status === 'battle') advanceActor(game);
  return true;
}

function livingTarget(game, target) {
  if (target === 'front') return game.party.findIndex(p => p.hp > 0);
  for (let i = game.party.length - 1; i >= 0; i--) if (game.party[i].hp > 0) return i;
  return -1;
}

function enemyTurn(game) {
  const battle = game.battle, next = intent(game);
  const indices = next.target === 'all' ? game.party.map((_, i) => i) : [livingTarget(game, next.target)];
  const hits = [];
  for (const i of indices) {
    if (i < 0 || game.party[i].hp <= 0) continue;
    const damage = Math.max(1, next.damage - (battle.shelter || battle.guard[i] ? 2 : 0));
    game.party[i].hp = Math.max(0, game.party[i].hp - damage); hits.push(`${HEROES[i].name} -${damage}`);
  }
  battle.round++; battle.actor = 0;
  while (battle.actor < HEROES.length && game.party[battle.actor].hp === 0) battle.actor++;
  battle.guard = [false, false, false]; battle.shelter = false;
  game.message = `${FOES[battle.kind].name}出手：${hits.join('、') || '无人受伤'}。${intentText(game)}`;
  if (game.party.every(p => p.hp === 0)) {
    game.status = 'lost'; game.battle = null;
    game.message = '全队失去战斗力。可只重试当前区；以前区域和其他游戏存档保留。';
  }
}

function advanceActor(game) {
  const battle = game.battle; battle.actor++;
  while (battle.actor < HEROES.length && game.party[battle.actor].hp === 0) battle.actor++;
  if (battle.actor >= HEROES.length) enemyTurn(game);
}

export function battleAction(game, action, target = 0) {
  if (game.status !== 'battle' || !Number.isInteger(target) || target < 0 || target >= HEROES.length) return false;
  const battle = game.battle, actor = battle.actor;
  if (actor >= HEROES.length || game.party[actor].hp === 0) return false;
  if (action === 'kit' || action === 'tonic') return useItem(game, action, target);
  const hero = HEROES[actor], member = game.party[actor];
  if (action === 'attack') {
    const damage = armored(game) ? Math.max(1, hero.attack - 2) : hero.attack;
    battle.hp -= damage; game.message = `${hero.name}普通攻击造成 ${damage} 伤害${armored(game) ? '（镜面减伤）' : ''}。`;
  } else if (action === 'guard') {
    battle.guard[actor] = true; game.message = `${hero.name}防守本轮来袭。`;
  } else if (action === 'skill' && actor === 0) {
    battle.shelter = true; game.message = '岚结阵：本轮全队受到的每次伤害减少 2，至少承受 1。';
  } else if (action === 'skill' && actor === 1 && member.mp >= 2 && game.party[target].hp > 0 && game.party[target].hp < HEROES[target].maxHp) {
    member.mp -= 2; game.party[target].hp = Math.min(HEROES[target].maxHp, game.party[target].hp + 5);
    game.message = `遥治疗${HEROES[target].name}，法力 -2。`;
  } else if (action === 'skill' && actor === 2 && member.mp >= 2) {
    member.mp -= 2; battle.hp -= 5; game.message = '丘破甲造成 5 伤害，法力 -2；可穿透镜面。';
  } else { game.message = '当前技能法力不足或目标无需治疗；没有消耗行动。'; return false; }
  if (battle.hp <= 0) {
    const kind = battle.kind, name = FOES[kind].name;
    game.cleared[kind] = true; game.battle = null; game.status = 'exploring';
    if (kind === 'guardian' || kind === 'final') finishRegion(game);
    else game.message = `${name}已清除，回访这条路不再战斗。`;
    return true;
  }
  advanceActor(game); return true;
}

export function pause(game) {
  if (!['exploring', 'battle'].includes(game.status)) return false;
  game.resumeStatus = game.status; game.status = 'paused'; return true;
}
export function resume(game) {
  if (game.status !== 'paused' || !['exploring', 'battle'].includes(game.resumeStatus)) return false;
  game.status = game.resumeStatus; game.resumeStatus = null; return true;
}
export function checkpoint(game) { return JSON.parse(JSON.stringify(game)); }

function validSnapshot(s) {
  return !!s && Array.isArray(s.party) && s.party.length === 3 && s.party.every((p, i) =>
    Number.isInteger(p.hp) && p.hp >= 0 && p.hp <= HEROES[i].maxHp && Number.isInteger(p.mp) && p.mp >= 0 && p.mp <= HEROES[i].maxMp) &&
    s.stock && ['ration', 'kit', 'tonic'].every(k => Number.isInteger(s.stock[k]) && s.stock[k] >= 0 && s.stock[k] <= 10) &&
    s.visited && ['cache', 'bridge', 'ward', 'archiveCache', 'northHatch', 'northCache', 'southCache'].every(k => typeof s.visited[k] === 'boolean') &&
    s.cleared && Object.keys(FOES).every(k => typeof s.cleared[k] === 'boolean') &&
    Array.isArray(s.emergencyUsed) && s.emergencyUsed.length === 3 && s.emergencyUsed.every(v => typeof v === 'boolean') &&
    Number.isInteger(s.steps) && s.steps >= 0 && Array.isArray(s.regionSteps) && s.regionSteps.length === 3 &&
    s.regionSteps.every(v => Number.isInteger(v) && v >= 0) && Number.isInteger(s.rests) && s.rests >= 0;
}

export function restore(raw) {
  try {
    if (!raw || raw.version !== 2 || !Number.isInteger(raw.region) || raw.region < 0 || raw.region > 2 ||
      !['ready', 'exploring', 'battle', 'paused', 'stageClear', 'won', 'lost'].includes(raw.status) ||
      !walkable(raw.pos?.x, raw.pos?.y, raw.region) || !validSnapshot(raw) || !validSnapshot(raw.entry) ||
      !Array.isArray(raw.entries) || raw.entries.length !== 3 || !validSnapshot(raw.entries[raw.region]) ||
      raw.entries.some(item => item !== null && !validSnapshot(item)) ||
      !Array.isArray(raw.regionsCleared) || raw.regionsCleared.length !== 3 || raw.regionsCleared.some(v => typeof v !== 'boolean') ||
      !Array.isArray(raw.results) || raw.results.length !== 3 || typeof raw.message !== 'string' || raw.message.length > 280 ||
      (raw.status === 'paused' && !['exploring', 'battle'].includes(raw.resumeStatus)) ||
      ((raw.status === 'battle' || raw.status === 'paused' && raw.resumeStatus === 'battle') &&
        (!raw.battle || !FOES[raw.battle.kind] || !Number.isInteger(raw.battle.hp) || raw.battle.hp < 1 || raw.battle.hp > FOES[raw.battle.kind].hp ||
          !Number.isInteger(raw.battle.round) || raw.battle.round < 0 || !Number.isInteger(raw.battle.actor) || raw.battle.actor < 0 || raw.battle.actor >= 3 ||
          !Array.isArray(raw.battle.guard) || raw.battle.guard.length !== 3 || raw.battle.guard.some(v => typeof v !== 'boolean') || typeof raw.battle.shelter !== 'boolean'))) return null;
    const game = checkpoint(raw);
    if (game.status === 'exploring' || game.status === 'battle') {
      game.resumeStatus = game.status; game.status = 'paused'; game.message = '已恢复存档并暂停。点继续后从当前位置接着行动。';
    }
    return game;
  } catch { return null; }
}

export function migrateLegacy(raw) {
  const old = restoreFirstPass(raw); if (!old) return null;
  const game = createGame();
  game.party = old.party; game.stock = old.stock;
  game.visited.cache = old.visited.cache; game.visited.bridge = old.visited.bridge;
  game.cleared.upper = old.cleared.upper; game.cleared.lower = old.cleared.lower; game.cleared.guardian = old.cleared.guardian;
  game.pos = old.pos; game.steps = old.steps; game.regionSteps[0] = old.steps;
  game.rests = old.rests; game.message = old.message;
  game.battle = old.battle; game.status = old.status; game.resumeStatus = old.resumeStatus;
  if (old.status === 'won') finishRegion(game);
  return game;
}
