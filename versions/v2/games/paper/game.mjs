import { Game, DT, LEVELS, ORIGIN } from './engine.mjs?v=paper-q2';
import { draw, SCALE, GROUND } from './renderer.mjs?v=paper-q2';
import { aimFromPointer, poseFor, releasePose, RELEASE_SECONDS, clamp } from './sling.mjs?v=paper-q2';
import { WorkshopAudio } from './audio.mjs?v=paper-q2';
import { loadProgress, recordWin, PROGRESS_KEY, AUDIO_KEY } from './progress.mjs?v=paper-q2';

const $ = id => document.getElementById(id);
const canvas = $('field'), ctx = canvas.getContext('2d');
const anchor = { x: ORIGIN.x * SCALE, y: GROUND - ORIGIN.y * SCALE };
const loaded = loadProgress(globalThis.localStorage, LEVELS.length);
let save = loaded.current, legacy = loaded.legacy, storageOK = loaded.available;
const sound = new WorkshopAudio(loaded.sound);
let g = new Game(), angle = 18, power = 45;
let drag = null, release = null, last = 0, accumulator = 0;
let oldState = '', selectKey = '', resultSaved = false, lastEvent = 0;
let follow = false, camera = { scale: SCALE, offset: 0 }, trail = [], trailTick = 0;

function cancelInput() {
  if (drag) {
    const id = drag.id; drag = null;
    try { canvas.releasePointerCapture(id); } catch { /* Already released. */ }
  }
  release = null;
}
function pause() {
  cancelInput(); g.pause(); accumulator = 0; sound.suspend(); sync();
}
function resume() { sound.unlock(); g.resume(); accumulator = 0; sync(); canvas.focus(); }
function reset(level = g.level, startImmediately = true) {
  cancelInput();
  g = new Game(level); accumulator = 0; oldState = ''; lastEvent = 0; resultSaved = false;
  follow = false; camera = { scale: SCALE, offset: 0 }; trail = []; trailTick = 0;
  if (startImmediately) { g.start(); sound.unlock(); }
  sync(); canvas.focus();
}
function requestLaunch() {
  if (g.state !== 'aim' || release || $('help-dialog').open) return false;
  sound.unlock();
  if (drag) { const id = drag.id; drag = null; try { canvas.releasePointerCapture(id); } catch {} }
  release = { angle, power, start: poseFor(angle, power, anchor), elapsed: 0 };
  accumulator = 0; sync(); return true;
}
function togglePause() { if (g.state === 'paused') resume(); else pause(); }
function updateInputs() {
  angle = clamp(Number($('angle').value), 12, 75);
  power = clamp(Number($('power').value), 15, 100);
  $('angle-out').value = angle + '°'; $('power-out').value = power + '%';
}
function persistResult() {
  if (resultSaved) return;
  resultSaved = true;
  recordWin(save, g.level, g.shots, g.elapsed, LEVELS.length);
  try { globalThis.localStorage.setItem(PROGRESS_KEY, JSON.stringify(save)); } catch { storageOK = false; }
}
const names = { ready: '准备', aim: '拉住纸团瞄准', flight: '观察连锁', paused: '暂停',
  won: '完成', lost: '纸团用完', timeout: '观察超时' };
