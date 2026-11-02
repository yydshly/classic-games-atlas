import { SAVE_KEY, REASONS, SHIFTS, createGame, availableCases, currentCase, selectCase, start, chooseEvidence, inspect, decide,
  pause, resume, restart, selectShift, nextShift, checkpoint, restore } from './engine.mjs?v=fog-harbor-v2-five-queue-1';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let game;
try { game = restore(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { game = null; }
if (!game) game = createGame();
let storageFailure = false, lastVerdict = { at: 0, button: null };
const evidenceOrder = ['none', 'expiry', 'route', 'seal', 'cargo', 'weight'];
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(checkpoint(game))); } catch { storageFailure = true; } }
function commit(changed) { if (changed) save(); render(); }
function rulesFor(shift) {
  return [
    `航证有效期必须 ≥ 当班第 ${shift.day} 日。`,
    '北礁全班禁航；青湾、雾门开放。',
    shift.closeAt === null ? '东汐本班不使用。' : `东汐从第 ${shift.closeAt} 分钟起关闭；按判定前显示的当前分钟计算。`,
    '船单封签号必须与港务底册一致。',
    shift.day < 2 ? '本班不核特货蓝签。' : '运载“光石”必须有蓝签。',
    shift.day < 3 ? '本班不核载重。' : '船单载重不能超过港务底册上限。',
    shift.day < 4 ? '本班没有临时泊位时限。' : '标有临时泊位时限的船，当前分钟达到该数字即关闭该船航路。',
  ];
}
function documentRow(label, value) { return `<div class="field"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`; }
function renderDocuments(entry) {
  if (!entry) {
    $('documents').innerHTML = `<div class="waiting">${game.phase === 'won' ? '本班船单已全部核完；查看下方结果。' : game.phase === 'lost' ? '本班已停案；可重试当前班。' : game.phase === 'ready' ? '当班规则已摆好。点击“开始核单”。' : '先从当前两份船单选一份摆上桌。'}</div>`;
    return;
  }
  const visibleSeal = game.revealed ? entry.actualSeal : entry.shownSeal;
  $('documents').innerHTML = `<article class="paper manifest"><div class="paper-head"><span>航务船单</span><b>${esc(entry.name)}</b></div>
    ${documentRow('航路', entry.route)}${documentRow('货类', entry.cargo)}${documentRow('航证有效至', `第 ${entry.until} 日`)}
    ${documentRow('封签号', visibleSeal)}${documentRow('特货蓝签', entry.blue ? '持有' : '无')}${documentRow('载重', `${entry.weight} 箱`)}${documentRow('港务优先分', entry.priority)}${documentRow('临时泊位', entry.berthUntil === null ? '无限制' : `第 ${entry.berthUntil} 分钟起关闭`)}</article>
    <article class="paper register"><div class="paper-head"><span>港务登记底册</span><b>${esc(entry.name)}</b></div>
    ${documentRow('登记封签', entry.registeredSeal)}${documentRow('最大载重', `${entry.capacity} 箱`)}
    <p>封签污损时，复核才显示船单真号。</p></article>`;
}
function render() {
  const shift = SHIFTS[game.stage], entry = game.phase === 'ready' ? null : currentCase(game), active = game.phase === 'active';
  $('shift-title').textContent = `第 ${game.stage + 1} 班 · ${shift.name}`;
  $('shift-brief').textContent = shift.brief;
  $('goal').textContent = `目标：核完 ${shift.cases.length} 艘，在 ${shift.limit} 分钟内至少判对 ${shift.quota} 艘，误判不超过 ${shift.maxErrors} 艘。`;
  $('minute').textContent = `${game.minute}/${shift.limit}`; $('case-count').textContent = `${game.cursor}/${shift.cases.length}`;
  $('correct').textContent = `${game.correct}/${shift.quota}`; $('errors').textContent = `${game.errors}/${shift.maxErrors}`;
  $('resources').textContent = `快检余 ${game.scans} 次 · 已放行 ${game.released} 艘 · 港务优先分 ${game.delivered} · 索拓本 ${game.copies} 次`;
  $('rules').innerHTML = rulesFor(shift).map(text => `<li>${esc(text)}</li>`).join('');
  $('route-state').textContent = shift.closeAt === null ? '北礁禁航 · 其余当班航路依规则板。' :
    `东汐现在${game.minute < shift.closeAt ? `开放，距关闭还有 ${shift.closeAt - game.minute} 分钟` : '关闭'}。当前分钟：${game.minute}。`;
  $('phase').textContent = ({ ready: '布置规则', active: '正在核单', paused: '已暂停', won: '本班完成', lost: '本班未达标' })[game.phase];
  $('case-title').textContent = entry ? `船单 ${game.selectedIndex + 1} · ${entry.name}` : game.phase === 'won' ? '本班核毕' : game.phase === 'lost' ? '本班停案' : game.phase === 'ready' ? '等待开班' : '请选择当前船单';
  $('case-intro').textContent = entry ? game.revealed ? '封签已经复核；再选证据并判定。' : entry.shownSeal === '墨渍遮号' ? '封签污损。可花时间快检或索拓本，也可承担误判风险直接决定。' : '从船单、底册和当班规则找出一致或冲突之处。' :
    game.phase === 'won' ? game.stage < SHIFTS.length - 1 ? '已完成本班；可进入下一班或重玩已解锁班次。' : '五班全部完成；可重玩已解锁班次或返回游戏大厅。' : game.phase === 'lost' ? '本班判定未达标；重试不会抹去之前的成绩。' : game.phase === 'ready' ? '先阅读规则，再开始。' : '先从两份候查船单中选一份。污损封签一经查验，本船须先判定才可换船。';
  $('case-pick').innerHTML = ['active', 'paused'].includes(game.phase) ? availableCases(game).map(({ entry: waiting, index }, order) =>
    `<button data-case="${index}" class="${index === game.selectedIndex ? 'selected' : ''}" ${!active || game.revealed || index === game.selectedIndex ? 'disabled' : ''} aria-label="候查 ${order + 1}：${esc(waiting.name)}，${esc(waiting.route)}，优先分 ${waiting.priority}${waiting.berthUntil === null ? '' : `，第 ${waiting.berthUntil} 分钟起泊位关闭`}">${order + 1} · ${esc(waiting.name)} · ${esc(waiting.route)} · 优先分 ${waiting.priority}${waiting.berthUntil === null ? '' : ` · 第 ${waiting.berthUntil} 分钟关泊`}</button>`).join('') : '';
  renderDocuments(entry);
  $('start').hidden = game.phase !== 'ready'; $('next').hidden = !(game.phase === 'won' && game.stage < SHIFTS.length - 1);
  $('pause').hidden = game.phase === 'paused'; $('pause').disabled = !active;
  $('resume').hidden = game.phase !== 'paused';
  $('retry').disabled = game.phase === 'ready' && game.minute === 0;
  $('stage-tabs').innerHTML = SHIFTS.map((s, i) => `<button data-stage="${i}" class="${i === game.stage ? 'selected' : ''}" ${i > game.unlocked || !['ready', 'won', 'lost'].includes(game.phase) ? 'disabled' : ''} aria-label="第 ${i + 1} 班 ${esc(s.name)}${i > game.unlocked ? '，尚未解锁' : ''}">${i + 1} · ${esc(s.name)}</button>`).join('');
  $('inspect').disabled = !active || !entry || game.revealed || entry.shownSeal !== '墨渍遮号' || game.scans < 1 || game.minute + 1 >= shift.limit;
  $('copy').disabled = !active || !entry || game.revealed || entry.shownSeal !== '墨渍遮号' || game.minute + 2 >= shift.limit;
  $('reasons').innerHTML = evidenceOrder.map((id, i) => `<button data-reason="${id}" aria-pressed="${game.evidence === id}" class="${game.evidence === id ? 'selected' : ''}" ${!active || !entry || id === 'cargo' && shift.day < 2 || id === 'weight' && shift.day < 3 ? 'disabled' : ''}><small>${i + 1}</small>${esc(REASONS[id])}</button>`).join('');
  $('evidence-status').textContent = game.evidence === null ? '本船尚未选择证据；选定后才能签发。' : `本船已选：${REASONS[game.evidence]}。`;
  $('release').disabled = !active || !entry || game.evidence !== 'none'; $('hold').disabled = !active || !entry || game.evidence === null || game.evidence === 'none';
  $('status').textContent = game.message + (storageFailure ? ' 本机存储不可用；刷新后可能无法续档。' : '');
  $('history').innerHTML = game.log.map(row => `<p><strong>${esc(row.name)}</strong> · ${row.verdict === 'release' ? '放行' : `暂扣：${esc(REASONS[row.reason])}`} · ${row.right ? '正确' : `误判（实际：${row.actual.length ? row.actual.map(x => REASONS[x]).join('、') : '可放行'}）`} · 第 ${row.at} 分钟</p>`).join('') || '<p>尚无已核船单。</p>';
}

