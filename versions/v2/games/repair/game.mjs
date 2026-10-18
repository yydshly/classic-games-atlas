import {
  LEVELS,
  SLOTS,
  STATION_TYPES,
  COSTS,
  createGame,
  start,
  pause,
  resume,
  step,
  command,
  canCommand,
  snapshot,
  checkpoint,
  restore,
} from './engine.mjs';
import { render, renderDetail, preloadArt, hitSlot } from './renderer.mjs?v=20261018-facing-r3';
import { createProgressStore, recordVictory, isPointerActivation } from './progress.mjs';

const $ = id => document.getElementById(id);
const canvas = $('workshop');
const context = canvas.getContext('2d');
const detailCanvas = $('bench-detail');
const detailContext = detailCanvas.getContext('2d');
// Artwork is optional: the renderer keeps a complete canvas fallback.
void preloadArt().catch(() => {});
const LOGICAL_WIDTH = 1200;
const LOGICAL_HEIGHT = 800;
const activeStates = new Set(['ready', 'playing', 'paused']);
const buildTypes = ['diagnosis', 'mechanical', 'electrical'];
const buildDescriptions = {
  diagnosis: '先辨认问题，每位来客都需要检测。',
  mechanical: '修齿轮与关节，服务信使、园丁与乐手。',
  electrical: '接通灯与电路，服务提灯客与乐手。',
};
const dialogs = [$('help-dialog'), $('days-dialog'), $('confirm-dialog')];
let browserStorage;
try { browserStorage = window.localStorage; } catch { browserStorage = null; }
const store = createProgressStore(browserStorage);
let progress = store.loadProgress();
let game = createGame(0);
let selectedSlot = 'A';
let frameTime = null;
let lastUiTime = -Infinity;
let lastSaveTime = -Infinity;
let lastMessage = '';
let handledResult = false;
let pendingConfirmation = null;
let pointerContact = null;
let inputGeneration = 0;
let restoredShift = false;
const heldKeys = new Set();
const blockedKeys = new Set();
const commandEntries = new Map();
const controlSignatures = new WeakMap();
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const savedShift = store.loadShift();
if (savedShift) {
  const restored = restore(savedShift);
  if (restored && restored.levelIndex <= progress.unlocked) {
    game = restored;
    restoredShift = true;
    $('restore-note').hidden = false;
    $('restore-note').textContent = '已恢复最近保存的营业进度。当前保持暂停，准备好后点“继续营业”。';
  } else {
    store.rejectShift();
  }
} else if (store.damagedShift) {
  store.rejectShift();
}

// Read-only diagnostics for inspection. There are no debug commands or writable state hooks.
Object.defineProperty(window, 'repairSnapshot', {
  value: () => snapshot(game),
  writable: false,
  configurable: false,
});

