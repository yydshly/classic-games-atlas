// Original code-native art for 栖窗日常. No external assets or fonts.
export const SCENE_WIDTH = 900;
export const SCENE_HEIGHT = 650;
const INK = '#504535';
const ACTIONS = { cook: '烹煮', eat: '用餐', sleep: '休息', wash: '洗漱', work: '专注', relax: '放松', chat: '交谈', dinner: '共餐' };
const TYPES = { stove: '灶台', bed: '小床', basin: '洗漱台', desk: '书桌', bench: '双人座' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function gridInfo(g) {
  if (Array.isArray(g.grid)) return { width: g.grid[0]?.length || 11, height: g.grid.length || 9, wall: (x, y) => g.grid[y]?.[x] === '#' };
  const grid = g.grid || { width: 11, height: 9, walls: [] };
  const walls = new Set((grid.walls || []).map(p => p.x + ',' + p.y));
  return { width: grid.width || 11, height: grid.height || 9, wall: (x, y) => walls.has(x + ',' + y) };
}

export function layout(g) {
  const grid = gridInfo(g);
  const tile = Math.min(70, 714 / grid.width, 480 / grid.height);
  const width = tile * grid.width, height = tile * grid.height;
  const left = (SCENE_WIDTH - width) / 2;
  const top = 102 + (480 - height) / 2;
  return { width: SCENE_WIDTH, height: SCENE_HEIGHT, tile, left, top, gridWidth: grid.width, gridHeight: grid.height,
    roomWidth: width, roomHeight: height,
    point(x, y) { return { x: left + (x + .5) * tile, y: top + (y + .5) * tile }; } };
}

// Sleep is a real furniture action: show its pose on the occupied bed, rather
// than on the adjacent pathfinding stand. This never changes model coordinates.
function actorPoint(g, a, l) {
  if (a.current?.phase === 'working' && a.current.kind === 'sleep') {
    const bed = (g.objects || []).find(o => o.id === a.current.target && o.type === 'bed');
    if (bed) return l.point(bed.x, bed.y);
  }
  return l.point(a.x, a.y);
}

export function hitTest(g, x, y) {
  const l = layout(g), t = l.tile;
  for (const a of [...(g.actors || [])].reverse()) {
    const p = actorPoint(g, a, l);
    if (((x - p.x) / (t * .32)) ** 2 + ((y - p.y + t * .13) / (t * .48)) ** 2 <= 1) return { type: 'actor', id: a.id, actor: a };
  }
  for (const o of [...(g.objects || [])].reverse()) {
    const p = l.point(o.x, o.y);
    if (Math.abs(x - p.x) < t * .49 && y > p.y - t * .61 && y < p.y + t * .46) return { type: 'object', id: o.id, object: o };
  }
  const gx = Math.floor((x - l.left) / t), gy = Math.floor((y - l.top) / t);
  if (gx >= 0 && gx < l.gridWidth && gy >= 0 && gy < l.gridHeight) return { type: 'floor', x: gx, y: gy };
  return null;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = SCENE_WIDTH;
    this.canvas.height = SCENE_HEIGHT;
  }
  layout(g) { return layout(g); }
  hitTest(g, x, y) { return hitTest(g, x, y); }
  draw(g, clockSec = 0, options = {}) {
    const c = this.ctx, l = layout(g), t = l.tile;
    const clock = g.state === 'playing' ? clockSec : 0;
    c.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    c.lineJoin = 'round'; c.lineCap = 'round';
    background(c, l, g);
    floor(c, l, g);
    decor(c, l, g);
    const entities = [...(g.objects || []).map(o => ({ y: o.y, o })), ...(g.actors || []).map(a => ({ y: (actorPoint(g,a,l).y-l.top)/t + .19, a }))].sort((a, b) => a.y - b.y);
    for (const e of entities) {
      if (e.o) {
        const o = e.o, p = l.point(o.x, o.y);
        c.save(); c.translate(p.x, p.y); c.scale(t / 64, t / 64);
        furniture(c, o, g, clock, options.selectedObject === o.id);
        c.restore();
      } else {
        const a = e.a, p = actorPoint(g, a, l);
        c.save(); c.translate(p.x, p.y); c.scale(t / 64, t / 64);
        resident(c, a, g, clock, options.selectedActor === a.id);
        c.restore();
      }
    }
    // Labels are painted last, so both residents remain readable behind tall furniture.
    for (const a of g.actors || []) {
      const p = actorPoint(g, a, l);
      c.save(); c.translate(p.x, p.y); c.scale(t / 64, t / 64);
      actorLabel(c, a, g, options.selectedActor === a.id);
      c.restore();
    }
    foreground(c, l, g);
  }
}

