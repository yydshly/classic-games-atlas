import { LEVELS, RULES, FIXED_DT, createGame, start, pause, resume, step, action, canAction, snapshot, checkpoint, restore } from './engine.mjs';
import { render } from './renderer.mjs';
import { loadProgress, saveProgress, loadCurrent, saveCurrent, recordFinish } from './progress.mjs';

const $ = selector => document.querySelector(selector);
const canvas = $('#race'), ctx = canvas.getContext('2d');
const holdNames = ['left', 'right', 'brake', 'drift'];
const sources = Object.fromEntries(holdNames.map(name => [name, new Set()]));
const pointers = new Map(), bindings = new Map(), keyLatches = new Set();
const controlButtons = new Map([...document.querySelectorAll('[data-control]')].map(button => [button.dataset.control, button]));
const keyActions = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'brake', KeyS: 'brake', Space: 'drift', ShiftLeft: 'drift', ShiftRight: 'drift', KeyE: 'item', KeyJ: 'item' };
const itemNames = { boost: '松果冲刺', shield: '苔叶护盾', pulse: '铃果脉冲' };
const itemHints = { boost: '立即冲刺 1.3 秒', shield: '保护 2.8 秒', pulse: '干扰附近对手 1.1 秒' };
let storage = null;
try { storage = window.localStorage; } catch { /* Storage denial never blocks play. */ }
const loaded = loadProgress(storage), progress = loaded.progress;
const current = loadCurrent(storage, restore, progress.unlocked);
let game = current.game || createGame(progress.last - 1);
let storageAvailable = loaded.available && current.available, discardedResume = current.damaged;
let wasRestored = !!current.game && current.game.state === 'paused';
let dialog = null, dialogReturn = null, helpStarts = false, settled = false;
let previous = null, accumulator = 0, lastSave = 0, lastHud = 0, visualTime = 0;
let lastState = '', lastCountdown = -1, primaryAction = null, secondaryAction = null;
const reducedQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
let reducedMotion = reducedQuery?.matches === true;
reducedQuery?.addEventListener?.('change', event => { reducedMotion = event.matches; draw(); });

