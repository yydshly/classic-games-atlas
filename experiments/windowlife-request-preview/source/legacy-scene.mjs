import { LEVELS } from './levels.mjs';

// A deliberately small, authored afternoon. No original day or save is mutated.
const STEP = .1, WALK = .3, MAX_COMMANDS = 4096;
const clone = value => JSON.parse(JSON.stringify(value));
const NOTE = { x: 7, y: 4 }, TOGETHER = { x: 6, y: 6 }, SKETCH = { x: 7, y: 7 };
const KINDS = new Set(['start', 'now', 'later', 'alone', 'pause', 'resume', 'cancel', 'close']);
const terminal = g => ['settled', 'closed'].includes(g.state);
const jointPhases = new Set(['meeting-now', 'co-creating', 'meeting-later', 'sharing']);
const job = (kind, phase, remaining, duration, target) => ({ kind, phase, remaining, duration, target });

export function createScene() {
  const room = LEVELS[1];
  return {
    version: 1, state: 'ready', phase: 'opening', choice: null, ticks: 0, time: 0, accumulator: 0,
    grid: clone(room.grid), objects: clone(room.objects),
    actors: [
      { id: 'a', name: '禾禾', color: '#d68256', ...NOTE, route: [], walkClock: 0, current: null },
      { id: 'b', name: '阿沐', color: '#6d9b92', ...SKETCH, route: [], walkClock: 0, current: null }
    ],
    request: { status: 'pending', offered: false, cancelledDuring: null },
    art: {
      note: { remaining: 4, total: 8, location: 'desk', finished: false },
      sketch: { progress: 0, total: 6, mode: 'unfinished', location: 'bench', contributors: ['b'], inkProgress: { a: 0, b: 0 } },
      share: { progress: 0, total: 6, completed: false }
    },
    message: '下午尾声。禾禾还有半页手记，阿沐的速写也差最后几笔。',
    events: [], history: []
  };
}