function rr(c, x, y, w, h, r, fill, stroke, sw = 1) {
  c.beginPath(); c.roundRect(x, y, w, h, r); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = sw; c.stroke(); }
}
function ellipse(c, x, y, rx, ry, fill, stroke, sw = 1) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = sw; c.stroke(); }
}
function line(c, points, color, width = 2) {
  c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function poly(c, points, fill, stroke) {
  c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.stroke(); }
}
function text(c, s, x, y, size = 12, color = INK, weight = '500', align = 'center') {
  c.font = weight + ' ' + size + 'px system-ui, -apple-system, "Microsoft YaHei", sans-serif'; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(s, x, y);
}

function background(c, l, g) {
  const bg = c.createLinearGradient(0, 0, 0, 650); bg.addColorStop(0, '#f0e8d7'); bg.addColorStop(1, '#e2dbc9'); c.fillStyle = bg; c.fillRect(0, 0, 900, 650);
  // Original paper grain, deterministic and independent of gameplay.
  for (let i = 0; i < 160; i++) { const x = (i * 173.31) % 900, y = (i * 97.71) % 650; c.fillStyle = i % 2 ? '#fff5' : '#9b8d6b0b'; c.fillRect(x, y, 2, 1); }
  ellipse(c, 452, l.top + l.roomHeight + 17, l.roomWidth * .55, 32, '#84745617');
  rr(c, l.left - 14, l.top - 20, l.roomWidth + 28, l.roomHeight + 35, 10, '#b8a58b');
  rr(c, l.left - 9, l.top - 25, l.roomWidth + 18, l.roomHeight + 35, 8, '#d6c6aa');
  text(c, '栖 窗 日 常', 80, 43, 19, '#73624d', '650', 'left');
  text(c, '一屋 · 两人 · 三段日常', 80, 68, 11, '#9c8870', '500', 'left');
  const level = Number(g.level) || 1;
  rr(c, 718, 30, 102, 43, 6, '#faf5e9', '#d6c9b0');
  text(c, 'DAY ' + String(level).padStart(2, '0'), 769, 46, 11, '#a1734b', '750');
  text(c, ['初来小屋', '各有安排', '一起晚餐'][level - 1] || '窗边生活', 769, 62, 10, '#7f725d');
}

function floor(c, l, g) {
  const grid = gridInfo(g), t = l.tile;
  rr(c, l.left, l.top, l.roomWidth, l.roomHeight, 3, '#dfcca7');
  for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) {
    const px = l.left + x * t, py = l.top + y * t;
    if (grid.wall(x, y)) continue;
    c.fillStyle = ['#e9d6b3', '#e4ceaa', '#ead8b9', '#e6d1ae'][(x * 7 + y * 3) % 4]; c.fillRect(px + .5, py + .5, t - 1, t - 1);
    // Floorboards, quiet enough that paths and actors stay visible.
    for (let j = 1; j < 4; j++) line(c, [[px, py + j * t / 4], [px + t, py + j * t / 4]], '#bba17c24', .8);
    line(c, [[px + t * .27, py + t * .37], [px + t * .67, py + t * .37]], '#ae956d17', 1);
  }
  // Walls are cut low on the near edge so characters and destinations remain visible.
  for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) if (grid.wall(x, y)) {
    const px = l.left + x * t, py = l.top + y * t;
    const high = y === 0 ? 23 : 9;
    rr(c, px, py - high, t + 1, t + high, 1, '#e0ddca');
    c.fillStyle = '#b9b69d'; c.fillRect(px, py + t - 5, t + 1, 5);
    c.fillStyle = '#f3efdf'; c.fillRect(px, py - high, t + 1, 5);
    if (y > 0 && x !== 0 && x !== grid.width - 1) line(c, [[px + 1, py + 6], [px + t - 1, py + 6]], '#c7c5af', 1);
  }
  // Thin front cutaway edge.
  line(c, [[l.left, l.top + l.roomHeight], [l.left + l.roomWidth, l.top + l.roomHeight]], '#a38e6e', 3);
}

