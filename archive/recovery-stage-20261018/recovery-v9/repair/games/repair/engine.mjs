import { LEVELS } from './levels.mjs';
export { LEVELS } from './levels.mjs';
export const FIXED_DT = 1 / 20;
const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.values(o).forEach(deepFreeze); Object.freeze(o); } return o; };
const clone = o => JSON.parse(JSON.stringify(o));
export const SLOTS = deepFreeze([
  { id: 'A', x: 340, y: 190, workY: 235 }, { id: 'B', x: 565, y: 190, workY: 235 }, { id: 'C', x: 790, y: 190, workY: 235 },
  { id: 'D', x: 340, y: 510, workY: 465 }, { id: 'E', x: 565, y: 510, workY: 465 }, { id: 'F', x: 790, y: 510, workY: 465 },
]);
export const COSTS = deepFreeze({ build: { diagnosis: 95, mechanical: 100, electrical: 120 }, hire: 80, upgrade: [0, 75, 120], maintain: 25 });
export const STATION_TYPES = deepFreeze({
  reception: { name: '雨棚接待', duration: 1.7, color: '#93bcaf', capacity: 3 },
  diagnosis: { name: '检测工位', duration: 3.6, color: '#dfb86d', capacity: 3 },
  mechanical: { name: '机械工位', duration: 6.2, color: '#d78d67', capacity: 3 },
  electrical: { name: '电路工位', duration: 6.7, color: '#8daed0', capacity: 3 },
  payment: { name: '结账小窗', duration: 1.6, color: '#b9a1c4', capacity: 3 },
});
export const ROBOT_TYPES = deepFreeze({
  courier: { name: '信使', color: '#e7a16a', repairStages: ['mechanical'], payment: 43, service: 1 },
  gardener: { name: '园丁', color: '#86ad8b', repairStages: ['mechanical'], payment: 46, service: 1.08 },
  lantern: { name: '提灯客', color: '#e7c672', repairStages: ['electrical'], payment: 49, service: 1 },
  musician: { name: '街头乐手', color: '#b4a0cf', repairStages: ['mechanical', 'electrical'], payment: 76, service: .9 },
});
const MAX_COMMANDS = 384;
const EPS = 1e-8;
const cue = (s, text) => { s.message = text; s.messageT = 4; s.events.push(text); if (s.events.length > 10) s.events.shift(); };
const stationById = (s, id) => s.stations.find(st => st.id === id);
const workerById = (s, id) => s.staff.find(w => w.id === id);
const robotById = (s, id) => s.robots.find(r => r.id === id);
const technicians = s => s.staff.filter(w => !w.fixed);
const station = (slot, type, workerId = null, level = 1) => {
  const point = typeof slot === 'object' ? slot : SLOTS.find(p => p.id === slot);
  return { id: `station-${point.id}`, slot: point.id, type, x: point.x, y: point.y, workY: point.workY,
    level, workerId, queue: [], robotId: null, progress: 0, duration: STATION_TYPES[type].duration,
    broken: false, wear: 0, maintenance: 0, capacity: 3, served: 0 };
};
const techNames = ['阿岚', '木叔', '小禾', '阿树', '晴姐', '小川'];
const worker = (id, name, st, fixed = false) => ({ id, name, x: st ? st.x - 28 : 100, y: st ? st.workY : 350, stationId: st?.id ?? null, path: [], status: 'idle', fixed });

export function createGame(index = 0) {
  index = Math.max(0, Math.min(LEVELS.length - 1, Math.trunc(Number(index) || 0)));
  const level = LEVELS[index];
  const stations = [station({ id: 'reception', x: 125, y: 220, workY: 255 }, 'reception', 'host'),
    station('A', 'diagnosis', 't1'), station('D', 'mechanical', 't2'),
    station({ id: 'payment', x: 900, y: 220, workY: 255 }, 'payment', 'cashier')];
  const staff = [worker('host', '阿雨', stations[0], true), worker('cashier', '秋姨', stations[3], true),
    worker('t1', techNames[0], stations[1]), worker('t2', techNames[1], stations[2])];
  if (level.initialElectrical) {
    const st = station('B', 'electrical', level.initialElectricalStaff ? 't3' : null); stations.push(st);
    if (level.initialElectricalStaff) staff.push(worker('t3', techNames[2], st));
  }
  return { state: 'ready', levelIndex: index, level, time: level.duration, elapsed: 0, tick: 0, credits: level.credits,
    completed: 0, lost: 0, goal: level.goal, maxLost: level.maxLost, robots: [], staff, stations, events: [],
    message: level.tip, messageT: 8, arrivalIndex: 0, faultIndex: 0, earnings: 0, spent: 0, wagesPaid: 0,
    accumulator: 0, commandLog: [], started: false, startIndex: null, reason: '', lastWageTick: 0 };
}
export function start(s) { if (s.state === 'ready') { s.state = 'playing'; s.started = true; s.startIndex = s.commandLog.length; cue(s, '雨街修理所开门了，第一位街坊正在进门。'); } return s; }
export function pause(s) { if (s.state === 'playing') s.state = 'paused'; return s; }
export function resume(s) { if (s.state === 'paused') { if (!s.started) { s.state = 'ready'; start(s); } else s.state = 'playing'; } return s; }
export function retry(s) { const fresh = createGame(s.levelIndex); for (const key of Object.keys(s)) delete s[key]; Object.assign(s, fresh); return s; }