function sync() {
  if (g.state === 'won') persistResult();
  $('ammo').textContent = '● '.repeat(3 - g.shots) + '○ '.repeat(g.shots);
  $('targets').textContent = g.items.filter(e => e.kind === 'target' && e.down).length + ' / ' +
    g.items.filter(e => e.kind === 'target').length;
  $('phase').textContent = release ? '松手回弹' : names[g.state];
  $('launch').disabled = g.state !== 'aim' || !!release;
  $('pause').disabled = !['aim', 'flight', 'paused'].includes(g.state);
  $('pause').textContent = g.state === 'paused' ? '继续 P' : '暂停 P';
  $('angle').disabled = $('power').disabled = !['aim', 'ready'].includes(g.state) || !!release;
  $('sound').textContent = sound.enabled ? '音效 开' : '音效 关';
  $('sound').setAttribute('aria-pressed', String(sound.enabled));
  $('hint').textContent = LEVELS[g.level].hint;
  const overlay = $('overlay'); overlay.hidden = !['ready', 'paused'].includes(g.state);
  overlay.dataset.phase = g.state;
  $('result-summary').hidden = !['won', 'lost', 'timeout'].includes(g.state);
  if (g.state !== oldState) {
    oldState = g.state;
    if (g.state === 'ready') {
      $('title').textContent = g.level ? '越过挡墙，看上层' : '拉住纸团，拆掉支撑';
      $('copy').textContent = LEVELS[g.level].hint + ' 三发之内让所有木偶倒下。';
      $('primary').textContent = '进入工坊';
    } else if (g.state === 'paused') {
      $('title').textContent = '物理与声音已暂停';
      $('copy').textContent = '旧拖拽与未释放的发射已取消，不消耗纸团。继续后重新瞄准。';
      $('primary').textContent = '继续挑战';
    } else if (['won', 'lost', 'timeout'].includes(g.state)) {
      $('result-title').textContent = g.state === 'won' ? '连锁完成' : g.state === 'lost' ? '再换一个打点' : '结构仍在运动';
      $('result-copy').textContent = g.state === 'won' ? `${g.shots} 发 · ${g.elapsed.toFixed(1)} 秒。倒塌结果留在眼前。` :
        g.state === 'lost' ? '三发已停稳，还有木偶站立。保留角度和力度，直接再试。' : '本发观察超过 60 秒，未登记胜负。可以直接重试。';
      $('result-next').hidden = g.state !== 'won' || g.level + 1 >= LEVELS.length;
      sound.play(g.state === 'won' ? 'won' : 'lost');
    }
  }
  $('status').textContent = release ? '皮兜回弹，纸团马上离弦。' : g.state === 'flight' ?
    (g.shotAge > 10 ? '结构仍在真实运动；最后一发也会等停稳。' : '听材质、看支撑。纸团与结构还在运动。') :
    g.state === 'aim' ? `第 ${g.shots + 1} 发：拉距决定力度，松手发射；R 直接重试。` :
    g.state === 'ready' ? '同一角度与力度，拖拽、滑杆和键盘使用相同弹道。' : names[g.state];
  const best = save.best[g.level], prior = legacy.best[g.level];
  $('best').textContent = best ? `本轮最好：${best.shots} 发 / ${best.seconds.toFixed(1)} 秒` : '本轮最好：尚未完成';
  $('legacy-best').textContent = prior ? `旧规则纪录：${prior.shots} 发 / ${prior.seconds.toFixed(1)} 秒，已保留，不参与本轮比较。` : '旧版解锁会保留；本轮成绩单独记录。';
  $('compact-best').textContent = $('best').textContent;
  $('compact-legacy').textContent = $('legacy-best').textContent;
  $('save-note').textContent = storageOK ? '只保存解锁和最好。刷新回准备态，不续接中途物理。' : '本机存储不可用，本次仍可游玩。';
  const key = `${g.level}:${save.unlocked}`;
  if (key !== selectKey) {
    selectKey = key;
    $('level-select').innerHTML = LEVELS.map((level, i) => `<option value="${i}" ${i > save.unlocked ? 'disabled' : ''} ${i === g.level ? 'selected' : ''}>0${i + 1} ${level.name}${i > save.unlocked ? ' · 待解锁' : ''}</option>`).join('');
  }
}

$('primary').onclick = () => { sound.unlock(); if (g.state === 'ready') g.start(); else if (g.state === 'paused') g.resume(); sync(); canvas.focus(); };
$('pause').onclick = togglePause;
$('launch').onclick = requestLaunch;
$('restart').onclick = () => reset();
$('result-retry').onclick = () => reset();
$('result-next').onclick = () => { if (g.state === 'won' && g.level + 1 < LEVELS.length) reset(g.level + 1); };
$('level-select').onchange = event => { const level = Number(event.target.value); if (Number.isInteger(level) && level >= 0 && level <= save.unlocked && level < LEVELS.length) reset(level); };
$('sound').onclick = () => { sound.setEnabled(!sound.enabled, g.state !== 'paused' && !$('help-dialog').open); try { globalThis.localStorage.setItem(AUDIO_KEY, sound.enabled ? 'on' : 'off'); } catch {} sync(); };
for (const id of ['angle', 'power']) $(id).addEventListener('input', updateInputs);

