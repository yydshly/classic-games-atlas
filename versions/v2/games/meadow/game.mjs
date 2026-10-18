import { LEVELS, createGame, start, pause, resume, step, action, snapshot, checkpoint, restoreCheckpoint } from './engine.mjs';
import { render } from './renderer.mjs';
import { createProgressStore, recordVictory } from './progress.mjs';

const $ = id => document.getElementById(id);
const canvas = $('meadow'), context = canvas.getContext('2d');
const liveStates = new Set(['playing', 'kickoff', 'goal']);
const dialogs = [$('help-dialog'), $('chapters-dialog'), $('confirm-dialog')];
const holdButtons = [...document.querySelectorAll('[data-hold]')];
const movement = new Map([['arrowleft', 'left'], ['a', 'left'], ['arrowright', 'right'], ['d', 'right'], ['arrowup', 'up'], ['w', 'up'], ['arrowdown', 'down'], ['s', 'down']]);
const supportedKeys = new Set([...movement.keys(), ' ', 'j', 'k', 'p', 'escape', 'r', '?']);
const physicalKeys = new Set(), blockedKeys = new Set(), keyboardSources = new Map(), buttonSources = new Map(), pointers = new Map();
const commandPointers = new Map(), tailClicks = new WeakMap();
let storage;
try { storage = window.localStorage || globalThis.localStorage; } catch { storage = null; }
const store = createProgressStore(storage);
let progress = store.loadProgress();
let game = createGame(0), frameTime = null, lastSaveAt = 0, lastState = '', lastGoal = '', handledResult = false;
let pendingConfirmation = null, restoredMatch = false, lastUiAt = 0;
const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const saved = store.loadCurrent();
if (saved) {
  const restored = restoreCheckpoint(saved);
  if (restored && restored.levelIndex <= progress.unlocked) { game = restored; restoredMatch = true; }
  else store.rejectCurrent();
} else if (store.damagedCurrent) store.rejectCurrent();