function decor(c, l, g) {
  const t = l.tile;
  // Window is part of the back wall, never an interactable object.
  const wx = l.left + l.roomWidth * .5, wy = l.top - 9;
  rr(c, wx - 61, wy - 30, 122, 43, 5, '#ad9474'); rr(c, wx - 56, wy - 26, 112, 34, 2, '#acd0c7');
  poly(c, [[wx - 54, wy + 6], [wx - 4, wy - 24], [wx + 22, wy - 24], [wx - 28, wy + 6]], '#e3f2d977');
  line(c, [[wx, wy - 26], [wx, wy + 9]], '#f5e9cf', 4); line(c, [[wx - 56, wy - 8], [wx + 56, wy - 8]], '#f5e9cf', 3);
  rr(c, wx - 66, wy + 9, 132, 8, 2, '#b08e65');
  // Sheer sunlight across the actual floor, clipped inside the house footprint.
  c.save(); c.beginPath(); c.rect(l.left + 3, l.top + 4, l.roomWidth - 6, l.roomHeight - 8); c.clip();
  const glow = c.createLinearGradient(wx, l.top, wx + 120, l.top + 240); glow.addColorStop(0, '#fff8cf66'); glow.addColorStop(1, '#fff7c900');
  poly(c, [[wx - 48, l.top], [wx + 44, l.top], [wx + 186, l.top + 280], [wx - 18, l.top + 280]], glow);
  c.restore();
  // A woven rug under the shared seat signals a gathering area without inventing a goal.
  const bench = (g.objects || []).find(o => o.type === 'bench');
  if (bench) {
    const p = l.point(bench.x, bench.y);
    rr(c, p.x - t * .68, p.y - t * .43, t * 1.36, t * 1.24, t * .1, '#b7b7a0aa');
    rr(c, p.x - t * .62, p.y - t * .37, t * 1.24, t * 1.12, t * .07, null, '#e6dfbe', 2);
    for (let i = 0; i < 8; i++) line(c, [[p.x - t * .55 + i * t * .16, p.y + t * .79], [p.x - t * .55 + i * t * .16, p.y + t * .85]], '#9a9f85', 1);
  }
  // Two potted plants sit outside the playable footprint; no false furniture affordance.
  plant(c, l.left - 34, l.top + l.roomHeight - 11, .8);
  plant(c, l.left + l.roomWidth + 30, l.top + 38, 1);
}

function plant(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  ellipse(c, 0, 10, 17, 6, '#77624715');
  poly(c, [[-12, -2], [12, -2], [9, 15], [-9, 15]], '#c38e6b'); ellipse(c, 0, -2, 12, 4, '#e0b38d');
  line(c, [[0, -2], [-1, -29]], '#627f58', 3);
  for (const [x1, y1, r] of [[-8, -18, -.65], [8, -25, .6], [-6, -31, -.45], [3, -38, .25]]) { c.save(); c.translate(x1, y1); c.rotate(r); ellipse(c, 0, 0, 6, 12, y1 < -25 ? '#7f9b6b' : '#6c8e62'); line(c, [[0, 6], [0, -5]], '#a9ba8c', 1); c.restore(); }
  c.restore();
}

