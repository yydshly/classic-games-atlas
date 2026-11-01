// 灯下候诊：原创虚构病症的确定性排队经营规则。无现实医疗建议。
export const SAVE_KEY = 'classic-games-atlas:lantern-clinic:v1';
export const ROOM = {
  tune: { name: '调频室', cost: 6, mark: '✦', note: '处理失拍光' },
  steady: { name: '稳光室', cost: 6, mark: '◈', note: '处理漂影' },
  scan: { name: '读谱室', cost: 5, mark: '◎', note: '辨清模糊线索' },
};
export const SHIFTS = [
  { name: '暮港首诊', theme: '两种明确线索', cash: 16, limit: 12, quota: 3, maxMissed: 1,
    brief: '先把两种处理室放在合适位置；一名护理员每分钟只能照看一室。',
    arrivals: [
      { at: 1, kind: 'tune', clue: '光线断续 · 倾向失拍光', hint: 'tune', patience: 8 },
      { at: 2, kind: 'steady', clue: '影子漂移 · 倾向漂影', hint: 'steady', patience: 8 },
      { at: 4, kind: 'tune', clue: '灯芯急闪 · 倾向失拍光', hint: 'tune', patience: 8 },
      { at: 5, kind: 'steady', clue: '影边散开 · 倾向漂影', hint: 'steady', patience: 8 },
    ] },
  { name: '雨棚拥诊', theme: '读谱与增员', cash: 20, limit: 12, quota: 5, maxMissed: 1,
    brief: '两张病历线索模糊；先花预算建读谱室求确定，或增员疏散两室队列。',
    arrivals: [
      { at: 1, kind: 'tune', clue: '光线断续 · 倾向失拍光', hint: 'tune', patience: 9 },
      { at: 2, kind: 'steady', clue: '影子漂移 · 倾向漂影', hint: 'steady', patience: 9 },
      { at: 3, kind: 'steady', clue: '雨雾遮住光谱 · 类型未明', hint: null, patience: 10 },
      { at: 5, kind: 'tune', clue: '灯芯急闪 · 倾向失拍光', hint: 'tune', patience: 9 },
      { at: 6, kind: 'steady', clue: '影边散开 · 倾向漂影', hint: 'steady', patience: 9 },
      { at: 7, kind: 'tune', clue: '雨雾遮住光谱 · 类型未明', hint: null, patience: 10 },
    ] },
  { name: '双翼夜班', theme: '两翼高峰与远房', cash: 22, limit: 13, quota: 6, maxMissed: 1,
    brief: '来者更密、远房步程更长。调配护理员、近房与读谱时间，保住两翼。',
    arrivals: [
      { at: 1, kind: 'steady', clue: '影边散开 · 倾向漂影', hint: 'steady', patience: 10 },
      { at: 2, kind: 'tune', clue: '夜雾遮住光谱 · 类型未明', hint: null, patience: 10 },
      { at: 3, kind: 'steady', clue: '影子漂移 · 倾向漂影', hint: 'steady', patience: 10 },
      { at: 4, kind: 'tune', clue: '光线断续 · 倾向失拍光', hint: 'tune', patience: 10 },
      { at: 6, kind: 'steady', clue: '夜雾遮住光谱 · 类型未明', hint: null, patience: 11 },
      { at: 7, kind: 'tune', clue: '灯芯急闪 · 倾向失拍光', hint: 'tune', patience: 10 },
      { at: 8, kind: 'steady', clue: '影边散开 · 倾向漂影', hint: 'steady', patience: 10 },
    ] },
];