function active() { return !dialog && ['countdown', 'playing'].includes(game.state); }
function format(seconds) {
  const value = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${(value % 60).toFixed(1).padStart(4, '0')}`;
}
function announce(message) { $('#race-status').textContent = message; }
function resetClock() { previous = null; accumulator = 0; }
function saveNotice() {
  const note = $('#save-note');
  note.dataset.unavailable = String(!storageAvailable);
  note.textContent = storageAvailable
    ? '本机自动保存赛程、个人纪录与未完成比赛。刷新接续后先暂停；离线时间不计入比赛。'
    : '浏览器存储不可用，仍可正常比赛；刷新后可能丢失当前局、解锁与个人纪录。';
}
function remember(includeProgress = true) {
  if (includeProgress && !saveProgress(storage, progress)) storageAvailable = false;
  if (!saveCurrent(storage, game, checkpoint)) storageAvailable = false;
  saveNotice();
}
function input() {
  return { steer: Number(sources.right.size > 0) - Number(sources.left.size > 0), brake: sources.brake.size > 0, drift: sources.drift.size > 0, item: false, throttle: 1 };
}
function refreshHeld() {
  for (const name of holdNames) controlButtons.get(name).dataset.held = String(sources[name].size > 0);
}
function addSource(name, source) { if (sources[name]) { sources[name].add(source); refreshHeld(); } }
function removeSource(name, source) { if (sources[name]) { sources[name].delete(source); refreshHeld(); } }
function releasePointer(id) {
  const held = pointers.get(id);
  if (!held) return;
  pointers.delete(id);
  removeSource(held.action, `pointer:${id}`);
  try { if (held.button.hasPointerCapture?.(id)) held.button.releasePointerCapture(id); } catch { /* Pointer may already have been released by the UA. */ }
}
function clearInputs() {
  for (const id of [...pointers.keys()]) releasePointer(id);
  bindings.clear();
  for (const set of Object.values(sources)) set.clear();
  refreshHeld();
  // Physical key latches deliberately survive suspension. A held P/R/E key cannot
  // reactivate until a real keyup, even if a platform omits event.repeat.
}
function draw() { render(ctx, game, { width: canvas.width, height: canvas.height, time: visualTime, reducedMotion }); }
function fillOrder() {
  const order = $('#race-order');
  if (!order.children.length || !order.querySelector('[data-car]')) {
    order.replaceChildren(...game.cars.map(car => {
      const row = document.createElement('li'); row.dataset.car = String(car.id); row.dataset.player = String(car.id === 0);
      const rank = document.createElement('span'); rank.className = 'order-rank';
      const dot = document.createElement('span'); dot.className = 'order-dot'; dot.style.backgroundColor = car.color;
      const name = document.createElement('span'); name.className = 'order-name'; name.textContent = car.name + (car.id === 0 ? ' · 你' : '');
      const lap = document.createElement('span'); lap.className = 'order-lap';
      row.append(rank, dot, name, lap); return row;
    }));
  }
  for (const car of [...game.cars].sort((a, b) => a.place - b.place)) {
    const row = order.querySelector(`[data-car="${car.id}"]`);
    row.querySelector('.order-rank').textContent = String(car.place);
    row.querySelector('.order-lap').textContent = car.finishTime === null ? `${car.lap} / 2 圈` : format(car.finishTime);
    order.append(row);
  }
}
function hud() {
  const level = LEVELS[game.level - 1], player = game.cars[0];
  $('#course-number').textContent = `${String(game.level).padStart(2, '0')} / 08`;
  $('#course-name').textContent = level.name;
  $('#course-tip').textContent = level.tip;
  $('#goal').textContent = `双圈完赛 · ${level.targetPlace === 1 ? '夺得第一' : `前 ${level.targetPlace} 名`}`;
  $('#position').textContent = String(game.rank);
  $('#lap').textContent = `${player.lap} / ${level.laps}`;
  $('#elapsed').textContent = format(game.time);
  $('#remaining').textContent = `${game.remaining.toFixed(1)}s`;
  $('#speed').textContent = String(Math.round(player.speed));
  $('#drift-meter').value = Math.min(1, player.driftCharge / RULES.driftMaximum);
  $('#drift-label').textContent = player.boost > 0 ? '冲刺生效' : player.driftCharge >= RULES.driftMinimum ? '松开即可冲刺' : player.drifting ? '继续蓄力' : '等待入弯';
  $('#drift-hint').textContent = player.offroad ? '先回到路面，才能继续漂移' : `蓄力 ${player.driftCharge.toFixed(2)} / ${RULES.driftMinimum.toFixed(2)} 秒可冲刺`;
  $('#item-name').textContent = itemNames[player.item] || '空槽';
  $('#item-hint').textContent = itemHints[player.item] || (player.shield > 0 ? `护盾剩余 ${player.shield.toFixed(1)} 秒` : '驶过菱形补给箱');
  const best = progress.best[game.level];
  $('#best').textContent = best ? `第 ${best.place} 名 · ${format(best.time)}` : '等待第一份成绩';
  for (const name of holdNames) controlButtons.get(name).disabled = !active();
  controlButtons.get('item').disabled = !active() || !canAction(game, 'item');
  $('#pause').disabled = !!dialog || !['countdown', 'playing', 'paused'].includes(game.state);
  $('#pause').textContent = game.state === 'paused' ? '继续 P' : '暂停 P';
  fillOrder();
  if (game.state === 'countdown' && Math.ceil(game.countdown) !== lastCountdown) {
    lastCountdown = Math.ceil(game.countdown); announce(`起跑倒计时 ${lastCountdown}。倒计时结束前车辆与比赛时钟不动。`);
  }
}
function card(title, description, summary, label, actionFn, secondLabel = '选择赛道', secondFn = openChapters) {
  $('#state-card').hidden = false;
  $('#state-eyebrow').textContent = `ROUND ${String(game.level).padStart(2, '0')} / 08`;
  $('#state-title').textContent = title; $('#state-description').textContent = description; $('#state-summary').textContent = summary;
  $('#primary-action').textContent = label; $('#primary-action').disabled = false;
  $('#secondary-action').textContent = secondLabel; $('#secondary-action').disabled = false;
  primaryAction = actionFn; secondaryAction = secondFn;
}
function sync() {
  document.body.dataset.state = game.state;
  if (game.state === lastState) return;
  lastState = game.state;
  const level = LEVELS[game.level - 1];
  if (['countdown', 'playing'].includes(game.state)) {
    $('#state-card').hidden = true;
    if (game.state === 'playing') announce('绿灯亮起！自动加速中，提前转向，急弯前刹车。');
    return;
  }
  clearInputs(); resetClock();
  if (game.state === 'ready') card(level.name, level.tip, `4 车同场 · 2 圈 · 前 ${level.targetPlace} 名 · ${level.timeLimit} 秒内`, '开始比赛 ↗', begin);
  if (game.state === 'paused') card(wasRestored ? '赛况已接续，等你继续。' : '把风景，留在这一刻。', '赛车、对手与比赛时钟均已暂停。关闭手册或赛程不会自动继续。', `第 ${game.rank} 名 · ${game.cars[0].lap} / 2 圈 · ${format(game.time)}`, '继续比赛 ↗', continueRace, '重新整备', () => load(game.level));
  if (['won', 'lost'].includes(game.state)) {
    if (!settled) {
      settled = true;
      if (game.state === 'won') recordFinish(progress, game.level, game.result);
      remember();
    }
    const result = game.result;
    if (game.state === 'won') {
      card(game.level === LEVELS.length ? '八站风景，一座林野杯。' : '这一阵风，属于你。', game.level === LEVELS.length ? '八条赛道全部完成。可以回访任何一站，刷新个人成绩。' : '目标名次达成，下一条赛道已解锁。', `第 ${result.place} 名 · ${format(result.time)} · 漂移冲刺 ${game.stats.driftBoosts} 次`, game.level === LEVELS.length ? '重赛冠军环 ↗' : '下一站 ↗', () => load(Math.min(LEVELS.length, game.level + 1)));
      announce(game.level === LEVELS.length ? '八站赛程全部达标完成！个人纪录已保存在本机。' : `第 ${result.place} 名完赛，已解锁下一站。`);
    } else {
      card(game.reason === '比赛时间耗尽' ? '时间到了，再找一条好线。' : '已冲线，还差一个好名次。', game.reason === '比赛时间耗尽' ? '本场时限已到。先稳住路面，在急弯前减速，再试一次。' : `本场需要前 ${level.targetPlace} 名；试着在弯前控速，利用补给争取超车。`, `当前第 ${result.place} 名 · ${format(result.time)} · 目标前 ${level.targetPlace} 名`, '重试这一站 ↗', () => { load(game.level); begin(); });
      announce(game.reason === '比赛时间耗尽' ? '本场超时结束，可重试这一站。' : `第 ${result.place} 名冲线，未达到前 ${level.targetPlace} 名目标，可重试。`);
    }
    $('#primary-action').focus({ preventScroll: true });
  }
}
function refresh() { sync(); hud(); draw(); }
function load(id) {
  if (!Number.isInteger(id) || id < 1 || id > progress.unlocked || id > LEVELS.length) return;
  clearInputs(); resetClock();
  game = createGame(id - 1); progress.last = id; settled = false; wasRestored = false; lastState = ''; lastCountdown = -1;
  remember(); refresh(); $('#primary-action').focus({ preventScroll: true });
}
function begin() {
  if (game.state !== 'ready' || dialog) return;
  if (!progress.tutorialSeen) { helpStarts = true; openHelp(); return; }
  clearInputs(); resetClock(); wasRestored = false; start(game); remember(); refresh(); canvas.focus({ preventScroll: true });
}
function continueRace() {
  if (dialog || game.state !== 'paused') return;
  clearInputs(); resetClock(); wasRestored = false; resume(game); remember(); refresh(); canvas.focus({ preventScroll: true });
}
function suspend() {
  clearInputs(); resetClock();
  if (['countdown', 'playing'].includes(game.state)) { pause(game); wasRestored = false; remember(); }
  refresh();
}
function togglePause() {
  if (dialog) return;
  if (game.state === 'paused') continueRace();
  else if (['countdown', 'playing'].includes(game.state)) { suspend(); $('#primary-action').focus({ preventScroll: true }); }
}
function showDialog(name) {
  if (dialog) return false;
  dialogReturn = document.activeElement;
  suspend(); dialog = name;
  $(`#${name}-dialog`).showModal(); hud(); return true;
}
function closeDialog(name) {
  if (dialog !== name) return;
  $(`#${name}-dialog`).close(); dialog = null; clearInputs(); resetClock(); refresh();
  const target = game.state === 'paused' ? $('#primary-action') : dialogReturn;
  target?.focus?.({ preventScroll: true }); dialogReturn = null;
}
function openHelp() { showDialog('help'); }
function closeHelp(confirmed) {
  if (dialog !== 'help') return;
  const shouldStart = helpStarts && confirmed; helpStarts = false;
  if (confirmed) { progress.tutorialSeen = true; if (!saveProgress(storage, progress)) storageAvailable = false; saveNotice(); }
  closeDialog('help');
  if (shouldStart) begin();
}
function openChapters() {
  if (dialog) return;
  const list = $('#chapter-list');
  list.replaceChildren(...LEVELS.map(level => {
    const button = document.createElement('button'); button.type = 'button'; button.className = `chapter-button${level.id === game.level ? ' current' : ''}`; button.dataset.level = String(level.id); button.disabled = level.id > progress.unlocked;
    const number = document.createElement('span'); number.className = 'chapter-number'; number.textContent = String(level.id).padStart(2, '0');
    const name = document.createElement('strong'); name.textContent = level.name;
    const goal = document.createElement('small'); const best = progress.best[level.id]; goal.textContent = `2 圈 · 前 ${level.targetPlace} 名 · ${level.timeLimit} 秒${button.disabled ? ' · 尚未解锁' : best ? ` · 最佳第 ${best.place} 名` : ''}`;
    const tip = document.createElement('p'); tip.textContent = level.tip;
    button.append(number, name, goal, tip); bindButtonKeyboard(button);
    button.addEventListener('click', () => { if (button.disabled || dialog !== 'chapters') return; closeDialog('chapters'); load(level.id); });
    return button;
  }));
  showDialog('chapters');
}
function useItem() {
  if (!active() || !canAction(game, 'item')) return false;
  const success = action(game, 'item');
  if (success) { consumeEvents(); remember(false); hud(); draw(); }
  return success;
}
function consumeEvents() {
  for (const event of game.events) {
    if (event.type === 'pickup' && event.car === 0) announce(`获得${itemNames[event.kind]}。按 E / J 或使用道具。`);
    if (event.type === 'item' && event.car === 0) announce(`已使用${itemNames[event.kind]}。${itemHints[event.kind]}。`);
    if (event.type === 'driftBoost' && event.car === 0) announce('漂移释放，短暂冲刺！');
    if (event.type === 'obstacle' && event.car === 0) announce(event.blocked ? '护盾挡住木桩撞击。' : '碰到木桩减速了，提前调整路线。');
  }
  game.events.length = 0;
}

