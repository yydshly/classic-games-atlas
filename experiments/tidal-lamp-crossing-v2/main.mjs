import { SAVE_KEY, STAGES, createGame, start, move, advance, pause, resume, retry,
  selectStage, nextStage, checkpoint, restore } from './engine.mjs?v=tidal-lamp-crossing-v2-six-1';
import { draw } from './view.mjs?v=tidal-lamp-crossing-v2-six-1';

const $ = id => document.getElementById(id);
let game;
try { game = restore(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { game = null; }
if (!game) game = createGame();
let storageFailure = false, lastFrame = 0, lastUi = 0, lastSave = 0, repeatClock = .22;
const held = new Map();
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(checkpoint(game))); } catch { storageFailure = true; } }
function update(changed) { if (changed) save(); render(); }
function clearHeld() { held.clear(); repeatClock = .22; }
function render() {
  const stage = STAGES[game.stage], active = game.phase === 'active';
  document.body.classList.toggle('in-route', active || game.phase === 'paused');
  document.body.classList.toggle('after-route', game.phase === 'won' || game.phase === 'lost');
  $('stage-title').textContent = `第 ${game.stage + 1} 关 · ${stage.name}`;
  $('stage-brief').textContent = stage.brief;
  $('stage-goal').textContent = `目标：${Math.round(stage.limit)} 秒内把灯送到北岸中央；被撞、落水或超时则重试本关。`;
  $('time').textContent = Math.max(0, stage.limit - game.elapsed).toFixed(1);
  $('hops').textContent = String(game.hops);
  $('position').textContent = `${Math.max(1, Math.min(9, Math.ceil(game.player.x)))}/9`;
  $('phase').textContent = ({ ready: '等待出发', active: '正在过桥', paused: '已暂停', won: '本关完成', lost: '本关未完成' })[game.phase];
  $('status').textContent = game.message + (storageFailure ? ' 本机存储不可用，刷新可能无法续档。' : '');
  $('record').textContent = game.records[game.stage] ? `本关最佳：${game.records[game.stage].seconds.toFixed(1)} 秒 · ${game.records[game.stage].hops} 步` : '本关尚无送达记录。';
  $('start').hidden = game.phase !== 'ready';
  $('next').hidden = !(game.phase === 'won' && game.stage < STAGES.length - 1);
  $('pause').hidden = game.phase === 'paused'; $('pause').disabled = !active;
  $('resume').hidden = game.phase !== 'paused';
  $('retry').disabled = game.phase === 'ready' && game.elapsed === 0;
  $('stage-tabs').innerHTML = STAGES.map((s, i) => `<button data-stage="${i}" class="${i === game.stage ? 'selected' : ''}" ${i > game.unlocked || !['ready', 'won', 'lost'].includes(game.phase) ? 'disabled' : ''} aria-label="第 ${i + 1} 关 ${s.name}${i > game.unlocked ? '，尚未解锁' : ''}" title="第 ${i + 1} 关 ${s.name}">${i + 1}</button>`).join('');
  for (const button of $('dpad').querySelectorAll('button')) button.disabled = !active;
  draw($('board'), game);
}
function hop(dir) {
  const before = game.message, changed = move(game, dir);
  if (changed || game.message !== before) save();
  if (game.phase !== 'active') clearHeld();
  render();
}
function begin(source, dir) {
  if (game.phase !== 'active' || held.has(source)) return;
  held.set(source, dir); hop(dir); repeatClock = .22;
}
function end(source) { held.delete(source); repeatClock = .22; }
const dirKeys = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
document.addEventListener('keydown', event => {
  if ($('confirm').open || event.altKey || event.ctrlKey || event.metaKey) return;
  if (dirKeys[event.code]) { event.preventDefault(); if (!event.repeat) begin(`key:${event.code}`, dirKeys[event.code]); return; }
  if (event.repeat) return;
  if (event.code === 'KeyP') { event.preventDefault(); clearHeld(); update(game.phase === 'paused' ? resume(game) : pause(game)); }
  if (event.code === 'KeyR') { event.preventDefault(); if (!$('retry').disabled) $('retry').click(); }
});
document.addEventListener('keyup', event => { if (dirKeys[event.code]) end(`key:${event.code}`); });
for (const button of $('dpad').querySelectorAll('button')) {
  button.addEventListener('pointerdown', event => { event.preventDefault(); if (button.disabled) return; button.setPointerCapture(event.pointerId); begin(`pointer:${event.pointerId}`, button.dataset.dir); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => end(`pointer:${event.pointerId}`));
}
$('start').addEventListener('click', () => update(start(game)));
$('next').addEventListener('click', () => { clearHeld(); update(nextStage(game)); });
$('stage-tabs').addEventListener('click', event => { const button = event.target.closest('[data-stage]'); if (button) { clearHeld(); update(selectStage(game, Number(button.dataset.stage))); } });
$('pause').addEventListener('click', () => { clearHeld(); update(pause(game)); });
$('resume').addEventListener('click', () => update(resume(game)));
$('retry').addEventListener('click', () => { if (!$('confirm').open) { clearHeld(); $('confirm').showModal(); } });
$('cancel-retry').addEventListener('click', () => $('confirm').close());
$('confirm-retry').addEventListener('click', () => { $('confirm').close(); clearHeld(); update(retry(game)); });
$('confirm').addEventListener('cancel', () => clearHeld());
window.addEventListener('blur', () => { clearHeld(); update(pause(game)); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearHeld(); update(pause(game)); } });
function frame(stamp) {
  const dt = lastFrame ? Math.min(.05, Math.max(0, (stamp - lastFrame) / 1000)) : 0;
  lastFrame = stamp;
  if (game.phase === 'active' && !$('confirm').open) {
    const priorPhase = game.phase;
    advance(game, dt);
    if (game.phase !== priorPhase) { clearHeld(); save(); render(); }
    if (game.phase === 'active' && held.size) {
      repeatClock -= dt;
      if (repeatClock <= 0) { hop([...held.values()].at(-1)); repeatClock = .17; }
    }
    if (game.phase === 'active' && stamp - lastSave > 450) { save(); lastSave = stamp; }
  }
  if (stamp - lastUi > 110) {
    $('time').textContent = Math.max(0, STAGES[game.stage].limit - game.elapsed).toFixed(1);
    $('position').textContent = `${Math.max(1, Math.min(9, Math.ceil(game.player.x)))}/9`;
    lastUi = stamp;
  }
  draw($('board'), game);
  requestAnimationFrame(frame);
}
render(); requestAnimationFrame(frame);