function setText(id, value) {
  const element = $(id);
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

function tell(text, kind = 'normal') {
  setText('live-message', text);
  $('live-message').dataset.kind = kind;
}

function invalidateInput() {
  pointerContact = null;
  inputGeneration += 1;
  for (const key of heldKeys) blockedKeys.add(key);
}

function modalOpen() {
  return dialogs.some(dialog => dialog.open);
}

function persist() {
  if (activeStates.has(game.state)) {
    const saved = checkpoint(game);
    if (saved) store.saveShift(saved);
  }
  updateStorageNotice();
}

function updateStorageNotice() {
  const note = $('save-note');
  note.classList.toggle('warning', store.unavailable);
  if (store.unavailable) {
    note.textContent = '此浏览器阻止了存档，或空间已满。本次仍可游玩，但刷新后可能丢失进度。';
  } else {
    note.textContent = '本机自动保存 · 刷新后先暂停 · 最好成绩独立保留。';
  }
  if (store.damagedShift) {
    $('restore-note').hidden = false;
    $('restore-note').textContent = '上次营业存档不完整或版本不兼容，已放弃该班次；有效的最好成绩与已解锁日期仍保留。';
  }
}

function pauseFor(reason = '') {
  invalidateInput();
  if (game.state === 'playing') {
    pause(game);
    frameTime = null;
    if (reason) tell(reason);
    persist();
  }
  updateUI();
}

function continueShift() {
  if (modalOpen() || document.hidden) return;
  invalidateInput();
  frameTime = null;
  if (game.state === 'ready') start(game);
  else if (game.state === 'paused') resume(game);
  else return;
  restoredShift = false;
  if (!store.damagedShift) $('restore-note').hidden = true;
  tell('营业中。留意队伍、工位红灯和来客的耐心。');
  lastMessage = game.message;
  persist();
  updateUI();
  // Explicit start/resume restores the business overview after a scrolled card.
  // Never recenter from RAF, pause, dialog close, or automatic restoration.
  document.querySelector('.workshop-column')?.scrollIntoView({ block: 'start', behavior: 'auto' });
}

function togglePause() {
  if (modalOpen()) return;
  if (game.state === 'playing') pauseFor('已暂停。可以调整工位与技师；准备好后再继续。');
  else if (game.state === 'paused') continueShift();
}

function openDialog(dialog) {
  pauseFor('已暂停。关闭窗口后，点“继续营业”再开门。');
  invalidateInput();
  if (!dialog.open) dialog.showModal();
}

function closeDialog(dialog) {
  invalidateInput();
  if (dialog.open) dialog.close();
  // A modal never owns the authority to resume, including help → blur → close.
  frameTime = null;
  updateUI();
}

function hasUnfinishedWork() {
  if (!activeStates.has(game.state)) return false;
  return game.tick > 0 || game.started || checkpoint(game).commands.length > 0;
}

function newDay(index) {
  if (!Number.isInteger(index) || index < 0 || index > progress.unlocked || index >= LEVELS.length) return;
  invalidateInput();
  game = createGame(index);
  selectedSlot = 'A';
  handledResult = false;
  restoredShift = false;
  frameTime = null;
  lastMessage = '';
  lastSaveTime = -Infinity;
  if (!store.damagedShift) $('restore-note').hidden = true;
  tell(game.level.tip);
  persist();
  updateUI();
  $('primary-action').focus({ preventScroll: true });
}

function askReplace(index, retrying = false) {
  if (index < 0 || index > progress.unlocked || index >= LEVELS.length) return;
  if ($('days-dialog').open) closeDialog($('days-dialog'));
  if (!hasUnfinishedWork()) {
    newDay(index);
    return;
  }
  pendingConfirmation = () => newDay(index);
  setText('confirm-title', retrying ? '重新开始这一天？' : `切换到第 ${index + 1} 天？`);
  setText('confirm-copy', '当前尚未结束的营业进度将被替换。已解锁日期和最好成绩会保留。');
  setText('confirm-accept', retrying ? '确认重开' : '确认切换');
  openDialog($('confirm-dialog'));
}

function stationName(station) {
  return station ? (STATION_TYPES[station.type]?.name || station.type) : '空工位';
}

function stationForSlot(slot) {
  return game.stations.find(station => station.slot === slot);
}

function selectSlot(slot) {
  if (!SLOTS.some(point => point.id === slot)) return;
  selectedSlot = slot;
  const station = stationForSlot(slot);
  tell(`${slot} 号 · ${stationName(station)}。${station ? '下方可查看进度、升级与保养。' : '下方可选择建造工位。'}`);
  updateUI();
}

for (const slot of SLOTS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'slot-button';
  button.dataset.slot = slot.id;
  const code = document.createElement('b');
  code.textContent = slot.id;
  const name = document.createElement('span');
  button.append(code, name);
  button.addEventListener('click', () => selectSlot(slot.id));
  $('slot-list').append(button);
}

function actionButton(entry) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'action-button';
  button.dataset.commandKey = entry.key;
  const line = document.createElement('span');
  const label = document.createElement('b');
  const cost = document.createElement('em');
  const detail = document.createElement('small');
  line.append(label, cost);
  button.append(line, detail);
  button.addEventListener('click', () => {
    const current = commandEntries.get(button.dataset.commandKey);
    if (!current || modalOpen()) return;
    const result = command(game, current.command);
    if (!result.ok) {
      tell(result.reason || '暂时无法执行，请检查工位与零件币。', 'error');
    } else {
      tell(game.message || '安排好了。');
      lastMessage = game.message;
      persist();
    }
    updateUI();
    if (document.activeElement === document.body && !button.isConnected) {
      const next = $('upgrade-controls').querySelector('button:not(:disabled)')
        || $('worker-controls').querySelector('button:not(:disabled)');
      if (next) next.focus({ preventScroll: true });
    }
  });
  return button;
}

