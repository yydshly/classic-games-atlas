// 雾灯远行：风墙山口。纯规则模块，不读取其他作品的存档。
export const WIDTH = 23;
export const HEIGHT = 13;
export const CAMP = { x: 2, y: 6 };
export const EXIT = { x: 20, y: 6 };
export const SAVE_KEY = 'classic-games-atlas:mist-lamp-pass:v1';

export const HEROES = [
  { id: 'lin', name: '岚', role: '护卫', maxHp: 12, maxMp: 0, attack: 2, skill: '结阵：本轮全队减伤' },
  { id: 'yao', name: '遥', role: '医者', maxHp: 8, maxMp: 5, attack: 1, skill: '疗愈：耗 2 法力，为指定队员恢复 5 生命' },
  { id: 'qiu', name: '丘', role: '测绘师', maxHp: 9, maxMp: 4, attack: 2, skill: '破甲：耗 2 法力，造成 5 伤害' },
];

export const FOES = {
  upper: { name: '风墙哨兵', hp: 17, pattern: [{ target: 'front', damage: 4 }, { target: 'rear', damage: 3 }, { target: 'all', damage: 2 }] },
  lower: { name: '石径游影', hp: 10, pattern: [{ target: 'front', damage: 2 }, { target: 'rear', damage: 2 }] },
  guardian: { name: '雾灯守机', hp: 17, pattern: [{ target: 'all', damage: 2 }, { target: 'front', damage: 4 }, { target: 'rear', damage: 3 }] },
};

const SPECIAL = { '10,4': 'upper', '13,10': 'lower', '20,6': 'guardian' };
export function walkable(x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  return (x === 2 && y >= 4 && y <= 10) ||
    (x === 20 && y >= 4 && y <= 10) ||
    (y === 4 && x >= 2 && x <= 20) ||
    (y === 10 && x >= 2 && x <= 20);
}

export function createGame() {
  return {
    version: 1, status: 'ready', resumeStatus: null, pos: { ...CAMP },
    party: HEROES.map(hero => ({ hp: hero.maxHp, mp: hero.maxMp })),
    stock: { ration: 2, kit: 1, tonic: 1 },
    visited: { cache: false, bridge: false },
    cleared: { upper: false, lower: false, guardian: false },
    battle: null, steps: 0, rests: 0, message: '从营地出发。上路近但哨兵强；下路远，渡道耗 1 口粮，补给只可领取一次。',
  };
}

export function start(game) {
  if (game.status !== 'ready') return false;
  game.status = 'exploring';
  game.message = '寻找山口尽头的雾灯，选择上路或下路。E 可在营地消耗口粮休整。';
  return true;
}

export function intent(game) {
  if (!game.battle) return null;
  const foe = FOES[game.battle.kind];
  return foe.pattern[game.battle.round % foe.pattern.length];
}

export function intentText(game) {
  const next = intent(game);
  if (!next) return '';
  const label = next.target === 'all' ? '全队' : next.target === 'front' ? '前排队员' : '后排队员';
  return `下一击：${label}，基础伤害 ${next.damage}。防守可减伤。`;
}

function beginBattle(game, kind) {
  game.battle = { kind, hp: FOES[kind].hp, round: 0, actor: 0, guard: [false, false, false], shelter: false };
  game.status = 'battle';
  game.message = `${FOES[kind].name}拦路。${intentText(game)}`;
}

export function move(game, dx, dy) {
  if (game.status !== 'exploring' || Math.abs(dx) + Math.abs(dy) !== 1) return false;
  const x = game.pos.x + dx, y = game.pos.y + dy;
  if (!walkable(x, y)) { game.message = '岩壁挡住去路。沿亮色石径前进。'; return false; }
  if (x === 16 && y === 10 && !game.visited.bridge) {
    if (game.stock.ration < 1) { game.message = '下路渡道需 1 份口粮。可返回营地改走上路；不会失去行动能力。'; return false; }
    game.stock.ration--;
    game.visited.bridge = true;
    game.message = '花费 1 份口粮通过渡道。再次往返无需重复支付。';
  }
  game.pos = { x, y };
  game.steps++;
  if (x === 9 && y === 10 && !game.visited.cache) {
    game.stock.tonic++;
    game.visited.cache = true;
    game.message = '找到一次性补给：法力饮剂 +1。长路仍需通过耗粮渡道。';
  }
  const foe = SPECIAL[`${x},${y}`];
  if (foe && !game.cleared[foe]) beginBattle(game, foe);
  else if (x === CAMP.x && y === CAMP.y) game.message = '回到营地。E 休整会消耗 1 口粮；营地不免费补满资源。';
  return true;
}

