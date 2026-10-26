import { CAMPAIGNS, EDGES, NODES, grainCost, neighbors, node } from './world.mjs?v=border-slice-2-eight-2';
import { continueTurn, endTurn, forage, fortify, goalMet, isSupplied, march, newGame, undo, unitOf, validSave } from './engine.mjs?v=border-slice-2-eight-2';

const KEY = 'atlas.border-letters.v1';
const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const safeRead = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const record = safeRead();
let unlocked = Number.isInteger(record?.unlocked) ? Math.min(CAMPAIGNS.length - 1, Math.max(0, record.unlocked)) : 0;
let state = validSave(record?.state) ? record.state : newGame();
// The five-mission release capped a completed final mission at unlocked=4.
if (state.stage === 4 && state.phase === 'won' && state.turn === CAMPAIGNS[4].maxTurn && goalMet(state)) unlocked = Math.max(unlocked, 5);
if (state.stage > unlocked) state = newGame(unlocked);
state.settlementPending = !!state.settlementPending;
state.paused = state.phase === 'playing' && !!record?.state;
let chosenUnit = 'guard', chosenNode = 'granary';
let feedback = state.paused ? '续档已载入并暂停，点“继续”恢复。' : '';
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({ unlocked, state })); } catch { feedback = '浏览器无法写入存档；本次仍可继续。'; } };
function available(action) {
  if (action === 'continue') return state.phase === 'playing' && !state.paused && state.settlementPending;
  return state.phase === 'playing' && !state.paused && !state.settlementPending && (['end', 'undo'].includes(action) || state.orders > 0);
}
function announce(message) { feedback = message; render(); }
function apply(result) {
  if (!result.ok) return announce(result.reason);
  state = result.state; feedback = ''; persist(); render();
}
function run(action) {
  if (action === 'pause') { if (state.phase !== 'playing') return; state.paused = !state.paused; feedback = state.paused ? '战局已暂停并保存。' : '战局继续。'; persist(); render(); return; }
  if (action === 'continue') { if (state.paused) return announce('先继续战局。'); apply(continueTurn(state)); return; }
  if (!available(action)) return announce(state.paused ? '先继续战局。' : '当前不能下令。');
  if (action === 'march') apply(march(state, chosenUnit, chosenNode));
  if (action === 'forage') apply(forage(state, chosenNode));
  if (action === 'fortify') apply(fortify(state, chosenUnit));
  if (action === 'undo') apply(undo(state));
  if (action === 'end') {
    const result = endTurn(state); if (!result.ok) return announce(result.reason);
    state = result.state; feedback = state.phase === 'lost' ? '可重试本役；此前解锁记录保留。' : '';
    if (state.phase === 'won') unlocked = Math.max(unlocked, Math.min(state.stage + 1, CAMPAIGNS.length - 1));
    persist(); render();
  }
}
function startStage(index) {
  if (index > unlocked || index < 0 || index >= CAMPAIGNS.length) return;
  if (state.stage === index) return;
  if (state.phase === 'playing' && !confirm('切换战役会替换当前《边郡来信》未完成进度。继续吗？')) return;
  state = newGame(index); chosenUnit = 'guard'; chosenNode = 'granary'; feedback = ''; persist(); render();
}
function retryStage() { state = newGame(state.stage); chosenUnit = 'guard'; chosenNode = 'granary'; feedback = ''; persist(); render(); }
function render() {
  const level = CAMPAIGNS[state.stage];
  $('chapter-title').textContent = level.name; $('chapter-intro').textContent = level.intro;
  $('chapter-pick').innerHTML = CAMPAIGNS.map((_, i) => `<button type="button" data-stage="${i}" class="${i === state.stage ? 'current' : ''}" ${i > unlocked ? 'disabled' : ''} aria-label="第${i + 1}役${i > unlocked ? '，未解锁' : ''}" aria-current="${i === state.stage ? 'step' : 'false'}">${i + 1}</button>`).join('');
  $('turn-badge').textContent = state.settlementPending ? `第 ${state.turn - 1} 回合已结算 · 待继续` : `第 ${state.turn} / ${level.maxTurn} 回合 · ${state.orders} 命令`;
  $('supply-badge').textContent = `存粮 ${state.food}`;
  const lines = EDGES.map(([a,b]) => { const A = node(a), B = node(b); return `<line class="road" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" />`; }).join('');
  $('map').innerHTML = `<svg class="roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>` + NODES.map(place => {
    const occupants = state.units.filter(unit => unit.at === place.id).map(unit => unit.id === 'guard' ? '卫' : '骑').join(' ');
    const enemy = state.ownership[place.id] === 'enemy' ? `敌 ${state.garrison[place.id]}` : '';
    return `<button type="button" class="place ${state.ownership[place.id]} ${chosenNode === place.id ? 'selected' : ''}" style="left:${place.x}%;top:${place.y}%;--terrain:${place.color}" data-node="${place.id}" aria-pressed="${chosenNode === place.id}" aria-label="${place.name}，${place.terrain}，${state.ownership[place.id] === 'ally' ? '我方' : state.ownership[place.id] === 'enemy' ? '敌方' : '未控'}${occupants ? '，驻有' + occupants : ''}"><strong>${place.name}</strong><small>${place.terrain}</small>${occupants || enemy ? `<span class="marker">${occupants || enemy}</span>` : ''}</button>`;
  }).join('');
  const hold = level.goal.hold.map(at => `${node(at).name}${state.ownership[at] === 'ally' ? ' ✓' : ''}`).join('、');
  const visit = (level.goal.courierVisits || []).map(at => `${node(at).name}${state.visits.includes(at) ? ' ✓' : ''}`).join('、');
  const oldSixthWin = state.stage === 5 && state.phase === 'won' && !state.visits.includes('relay');
  $('status').innerHTML = `<b>目标：</b>期末控制 ${hold}${visit ? `；驿骑到过 ${visit}` : ''}。<br><b>回合末：</b>两队耗粮 2；断粮下回合少一命令，期限回合断粮失败。松驿失守即失败。${oldSixthWin ? '<br>旧版第六役完赛记录按当时目标保留。' : ''}${state.phase !== 'playing' ? `<br><b>${state.phase === 'won' ? '已胜利' : '已失败'}</b>` : state.settlementPending ? '<br><b>结算已保存；先查看日志，再继续部署。</b>' : state.paused ? '<br><b>已暂停</b>' : ''}`;
  $('units').innerHTML = state.units.map(unit => `<button type="button" data-unit="${unit.id}" class="${chosenUnit === unit.id ? 'active' : ''}" aria-pressed="${chosenUnit === unit.id}"><strong>${unit.name} · ${unit.role === 'guard' ? '战/守力 3' : '战/守力 1'}</strong><small>在${node(unit.at).name} · 驻防 +${unit.role === 'guard' ? 2 : 1}${unit.fort ? '（已驻防）' : ''}</small></button>`).join('');
  const unit = unitOf(state, chosenUnit), adjacent = neighbors(unit.at).includes(chosenNode);
  const terrainCost = adjacent ? grainCost(unit.role, chosenNode) : null;
  const brokenLine = adjacent && !isSupplied(state, unit.at);
  const cost = adjacent ? terrainCost + Number(brokenLine) : null;
  $('selection').textContent = `已选 ${unit.name}（${node(unit.at).name}）→ ${node(chosenNode).name}。${cost === null ? '请选择相邻地点。' : `行军预计耗粮 ${cost}（地形 ${terrainCost}${brokenLine ? ' + 断线 1' : ''}）；${state.orders} 个命令可用。`}`;
  document.querySelectorAll('[data-action]').forEach(button => {
    const action = button.dataset.action;
    button.disabled = action === 'pause' ? state.phase !== 'playing' : !available(action) || (action === 'undo' && !state.undo.length);
    if (action === 'pause') button.textContent = state.paused ? '继续战局' : '暂停并存档';
  });
  $('settlement').hidden = state.phase !== 'playing' || !state.settlementPending;
  $('settlement-turn').textContent = state.settlementPending ? `第 ${state.turn - 1} 回合已结算` : '';
  const upcoming = level.waves.filter(wave => wave.turn >= state.turn);
  $('intel').innerHTML = state.phase !== 'playing' ? '<p>本役已结束；已发生的突袭见行军日志。</p>' : upcoming.length ? upcoming.map(wave => `<p><strong>第 ${wave.turn} 回合末：</strong>${node(wave.at).name}将受敌力 ${wave.power} 突袭；该地守力总和至少为 ${wave.power} 才能守住，失守后需夺回。</p>`).join('') : '<p>目前没有后续突袭情报。仍须在期限前满足目标。</p>';
  $('history').innerHTML = state.logs.map(log => `<li>${esc(log)}</li>`).join('');
  $('feedback').textContent = feedback;
  $('result').hidden = state.phase === 'playing';
  if (state.phase !== 'playing') $('result').innerHTML = `<h3>${state.phase === 'won' ? '来信送达' : '军情未竟'}</h3><p>${state.phase === 'won' ? `第 ${state.stage + 1} 役完成。` : '检查日志和目标，可以用另一条路线或命令分配重试。'} 本役行军 ${state.metrics.marches} 次、筹粮 ${state.metrics.harvests} 次、驻防 ${state.metrics.guarded} 次，额外行军耗粮 ${state.metrics.spent}。</p><button type="button" class="danger" data-result="retry">重试本役</button>${state.phase === 'won' && state.stage + 1 < CAMPAIGNS.length ? '<button type="button" data-result="next">开始下一役</button>' : ''}<a href="../../play/">完整网页入口</a><a href="../../">返回游戏大厅</a>`;
}
document.addEventListener('click', event => {
  const target = event.target.closest('button'); if (!target) return;
  if (target.dataset.node) { chosenNode = target.dataset.node; render(); if (event.detail === 0) document.querySelector(`[data-node="${chosenNode}"]`)?.focus({ preventScroll: true }); }
  else if (target.dataset.unit) { chosenUnit = target.dataset.unit; chosenNode = unitOf(state, chosenUnit).at; render(); if (event.detail === 0) document.querySelector(`[data-unit="${chosenUnit}"]`)?.focus({ preventScroll: true }); }
  else if (target.dataset.action) run(target.dataset.action);
  else if (target.dataset.stage !== undefined) startStage(Number(target.dataset.stage));
  else if (target.dataset.result === 'retry') $('restart-dialog').showModal();
  else if (target.dataset.result === 'next') startStage(state.stage + 1);
});
$('restart-dialog').addEventListener('close', () => { if ($('restart-dialog').returnValue === 'restart') retryStage(); });
document.addEventListener('keydown', event => {
  if ($('restart-dialog').open || event.altKey || event.ctrlKey || event.metaKey || ['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
  const key = event.key.toLowerCase();
  if (event.repeat && ['1','2','m','f','g','z','e','c','escape'].includes(key)) return;
  if (key === '1' || key === '2') { chosenUnit = key === '1' ? 'guard' : 'courier'; chosenNode = unitOf(state, chosenUnit).at; render(); }
  else if (key === 'm') run('march'); else if (key === 'f') run('forage'); else if (key === 'g') run('fortify'); else if (key === 'z') run('undo'); else if (key === 'e') run('end'); else if (key === 'c') run('continue'); else if (key === 'escape') run('pause');
  else if (['arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
    const current = node(chosenNode), options = NODES.filter(place => place.id !== chosenNode);
    const axis = key === 'arrowup' || key === 'arrowdown' ? 'y' : 'x', sign = key === 'arrowup' || key === 'arrowleft' ? -1 : 1;
    const candidate = options.filter(place => (place[axis] - current[axis]) * sign > 0).sort((a,b) => Math.hypot(a.x-current.x,a.y-current.y) - Math.hypot(b.x-current.x,b.y-current.y))[0];
    if (candidate) { chosenNode = candidate.id; render(); document.querySelector(`[data-node="${chosenNode}"]`)?.focus(); event.preventDefault(); }
  }
});
window.addEventListener('blur', () => { if (state.phase === 'playing' && !state.paused) { state.paused = true; persist(); render(); } });
render();