function event(g, text) {
  g.events.push({ time: g.time, text });
  if (g.events.length > 24) g.events.shift();
  g.message = text;
}
function floor(g, x, y) {
  return x >= 0 && y >= 0 && x < g.grid.width && y < g.grid.height &&
    !g.grid.walls.some(p => p.x === x && p.y === y) && !g.objects.some(p => p.x === x && p.y === y);
}
function path(g, from, to) {
  const queue = [{ x: from.x, y: from.y, route: [] }], seen = new Set([`${from.x},${from.y}`]);
  for (const p of queue) {
    if (p.x === to.x && p.y === to.y) return p.route;
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
      const x = p.x + dx, y = p.y + dy, key = `${x},${y}`;
      if (floor(g, x, y) && !seen.has(key)) {
        seen.add(key); queue.push({ x, y, route: [...p.route, { x, y }] });
      }
    }
  }
  throw new Error('Authored room has no route to this activity');
}
function move(g, actor, destination, kind, target) {
  actor.route = path(g, actor, destination); actor.walkClock = 0;
  actor.current = job(kind, actor.route.length ? 'walking' : 'waiting', 0, 1, target);
}
function walk(actor) {
  if (!actor.route.length) return true;
  actor.walkClock += STEP;
  if (actor.walkClock + 1e-8 >= WALK) {
    actor.walkClock -= WALK;
    Object.assign(actor, actor.route.shift());
  }
  if (!actor.route.length) { actor.walkClock = 0; actor.current.phase = 'waiting'; }
  return !actor.route.length;
}
function occupy(g, object, id) { g.objects.find(o => o.id === object).busyBy = id; }
function round(n) { return Math.round(n * 10) / 10; }
function ownActivities(g) {
  const [a, b] = g.actors;
  a.current = g.art.note.finished ? null : job('work', 'working', g.art.note.remaining, 8, 'desk');
  b.current = g.art.sketch.progress >= 6 ? job('relax', 'working', 0, 1, 'bench') : job('sketch', 'working', 6 - g.art.sketch.progress, 6, 'bench');
  occupy(g, 'desk', g.art.note.finished ? null : 'note'); occupy(g, 'bench', g.art.sketch.progress >= 6 ? null : 'sketch');
}
function workNote(g) {
  if (g.art.note.finished) return;
  g.art.note.remaining = Math.max(0, round(g.art.note.remaining - STEP));
  g.actors[0].current = job('work', 'working', g.art.note.remaining, 8, 'desk');
  if (!g.art.note.remaining) {
    g.art.note.finished = true; g.actors[0].current = null; occupy(g, 'desk', null);
    event(g, '禾禾写完了手记，把最后一页轻轻合好。');
  }
}
function sketch(g, together) {
  if (g.art.sketch.progress >= 6) return;
  g.art.sketch.progress = Math.min(6, round(g.art.sketch.progress + STEP));
  // These are concurrent drawing tracks, not a score or shares of a total.
  // Only the artist actually drawing may unlock more of their colored marks.
  g.art.sketch.inkProgress.b = g.art.sketch.progress;
  if (together) g.art.sketch.inkProgress.a = Math.min(6, round(g.art.sketch.inkProgress.a + STEP));
  if (together && !g.art.sketch.contributors.includes('a')) g.art.sketch.contributors.push('a');
  if (g.art.sketch.progress >= 6) {
    g.art.sketch.mode = together ? 'together' : g.art.sketch.contributors.includes('a') ? 'mixed' : 'solo';
    occupy(g, 'bench', null);
    event(g, together ? '两种笔色汇在同一张速写上：这一笔，是一起画的。' : g.art.sketch.mode === 'mixed' ? '阿沐独自收完最后几笔，纸上留着禾禾先前留下的笔迹。' : '阿沐独自画完了速写，把笔放在纸边。');
  }
}
function returnToDesk(g) {
  g.phase = 'returning';
  if (g.art.note.location === 'bench') g.art.note.location = 'carried';
  move(g, g.actors[0], NOTE, g.art.note.finished ? 'chat' : 'work', 'desk');
  g.actors[1].current = g.art.sketch.progress >= 6 ? job('relax', 'working', 0, 1, 'bench') : job('sketch', 'working', 6 - g.art.sketch.progress, 6, 'bench');
  occupy(g, 'desk', null); occupy(g, 'bench', g.art.sketch.progress >= 6 ? null : 'sketch');
}
function meet(g, later) {
  g.phase = later ? 'meeting-later' : 'meeting-now';
  if (later) g.art.note.location = 'carried';
  move(g, g.actors[0], TOGETHER, 'chat', 'bench');
  g.actors[1].current = job('chat', 'waiting', 6, 6, 'bench');
  occupy(g, 'desk', null); occupy(g, 'bench', later ? 'share' : 'co-create');
}
function settle(g) {
  g.state = 'settled'; g.phase = 'settled'; g.accumulator = 0;
  for (const o of g.objects) o.busyBy = null;
  for (const a of g.actors) { a.route = []; a.walkClock = 0; a.current = job('relax', 'working', 0, 1, a.id === 'a' && g.art.note.location === 'desk' ? 'desk' : 'bench'); }
  event(g, g.art.share.completed ? '一份手记，一张速写。你们把完成的小事讲给对方听。' : g.art.sketch.mode === 'together' ? '手记写完了，共同的速写也留在长座边。' : g.art.sketch.mode === 'mixed' ? '各自把手上的小事做完；先前的笔迹仍留在速写上。' : '手记和速写都完成了。两个人安静地待在同一间小屋里。');
}
export function canCancel(g) {
  return !terminal(g) && g.request.status !== 'cancelled' &&
    (jointPhases.has(g.phase) || (g.choice === 'later' && g.phase === 'separate'));
}
export function canResume(g) {
  return g.state === 'paused' && g.phase !== 'offered' && g.history.length < MAX_COMMANDS;
}
export function command(g, type) {
  if (!KINDS.has(type)) return { ok: false, message: '这项安排不存在。' };
  // One final safety-only slot preserves pause/close at the normal budget.
  // It cannot resume activity or reopen a completed scene.
  if (g.history.length >= MAX_COMMANDS &&
      !(g.history.length === MAX_COMMANDS && ['pause', 'close'].includes(type))) {
    return { ok: false, message: '本次操作记录已满，进度会保留；继续安排需重新开始这个片段。' };
  }
  let ok = true;
  if (type === 'start' && g.state === 'ready') {
    g.state = 'paused'; g.phase = 'offered'; g.request.offered = true; g.request.status = 'offered';
    ownActivities(g); event(g, '阿沐举起速写：“想一起添最后一笔吗？”时间已暂停，可以慢慢决定。');
  } else if (['now', 'later', 'alone'].includes(type) && g.phase === 'offered' && g.request.status === 'offered') {
    g.choice = type; g.state = 'playing'; g.request.status = { now: 'accepted', later: 'deferred', alone: 'declined' }[type];
    if (type === 'now') { meet(g, false); event(g, '禾禾把笔搁下，留下半页手记，走向阿沐。未写完的部分会保留。'); }
    else { g.phase = 'separate'; ownActivities(g); event(g, type === 'later' ? '先各自完成，再交换成品。阿沐继续画，禾禾继续写。' : '这次先各忙各的。不用解释，也没有谁失望地等着。'); }
  } else if (type === 'pause' && g.state === 'playing') {
    g.state = 'paused'; event(g, g.history.length >= MAX_COMMANDS ? '已暂停，走动和纸面进度都停在这里。操作记录已满，继续需重新开始这个片段。' : '已暂停，走动和纸面进度都停在这里。');
  } else if (type === 'resume' && canResume(g)) {
    g.state = 'playing'; event(g, '继续这段下午。');
  } else if (type === 'cancel' && canCancel(g)) {
    g.request.cancelledDuring = g.phase; g.request.status = 'cancelled';
    event(g, '这次共同安排取消了。已写、已画的部分保留，各自接着完成。');
    if (g.phase === 'separate') ownActivities(g);
    else returnToDesk(g);
  } else if (type === 'close' && g.state === 'settled') {
    g.state = 'closed'; event(g, '这一段下午收好了。没有排名，也不评判哪种安排更好。');
  } else ok = false;
  if (ok) g.history.push({ tick: g.ticks, type });
  return { ok, message: ok ? g.message : '现在不能执行这项安排。' };
}