const copy = value => JSON.parse(JSON.stringify(value));
const isInt = (v, lo, hi = Infinity) => Number.isInteger(v) && v >= lo && v <= hi;
function shiftState(stage, unlocked = stage, records = [null, null, null]) {
  return { version: 1, stage, unlocked, records: copy(records), phase: 'ready', resumePhase: null,
    minute: 0, cash: SHIFTS[stage].cash, nurses: 1, staffed: [false, false, false, false],
    rooms: [null, null, null, null], patients: [], nextId: 1, served: 0, missed: 0, errors: 0,
    message: '布置诊室，再开始接诊。空房可点选建造；房间可随时调整。' };
}
export function createGame() { return shiftState(0, 0); }
export function start(s) { if (s.phase !== 'ready') return false; s.phase = 'active'; s.message = '接诊开始。看清线索、剩余等待时间与护理员位置，再推进一分钟。'; return true; }
export function build(s, kind, plot) {
  if (!['ready', 'active'].includes(s.phase) || !ROOM[kind] || !isInt(plot, 0, 3) || s.rooms[plot]) return false;
  if (kind === 'scan' && s.rooms.includes('scan')) { s.message = '读谱室已有一间；把预算留给处理室或增员。'; return false; }
  if (s.cash < ROOM[kind].cost) { s.message = `建造${ROOM[kind].name}需 ${ROOM[kind].cost} 灯票，当前不足。`; return false; }
  s.cash -= ROOM[kind].cost; s.rooms[plot] = kind;
  if (kind !== 'scan' && s.staffed.filter(Boolean).length < s.nurses) s.staffed[plot] = true;
  s.message = `第 ${plot + 1} 间建成${ROOM[kind].name}；从入口走到这里需 ${plot + 1} 分钟。`;
  return true;
}
export function sell(s, plot) {
  if (!['ready', 'active'].includes(s.phase) || !isInt(plot, 0, 3) || !s.rooms[plot]) return false;
  const kind = s.rooms[plot], refund = s.minute === 0 ? ROOM[kind].cost : Math.floor(ROOM[kind].cost / 2);
  s.rooms[plot] = null; s.staffed[plot] = false; s.cash += refund;
  for (const p of s.patients) if (p.plot === plot && ['walking', 'queued'].includes(p.status)) {
    p.status = 'decision'; p.plot = null; p.remaining = 0;
  }
  const next = s.rooms.findIndex((r, i) => r && r !== 'scan' && !s.staffed[i]);
  if (next >= 0 && s.staffed.filter(Boolean).length < s.nurses) s.staffed[next] = true;
  s.message = `房间已拆，退回 ${refund} 灯票；路上的来者已返回安排队列。`;
  return true;
}
export function assign(s, plot) {
  if (!['ready', 'active'].includes(s.phase) || !isInt(plot, 0, 3) || !s.rooms[plot] || s.rooms[plot] === 'scan') return false;
  if (s.staffed[plot]) { s.message = '护理员已在这间处理室。'; return false; }
  if (s.staffed.filter(Boolean).length >= s.nurses) {
    const other = s.staffed.findIndex(Boolean); s.staffed[other] = false;
  }
  s.staffed[plot] = true; s.message = `护理员改驻第 ${plot + 1} 间${ROOM[s.rooms[plot]].name}。下一分钟生效。`;
  return true;
}
export function hire(s) {
  if (!['ready', 'active'].includes(s.phase) || s.nurses >= 2) return false;
  if (s.cash < 8) { s.message = '增聘第二名护理员需 8 灯票。'; return false; }
  s.cash -= 8; s.nurses++;
  const next = s.rooms.findIndex((r, i) => r && r !== 'scan' && !s.staffed[i]);
  if (next >= 0) s.staffed[next] = true;
  s.message = '第二名护理员加入；可同时照看两间处理室。'; return true;
}
export function route(s, id, choice) {
  if (s.phase !== 'active') return false;
  const p = s.patients.find(x => x.id === id && x.status === 'decision');
  if (!p || !ROOM[choice]) return false;
  if (choice === 'scan' && p.known) { s.message = '类型已明，不必再读谱；直接安排处理室。'; return false; }
  const plot = s.rooms.findIndex(x => x === choice);
  if (plot < 0) { s.message = `尚无${ROOM[choice].name}；可建造或改安排其他房间。`; return false; }
  p.status = 'walking'; p.plot = plot; p.remaining = plot + 1;
  s.message = `${p.name}前往第 ${plot + 1} 间${ROOM[choice].name}，路程 ${p.remaining} 分钟。`;
  return true;
}
function settle(s) {
  const shift = SHIFTS[s.stage];
  const pending = s.patients.some(p => !['done', 'left'].includes(p.status));
  const allArrived = s.minute >= Math.max(...shift.arrivals.map(a => a.at));
  if (s.missed > shift.maxMissed || (allArrived && !pending) || s.minute >= shift.limit) {
    if (s.served >= shift.quota && s.missed <= shift.maxMissed) {
      s.phase = 'won'; s.unlocked = Math.max(s.unlocked, Math.min(2, s.stage + 1));
      const record = { minute: s.minute, served: s.served, missed: s.missed, errors: s.errors, cash: s.cash };
      if (!s.records[s.stage] || record.served > s.records[s.stage].served ||
        (record.served === s.records[s.stage].served && record.minute < s.records[s.stage].minute)) s.records[s.stage] = record;
      s.message = `${shift.name}完成：处理 ${s.served} 位，离开 ${s.missed} 位，误送 ${s.errors} 次，余 ${s.cash} 灯票。`;
    } else { s.phase = 'lost'; s.message = `${shift.name}未达标：处理 ${s.served}/${shift.quota} 位，离开 ${s.missed}/${shift.maxMissed} 位，误送 ${s.errors} 次。可重试本班。`; }
  }
}
export function tick(s) {
  if (s.phase !== 'active') return false;
  const shift = SHIFTS[s.stage], events = []; s.minute++;
  for (const item of shift.arrivals.filter(a => a.at === s.minute)) s.patients.push({
    id: s.nextId++, name: `来者 ${s.nextId - 1}`, kind: item.kind, clue: item.clue, hint: item.hint,
    known: !!item.hint, arrival: s.minute, deadline: s.minute + item.patience,
    status: 'waiting', plot: null, remaining: 0,
  });
  for (const p of s.patients) if (p.status === 'walking') { p.remaining--; if (p.remaining <= 0) p.status = 'queued'; }
  const scan = s.rooms.indexOf('scan');
  if (scan >= 0) {
    const p = s.patients.find(x => x.status === 'queued' && x.plot === scan);
    if (p) { p.status = 'decision'; p.known = true; p.hint = p.kind; p.plot = null; events.push(`${p.name}读谱完成，类型已明。`); }
  }
  for (let plot = 0; plot < 4; plot++) if (s.staffed[plot] && s.rooms[plot] && s.rooms[plot] !== 'scan') {
    const p = s.patients.find(x => x.status === 'queued' && x.plot === plot);
    if (!p) continue;
    if (p.kind === s.rooms[plot]) { p.status = 'done'; s.served++; s.cash += 5; events.push(`${p.name}处理完成，灯票 +5。`); }
    else { p.status = 'decision'; p.known = true; p.hint = p.kind; p.plot = null; s.errors++; s.cash = Math.max(0, s.cash - 2); events.push(`${p.name}送错房间，灯票 -2；正确类型现已公开，可重新安排。`); }
  }
  const waiting = s.patients.find(p => p.status === 'waiting');
  if (waiting) waiting.status = 'decision';
  for (const p of s.patients) if (!['done', 'left'].includes(p.status) && s.minute >= p.deadline) { p.status = 'left'; s.missed++; events.push(`${p.name}等待超期离开。`); }
  if (s.minute >= shift.limit) for (const p of s.patients) if (!['done', 'left'].includes(p.status)) { p.status = 'left'; s.missed++; }
  s.message = `第 ${s.minute} 分钟：${events.join(' ') || '队列继续前进。'}已处理 ${s.served} 位，离开 ${s.missed} 位。`;
  settle(s); return true;
}
export function pause(s) { if (s.phase !== 'active') return false; s.phase = 'paused'; s.resumePhase = 'active'; s.message = '已暂停。继续后保留排队、房间、灯票与当前分钟。'; return true; }
export function resume(s) { if (s.phase !== 'paused') return false; s.phase = s.resumePhase || 'active'; s.resumePhase = null; s.message = '已继续。本班状态保持。'; return true; }
export function restart(s) { const next = shiftState(s.stage, s.unlocked, s.records); Object.assign(s, next); return true; }
export function selectStage(s, stage) {
  if (!isInt(stage, 0, 2) || stage > s.unlocked || !['ready', 'won', 'lost'].includes(s.phase)) return false;
  Object.assign(s, shiftState(stage, s.unlocked, s.records)); return true;
}
export function nextStage(s) { if (s.phase !== 'won' || s.stage >= 2) return false; return selectStage(s, s.stage + 1); }
export function checkpoint(s) { return copy(s); }
export function restore(raw) {
  if (!raw || raw.version !== 1 || !isInt(raw.stage, 0, 2) || !isInt(raw.unlocked, raw.stage, 2) ||
      !['ready', 'active', 'paused', 'won', 'lost'].includes(raw.phase) ||
      !isInt(raw.minute, 0, SHIFTS[raw.stage].limit) || !isInt(raw.cash, 0) || !isInt(raw.nurses, 1, 2) ||
      !isInt(raw.served, 0) || !isInt(raw.missed, 0) || !isInt(raw.errors, 0) ||
      !Array.isArray(raw.rooms) || raw.rooms.length !== 4 || raw.rooms.some(r => r !== null && !ROOM[r]) ||
      !Array.isArray(raw.staffed) || raw.staffed.length !== 4 || raw.staffed.some((v, i) => typeof v !== 'boolean' || (v && (!raw.rooms[i] || raw.rooms[i] === 'scan'))) ||
      raw.staffed.filter(Boolean).length > raw.nurses || !Array.isArray(raw.patients) ||
      raw.patients.some(p => !isInt(p.id, 1) || !['waiting', 'decision', 'walking', 'queued', 'done', 'left'].includes(p.status) ||
        !ROOM[p.kind] || p.kind === 'scan' || !isInt(p.arrival, 0) || !isInt(p.deadline, p.arrival) ||
        (p.plot !== null && !isInt(p.plot, 0, 3))) || !Array.isArray(raw.records) || raw.records.length !== 3) return null;
  const s = copy(raw);
  if (s.phase === 'active') { s.phase = 'paused'; s.resumePhase = 'active'; s.message = '刷新后先暂停；排队与资源均已保留。'; }
  return s;
}
