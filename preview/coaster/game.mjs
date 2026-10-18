import { LEVELS, MODULES, PHYSICS, FIXED_DT, createGame, command, canCommand, pause, resume, step, snapshot, checkpoint, restore } from './engine.mjs';
import { render, hitSegment } from './renderer.mjs';
import { createProgressStore, recordVictory, isPointerActivation } from './progress.mjs';

const $ = id => document.getElementById(id);
const live = state => state === 'testing' || state === 'operating';
const modalOpen = () => $('help-dialog').open || $('chapters-dialog').open;
const number = (value, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '—';
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const setText = (id, value) => { const node = $(id); if (node.textContent !== String(value)) node.textContent = String(value); };
function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
let storage = null;
try { storage = window.localStorage; } catch { /* Store exposes this failure in the page. */ }
const store = createProgressStore(storage);
let progress = store.loadProgress();
const saved = store.loadCurrent();
if (store.damagedCurrent) store.rejectCurrent();
let restored = saved ? restore(saved) : null;
if (restored && (restored.levelIndex > progress.unlocked || ['won', 'lost'].includes(restored.state))) restored = null;
if (saved && !restored) store.rejectCurrent();
// A finished attempt has no current checkpoint; keep the next unlocked park in view.
let game = restored || createGame(progress.unlocked);
if (live(game.state)) pause(game);
let showRecoveryWarning = store.damagedCurrent;
let wasRestored = Boolean(restored), wasProgressOpened = !restored && progress.unlocked > 0, selected = game.selected || 0, press = null, generation = 0, accumulator = 0;
let previous = performance.now(), lastHud = 0, lastSave = 0, lastState = '', lastMessage = '', lastReport = undefined, victoryRecorded = false;
let primaryAction = null, lastDialogTrigger = null, checkpointUnavailable = false, discardNextFrame = true;
const board = $('park'), ctx = board.getContext('2d');
const reducedMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const segmentButtons = [], moduleButtons = new Map(), chapterButtons = [], objectiveRows = [], diagnosisRows = [];
const heldKeys = new Set();

function clearPress() { press = null; generation++; }
function announce(text) { setText('live-message', text); }
function storageNotice() {
  setText('save-note', store.unavailable
    ? '浏览器存储不可用。仍可正常游玩；刷新后可能无法保留方案、解锁和记录。'
    : checkpointUnavailable ? '当前操作记录已达到保存上限；本页可继续游玩，但最新进度无法恢复。完成记录仍会保存。'
      : '仅存本机，不上传数据。未结束的当前局保留方案与操作记录，刷新后列车暂停；已结束的局不保留方案，通关票根与解锁独立保存。');
  if (showRecoveryWarning) { $('restore-note').hidden = false; setText('restore-note', `当前局存档不完整、版本不兼容或无法恢复，已在第 ${progress.unlocked + 1} 园重新开始。独立保存的通关记录与解锁仍保留。`); }
  else if (wasRestored) { $('restore-note').hidden = false; setText('restore-note', game.state === 'paused' ? '已恢复保存中的列车与方案，目前暂停。请按“继续”恢复运行。' : '已恢复上次保存的设计与营业进度。'); }
  else if (wasProgressOpened) { $('restore-note').hidden = false; setText('restore-note', Object.keys(progress.best).length === LEVELS.length ? '八园通关记录已保留，已打开第 8 园供你重访。重访从新方案开始。' : `通关记录与解锁已保留，已打开最新解锁的第 ${game.levelIndex + 1} 园。可在公园列表重访已完成的公园。`); }
  else $('restore-note').hidden = true;
}
function save() {
  if (game.state === 'won' || game.state === 'lost') store.clearCurrent();
  else {
    const value = checkpoint(game);
    checkpointUnavailable = !value;
    if (value) store.saveCurrent(value);
  }
  storageNotice();
}
function awardIfWon() {
  if (game.state !== 'won' || victoryRecorded) return;
  victoryRecorded = true;
  progress = recordVictory(progress, game.levelIndex, game);
  store.saveProgress(progress);
  store.clearCurrent();
}
function draw(now = performance.now()) {
  if (ctx) render(ctx, snapshot(game), { width: 1200, height: 800, time: now / 1000, reducedMotion, selectedSegment: selected });
}
function selection(index, focus = false) {
  if (modalOpen()) return;
  if (!Number.isInteger(index) || index < 0 || index >= game.modules.length) return;
  if (selected !== index) { command(game, { type: 'select', segment: index }); selected = index; save(); }
  refresh(); draw();
  if (focus) segmentButtons[index].button.focus({ preventScroll: true });
}
function run(input) {
  if (modalOpen()) return false;
  clearPress();
  const allowed = canCommand(game, input);
  if (!allowed.ok) { announce(allowed.reason); return false; }
  const result = command(game, input);
  if (!result.ok) { announce(result.reason); return false; }
  accumulator = 0; discardNextFrame = true; previous = performance.now(); wasRestored = wasProgressOpened = showRecoveryWarning = false;
  selected = game.selected;
  announce(game.message || '操作已更新。');
  refresh(); draw(); save();
  return true;
}
function install(module) {
  if (modalOpen()) return;
  if (game.state === 'design' && game.modules[selected] === module) { announce(`${selected + 1} 号段已经安装${MODULES[module].name}，方案没有变化。`); return; }
  run({ type: 'module', segment: selected, module });
}
function togglePause() {
  if (modalOpen()) return;
  clearPress();
  if (game.state === 'paused') {
    resume(game); wasRestored = wasProgressOpened = showRecoveryWarning = false; announce('继续运行。完整回站后才会结算载客收入。');
  } else if (live(game.state)) { pause(game); announce('已暂停。列车与计时停止；可以继续，或返回设计。'); }
  else return;
  accumulator = 0; discardNextFrame = true; previous = performance.now(); refresh(); draw(); save();
}
function autoPause() {
  clearPress(); accumulator = 0; discardNextFrame = true; previous = performance.now();
  if (live(game.state)) { pause(game); announce('运行已自动暂停。按“继续”恢复列车。'); refresh(); draw(); }
  save();
}
function load(index) {
  if (modalOpen()) return;
  if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length || index > progress.unlocked) return;
  clearPress(); game = createGame(index); selected = 0; wasRestored = wasProgressOpened = showRecoveryWarning = false; victoryRecorded = false;
  checkpointUnavailable = false; lastReport = undefined; lastState = ''; lastMessage = ''; accumulator = 0; discardNextFrame = true; previous = performance.now();
  announce(`${game.level.name}：${game.level.tip}`); refresh(); draw(); save();
}
function openDialog(id, trigger) {
  if ($('help-dialog').open || $('chapters-dialog').open) return;
  autoPause(); lastDialogTrigger = trigger;
  if (id === 'chapters-dialog') refreshChapters();
  $(id).showModal();
}
function closeDialog(id) {
  $(id).close(); clearPress(); accumulator = 0; discardNextFrame = true; previous = performance.now();
  refresh(); draw();
  if (lastDialogTrigger && !lastDialogTrigger.disabled) lastDialogTrigger.focus({ preventScroll: true });
  lastDialogTrigger = null;
  if (game.state === 'paused') announce('已关闭面板。列车仍暂停，按“继续”恢复。');
}
function setupControls() {
  for (let index = 0; index < 12; index++) {
    const button = element('button', 'segment-button'); button.type = 'button'; button.id = `segment-${index}`; button.dataset.segment = String(index);
    button.setAttribute('aria-pressed', 'false');
    const code = element('span', 'segment-number', String(index + 1).padStart(2, '0')), name = element('strong'), detail = element('small');
    button.append(code, name, detail); button.addEventListener('click', () => selection(index));
    button.addEventListener('keydown', event => {
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      const offset = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 }[event.code];
      if (offset !== undefined || event.code === 'Home' || event.code === 'End') {
        event.preventDefault(); const next = event.code === 'Home' ? 0 : event.code === 'End' ? 11 : (index + offset + 12) % 12; selection(next, true);
      }
    });
    $('segment-list').append(button); segmentButtons.push({ button, name, detail });
  }
  for (const module of Object.values(MODULES)) {
    const button = element('button', 'module-button'); button.type = 'button'; button.id = `module-${module.id}`; button.dataset.module = module.id; button.dataset.commandKey = `module:${module.id}`;
    button.title = module.description;
    const name = element('strong', '', module.name), cost = element('span', 'module-cost'), reason = element('span', 'module-reason');
    button.append(name, cost, reason); button.addEventListener('click', () => install(module.id)); $('module-controls').append(button); moduleButtons.set(module.id, { button, cost, reason });
    const manual = element('p'), title = element('strong', '', `${module.name} · ${module.cost}：`); manual.append(title, document.createTextNode(module.description)); $('manual-modules').append(manual);
  }
  for (let i = 0; i < 4; i++) { const row = element('li'), label = element('span'), value = element('b'); row.append(label, value); $('objectives').append(row); objectiveRows.push({ row, label, value }); }
  // Keep diagnostic buttons in place, including across reports, so keyboard focus survives updates.
  for (let i = 0; i < 48; i++) {
    const row = element('li'), text = element('span'), button = element('button'); button.type = 'button'; button.id = `diagnosis-${i}`;
    button.addEventListener('click', () => { const index = Number(button.dataset.segment); if (Number.isInteger(index)) selection(index, true); });
    row.append(text, button); row.hidden = true; $('diagnosis-list').append(row); diagnosisRows.push({ row, text, button });
  }
  LEVELS.forEach((level, index) => {
    const button = element('button', 'chapter-button'); button.type = 'button'; button.id = `chapter-${index}`; button.dataset.level = String(index);
    const code = element('span', '', String(index + 1).padStart(2, '0')), block = element('div'), title = element('strong', '', level.name), subtitle = element('small', '', level.subtitle), goals = element('small'), status = element('small');
    block.append(title, subtitle, goals, status); button.append(code, block);
    button.addEventListener('click', () => { if (button.disabled) return; $('chapters-dialog').close(); lastDialogTrigger = null; load(index); $('primary-action').focus({ preventScroll: true }); });
    $('chapter-list').append(button); chapterButtons.push({ button, goals, status });
  });
}
function refreshChapters() {
  chapterButtons.forEach(({ button, goals, status }, index) => {
    const level = LEVELS[index], best = progress.best[index];
    button.disabled = index > progress.unlocked; button.setAttribute('aria-current', String(index === game.levelIndex));
    goals.textContent = `预算 ${level.budget} · 收入 ${level.targetRevenue} · 口碑 ${level.targetReputation}`;
    status.textContent = index > progress.unlocked ? '完成上一园后解锁' : best ? `已完成 · ${best.runs} 班 · 建造 ${best.cost}` : '已开放 · 等待你的设计';
  });
}
function refreshReport() {
  const report = game.report, level = game.level;
  setText('thrill', report ? number(report.thrill, 1) : '—'); setText('comfort', report ? number(report.comfort, 1) : '—'); setText('max-speed', report ? number(report.maxSpeed, 1) : '—');
  setText('thrill-goal', `目标 ≥ ${level.minThrill}`); setText('comfort-goal', `目标 ≥ ${level.minComfort}`);
  setText('report-status', report ? report.approved ? '安全 + 体验通过' : report.safe ? '安全通过 · 体验待调' : '安全未通过' : live(game.state) ? '测量中' : '等待试车');
  setText('report-summary', report ? !report.safe ? `轨道暂不可载客。试车在首个风险段停下，已测 ${report.testedSegments} / 12 段；当前评分仅代表已测部分，后续轨段尚未测量。`
    : `预计每班 ${report.riders} 位游客，收入 +${report.rideRevenue}，口碑 +${report.rideReputation}。${report.approved ? '安全与两项体验目标均通过，可自行决定开放。' : '安全不等于体验达标；低评分会减少乘客和口碑，可能在有限班次内失败。'}`
    : '完成空车试跑后查看安全状态、刺激度与舒适度。修改模块会使之前的报告失效。');
  if (report !== lastReport) {
    lastReport = report;
    diagnosisRows.forEach(({ row, text, button }, index) => {
      const item = report?.diagnosis[index]; row.hidden = !item;
      if (!item) { button.hidden = true; return; }
      row.dataset.severity = item.severity === 'danger' ? 'error' : item.severity; text.textContent = item.message;
      button.hidden = !Number.isInteger(item.segment);
      if (!button.hidden) { button.dataset.segment = String(item.segment); button.textContent = `查看 ${item.segment + 1} 号段 →`; }
    });
  }
  const segment = report?.segments[selected];
  setText('segment-report', segment && segment.measured === false ? `${selected + 1} 号段尚未测量：前段试车中止，修正后再测。` : segment ? `${selected + 1} 号段：入口 ${number(segment.entrySpeed, 1)} 米/秒 · ${segment.exitReached === false ? `坡中中止时 ${number(segment.measuredExitSpeed, 1)} 米/秒，未到出口` : `出口 ${number(segment.exitSpeed, 1)} 米/秒`} · 横向 ${number(segment.lateral, 2)}g · 舒适 ${number(segment.comfort, 1)}。${segment.message}` : '');
}
function refreshState() {
  const level = game.level, report = game.report;
  document.body.dataset.state = game.state;
  const names = { design: 'DESIGN STUDIO', testing: 'EMPTY TRAIN TEST', operating: 'PARK IS OPEN', paused: 'TAKE A LITTLE BREAK', won: 'A GRAND LITTLE DAY', lost: 'BACK TO THE BLUEPRINT' };
  setText('map-badge', names[game.state]); setText('state-kicker', `PARK ${String(level.id).padStart(2, '0')} / ${names[game.state]}`);
  let title, copy, label;
  if (game.state === 'design') {
    title = !report ? '让快乐，安全出发。' : report.approved ? '轨道就绪，等待开园。' : report.safe ? '安全通过，体验还可打磨。' : '找到问题，再试一圈。';
    copy = !report ? '选择轨段，在预算内配置模块，然后派出空车。试车不计入营业班次。' : report.approved ? '这份方案已通过安全与体验验收。点击开放载客，才会开始有限班次的营业。' : report.safe ? '可以开放载客，但低评分可能让营收或口碑不足。参考诊断继续调整。' : '空车在首个风险处停车。查看具体轨段，修正后重新试车。';
    label = report?.approved ? '开放载客 ↗' : '空车试跑 ↗'; primaryAction = () => run(report?.approved ? 'open' : 'test');
  } else if (live(game.state)) {
    title = game.state === 'testing' ? '空车出发，沿途测量。' : '今天的快乐，正在发生。';
    copy = game.state === 'testing' ? '正在测量速度、横向力和乘坐感。结束后自动返回设计，不会自动开放。' : '每班安全回站后结算；同时达到营收与口碑目标即完成，班次用尽仍未达标则重试。';
    label = '暂停片刻'; primaryAction = togglePause;
  } else if (game.state === 'paused') {
    title = wasRestored ? '你的公园，已接续。' : '把这一刻，留在云边。';
    copy = wasRestored ? '保存中的列车已恢复为暂停。方案与已完成营业保留，按继续后才会前进。' : '列车与计时已停。关闭面板不会自动继续；你也可以返回设计，放弃尚未结算的一班。';
    label = '继续运行 ↗'; primaryAction = togglePause;
  } else if (game.state === 'won') {
    title = game.levelIndex === LEVELS.length - 1 ? '八座公园，一路笑声。' : '第一声欢呼，属于你。';
    copy = game.levelIndex === LEVELS.length - 1 ? '八份委托全部完成。带着这些票根，随时回来打磨你的线路。' : '营收与口碑目标同时完成。通关票根已记录，下一座海岸公园开放了。';
    label = game.levelIndex === LEVELS.length - 1 ? '重访这座公园' : '下一座公园 →'; primaryAction = () => load(Math.min(game.levelIndex + 1, LEVELS.length - 1));
  } else {
    title = '今天收园，明天再来。'; copy = '可用营业班次已经用尽，目标仍未同时完成。参考体验报告，重试会重置本园方案和营业，已解锁公园保留。'; label = '重新设计本园'; primaryAction = () => load(game.levelIndex);
  }
  setText('state-title', title); setText('state-copy', copy); setText('primary-action', label);
  setText('state-summary', `建造 ${game.cost} / ${level.budget} · 营收 ${game.revenue} / ${level.targetRevenue} · 口碑 ${game.reputation} / ${level.targetReputation}`);
  $('pause').disabled = !(live(game.state) || game.state === 'paused'); setText('pause', game.state === 'paused' ? '继续 P' : '暂停 P');
  $('test-ride').disabled = !canCommand(game, 'test').ok; $('open-park').disabled = !canCommand(game, 'open').ok;
  $('redesign').disabled = game.state === 'design' || !canCommand(game, 'design').ok;
  $('open-park').title = canCommand(game, 'open').reason || '开始有限班次载客营业';
  setText('operation-note', game.state === 'design' ? report?.safe ? report.approved ? '方案已安全认证且体验达标。开放载客后按完整班次结算，达标即完成。' : '安全认证已通过，但体验未达标。开放仍可进行，请先核对每班预计收入与口碑。' : '试车不计入营业班次。必须安全通过后才能载客；任何改动都要重新认证。' : '返回设计会放弃当前未完成的试车或班次，保留已完成营业。重试本园会清空本次方案和营业。');
  if (lastState !== game.state) { lastState = game.state; clearPress(); }
  if (game.message && lastMessage !== game.message) { lastMessage = game.message; announce(game.message); }
}
function refresh() {
  awardIfWon();
  const level = game.level;
  setText('chapter-number', `PARK ${String(level.id).padStart(2, '0')} / 08`); setText('chapter-name', level.name); setText('brief-title', level.subtitle); setText('chapter-tip', level.tip);
  setText('cash', number(game.cash)); setText('cost', `轨道模块 ${game.cost} / ${level.budget}`); setText('revenue', number(game.revenue)); setText('revenue-target', `目标 ${level.targetRevenue}`);
  setText('reputation', number(game.reputation)); setText('reputation-target', `目标 ${level.targetReputation}`); setText('runs', `${game.runs} / ${level.maxRuns}`);
  setText('brief-note', `票价 ${level.ticketPrice} / 人 · 每班最多 ${level.seats} 人 · 线路限速 ${level.speedLimit} 米/秒`);
  const report = game.report;
  const objectives = [['营业收入', `${game.revenue} / ${level.targetRevenue}`, game.revenue >= level.targetRevenue], ['公园口碑', `${game.reputation} / ${level.targetReputation}`, game.reputation >= level.targetReputation], ['刺激度验收', `≥ ${level.minThrill}`, Boolean(report?.safe && report.thrill >= level.minThrill)], ['舒适度验收', `≥ ${level.minComfort}`, Boolean(report?.safe && report.comfort >= level.minComfort)]];
  objectiveRows.forEach(({ row, label, value }, index) => { label.textContent = objectives[index][0]; value.textContent = objectives[index][1]; row.dataset.complete = String(objectives[index][2]); });
  segmentButtons.forEach(({ button, name, detail }, index) => {
    name.textContent = level.segments[index].name; detail.textContent = MODULES[game.modules[index]].short;
    button.setAttribute('aria-pressed', String(index === selected)); button.tabIndex = index === selected ? 0 : -1;
    button.setAttribute('aria-label', `${index + 1} 号段 ${level.segments[index].name}，${MODULES[game.modules[index]].name}`);
    button.dataset.issue = String(Boolean(report?.diagnosis.some(item => item.segment === index && item.severity !== 'success')));
  });
  const seg = level.segments[selected], from = level.points[seg.from], to = level.points[seg.to], change = to.z - from.z;
  setText('selected-code', `${String(selected + 1).padStart(2, '0')} / 12`); setText('selected-title', seg.name);
  setText('selected-facts', `高度 ${from.z} → ${to.z} 米 · ${change >= 0 ? '+' : ''}${change} 米 · 长 ${number(seg.length, 1)} 米 · 转弯半径 ${seg.turnRadius} 米`);
  setText('selected-description', MODULES[game.modules[selected]].description);
  for (const [id, { button, cost, reason }] of moduleButtons) {
    const result = canCommand(game, { type: 'module', segment: selected, module: id }), current = game.modules[selected] === id;
    const net = MODULES[id].cost - MODULES[game.modules[selected]].cost;
    button.disabled = !result.ok; button.setAttribute('aria-pressed', String(current));
    cost.textContent = current ? `已装 · 总价 ${MODULES[id].cost}` : net < 0 ? `退回 ${-net} · 总价 ${MODULES[id].cost}` : `需付 ${net} · 总价 ${MODULES[id].cost}`;
    reason.textContent = !result.ok ? result.reason : current ? '当前方案 · 再点不会修改' : `可安装 · 余额 ${game.cash}`;
    button.setAttribute('aria-label', `${MODULES[id].name}。${MODULES[id].description} ${cost.textContent}。${reason.textContent}`);
  }
  setText('module-note', `替换时全额退回旧模块价格。当前可用 ${game.cash}；每段只装一种。${game.state !== 'design' ? '返回设计后才能修改。' : ''}`);
  setText('map-status', live(game.state) ? `${game.state === 'testing' ? '空车试跑' : `${game.aboard} 位乘客`} · ${game.train.segment + 1} 号段 · ${number(game.train.speed, 1)} 米/秒` : game.state === 'paused' ? '列车暂停 · 等待你继续' : `已选 ${selected + 1} 号段 · ${seg.name}`);
  const best = progress.best[game.levelIndex]; setText('best-record', best ? `${best.runs} 班完成 · 建造 ${best.cost} · 营收 ${best.revenue} · 口碑 ${best.reputation}` : '这座公园，等待第一张通关票根。');
  setText('manual-budget', '每园的建造预算固定，营收不能追加为建造预算。替换模块全额退回旧价，只支付差额；按钮显示费用、可用余额和不可安装原因。');
  setText('manual-rating', `“安全”要求不失速、不超线路限速、横向力不超过 ${PHYSICS.lateralLimit}g，且回站速度不超过 ${PHYSICS.stationSpeed} 米/秒；最低出口速度为 ${PHYSICS.minSpeed} 米/秒。“体验达标”还要求整圈平均刺激度和舒适度达到本园门槛。速度、落差与横向感提高刺激；提升段会减少刺激，强横向力与急刹会降低舒适。安全但体验不足仍能开园，乘客数与口碑会降低。`);
  setText('manual-operation', `票价、座位数与班次数在委托中列出。刺激与舒适相对门槛的较低比例决定上座人数，比例最低按 20% 计算、人数向下取整且至少 1 人。体验达标每班口碑 +90；否则是该比例 ×30 后四舍五入。报告显示确切预测。载客会自动连跑，只有完整回站才结算。达到两个经营目标即完成，最多 ${level.maxRuns} 班。返回设计保留已完成班次，放弃未完成一班；重试清空本园营业与方案。失败不解锁，完成才解锁下一园。`);
  refreshReport(); refreshState(); storageNotice();
}
setupControls();
$('primary-action').addEventListener('click', () => { if (!modalOpen()) primaryAction?.(); }); $('pause').addEventListener('click', togglePause);
$('test-ride').addEventListener('click', () => run('test')); $('open-park').addEventListener('click', () => run('open')); $('redesign').addEventListener('click', () => run('design'));
$('retry').addEventListener('click', () => load(game.levelIndex)); $('help').addEventListener('click', () => openDialog('help-dialog', $('help'))); $('chapters').addEventListener('click', () => openDialog('chapters-dialog', $('chapters')));
$('help-close').addEventListener('click', () => closeDialog('help-dialog')); $('help-confirm').addEventListener('click', () => closeDialog('help-dialog')); $('chapters-close').addEventListener('click', () => closeDialog('chapters-dialog'));
for (const id of ['help-dialog', 'chapters-dialog']) $(id).addEventListener('cancel', event => { event.preventDefault(); closeDialog(id); });

