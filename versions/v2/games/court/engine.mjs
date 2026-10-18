import { LEVELS } from './levels.mjs';
export { LEVELS } from './levels.mjs';

// All gameplay advances in 1/60-second ticks. Public time is remaining seconds;
// elapsed is total live match time, including overtime. Rendering may interpolate.
export const FIXED_DT = 1 / 60;
export const COURT = Object.freeze({ width: 1000, height: 560, minX: 30, maxX: 970, minY: 30, maxY: 530, radius: 17, arc: 260, homeRim: { x: 930, y: 280 }, awayRim: { x: 70, y: 280 } });
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rim = team => team === 0 ? COURT.homeRim : COURT.awayRim;
const other = id => id ^ 1;
const random = s => { s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0; return s.rng / 4294967296; };
const cue = (s, message) => { s.message = message; s.messageT = 2.3; s.events.push(message); if (s.events.length > 12) s.events.shift(); };
// Short, tick-owned presentation events never enter physics or random decisions.
const feedback = (s, type, p, text = '', life = 0.7) => {
  s.feedback.push({ id: ++s.feedbackSeq, type, playerId: p.id, x: p.x, y: p.y, team: p.team, text, ttl: life, life });
  if (s.feedback.length > 24) s.feedback.shift();
};
const ballTemplate = () => ({ x: 300, y: 280, z: 15, vx: 0, vy: 0, owner: 0, mode: 'held', t: 0, duration: 0, lastTeam: 0 });
const player = (id, x, y) => ({ id, team: id < 2 ? 0 : 1, x, y, vx: 0, vy: 0, hasBall: id === 0, action: '', actionT: 0, cooldown: 0, think: id * 0.07, hold: 0, faceX: id < 2 ? 1 : -1, faceY: 0, windup: 0, intent: '', shotQuality: 0, role: id === 0 ? 'ball' : 'support', markId: null, cutT: 0, cutX: x, cutY: y, contactT: 0, visualAction: '', visualT: 0 });

export function createGame(levelIndex = 0) {
  levelIndex = clamp(Math.trunc(Number(levelIndex) || 0), 0, LEVELS.length - 1);
  const level = LEVELS[levelIndex];
  return { state: 'ready', level, levelIndex, time: level.duration, elapsed: 0, tick: 0, score: [0, 0], controlled: 0,
    players: [player(0, 290, 280), player(1, 425, 415), player(2, 630, 250), player(3, 740, 390)],
    ball: ballTemplate(), events: [], feedback: [], feedbackSeq: 0, message: '终场得分领先即获胜，你方进攻右侧篮筐。', messageT: 8,
    charge: 0, charging: false, shotQuality: 0, shotChance: 0, shotClock: 20, possession: 0, overtime: 0,
    rng: level.seed, accumulator: 0, lastShoot: false, pendingControl: null, resetT: 0, stats: { shots: [0, 0], makes: [0, 0], steals: [0, 0], rebounds: [0, 0], passes: [0, 0], turnovers: [0, 0] } };
}
export function start(s) { if (s.state === 'ready') { s.state = 'playing'; cue(s, '开球！向右侧篮筐进攻。'); } return s; }
export function pause(s) { if (s.state === 'playing') { s.state = 'paused'; s.charging = false; s.charge = 0; s.lastShoot = false; } return s; }
export function resume(s) { if (s.state === 'paused') s.state = 'playing'; return s; }
export function retry(s) { const fresh = createGame(s.levelIndex); for (const k of Object.keys(s)) delete s[k]; Object.assign(s, fresh); return s; }

function setOwner(s, id, rebound = false) {
  const p = s.players[id], changed = s.possession !== p.team;
  const passer = s.ball.mode === 'pass' && s.ball.receiver === id ? s.players[s.ball.passer] : null;
  for (const q of s.players) { q.hasBall = q.id === id; q.hold = 0; }
  s.ball = { ...ballTemplate(), x: p.x, y: p.y, owner: id, lastTeam: p.team };
  if (changed || rebound) s.shotClock = 20;
  s.possession = p.team;
  if (changed || rebound) for (const q of s.players) q.cutT = 0;
  p.cutT = 0;
  if (passer) {
    passer.cutT = 1.8;
    passer.cutX = p.team === 0 ? Math.min(850, passer.x + 235) : Math.max(150, passer.x - 235);
    passer.cutY = 280 + (p.y >= 280 ? -1 : 1) * 65;
    feedback(s, 'receive', p, '', 0.32); feedback(s, 'cut', passer, '传切', 0.85);
  }
  assignRoles(s);
  if (s.pendingControl === id) { s.controlled = id; s.pendingControl = null; }
  if (rebound) { s.stats.rebounds[p.team]++; feedback(s, 'rebound', p, '篮板', 0.85); cue(s, p.team === 0 ? '抢到篮板！' : '对手抢到篮板'); }
}