// Every route enters the shared corridor before taking the next branch. Neither
// visitors nor reassigned staff can jump straight through a furnished room.
function route(entity, x, y, corridor = true) {
  const points = [];
  const add = (px, py) => { const prev = points.at(-1) || entity; if (Math.hypot(prev.x - px, prev.y - py) > .01) points.push({ x: px, y: py }); };
  if (corridor) { add(entity.x, 350); add(x, 350); }
  add(x, y); entity.path = points;
}
function move(entity, speed) {
  let remaining = speed * FIXED_DT;
  while (entity.path.length && remaining > EPS) {
    const p = entity.path[0], dx = p.x - entity.x, dy = p.y - entity.y, d = Math.hypot(dx, dy);
    if (d <= remaining + EPS) { entity.x = p.x; entity.y = p.y; entity.path.shift(); remaining -= d; }
    else { entity.x += dx / d * remaining; entity.y += dy / d * remaining; remaining = 0; }
  }
  return !entity.path.length;
}
const validId = id => typeof id === 'string' && id.length < 40;
const allowedKeys = { build: ['type', 'slot', 'stationType'], hire: ['type'], assign: ['type', 'staffId', 'stationId'], upgrade: ['type', 'stationId'], maintain: ['type', 'stationId'] };
function canonical(cmd) {
  if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd) || !Object.hasOwn(allowedKeys, cmd.type)) return null;
  const keys = allowedKeys[cmd.type];
  if (Object.keys(cmd).some(k => !keys.includes(k)) || keys.some(k => !Object.hasOwn(cmd, k))) return null;
  return Object.fromEntries(keys.map(k => [k, cmd[k]]));
}
export function canCommand(s, raw) {
  const cmd = canonical(raw);
  if (!cmd) return { ok: false, reason: '操作格式无效。' };
  if (!['ready', 'playing', 'paused'].includes(s.state)) return { ok: false, reason: '本班已经结束，请重试或选择下一天。' };
  if (s.commandLog.length >= MAX_COMMANDS) return { ok: false, reason: '本班操作记录已满，请先完成这一班。' };
  let cost = 0;
  if (cmd.type === 'build') {
    if (!SLOTS.some(p => p.id === cmd.slot) || !Object.hasOwn(COSTS.build, cmd.stationType)) return { ok: false, reason: '请选择空地和可建造的工位。' };
    if (s.stations.some(st => st.slot === cmd.slot)) return { ok: false, reason: '这里已经有工位了。' };
    cost = COSTS.build[cmd.stationType];
  } else if (cmd.type === 'hire') {
    if (technicians(s).length >= 6) return { ok: false, reason: '本班最多雇用六位维修师傅。' };
    cost = COSTS.hire;
  } else if (cmd.type === 'assign') {
    const w = validId(cmd.staffId) && workerById(s, cmd.staffId), st = validId(cmd.stationId) && stationById(s, cmd.stationId);
    if (!w || w.fixed || !st || !Object.hasOwn(COSTS.build, st.type)) return { ok: false, reason: '请选择维修师傅和维修工位。' };
    if (w.stationId === st.id) return { ok: false, reason: '这位师傅已经分配在这里。' };
    if (st.workerId !== null) return { ok: false, reason: '这个工位已有师傅。' };
    if (w.stationId && stationById(s, w.stationId)?.maintenance > 0) return { ok: false, reason: '请等师傅完成保养再调岗。' };
  } else {
    const st = validId(cmd.stationId) && stationById(s, cmd.stationId);
    if (!st || !Object.hasOwn(COSTS.build, st.type)) return { ok: false, reason: '接待和结账窗口无需改造。' };
    if (cmd.type === 'upgrade') {
      if (st.level >= 3) return { ok: false, reason: '这个工位已经升到最高级。' };
      if (st.maintenance > 0) return { ok: false, reason: '保养完成后才能升级。' };
      cost = COSTS.upgrade[st.level];
    } else {
      if (st.maintenance > 0) return { ok: false, reason: '保养已经开始。' };
      if (!st.broken && st.wear <= 0) return { ok: false, reason: '工位状态很好，无需保养。' };
      if (!st.workerId) return { ok: false, reason: '先给工位分配一位师傅。' };
      cost = COSTS.maintain;
    }
  }
  if (!Number.isFinite(s.credits) || s.credits < cost) return { ok: false, reason: `现金不足，需要${cost}。`, cost };
  return { ok: true, reason: '', cost };
}
export function command(s, raw) {
  const check = canCommand(s, raw); if (!check.ok) return check;
  const cmd = canonical(raw); s.credits -= check.cost; s.spent += check.cost;
  if (cmd.type === 'build') { s.stations.push(station(cmd.slot, cmd.stationType)); cue(s, `${STATION_TYPES[cmd.stationType].name}已建好，请分配师傅。`); }
  else if (cmd.type === 'hire') { const n = technicians(s).length + 1; s.staff.push(worker(`t${n}`, techNames[n - 1], null)); cue(s, `${techNames[n - 1]}来报到了，请选择工位分配。`); }
  else if (cmd.type === 'assign') {
    const w = workerById(s, cmd.staffId), st = stationById(s, cmd.stationId), old = stationById(s, w.stationId);
    if (old) old.workerId = null; st.workerId = w.id; w.stationId = st.id;
    route(w, st.x - 28, st.workY); w.status = 'walking'; cue(s, `${w.name}正在前往${STATION_TYPES[st.type].name}。`);
  } else if (cmd.type === 'upgrade') {
    const st = stationById(s, cmd.stationId); st.level++; cue(s, `${STATION_TYPES[st.type].name}升至${st.level}级，接下来的维修更快了。`);
  } else { const st = stationById(s, cmd.stationId); st.maintenance = 4; cue(s, `${STATION_TYPES[st.type].name}开始保养，预计四秒。`); }
  s.commandLog.push({ tick: s.tick, command: cmd });
  return { ok: true, reason: '', cost: check.cost };
}
function end(s, state, reason) { s.state = state; s.reason = reason; s.accumulator = 0; cue(s, reason); }
function leave(s, r, paid) {
  if (r.stationId) {
    const st = stationById(s, r.stationId);
    st.queue = st.queue.filter(id => id !== r.id); reflowQueue(s, st);
    if (st.robotId === r.id) { st.robotId = null; st.progress = 0; }
  }
  r.stationId = null; r.stage = 'exit'; r.status = 'leaving'; r.paid = paid; route(r, 965, 350);
  if (!paid) { s.lost++; cue(s, `${ROBOT_TYPES[r.type].name}等得太久，遗憾地离开了。`); }
}
function queuePosition(st, index) {
  // Checkout queues use the outer-right aisle. Mirroring them left would collide
  // with bay C's third reservation when that bay has no technician yet.
  if (st.type === 'payment') return { x: 960, y: 315 + index * 65 };
  // Bay C's horizontal line stays below the cashier and payment service faces.
  if (st.slot === 'C') return { x: st.x - 54 + index * 60, y: 320 };
  return { x: st.x + 52 + index * 32, y: st.workY + (st.workY < 350 ? 1 : -1) * (32 + index * 23) };
}
function reflowQueue(s, st) {
  st.queue.forEach((id, index) => {
    const r = robotById(s, id); if (!r) return;
    const pos = queuePosition(st, index); r.queueTarget = pos;
    if (r.path.length) r.path[r.path.length - 1] = { ...pos };
    else if (Math.hypot(r.x - pos.x, r.y - pos.y) > .05) { route(r, pos.x, pos.y, false); r.status = 'walking'; }
  });
}
function readyWorker(s, st) {
  const w = workerById(s, st.workerId);
  return w && !w.path.length && Math.hypot(w.x - (st.x - 28), w.y - st.workY) < 1 ? w : null;
}
function seekStation(s, r) {
  const choices = s.stations.filter(st => st.type === r.stage && !st.broken && st.maintenance <= 0 && st.queue.length + (st.robotId ? 1 : 0) < st.capacity);
  choices.sort((a, b) => {
    const load = st => (st.queue.length + (st.robotId ? 1 : 0)) * STATION_TYPES[st.type].duration / (1 + .4 * (st.level - 1)) + Math.abs(st.x - r.x) / 75 + (st.workerId ? 0 : 8);
    return load(a) - load(b) || a.id.localeCompare(b.id);
  });
  const st = choices[0];
  if (!st) { r.stationId = null; if (Math.abs(r.y - 350) > .1) { route(r, r.x, 350); r.status = 'walking'; } else r.status = 'waiting'; return; }
  const pos = queuePosition(st, st.queue.length); st.queue.push(r.id); r.stationId = st.id; r.status = 'walking'; route(r, pos.x, pos.y); reflowQueue(s, st);
}
function nextStage(s, r) {
  if (r.stage === 'reception') r.stage = 'diagnosis';
  else if (r.stage === 'diagnosis') { r.repairIndex = 0; r.stage = ROBOT_TYPES[r.type].repairStages[0]; }
  else if (r.stage === 'mechanical' || r.stage === 'electrical') { r.repairIndex++; r.stage = ROBOT_TYPES[r.type].repairStages[r.repairIndex] || 'payment'; }
  else if (r.stage === 'payment') {
    const amount = ROBOT_TYPES[r.type].payment; s.credits += amount; s.earnings += amount; s.completed++; r.receipt = amount;
    cue(s, `${ROBOT_TYPES[r.type].name}修好了！收入${amount}，已完成${s.completed}/${s.goal}。`); leave(s, r, true); return;
  }
  r.stationId = null; r.status = 'waiting'; r.progress = 0; seekStation(s, r);
}
function addArrival(s, type) {
  const i = s.arrivalIndex;
  const r = { id: `r${i}`, type, x: 35, y: 350, status: 'waiting', stage: 'reception', stationId: null,
    path: [], patience: s.level.patience, maxPatience: s.level.patience, progress: 0, repairIndex: 0, paid: false, receipt: 0 };
  s.robots.push(r); seekStation(s, r);
}
function tick(s) {
  s.tick++; s.elapsed = s.tick * FIXED_DT; s.time = Math.max(0, s.level.duration - s.elapsed); s.messageT = Math.max(0, s.messageT - FIXED_DT);
  while (s.arrivalIndex < s.level.arrivals.length && s.level.arrivals[s.arrivalIndex].at <= s.elapsed + EPS) { const a = s.level.arrivals[s.arrivalIndex++]; addArrival(s, a.type); }
  while (s.faultIndex < s.level.faults.length && s.level.faults[s.faultIndex].at <= s.elapsed + EPS) {
    const f = s.level.faults[s.faultIndex++], st = s.stations.find(st => st.slot === f.slot);
    if (st) { st.broken = true; cue(s, `${STATION_TYPES[st.type].name}亮起红灯，需要保养！`); }
  }
  for (const w of s.staff) { if (w.path.length) { move(w, 100); w.status = w.path.length ? 'walking' : 'idle'; } else w.status = 'idle'; }
  // A stopped repair is a wait, not active service: patience must keep falling.
  for (const st of s.stations) {
    const r = robotById(s, st.robotId);
    if (r && ['servicing', 'blocked'].includes(r.status)) r.status = readyWorker(s, st) && !st.broken && !st.maintenance ? 'servicing' : 'blocked';
  }
  for (const r of s.robots) {
    if (r.status === 'gone') continue;
    if (r.status === 'leaving') { if (move(r, 90)) r.status = 'gone'; continue; }
    if (r.status !== 'servicing') r.patience = Math.max(0, r.patience - FIXED_DT * (r.status === 'walking' ? .28 : 1));
    if (r.patience <= EPS) { leave(s, r, false); continue; }
    if (r.status === 'walking') { if (move(r, 85)) r.status = 'waiting'; }
    else if (r.status === 'waiting' && !r.stationId && s.tick % 5 === 0) seekStation(s, r);
  }
  for (const st of s.stations) {
    const w = readyWorker(s, st);
    if (!w) continue;
    if (st.maintenance > 0) {
      w.status = 'working'; st.maintenance = Math.max(0, st.maintenance - FIXED_DT);
      if (st.maintenance <= EPS) { st.maintenance = 0; st.broken = false; st.wear = 0; cue(s, `${STATION_TYPES[st.type].name}保养完成。`); }
      continue;
    }
    if (st.broken) continue;
    if (!st.robotId && st.queue.length) {
      const r = robotById(s, st.queue[0]);
      if (r && r.status === 'waiting' && !r.path.length) {
        st.queue.shift(); reflowQueue(s, st); r.queueTarget = null; st.robotId = r.id; st.progress = 0;
        st.duration = STATION_TYPES[st.type].duration * (['mechanical', 'electrical'].includes(st.type) ? ROBOT_TYPES[r.type].service : 1) / (1 + .42 * (st.level - 1));
        // The service bay itself is approached visibly; no service time accrues before arrival.
        route(r, st.x + 14, st.workY, false); r.status = 'walking'; r.serviceApproach = true;
      }
    }
    if (st.robotId) {
      const r = robotById(s, st.robotId);
      if (!r || r.status === 'leaving' || r.status === 'gone') { st.robotId = null; st.progress = 0; continue; }
      if (r.path.length) continue;
      r.status = 'servicing'; r.serviceApproach = false; w.status = 'working';
      st.progress += FIXED_DT; r.progress = Math.min(1, st.progress / st.duration);
      if (st.progress + EPS >= st.duration) {
        st.served++; st.robotId = null; st.progress = 0;
        if (Object.hasOwn(COSTS.build, st.type)) {
          st.wear++; if (s.level.wearLimit && st.wear >= s.level.wearLimit + st.level - 1) { st.broken = true; cue(s, `${STATION_TYPES[st.type].name}磨损过高，请安排保养。`); }
        }
        nextStage(s, r);
      }
    }
  }
  if (s.lost >= s.maxLost) { end(s, 'lost', `有${s.lost}位街坊失去耐心。本班结束，重试时先照顾最长的队伍。`); return; }
  if (s.level.wage && s.tick % 300 === 0) {
    const wage = technicians(s).length * s.level.wage;
    if (s.credits < wage) { end(s, 'lost', `现金不足以支付本次${wage}工资，修理所暂时歇业。`); return; }
    s.credits -= wage; s.wagesPaid += wage; s.lastWageTick = s.tick;
  }
  if (s.time <= 0 || (s.arrivalIndex === s.level.arrivals.length && s.robots.every(r => r.status === 'gone'))) {
    if (s.completed >= s.goal) end(s, 'won', `本班完成${s.completed}次维修，雨街的灯又亮了。`);
    else end(s, 'lost', `打烊时完成${s.completed}/${s.goal}次维修。下一班试着提前扩充最忙的工位。`);
  }
}
export function step(s, dt = FIXED_DT) {
  if (s.state !== 'playing' || !Number.isFinite(dt) || dt <= 0) return s;
  s.accumulator += Math.min(dt, .25);
  while (s.accumulator + EPS >= FIXED_DT && s.state === 'playing') { s.accumulator = Math.max(0, s.accumulator - FIXED_DT); tick(s); }
  return s;
}
export function snapshot(s) {
  const { commandLog, accumulator, ...publicState } = s; return deepFreeze(clone(publicState));
}
export function checkpoint(s) {
  if (!s || !['ready', 'playing', 'paused'].includes(s.state)) return null;
  return { version: 1, levelIndex: s.levelIndex, tick: s.tick, startIndex: s.startIndex, commands: clone(s.commandLog) };
}
export function restore(data) {
  try {
    if (!data || typeof data !== 'object' || Array.isArray(data) || JSON.stringify(data).length > 65000 || Object.keys(data).sort().join(',') !== 'commands,levelIndex,startIndex,tick,version') return null;
    if (data.version !== 1 || !Number.isInteger(data.levelIndex) || data.levelIndex < 0 || data.levelIndex >= LEVELS.length || !Number.isInteger(data.tick) || data.tick < 0 || data.tick > LEVELS[data.levelIndex].duration / FIXED_DT || !Array.isArray(data.commands) || data.commands.length > MAX_COMMANDS) return null;
    let last = 0;
    for (const item of data.commands) {
      if (!item || Object.keys(item).sort().join(',') !== 'command,tick' || !Number.isInteger(item.tick) || item.tick < last || item.tick > data.tick || !canonical(item.command)) return null;
      last = item.tick;
    }
    if (data.startIndex !== null && (!Number.isInteger(data.startIndex) || data.startIndex < 0 || data.startIndex > data.commands.length)) return null;
    if (data.startIndex === null && data.tick !== 0) return null;
    const s = createGame(data.levelIndex); let pos = 0;
    const readyCount = data.startIndex === null ? data.commands.length : data.startIndex;
    while (pos < readyCount) { const item = data.commands[pos++]; if (item.tick !== 0 || !command(s, item.command).ok) return null; }
    if (data.startIndex !== null) start(s);
    for (;;) {
      while (pos < data.commands.length && data.commands[pos].tick === s.tick) { if (!command(s, data.commands[pos++].command).ok) return null; }
      if (s.tick === data.tick) break;
      if (s.state !== 'playing') return null;
      tick(s);
    }
    if (!['ready', 'playing'].includes(s.state)) return null;
    s.state = 'paused'; s.accumulator = 0; return s;
  } catch { return null; }
}