function furniture(c, o, g, clock, selected) {
  ellipse(c, 1, 17, 29, 12, '#69584020');
  if (selected) rr(c, -32, -34, 64, 61, 9, '#fff9d144', '#ad8149', 2.5);
  const workers = (g.actors || []).filter(a => a.current?.target === o.id && a.current.phase === 'working');
  const active = workers.length > 0;
  if (o.type === 'stove') {
    rr(c, -27, -21, 54, 44, 4, '#d8b696', '#ad886a'); rr(c, -27, -28, 54, 35, 4, '#f1dfc0', '#bba17d');
    rr(c, -23, 8, 46, 12, 2, '#b89370'); rr(c, -19, 9, 38, 8, 2, '#dcc3a1'); line(c, [[-6, 13], [6, 13]], '#95795d', 2);
    ellipse(c, -10, -12, 12, 9, '#7d7564'); ellipse(c, -10, -13, 8, 6, '#b9b9a1'); line(c, [[1, -10], [12, -7]], '#6e6655', 4);
    ellipse(c, 16, -17, 6, 5, '#b6ad91'); ellipse(c, 16, -17, 3, 2, '#8c876d');
    for (const x of [-17, -5, 7, 19]) ellipse(c, x, 3, 2, 2, '#8a735b');
    if (active && workers.some(a => a.current.kind === 'cook')) {
      ellipse(c, -10, -13, 7, 4, '#e9c472');
      for (let i = 0; i < 3; i++) { const k = (clock * .6 + i * .34) % 1; line(c, [[-17 + i * 7, -25 - k * 10], [-19 + i * 7, -31 - k * 10], [-15 + i * 7, -36 - k * 10]], '#fffae8' + (k > .8 ? '66' : 'bb'), 2); }
    }
    if (g.meals > 0) { ellipse(c, 14, -2, 10, 6, '#faf1da', '#bfa784'); ellipse(c, 14, -3, 6, 3, '#cd965f'); if (g.meals > 1) ellipse(c, 18, -8, 3, 2, '#819667'); }
  } else if (o.type === 'bed') {
    rr(c, -23, -34, 46, 59, 4, '#a87f59'); rr(c, -26, -35, 52, 10, 4, '#ba916a');
    rr(c, -20, -25, 40, 48, 5, '#f8edce'); rr(c, -17, -22, 34, 15, 5, '#fff8e6', '#dbcdb4');
    rr(c, -21, -5, 42, 31, 4, '#91ac9d', '#779b8d'); rr(c, -21, -5, 42, 7, 2, '#b5c6af');
    for (let x = -14; x <= 14; x += 14) line(c, [[x, 7], [x, 23]], '#c2d1b74d', 1);
    line(c, [[-18, 27], [-18, 31]], '#936b49', 3); line(c, [[18, 27], [18, 31]], '#936b49', 3);
  } else if (o.type === 'basin') {
    rr(c, -24, -18, 48, 40, 5, '#b5c6bb', '#8caaa0'); rr(c, -27, -25, 54, 32, 5, '#ece7d7', '#b5b9a6');
    ellipse(c, 0, -9, 18, 11, '#b4c9c1', '#9bb4ac'); ellipse(c, 0, -8, 13, 7, '#d8e6dc'); ellipse(c, 0, -6, 2, 1.5, '#91a69c');
    line(c, [[1, -21], [1, -31], [9, -31], [9, -25]], '#91a4a0', 4); line(c, [[-16, 12], [-7, 12]], '#738f83', 2); line(c, [[7, 12], [16, 12]], '#738f83', 2);
    rr(c, 18, -31, 7, 13, 2, '#c5a178'); rr(c, 19, -34, 5, 4, 1, '#937c5c');
    if (active) { line(c, [[9, -23], [9, -9]], '#f1fcf2', 2); for (let i = 0; i < 3; i++) ellipse(c, -8 + i * 9, -8 + Math.sin(clock * 6 + i) * 2, 3, 1, null, '#fff8df', 1); }
  } else if (o.type === 'desk') {
    for (const x of [-24, 24]) line(c, [[x, 3], [x, 24]], '#aa805c', 4);
    rr(c, -31, -26, 62, 34, 4, '#c2996b', '#a78056'); rr(c, -30, 5, 60, 5, 1, '#ad8359');
    poly(c, [[-10, -21], [15, -19], [15, 1], [-10, -1]], '#fbefd0', '#cfbd97');
    line(c, [[-6, -15], [10, -14]], '#b2b69a', 1); line(c, [[-6, -10], [8, -9]], '#b2b69a', 1); line(c, [[-6, -5], [5, -4]], '#b2b69a', 1);
    rr(c, -26, -20, 11, 22, 2, '#789188'); line(c, [[-24, -18], [-24, 0]], '#adc1af', 1);
    ellipse(c, 23, -19, 7, 4, '#dbb68a'); line(c, [[23, -20], [23, -36], [17, -39]], '#7c8c6c', 3); poly(c, [[12, -41], [24, -41], [27, -33], [9, -33]], '#a7ad7a');
    if (active) { line(c, [[-3, -2], [10, -15]], '#bd8754', 2); ellipse(c, 9, -14, 2, 1.5, '#f2ce8b'); }
  } else if (o.type === 'bench') {
    rr(c, -31, -27, 62, 26, 7, '#809a8c', '#667e70'); rr(c, -31, -9, 62, 29, 6, '#a1b4a1', '#7c9685');
    rr(c, -27, -7, 25, 21, 4, '#b5c3ab'); rr(c, 2, -7, 25, 21, 4, '#b5c3ab');
    rr(c, -36, -17, 9, 34, 4, '#b48e65'); rr(c, 27, -17, 9, 34, 4, '#b48e65');
    line(c, [[-25, 21], [-25, 27]], '#9b764e', 4); line(c, [[25, 21], [25, 27]], '#9b764e', 4);
    rr(c, -23, -23, 16, 13, 3, '#d1b98a'); line(c, [[-21, -20], [-10, -12]], '#bca16b', 1);
    if (active && workers.some(a => ['eat', 'dinner'].includes(a.current.kind))) {
      ellipse(c, 0, 22, 20, 7, '#c59e6a'); ellipse(c, -8, 19, 8, 4, '#fbf0d2', '#cdb997'); ellipse(c, -8, 18, 5, 2, '#d29b63');
      if (workers.length > 1) { ellipse(c, 9, 23, 8, 4, '#fbf0d2', '#cdb997'); ellipse(c, 9, 22, 5, 2, '#d29b63'); }
    }
  } else rr(c, -24, -24, 48, 48, 5, '#c4b692', '#9a8e74');
  if (selected) {
    rr(c, -28, 31, 56, 17, 6, '#fff9e9', '#d6c49e'); text(c, o.name || TYPES[o.type] || o.type, 0, 39, 10, '#876443', '650');
  }
}