// Shot quality and shot percentage use the same formula for both teams.
// A seeded roll models shot dispersion; distance, release timing, movement,
// and nearby defenders affect the openly exposed shotChance value.
export function shootingInfo(s, p = s.players[s.controlled], charge = 0.65) {
  const d = dist(p, rim(p.team));
  let contest = 0;
  for (const q of s.players) if (q.team !== p.team) contest = Math.max(contest, clamp((123 - dist(p, q)) / 103, 0, 1));
  const timing = clamp(1 - Math.abs(charge - 0.65) / 0.65, 0, 1);
  const speed = Math.hypot(p.vx, p.vy);
  const layup = d < 125;
  const base = layup ? 0.94 : d <= 260 ? 0.83 - (d - 125) * 0.00155 : 0.61 - (d - 260) * 0.00165;
  const chance = clamp(base - contest * (layup ? 0.23 : 0.38) - (1 - timing) * 0.29 - (layup ? 0 : speed / 185 * 0.075), 0.04, 0.96);
  return { chance, quality: timing, contest, distance: d, points: d > COURT.arc ? 3 : 2, layup };
}

function shoot(s, id, charge = 0.65) {
  const p = s.players[id];
  if (s.ball.owner !== id || s.resetT > 0 || p.action === 'steal') return false;
  const info = shootingInfo(s, p, charge), target = rim(p.team);
  p.hasBall = false; p.action = info.layup ? 'layup' : 'shoot'; p.actionT = 0.55; p.windup = 0; p.intent = ''; p.shotQuality = info.quality;
  s.ball = { x: p.x, y: p.y, z: 25, owner: null, mode: 'shot', lastTeam: p.team, shooter: id, points: info.points, chance: info.chance, made: random(s) < info.chance, sx: p.x, sy: p.y, tx: target.x, ty: target.y, t: 0, duration: info.layup ? 0.62 : clamp(0.72 + info.distance / 900, 0.85, 1.4), peak: info.layup ? 105 : 175 + info.distance * 0.13, vx: 0, vy: 0 };
  for (const q of s.players) q.cutT = 0; assignRoles(s);
  feedback(s, 'shot', p, info.contest > 0.65 ? '受干扰' : info.layup ? '上篮' : info.points === 3 ? '三分' : '', 0.7);
  s.stats.shots[p.team]++; s.charging = false; s.charge = 0;
  s.shotChance = info.chance; s.shotQuality = info.quality;
  cue(s, `${p.team === 0 ? '你方' : s.level.opponent}: ${info.layup ? '上篮' : info.points === 3 ? '三分出手' : '跳投'}${info.contest > 0.65 ? ' · 受到干扰' : ''}`);
  return true;
}

function pass(s, id) {
  const p = s.players[id], receiver = s.players[other(id)];
  if (s.ball.owner !== id || s.resetT > 0 || p.windup > 0) return false;
  p.hasBall = false; p.action = 'pass'; p.actionT = 0.32; p.hold = 0;
  const duration = clamp(dist(p, receiver) / 590, 0.18, 0.8);
  s.ball = { x: p.x, y: p.y, z: 17, owner: null, mode: 'pass', lastTeam: p.team, passer: id, receiver: receiver.id, sx: p.x, sy: p.y, tx: receiver.x + receiver.vx * duration * 0.45, ty: receiver.y + receiver.vy * duration * 0.45, t: 0, duration, vx: 0, vy: 0 };
  s.stats.passes[p.team]++; feedback(s, 'pass', p, '', 0.42); assignRoles(s);
  if (id === s.controlled) s.pendingControl = receiver.id;
  s.charging = false; s.charge = 0;
  cue(s, p.team === 0 ? '传球！跑向空位。' : '对手传球');
  return true;
}