export function rest(game) {
  if (game.status !== 'exploring' || game.pos.x !== CAMP.x || game.pos.y !== CAMP.y) return false;
  if (game.stock.ration < 1) { game.message = '口粮不足。仍可沿上路前进，普通攻击不消耗法力。'; return false; }
  if (game.party.every((member, i) => member.hp === HEROES[i].maxHp && member.mp === HEROES[i].maxMp)) {
    game.message = '队伍状态已满，暂不消耗口粮。'; return false;
  }
  game.stock.ration--;
  game.rests++;
  game.party.forEach((member, i) => {
    member.hp = Math.min(HEROES[i].maxHp, member.hp + 4);
    member.mp = Math.min(HEROES[i].maxMp, member.mp + 2);
  });
  game.message = '营地休整：口粮 -1；每人最多恢复 4 生命和 2 法力。';
  return true;
}

export function useItem(game, item, target) {
  if (!['battle', 'exploring'].includes(game.status) || !Number.isInteger(target) || target < 0 || target >= HEROES.length) return false;
  const member = game.party[target], hero = HEROES[target];
  if (item === 'kit' && game.stock.kit > 0 && member.hp > 0 && member.hp < hero.maxHp) {
    game.stock.kit--;
    member.hp = Math.min(hero.maxHp, member.hp + 5);
    game.message = `给${hero.name}使用药包，恢复生命。`;
  } else if (item === 'tonic' && game.stock.tonic > 0 && member.hp > 0 && member.mp < hero.maxMp) {
    game.stock.tonic--;
    member.mp = Math.min(hero.maxMp, member.mp + 3);
    game.message = `给${hero.name}使用饮剂，恢复法力。`;
  } else {
    game.message = '物品不足，或所选队员目前无法受益；没有消耗物品和行动。';
    return false;
  }
  if (game.status === 'battle') advanceActor(game);
  return true;
}

function livingTarget(game, target) {
  if (target === 'front') return game.party.findIndex(member => member.hp > 0);
  for (let i = game.party.length - 1; i >= 0; i--) if (game.party[i].hp > 0) return i;
  return -1;
}

function enemyTurn(game) {
  const battle = game.battle, next = intent(game);
  const indices = next.target === 'all' ? game.party.map((_, i) => i) : [livingTarget(game, next.target)];
  const hits = [];
  for (const i of indices) {
    if (i < 0 || game.party[i].hp <= 0) continue;
    const reduced = battle.shelter || battle.guard[i];
    const damage = Math.max(1, next.damage - (reduced ? 2 : 0));
    game.party[i].hp = Math.max(0, game.party[i].hp - damage);
    hits.push(`${HEROES[i].name} -${damage}`);
  }
  battle.round++;
  battle.actor = 0;
  while (battle.actor < HEROES.length && game.party[battle.actor].hp === 0) battle.actor++;
  battle.guard = [false, false, false];
  battle.shelter = false;
  game.message = `${FOES[battle.kind].name}出手：${hits.join('、') || '无人受伤'}。${intentText(game)}`;
  if (game.party.every(member => member.hp === 0)) {
    game.status = 'lost';
    game.battle = null;
    game.message = '全队失去战斗力。可从山口起点重试，原有其他游戏存档不受影响。';
  }
}

function advanceActor(game) {
  const battle = game.battle;
  battle.actor++;
  while (battle.actor < HEROES.length && game.party[battle.actor].hp === 0) battle.actor++;
  if (battle.actor >= HEROES.length) enemyTurn(game);
}