// A canvas contact selects only on release; native buttons retain their usual semantics.
board.addEventListener('pointerdown', event => {
  if (press || event.isPrimary === false) { clearPress(); return; }
  if (event.button !== 0 || $('help-dialog').open || $('chapters-dialog').open) return;
  const rect = board.getBoundingClientRect(); if (!rect.width || !rect.height) return;
  const x = (event.clientX - rect.left) * 1200 / rect.width, y = (event.clientY - rect.top) * 800 / rect.height;
  const index = hitSegment(x, y, snapshot(game)); if (!Number.isInteger(index) || index < 0 || index >= 12) return;
  press = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, index, generation };
  board.setPointerCapture?.(event.pointerId);
});
board.addEventListener('pointermove', event => { if (press?.pointerId === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 12) clearPress(); });
board.addEventListener('pointerup', event => {
  if (!press || press.pointerId !== event.pointerId) return;
  const start = press, sameGeneration = start.generation === generation; clearPress();
  const rect = board.getBoundingClientRect();
  if (!sameGeneration || !isPointerActivation(start, { pointerId: event.pointerId, x: event.clientX, y: event.clientY }) || !rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
  const index = hitSegment((event.clientX - rect.left) * 1200 / rect.width, (event.clientY - rect.top) * 800 / rect.height, snapshot(game));
  if (index === start.index) selection(index);
});
for (const name of ['pointercancel', 'lostpointercapture', 'pointerleave']) board.addEventListener(name, event => { if (press?.pointerId === event.pointerId) clearPress(); });
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const actions = { KeyP: togglePause, Escape: togglePause, KeyT: () => run('test'), KeyO: () => run('open'), KeyD: () => run('design'), KeyR: () => load(game.levelIndex), KeyH: () => openDialog('help-dialog', $('help')) };
  const nativeActivation = ['Enter', 'Space'].includes(event.code) && event.target?.tagName === 'BUTTON';
  const blocked = modalOpen() || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName) || event.target?.isContentEditable;
  if (nativeActivation || !blocked && actions[event.code]) {
    if (event.repeat || heldKeys.has(event.code)) { event.preventDefault(); return; }
    heldKeys.add(event.code);
  }
  if (blocked || event.repeat) return;
  if (actions[event.code]) { event.preventDefault(); actions[event.code](); }
});
document.addEventListener('keyup', event => heldKeys.delete(event.code));
window.addEventListener('blur', () => { heldKeys.clear(); autoPause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { heldKeys.clear(); autoPause(); } });
window.addEventListener('pagehide', () => { heldKeys.clear(); autoPause(); }); window.addEventListener('beforeunload', save);
function frame(now) {
  const dt = discardNextFrame ? 0 : Math.max(0, Math.min(.1, (now - previous) / 1000)); discardNextFrame = false; previous = now;
  const before = game.state, beforeRuns = game.runs;
  if (live(game.state) && !document.hidden && !$('help-dialog').open && !$('chapters-dialog').open) {
    accumulator = Math.min(.1, accumulator + dt); let ticks = 0;
    while (accumulator + 1e-9 >= FIXED_DT && live(game.state) && ticks < 6) { step(game, FIXED_DT); accumulator = Math.max(0, accumulator - FIXED_DT); ticks++; }
  } else accumulator = 0;
  if (before !== game.state || beforeRuns !== game.runs) { refresh(); save(); }
  else if (now - lastHud >= 100) { refresh(); lastHud = now; }
  if (live(game.state) && now - lastSave >= 1500) { save(); lastSave = now; }
  draw(now); requestAnimationFrame(frame);
}
/** Detached, deeply frozen observations. No commands, state setters or stored history are exposed. */
export function diagnostics() {
  return freeze({ ...snapshot(game), unlocked: progress.unlocked, best: JSON.parse(JSON.stringify(progress.best)), selectedSegment: selected, storageAvailable: !store.unavailable, wasRestored, pressActive: Boolean(press), discardedResume: store.damagedCurrent, checkpointUnavailable });
}
Object.defineProperty(window, 'coasterSnapshot', { value: diagnostics, writable: false, configurable: false });
refresh(); refreshChapters(); save(); draw(); requestAnimationFrame(frame);