function steal(s, id) {
  const p = s.players[id];
  if (p.cooldown > 0 || p.windup > 0 || s.ball.owner === null || s.players[s.ball.owner].team === p.team || s.resetT > 0) return false;
  p.action = 'steal'; p.actionT = 0.44; p.windup = 0.14; p.intent = 'steal'; p.cooldown = 1.05;
  return true;
}
function resolveSteal(s, p) {
  const owner = s.ball.owner === null ? null : s.players[s.ball.owner];
  if (!owner || owner.team === p.team || dist(p, owner) > 49 || s.ball.mode !== 'held') { feedback(s, 'steal-fail', p, '扑空', 0.65); return; }
  const separation = dist(p, owner), protection = owner.windup > 0 ? 0.13 : 0;
  const dx = owner.x - p.x, dy = owner.y - p.y;
  const escaping = (owner.vx * dx + owner.vy * dy) / Math.max(1, separation) > 65 ? 0.10 : 0;
  if (random(s) < clamp(0.55 - separation / 210 - protection - escaping, 0.12, 0.46)) {
    s.stats.steals[p.team]++; s.stats.turnovers[owner.team]++; setOwner(s, p.id);
    feedback(s, 'steal-success', p, '抢断', 0.85); cue(s, p.team === 0 ? '抢断成功！' : '球被抢走了，快回防！');
  } else feedback(s, 'steal-fail', p, '护住了', 0.65);
}

export function action(s, kind) {
  if (kind === 'start') return start(s);
  if (kind === 'pause') return s.state === 'paused' ? resume(s) : pause(s);
  if (kind === 'resume') return resume(s);
  if (kind === 'retry') return retry(s);
  if (s.state !== 'playing') return s;
  // New recovery compatibility fix: the captured controller cancels interrupted
  // pointer/button holds. Clear the release edge without attempting a shot.
  if (kind === 'cancel-shot') { s.charging = false; s.charge = 0; s.lastShoot = false; return s; }
  if (kind === 'switch') { s.controlled = other(s.controlled); s.charging = false; s.charge = 0; s.pendingControl = null; return s; }
  if (kind === 'pass') pass(s, s.controlled);
  if (kind === 'steal') steal(s, s.controlled);
  if (kind === 'shoot') shoot(s, s.controlled, s.charging ? s.charge : 0.65);
  return s;
}