export function battleAction(game, action, target = 0) {
  if (game.status !== 'battle' || !Number.isInteger(target) || target < 0 || target >= HEROES.length) return false;
  const battle = game.battle;
  if (battle.actor >= HEROES.length || game.party[battle.actor].hp === 0) return false;
  if (action === 'kit' || action === 'tonic') return useItem(game, action, target);
  const actor = battle.actor, hero = HEROES[actor], member = game.party[actor];
  if (action === 'attack') {
    battle.hp -= hero.attack;
    game.message = `${hero.name}普通攻击，造成 ${hero.attack} 伤害。`;
  } else if (action === 'guard') {
    battle.guard[actor] = true;
    game.message = `${hero.name}防守本轮来袭。`;
  } else if (action === 'skill' && actor === 0) {
    battle.shelter = true;
    game.message = '岚结阵：本轮全队受到的每次伤害减少 2，至少承受 1。';
  } else if (action === 'skill' && actor === 1 && member.mp >= 2 && game.party[target].hp > 0 && game.party[target].hp < HEROES[target].maxHp) {
    member.mp -= 2;
    game.party[target].hp = Math.min(HEROES[target].maxHp, game.party[target].hp + 5);
    game.message = `遥治疗${HEROES[target].name}，法力 -2。`;
  } else if (action === 'skill' && actor === 2 && member.mp >= 2) {
    member.mp -= 2;
    battle.hp -= 5;
    game.message = '丘破甲，造成 5 伤害，法力 -2。';
  } else {
    game.message = '当前技能法力不足或目标无需治疗；没有消耗行动。';
    return false;
  }
  if (battle.hp <= 0) {
    const name = FOES[battle.kind].name;
    game.cleared[battle.kind] = true;
    game.battle = null;
    game.status = battle.kind === 'guardian' ? 'won' : 'exploring';
    game.message = game.status === 'won' ? `雾灯重新亮起。${name}已清除，山口首段完成。` : `${name}已清除；回访这条路不再战斗。`;
    return true;
  }
  advanceActor(game);
  return true;
}

export function pause(game) {
  if (!['exploring', 'battle'].includes(game.status)) return false;
  game.resumeStatus = game.status;
  game.status = 'paused';
  return true;
}

export function resume(game) {
  if (game.status !== 'paused' || !['exploring', 'battle'].includes(game.resumeStatus)) return false;
  game.status = game.resumeStatus;
  game.resumeStatus = null;
  return true;
}

export function checkpoint(game) {
  return JSON.parse(JSON.stringify(game));
}

export function restore(raw) {
  try {
    if (!raw || raw.version !== 1 || !['ready', 'exploring', 'battle', 'paused', 'won', 'lost'].includes(raw.status) ||
      !walkable(raw.pos?.x, raw.pos?.y) || !Array.isArray(raw.party) || raw.party.length !== HEROES.length ||
      raw.party.some((p, i) => !Number.isInteger(p.hp) || p.hp < 0 || p.hp > HEROES[i].maxHp || !Number.isInteger(p.mp) || p.mp < 0 || p.mp > HEROES[i].maxMp) ||
      !raw.stock || ['ration', 'kit', 'tonic'].some(k => !Number.isInteger(raw.stock[k]) || raw.stock[k] < 0 || raw.stock[k] > 10) ||
      !raw.visited || !raw.cleared || ['cache', 'bridge'].some(k => typeof raw.visited[k] !== 'boolean') ||
      ['upper', 'lower', 'guardian'].some(k => typeof raw.cleared[k] !== 'boolean') ||
      !Number.isInteger(raw.steps) || raw.steps < 0 || !Number.isInteger(raw.rests) || raw.rests < 0 ||
      typeof raw.message !== 'string' || raw.message.length > 240 ||
      ((raw.status === 'battle' || raw.status === 'paused' && raw.resumeStatus === 'battle') &&
        (!raw.battle || !FOES[raw.battle.kind] || !Number.isInteger(raw.battle.hp) || raw.battle.hp < 1 || raw.battle.hp > FOES[raw.battle.kind].hp ||
          !Number.isInteger(raw.battle.round) || raw.battle.round < 0 || !Number.isInteger(raw.battle.actor) || raw.battle.actor < 0 || raw.battle.actor >= HEROES.length ||
          !Array.isArray(raw.battle.guard) || raw.battle.guard.length !== 3 || raw.battle.guard.some(v => typeof v !== 'boolean') || typeof raw.battle.shelter !== 'boolean')) ||
      (raw.status === 'paused' && !['exploring', 'battle'].includes(raw.resumeStatus))) return null;
    const game = checkpoint(raw);
    if (game.status === 'exploring' || game.status === 'battle') {
      game.resumeStatus = game.status;
      game.status = 'paused';
      game.message = '已恢复存档并暂停，点继续后接着行动。';
    }
    return game;
  } catch { return null; }
}