function setText(id, value) {
  const node = $(id), text = String(value);
  if (node.textContent !== text) node.textContent = text;
}
const modalOpen = () => dialogs.some(dialog => dialog.open);
const playable = () => game.state === 'playing' && !modalOpen() && !document.hidden;
const keyName = event => String(event.key || '').toLowerCase();
const activationKey = key => key === ' ' || key === 'enter';
function editable(target) { return Boolean(target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || '') || target?.closest?.('[contenteditable="true"]')); }
function heldValues() { return [...keyboardSources.values(), ...buttonSources.values()].map(value => typeof value === 'string' ? value : value.control).concat([...pointers.values()].map(value => value.control)); }
function controls() {
  const values = new Set(heldValues());
  return { x: Number(values.has('right')) - Number(values.has('left')), y: Number(values.has('down')) - Number(values.has('up')), shoot: values.has('shoot') };
}
function syncHeldButtons() {
  for (const button of holdButtons) {
    const held = [...pointers.values()].some(value => value.button === button) || [...buttonSources.values()].some(value => value.button === button);
    button.classList.toggle('held', held);
    button.setAttribute('aria-pressed', String(held));
  }
}
function cancelShooting() {
  for (const [key, value] of keyboardSources) if (value === 'shoot') { keyboardSources.delete(key); blockedKeys.add(key); }
  for (const [token, value] of buttonSources) if (value.control === 'shoot') { buttonSources.delete(token); blockedKeys.add(value.key); }
  for (const [pointerId, value] of pointers) if (value.control === 'shoot') pointers.delete(pointerId);
  action(game, 'cancelShot');
  syncHeldButtons();
}
function clearInput() {
  for (const key of physicalKeys) blockedKeys.add(key);
  keyboardSources.clear(); buttonSources.clear(); pointers.clear(); commandPointers.clear();
  action(game, 'cancelShot');
  syncHeldButtons();
}
function storageNotice() {
  $('save-note').classList.toggle('warning', store.unavailable);
  setText('save-note', store.unavailable ? '浏览器阻止了存档，或空间已满。本次仍可游玩，但刷新后可能丢失进度。' : '本机自动保存 · 刷新后先暂停 · 离线不推进比赛。');
  $('restore-note').hidden = !restoredMatch && !store.damagedCurrent && !store.damagedProgress;
  if (store.damagedCurrent || store.damagedProgress) setText('restore-note', '部分旧存档不完整或版本不兼容，已放弃无效比赛；有效的最好比分与已解锁场次仍保留。');
  else if (restoredMatch) setText('restore-note', '已恢复最近保存的比赛。当前保持暂停，时间没有在离线期间推进；准备好后点“继续比赛”。');
}
function persist() {
  const value = checkpoint(game);
  if (value) store.saveCurrent(value);
  storageNotice();
}
function pauseMatch() {
  clearInput();
  if (liveStates.has(game.state)) pause(game);
  frameTime = null;
  persist(); updateUI();
}
function continueMatch() {
  if (modalOpen() || document.hidden) return;
  clearInput(); frameTime = null;
  if (game.state === 'ready') start(game);
  else if (game.state === 'paused') resume(game);
  else return;
  restoredMatch = false;
  persist(); updateUI(); canvas.focus({ preventScroll: true });
  // Keep the field, rather than the large introduction, in the player's viewport.
  if(typeof canvas.scrollIntoView==='function')canvas.scrollIntoView({block:'center',behavior:'instant'});
}
function togglePause() {
  if (modalOpen()) return;
  if (liveStates.has(game.state)) pauseMatch();
  else if (game.state === 'paused') continueMatch();
}
function openDialog(dialog) {
  if (modalOpen()) return;
  pauseMatch();
  if (!dialog.open) dialog.showModal();
  updateUI();
}
function closeDialog(dialog) {
  clearInput();
  if (dialog.open) dialog.close();
  frameTime = null;
  updateUI();
}
function selectMatch(index, autoStart = false) {
  if (!Number.isInteger(index) || index < 0 || index > progress.unlocked || index >= LEVELS.length) return;
  clearInput();
  game = createGame(index); handledResult = false; restoredMatch = false;
  lastState = ''; lastGoal = ''; frameTime = null; lastSaveAt = 0;
  store.clearCurrent();
  for (const dialog of dialogs) if (dialog.open) dialog.close();
  pendingConfirmation = null;
  updateMatches(); updateUI();
  if (autoStart) continueMatch();
}
function requestMatch(index) {
  if (!Number.isInteger(index) || index < 0 || index > progress.unlocked || index >= LEVELS.length) return;
  const unfinished = liveStates.has(game.state) || game.state === 'paused';
  if (!unfinished) { selectMatch(index); return; }
  if ($('chapters-dialog').open) closeDialog($('chapters-dialog'));
  pendingConfirmation = () => selectMatch(index);
  setText('confirm-title', index === game.levelIndex ? '重新开场吗？' : '换一场比赛吗？');
  setText('confirm-copy', '当前这场未完赛进度会被替换。已解锁场次与最好比分保留。');
  setText('confirm-accept', index === game.levelIndex ? '确定重赛' : '确定换场');
  openDialog($('confirm-dialog'));
}
function perform(kind) {
  if (!playable()) return;
  cancelShooting(); action(game, kind); updateUI();
}
function primary() {
  if (modalOpen()) return;
  if (game.state === 'ready' || game.state === 'paused') continueMatch();
  else if (game.state === 'won') selectMatch(Math.min(7, game.levelIndex + 1), true);
  else if (game.state === 'lost') selectMatch(game.levelIndex, true);
}