function move(p, x, y, speed, dt) {
  const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
  if (d > 3) { const v = Math.min(speed, d / dt); p.vx = dx / d * v; p.vy = dy / d * v; p.faceX = dx / d; p.faceY = dy / d; }
  else { p.vx = 0; p.vy = 0; }
}
// Decide once from the same positions before any player moves. The two guards
// cannot both pressure, and the other guard always marks the off-ball attacker.
function assignRoles(s) {
  const b = s.ball, owner = s.players[b.mode === 'pass' ? b.receiver : b.owner];
  for (const p of s.players) { p.markId = null; p.role = b.mode === 'shot' || b.mode === 'loose' ? 'rebound' : p.id === b.owner ? 'ball' : p.cutT > 0 ? 'cut' : 'support'; }
  if (!owner || (b.mode !== 'held' && b.mode !== 'pass')) return;
  const guards = s.players.filter(p => p.team !== owner.team);
  const pressure = dist(guards[0], owner) <= dist(guards[1], owner) ? guards[0] : guards[1];
  for (const p of guards) { p.role = p.id === pressure.id ? 'pressure' : 'deny'; p.markId = p.id === pressure.id ? owner.id : other(owner.id); }
}
function defend(s, p, speed, dt) {
  const mark = s.players[p.markId];
  if (!mark) { p.vx = p.vy = 0; return; }
  const attackRim = rim(mark.team), d = Math.max(1, dist(mark, attackRim));
  const cushion = p.team === 0 ? 48 : 72 - s.level.defense * 34;
  move(p, mark.x + (attackRim.x - mark.x) / d * cushion, mark.y + (attackRim.y - mark.y) / d * cushion, speed, dt);
  if (s.ball.mode === 'held' && p.role === 'pressure' && dist(p, mark) < 58 && p.cooldown <= 0 && random(s) < dt * (p.team === 0 ? 0.55 : 0.25 + s.level.aggression * 1.25)) steal(s, p.id);
}
function clearPassLane(s, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
  return !s.players.some(q => {
    if (q.team === a.team) return false;
    const t = clamp(((q.x - a.x) * dx + (q.y - a.y) * dy) / Math.max(1, length2), 0, 1);
    return Math.hypot(q.x - a.x - t * dx, q.y - a.y - t * dy) < 42;
  });
}
function ai(s, p, dt) {
  const b = s.ball, team = p.team, target = rim(team), cfg = s.level;
  const speed = team === 0 ? 178 : cfg.aiSpeed;
  if (p.windup > 0 || p.action === 'steal') { p.vx = p.vy = 0; return; }
  if (b.mode === 'loose' || b.mode === 'shot') {
    const destination = b.mode === 'shot' ? { x: b.tx - (team === 0 ? 30 : -30), y: b.ty + (p.id % 2 ? 35 : -35) } : b;
    move(p, destination.x, destination.y, speed, dt); return;
  }
  if (b.mode === 'pass') {
    if (b.receiver === p.id) move(p, b.tx, b.ty, speed * 0.7, dt);
    else if (b.lastTeam !== team) defend(s, p, speed, dt);
    else { p.vx = p.vy = 0; }
    return;
  }
  const owner = s.players[b.owner];
  if (!owner) return;
  if (owner.id === p.id) {
    const info = shootingInfo(s, p), teammate = s.players[other(p.id)];
    const inRange = info.distance < (team === 0 ? 165 : cfg.range);
    p.think -= dt;
    if (p.think <= 0) {
      p.think = 0.23 + random(s) * 0.2;
      const teammateInfo = shootingInfo(s, teammate);
      const passDesire = team === 0 ? 0.72 : cfg.passing;
      // Reward an actual open cut with a normal, interceptable return pass.
      if (s.shotClock > 2.2 && teammate.cutT > 0.3 && p.hold > 0.22 && teammateInfo.distance < info.distance - 45 && teammateInfo.contest < 0.4 && clearPassLane(s, p, teammate)) { pass(s, p.id); return; }
      if ((inRange && p.hold > 0.55 && (info.contest < 0.72 || info.distance < 125)) || (p.hold > 2.5 && info.distance < 330) || s.shotClock < 2.2) {
        p.action = 'windup'; p.actionT = 0.42; p.windup = 0.34; p.intent = 'shoot'; p.vx = p.vy = 0; return;
      }
      if (p.hold > 0.95 && dist(p, teammate) > 80 && ((info.contest > 0.50 && teammateInfo.contest < info.contest - 0.15) || (p.hold > 2 && random(s) < passDesire * 0.19))) { pass(s, p.id); return; }
    }
    // Drive diagonally around a nearby defender, then settle into shooting range.
    const lane = 280 + (p.id % 2 ? 1 : -1) * (team === 0 ? 90 : cfg.spacing * 0.55);
    let tx = target.x + (team === 0 ? -1 : 1) * (team === 0 ? 75 : Math.max(70, cfg.range - 50));
    let ty = lane;
    const blockers = s.players.filter(q => q.team !== team && dist(p, q) < 92);
    if (blockers.length && info.distance > 150) ty = p.y < 140 ? 380 : p.y > 420 ? 180 : p.y < 280 ? 65 : 495;
    move(p, tx, ty, speed * 0.92, dt);
  } else if (owner.team === team) {
    if (p.cutT > 0) { move(p, p.cutX, p.cutY, speed * 0.92, dt); return; }
    const sign = team === 0 ? 1 : -1;
    const x = clamp(owner.x + sign * 135, team === 0 ? 300 : 180, team === 0 ? 820 : 700);
    const y = owner.y > 280 ? 280 - cfg.spacing : 280 + cfg.spacing;
    move(p, x, clamp(y, 65, 495), speed * 0.92, dt);
  } else {
    defend(s, p, speed, dt);
  }
}