$('start').addEventListener('click', () => commit(start(game)));
$('case-pick').addEventListener('click', event => { const button = event.target.closest('[data-case]'); if (button) commit(selectCase(game, Number(button.dataset.case))); });
$('next').addEventListener('click', () => commit(nextShift(game)));
$('stage-tabs').addEventListener('click', event => { const button = event.target.closest('[data-stage]'); if (button) commit(selectShift(game, Number(button.dataset.stage))); });
$('reasons').addEventListener('click', event => { const button = event.target.closest('[data-reason]'); if (button && !button.disabled) commit(chooseEvidence(game, button.dataset.reason)); });
$('inspect').addEventListener('click', () => commit(inspect(game, 'scan')));
$('copy').addEventListener('click', () => commit(inspect(game, 'copy')));
function verdict(event, kind) {
  if (game.phase !== 'active') return;
  const now = performance.now();
  if (event?.detail && (event.detail > 1 || event.currentTarget === lastVerdict.button && now - lastVerdict.at < 250)) return;
  const changed = decide(game, kind, game.evidence);
  if (changed && event?.detail) lastVerdict = { at: now, button: event.currentTarget };
  commit(changed);
}
$('release').addEventListener('click', event => verdict(event, 'release'));
$('hold').addEventListener('click', event => verdict(event, 'hold'));
$('pause').addEventListener('click', () => commit(pause(game)));
$('resume').addEventListener('click', () => commit(resume(game)));
$('retry').addEventListener('click', () => $('confirm').showModal());
$('cancel-retry').addEventListener('click', () => $('confirm').close());
$('confirm-retry').addEventListener('click', () => { $('confirm').close(); commit(restart(game)); });
document.addEventListener('keydown', event => {
  if ($('confirm').open || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === 'KeyP') { event.preventDefault(); commit(game.phase === 'paused' ? resume(game) : pause(game)); return; }
  if (game.phase !== 'active') return;
  const queueKey = /^Digit([78])$/.exec(event.code);
  if (queueKey) { const item = availableCases(game)[Number(queueKey[1]) - 7]; if (item) { event.preventDefault(); commit(selectCase(game, item.index)); } return; }
  const number = /^Digit([1-6])$/.exec(event.code);
  if (number) { const id = evidenceOrder[Number(number[1]) - 1], button = document.querySelector(`[data-reason="${id}"]`); if (!button.disabled) { event.preventDefault(); commit(chooseEvidence(game, id)); } return; }
  const keys = { KeyI: () => inspect(game, 'scan'), KeyC: () => inspect(game, 'copy') };
  if (keys[event.code]) { event.preventDefault(); commit(keys[event.code]()); return; }
  if (event.code === 'KeyR' || event.code === 'KeyH') { event.preventDefault(); verdict(null, event.code === 'KeyR' ? 'release' : 'hold'); }
});
window.addEventListener('blur', () => { if (pause(game)) commit(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && pause(game)) commit(true); });
render();