function resident(c, a, g, clock, selected) {
  const cur = a.current, kind = cur?.kind, working = cur?.phase === 'working';
  const moving = cur?.phase === 'walking' && g.state === 'playing';
  const waiting = cur?.phase === 'waiting';
  const b = a.id === 'b';
  const shirt = a.color || (b ? '#6d9b92' : '#d68256'), dark = b ? '#4f6b68' : '#795e4a';
  const swing = moving ? Math.sin(clock * 12) * 4 : 0;
  const bob = moving ? Math.abs(Math.sin(clock * 12)) * 1.5 : 0;
  const idle = g.state === 'playing' && working ? Math.sin(clock * 3) : 0;
  ellipse(c, 0, 14, 17, 7, '#53463726');
  if (selected) { ellipse(c, 0, 13, 21, 10, '#fff5b326', '#a8844b', 2); line(c, [[-25, 12], [-21, 12]], '#a8844b', 2); line(c, [[21, 12], [25, 12]], '#a8844b', 2); }
  c.save(); c.translate(0, -bob);
  if (working && kind === 'sleep') {
    c.save(); c.rotate(-.28); rr(c, -17, -12, 34, 23, 9, shirt); ellipse(c, -15, -13, 10, 10, '#edc4a0'); hair(c, -16, -17, b); line(c, [[-20, -12], [-16, -11]], '#675647', 1.2); rr(c, -5, -12, 24, 24, 3, '#b9c9b4'); c.restore();
    text(c, 'z', 16, -29, 11, '#879982', '600'); text(c, 'z', 23, -38, 8, '#9cac95');
    c.restore(); return;
  }
  // Two different silhouettes: short warm sweater / tall cool overalls.
  line(c, [[-5, 6], [-7 + swing, 16]], dark, 6); line(c, [[5, 6], [7 - swing, 16]], dark, 6);
  ellipse(c, -7 + swing, 17, 5, 2.6, '#5a5144'); ellipse(c, 7 - swing, 17, 5, 2.6, '#5a5144');
  rr(c, -12, b ? -19 : -17, 24, b ? 29 : 26, b ? 6 : 8, shirt);
  if (b) { rr(c, -8, -12, 16, 20, 3, '#67847d'); line(c, [[-7, -17], [-6, -8]], '#d9d8ba', 2); line(c, [[7, -17], [6, -8]], '#d9d8ba', 2); rr(c, -5, -5, 10, 6, 2, '#94aca1'); }
  else { line(c, [[-9, 3], [9, 3]], '#c26f49', 2); rr(c, -3, -12, 6, 9, 2, '#edc08c'); }
  let armL = [-15, -2 - swing * .6], armR = [15, -2 + swing * .6];
  if (working) {
    if (['cook', 'wash', 'work'].includes(kind)) { armL = [-10, -13 + idle]; armR = [10, -14 - idle]; }
    if (['eat', 'dinner'].includes(kind)) { armL = [-14, -5]; armR = [7, -22 + idle]; }
    if (kind === 'relax') { armL = [-20, -12]; armR = [20, -12]; }
    if (kind === 'chat') { armL = [-13, -2]; armR = [19, -24 + idle * 2]; }
  }
  line(c, [[-10, -12], armL], shirt, 7); line(c, [[10, -12], armR], shirt, 7);
  ellipse(c, armL[0], armL[1], 3.5, 3.5, '#edc4a0'); ellipse(c, armR[0], armR[1], 3.5, 3.5, '#edc4a0');
  ellipse(c, 0, -26, b ? 10 : 11, 12, '#edc4a0');
  hair(c, 0, -31, b);
  ellipse(c, -3.5, -25, 1.1, 1.4, '#5d5145'); ellipse(c, 3.5, -25, 1.1, 1.4, '#5d5145');
  line(c, [[-2, -20], [0, -19], [3, -20]], '#ba8165', 1.1); ellipse(c, -6.5, -22, 2.2, 1.4, '#d8a08166');
  if (working && ['cook', 'work'].includes(kind)) line(c, [[armR[0], armR[1]], [armR[0] + 5, armR[1] - 11]], '#92744f', 2);
  if (working && kind === 'wash') { ellipse(c, -6, -18, 4, 2, '#f7f1dd'); ellipse(c, 8, -17, 3, 2, '#f7f1dd'); }
  if (working && ['eat', 'dinner'].includes(kind)) { ellipse(c, -12, -2, 7, 3.5, '#f8efd8', '#cbb998'); line(c, [[7, -22], [5, -20]], '#8d7b61', 1.5); }
  if (waiting) { line(c, [[-6, -20], [-3, -21]], '#ad795e', 1); line(c, [[3, -21], [6, -20]], '#ad795e', 1); }
  c.restore();
}

