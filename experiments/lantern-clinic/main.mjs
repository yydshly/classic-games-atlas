import { SAVE_KEY, ROOM, SHIFTS, createGame, start, build, sell, assign, hire, route,
  tick, pause, resume, restart, selectStage, nextStage, checkpoint, restore } from './engine.mjs?v=lantern-clinic-three-shifts-result-1';

const $ = id => document.getElementById(id);
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let game;
try { game = restore(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { game = null; }
if (!game) game = createGame();
let selected = 'tune', lastAdvanceClick = { at: 0, button: null };
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(checkpoint(game))); }
  catch { $('status').textContent = '本机存储不可用：本次可继续，但刷新后无法续档。'; }
}
function commit(changed) { if (changed) save(); render(); }
function render() {
  const shift = SHIFTS[game.stage], canAct = ['ready', 'active'].includes(game.phase), active = game.phase === 'active';
  $('brief-title').textContent = `第 ${game.stage + 1} 班 · ${shift.name} · ${shift.theme}`;
  $('brief-copy').textContent = shift.brief;
  $('goal-copy').textContent = `目标：在 ${shift.limit} 分钟内处理至少 ${shift.quota} 位，离开不超过 ${shift.maxMissed} 位。开班资金 ${shift.cash} 灯票。`;
  $('minute').textContent = `${game.minute} / ${shift.limit} 分钟 · ${({ ready: '规划中', active: '接诊中', paused: '已暂停', won: '已完成', lost: '未达标' })[game.phase]}`;
  $('cash').textContent = game.cash; $('served').textContent = `${game.served}/${shift.quota}`;
  $('missed').textContent = `${game.missed}/${shift.maxMissed}`; $('nurses').textContent = `${game.nurses}/2`;
  $('quality').textContent = `误送 ${game.errors} 次 · 成功处理 +5 灯票，误送 -2 灯票。`;
  $('status').textContent = game.message;
  $('start').hidden = game.phase !== 'ready'; $('next').hidden = !(game.phase === 'won' && game.stage < 2);
  $('pause').hidden = game.phase === 'paused'; $('pause').disabled = !active;
  $('resume').hidden = game.phase !== 'paused'; $('advance').disabled = !active;
  $('retry').disabled = game.phase === 'ready' && game.minute === 0 && game.rooms.every(x => x === null);
  $('hire').disabled = !canAct || game.nurses >= 2 || game.cash < 8;
  document.querySelectorAll('[data-build]').forEach(b => {
    b.classList.toggle('selected', b.dataset.build === selected);
    b.setAttribute('aria-pressed', String(b.dataset.build === selected));
    b.disabled = !canAct;
  });
  $('stage-tabs').innerHTML = SHIFTS.map((s, i) => `<button data-stage="${i}" ${i > game.unlocked || !['ready', 'won', 'lost'].includes(game.phase) ? 'disabled' : ''} class="${i === game.stage ? 'selected' : ''}" aria-label="第 ${i + 1} 班 ${esc(s.name)}${i > game.unlocked ? '，尚未解锁' : ''}">${i + 1} · ${esc(s.name)}</button>`).join('');
  $('plots').innerHTML = game.rooms.map((kind, i) => {
    const occupied = game.patients.filter(p => p.plot === i && ['walking', 'queued'].includes(p.status)).length;
    return `<div class="plot-wrap"><button data-plot="${i}" class="plot ${kind ? game.staffed[i] ? 'staffed' : '' : 'empty'}" ${!canAct || (kind === 'scan') ? 'disabled' : ''} aria-label="第 ${i + 1} 间，${kind ? esc(ROOM[kind].name) : '空房'}，距入口 ${i + 1} 分钟${kind && game.staffed[i] ? '，有护理员' : ''}"><span class="symbol">${kind ? ROOM[kind].mark : '＋'}</span><span class="room-name">${kind ? esc(ROOM[kind].name) : '空房'}</span><small>${i + 1} 分钟路程 · ${kind ? kind === 'scan' ? '读谱' : game.staffed[i] ? '护理员在岗' : '待派护理员' : '点击建造'}</small>${occupied ? `<small>${occupied} 位在途/候处理</small>` : ''}</button>${kind && canAct ? `<button class="sell" data-sell="${i}" aria-label="拆除第 ${i + 1} 间${esc(ROOM[kind].name)}">拆房</button>` : ''}</div>`;
  }).join('');
  const pending = game.patients.filter(p => !['done', 'left'].includes(p.status));
  $('queue-count').textContent = `${pending.length} 位待处理`;
  const emptyQueue = {
    ready: '候诊廊暂空；布置房间后开始本班接诊。',
    active: '候诊廊暂空；按“推进”接待下一位。',
    paused: '已暂停；点击“继续”后再推进接诊。',
    won: game.stage < 2 ? '本班已完成；点击下方“进入下一班”。' : '三班全部完成；可从页首返回大厅或重玩已解锁班次。',
    lost: '本班未达标；可重试本班。',
  }[game.phase];
  $('floor-patients').innerHTML = pending.length ? pending.map(p => `<span>${esc(p.name)} · ${p.status === 'decision' ? '待安排' : p.status === 'waiting' ? '接待台' : `第 ${p.plot + 1} 间`}</span>`).join('') : `<span>${emptyQueue}</span>`;
  $('patients').innerHTML = pending.map(p => {
    let detail = p.status === 'waiting' ? '接待台登记中；下一分钟会显示线索。' :
      p.status === 'decision' ? `${esc(p.clue)}${p.known ? `；已确认：${esc(ROOM[p.hint].name)}` : '；可先读谱，也可直接选择处理室。'}` :
        `前往第 ${p.plot + 1} 间${esc(ROOM[game.rooms[p.plot]]?.name || '房间')}，${p.status === 'walking' ? `还需 ${p.remaining} 分钟` : '已到达，等待护理员/读谱'}。`;
    const buttons = p.status === 'decision' && active ? `<div class="patient-actions">${['tune', 'steady', 'scan'].map(kind => `<button data-patient="${p.id}" data-choice="${kind}" ${!game.rooms.includes(kind) || kind === 'scan' && p.known ? 'disabled' : ''}>${esc(ROOM[kind].name)}</button>`).join('')}</div>` : '';
    return `<article class="patient"><h3>${esc(p.name)} · ${p.status === 'decision' ? '请选择去向' : p.status === 'waiting' ? '候诊' : '行走/等待'}</h3><p>${detail}</p><p class="deadline">还可等待 ${Math.max(0, p.deadline - game.minute)} 分钟；期限到将离开。</p>${buttons}</article>`;
  }).join('') || '<p>当前没有等待安排的人。</p>';
  $('history').innerHTML = game.patients.filter(p => ['done', 'left'].includes(p.status)).map(p => `<p>${esc(p.name)} · ${p.status === 'done' ? '处理完成 +5 灯票' : '等待超期离开'}</p>`).join('') || '<p>尚无结案记录。</p>';
}

