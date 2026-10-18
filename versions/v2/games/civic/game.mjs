import { LEVELS, BUILDINGS, RESEARCH, RESOURCE_NAMES, ACTIONS_PER_TURN, ROAD_COSTS, createGame, start, pause, resume, command, canCommand, snapshot, checkpoint, restore, undo } from './engine.mjs';
import { render, hitTile } from './renderer.mjs';
import { createProgressStore, recordVictory, isPointerActivation } from './progress.mjs';

const $ = id => document.getElementById(id);
const canvas = $('coast');
const context = canvas.getContext('2d');
const WIDTH = 1200, HEIGHT = 800;
const activeStates = new Set(['ready', 'playing', 'paused']);
const terrainNames = { plain: '平原', forest: '森林', hill: '丘陵', water: '水域' };
const resourceKeys = Object.keys(RESOURCE_NAMES);
const buildingTypes = ['farm', 'lumber', 'quarry', 'study', 'market', 'beacon'];
const dialogs = [$('help-dialog'), $('chapters-dialog'), $('confirm-dialog')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let storage;
try { storage = window.localStorage; } catch { storage = null; }
const store = createProgressStore(storage);
let progress = store.loadProgress();
let game = createGame(0);
let selectedTile = game.level.village;
let handledResult = false;
let restored = false;
let pendingConfirmation = null;
let inputGeneration = 0;
let pointerContact = null;
let lastFrame = -Infinity;
let lastLogSignature = '';
const heldKeys = new Set(), blockedKeys = new Set();
const tileButtons = new Map(), actionButtons = new Map(), actionEntries = new Map();
const objectiveRows = [], forecastRows = new Map();
const chapterButtons = [];
const saved = store.loadCurrent();
if (saved) {
  const candidate = restore(saved);
  if (candidate && candidate.levelIndex <= progress.unlocked) {
    game = candidate;
    selectedTile = game.level.village;
    restored = true;
  } else store.rejectCurrent();
} else if (store.damagedCurrent) store.rejectCurrent();

// Public diagnostics are frozen copies only. There is no command/debug state hook.
Object.defineProperty(window, 'civicSnapshot', {
  value: () => Object.freeze({ ...snapshot(game), selectedTile }), writable: false, configurable: false,
});
function setText(id, value) { const node = $(id), text = String(value); if (node.textContent !== text) node.textContent = text; }
function tell(text, kind = 'normal') { setText('live-message', text); $('live-message').dataset.kind = kind; }
function modalOpen() { return dialogs.some(dialog => dialog.open); }
function tileCode(tile) { return `${String.fromCharCode(65 + tile.col)}${tile.row + 1}`; }
function invalidateInput() {
  pointerContact = null;
  inputGeneration++;
  for (const key of heldKeys) blockedKeys.add(key);
}
function blockedActivation(event) { return event?.detail === 0 && (blockedKeys.has('enter') || blockedKeys.has(' ')); }
function storageNotice() {
  setText('save-note', store.unavailable
    ? '此浏览器无法可靠保存（空间不足或存储被禁用）。本次仍可游玩，刷新可能丢失进度。'
    : '本机自动保存 · 刷新后先暂停 · 当前纪事与最好成绩分开保留。');
  $('save-note').classList.toggle('warning-note', store.unavailable);
  $('restore-note').hidden = !store.damagedCurrent && !restored;
  if (store.damagedCurrent) setText('restore-note', '上次当前进度损坏或版本不兼容，已舍弃；有效的最好成绩和解锁章节仍保留。');
  else if (restored) setText('restore-note', '已恢复本章最近一次保存。当前保持暂停；准备好后点“继续本章”。没有离线回合或额外收益。');
}
function persist() {
  if (activeStates.has(game.state)) store.saveCurrent(checkpoint(game));
  storageNotice();
}
function pauseFor(reason = '') {
  invalidateInput();
  if (game.state === 'playing') { pause(game); if (reason) tell(reason); }
  persist(); updateUI();
}
function begin() {
  if (modalOpen() || document.hidden || !['ready', 'paused'].includes(game.state)) return;
  invalidateInput();
  if (game.state === 'ready') start(game); else resume(game);
  restored = false;
  tell(game.message || '先安排本轮行动，再查看结算预览。');
  persist(); updateUI();
  tileButtons.get(selectedTile).focus({ preventScroll: true });
}
function togglePause() {
  if (modalOpen()) return;
  if (game.state === 'playing') pauseFor('已暂停。查看地图与预览后，主动继续再作安排。');
  else if (game.state === 'paused') begin();
}
function openDialog(dialog) {
  pauseFor('已暂停。合上窗口后，点“继续本章”再安排下一步。');
  invalidateInput();
  if (!dialog.open) dialog.showModal();
}
function closeDialog(dialog) {
  invalidateInput();
  if (dialog.open) dialog.close();
  updateUI();
}
function hasUnfinishedWork() { return activeStates.has(game.state) && (game.started || checkpoint(game).commands.length > 0); }
function newChapter(index) {
  if (!Number.isInteger(index) || index < 0 || index > progress.unlocked || index >= LEVELS.length) return;
  invalidateInput();
  game = createGame(index); selectedTile = game.level.village; handledResult = false; restored = false; lastLogSignature = '';
  tell(game.level.tip); persist(); updateUI();
  $('primary-action').focus({ preventScroll: true });
}
function askReplace(index, retrying = false) {
  if (!Number.isInteger(index) || index < 0 || index > progress.unlocked || index >= LEVELS.length) return;
  if ($('chapters-dialog').open) closeDialog($('chapters-dialog'));
  if (!hasUnfinishedWork()) { newChapter(index); return; }
  pendingConfirmation = () => newChapter(index);
  setText('confirm-title', retrying ? '重新开始本章？' : `翻到第 ${index + 1} 章？`);
  setText('confirm-copy', '当前尚未完成的章内进度将被替换。已经解锁的章节和最好成绩会保留。');
  setText('confirm-accept', retrying ? '确认重开' : '确认切换');
  openDialog($('confirm-dialog'));
}
function selectTile(id, focus = false) {
  if (!Number.isInteger(id) || id < 0 || id >= game.tiles.length || modalOpen()) return;
  selectedTile = id;
  const tile = game.tiles[id];
  tell(`${tileCode(tile)} · ${tile.revealed ? `${terrainNames[tile.terrain]}${tile.building ? ` · ${BUILDINGS[tile.building].name}` : ''}` : '未探索的迷雾'}。行动面板已更新。`);
  updateUI();
  if (focus) tileButtons.get(id).focus({ preventScroll: true });
}
for (let id = 0; id < 42; id++) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'tile-button'; button.dataset.tileId = String(id);
  const code = document.createElement('b'), name = document.createElement('span');
  button.append(code, name);
  button.addEventListener('click', event => { if (!blockedActivation(event)) selectTile(id); });
  $('tile-grid').append(button); tileButtons.set(id, button);
}
function createAction(key, container) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'action-button'; button.dataset.commandKey = key;
  const line = document.createElement('span'), label = document.createElement('b'), cost = document.createElement('em'), detail = document.createElement('small');
  line.append(label, cost); button.append(line, detail);
  button.addEventListener('click', event => {
    if (blockedActivation(event) || modalOpen()) return;
    const entry = actionEntries.get(key); if (!entry) return;
    const result = command(game, entry.command);
    if (!result.ok) tell(result.reason, 'error');
    else { tell(game.message); persist(); }
    updateUI();
  });
  container.append(button); actionButtons.set(key, { button, label, cost, detail });
}
for (const key of ['explore', ...buildingTypes.map(type => `build-${type}`), 'assign', 'unassign', 'road', 'settle']) createAction(key, $('tile-controls'));
for (const key of Object.keys(RESEARCH)) createAction(`research-${key}`, $('research-controls'));
for (const key of resourceKeys) {
  const row = document.createElement('div'), label = document.createElement('dt'), detail = document.createElement('dd'), result = document.createElement('dd');
  label.textContent = RESOURCE_NAMES[key]; row.append(label, detail, result); $('forecast-ledger').append(row); forecastRows.set(key, { detail, result });
}
for (let i = 0; i < 5; i++) { const row = document.createElement('li'); $('objectives').append(row); objectiveRows.push(row); }
for (let i = 0; i < LEVELS.length; i++) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'chapter-choice'; button.dataset.chapterIndex = String(i);
  const number = document.createElement('b'), name = document.createElement('span'), note = document.createElement('small');
  number.textContent = `CHAPTER ${String(i + 1).padStart(2, '0')}`; name.textContent = LEVELS[i].name;
  button.append(number, name, note);
  button.addEventListener('click', event => {
    if (blockedActivation(event) || i > progress.unlocked) return;
    if (i === game.levelIndex) closeDialog($('chapters-dialog')); else askReplace(i);
  });
  $('chapter-list').append(button); chapterButtons.push({ button, note });
}
function costText(cost = {}, ap = true) {
  return [...Object.entries(cost).filter(([, amount]) => amount > 0).map(([key, amount]) => `${amount}${RESOURCE_NAMES[key]}`), ...(ap ? ['1行动'] : [])].join(' · ');
}
function paintAction(key, entry, hidden = false) {
  const parts = actionButtons.get(key); actionEntries.set(key, entry);
  parts.button.hidden = hidden;
  if (hidden) return;
  const check = canCommand(game, entry.command);
  // aria-disabled retains focus and lets keyboard users inspect the reason.
  parts.button.setAttribute('aria-disabled', String(!check.ok));
  parts.label.textContent = entry.label;
  parts.cost.textContent = costText(entry.cost);
  const detail = check.ok ? entry.description : check.reason;
  parts.detail.textContent = detail; parts.button.title = detail;
  parts.button.setAttribute('aria-label', `${entry.label}，${costText(entry.cost)}。${detail}`);
}
function updateActions(view) {
  const focusedBefore = [...actionButtons.values()].find(({ button }) => button === document.activeElement);
  const tile = game.tiles[selectedTile];
  setText('selected-code', tileCode(tile));
  setText('selected-title', !tile.revealed ? '海雾里的下一页。' : tile.building ? BUILDINGS[tile.building].name : `${terrainNames[tile.terrain]} · 一块新土地`);
  setText('selected-description', !tile.revealed ? '从已探索的陆地边缘向外勘测，会同时揭开四周相邻地块。'
    : tile.building ? BUILDINGS[tile.building].description : '选择下方行动。建设范围、地形和资源不足都会说明原因。');
  setText('selected-facts', !tile.revealed ? '尚未探索'
    : [terrainNames[tile.terrain], tile.landmark, tile.worker ? '1 位居民上岗' : tile.building && BUILDINGS[tile.building].produces ? '尚无人工作' : '', tile.road ? tile.terrain === 'water' ? '已架桥' : '已有道路' : '', view.connectivity.reachable.includes(tile.id) ? '接通村庄' : ''].filter(Boolean).join(' · '));
  paintAction('explore', { label: '探索这片迷雾', command: { type: 'explore', tileId: tile.id }, cost: {}, description: '揭开本格与四邻地块。' }, tile.revealed);
  for (const type of buildingTypes) paintAction(`build-${type}`, {
    label: `建造${BUILDINGS[type].name}`, command: { type: 'build', tileId: tile.id, building: type }, cost: BUILDINGS[type].cost, description: BUILDINGS[type].description,
  }, !tile.revealed || Boolean(tile.building) || type === 'beacon' && game.levelIndex !== 7);
  const workplace = tile.revealed && tile.building && BUILDINGS[tile.building].produces;
  paintAction('assign', { label: '派驻 1 位居民', command: { type: 'assign', tileId: tile.id, worker: true }, cost: {}, description: '从本回合结算起产出；居民仍计入口粮。' }, !workplace);
  paintAction('unassign', { label: '撤回驻地居民', command: { type: 'assign', tileId: tile.id, worker: false }, cost: {}, description: '回村待命，此建筑停止产出；仍消耗口粮。' }, !workplace);
  paintAction('road', { label: tile.terrain === 'water' ? '架设桥梁' : '铺设道路', command: { type: 'road', tileId: tile.id }, cost: tile.terrain === 'water' ? ROAD_COSTS.bridge : ROAD_COSTS.land, description: '上下左右连续连接；道路可以穿过生产建筑。' }, !tile.revealed);
  paintAction('settle', { label: '建立第二座村庄', command: { type: 'settle', tileId: tile.id }, cost: BUILDINGS.village.cost, description: BUILDINGS.village.description }, !tile.revealed || Boolean(tile.building));
  for (const [key, research] of Object.entries(RESEARCH)) paintAction(`research-${key}`, { label: `研究${research.name}${game.research.includes(key) ? ' · 已完成' : ''}`, command: { type: 'research', research: key }, cost: research.cost, description: research.description });
  setText('research-summary', `${game.research.length} / ${Object.keys(RESEARCH).length}`);
  setText('command-note', game.state === 'playing' ? '每次操作都会立即更新账本。结算前可以撤回本回合全部安排。' : '现在可以查看地图与费用。开始或继续本章后才能执行行动。');
  // If an action disappears (for example a completed construction), place focus
  // on the same tile rather than silently dropping it to the document body.
  if (focusedBefore?.button.hidden) tileButtons.get(selectedTile).focus({ preventScroll: true });
}
function tutorialText() {
  if (game.levelIndex !== 0) return game.level.tip;
  const farm = game.tiles[15];
  if (!farm.building) return '第一步：选 B3 平原，在行动面板“建造农田”（3木、1行动）。再派驻1位居民（1行动）。';
  if (!farm.worker) return '下一步：选 B3 农田，点“派驻1位居民”（1行动）。无人农田不会收粮。';
  if (game.turn === 1) { const forecast = snapshot(game).forecast; return `可以收第一茬了：本轮${forecast.weather.name}，产${forecast.production.food}粮，${game.population}人吃${forecast.consumption.food}粮，预计粮食变${forecast.after.food}。点“结束回合”。`; }
  return '农田已经有人照料。继续查看账本并结算，累计收获18粮、库存至少16粮即可通关。';
}
function updateForecast(view) {
  const terminal = !activeStates.has(game.state);
  const forecast = terminal && game.lastTurn ? game.lastTurn : view.forecast;
  setText('weather-name', `${terminal ? '最后结算' : `第 ${game.turn} 回合`} · ${forecast.weather.name}`);
  setText('weather-description', terminal ? '本章已经结束。下列是最后一次结算的真实收支。' : `${forecast.weather.description} ${game.turn < game.maxTurns ? `下一回合：${forecast.nextWeather.name}。` : '这是本章最后回合。'}`);
  for (const key of resourceKeys) {
    const { detail, result } = forecastRows.get(key);
    detail.textContent = `+${forecast.production[key]}产出 −${forecast.consumption[key]}口粮 −${forecast.tradeCost[key]}贸易`;
    result.textContent = `${terminal ? forecast.after[key] - forecast.delta[key] : game.resources[key]} → ${forecast.after[key]} (${forecast.delta[key] >= 0 ? '+' : ''}${forecast.delta[key]})`;
  }
  setText('trade-preview', `贸易：${forecast.connectedMarkets.length} 座集市接通港口；${terminal ? '本轮送达' : '本轮预计送达'} ${forecast.tradeGain} 份，${terminal ? '累计' : '累计将达'} ${terminal ? game.tradeDelivered : game.tradeDelivered + forecast.tradeGain} 份。`);
  $('forecast-warning').hidden = terminal || !forecast.shortage && game.turn < game.maxTurns;
  setText('forecast-warning', forecast.shortage ? `缺粮警报：按当前安排结算会短缺 ${forecast.shortage} 粮，本章将失败。请先调整农田与居民。` : '这是最后一个可结算回合。请检查全部目标后再结束回合。');
}
function handleResult() {
  if (handledResult || activeStates.has(game.state)) return;
  handledResult = true; invalidateInput();
  if (game.state === 'won') { progress = recordVictory(progress, game.levelIndex, game); store.saveProgress(progress); }
  store.clearCurrent();
  tell(game.reason || game.message, game.state === 'lost' ? 'error' : 'normal');
}
function updateStateCard() {
  const state = game.state;
  $('canvas-wrap').dataset.state = state;
  $('state-card').hidden = state === 'playing';
  if (state === 'playing') return;
  const titles = { ready: game.levelIndex === 0 ? '把日子，安放在海边。' : game.level.subtitle, paused: restored ? '这一页，等你继续。' : '海岸暂歇，故事还在。', won: game.levelIndex === 7 ? '海岸长明，八章写成。' : '这一章，已有了收获。', lost: '换一种安排，再次启程。' };
  setText('state-kicker', `CHAPTER ${String(game.levelIndex + 1).padStart(2, '0')} · ${state === 'ready' ? '启程之前' : state === 'paused' ? '暂停中' : '本章结算'}`);
  setText('state-title', titles[state]);
  setText('state-copy', state === 'ready' ? game.level.briefing : state === 'paused' ? '没有时间流逝，也不会自动结算。你可以查看地图和账本；准备好后主动继续。' : game.reason || game.message);
  setText('state-summary', activeStates.has(state) ? `最多 ${game.maxTurns} 回合 · 每回合 ${ACTIONS_PER_TURN} 行动 · 每位居民每回合消耗 1 粮` : `第 ${game.turn} 回合 · 余粮 ${game.resources.food} · 送达 ${game.tradeDelivered} 份货`);
  setText('primary-action', state === 'ready' ? '开始本章 ↗' : state === 'paused' ? '继续本章 ↗' : state === 'lost' ? '重试本章 ↗' : game.levelIndex === 7 ? '翻看八章纪事 ↗' : `准备第 ${game.levelIndex + 2} 章 ↗`);
  setText('secondary-action', state === 'ready' ? '先读手册' : '八章地图');
}
function updateUI() {
  handleResult();
  const view = snapshot(game);
  setText('chapter-number', `CHAPTER ${String(game.levelIndex + 1).padStart(2, '0')} / 08`);
  setText('chapter-name', game.level.name.split(' · ')[1] || game.level.name);
  setText('brief-title', game.level.subtitle);
  setText('chapter-tip', game.level.briefing);
  setText('tutorial', tutorialText());
  for (const key of resourceKeys) setText(key, game.resources[key]);
  setText('turn', `${game.turn} / ${game.maxTurns}`); setText('actions', game.actions);
  const staffed = game.tiles.filter(tile => tile.worker).length;
  setText('population', `${game.population} / ${staffed}`);
  $('population').setAttribute('aria-label', `${game.population} 位居民，${staffed} 位上岗，${game.population - staffed} 位待命`);
  const statuses = { ready: '未开始 · 先看目标和本回合天气', playing: '规划中 · 仅“结束回合”会推进', paused: '已暂停 · 回来后主动继续', won: '本章达标 · 新一页已经解锁', lost: '本章结束 · 调整安排后再试' };
  setText('map-status', statuses[game.state]);
  $('pause').disabled = !['playing', 'paused'].includes(game.state); setText('pause', game.state === 'paused' ? '继续 P' : '暂停 P');
  $('end-turn').disabled = !canCommand(game, { type: 'endTurn' }).ok;
  $('end-turn').setAttribute('aria-label', `结束第 ${game.turn} 回合，结算生产、口粮、天气和贸易`);
  $('undo').disabled = !view.undoAvailable;
  for (let i = 0; i < objectiveRows.length; i++) {
    const goal = view.objectives[i], row = objectiveRows[i]; row.hidden = !goal;
    if (goal) { row.textContent = `${goal.label} · ${goal.current} / ${goal.target}`; row.dataset.complete = String(goal.complete); }
  }
  for (const tile of game.tiles) {
    const button = tileButtons.get(tile.id);
    button.querySelector('b').textContent = tileCode(tile);
    button.querySelector('span').textContent = !tile.revealed ? '迷雾' : tile.building ? BUILDINGS[tile.building].name : terrainNames[tile.terrain];
    button.dataset.terrain = tile.revealed ? tile.terrain : 'fog'; button.dataset.revealed = String(tile.revealed);
    button.setAttribute('aria-pressed', String(selectedTile === tile.id)); button.tabIndex = selectedTile === tile.id ? 0 : -1;
    button.setAttribute('aria-label', `${tileCode(tile)}，${!tile.revealed ? '未探索' : `${terrainNames[tile.terrain]}${tile.building ? `，${BUILDINGS[tile.building].name}` : ''}${tile.worker ? '，1位居民工作' : ''}${tile.road ? '，已铺路' : ''}`}`);
  }
  const best = progress.best[game.levelIndex];
  setText('best-record', best ? `最好成绩：${best.turns} 回合 · 余粮 ${best.food} · 送达 ${best.trade} 份。先比更少回合，再比余粮和送货。` : '这一章的第一份好成绩，等你写下。');
  chapterButtons.forEach(({ button, note }, i) => {
    button.disabled = i > progress.unlocked; button.setAttribute('aria-current', String(i === game.levelIndex));
    const record = progress.best[i]; note.textContent = i > progress.unlocked ? '完成前一章后解锁' : record ? `已通关 · 最好 ${record.turns} 回合 · 余粮 ${record.food}` : `${LEVELS[i].maxTurns} 回合内完成本章目标`;
  });
  const log = game.events.length ? game.events : ['这一回的纪事还未写下。开始本章，安排第一项行动。'];
  const signature = log.join('\n');
  if (signature !== lastLogSignature) { $('event-log').replaceChildren(...log.slice().reverse().map(text => { const row = document.createElement('li'); row.textContent = text; return row; })); lastLogSignature = signature; }
  updateStateCard(); updateActions(view); updateForecast(view); storageNotice();
}
function showChapters() { openDialog($('chapters-dialog')); }
$('primary-action').addEventListener('click', event => {
  if (blockedActivation(event)) return;
  if (['ready', 'paused'].includes(game.state)) begin();
  else if (game.state === 'lost') newChapter(game.levelIndex);
  else if (game.levelIndex < LEVELS.length - 1) newChapter(game.levelIndex + 1);
  else showChapters();
});
$('secondary-action').addEventListener('click', event => { if (!blockedActivation(event)) game.state === 'ready' ? openDialog($('help-dialog')) : showChapters(); });
$('pause').addEventListener('click', event => { if (!blockedActivation(event)) togglePause(); });
$('end-turn').addEventListener('click', event => {
  if (modalOpen() || blockedActivation(event)) return;
  const result = command(game, { type: 'endTurn' });
  if (!result.ok) tell(result.reason, 'error'); else { tell(game.message); handleResult(); persist(); }
  updateUI();
});
$('undo').addEventListener('click', event => {
  if (modalOpen() || blockedActivation(event)) return;
  let count = 0;
  while (snapshot(game).undoAvailable) { if (!undo(game).ok) break; count++; }
  tell(count ? `已撤回本回合 ${count} 项安排；资源与行动数回到本回合开始。` : '本回合没有可撤回的安排；已结算回合无法撤回。');
  persist(); updateUI();
});
$('help').addEventListener('click', event => { if (!blockedActivation(event)) openDialog($('help-dialog')); });
$('help-close').addEventListener('click', event => { if (!blockedActivation(event)) closeDialog($('help-dialog')); });
$('chapters').addEventListener('click', event => { if (!blockedActivation(event)) showChapters(); });
$('chapters-close').addEventListener('click', event => { if (!blockedActivation(event)) closeDialog($('chapters-dialog')); });
$('retry').addEventListener('click', event => { if (!blockedActivation(event)) askReplace(game.levelIndex, true); });
$('confirm-cancel').addEventListener('click', event => { if (blockedActivation(event)) return; pendingConfirmation = null; closeDialog($('confirm-dialog')); });
$('confirm-accept').addEventListener('click', event => {
  if (blockedActivation(event)) return;
  const accepted = pendingConfirmation; pendingConfirmation = null; closeDialog($('confirm-dialog')); if (accepted) accepted();
});
for (const dialog of dialogs) {
  dialog.addEventListener('cancel', event => { event.preventDefault(); if (dialog.id === 'confirm-dialog') pendingConfirmation = null; closeDialog(dialog); });
  dialog.addEventListener('close', () => { invalidateInput(); if (dialog.id === 'confirm-dialog') pendingConfirmation = null; updateUI(); });
}
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / WIDTH, rect.height / HEIGHT);
  if (!Number.isFinite(scale) || scale <= 0) return null;
  const x = (event.clientX - rect.left - (rect.width - WIDTH * scale) / 2) / scale;
  const y = (event.clientY - rect.top - (rect.height - HEIGHT * scale) / 2) / scale;
  return x >= 0 && y >= 0 && x <= WIDTH && y <= HEIGHT ? { x, y } : null;
}
canvas.addEventListener('pointerdown', event => {
  if (event.isPrimary === false || event.button !== 0 || modalOpen()) return;
  if (pointerContact && pointerContact.pointerId !== event.pointerId) { pointerContact = null; return; }
  pointerContact = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, point: canvasPoint(event), generation: inputGeneration };
});
canvas.addEventListener('pointermove', event => { if (pointerContact?.pointerId === event.pointerId && Math.hypot(event.clientX - pointerContact.x, event.clientY - pointerContact.y) > 12) pointerContact.cancelled = true; });
canvas.addEventListener('pointerup', event => {
  const contact = pointerContact; if (!contact || contact.pointerId !== event.pointerId) return; pointerContact = null;
  if (contact.generation !== inputGeneration || modalOpen() || !isPointerActivation(contact, { pointerId: event.pointerId, x: event.clientX, y: event.clientY })) return;
  const point = canvasPoint(event); if (!point || !contact.point) return;
  const id = hitTile(point.x, point.y); if (id !== null && id === hitTile(contact.point.x, contact.point.y)) selectTile(id);
});
function cancelPointer(event) { if (pointerContact?.pointerId === event.pointerId) pointerContact = null; }
for (const type of ['pointercancel', 'lostpointercapture', 'pointerleave']) canvas.addEventListener(type, cancelPointer);
window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase(), alreadyHeld = heldKeys.has(key); heldKeys.add(key);
  if (event.repeat || alreadyHeld || blockedKeys.has(key)) { if (['enter', ' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'home', 'end'].includes(key)) event.preventDefault(); return; }
  if (event.ctrlKey || event.metaKey || event.altKey || event.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName || '')) return;
  if (modalOpen()) return;
  const tileButton = event.target?.closest?.('[data-tile-id]');
  if (tileButton && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'home', 'end'].includes(key)) {
    event.preventDefault(); const id = Number(tileButton.dataset.tileId), row = Math.floor(id / 7), col = id % 7;
    let next = id;
    if (key === 'arrowleft') next = row * 7 + Math.max(0, col - 1);
    if (key === 'arrowright') next = row * 7 + Math.min(6, col + 1);
    if (key === 'arrowup') next = Math.max(0, row - 1) * 7 + col;
    if (key === 'arrowdown') next = Math.min(5, row + 1) * 7 + col;
    if (key === 'home') next = row * 7;
    if (key === 'end') next = row * 7 + 6;
    selectTile(next, true);
  } else if (key === 'p' || key === 'escape') { event.preventDefault(); togglePause(); }
  else if (key === 'h') { event.preventDefault(); openDialog($('help-dialog')); }
});
window.addEventListener('keyup', event => {
  const key = event.key.toLowerCase();
  if (blockedKeys.has(key) && (key === 'enter' || key === ' ')) event.preventDefault();
  heldKeys.delete(key); blockedKeys.delete(key);
});
window.addEventListener('blur', () => { pauseFor('窗口已离开，本章自动暂停。回来后请主动继续。'); heldKeys.clear(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseFor('页面已隐藏，本章自动暂停。回来后请主动继续。'); heldKeys.clear(); } });
window.addEventListener('pagehide', () => pauseFor());
function frame(now) {
  // Rendering is cosmetic only: no simulation step, no elapsed-time rewards.
  if (context && !document.hidden && now - lastFrame >= (reducedMotion.matches ? 250 : 1000 / 30)) {
    render(context, snapshot(game), { width: WIDTH, height: HEIGHT, time: now, reducedMotion: reducedMotion.matches, selectedTile });
    lastFrame = now;
  }
  window.requestAnimationFrame(frame);
}
updateUI();
if (!context) tell('此浏览器无法显示地图画面；仍可用地块索引和行动按钮完整游玩。', 'error');
window.requestAnimationFrame(frame);