// Independent sources: releasing one finger or key never cancels another source.
for (const [name, button] of controlButtons) {
  button.addEventListener('pointerdown', event => {
    if ((typeof event.button === 'number' && event.button !== 0) || !active() || button.disabled) return;
    event.preventDefault();
    if (pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { action: name, button });
    try { button.setPointerCapture(event.pointerId); } catch { /* Global up/cancel is still registered. */ }
    if (name === 'item') useItem(); else addSource(name, `pointer:${event.pointerId}`);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => releasePointer(event.pointerId));
  button.addEventListener('keydown', event => {
    if (!['Enter', 'Space'].includes(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault(); event.stopPropagation();
    if (keyLatches.has(event.code) || event.repeat || !active() || button.disabled) return;
    keyLatches.add(event.code);
    const source = `button:${button.id}:${event.code}`;
    bindings.set(event.code, { action: name, source, button });
    if (name === 'item') useItem(); else addSource(name, source);
  });
  button.addEventListener('blur', () => {
    for (const [code, binding] of bindings) if (binding.button === button) { removeSource(binding.action, binding.source); bindings.delete(code); }
  });
  button.addEventListener('click', event => {
    event.preventDefault();
    // Pointer and focused keyboard activation are already handled on press.
    // A non-keyboard assistive click can still activate the single-use item.
    if (name === 'item' && event.detail === 0 && !keyLatches.has('Enter') && !keyLatches.has('Space')) useItem();
  });
  button.addEventListener('contextmenu', event => event.preventDefault());
}
for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, event => releasePointer(event.pointerId));
function bindButtonKeyboard(button) {
  button.addEventListener('keydown', event => {
    if (!['Enter', 'Space'].includes(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault(); event.stopPropagation();
    if (button.disabled || keyLatches.has(event.code) || event.repeat) return;
    keyLatches.add(event.code); button.click();
  });
}
for (const button of document.querySelectorAll('button:not([data-control])')) bindButtonKeyboard(button);
$('#primary-action').addEventListener('click', () => { if (!dialog) primaryAction?.(); });
$('#secondary-action').addEventListener('click', () => { if (!dialog) secondaryAction?.(); });
$('#pause').addEventListener('click', togglePause);
$('#retry').addEventListener('click', () => { if (!dialog) load(game.level); });
$('#help').addEventListener('click', openHelp);
$('#chapters').addEventListener('click', openChapters);
$('#help-confirm').addEventListener('click', () => closeHelp(true));
$('#help-close').addEventListener('click', () => closeHelp(false));
$('#chapters-close').addEventListener('click', () => closeDialog('chapters'));
$('#help-dialog').addEventListener('cancel', event => { event.preventDefault(); closeHelp(false); });
$('#chapters-dialog').addEventListener('cancel', event => { event.preventDefault(); closeDialog('chapters'); });
function editable(target) { return target?.matches?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]') || target?.isContentEditable; }
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || editable(event.target)) return;
  const name = keyActions[event.code], shortcut = ['KeyP', 'Escape', 'KeyR'].includes(event.code);
  if (dialog) {
    // Remember physical keys pressed behind a modal, including Escape closing it.
    // Repeated keydowns must not immediately resume or restart the race afterward.
    if (name || shortcut) keyLatches.add(event.code);
    return;
  }
  if (!name && !shortcut) return;
  event.preventDefault();
  if (keyLatches.has(event.code) || event.repeat) return;
  keyLatches.add(event.code);
  if (event.code === 'KeyP' || event.code === 'Escape') { togglePause(); return; }
  if (event.code === 'KeyR') { load(game.level); return; }
  if (!active()) return;
  const source = `key:${event.code}`;
  bindings.set(event.code, { action: name, source, button: null });
  if (name === 'item') useItem(); else addSource(name, source);
});
document.addEventListener('keyup', event => {
  keyLatches.delete(event.code);
  const binding = bindings.get(event.code);
  if (binding) { removeSource(binding.action, binding.source); bindings.delete(event.code); }
});
window.addEventListener('blur', suspend);
document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
window.addEventListener('pagehide', () => { suspend(); remember(); });
window.addEventListener('beforeunload', () => remember());

function frame(now) {
  const elapsed = previous === null ? 0 : Math.min(.1, Math.max(0, (now - previous) / 1000));
  previous = now;
  if (active()) {
    accumulator = Math.min(.1, accumulator + elapsed);
    let ticks = 0;
    while (accumulator + 1e-9 >= FIXED_DT && active() && ticks < 6) {
      accumulator = Math.max(0, accumulator - FIXED_DT); step(game, FIXED_DT, input()); consumeEvents(); ticks++;
    }
    visualTime += elapsed;
    if (!['countdown', 'playing'].includes(game.state)) { clearInputs(); accumulator = 0; }
  } else accumulator = 0;
  sync();
  if (now - lastHud >= 80) { hud(); lastHud = now; }
  if (active() && now - lastSave >= 1000) { remember(false); lastSave = now; }
  draw(); requestAnimationFrame(frame);
}
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const child of Object.values(value)) deepFreeze(child); Object.freeze(value); }
  return value;
}
/** Observation only: detached, recursively frozen copies; no mutable game handle. */
export function diagnostics() {
  return deepFreeze({ ...snapshot(game), unlocked: progress.unlocked, best: JSON.parse(JSON.stringify(progress.best)), tutorialSeen: progress.tutorialSeen, storageAvailable, wasRestored, discardedResume, dialog,
    input: { keys: [...bindings.keys()], pointers: [...pointers].map(([id, value]) => ({ id, action: value.action })), sources: Object.fromEntries(holdNames.map(name => [name, [...sources[name]]])), ...input() } });
}
Object.defineProperty(window, 'kartSnapshot', { value: diagnostics, writable: false, configurable: false });
$('#manual-drift').textContent = `速度高于 35 且在路面上时，转向并按住空格、Shift 或“漂移”开始蓄力；至少 ${RULES.driftMinimum} 秒后松开，获得约 0.8 至 1 秒冲刺。最多蓄力 ${RULES.driftMaximum} 秒。漂移会加大转向幅度；急弯先刹车，离开路面或速度过低会结束漂移。`;
$('#manual-items').textContent = `空槽贴近菱形补给箱，横向距离不超过 ${RULES.boxRadius} 赛道单位即可拾取；满槽不会覆盖。E / J 或“使用道具”消耗一件：松果冲刺加速 ${RULES.itemBoost} 秒；苔叶护盾保护 ${RULES.itemShield} 秒，期间挡住碰撞减速与脉冲；铃果脉冲使附近 ${RULES.pulseRange} 赛道单位内未受护盾保护的对手减速 ${RULES.pulseSlow} 秒，含前后方。补给箱由四车共享，拾取后 ${RULES.boxCooldown} 秒刷新。`;
if (discardedResume || loaded.damaged) {
  $('#restore-note').hidden = false;
  $('#restore-note').textContent = discardedResume ? '当前局存档损坏、过期或不符合已解锁赛程，已重新整备；独立保存的合法纪录与解锁仍保留。' : '赛程存档格式异常，已保留可校验的个人纪录并重新整理。';
}
remember(); refresh(); requestAnimationFrame(frame);