function paintActions(container, entries) {
  const signature = entries.map(entry => entry.key).join('|');
  if (controlSignatures.get(container) !== signature) {
    container.replaceChildren(...entries.map(actionButton));
    controlSignatures.set(container, signature);
  }
  entries.forEach((entry, index) => {
    commandEntries.set(entry.key, entry);
    const button = container.children[index];
    const availability = canCommand(game, entry.command);
    button.disabled = !availability.ok;
    button.querySelector('b').textContent = entry.label;
    button.querySelector('em').textContent = entry.cost ? `${entry.cost} 币` : '';
    const description = availability.ok ? entry.description : availability.reason;
    button.querySelector('small').textContent = description;
    button.title = description;
    button.setAttribute('aria-label', `${entry.label}${entry.cost ? `，${entry.cost} 零件币` : ''}。${description}`);
  });
}

/** Read only the current engine state; the detail dock never advances simulation. */
function updateSelectedOperation(station) {
  const worker = station && game.staff.find(person => person.id === station.workerId);
  const robot = station && game.robots.find(visitor => visitor.id === station.robotId);
  const progress = station?.robotId && station.duration > 0
    ? Math.min(100, Math.max(0, Math.floor(station.progress / station.duration * 100))) : 0;
  let status = '选择下方工位类型';
  if (station) {
    if (station.maintenance > 0) status = `保养中 · 剩余 ${Math.ceil(station.maintenance)} 秒`;
    else if (station.broken) status = '故障停机 · 需要保养';
    else if (!worker) status = '等待技师 · 展开调度派驻';
    else if (worker.path.length) status = '技师赶路中';
    else if (robot?.path.length) status = '来客入位中';
    else if (station.robotId) status = { diagnosis: '扫描检测中', mechanical: '机械维修中', electrical: '电路检修中' }[station.type] || '处理中';
    else if (station.queue.length) status = '等候来客到位';
    else status = game.state === 'ready' ? '设备就绪 · 等待开门' : '设备待客中';
    if (game.state === 'paused') status += ' · 已暂停';
    else if (!activeStates.has(game.state)) status = '本班已结束';
  }
  setText('selected-operation', status);
  setText('selected-queue', `等候 ${station?.queue.length || 0} 位`);
  setText('selected-progress-label', station?.robotId ? `处理 ${progress}%` : '暂无订单');
  $('selected-progress').value = progress;
  $('selected-progress').setAttribute('aria-valuetext', station?.robotId ? `${progress}%` : '暂无订单');
}