function hair(c, x, y, b) {
  if (b) { ellipse(c, x, y - 1, 11, 9, '#5f6558'); ellipse(c, x - 8, y + 1, 4, 7, '#5f6558'); ellipse(c, x + 8, y + 1, 4, 7, '#5f6558'); line(c, [[x - 5, y - 7], [x + 1, y - 9]], '#7b8069', 2); }
  else { ellipse(c, x, y - 2, 12, 8, '#695042'); poly(c, [[x - 12, y - 2], [x - 9, y + 8], [x - 6, y + 1], [x + 3, y - 2], [x + 11, y + 5], [x + 10, y - 5]], '#695042'); ellipse(c, x + 9, y - 8, 5, 5, '#695042'); }
}

function actorLabel(c, a, g, selected) {
  const cur = a.current;
  if (selected) { rr(c, -23, 22, 46, 17, 7, '#fffae7', '#c8b58f'); text(c, a.name || a.id, 0, 30, 10, '#6e5d46', '700'); }
  if (!cur) return;
  let title = cur.phase === 'walking' ? '前往' + (ACTIONS[cur.kind] || '目的地') : cur.phase === 'waiting' ? '等待' : ACTIONS[cur.kind] || '行动中';
  const width = Math.max(48, title.length * 10 + 18);
  const fill = cur.phase === 'waiting' ? '#faf1d7' : cur.phase === 'working' ? '#f4f6e9' : '#f8f3e5';
  rr(c, -width / 2, -68, width, 21, 7, fill, cur.phase === 'waiting' ? '#c6a878' : '#bcc5aa');
  poly(c, [[-4, -47], [4, -47], [0, -42]], fill);
  text(c, title, 0, -58, 10, cur.phase === 'waiting' ? '#9b7648' : '#687b62', '650');
  if (cur.phase === 'working') {
    const p = clamp(1 - (Number(cur.remaining) || 0) / Math.max(1, Number(cur.duration) || 1), 0, 1);
    rr(c, -19, -43, 38, 3, 2, '#d5ddca'); if (p > 0) rr(c, -19, -43, 38 * p, 3, 2, '#7e9b71');
  } else if (cur.phase === 'waiting') {
    ellipse(c, 0, -38, 3, 3, null, '#ba9861', 1); line(c, [[0, -40], [0, -38], [2, -37]], '#ba9861', 1);
  }
}

function foreground(c, l, g) {
  // Footer is a quiet legend, not a fabricated progress or success message.
  const labels = { ready: '准备布置', playing: '日常进行中', paused: '时间已暂停', won: '今日目标完成', lost: '今日已结束' };
  ellipse(c, 78, 611, 3.5, 3.5, g.state === 'playing' ? '#8a9e6a' : '#b0a18a');
  text(c, labels[g.state] || '窗边小屋', 90, 611, 11, '#8b7a62', '550', 'left');
  text(c, '点击人物 · 选择家具安排日常', 820, 611, 11, '#98846a', '500', 'right');
}