function point(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width * 960,
    y: (event.clientY - rect.top) / rect.height * 480,
    inside: event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom };
}
function updateDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  const p = point(event), aim = aimFromPointer(p, anchor);
  drag.point = p; drag.valid = aim.valid;
  if (aim.valid) {
    angle = aim.angle; power = aim.power;
    $('angle').value = angle; $('power').value = power; updateInputs();
  }
}
canvas.addEventListener('pointerdown', event => {
  if (g.state !== 'aim' || release || drag) return;
  const p = point(event), current = poseFor(angle, power, anchor);
  if (Math.min(Math.hypot(p.x - anchor.x, p.y - anchor.y), Math.hypot(p.x - current.x, p.y - current.y)) > 30) return;
  event.preventDefault(); canvas.focus(); sound.unlock();
  drag = { id: event.pointerId, start: p, point: p, valid: false };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', updateDrag);
canvas.addEventListener('pointerup', event => {
  if (!drag || drag.id !== event.pointerId) return;
  updateDrag(event);
  const p = point(event), moved = Math.hypot(p.x - drag.start.x, p.y - drag.start.y) >= 8;
  const fire = p.inside && moved && drag.valid;
  if (fire) requestLaunch(); else { cancelInput(); sync(); }
});
for (const event of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { if (drag) { cancelInput(); sync(); } });
window.addEventListener('keydown', event => {
  if (event.repeat || $('help-dialog').open) return;
  const key = event.key.toLowerCase();
  if (key === 'r') { event.preventDefault(); reset(); return; }
  if (key === 'p' || key === 'escape') { event.preventDefault(); togglePause(); return; }
  if (/INPUT|SELECT|BUTTON/.test(event.target.tagName)) return;
  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); requestLaunch(); }
  else if (g.state === 'aim' && !release && event.key.startsWith('Arrow')) {
    event.preventDefault();
    if (event.key === 'ArrowLeft') angle--; if (event.key === 'ArrowRight') angle++;
    if (event.key === 'ArrowUp') power++; if (event.key === 'ArrowDown') power--;
    $('angle').value = clamp(angle, 12, 75); $('power').value = clamp(power, 15, 100); updateInputs();
  }
});
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
$('help').onclick = () => { pause(); $('help-dialog').showModal(); };
$('close-help').onclick = () => $('help-dialog').close();
$('help-dialog').addEventListener('cancel', cancelInput);

function effects() {
  for (const event of g.events) {
    if (event.serial <= lastEvent) continue;
    lastEvent = event.serial;
    if (event.type === 'impact' && event.kind === 'shot') continue;
    sound.play(event.type, event.material, event.impulse || 1);
  }
}
function frame(time) {
  const delta = Math.min(.1, (time - last) / 1000 || 0); last = time;
  if (release && g.state === 'aim') {
    release.elapsed += delta;
    if (release.elapsed >= RELEASE_SECONDS) {
      const shot = release; release = null;
      if (g.launch(shot.angle, shot.power)) {
        trail = []; trailTick = 0; sound.play('launch');
      }
    }
  }
  if (['aim', 'flight'].includes(g.state)) {
    accumulator += delta;
    while (accumulator >= DT) { g.step(); accumulator -= DT; }
    const body = g.activeShot?.body;
    if (g.state === 'flight' && body && g.tick - trailTick >= 5) {
      const p = body.getPosition(); trail.push({ x: p.x, y: p.y }); if (trail.length > 140) trail.shift(); trailTick = g.tick;
      if (p.x > 10) follow = true;
    }
    if (g.state === 'aim') { follow = false; camera.scale = SCALE; camera.offset = 0; }
    const smooth = 1 - Math.exp(-delta * 7);
    camera.scale += ((follow ? 44 : SCALE) - camera.scale) * smooth;
    camera.offset += ((follow ? -488 : 0) - camera.offset) * smooth;
  } else accumulator = 0;
  effects();
  draw(ctx, g, angle, power, { camera, trail, releasing: !!release,
    pouch: release ? releasePose(release.start, anchor, release.elapsed) : null });
  sync(); requestAnimationFrame(frame);
}
updateInputs(); sync(); requestAnimationFrame(frame);