function resetPossession(s, team) {
  const left = team === 0;
  const coords = left ? [[250, 265], [380, 415], [560, 245], [680, 400]] : [[440, 245], [320, 400], [750, 265], [620, 415]];
  s.players.forEach((p, i) => { p.x = coords[i][0]; p.y = coords[i][1]; p.vx = p.vy = 0; p.action = ''; p.actionT = p.windup = p.cutT = p.contactT = p.visualT = 0; p.intent = p.visualAction = ''; });
  setOwner(s, team * 2); s.shotClock = 20; s.pendingControl = null; s.controlled = 0; s.charging = false; s.charge = 0;
}
function finishPeriod(s) {
  if (s.score[0] === s.score[1]) { s.overtime++; s.time = 20; s.resetT = 0; resetPossession(s, s.overtime % 2); cue(s, '平局！进入20秒加时赛。'); }
  else { s.state = s.score[0] > s.score[1] ? 'won' : 'lost'; s.charging = false; s.charge = 0; cue(s, s.state === 'won' ? '你赢了！拿下这片球场。' : '终场哨响，再战一场吧！'); }
}
function looseBall(s, x, y, vx, vy) { s.ball = { ...ballTemplate(), owner: null, mode: 'loose', x, y, z: 34, vx, vy, vz: 62, t: 0, lastTeam: s.ball.lastTeam, rebound: s.ball.mode === 'shot' }; for (const p of s.players) p.hasBall = false; s.pendingControl = null; assignRoles(s); }
function updateBall(s, dt) {
  const b = s.ball;
  if (b.mode === 'held') {
    const p = s.players[b.owner]; b.x = p.x + p.faceX * 16; b.y = p.y + p.faceY * 16; b.z = 10 + Math.abs(Math.sin(s.elapsed * 11)) * 11; return;
  }
  b.t += dt;
  if (b.mode === 'shot' || b.mode === 'pass') {
    const t = Math.min(1, b.t / b.duration);
    b.x = b.sx + (b.tx - b.sx) * t; b.y = b.sy + (b.ty - b.sy) * t;
    b.z = b.mode === 'shot' ? 25 * (1 - t) + 28 * t + Math.sin(Math.PI * t) * b.peak : 17 + Math.sin(Math.PI * t) * 12;
    if (b.mode === 'pass' && t > 0.12 && t < 0.98) {
      const interceptor = s.players.find(p => p.team !== b.lastTeam && dist(p, b) < 20);
      if (interceptor) { s.stats.steals[interceptor.team]++; s.stats.turnovers[b.lastTeam]++; setOwner(s, interceptor.id); s.pendingControl = null; feedback(s, 'intercept', interceptor, '截断', 0.85); cue(s, interceptor.team === 0 ? '截断传球！' : '对手截断了传球！'); return; }
    }
    if (t < 1) return;
    if (b.mode === 'pass') { const p = s.players[b.receiver]; if (dist(p, b) < 65) setOwner(s, p.id); else looseBall(s, b.x, b.y, (b.tx - b.sx) * 0.2, (b.ty - b.sy) * 0.2); return; }
    if (b.made) {
      s.score[b.lastTeam] += b.points; s.stats.makes[b.lastTeam]++; s.resetTeam = 1 - b.lastTeam; s.resetT = 0.8;
      const scorer = s.players[b.shooter]; scorer.visualAction = 'celebrate'; scorer.visualT = 0.8;
      feedback(s, 'score', scorer, `+${b.points}`, 1.05); feedback(s, 'celebrate', scorer, '', 0.8);
      b.mode = 'scored'; b.z = 4; assignRoles(s); cue(s, `${b.lastTeam === 0 ? '你方得分' : s.level.opponent} +${b.points}!`);
    } else { feedback(s, 'miss', s.players[b.shooter], '弹框', 0.7); const angle = random(s) * Math.PI * 2; const speed = 105 + random(s) * 85; looseBall(s, b.tx, b.ty, Math.cos(angle) * speed, Math.sin(angle) * speed); cue(s, '投篮弹框！快抢篮板。'); }
    if (s.time <= 0) finishPeriod(s);
    return;
  }
  if (b.mode === 'loose') {
    b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= Math.pow(0.25, dt); b.vy *= Math.pow(0.25, dt); b.vz -= 260 * dt; b.z += b.vz * dt;
    if (b.z < 0) { b.z = 0; b.vz = Math.abs(b.vz) * 0.4; }
    if (b.x < 30 || b.x > 970) { b.x = clamp(b.x, 30, 970); b.vx *= -0.65; }
    if (b.y < 30 || b.y > 530) { b.y = clamp(b.y, 30, 530); b.vy *= -0.65; }
    if (b.t > 0.18 && b.z < 27) {
      const candidates = s.players.filter(p => dist(p, b) < 31).sort((a, c) => dist(a, b) - dist(c, b) || a.id - c.id);
      if (candidates.length) setOwner(s, candidates[0].id, b.rebound);
    }
  }
}

