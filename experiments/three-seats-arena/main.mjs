import { SAVE_KEY, FIGHTERS, OPPONENT_PLANS, STEP, createGame, setOrder, setOpponentPlan, start, pause, step, checkpoint, restore } from './engine.mjs?v=three-seats-dual-order-art-1';
import { render } from './render.mjs?v=three-seats-dual-order-art-1';

const $ = id => document.getElementById(id);
let game = createGame(), blocked = false, note = '', last = performance.now(), accumulator = 0, lastSaveTick = -1, renderedOrder = '';
const keys = new Set(), touches = new Map(), pending = { light: false, heavy: false };
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) { const loaded = restore(JSON.parse(raw)); if (loaded) { game = loaded; note = '已恢复本场；继续前先看双方顺序。'; }
    else { blocked = true; note = '原记录不能读取，未覆盖。可确认重新排阵。'; } }
} catch { blocked = true; note = '存储不可用或记录损坏；可确认重新排阵并继续游玩。'; }
function save() {
  if (blocked) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(checkpoint(game))); lastSaveTick = game.tick; }
  catch { note = '本次可继续游玩，但关闭页面可能无法保留进度。'; }
}
function clearInput() {
  keys.clear(); touches.clear(); pending.light = false; pending.heavy = false;
  document.querySelectorAll('[data-control]').forEach(b => b.classList.remove('active'));
}
function isHeld(action) { return keys.has(action) || [...touches.values()].some(a => a === action); }
function renderOrder() {
  const key = `${game.order.join(',')}|${game.enemyOrder.join(',')}|${game.status === 'ready'}|${blocked}`;
  if (key === renderedOrder) return;
  renderedOrder = key;
  const order = $('order'); order.replaceChildren();
  game.order.forEach((id, index) => {
    const row = document.createElement('div'); row.className = 'order-row';
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = index + 1;
    const desc = document.createElement('div'); const label = document.createElement('b'); label.textContent = FIGHTERS[id].name + ' · ' + FIGHTERS[id].title;
    const detail = document.createElement('small'); detail.textContent = `${FIGHTERS[id].maxHp} 余血 · ${id === 'swift' ? '快步近攻' : id === 'reach' ? '长袖牵制' : '挡后重击'}`;
    desc.append(label, detail); const sort = document.createElement('div'); sort.className = 'sort';
    for (const [symbol, delta] of [['↑', -1], ['↓', 1]]) {
      const b = document.createElement('button'); b.textContent = symbol; b.disabled = blocked || game.status !== 'ready' || index + delta < 0 || index + delta > 2;
      b.setAttribute('aria-label', `将 ${FIGHTERS[id].name} ${delta < 0 ? '提前' : '后移'}一位`);
      b.onclick = () => { const next = [...game.order]; [next[index], next[index + delta]] = [next[index + delta], next[index]];
        if (setOrder(game, next)) { save(); update(); } };
      sort.append(b);
    }
    row.append(badge, desc, sort); order.append(row);
  });
  const plans = $('opponent-plans'); plans.replaceChildren();
  OPPONENT_PLANS.forEach(plan => {
    const b = document.createElement('button');
    const chosen = plan.order.join(',') === game.enemyOrder.join(',');
    b.textContent = `${plan.title} · ${plan.order.map(id => FIGHTERS[id].name).join(' → ')}`;
    b.setAttribute('aria-pressed', String(chosen));
    b.disabled = blocked || game.status !== 'ready';
    b.onclick = () => { if (setOpponentPlan(game, plan.id)) { save(); update(); } };
    plans.append(b);
  });
}
function readout() {
  if (blocked) return note;
  if (game.status === 'ready') return `己方可换位。当前对手依次为 ${game.enemyOrder.map(id => FIGHTERS[id].name).join(' → ')}；两套对照只改变顺序。`;
  if (game.status === 'paused') return '已暂停，双方动作和计时冻结；点继续后恢复。';
  if (game.status === 'between') return '下一席入场，余血留在仍站立的拳手身上。';
  if (game.status === 'won' || game.status === 'lost') return game.result;
  const e = game.actors.enemy, p = game.actors.player;
  const cue = e.phase === 'startup' ? `对方${FIGHTERS[e.id].name}正在${e.move === 'heavy' ? '重击' : '轻击'}蓄势；浅金线为当前攻击距离。` :
    e.phase === 'recovery' ? `对方${FIGHTERS[e.id].name}正在收招，可以接近反击。` :
    e.guard ? `对方${FIGHTERS[e.id].name}正在防守；先调整距离或等其松手。` : `对方${FIGHTERS[e.id].name}尚可行动。`;
  const selfMove = p.move === 'heavy' ? '重击' : '轻击';
  const self = p.phase === 'startup' ? `己方${selfMove}蓄势中。` : p.phase === 'recovery' ? `己方${selfMove}收招中，暂不能再攻击或防守。` :
    p.phase === 'stunned' ? '己方受击短暂停顿。' : p.guard ? '己方正在防守。' : '己方可移动、攻击或防守。';
  return `${cue}\n${self}`;
}
function update() {
  renderOrder();
  const player = game.teams.player, enemy = game.teams.enemy;
  $('player-line').textContent = game.order.map((id, i) => `${FIGHTERS[id].name}${player[i].hp <= 0 ? ' ×' : ''}`).join(' → ');
  $('enemy-line').textContent = game.enemyOrder.map((id, i) => `${FIGHTERS[id].name}${enemy[i].hp <= 0 ? ' ×' : ''}`).join(' → ');
  $('player-hp').textContent = game.active.player < 3 ? `当前 ${FIGHTERS[game.order[game.active.player]].name} ${player[game.active.player].hp}/${FIGHTERS[game.order[game.active.player]].maxHp}` : '三席已退';
  $('enemy-hp').textContent = game.active.enemy < 3 ? `当前 ${FIGHTERS[game.enemyOrder[game.active.enemy]].name} ${enemy[game.active.enemy].hp}/${FIGHTERS[game.enemyOrder[game.active.enemy]].maxHp}` : '三席已退';
  $('seat-count').textContent = `己 ${Math.min(3, game.active.player + 1)} · 对 ${Math.min(3, game.active.enemy + 1)}`;
  $('match-state').textContent = ({ ready: '排阵', running: '交手', between: '换席', paused: '暂停', won: '获胜', lost: '失利' })[game.status];
  $('event').textContent = note || game.events.at(-1) || '观察距离与前摇，再决定出手。';
  $('combat-readout').textContent = readout();
  $('setup').hidden = game.status !== 'ready';
  $('pause').disabled = blocked || !['running', 'between', 'paused'].includes(game.status);
  $('pause').textContent = game.status === 'paused' ? '继续' : '暂停';
  $('start').disabled = blocked;
  const ended = game.status === 'won' || game.status === 'lost';
  $('result').hidden = !ended; $('result-actions').hidden = !ended;
  $('result').textContent = ended ? `${game.status === 'won' ? '本场获胜' : '本场失利'}：${game.result}` : '';
  render($('arena'), game, { reduced: reduced.matches });
}
function showConfirm(mode) {
  if (game.status === 'running' || game.status === 'between') { pause(game); clearInput(); save(); }
  $('confirm-title').textContent = mode === 'retry' ? '重试本场？' : '重新排阵？';
  $('confirm-copy').textContent = mode === 'retry' ? '同一顺序从满余血重新开赛；本次进度会被替换。' : '回到赛前重新调整三席顺序；本次进度会被替换。';
  $('confirm').dataset.mode = mode; $('confirm').showModal();
}
function doReset() {
  const mode = $('confirm').dataset.mode, order = [...game.order], enemyPlan = OPPONENT_PLANS.find(plan => plan.order.join(',') === game.enemyOrder.join(',')); $('confirm').close();
  game = createGame(); setOrder(game, order); setOpponentPlan(game, enemyPlan.id); if (mode === 'retry') start(game);
  blocked = false; note = ''; clearInput(); accumulator = 0; last = performance.now(); save(); update();
}
$('start').onclick = () => { if (!blocked && start(game)) { note = ''; clearInput(); save(); update(); document.querySelector('.arena-wrap').scrollIntoView({ block: 'start', behavior: 'instant' }); } };
$('pause').onclick = () => { if (pause(game)) { note = ''; clearInput(); last = performance.now(); save(); update(); } };
$('restart').onclick = () => showConfirm('reorder'); $('retry').onclick = () => showConfirm('retry'); $('reorder').onclick = () => showConfirm('reorder');
$('cancel-reset').onclick = () => $('confirm').close(); $('confirm-reset').onclick = doReset;
$('help').onclick = () => { if (game.status === 'running' || game.status === 'between') { pause(game); clearInput(); save(); } $('manual').showModal(); update(); };
$('close-manual').onclick = () => $('manual').close();
const map = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', KeyJ: 'light', KeyK: 'heavy', KeyL: 'guard' };
window.addEventListener('keydown', e => {
  if (e.code === 'KeyP' && !e.repeat) { e.preventDefault(); $('pause').click(); return; }
  if (!map[e.code] || game.status !== 'running' || $('confirm').open || $('manual').open) return;
  e.preventDefault(); if (e.repeat) return;
  const action = map[e.code]; if (action === 'light' || action === 'heavy') pending[action] = true; else keys.add(action);
});
window.addEventListener('keyup', e => { if (map[e.code]) { e.preventDefault(); keys.delete(map[e.code]); } });
document.querySelectorAll('[data-control]').forEach(b => {
  const action = b.dataset.control;
  const release = e => { if (touches.get(e.pointerId) === action) { touches.delete(e.pointerId); if (![...touches.values()].includes(action)) b.classList.remove('active'); } };
  b.addEventListener('pointerdown', e => {
    if (game.status !== 'running' || $('confirm').open || $('manual').open) return;
    e.preventDefault(); b.setPointerCapture(e.pointerId); touches.set(e.pointerId, action); b.classList.add('active');
    if (action === 'light' || action === 'heavy') pending[action] = true;
  });
  b.addEventListener('pointerup', release); b.addEventListener('pointercancel', release); b.addEventListener('lostpointercapture', release);
});
window.addEventListener('blur', () => { clearInput(); if (game.status === 'running' || game.status === 'between') { pause(game); save(); update(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); if (game.status === 'running' || game.status === 'between') { pause(game); save(); update(); } } });
window.addEventListener('pagehide', () => { clearInput(); save(); });
function frame(now) {
  const delta = Math.min(.08, Math.max(0, (now - last) / 1000)); last = now;
  if ((game.status === 'running' || game.status === 'between') && !$('confirm').open && !$('manual').open) {
    accumulator += delta;
    while (accumulator >= STEP) {
      const control = { left: isHeld('left'), right: isHeld('right'), guard: isHeld('guard'), light: pending.light, heavy: pending.heavy };
      const previous = game.status; step(game, control, STEP); pending.light = false; pending.heavy = false; accumulator -= STEP;
      if (game.status !== previous || game.tick - lastSaveTick >= 60) save();
    }
    update();
  } else accumulator = 0;
  requestAnimationFrame(frame);
}
window.__threeSeats = Object.freeze({ state: () => checkpoint(game) });
update(); requestAnimationFrame(frame);