$('start').addEventListener('click', () => commit(start(game)));
$('next').addEventListener('click', () => commit(nextStage(game)));
$('stage-tabs').addEventListener('click', event => { const b = event.target.closest('[data-stage]'); if (b) commit(selectStage(game, Number(b.dataset.stage))); });
document.querySelectorAll('[data-build]').forEach(b => b.addEventListener('click', () => { selected = b.dataset.build; render(); }));
$('plots').addEventListener('click', event => {
  const removed = event.target.closest('[data-sell]'); if (removed) { commit(sell(game, Number(removed.dataset.sell))); return; }
  const b = event.target.closest('[data-plot]'); if (!b) return;
  const plot = Number(b.dataset.plot); commit(game.rooms[plot] ? assign(game, plot) : build(game, selected, plot));
});
$('hire').addEventListener('click', () => commit(hire(game)));
$('patients').addEventListener('click', event => { const b = event.target.closest('[data-patient]'); if (b) commit(route(game, Number(b.dataset.patient), b.dataset.choice)); });
function advance(event = null) {
  if (game.phase !== 'active') return;
  const now = performance.now();
  if (event?.detail && (event.detail > 1 || event.currentTarget === lastAdvanceClick.button && now - lastAdvanceClick.at < 220)) return;
  const changed = tick(game);
  if (changed && event?.detail) lastAdvanceClick = { at: now, button: event.currentTarget };
  commit(changed);
}
$('advance').addEventListener('click', advance);
$('pause').addEventListener('click', () => commit(pause(game)));
$('resume').addEventListener('click', () => commit(resume(game)));
$('retry').addEventListener('click', () => $('confirm').showModal());
$('cancel-retry').addEventListener('click', () => $('confirm').close());
$('confirm-retry').addEventListener('click', () => { $('confirm').close(); commit(restart(game)); });
document.addEventListener('keydown', event => {
  if ($('confirm').open || event.repeat) return;
  if (event.code === 'KeyP') { event.preventDefault(); commit(game.phase === 'paused' ? resume(game) : pause(game)); }
  if (event.code === 'KeyN' && game.phase === 'active' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) { event.preventDefault(); advance(); }
});
window.addEventListener('blur', () => { if (pause(game)) commit(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && pause(game)) commit(true); });
render();