function updateControls() {
  const station = stationForSlot(selectedSlot);
  const technicians = game.staff.filter(worker => !worker.fixed);
  setText('selected-code', `${selectedSlot} 号`);
  setText('selected-title', station ? stationName(station) : '空工位 · 可建造');
  setText('selected-description', station
    ? ''
    : '建成后请派驻技师；工位不能拆除。');
  updateSelectedOperation(station);
  const facts = [];
  if (station) {
    const worker = game.staff.find(person => person.id === station.workerId);
    const wearLimit = game.level.wearLimit ? game.level.wearLimit + station.level - 1 : 0;
    facts.push(`等级 ${station.level} / 3`);
    facts.push(worker ? `${worker.name}${worker.status === 'walking' ? ' · 赶路中' : ' · 已到岗'}` : '尚无技师');
    if (wearLimit) facts.push(`磨损 ${station.wear} / ${wearLimit}`);
  } else {
    facts.push('检测 / 机械 / 电路');
  }
  const factsSignature = facts.join('|');
  if ($('selected-facts').dataset.signature !== factsSignature) {
    $('selected-facts').replaceChildren(...facts.map(text => {
      const element = document.createElement('span');
      element.textContent = text;
      return element;
    }));
    $('selected-facts').dataset.signature = factsSignature;
  }
  const builds = station ? [] : buildTypes.map(type => ({
    key: `build-${selectedSlot}-${type}`,
    label: `建造${STATION_TYPES[type].name}`,
    description: buildDescriptions[type],
    cost: COSTS.build[type],
    command: { type: 'build', slot: selectedSlot, stationType: type },
  }));
  paintActions($('build-controls'), builds);
  const upgrades = station ? [
    {
      key: `upgrade-${station.id}`,
      label: station.level < 3 ? `升级到 ${station.level + 1} 级` : '已达最高等级',
      description: '提高后续订单的处理速度。',
      cost: COSTS.upgrade[station.level] || 0,
      command: { type: 'upgrade', stationId: station.id },
    },
    {
      key: `maintain-${station.id}`,
      label: station.broken ? '修复故障' : '安排保养',
      description: '暂停处理四秒，修复故障并清除磨损。',
      cost: COSTS.maintain,
      command: { type: 'maintain', stationId: station.id },
    },
  ] : [];
  paintActions($('upgrade-controls'), upgrades);
  const assignments = station ? technicians.map(worker => {
    const currentStation = game.stations.find(item => item.id === worker.stationId);
    return {
      key: `assign-${worker.id}-${station.id}`,
      label: worker.stationId === station.id ? `${worker.name} · 已分配` : `派${worker.name}到此`,
      description: currentStation ? `从 ${currentStation.slot} 号${stationName(currentStation)}调来，原工位将缺人。` : '目前待命，派驻后会步行到此。',
      cost: 0,
      command: { type: 'assign', staffId: worker.id, stationId: station.id },
    };
  }) : [];
  assignments.push({
    key: 'hire',
    label: '雇用一位新技师',
    description: '到店后，再选一个空缺工位派驻。',
    cost: COSTS.hire,
    command: { type: 'hire' },
  });
  paintActions($('worker-controls'), assignments);
  setText('worker-summary', `${technicians.length} / 6 人${station && !station.workerId ? ' · 此工位待派驻' : ' · 展开安排'}`);
  $('worker-section').dataset.needsStaff = String(Boolean(station && !station.workerId));
  setText('command-note', game.state === 'playing'
    ? '调岗需步行，原工位会暂时缺人。'
    : activeStates.has(game.state)
      ? '可安心布置，开门后设备才会运转。'
      : '本班已结束，重开或换日后可调整。');
  for (const button of $('slot-list').children) {
    const item = stationForSlot(button.dataset.slot);
    button.setAttribute('aria-pressed', String(selectedSlot === button.dataset.slot));
    button.querySelector('span').textContent = item ? stationName(item).replace('工位', '') : '空位';
    button.setAttribute('aria-label', `${button.dataset.slot} 号${stationName(item)}${item?.broken ? '，故障' : ''}`);
  }
}

function formatTime(seconds) {
  const rounded = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
}

function handleResult() {
  if (handledResult || activeStates.has(game.state)) return;
  handledResult = true;
  invalidateInput();
  if (game.state === 'won') {
    progress = recordVictory(progress, game.levelIndex, game);
    store.saveProgress(progress);
  }
  store.clearShift();
  tell(game.reason || game.message, game.state === 'lost' ? 'error' : 'normal');
  updateStorageNotice();
}

function updateOverlay() {
  const state = game.state;
  $('canvas-wrap').dataset.state = state;
  $('overlay').hidden = state === 'playing';
  if (state === 'playing') return;
  const day = String(game.levelIndex + 1).padStart(2, '0');
  let title;
  let copy;
  let primary;
  if (state === 'ready') {
    title = game.levelIndex === 0 ? '给城市一点修复。' : game.level.name.split(' · ')[1] || game.level.name;
    copy = game.level.briefing;
    primary = '开始营业 ↗';
  } else if (state === 'paused') {
    title = restoredShift ? '小店，等你回来。' : '歇一会儿，灯还亮着。';
    copy = '时间与耐心已暂停。可在下方调整工位，再继续接待。';
    primary = '继续营业 ↗';
  } else if (state === 'won') {
    title = game.levelIndex === LEVELS.length - 1 ? '雨街的灯，长明了。' : '今天，也修好了。';
    copy = game.reason || game.message;
    primary = game.levelIndex < LEVELS.length - 1 ? `准备第 ${game.levelIndex + 2} 天 ↗` : '翻看八日成绩 ↗';
  } else {
    title = '明天，再好好开张。';
    copy = game.reason || game.message;
    primary = '重试这一天 ↗';
  }
  setText('overlay-kicker', `DAY ${day} · ${state === 'ready' ? '开门之前' : state === 'paused' ? '暂停营业' : '今日结算'}`);
  setText('overlay-title', title);
  setText('overlay-copy', copy);
  setText('primary-action', primary);
  setText('secondary-action', state === 'ready' ? '先读营业手册' : '查看八日计划');
  setText('overlay-summary', activeStates.has(state)
    ? `完成 ${game.goal} 单 · 流失达到 ${game.maxLost} 位结束\n${Math.ceil(game.level.duration)} 秒营业 · 每位技师每 15 秒工资 ${game.level.wage} 币`
    : `完成 ${game.completed} 单 · 流失 ${game.lost} 位 · 结余 ${game.credits} 币`);
}

