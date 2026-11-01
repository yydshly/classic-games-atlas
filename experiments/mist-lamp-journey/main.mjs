import { SAVE_KEY, LEGACY_SAVE_KEY, REGIONS, HEROES, FOES, createGame, migrateLegacy, start,
  move, interact, canOpenWard, backtrack, advanceRegion, retryCurrentStage, useItem, battleAction,
  intentText, pause, resume, checkpoint, restore } from './engine.mjs?v=mist-lamp-three-regions-1';
import { renderScene } from './view.mjs?v=mist-lamp-three-regions-1';

const $ = id => document.getElementById(id);
const scene = $('scene'), confirm = $('confirm');
let game, migrated = false;
try {
  game = restore(JSON.parse(localStorage.getItem(SAVE_KEY)));
  if (!game) {
    game = migrateLegacy(JSON.parse(localStorage.getItem(LEGACY_SAVE_KEY)));
    migrated = !!game;
  }
} catch { game = null; }
if (!game) game = createGame();
let activeMove = null, lastCombatAction = 0;

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(checkpoint(game))); }
  catch { $('message').textContent = '本机存储不可用；本次可继续游玩，但刷新后无法续档。'; }
}
function render() {
  renderScene(scene, game);
  document.body.classList.toggle('in-battle', game.status === 'battle');
  document.body.classList.toggle('finished', ['stageClear', 'won', 'lost'].includes(game.status));
  if (game.status !== 'battle') document.body.classList.remove('compact-battle');
  $('region-title').textContent = `第 ${game.region + 1} 段 · ${REGIONS[game.region].name}`;
  $('region-goal').textContent = REGIONS[game.region].goal;
  $('region-brief').textContent = REGIONS[game.region].short;
  $('intro-text').textContent = `带岚、遥和丘穿过三区重启主灯。当前：${REGIONS[game.region].name}。生命、法力与物品连续结转；进入下一区不会自动补满。`;
  $('stage-summary').textContent = game.regionsCleared.map((done, i) => `${i + 1} ${REGIONS[i].name} ${done ? '✓' : i === game.region ? '· 当前' : '· 待到达'}`).join('　');
  const active = game.status === 'battle' ? game.battle.actor : -1;
  $('party').innerHTML = HEROES.map((hero, i) => `<div class="member ${active === i ? 'active' : ''} ${game.party[i].hp === 0 ? 'down' : ''}"><b>${hero.name} · ${hero.role}</b><small>${hero.skill}</small><span>生命 ${game.party[i].hp}/${hero.maxHp}</span><span>法力 ${game.party[i].mp}/${hero.maxMp}</span></div>`).join('');
  $('stock').textContent = `口粮 ${game.stock.ration} · 药包 ${game.stock.kit} · 饮剂 ${game.stock.tonic} · 累计 ${game.steps} 步`;
  $('message').textContent = game.message;
  const phase = { ready: '准备出发', exploring: '区域探索', battle: '遭遇战', paused: '已暂停', stageClear: '本区完成', won: '短篇完成', lost: '队伍失利' };
  $('phase').textContent = phase[game.status];
  $('welcome').hidden = game.status !== 'ready';
  $('battle').hidden = game.status !== 'battle';
  $('pause').hidden = game.status === 'paused';
  $('pause').disabled = !['exploring', 'battle'].includes(game.status);
  $('resume').hidden = game.status !== 'paused';
  const atCamp = game.pos.x === 2 && game.pos.y === 6;
  $('interact').disabled = game.status !== 'exploring' || !(atCamp || canOpenWard(game));
  $('interact').textContent = canOpenWard(game) ? '拆除封障 E' : atCamp && game.stock.ration === 0 && game.region > 0 && !game.emergencyUsed[game.region] ? '无粮应急布棚 E' : '营地休整 E';
  $('backtrack').hidden = !(game.status === 'exploring' && game.region > 0 && atCamp);
  $('retry').disabled = game.status === 'ready';
  const canItem = ['battle', 'exploring'].includes(game.status);
  $('kit').disabled = !canItem || game.stock.kit < 1;
  $('tonic').disabled = !canItem || game.stock.tonic < 1;
  $('battle-kit').disabled = game.status !== 'battle' || game.stock.kit < 1;
  $('battle-tonic').disabled = game.status !== 'battle' || game.stock.tonic < 1;
  $('result').hidden = !['stageClear', 'won', 'lost'].includes(game.status);
  $('next-region').hidden = game.status !== 'stageClear';
  if (game.status === 'battle') {
    const foe = FOES[game.battle.kind], hero = HEROES[game.battle.actor];
    $('foe').textContent = `${foe.name} · ${game.battle.hp}/${foe.hp} 生命`;
    $('intent').textContent = intentText(game);
    $('actor').textContent = `现在由 ${hero.name} 行动。每位存活队员各行动一次，随后敌人按上述意图出手。`;
    $('skill-help').textContent = hero.skill;
  }
  const guides = [
    '上路较近但有强哨兵；下路较远，有较弱游影，渡道首次耗 1 口粮，过桥后才能取得一次性饮剂。到雾灯须清除守机。已清敌不复活。',
    '上路封障：站在障碍左侧按 E，丘耗 2 法力永久拆除；法力不足可用饮剂或走下路。下路需清敌，清除后取得一次性药包。到出口取回图册。',
    '中路可直达主灯。北侧死巷首次耗 1 口粮后取饮剂；南侧死巷清敌后取药包。两处补给只可领一次。主灯镜面闭合时普通攻击减 2，破甲穿透；攻击对象提前公布。',
  ];
  $('route-guide').textContent = guides[game.region];
  if (game.status === 'stageClear' || game.status === 'won' || game.status === 'lost') {
    $('result-title').textContent = game.status === 'won' ? '主灯已重启' : game.status === 'lost' ? '本区尚未通过' : `${REGIONS[game.region].name}已通过`;
    $('result-copy').textContent = game.status === 'lost' ? '全队失去战斗力。可从当前区入口资源状态重试，前区结局不清除。'
      : `当前余口粮 ${game.stock.ration}、药包 ${game.stock.kit}、饮剂 ${game.stock.tonic}。${game.status === 'stageClear' ? '前往下一区会原样带走资源，不自动补满。' : '三区结局已记录，可回顾每区资源。'}`;
    $('review').textContent = game.results.map((result, i) => result ? `${REGIONS[i].name}：${result.steps} 步，余粮 ${result.stock.ration}，药包 ${result.stock.kit}，饮剂 ${result.stock.tonic}` : '').filter(Boolean).join('｜');
  }
}
function commit(changed = true) { if (changed) save(); render(); }
function stopMoving() { if (activeMove) { clearInterval(activeMove.timer); activeMove = null; } }
function doMove(dx, dy, keyboard = false) {
  if (game.status !== 'exploring') { stopMoving(); return; }
  commit(move(game, dx, dy));
  if (keyboard && game.status === 'battle') document.body.classList.add('compact-battle');
  if (game.status !== 'exploring') stopMoving();
}
function currentTarget() { return Number($(game.status === 'battle' ? 'battle-target' : 'target').value); }
function doCombat(action) {
  if (game.status !== 'battle') return;
  const now = performance.now();
  if (now - lastCombatAction < 210) return; // 物理双击不替两名队员下令。
  const changed = battleAction(game, action, currentTarget());
  if (changed) lastCombatAction = now;
  commit(changed);
}
function doItem(item) {
  if (game.status === 'battle') doCombat(item);
  else if (game.status === 'exploring') commit(useItem(game, item, currentTarget()));
}
$('start').addEventListener('click', () => commit(start(game)));
$('interact').addEventListener('click', () => commit(interact(game)));
$('backtrack').addEventListener('click', () => commit(backtrack(game)));
$('next-region').addEventListener('click', () => commit(advanceRegion(game)));
$('pause').addEventListener('click', () => { stopMoving(); commit(pause(game)); });
$('resume').addEventListener('click', () => { commit(resume(game)); if (game.status === 'battle') document.body.classList.add('compact-battle'); });
$('kit').addEventListener('click', () => doItem('kit'));
$('tonic').addEventListener('click', () => doItem('tonic'));
$('battle-kit').addEventListener('click', () => doItem('kit'));
$('battle-tonic').addEventListener('click', () => doItem('tonic'));
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => doCombat(button.dataset.action)));
$('retry').addEventListener('click', () => { stopMoving(); confirm.showModal(); });
$('result-retry').addEventListener('click', () => confirm.showModal());
$('cancel-reset').addEventListener('click', () => confirm.close());
$('confirm-reset').addEventListener('click', () => { confirm.close(); commit(retryCurrentStage(game)); });
document.querySelectorAll('[data-move]').forEach(button => {
  button.addEventListener('click', () => { if (game.status === 'battle') document.body.classList.add('compact-battle'); });
  button.addEventListener('pointerdown', event => {
    if (game.status !== 'exploring') return;
    event.preventDefault(); stopMoving();
    const [dx, dy] = button.dataset.move.split(',').map(Number);
    button.setPointerCapture(event.pointerId);
    doMove(dx, dy);
    if (game.status === 'exploring') activeMove = { pointer: event.pointerId, timer: setInterval(() => doMove(dx, dy), 155) };
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    button.addEventListener(type, event => { if (activeMove?.pointer === event.pointerId) stopMoving(); });
});
const directions = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
document.addEventListener('keydown', event => {
  if (confirm.open || ['SELECT', 'INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (directions[event.code]) { event.preventDefault(); doMove(...directions[event.code], true); return; }
  if (event.repeat) return;
  if (event.code === 'KeyP') {
    event.preventDefault(); stopMoving();
    if (game.status === 'paused') commit(resume(game)); else commit(pause(game));
    if (game.status === 'battle') document.body.classList.add('compact-battle');
  } else if (event.code === 'KeyE') commit(interact(game));
  else if (event.code === 'Digit1') doCombat('attack');
  else if (event.code === 'Digit2') doCombat('guard');
  else if (event.code === 'Digit3') doCombat('skill');
  else if (event.code === 'Digit4') doItem('kit');
  else if (event.code === 'Digit5') doItem('tonic');
});
window.addEventListener('blur', () => { stopMoving(); if (pause(game)) commit(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopMoving(); if (pause(game)) commit(); }
});
window.addEventListener('pagehide', () => { stopMoving(); if (pause(game)) save(); });
window.addEventListener('resize', render);
if (migrated) save();
render();
