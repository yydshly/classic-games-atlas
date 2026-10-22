import { LEVELS, COLORS } from './levels.mjs';
import { createGame, start, pause, attemptSwap, update, requestHint, goals, snapshot, checkpoint, restore } from './engine.mjs';
import { Renderer, gemSvg } from './renderer.mjs';

const $ = s => document.querySelector(s);
import {JourneyStore,fresh,finish} from './journey.mjs';
let local;try{local=localStorage;}catch{}
const store=new JourneyStore(local);let progress=store.data;
const restored=restore(progress.resume);
let game = restored || createGame(progress.last - 1), wasRestored = !!restored, cursor = 0;
let primaryAction, secondaryAction, lastState = '', lastHud = 0, lastTime = performance.now();
let helpStarts = false, resumeAfterDialog = false, drag = null, focusAfterTurn = false, audio = null, lastTone = 0, faulted = false;
let targetSignature = '', publicLevel = 0, legendColors = 0;
const board = $('#board'), renderer = new Renderer(board);
const coordinate = i => `第${(i / 8 | 0) + 1}行第${i % 8 + 1}列`;
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function write() {
 store.save(progress);
 const message=store.reason==='corrupt'?'本旅程旧档损坏，原始内容已保全且禁止覆盖。仍可游玩，刷新可能丢失当前进度。':store.reason==='read'?'无法读取本地存储；仍可游玩，刷新可能丢失当前进度。':store.reason==='write'?'保存未成功：仍可游玩，刷新可能丢失当前进度；旧有效存档未删除。':'独立旅程存档；完整交换后保存，动画中刷新回到本步之前并先暂停。关间与最终战报保留，原两题/20关存档不变。';
 $('#save-note').classList.toggle('warning',!!store.reason);
 if($('#save-note').textContent!==message)$('#save-note').textContent=message;
}
function remember() { const cp = checkpoint(game); if (cp) progress.resume = cp; write(); }
function unlockAudio() {
  if (!progress.sound) return;
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume().catch(() => {}); } catch { /* Sound is optional. */ }
}
function tone(freq, length = .1) {
  if (!progress.sound || !audio || audio.state !== 'running' || performance.now() - lastTone < 65) return;
  try {
    lastTone = performance.now();
    const o = audio.createOscillator(), v = audio.createGain(), t = audio.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.2, t + length);
    v.gain.setValueAtTime(.025, t); v.gain.exponentialRampToValueAtTime(.0001, t + length);
    o.connect(v); v.connect(audio.destination); o.start(t); o.stop(t + length + .02);
    o.onended = () => { o.disconnect(); v.disconnect(); };
  } catch { /* A blocked audio device must not interrupt a puzzle. */ }
}
function announce(text) { $('#battle-status').textContent = text; }
function goalSummary() {
  const l = LEVELS[game.level - 1];
  return ['造出棱镜 ×1', '选色释放 ×1', l.score ? '得分 ' + l.score : '', ...l.collect.map(c => `${COLORS[c.color].name} ${c.count} 枚`), l.layers ? '松土 ' + l.layers + ' 层' : ''].filter(Boolean).join(' · ');
}
function load(index) {
  drag = null; focusAfterTurn = false; cursor = 0; faulted = false;
  game = createGame(index); wasRestored = false; progress.last = game.level; progress.phase='playing'; lastState = ''; targetSignature = ''; publicLevel = 0;
  remember(); hud(); sync(); renderer.draw(game, cursor);
  announce(`已选择${LEVELS[index].name}，固定棋盘已就绪。`);
}
function overlay(title, copy, summary, label, action, secondary = '旅程进度', second = openLevels) {
  $('#overlay-title').textContent = title; $('#overlay-copy').textContent = copy; $('#overlay-summary').textContent = summary;
  $('#primary-action').textContent = label + ' ↗'; $('#secondary-action').textContent = secondary;
  primaryAction = action; secondaryAction = second; $('#overlay').hidden = false;
}
function begin() {
  if(progress.phase!=='playing')return;
  unlockAudio();
  if (!progress.tutorialSeen) { helpStarts = true; openHelp(); return; }
  faulted = false; start(game); remember(); sync(); hud(); renderer.draw(game, cursor);
  board.querySelector('[data-index="0"]')?.focus({ preventScroll: true });
  announce('本题开始。'+LEVELS[game.level-1].tip);
}
function togglePause() {
  if (!['playing', 'paused'].includes(game.state)) return;
  drag = null; faulted = false; pause(game); remember(); sync(); hud(); renderer.draw(game, cursor);
}
function sync() {
  document.body.dataset.state = game.state;
  if (lastState === game.state) return;
  lastState = game.state;
  $('#pause').disabled = !['playing', 'paused'].includes(game.state);
  $('#pause').innerHTML = game.state === 'paused' ? '继续 <kbd>P</kbd>' : '暂停 <kbd>P</kbd>';
  $('#touch-pause').textContent = game.state === 'paused' ? '继续' : '暂停';
  if (game.state === 'playing') { $('#overlay').hidden = true; return; }
  drag = null;
  $('#overlay-eyebrow').textContent = `PUZZLE ${String(game.level).padStart(2, '0')} / ${String(LEVELS.length).padStart(2, '0')}`;
  const l = LEVELS[game.level - 1];
  if (game.state === 'ready') overlay(l.name, l.tip, `${game.moves} 步 · ${goalSummary()}`, '开始解谜', begin);
  if (game.state === 'paused') overlay(wasRestored ? '上一束光，还在这里。' : '让花园，停留片刻。', wasRestored ? '已恢复上次完整交换后的棋盘、目标与剩余步数。' : '棋盘、连锁和当前动画阶段都已暂停。', `余下 ${game.moves} 步 · ${game.score} 分`, '继续解谜', togglePause, '重开本题', () => load(game.level - 1));
  if (game.state === 'lost') {
    progress.resume = checkpoint(game); write();
    overlay('再看一眼，光的方向。', '步数已用尽，全部连锁结束后仍未达标。可展开下方公开解法。', `${game.score} 分 · 棱镜生成 ${game.stats.prismsCreated || 0} · 棱镜释放 ${game.stats.prismsActivated || 0}`, '重试当前题', () => { load(game.level - 1); begin(); },'查看参考解法',showSolution);
    announce('步数已用尽，尚未完成全部目标。可重试固定棋盘，或查看公开解法。'); tone(170, .25);
  }
  if (game.state === 'won') {
    if(finish(progress,game))publicLevel=0;progress.resume=checkpoint(game);write();
    const complete=progress.phase==='complete';
    overlay(complete?'三束光，为旅程盛放。':'这一束光，为你盛放。',complete?'三题目标全部完成，三段战报已保留。可以回看本次旅程，或开启新旅程。':`下一题：${LEVELS[game.level].name}。${LEVELS[game.level].tip}`,`${game.score} 分 · 用了 ${game.stats.validSwaps} 步 · 最长 ${game.stats.maxChain} 连锁`,complete?'返回游戏大厅':'前往下一题',complete?back:()=>load(game.level),'查看旅程战报',showSummary);
    announce(complete?'三题旅程完成，可在上方回看本次战报。':'本题完成，下一题从新棋盘开始；前题战报保留在本次旅程中。');tone(680,.35);
  }

}
function target(title, current, total, note = '') {
  return `<div class="target ${current >= total ? 'done' : ''}"><div class="target-top"><span>${current >= total ? '✓ ' : ''}${title}</span><strong>${Math.min(current, total)} / ${total}</strong></div>${note ? `<small>${note}</small>` : ''}<span class="target-bar"><i style="width:${Math.min(100, current / total * 100)}%"></i></span></div>`;
}
function publicPuzzle(l) {
  if (publicLevel === l.id) return;
  publicLevel = l.id;
  $('#puzzle-hint').textContent = l.hint || l.tip;
  $('#seed').textContent = l.seed;
  $('#starting-caption').textContent = '固定起始棋盘';
  const cells = l.board || [];
  $('#starting-board').innerHTML = cells.map((color, i) => {
    const kind = l.specials?.[i] || 'normal', name = kind === 'prism' ? '彩虹棱镜' : COLORS[color]?.name || '晶簇';
    return `<span class="start-cell ${l.soil[i] ? 'start-soil' : ''}" title="${coordinate(i)}，${name}${l.soil[i] ? '，土层 ' + l.soil[i] : ''}">${gemSvg(color, kind)}${l.soil[i] ? `<i>${l.soil[i] === 2 ? 'Ⅱ' : 'Ⅰ'}</i>` : ''}</span>`;
  }).join('');
  $('#solution-list').innerHTML = (l.solution || []).map(([a, b]) => `<li>${coordinate(a)} ↔ ${coordinate(b)}</li>`).join('') || '<li>本题没有提供参考步骤。</li>';
  $('#puzzle-picker').innerHTML = LEVELS.map(p=>`<span ${p.id===game.level?'aria-current="step"':''}>${p.id<=progress.results.length?'✓ ':''}${p.id} · ${escapeHTML(p.name)}</span>`).join('');
}
function hud() {
  const l = LEVELS[game.level - 1], t = goals(game), created = game.stats.prismsCreated || 0, activated = game.stats.prismsActivated || 0;
  $('#mission-number').textContent = `${String(game.level).padStart(2, '0')} / ${String(LEVELS.length).padStart(2, '0')}`;
  $('#mission-name').textContent = l.name; $('#mission-tip').textContent = l.tip;
  $('#moves').textContent = game.moves; $('#score').textContent = String(game.score).padStart(5, '0'); $('#chain').textContent = game.chain ? game.chain + ' 连' : '—';
  $('#used').textContent = game.stats.validSwaps; $('#max-chain').textContent = game.stats.maxChain; $('#best').textContent = progress.best[game.level]?.score ?? '—';
  $('#quick-start').hidden = game.state !== 'ready';
  $('#hint').disabled = game.state !== 'playing' || game.phase !== 'stable' || faulted;
  $('#touch-pause').disabled = !['playing', 'paused'].includes(game.state);
  const signature = JSON.stringify([game.level, t, created, activated]);
  if (targetSignature !== signature) {
    targetSignature = signature;
    $('#targets').innerHTML = [target('◈ 造出棱镜', created, 1), target('✧ 选色释放', activated, 1), l.score ? target('收集光芒', game.score, l.score) : '', ...t.collect.map(c => target(COLORS[c.color].symbol + ' ' + COLORS[c.color].name, c.current, c.count)), l.layers ? target('松动土层', game.clearedLayers, l.layers, 'Ⅰ / Ⅱ 是剩余土层，每次消除去一层') : ''].join('');
    $('#mobile-targets').innerHTML = [`<span class="${created >= 1 ? 'done' : ''}">造棱镜 <b>${Math.min(created, 1)}/1</b></span>`, `<span class="${activated >= 1 ? 'done' : ''}">选色释放 <b>${Math.min(activated, 1)}/1</b></span>`, l.score ? `<span class="${game.score >= l.score ? 'done' : ''}">光芒 <b>${Math.min(game.score, l.score)}/${l.score}</b></span>` : '', ...t.collect.map(c => `<span class="${c.current >= c.count ? 'done' : ''}">${COLORS[c.color].symbol} ${COLORS[c.color].name} <b>${Math.min(c.current, c.count)}/${c.count}</b></span>`), l.layers ? `<span class="${game.clearedLayers >= l.layers ? 'done' : ''}">松土 <b>${Math.min(game.clearedLayers, l.layers)}/${l.layers}</b></span>` : ''].join('');
  }
  if (legendColors !== game.colors) { legendColors = game.colors; $('#color-legend').innerHTML = COLORS.slice(0, game.colors).map((c, i) => `<span>${gemSvg(i)}${c.name}</span>`).join(''); }
  const prismActive = (game.pending?.activated || []).some(i => game.board[i]?.kind === 'prism');
  const prismBorn = (game.pending?.creations || []).some(c => c.kind === 'prism');
  const phases = { stable: '选择下一束光', swap: '交换中…', return: '无效交换 · 不扣步', clear: prismActive ? '棱镜释放 · 同色晶簇亮起' : `${game.chain} 连锁 · 正在消除`, forge: prismBorn ? '棱镜已生成 · 停留观察' : '特殊晶簇已生成 · 停留观察', fall: '晶簇下落 · 等待棋盘稳定', shuffle: '无有效交换 · 重新铺开' };
  $('#phase-label').textContent = game.state === 'won' ? '谜题完成' : game.state === 'lost' ? '可重试固定棋盘' : game.state === 'ready' ? '棋盘已就绪 · 开始解谜' : game.state === 'paused' ? '已暂停 · ' + (phases[game.phase] || '') : phases[game.phase] || '等待下一步';
  publicPuzzle(l);
  $('#journey-title').textContent=progress.phase==='complete'?'三题完成 · 光的旅程':`第 ${game.level} 题 / 3 · ${l.name}`;$('#journey-summary').innerHTML=progress.results.map(r=>`<li>${escapeHTML(LEVELS[r.level-1].name)}：${r.score} 分 · ${r.moves} 步</li>`).join('')||'<li>从第一题开始。完成后前往下一题；失败只重试当前题。</li>';$('#restart').disabled=progress.phase!=='playing';
}
function perform(a, b) {
  if (game.state !== 'playing' || game.phase !== 'stable' || faulted) return false;
  remember();
  if (!attemptSwap(game, a, b)) return false;
  focusAfterTurn = !!document.activeElement?.closest?.('#board'); unlockAudio(); renderer.draw(game, cursor); hud(); return true;
}
function select(i) {
  if (game.state !== 'playing' || game.phase !== 'stable' || faulted) return;
  cursor = i;
  const prior = game.selection;
  if (prior === null) game.selection = i; else if (prior === i) game.selection = null; else if (!perform(prior, i)) game.selection = i;
  renderer.draw(game, cursor);
}
function hint() {
  unlockAudio(); const pair = requestHint(game);
  if (pair) { tone(460); announce(`已标出${coordinate(pair[0])}与${coordinate(pair[1])}。提示有效交换，不消耗步数；参考解法可在公开题面中查看。`); renderer.draw(game, cursor); remember(); }
}
function suspend() {
  resumeAfterDialog = game.state === 'playing';
  if (resumeAfterDialog) { drag = null; pause(game); remember(); sync(); hud(); renderer.draw(game, cursor); }
}
function openHelp() { suspend(); $('#help-dialog').showModal(); }
function closeHelp(confirmed) {
  $('#help-dialog').close();
  if (confirmed) { progress.tutorialSeen = true; write(); }
  if (helpStarts) { helpStarts = false; if (confirmed) begin(); } else if (resumeAfterDialog) togglePause();
  resumeAfterDialog = false;
}
function back(){location.href='../../../../index.html#play';}
function showSummary(){$('#journey-title').focus();$('#journey-title').scrollIntoView({block:'start'});}
function showSolution(){$('#puzzle-details').open=true;$('#puzzle-details summary').focus();$('#puzzle-details').scrollIntoView({block:'start'});}
function openLevels(){suspend();$('#level-list').innerHTML=LEVELS.map(l=>`<p>${l.id} · ${escapeHTML(l.name)} — ${l.id<=progress.results.length?'已完成':l.id===game.level?'当前题':'待前题完成'}</p>`).join('');$('#levels-dialog').showModal();}
function closeLevels(){$('#levels-dialog').close();if(resumeAfterDialog)togglePause();resumeAfterDialog=false;}
function reportError(error) {
  console.error('Garden journey paused after an error:', error);
  faulted = true; drag = null; focusAfterTurn = false;
  try {
    const safe = restore(progress.resume);
    if (safe) { game = safe; wasRestored = true; } else if (game.state === 'playing') pause(game);
    lastState = ''; renderer.signature = ''; sync(); hud(); renderer.draw(game, cursor);
    overlay('这一步暂时停下了。', safe ? '已回到最近保存的稳定棋盘。可以继续，或重开本题。' : '发生运行异常，已暂停。请重开本题再试。', '原版 20 关的存档不受影响。', safe ? '继续稳定棋盘' : '重开本题', safe ? () => { faulted = false; if (game.state === 'ready') begin(); else togglePause(); } : () => load(game.level - 1), '重开本题', () => load(game.level - 1));
  } catch { $('#overlay').hidden = false; $('#overlay-title').textContent = '运行暂时中断，请刷新后重试。'; }
  announce('运行异常已捕获，游戏暂停。请继续最近的稳定棋盘，或重开本题。');
}
const guard = fn => (...args) => { try { return fn(...args); } catch (error) { reportError(error); } };
function on(selector, event, fn) { $(selector).addEventListener(event, guard(fn)); }