function updateUI() {
  handleResult();
  const index = game.levelIndex;
  setText('day-number', `DAY ${String(index + 1).padStart(2, '0')} / 08`);
  setText('day-name', game.level.name.split(' · ')[1] || game.level.name);
  setText('credits', game.credits);
  setText('time', formatTime(game.time));
  setText('time-note', game.state === 'playing' ? '暂停时不计时' : game.state === 'ready' ? '准备开门' : game.state === 'paused' ? '时钟已暂停' : '本班已结束');
  setText('completed', game.completed);
  setText('goal', game.goal);
  setText('lost', game.lost);
  setText('loss-limit', game.maxLost);
  setText('brief-title', game.level.name);
  setText('day-tip', game.level.tip);
  setText('route-note', index === 0 ? '接待 → 检测 → 机械 → 收银' : '接待 → 检测 → 按需修理 → 收银');
  const best = progress.best[index];
  setText('best-record', best ? `最好成绩：完成 ${best.completed} 单 · 流失 ${best.lost} 位 · 结余 ${best.credits} 币` : '第一份好成绩，等你开张。');
  const statuses = { ready: '门牌已擦亮，等待开门', playing: '营业中 · 机器人会自动前往下一站', paused: '已暂停 · 时间与耐心都停在这里', won: '本日达标 · 谢谢每一位街坊', lost: '本班歇业 · 调整后再试一次' };
  setText('shop-status', statuses[game.state]);
  $('pause').disabled = !['playing', 'paused'].includes(game.state);
  $('pause').textContent = game.state === 'paused' ? '继续营业' : '暂停 P';
  $('retry').disabled = game.state === 'ready' && checkpoint(game).commands.length === 0;
  updateOverlay();
  updateControls();
  updateStorageNotice();
}

function showDays() {
  $('day-list').replaceChildren(...LEVELS.map((level, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'day-choice';
    button.disabled = index > progress.unlocked;
    button.setAttribute('aria-current', String(index === game.levelIndex));
    const day = document.createElement('b');
    day.textContent = `DAY ${String(index + 1).padStart(2, '0')}`;
    const name = document.createElement('span');
    name.textContent = level.name.split(' · ')[1] || level.name;
    const note = document.createElement('small');
    const best = progress.best[index];
    note.textContent = index > progress.unlocked ? '完成前一天后解锁' : best ? `已达标 · 最好 ${best.completed} 单` : `目标 ${level.goal} 单 · ${level.duration} 秒`;
    button.append(day, name, note);
    button.addEventListener('click', () => {
      if (index === game.levelIndex) closeDialog($('days-dialog'));
      else askReplace(index);
    });
    return button;
  }));
  openDialog($('days-dialog'));
}

$('primary-action').addEventListener('click', () => {
  if (game.state === 'ready' || game.state === 'paused') continueShift();
  else if (game.state === 'lost') newDay(game.levelIndex);
  else if (game.levelIndex < LEVELS.length - 1) newDay(game.levelIndex + 1);
  else showDays();
});
$('secondary-action').addEventListener('click', () => {
  if (game.state === 'ready') openDialog($('help-dialog'));
  else showDays();
});
$('pause').addEventListener('click', togglePause);
$('help').addEventListener('click', () => openDialog($('help-dialog')));
$('help-close').addEventListener('click', () => closeDialog($('help-dialog')));
$('days').addEventListener('click', showDays);
$('days-close').addEventListener('click', () => closeDialog($('days-dialog')));
$('retry').addEventListener('click', () => askReplace(game.levelIndex, true));
$('confirm-cancel').addEventListener('click', () => {
  pendingConfirmation = null;
  closeDialog($('confirm-dialog'));
});
$('confirm-accept').addEventListener('click', () => {
  const confirmed = pendingConfirmation;
  pendingConfirmation = null;
  closeDialog($('confirm-dialog'));
  if (confirmed) confirmed();
});
for (const dialog of dialogs) {
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    if (dialog.id === 'confirm-dialog') pendingConfirmation = null;
    closeDialog(dialog);
  });
  dialog.addEventListener('close', () => {
    invalidateInput();
    if (dialog.id === 'confirm-dialog') pendingConfirmation = null;
    frameTime = null;
    updateUI();
  });
}

