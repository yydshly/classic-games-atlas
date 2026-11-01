// 进阶版：九列短步横断。所有车与浮梁的位置只由本关时钟决定。
export const SAVE_KEY = 'classic-games-atlas:tidal-lamp-crossing:v2';
export const SIZE = 9;
const road = (speed, starts, width = 1.35) => ({ kind: 'road', speed, width, starts, period: 11 });
const water = (speed, starts, width = 2.25) => ({ kind: 'water', speed, width, starts, period: 11 });
const split = (left, right) => ({ kind: 'split', left, right });
export const STAGES = [
  { name: '清晨车潮', limit: 38, brief: '先在安全岛观察货车间隙。到北岸中央灯塔交灯。',
    lanes: { 7: road(0.85, [0, 3, 7], 1.2), 5: road(-0.9, [-1.5, 2, 6], 1.25), 3: road(0.8, [0, 4.5, 8], 1.2) } },
  { name: '浮梁渡口', limit: 46, brief: '浮梁会带着你移动。落水或被货车撞到会停案；别在水面外起跳。',
    lanes: { 7: water(0.55, [1, 4, 7.5], 2.35), 6: water(-0.55, [-0.5, 3.4, 7.2], 2.3),
      4: road(0.85, [0, 3.8, 7.6], 1.2), 3: water(0.55, [1, 4.6, 8.4], 2.4), 1: road(-0.75, [0, 4.3, 8.5], 1.25) } },
  { name: '双闸归灯', limit: 52, brief: '中岸的封栏挡住直线。两侧浮梁都可通行，先看位置与车流再选路。',
    lanes: { 7: road(1.05, [0, 3.3, 6.6], 1.3), 6: road(-0.9, [1, 5, 9], 1.2),
      4: { kind: 'barrier', blocked: [3, 4, 5] },
      3: water(0.5, [0.4, 5.8], 2.9), 2: water(-0.55, [0.1, 5.7], 2.85),
      1: road(0.7, [0, 5], 1.2) } },
  { name: '错峰双车道', limit: 48, brief: '两组逆向车流之间有安全中岸。可停步重新观察，也可看准连续空隙快走。',
    lanes: { 7: road(0.95, [0, 3.8, 7.4], 1.18), 6: road(-1.05, [1.1, 5, 8.7], 1.18),
      4: road(1.1, [0.6, 4.1, 7.7], 1.14), 3: road(-0.95, [0.4, 4.5, 8.5], 1.14),
      1: road(0.72, [0, 5], 1.2) } },
  { name: '中岸双门', limit: 58, brief: '下段连续浮梁没有安全岸；借横移与短步对准左侧二、三列或右侧五、六列，再在中岸观察北段。',
    lanes: { 7: water(0.55, [0.7, 4.1, 7.5], 2.25), 6: water(-0.5, [0.6, 4.2, 7.8], 2.28),
      5: water(0.42, [0.3, 4, 7.7], 2.35),
      4: { kind: 'barrier', blocked: [0, 1, 4, 7, 8] },
      3: water(0.6, [0.1, 4.1, 8.1], 2.75), 2: water(-0.55, [0.3, 4.4, 8.5], 2.75),
      1: road(0.62, [0, 5.5], 1.16) } },
  { name: '两岸分路', limit: 65, brief: '中央封栏把险路分成两侧：左边看车流，右边踩浮梁。中岸可换边，再决定北段路线。',
    lanes: { 7: split(road(0.9, [0, 4.5, 8], 1.2), water(-0.4, [4.4, 7.4], 2.25)),
      6: split(road(-0.8, [0, 4.7, 8.4], 1.15), water(0.43, [4.1, 7.3], 2.28)),
      4: split(road(0.9, [0, 4.7, 8.8], 1.16), water(-0.4, [4.5, 7.7], 2.3)),
      3: split({ kind: 'safe' }, water(0.43, [4.15, 7.35], 2.3)),
      1: road(-0.7, [0, 5], 1.2) } },
];
const copy = value => JSON.parse(JSON.stringify(value));
const integer = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
function fresh(stage, unlocked = stage, records = Array(STAGES.length).fill(null)) {
  return { version: 2, stage, unlocked, records: copy(records), phase: 'ready', elapsed: 0,
    player: { x: 4.5, row: 8, carrier: null }, hops: 0,
    message: '先看路线和灯塔。方向键或屏幕方向键短步移动；车道找空隙，水面只能落在浮梁上。' };
}
export const createGame = () => fresh(0, 0);
export function laneAt(s, row = s.player.row, x = s.player.x) {
  const lane = STAGES[s.stage].lanes[row] ?? { kind: 'safe' };
  if (lane.kind !== 'split') return lane;
  const col = Math.floor(x);
  return col < 4 ? lane.left : col > 4 ? lane.right : { kind: 'barrier', blocked: [4] };
}
export function positions(lane, elapsed) {
  if (!lane.starts) return [];
  const phase = ((lane.speed * elapsed % lane.period) + lane.period) % lane.period;
  return lane.starts.flatMap((start, id) => [-2, -1, 0, 1, 2].map(k =>
    ({ id, x: start + phase + k * lane.period, width: lane.width })));
}
// The visible deck is inset by about .04 cell in the renderer; use a small
// center-foot margin so a courier visibly on a deck is accepted as landing.
function platformAt(lane, x, t) { return positions(lane, t).find(p => x >= p.x + .08 && x <= p.x + p.width - .08)?.id ?? null; }
function struck(lane, x, t) { return positions(lane, t).some(p => x + .16 > p.x && x - .16 < p.x + p.width); }
function lose(s, message) { s.phase = 'lost'; s.player.carrier = null; s.message = `${message} 本关可重试，已完成关卡记录保留。`; }
function win(s) {
  s.phase = 'won'; s.player.carrier = null; s.unlocked = Math.max(s.unlocked, Math.min(s.stage + 1, STAGES.length - 1));
  const record = { seconds: Math.round(s.elapsed * 10) / 10, hops: s.hops };
  if (!s.records[s.stage] || record.seconds < s.records[s.stage].seconds) s.records[s.stage] = record;
  s.message = s.stage === STAGES.length - 1 ? '六盏灯都已送达；可重玩已解锁关卡或返回大厅。' : '这盏灯已送达；可进入下一关或重玩已解锁关卡。';
}
export function start(s) { if (s.phase !== 'ready') return false; s.phase = 'active'; s.message = '出发。安全岛上可以停步观察；车与浮梁仍会移动。'; return true; }
export function move(s, dir) {
  if (s.phase !== 'active' || !['up', 'down', 'left', 'right'].includes(dir)) return false;
  const p = s.player, next = { x: p.x + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0),
    row: p.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0), carrier: null };
  if (next.x < .25 || next.x > SIZE - .25 || next.row < 0 || next.row >= SIZE) return false;
  const lane = laneAt(s, next.row, next.x);
  if (lane.kind === 'barrier' && lane.blocked.includes(Math.floor(next.x))) {
    s.message = '封栏挡住这里；先在安全岸调整位置，从可通行的门或两侧绕过。'; return false;
  }
  s.player = next; s.hops++;
  if (lane.kind === 'water') {
    next.carrier = platformAt(lane, next.x, s.elapsed);
    if (next.carrier === null) lose(s, '没有踩中浮梁，灯落入潮水。');
  } else if (lane.kind === 'road' && struck(lane, next.x, s.elapsed)) lose(s, '货车经过，灯被撞落。');
  else if (next.row === 0 && next.x >= 3.5 && next.x <= 5.5) win(s);
  if (s.phase === 'active') s.message = lane.kind === 'water' ? '站稳浮梁，留意它会带你横移。' :
    next.row === 0 ? '到了北岸。向中央灯塔再走一步。' : '继续观察下一条通道。';
  return true;
}
export function advance(s, dt) {
  if (s.phase !== 'active' || !Number.isFinite(dt) || dt <= 0) return false;
  s.elapsed += dt;
  const p = s.player, lane = laneAt(s);
  if (lane.kind === 'water') {
    if (p.carrier === null) lose(s, '失去浮梁，灯落入潮水。');
    else {
      p.x += lane.speed * dt;
      if (p.x < .16 || p.x > SIZE - .16 || laneAt(s, p.row, p.x).kind !== 'water')
        lose(s, '浮梁驶离可站区域，灯落入潮水。');
    }
  } else if (lane.kind === 'road' && struck(lane, p.x, s.elapsed)) lose(s, '货车经过，灯被撞落。');
  if (s.phase === 'active' && s.elapsed >= STAGES[s.stage].limit) lose(s, '本班时限已到，灯未送达。');
  return true;
}
export function pause(s) { if (s.phase !== 'active') return false; s.phase = 'paused'; s.message = '已暂停；位置、时间和关卡记录已保存。'; return true; }
export function resume(s) { if (s.phase !== 'paused') return false; s.phase = 'active'; s.message = '继续送灯。'; return true; }
export function retry(s) { Object.assign(s, fresh(s.stage, s.unlocked, s.records)); return true; }
export function selectStage(s, stage) {
  if (!integer(stage, 0, STAGES.length - 1) || stage > s.unlocked || !['ready', 'won', 'lost'].includes(s.phase)) return false;
  Object.assign(s, fresh(stage, s.unlocked, s.records)); return true;
}
export function nextStage(s) { if (s.phase !== 'won' || s.stage >= STAGES.length - 1) return false; return selectStage(s, s.stage + 1); }
export const checkpoint = s => copy(s);
export function restore(raw) {
  if (!raw || raw.version !== 2 || !integer(raw.stage, 0, STAGES.length - 1) ||
      !integer(raw.unlocked, raw.stage, STAGES.length - 1) || !['ready', 'active', 'paused', 'won', 'lost'].includes(raw.phase) ||
      !Number.isFinite(raw.elapsed) || raw.elapsed < 0 || raw.elapsed > STAGES[raw.stage].limit + 1 ||
      !raw.player || !Number.isFinite(raw.player.x) || raw.player.x < -.2 || raw.player.x > SIZE + .2 ||
      !integer(raw.player.row, 0, SIZE - 1) || ![null, 0, 1, 2].includes(raw.player.carrier) ||
      !integer(raw.hops, 0, 10000) || !Array.isArray(raw.records) || raw.records.length !== STAGES.length ||
      raw.records.some(r => r !== null && (!r || !Number.isFinite(r.seconds) || r.seconds < 0 || !integer(r.hops, 0, 10000))) ||
      typeof raw.message !== 'string') return null;
  const s = copy(raw);
  if (s.phase === 'active') { s.phase = 'paused'; s.message = '刷新后先暂停。位置与时间已保留；选择继续时车和浮梁才再次移动。'; }
  return s;
}