function tick(g) {
  if (g.state !== 'playing') return false;
  g.ticks++; g.time = round(g.ticks * STEP);
  if (g.phase === 'meeting-now' || g.phase === 'meeting-later') {
    if (walk(g.actors[0])) {
      const later = g.phase === 'meeting-later'; g.phase = later ? 'sharing' : 'co-creating';
      if (later) g.art.note.location = 'bench';
      for (const a of g.actors) a.current = job('chat', 'working', 6 - (later ? g.art.share.progress : g.art.sketch.progress), 6, 'bench');
      event(g, later ? '两份成品放到长座边，你们轮流指给对方看。' : '坐到一起，阿沐把另一支笔递给禾禾。');
    }
  } else if (g.phase === 'co-creating') {
    sketch(g, true);
    for (const a of g.actors) a.current.remaining = 6 - g.art.sketch.progress;
    if (g.art.sketch.progress >= 6) returnToDesk(g);
  } else if (g.phase === 'sharing') {
    g.art.share.progress = Math.min(6, round(g.art.share.progress + STEP));
    for (const a of g.actors) a.current.remaining = 6 - g.art.share.progress;
    if (g.art.share.progress >= 6) { g.art.share.completed = true; settle(g); }
  } else if (g.phase === 'returning') {
    sketch(g, false);
    if (g.actors[1].current) g.actors[1].current.remaining = Math.max(0, 6 - g.art.sketch.progress);
    if (walk(g.actors[0])) {
      g.art.note.location = 'desk'; g.phase = 'separate'; ownActivities(g);
      if (g.art.note.finished && g.art.sketch.progress >= 6) settle(g);
    }
  } else if (g.phase === 'separate') {
    workNote(g); sketch(g, false);
    if (g.actors[1].current) g.actors[1].current.remaining = Math.max(0, 6 - g.art.sketch.progress);
    if (g.art.note.finished && g.art.sketch.progress >= 6) {
      if (g.choice === 'later' && g.request.status !== 'cancelled') meet(g, true); else settle(g);
    }
  }
  return true;
}
export function update(g, dt) {
  if (g.state !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  g.accumulator += Math.min(.5, dt);
  while (g.accumulator + 1e-9 >= STEP && g.state === 'playing') {
    g.accumulator = Math.max(0, g.accumulator - STEP); tick(g);
  }
  if (g.state !== 'playing') g.accumulator = 0;
}
export function summary(g) {
  const art = g.art;
  return {
    outcome: art.share.completed ? 'exchanged' : art.sketch.mode === 'together' ? 'shared-drawing' : art.sketch.mode === 'mixed' ? 'kept-mark' : 'separate-works',
    noteFinished: art.note.finished, sketchFinished: art.sketch.progress >= 6,
    sharedDrawingFinished: art.sketch.mode === 'together', exchangeFinished: art.share.completed,
    cancelled: g.request.status === 'cancelled', state: g.state
  };
}
export function snapshot(g) { return clone(g); }
export function checkpoint(g) {
  return { format: 'windowlife-request-checkpoint', version: 1, ticks: g.ticks, accumulator: g.accumulator, commands: clone(g.history) };
}
export function restore(cp) {
  try {
    if (cp?.format !== 'windowlife-request-checkpoint' || cp.version !== 1 ||
        !Number.isInteger(cp.ticks) || cp.ticks < 0 || cp.ticks > 100000 ||
        !Number.isFinite(cp.accumulator) || cp.accumulator < 0 || cp.accumulator >= STEP + 1e-8 ||
        !Array.isArray(cp.commands) || cp.commands.length > MAX_COMMANDS + 1) return null;
    const g = createScene();
    for (const c of cp.commands) {
      if (!c || Object.keys(c).sort().join(',') !== 'tick,type' || !Number.isInteger(c.tick) || c.tick < g.ticks || c.tick > cp.ticks || !KINDS.has(c.type)) return null;
      while (g.ticks < c.tick) if (!tick(g)) return null;
      if (!command(g, c.type).ok) return null;
    }
    while (g.ticks < cp.ticks) if (!tick(g)) return null;
    if (!['playing', 'paused'].includes(g.state) && cp.accumulator !== 0) return null;
    g.accumulator = cp.accumulator;
    if (g.state === 'playing' && !command(g, 'pause').ok) return null;
    return g;
  } catch { return null; }
}

// Shared movement/work primitives; the v1 command/tick/restore behavior above is unchanged.
export {event,walk,ownActivities,workNote,sketch,returnToDesk,meet,settle,occupy,round,job};
