import { FIGHTERS } from './engine.mjs?v=three-seats-dual-order-art-1';

const W = 960, H = 540, floor = 426;
const palette = { swift: ['#4abcae', '#174f57', '#e0ffec'], reach: ['#d7b66e', '#615338', '#fff1bf'], anchor: ['#bd745f', '#5b3739', '#ffe0c8'] };
function line(ctx, points, color, width = 3) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
}
function shape(ctx, points, color) {
  ctx.fillStyle = color; ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fill();
}
function backdrop(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#142638'); sky.addColorStop(.63, '#244356'); sky.addColorStop(1, '#142c39');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#36566b';
  for (let i = 0; i < 7; i++) { const x = 50 + i * 143;
    ctx.fillRect(x, 70, 12, 310); ctx.fillRect(x - 18, 94, 48, 12);
    ctx.fillStyle = '#517388'; ctx.fillRect(x + 20, 116, 94, 176); ctx.fillStyle = '#36566b'; }
  ctx.fillStyle = '#1c3447'; ctx.fillRect(0, 283, W, 105);
  shape(ctx, [[0, 83], [470, 62], [960, 83], [960, 107], [470, 86], [0, 107]], '#263f50');
  line(ctx, [[0, 108], [470, 87], [960, 108]], '#7792a0', 3);
  for (const x of [115, 845]) {
    shape(ctx, [[x - 18, 113], [x + 18, 113], [x + 15, 207], [x, 220], [x - 15, 207]], '#315467');
    line(ctx, [[x - 11, 125], [x + 11, 125], [x + 9, 197]], '#9a9b83', 3);
  }
  for (let i = 0; i < 8; i++) {
    const x = i * 145 + 36;
    ctx.fillStyle = '#142b38'; ctx.beginPath(); ctx.arc(x, 310, 27, Math.PI, 0); ctx.lineTo(x + 27, 380); ctx.lineTo(x - 27, 380); ctx.fill();
    ctx.fillStyle = '#af9b72'; ctx.fillRect(x - 8, 148, 16, 9);
    const halo = ctx.createRadialGradient(x, 169, 0, x, 169, 69);
    halo.addColorStop(0, 'rgba(250,202,126,.27)'); halo.addColorStop(1, 'rgba(250,202,126,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, 169, 69, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#486171'; ctx.fillRect(0, 368, W, H - 368);
  ctx.fillStyle = '#273f4e'; ctx.fillRect(0, floor + 4, W, H - floor);
  ctx.fillStyle = '#42616c'; ctx.fillRect(80, floor + 9, W - 160, 43);
  line(ctx, [[80, floor + 51], [W - 80, floor + 51]], '#66818a', 3);
  line(ctx, [[0, floor + 4], [W, floor + 4]], '#b9a477', 4);
  ctx.strokeStyle = 'rgba(198,211,201,.16)'; ctx.lineWidth = 2;
  for (let y = floor + 22; y < H; y += 27) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let x = 50; x < W; x += 120) { ctx.beginPath(); ctx.moveTo(x, floor + 4); ctx.lineTo(x + 74, H); ctx.stroke(); }
  ctx.fillStyle = '#b59f78'; ctx.font = '700 24px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('潮门拳社  ·  三席接力', W / 2, 54);
}
function fighter(ctx, a, team, hp, tick, reduced, close) {
  const profile = FIGHTERS[a.id], colors = palette[a.id], isEnemy = team === 'enemy';
  const breath = reduced ? 0 : Math.sin(tick * .046 + (isEnemy ? 2 : 0)) * 2;
  const walk = a.moving && a.phase === 'idle' && !a.guard && !reduced ? Math.sin(tick * .34) * 3 : 0;
  const x = a.x, y = floor + breath, dir = a.facing;
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  if (a.phase === 'stunned') ctx.rotate(-.11);
  ctx.fillStyle = 'rgba(8,20,28,.43)'; ctx.beginPath(); ctx.ellipse(0, 4, 32, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = isEnemy ? '#e29b86' : '#79dcc7'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = colors[1];
  const bulk = a.id === 'anchor' ? 27 : a.id === 'reach' ? 19 : 17;
  if (a.id === 'swift') shape(ctx, [[-12, -91], [-41 - walk, -74], [-30 - walk, -65], [-13, -69]], '#c7ebe1');
  if (a.id === 'reach') shape(ctx, [[-17, -67], [-27, -17], [-3, -28], [22, -15], [19, -72]], '#b38c5a');
  line(ctx, [[-10, -27], [-15 + walk, -5], [-27 + walk, 0]], colors[1], a.id === 'anchor' ? 13 : 10);
  line(ctx, [[11, -27], [16 - walk, -5], [27 - walk, 0]], colors[1], a.id === 'anchor' ? 13 : 10);
  shape(ctx, [[-30 + walk, -7], [-17 + walk, -8], [-13 + walk, 1], [-31 + walk, 2]], '#203b46');
  shape(ctx, [[16 - walk, -7], [31 - walk, -7], [34 - walk, 2], [13 - walk, 1]], '#203b46');
  ctx.beginPath(); ctx.moveTo(-bulk, -82); ctx.lineTo(bulk, -82);
  ctx.lineTo(bulk - 2, -28); ctx.lineTo(-bulk + 1, -28); ctx.closePath(); ctx.fill();
  ctx.fillStyle = colors[0];
  ctx.beginPath(); ctx.moveTo(-bulk, -78); ctx.lineTo(bulk, -78); ctx.lineTo(bulk + (a.id === 'reach' ? 11 : 1), -36);
  ctx.lineTo(-bulk - (a.id === 'swift' ? 8 : 1), -33); ctx.closePath(); ctx.fill();
  if (a.id === 'swift') {
    shape(ctx, [[-16, -76], [10, -76], [-18, -43], [-32, -48]], '#b9eee2');
    line(ctx, [[-23, -49], [8, -37]], '#267e7f', 4);
  }
  if (a.id === 'reach') {
    line(ctx, [[-8, -75], [-11, -31]], '#f1dbab', 5);
    line(ctx, [[17, -74], [27, -26]], '#f1dbab', 4);
    shape(ctx, [[-21, -34], [25, -34], [20, -26], [-18, -26]], '#6a5940');
  }
  if (a.id === 'anchor') {
    shape(ctx, [[-39, -83], [-18, -87], [-17, -67], [-37, -64]], '#d29479');
    shape(ctx, [[18, -87], [39, -83], [37, -64], [17, -67]], '#d29479');
    shape(ctx, [[-18, -70], [18, -70], [14, -41], [-14, -41]], '#885448');
    line(ctx, [[-16, -48], [16, -48]], '#f2c1a0', 4);
  }
  shape(ctx, [[-bulk + 5, -79], [-bulk + 16, -79], [bulk - 5, -36], [bulk - 17, -36]], isEnemy ? '#ed9c82' : '#a6eadb');
  ctx.fillStyle = '#dcbfa6'; ctx.beginPath(); ctx.arc(0, -105, a.id === 'anchor' ? 21 : 19, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = isEnemy ? '#672f36' : '#183f49';
  if (a.id === 'anchor') shape(ctx, [[-22, -124], [22, -124], [24, -104], [15, -99], [15, -111], [-15, -111], [-15, -99], [-24, -104]], ctx.fillStyle);
  else if (a.id === 'reach') shape(ctx, [[-21, -120], [16, -120], [25, -106], [2, -107], [-18, -103]], ctx.fillStyle);
  else shape(ctx, [[-20, -116], [17, -117], [18, -110], [-17, -105], [-35, -112]], ctx.fillStyle);
  ctx.fillStyle = '#21303b'; ctx.fillRect(7, -105, 4, 3);
  const prep = a.phase === 'startup', striking = a.phase === 'active';
  const defending = a.guard && a.phase === 'idle';
  const heavyWindup = prep && a.move === 'heavy';
  const extend = striking ? FIGHTERS[a.id][a.move].reach - 19 : prep ? 25 : defending ? 0 : 15;
  line(ctx, [[-bulk + 3, -70], [-bulk - 8, -54], [-bulk + 3, -47]], colors[1], 9);
  const fistX = heavyWindup ? bulk + 2 : bulk + extend - 7;
  const fistY = heavyWindup ? -111 : defending ? -85 : -58;
  line(ctx, [[bulk - 4, -69], [bulk + (heavyWindup ? 13 : prep ? -7 : 7), heavyWindup ? -87 : -61], [fistX, fistY]], colors[1], heavyWindup ? 12 : 10);
  ctx.fillStyle = '#dcbfa6'; ctx.beginPath(); ctx.arc(fistX, fistY, heavyWindup ? 9 : 7, 0, Math.PI * 2); ctx.fill();
  if (defending) {
    ctx.strokeStyle = colors[2]; ctx.lineWidth = a.id === 'anchor' ? 9 : 5;
    if (a.id === 'anchor') { line(ctx, [[29, -106], [45, -98], [45, -48], [29, -40]], colors[2], 9); }
    else if (a.id === 'reach') { line(ctx, [[36, -111], [49, -84], [43, -51]], colors[2], 5); }
    else { ctx.beginPath(); ctx.arc(27, -73, 29, -.98, 1.12); ctx.stroke(); }
  }
  if (prep || striking) {
    const reach = FIGHTERS[a.id][a.move].reach;
    if (prep) { ctx.fillStyle = 'rgba(247,202,121,.16)'; ctx.fillRect(30, -76, reach - 30, 37); }
    ctx.strokeStyle = prep ? 'rgba(247,202,121,.72)' : 'rgba(245,245,206,.92)';
    ctx.lineWidth = a.move === 'heavy' ? 7 : 4; ctx.beginPath(); ctx.moveTo(30, -58); ctx.lineTo(reach, -58); ctx.stroke();
    ctx.fillStyle = prep ? '#ffd891' : '#fff6d1'; ctx.beginPath(); ctx.arc(reach, -58, a.move === 'heavy' ? 7 : 5, 0, Math.PI * 2); ctx.fill();
  }
  if (a.phase === 'stunned') {
    line(ctx, [[-25, -116], [13, -55]], 'rgba(255,234,191,.8)', 5);
    line(ctx, [[-35, -99], [24, -34]], 'rgba(255,234,191,.48)', 3);
  }
  ctx.restore();
  ctx.fillStyle = '#101f2b'; ctx.fillRect(x - 34, y - 145, 68, 8);
  ctx.fillStyle = isEnemy ? '#df8b7a' : '#75d9c7'; ctx.fillRect(x - 33, y - 144, 66 * hp / profile.maxHp, 6);
  ctx.fillStyle = '#fff7e7'; ctx.font = '700 22px system-ui';
  ctx.textAlign = close ? isEnemy ? 'left' : 'right' : 'center';
  const labelX = close ? isEnemy ? Math.min(W - 100, x + 12) : Math.max(100, x - 12) : x;
  ctx.fillText(`${isEnemy ? '对方' : '己方'} · ${profile.name}`, labelX, y - 153);
}
function groundCue(ctx, a) {
  if (a.phase !== 'startup') return;
  const length = FIGHTERS[a.id][a.move].reach;
  ctx.save(); ctx.translate(a.x, floor); ctx.scale(a.facing, 1);
  ctx.fillStyle = a.side === 'enemy' ? 'rgba(255,198,116,.48)' : 'rgba(124,218,195,.43)';
  ctx.beginPath(); ctx.moveTo(24, -6); ctx.lineTo(length, -6); ctx.lineTo(length, -22); ctx.lineTo(24, -22); ctx.fill();
  ctx.fillStyle = a.side === 'enemy' ? '#ffcc82' : '#a1ead7';
  ctx.fillRect(length - 3, -24, 6, 23); ctx.restore();
}
function departing(ctx, g, reduced) {
  const changing = g.status === 'between' || (g.status === 'paused' && g.resumeStatus === 'between');
  if (!changing) return;
  const progress = 1 - g.between / 1.05;
  if (reduced && progress >= .5) return;
  for (const a of g.departed ?? []) {
    ctx.save(); ctx.globalAlpha = reduced ? .45 : Math.max(0, .52 * (1 - progress * 2));
    ctx.translate(a.x + (reduced ? 0 : (a.side === 'player' ? -55 : 55) * progress), floor + (reduced ? 0 : 8 * progress));
    if (!reduced) ctx.rotate(a.side === 'player' ? -.17 : .17);
    const colors = palette[a.id];
    ctx.fillStyle = colors[1]; ctx.fillRect(-21, -76, 42, 48);
    ctx.fillStyle = colors[0]; ctx.fillRect(-17, -72, 34, 36);
    ctx.fillStyle = '#dcbfa6'; ctx.beginPath(); ctx.arc(0, -103, 19, 0, Math.PI * 2); ctx.fill();
    line(ctx, [[-14, -29], [-25, -3], [24, -3], [13, -29]], colors[1], 9);
    ctx.fillStyle = '#f3dcc0'; ctx.font = '700 20px system-ui'; ctx.textAlign = 'center'; ctx.fillText('退场', 0, -137);
    ctx.restore();
  }
}
export function render(canvas, g, options = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), ctx = canvas.getContext('2d');
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); backdrop(ctx);
  const p = g.actors.player, e = g.actors.enemy;
  groundCue(ctx, p); groundCue(ctx, e);
  departing(ctx, g, options.reduced);
  const close = Math.abs(p.x - e.x) < 145;
  const changing = g.status === 'between' || (g.status === 'paused' && g.resumeStatus === 'between');
  const waiting = changing && g.between > .525;
  if (g.active.player < 3 && !(waiting && g.departed?.some(a => a.side === 'player'))) fighter(ctx, p, 'player', g.teams.player[g.active.player].hp, g.tick, options.reduced, close);
  if (g.active.enemy < 3 && !(waiting && g.departed?.some(a => a.side === 'enemy'))) fighter(ctx, e, 'enemy', g.teams.enemy[g.active.enemy].hp, g.tick, options.reduced, close);
  if (g.status === 'between') {
    ctx.fillStyle = 'rgba(10,24,33,.78)'; ctx.fillRect(280, 180, 400, 96);
    ctx.fillStyle = '#f5dfaa'; ctx.textAlign = 'center'; ctx.font = '700 27px system-ui';
    ctx.fillText('下一席入场', W / 2, 232);
  }
  if (g.lastHit && g.tick - g.lastHit.tick < 10) {
    const x = g.lastHit.x, y = floor - 78;
    line(ctx, [[x - 18, y - 10], [x - 4, y + 3]], g.lastHit.blocked ? '#a8ddcf' : '#ffe1a9', 4);
    line(ctx, [[x + 14, y - 12], [x + 4, y + 3]], g.lastHit.blocked ? '#a8ddcf' : '#ffe1a9', 4);
    ctx.fillStyle = g.lastHit.blocked ? '#bfe5d6' : '#ffe0ad'; ctx.textAlign = 'center'; ctx.font = '700 20px system-ui';
    ctx.fillText(g.lastHit.blocked ? '挡' : `−${g.lastHit.damage}`, x, y);
  }
  if (g.status === 'won' || g.status === 'lost') {
    ctx.fillStyle = 'rgba(10,25,34,.72)'; ctx.fillRect(246, 116, 468, 120);
    ctx.fillStyle = g.status === 'won' ? '#f4d497' : '#e8b1a0'; ctx.textAlign = 'center';
    ctx.font = '800 35px system-ui'; ctx.fillText(g.status === 'won' ? '三席守成' : '擂台失守', W / 2, 166);
    ctx.font = '22px system-ui'; ctx.fillText('可重试本场，或重新排定顺序', W / 2, 202);
  }
}