// The controls stay mounted: updating a match record never discards keyboard focus.
function makeMatchButtons(container) {
  for (let index = 0; index < LEVELS.length; index += 1) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'match'; button.dataset.level = String(index);
    for (const tag of ['b', 'span', 'small']) button.appendChild(document.createElement(tag));
    bindCommand(button, () => requestMatch(index));
    container.appendChild(button);
  }
}
function updateMatches() {
  for (const container of [$('matches'), $('dialog-matches')]) for (let index = 0; index < container.children.length; index += 1) {
    const button = container.children[index], level = LEVELS[index], record = progress.best[index];
    button.disabled = index > progress.unlocked;
    button.classList.toggle('current', index === game.levelIndex);
    button.setAttribute('aria-current', index === game.levelIndex ? 'true' : 'false');
    button.setAttribute('aria-label', `第 ${index + 1} 场 ${level.title}${button.disabled ? '，未解锁' : ''}`);
    button.children[0].textContent = String(index + 1).padStart(2, '0');
    button.children[1].textContent = level.title;
    button.children[2].textContent = button.disabled ? '等待解锁' : record ? `最佳 ${record.score[0]} : ${record.score[1]}` : '等待开场';
  }
  setText('progress-summary', `${progress.unlocked + 1} / 8 场已解锁`);
  setText('chapters', `赛程 ${progress.unlocked + 1}/8`);
}
function updateUI() {
  const level = LEVELS[game.levelIndex], seconds = Math.max(0, Math.ceil(game.time));
  setText('home-score', game.score[0]); setText('away-score', game.score[1]);
  setText('clock', `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
  setText('period', `第 ${String(game.levelIndex + 1).padStart(2, '0')} 场`);
  setText('rival', level.opponent); setText('scene', `${String(game.levelIndex + 1).padStart(2, '0')} / ${level.title}`);
  const owner = game.ball.owner === null ? null : game.players[game.ball.owner];
  setText('possession', owner ? `球权：${owner.team === 0 ? '草甸伙伴' : '对手'}${owner.role === 'keeper' ? '门将' : ` · ${[7,11,1,9,6,1][owner.id]} 号`}` : '球权：争夺中');
  setText('objective', `目标：终场领先 · 本场 ${level.duration} 秒`);
  setText('live-message', game.message || level.tip);
  const charge = Math.min(1.2, Math.max(0, game.charge || 0)), percentage = Math.round(charge / 1.2 * 100);
  $('charge-meter').value = charge; $('charge-meter').setAttribute('aria-valuenow', String(charge));
  $('charge-meter').setAttribute('aria-valuetext', `${percentage}%`); setText('charge-text', `${percentage}%`);
  setText('pause', game.state === 'paused' ? '继续 P' : '暂停 P');
  $('pause').disabled = !liveStates.has(game.state) && game.state !== 'paused';
  const goal = `${game.score[0]}:${game.score[1]}`;
  if (lastGoal !== goal) { setText('goal-status', `比分 ${game.score[0]} 比 ${game.score[1]}${game.state === 'goal' ? '，进球后重新开球。' : ''}`); lastGoal = goal; }
  if (game.state !== lastState) {
    if (lastState === 'playing' && game.state !== 'playing') clearInput();
    lastState = game.state;
    $('state-card').hidden = game.state === 'playing' || game.state === 'kickoff' || game.state === 'goal';
    if (game.state === 'ready') {
      setText('state-kicker', 'MEET YOU ON THE MEADOW'); setText('state-title', '这一脚，从你开始。');
      setText('state-copy', `${level.brief} ${level.tip}`); setText('primary-action', '开始比赛 →');
    } else if (game.state === 'paused') {
      setText('state-kicker', 'TAKE A BREATHER'); setText('state-title', '歇一会，球场还在。');
      setText('state-copy', '比赛与计时已暂停。继续后请重新按下方向或射门键，旧的蓄力不会射出。'); setText('primary-action', '继续比赛 →');
    } else if (game.state === 'won' || game.state === 'lost') {
      const won = game.state === 'won'; clearInput();
      setText('state-kicker', won ? 'A GOOD AFTERNOON' : 'ANOTHER CHANCE TO PLAY');
      setText('state-title', won ? (game.levelIndex === 7 ? '八场终哨，草甸冠军。' : '好球，下一场见！') : game.score[0] === game.score[1] ? '平局，再分一次胜负。' : '再来，跑出下一次机会。');
      setText('state-copy', `${game.score[0]} : ${game.score[1]}。${won ? (game.levelIndex === 7 ? '全部八场已完成，可以重赛刷新最好比分。' : '胜利解锁下一场。' ) : '终场需领先才能获胜。试着传给队友，从斜前方带球靠近球门。'}`);
      setText('primary-action', won && game.levelIndex < 7 ? '下一场 →' : '再踢一场 →');
      if (!handledResult) {
        handledResult = true;
        store.clearCurrent();
        if (won) { progress = recordVictory(progress, game.levelIndex, game); store.saveProgress(progress); updateMatches(); }
        storageNotice();
      }
    }
  }
  syncHeldButtons(); storageNotice();
}

function markTail(button) { tailClicks.set(button, Date.now() + 800); }
function consumeTail(button) {
  const until = tailClicks.get(button) || 0;
  if (Date.now() <= until) { tailClicks.delete(button); return true; }
  tailClicks.delete(button); return false;
}
function isFreshKey(event) {
  const key = keyName(event), fresh = !event.repeat && !physicalKeys.has(key) && !blockedKeys.has(key);
  physicalKeys.add(key); return fresh;
}
function releaseKey(key) {
  physicalKeys.delete(key); blockedKeys.delete(key); keyboardSources.delete(key);
  for (const [token, source] of buttonSources) if (source.key === key) buttonSources.delete(token);
  syncHeldButtons();
}
function commandAllowed(button) {
  const open = dialogs.filter(dialog => dialog.open);
  return !open.length || open.at(-1).contains(button);
}
function bindCommand(button, run) {
  button.addEventListener('click', event => {
    if (consumeTail(button)) { event.preventDefault(); return; }
    if (!button.disabled && commandAllowed(button)) run();
  });
  button.addEventListener('keydown', event => {
    const key = keyName(event);
    if (!activationKey(key) || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault(); markTail(button);
    if (isFreshKey(event) && !button.disabled && commandAllowed(button)) run();
  });
  button.addEventListener('keyup', event => {
    const key = keyName(event); if (!activationKey(key)) return;
    event.preventDefault(); releaseKey(key); markTail(button);
  });
  button.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0 || button.disabled || !commandAllowed(button)) return;
    tailClicks.delete(button);
    commandPointers.set(event.pointerId, { button, x: event.clientX, y: event.clientY });
  });
  button.addEventListener('pointerup', event => {
    const source = commandPointers.get(event.pointerId); commandPointers.delete(event.pointerId);
    if (!source || source.button !== button) return;
    // Keep native click activation, including the platform's drag-off cancellation.
  });
  for (const type of ['pointercancel', 'lostpointercapture']) button.addEventListener(type, event => {
    if (commandPointers.get(event.pointerId)?.button === button) { commandPointers.delete(event.pointerId); markTail(button); }
  });
}

for (const button of holdButtons) {
  const control = button.dataset.hold;
  button.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    if (!playable()) return;
    pointers.set(event.pointerId, { button, control });
    try { button.setPointerCapture(event.pointerId); } catch { /* Pointer may already be canceled. */ }
    syncHeldButtons();
  });
  const release = (event, cancelled) => {
    const source = pointers.get(event.pointerId);
    if (!source || source.button !== button) return;
    pointers.delete(event.pointerId);
    if (cancelled && source.control === 'shoot' && !controls().shoot) action(game, 'cancelShot');
    syncHeldButtons();
  };
  button.addEventListener('pointerup', event => release(event, false));
  button.addEventListener('pointercancel', event => release(event, true));
  button.addEventListener('lostpointercapture', event => release(event, true));
  button.addEventListener('keydown', event => {
    const key = keyName(event);
    if (!activationKey(key) || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    const fresh = isFreshKey(event);
    if (fresh && playable()) buttonSources.set(`${button.id}:${key}`, { button, control, key });
    syncHeldButtons();
  });
  button.addEventListener('keyup', event => {
    const key = keyName(event); if (!activationKey(key)) return;
    event.preventDefault(); releaseKey(key);
  });
  button.addEventListener('blur', () => {
    let shooting = false;
    for (const [token, source] of buttonSources) if (source.button === button) {
      shooting ||= source.control === 'shoot'; blockedKeys.add(source.key); buttonSources.delete(token);
    }
    if (shooting && !controls().shoot) action(game, 'cancelShot');
    syncHeldButtons();
  });
  // A synthetic/native trailing click never becomes a second hold or an instant shot.
  button.addEventListener('click', event => event.preventDefault());
}

bindCommand($('primary-action'), primary);
bindCommand($('pause'), togglePause);
bindCommand($('retry'), () => requestMatch(game.levelIndex));
bindCommand($('help'), () => openDialog($('help-dialog')));
bindCommand($('chapters'), () => openDialog($('chapters-dialog')));
bindCommand($('pass'), () => perform('pass'));
bindCommand($('switch'), () => perform('switch'));
for (const id of ['help-close', 'help-done']) bindCommand($(id), () => closeDialog($('help-dialog')));
bindCommand($('chapters-close'), () => closeDialog($('chapters-dialog')));
bindCommand($('confirm-cancel'), () => { pendingConfirmation = null; closeDialog($('confirm-dialog')); });
bindCommand($('confirm-accept'), () => { const run = pendingConfirmation; pendingConfirmation = null; closeDialog($('confirm-dialog')); run?.(); });
for (const dialog of dialogs) {
  dialog.addEventListener('cancel', event => { event.preventDefault(); if (dialog === $('confirm-dialog')) pendingConfirmation = null; closeDialog(dialog); });
  dialog.addEventListener('close', () => { clearInput(); frameTime = null; });
}

window.addEventListener('keydown', event => {
  if (event.defaultPrevented || editable(event.target) || event.ctrlKey || event.metaKey || event.altKey || modalOpen()) return;
  const key = keyName(event);
  if (!supportedKeys.has(key)) return;
  // Native controls own Space/Enter. Links and other standard controls retain activation.
  if (activationKey(key) && /^(BUTTON|A|SUMMARY)$/.test(event.target?.tagName || '')) return;
  event.preventDefault();
  if (!isFreshKey(event)) return;
  if (key === 'p' || key === 'escape') togglePause();
  else if (key === 'r') requestMatch(game.levelIndex);
  else if (key === '?') openDialog($('help-dialog'));
  else if (playable()) {
    if (key === 'j') perform('pass');
    else if (key === 'k') perform('switch');
    else keyboardSources.set(key, key === ' ' ? 'shoot' : movement.get(key));
  }
});
window.addEventListener('keyup', event => releaseKey(keyName(event)));
window.addEventListener('blur', pauseMatch);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseMatch(); });
window.addEventListener('pagehide', () => { pauseMatch(); persist(); });

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const child of Object.values(value)) deepFreeze(child); }
  return value;
}
Object.defineProperty(window, 'meadowSnapshot', {
  value: () => deepFreeze({ ...snapshot(game), input: { ...controls(), keys: [...physicalKeys], blockedKeys: [...blockedKeys],
    pointers: [...pointers].map(([id, value]) => ({ id, control: value.control })),
    sources: [...keyboardSources].map(([key, control]) => ({ kind: 'keyboard', key, control })).concat([...buttonSources].map(([token, value]) => ({ kind: 'button', key: value.key, control: value.control, token }))) } }),
  writable: false, configurable: false,
});
function frame(time) {
  const dt = frameTime === null ? 0 : Math.min(.1, Math.max(0, (time - frameTime) / 1000));
  frameTime = time;
  const before = game.state;
  step(game, dt, controls());
  render(context, game, { width: 1200, height: 800, time, reducedMotion });
  if (time - lastUiAt >= 80 || before !== game.state) { updateUI(); lastUiAt = time; }
  if (time - lastSaveAt >= 1200 || before !== game.state) { persist(); lastSaveAt = time; }
  requestAnimationFrame(frame);
}
makeMatchButtons($('matches')); makeMatchButtons($('dialog-matches'));
updateMatches(); updateUI(); requestAnimationFrame(frame);