on('#primary-action', 'click', () => primaryAction?.()); on('#secondary-action', 'click', () => secondaryAction?.());
for (const id of ['#pause', '#touch-pause']) on(id, 'click', togglePause);
on('#quick-start', 'click', begin); on('#hint', 'click', hint); on('#restart', 'click', () => {if(progress.phase==='playing')load(game.level - 1);}); on('#levels', 'click', openLevels);
for (const id of ['#help', '#manual']) on(id, 'click', openHelp);
on('#help-confirm', 'click', () => closeHelp(true)); on('#help-close', 'click', () => closeHelp(false));
on('#help-dialog', 'cancel', e => { e.preventDefault(); closeHelp(false); });
on('#levels-close', 'click', closeLevels); on('#levels-dialog', 'cancel', e => { e.preventDefault(); closeLevels(); });
on('#sound', 'click', () => { progress.sound = !progress.sound; $('#sound').textContent = '声音 ' + (progress.sound ? '开' : '关'); $('#sound').setAttribute('aria-pressed', String(progress.sound)); if (progress.sound) { unlockAudio(); tone(510); } write(); });
on('#board', 'focusin', e => { const c = e.target.closest('[data-index]'); if (c) { cursor = Number(c.dataset.index); for (const cell of board.children) cell.tabIndex = Number(cell.dataset.index) === cursor ? 0 : -1; } });
on('#board', 'pointerdown', e => {
  const cell = e.target.closest('[data-index]');
  if (!cell || cell.disabled || drag || game.state !== 'playing' || game.phase !== 'stable' || faulted) return;
  e.preventDefault(); drag = { id: e.pointerId, index: Number(cell.dataset.index), x: e.clientX, y: e.clientY };
  board.setPointerCapture(e.pointerId); unlockAudio();
});
on('#board', 'pointerup', e => {
  if (!drag || drag.id !== e.pointerId) return;
  const d = drag; drag = null; e.preventDefault();
  if (board.hasPointerCapture(e.pointerId)) board.releasePointerCapture(e.pointerId);
  const dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (Math.hypot(dx, dy) > 18) { const direction = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 1 : -1 : dy > 0 ? 8 : -8; perform(d.index, d.index + direction); } else select(d.index);
});
for (const event of ['pointercancel', 'lostpointercapture']) on('#board', event, e => { if (drag?.id === e.pointerId) drag = null; });
on('#board', 'click', e => { if (e.detail === 0) { const c = e.target.closest('[data-index]'); if (c) select(Number(c.dataset.index)); } });
on('#board', 'keydown', e => {
  if (game.state !== 'playing' || game.phase !== 'stable' || faulted) return;
  const directions = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 };
  if (e.code in directions) {
    e.preventDefault(); const next = cursor + directions[e.code];
    if (next < 0 || next > 63 || (Math.abs(directions[e.code]) === 1 && (next / 8 | 0) !== (cursor / 8 | 0))) return;
    if (e.shiftKey) perform(cursor, next);
    cursor = next; renderer.draw(game, cursor); board.querySelector(`[data-index="${cursor}"]`)?.focus({ preventScroll: true });
  }
  if (['Enter', 'Space'].includes(e.code)) { e.preventDefault(); if (!e.repeat) select(cursor); }
});
document.addEventListener('keydown', guard(e => {
  if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]') || e.target.closest('a,button,input,textarea,select')&&!e.target.closest('#board') || e.repeat) return;
  if (['KeyP', 'Escape'].includes(e.code)) { e.preventDefault(); togglePause(); }
  if (e.code === 'KeyR' && progress.phase==='playing') { e.preventDefault(); load(game.level - 1); }
  if (e.code === 'KeyH') { e.preventDefault(); hint(); }
}));
on('#new-journey','click',()=>{autoPause();$('#new-dialog').showModal();$('#keep-journey').focus();});
on('#keep-journey','click',()=>$('#new-dialog').close());
on('#confirm-journey','click',()=>{const prior=progress;progress=fresh();progress.best=prior.best;progress.sound=prior.sound;progress.tutorialSeen=prior.tutorialSeen;$('#new-dialog').close();load(0);showSummary();});
function autoPause() { drag = null; if (game.state === 'playing') { pause(game); remember(); sync(); hud(); renderer.draw(game, cursor); } }
window.addEventListener('blur', guard(autoPause));
document.addEventListener('visibilitychange', guard(() => { if (document.hidden) autoPause(); }));
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.08, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
  if (faulted) return;
  try {
    update(game, dt); let dirty = false;
    for (const e of game.events.splice(0)) {
      dirty = true;
      if (e.type === 'clear') { tone(330 + Math.min(8, e.chain) * 55); announce(`${e.chain} 连锁，${e.count} 枚晶簇消除${e.specials ? '，特殊晶簇已触发' : ''}。`); }
      if (e.type === 'harvest' && e.created) announce('新的特殊晶簇已经生成，短暂停留后下落。');
      if (e.type === 'invalid') { tone(210, .06); announce('这次交换没有匹配，已返回，不消耗步数。'); }
      if (e.type === 'shuffle') announce('暂无有效交换，自动洗牌；步数、目标计数和土层保留。');
      if (e.type === 'stable') remember();
    }
    sync(); renderer.draw(game, cursor);
    if (focusAfterTurn && game.phase === 'stable') { focusAfterTurn = false; if (game.state === 'playing') board.querySelector(`[data-index="${cursor}"]`)?.focus({ preventScroll: true }); else if (['won', 'lost'].includes(game.state)) $('#primary-action').focus({ preventScroll: true }); }
    if (dirty || now - lastHud > 80) { hud(); lastHud = now; }
  } catch (error) { reportError(error); }
}
// A detached observation copy, never a live board or move/goal setter.
export function diagnostics() { return { ...snapshot(game), goals: goals(game), puzzleCount: LEVELS.length, unlocked:Math.min(LEVELS.length,progress.results.length+1), best: JSON.parse(JSON.stringify(progress.best)), sound: progress.sound, storageAvailable:!store.reason, storageReason:store.reason, journeyPhase:progress.phase, results:JSON.parse(JSON.stringify(progress.results)), dragActive: !!drag, keyboardCursor: cursor, wasRestored, faulted }; }
guard(() => { $('#sound').textContent = '声音 ' + (progress.sound ? '开' : '关'); $('#sound').setAttribute('aria-pressed', String(progress.sound)); if (!restored) remember(); else write(); hud(); sync(); renderer.draw(game, cursor); })();
requestAnimationFrame(frame);
