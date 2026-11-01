import { SIZE, STAGES, positions } from './engine.mjs';

const C = 720, U = C / SIZE;
const reduceDecorativeMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function rect(ctx, x, y, w, h, color, radius = 0) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
}
function path(ctx, pts, color, width) {
  ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function laneRegion(ctx, lane, row, from, to, elapsed) {
  const y = row * U, left = from * U, width = (to - from) * U;
  ctx.save(); ctx.beginPath(); ctx.rect(left, y, width, U); ctx.clip();
  if (lane.kind === 'road') {
    rect(ctx, left, y, width, U, '#303f47');
    path(ctx, [[left, y + 4], [left + width, y + 4]], '#819294', 3);
    path(ctx, [[left, y + U - 4], [left + width, y + U - 4]], '#819294', 3);
    for (let x = left + 14; x < left + width; x += 82) rect(ctx, x, y + U / 2 - 2, 40, 4, '#9ca7a0', 2);
  } else if (lane.kind === 'water') {
    const water = ctx.createLinearGradient(0, y, 0, y + U);
    water.addColorStop(0, '#1b5863'); water.addColorStop(1, '#183f54'); rect(ctx, left, y, width, U, water);
    for (let x = left - 20; x < left + width + 20; x += 90) {
      const shift = ((reduceDecorativeMotion ? 0 : elapsed * 9) + row * 13) % 45;
      path(ctx, [[x + shift, y + 17], [x + 34 + shift, y + 17]], '#79a6a0', 2);
      path(ctx, [[x + 42 - shift / 2, y + 60], [x + 67 - shift / 2, y + 60]], '#6b9da2', 2);
    }
  } else {
    rect(ctx, left, y, width, U, row === 8 ? '#526958' : '#4a6561');
    for (let col = from; col < to; col++) rect(ctx, col * U + 8, y + 8, U - 16, U - 16, '#658077', 5);
  }
  if (lane.kind === 'barrier') for (const col of lane.blocked) {
    rect(ctx, col * U + 4, y + 10, U - 8, U - 20, '#8e5f46', 7);
    rect(ctx, col * U + 11, y + 18, U - 22, 7, '#d3ad78', 3);
    rect(ctx, col * U + 11, y + 48, U - 22, 7, '#d3ad78', 3);
  }
  if (lane.kind === 'road' || lane.kind === 'water') {
    for (const p of positions(lane, elapsed)) {
      if (p.x > to || p.x + p.width < from) continue;
      const px = p.x * U + 3, w = p.width * U - 6;
      if (lane.kind === 'road') {
        rect(ctx, px + 5, y + 51, w - 10, 13, '#121f29', 6);
        rect(ctx, px, y + 15, w, 42, '#d37759', 12);
        rect(ctx, px + 10, y + 21, w - 20, 16, '#f0bd83', 5);
        rect(ctx, px + 11, y + 53, 14, 7, '#f2e3ad', 3);
        rect(ctx, px + w - 25, y + 53, 14, 7, '#f2e3ad', 3);
      } else {
        rect(ctx, px + 2, y + 22, w - 4, 47, '#172f35', 12);
        rect(ctx, px, y + 15, w, 46, '#b28c63', 11);
        for (let a = 12; a < w - 8; a += 27) rect(ctx, px + a, y + 18, 4, 39, '#d9bd8d', 2);
        rect(ctx, px + 10, y + 43, w - 20, 5, '#7e694f', 2);
      }
    }
  }
  ctx.restore();
}
export function draw(canvas, game) {
  const ctx = canvas.getContext('2d'), stage = STAGES[game.stage];
  ctx.clearRect(0, 0, C, C);
  const ground = ctx.createLinearGradient(0, 0, C, C);
  ground.addColorStop(0, '#193b43'); ground.addColorStop(1, '#0d2734');
  rect(ctx, 0, 0, C, C, ground);
  for (let row = 0; row < SIZE; row++) {
    const lane = stage.lanes[row] ?? { kind: 'safe' }, y = row * U;
    if (row === 0) {
      rect(ctx, 0, y, C, U, '#34565a');
      for (let x = 0; x < SIZE; x++) rect(ctx, x * U + 6, y + 12, U - 12, U - 24, '#40646a', 5);
      rect(ctx, 3.5 * U, y + 7, 2 * U, U - 14, '#d5b466', 12);
      rect(ctx, 4.29 * U, y + 14, U * .42, U * .42, '#fff2ba', 6);
      ctx.fillStyle = '#233c40'; ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center'; ctx.fillText('交灯处', 4.5 * U, y + U - 14);
    } else if (lane.kind === 'split') {
      laneRegion(ctx, lane.left, row, 0, 4, game.elapsed);
      laneRegion(ctx, { kind: 'barrier', blocked: [4] }, row, 4, 5, game.elapsed);
      laneRegion(ctx, lane.right, row, 5, 9, game.elapsed);
    } else laneRegion(ctx, lane, row, 0, 9, game.elapsed);
    if (row === 8) { ctx.fillStyle = '#f3e5b9'; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.fillText('起点 · 往北送灯', C / 2, y + 48); }
    if (row > 0) path(ctx, [[0, y], [C, y]], '#9db1a344', 2);
  }
  const px = game.player.x * U, py = (game.player.row + .5) * U;
  ctx.save(); ctx.translate(px, py);
  rect(ctx, -21, 22, 42, 10, '#102b31b0', 7);
  rect(ctx, -16, -10, 31, 33, '#e4d29d', 10);
  rect(ctx, -13, -14, 24, 25, '#26506a', 7);
  rect(ctx, -14, -25, 28, 14, '#d8b66c', 7);
  rect(ctx, 15, -1, 16, 19, '#f3d88d', 4);
  rect(ctx, 19, -8, 8, 7, '#fff4b8', 3);
  ctx.restore();
  if (game.phase === 'paused' || game.phase === 'lost' || game.phase === 'won') {
    rect(ctx, 0, 0, C, C, '#10253180');
    rect(ctx, 125, 307, 470, 106, '#173a43', 16);
    ctx.fillStyle = '#fff0c7'; ctx.font = 'bold 31px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(game.phase === 'paused' ? '已暂停' : game.phase === 'won' ? '灯已送达' : '灯未送达', C / 2, 370);
  }
}