/** Object-fit contain can letterbox on a narrow screen: map only painted pixels. */
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / LOGICAL_WIDTH, rect.height / LOGICAL_HEIGHT);
  if (!Number.isFinite(scale) || scale <= 0) return null;
  const left = rect.left + (rect.width - LOGICAL_WIDTH * scale) / 2;
  const top = rect.top + (rect.height - LOGICAL_HEIGHT * scale) / 2;
  const x = (event.clientX - left) / scale;
  const y = (event.clientY - top) / scale;
  if (x < 0 || y < 0 || x > LOGICAL_WIDTH || y > LOGICAL_HEIGHT) return null;
  return { x, y };
}

canvas.addEventListener('pointerdown', event => {
  if (event.isPrimary === false || event.button !== 0 || modalOpen() || game.state !== 'playing') return;
  pointerContact = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    generation: inputGeneration,
    point: canvasPoint(event),
  };
});
canvas.addEventListener('pointermove', event => {
  if (!pointerContact || event.pointerId !== pointerContact.pointerId) return;
  if (Math.hypot(event.clientX - pointerContact.x, event.clientY - pointerContact.y) > 12) pointerContact.cancelled = true;
});
canvas.addEventListener('pointerup', event => {
  const contact = pointerContact;
  if (!contact || contact.pointerId !== event.pointerId) return;
  pointerContact = null;
  if (contact.generation !== inputGeneration || modalOpen() || game.state !== 'playing') return;
  if (!isPointerActivation(contact, { pointerId: event.pointerId, x: event.clientX, y: event.clientY })) return;
  const point = canvasPoint(event);
  if (!point || !contact.point) return;
  const slot = hitSlot(point.x, point.y);
  if (slot && hitSlot(contact.point.x, contact.point.y) === slot) selectSlot(slot);
});
function cancelPointer(event) {
  if (pointerContact?.pointerId === event.pointerId) pointerContact = null;
}
canvas.addEventListener('pointercancel', cancelPointer);
canvas.addEventListener('lostpointercapture', cancelPointer);
canvas.addEventListener('pointerleave', cancelPointer);

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  const alreadyHeld = heldKeys.has(key);
  heldKeys.add(key);
  if (event.repeat || alreadyHeld || blockedKeys.has(key)) {
    // A held Enter/Space must not repeatedly buy an item or activate a newly
    // focused button after resume. Native controls still get the first press.
    if (key === 'enter' || key === ' ') event.preventDefault();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName || '')) return;
  if (modalOpen()) return;
  if (key === 'p' || key === 'escape') {
    event.preventDefault();
    togglePause();
  } else if (key === 'h') {
    event.preventDefault();
    openDialog($('help-dialog'));
  }
});
window.addEventListener('keyup', event => {
  const key = event.key.toLowerCase();
  heldKeys.delete(key);
  blockedKeys.delete(key);
});
window.addEventListener('blur', () => {
  pauseFor('窗口已离开，营业自动暂停。回来后请主动继续。');
  heldKeys.clear();
  blockedKeys.clear();
  persist();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseFor('页面已隐藏，营业自动暂停。回来后请主动继续。');
    heldKeys.clear();
    blockedKeys.clear();
    persist();
  }
});
window.addEventListener('pagehide', () => {
  pauseFor();
  persist();
});

function frame(now) {
  const dt = frameTime === null ? 0 : Math.min(.1, Math.max(0, (now - frameTime) / 1000));
  frameTime = now;
  if (!document.hidden && !modalOpen() && game.state === 'playing') step(game, dt);
  if (game.message && game.message !== lastMessage) {
    lastMessage = game.message;
    tell(game.message);
  }
  handleResult();
  if (now - lastUiTime >= 140) {
    updateUI();
    lastUiTime = now;
  }
  if (game.state === 'playing' && now - lastSaveTime >= 2000) {
    persist();
    lastSaveTime = now;
  }
  if (context || detailContext) {
    const view = snapshot(game);
    const options = { time: game.elapsed * 1000, reducedMotion: reducedMotionQuery.matches, selectedSlot };
    if (context) render(context, view, { ...options, width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT });
    if (detailContext) renderDetail(detailContext, view, { ...options, width: 420, height: 240 });
  }
  window.requestAnimationFrame(frame);
}

if (!context) tell('此浏览器无法显示工坊画面；仍可用工位和操作按钮经营。', 'error');
updateUI();
window.requestAnimationFrame(frame);