function fixedStep(s, controls) {
  const dt = FIXED_DT; s.tick++; s.elapsed += dt; s.messageT = Math.max(0, s.messageT - dt);
  s.feedback = s.feedback.filter(e => (e.ttl = Math.max(0, e.ttl - dt)) > 0);
  for (const p of s.players) {
    p.visualT = Math.max(0, p.visualT - dt); if (p.visualT === 0) p.visualAction = '';
    p.contactT = Math.max(0, p.contactT - dt); p.cutT = Math.max(0, p.cutT - dt);
  }
  if (s.resetT > 0) { s.resetT -= dt; if (s.resetT <= 0) resetPossession(s, s.resetTeam); return; }
  s.time = Math.max(0, s.time - dt);
  const cp = s.players[s.controlled];
  const shootHeld = !!controls.shoot;
  if (shootHeld && s.ball.owner === cp.id) { if (!s.charging) s.charge = 0; s.charging = true; s.charge = Math.min(1, s.charge + dt / 0.82); }
  if (!shootHeld && s.lastShoot && s.charging) shoot(s, cp.id, s.charge);
  s.lastShoot = shootHeld;
  if (s.ball.owner !== cp.id) { s.charging = false; s.charge = 0; }
  assignRoles(s);
  for (const p of s.players) {
    p.cooldown = Math.max(0, p.cooldown - dt); p.actionT = Math.max(0, p.actionT - dt); if (p.actionT === 0 && p.action) { if (p.action === 'shoot' || p.action === 'layup') feedback(s, 'land', p, '', 0.25); p.action = ''; }
    if (p.hasBall) p.hold += dt;
    if (p.windup > 0) {
      p.windup -= dt;
      if (p.windup <= 0) { const intent = p.intent; p.intent = ''; if (intent === 'steal') resolveSteal(s, p); if (intent === 'shoot') { const accuracy = p.team === 0 ? 0.66 : s.level.accuracy; const error = (random(s) * 2 - 1) * (1 - accuracy) * 0.6; shoot(s, p.id, clamp(0.65 + error, 0, 1)); } }
    }
    if (p.id === s.controlled) {
      let x = Number(controls.x) || 0, y = Number(controls.y) || 0; if (!Number.isFinite(x)) x = 0; if (!Number.isFinite(y)) y = 0; const mag = Math.hypot(x, y); if (mag > 1) { x /= mag; y /= mag; }
      const speed = 185 * (s.charging ? 0.43 : 1) * (p.action === 'steal' ? 0.35 : 1);
      p.vx = x * speed; p.vy = y * speed; if (mag > 0.01) { p.faceX = x / Math.max(1, Math.hypot(x, y)); p.faceY = y / Math.max(1, Math.hypot(x, y)); }
    } else ai(s, p, dt);
    p.x = clamp(p.x + p.vx * dt, 30, 970); p.y = clamp(p.y + p.vy * dt, 30, 530);
  }
  // Symmetric soft body collision. No player may pass through another player.
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = s.players[i], b = s.players[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 34 && a.team !== b.team) {
      for (const p of [a, b]) if (p.contactT <= 0 && (Math.hypot(p.vx, p.vy) > 40 || p.hasBall)) { feedback(s, 'blocked', p, p.hasBall ? '受阻' : '', 0.35); p.contactT = 0.7; }
    }
    if (d < 34) { const nx = d > 0.001 ? dx / d : 1, ny = d > 0.001 ? dy / d : 0, shift = (34 - d) / 2; a.x -= nx * shift; a.y -= ny * shift; b.x += nx * shift; b.y += ny * shift; }
  }
  for (const p of s.players) { p.x = clamp(p.x, 30, 970); p.y = clamp(p.y, 30, 530); }
  updateBall(s, dt);
  // A fumbled pass is still the same possession: chasing a loose pass must not
  // freeze its clock. A shot that touched the rim waits for rebound control.
  if (s.ball.mode === 'held' || s.ball.mode === 'pass' || (s.ball.mode === 'loose' && !s.ball.rebound)) {
    s.shotClock = Math.max(0, s.shotClock - dt);
    if (s.shotClock <= 0 && s.time > 0) { s.stats.turnovers[s.possession]++; resetPossession(s, 1 - s.possession); cue(s, '20秒进攻违例，交换球权。'); }
  }
  if (s.time <= 0 && s.ball.mode !== 'shot' && s.state === 'playing') finishPeriod(s);
  if (s.state === 'playing' && s.ball.owner === s.controlled) { const info = shootingInfo(s, s.players[s.controlled], s.charging ? s.charge : 0.65); s.shotChance = info.chance; s.shotQuality = info.quality; }
}

export function step(s, dt = FIXED_DT, controls = {}) {
  if (s.state !== 'playing') return s;
  const seconds = Number(dt); if (!Number.isFinite(seconds) || seconds <= 0) return s;
  s.accumulator += Math.min(seconds, 0.25);
  while (s.accumulator + 1e-10 >= FIXED_DT && s.state === 'playing') { s.accumulator -= FIXED_DT; fixedStep(s, controls || {}); }
  if (Math.abs(s.accumulator) < 1e-10) s.accumulator = 0;
  return s;
}
export function snapshot(s) { return JSON.parse(JSON.stringify(s)); }
