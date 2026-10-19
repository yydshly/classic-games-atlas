import { ORIGIN } from './engine.mjs?v=paper-q2';
import { poseFor } from './sling.mjs?v=paper-q2';
export const SCALE = 34, GROUND = 420;
const load = path => { if (typeof Image === 'undefined') return null; const image = new Image(); image.src = new URL(path, import.meta.url).href; return image; };
const background = load('./assets/workshop.webp');
const guardian = load('./assets/guardian-paper.webp');
const ready = image => image?.complete && image.naturalWidth;

export function draw(ctx, g, angle, power, view = {}) {
  const scale = view.camera?.scale || SCALE, offset = view.camera?.offset || 0;
  const X = x => x * scale + offset, Y = y => GROUND - y * scale;
  ctx.clearRect(0, 0, 960, 480);
  if (ready(background)) ctx.drawImage(background, 0, 0, 960, 480);
  else { ctx.fillStyle = '#dee3cf'; ctx.fillRect(0, 0, 960, 480); }
  ctx.fillStyle = '#f8edcc22'; ctx.fillRect(0, 0, 960, GROUND);
  ctx.strokeStyle = '#806f49'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(960, GROUND); ctx.stroke();
  ctx.fillStyle = '#59674f'; ctx.font = '600 11px system-ui';
  ctx.fillText(g.level ? '02 / 越墙拆顶 · 看上层支撑' : '01 / 偏心一击 · 看左侧支撑', 22, 25);

  // Actual flight samples, not an invented full predicted trajectory.
  ctx.fillStyle = '#fff9dd';
  for (let i = 0; i < (view.trail?.length || 0); i += 2) {
    const p = view.trail[i]; ctx.globalAlpha = .22 + i / view.trail.length * .35;
    ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 2, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const anchor = { x: X(ORIGIN.x), y: Y(ORIGIN.y) };
  let pouch = poseFor(angle, power, anchor);
  // Pointer and release coordinates use the wide aiming camera only.
  if (view.pouch) pouch = view.pouch;
  const loaded = ['ready', 'aim', 'paused'].includes(g.state) && g.shots < 3 && (g.state !== 'paused' || g.resumeState !== 'flight');
  drawSling(ctx, anchor, loaded || !!view.releasing ? pouch : anchor, loaded || !!view.releasing);

  if (['aim', 'ready'].includes(g.state) && !view.releasing) {
    const radians = angle * Math.PI / 180, speed = 8 + power * .24;
    for (let t = .07; t < .46; t += .055) {
      ctx.fillStyle = '#506c43'; ctx.globalAlpha = 1 - t;
      ctx.beginPath(); ctx.arc(X(ORIGIN.x + Math.cos(radians) * speed * t),
        Y(ORIGIN.y + Math.sin(radians) * speed * t - 4.9 * t * t), 2.8, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  for (const item of g.items) {
    if (!item.body) continue;
    const point = item.body.getPosition(), x = X(point.x), y = Y(point.y);
    const w = item.w * scale, h = item.h * scale;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-item.body.getAngle());
    if (item.kind === 'shot') drawBall(ctx, 0, 0, w / 2);
    else if (item.kind === 'target') drawGuardian(ctx, item, w, h, g.tick);
    else drawMaterial(ctx, item, w, h);
    ctx.restore();
    if (item.kind === 'shot' && (y < 8 || x < 8 || x > 952)) {
      ctx.fillStyle = '#365139'; ctx.font = 'bold 12px system-ui';
      ctx.fillText(y < 8 ? '▲ 纸团在上方' : x < 8 ? '◀ 纸团' : '纸团 ▶',
        Math.max(10, Math.min(850, x - 40)), Math.max(20, Math.min(395, y)));
    }
  }
  drawEffects(ctx, g, X, Y, scale);
  if (scale > 36) {
    ctx.fillStyle = '#fff8e9e6'; ctx.fillRect(20, 445, 155, 21);
    ctx.fillStyle = '#52664b'; ctx.font = '10px system-ui'; ctx.fillText('跟进近景 · 同一真实物理场景', 29, 459);
  } else {
    ctx.fillStyle = '#6f7157'; ctx.font = '11px system-ui';
    ctx.fillText('拉住纸团，松手发射', Math.max(12, anchor.x - 55), 461);
    for (let i = 0; i < Math.max(0, 2 - g.shots); i++) drawBall(ctx, anchor.x - 47 + i * 21, 436, 7);
  }
}

function drawSling(ctx, anchor, pouch, loaded) {
  const { x, y } = anchor;
  ctx.fillStyle = '#735433'; ctx.beginPath();
  ctx.moveTo(x - 10, GROUND); ctx.lineTo(x - 7, y + 14); ctx.lineTo(x - 24, y - 13);
  ctx.lineTo(x - 16, y - 18); ctx.lineTo(x + 1, y + 4); ctx.lineTo(x + 17, y - 18);
  ctx.lineTo(x + 25, y - 13); ctx.lineTo(x + 8, y + 15); ctx.lineTo(x + 11, GROUND); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#503d2b'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = '#b8925d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 3, GROUND - 5); ctx.lineTo(x - 2, y + 22); ctx.stroke();
  ctx.strokeStyle = '#65412a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + 21, y - 14); ctx.lineTo(pouch.x, pouch.y + 2); ctx.stroke();
  if (loaded) drawBall(ctx, pouch.x, pouch.y, 9.5);
  ctx.strokeStyle = '#a77643'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x - 20, y - 14); ctx.lineTo(pouch.x - 3, pouch.y + 3); ctx.stroke();
  ctx.strokeStyle = '#493e2e'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(pouch.x - 7, pouch.y + 3); ctx.quadraticCurveTo(pouch.x, pouch.y + 10, pouch.x + 7, pouch.y + 3); ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawMaterial(ctx, item, w, h) {
  const wood = item.material === 'wood', wall = item.kind === 'obstacle';
  const gradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  gradient.addColorStop(0, wall ? '#a4a18b' : wood ? '#d6a66d' : '#ffdf88');
  gradient.addColorStop(.45, wall ? '#7e806b' : wood ? '#b9824d' : '#e5be61');
  gradient.addColorStop(1, wall ? '#606852' : wood ? '#865b36' : '#c99d47');
  ctx.fillStyle = gradient; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = wall ? '#4e5847' : wood ? '#62472f' : '#94723a'; ctx.lineWidth = 1.7;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#fff4c866'; ctx.fillRect(-w / 2 + 2, -h / 2 + 2, Math.max(0, w - 4), Math.min(4, h / 5));
  ctx.fillStyle = '#4e341b33'; ctx.fillRect(w / 2 - Math.min(5, w / 5), -h / 2, Math.min(5, w / 5), h);
  ctx.strokeStyle = wood ? '#6b4f2d55' : '#fff0ad99'; ctx.lineWidth = 1;
  if (wall) {
    for (let y = -h / 2 + 22; y < h / 2; y += 22) { ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); ctx.stroke(); }
    ctx.save(); ctx.rotate(-Math.PI / 2); ctx.fillStyle = '#f5edcd'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('固定挡墙 · 从上方越过', 0, 4); ctx.restore();
  } else if (wood) {
    const vertical = h > w;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      if (vertical) { const x = -w / 2 + w * i / 4; ctx.moveTo(x, -h / 2 + 6); ctx.bezierCurveTo(x + 3, -h / 5, x - 3, h / 5, x, h / 2 - 6); }
      else { const y = -h / 2 + h * i / 4; ctx.moveTo(-w / 2 + 6, y); ctx.bezierCurveTo(-w / 4, y + 2, w / 4, y - 2, w / 2 - 6, y); }
      ctx.stroke();
    }
    ctx.fillStyle = '#f5dda388';
    if (vertical) { ctx.fillRect(-w / 2 + 2, -h / 2 + 6, w - 4, 5); ctx.fillRect(-w / 2 + 2, h / 2 - 11, w - 4, 5); }
    else { ctx.fillRect(-w / 2 + 7, -h / 2 + 2, 5, h - 4); ctx.fillRect(w / 2 - 12, -h / 2 + 2, 5, h - 4); }
  } else {
    ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h / 2 + 2); ctx.lineTo(w / 2 - 3, h / 2 - 3); ctx.lineTo(-w / 2 + 2, h / 2 - 3); ctx.stroke();
    ctx.strokeStyle = '#9f793b77'; ctx.setLineDash([3, 3]); ctx.beginPath();
    ctx.moveTo(0, -h / 2 + 4); ctx.lineTo(0, h / 2 - 4); ctx.stroke(); ctx.setLineDash([]);
  }
  if (item.crack > .05 && !wall) {
    ctx.globalAlpha = item.crack; ctx.strokeStyle = wood ? '#4d3627' : '#fff4cf'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-w * .35, -h * .25); ctx.lineTo(w * .13, -h * .1); ctx.lineTo(-w * .12, h * .15); ctx.lineTo(w * .3, h * .32); ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (item.contactPulse > .05) { ctx.strokeStyle = `rgba(255,248,202,${item.contactPulse})`; ctx.lineWidth = 3; ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2); }
}

function drawGuardian(ctx, item, w, h, tick) {
  // The image sits inside the same rectangle as the physics fixture.
  ctx.fillStyle = '#ab5d42'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 3); ctx.fill();
  if (ready(guardian)) ctx.drawImage(guardian, guardian.width * .07, guardian.height * .05,
    guardian.width * .86, guardian.height * .9, -w / 2, -h / 2, w, h);
  else { ctx.fillStyle = '#f5dba4'; ctx.fillRect(-w * .35, -h * .3, w * .7, h * .36); }
  ctx.strokeStyle = '#754731'; ctx.lineWidth = 1.3; ctx.strokeRect(-w / 2, -h / 2, w, h);
  const blink = item.down || ((tick + item.id * 37) % 420 < 12);
  if (blink) {
    ctx.fillStyle = '#eed4a5';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * w * .2, -h * .17, w * .095, h * .045, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#674b32'; ctx.lineWidth = 1.3;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * w * .2 - w * .06, -h * .17); ctx.lineTo(side * w * .2 + w * .06, -h * .17); ctx.stroke(); }
  }
  if (item.contactPulse > .05) {
    ctx.strokeStyle = '#fff5b0'; ctx.lineWidth = 2.5; ctx.globalAlpha = item.contactPulse;
    ctx.strokeRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4); ctx.globalAlpha = 1;
    ctx.fillStyle = '#593f30'; ctx.font = `bold ${Math.max(14, w * .55)}px system-ui`; ctx.fillText('!', -4, -h / 2 - 5);
  }
  if (item.down) {
    ctx.fillStyle = '#52794c'; ctx.beginPath(); ctx.arc(w / 2 - 2, -h / 2 + 2, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#fffbe0'; ctx.font = 'bold 10px system-ui'; ctx.fillText('✓', w / 2 - 6, -h / 2 + 6);
  }
}

function drawEffects(ctx, g, X, Y, scale) {
  let pieces = 0;
  for (const event of g.events) {
    const age = (g.tick - event.tick) / 120;
    if (event.type === 'impact' && age < .2 && event.kind !== 'shot') {
      ctx.strokeStyle = event.material === 'wood' ? '#fff4c1' : '#fff9e5';
      ctx.globalAlpha = .8 * (1 - age / .2); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(event.x), Y(event.y), 4 + age * 55, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (event.type !== 'break' || age > 1.1) continue;
    const wood = event.material === 'wood';
    ctx.globalAlpha = 1 - age / 1.1;
    for (let i = 0; i < (wood ? 5 : 7) && pieces < 48; i++, pieces++) {
      const direction = i * 2.4 + (event.angle || 0), speed = Math.min(95, 35 + event.impulse * 3);
      ctx.save(); ctx.translate(X(event.x) + Math.cos(direction) * age * speed,
        Y(event.y) + Math.sin(direction) * age * speed * .5 + age * age * 70);
      ctx.rotate(direction + age * (wood ? 2 : 4));
      ctx.fillStyle = wood ? (i % 2 ? '#a26d42' : '#d3a166') : (i % 2 ? '#ffdf87' : '#edc06c');
      if (wood) ctx.fillRect(-6, -1.5, 12, 3);
      else { ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(5, -1); ctx.lineTo(1, 5); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

function drawBall(ctx, x, y, radius) {
  const gradient = ctx.createRadialGradient(x - radius * .3, y - radius * .4, 1, x, y, radius);
  gradient.addColorStop(0, '#fffdf0'); gradient.addColorStop(.7, '#eee5c9'); gradient.addColorStop(1, '#bcae89');
  ctx.fillStyle = gradient; ctx.strokeStyle = '#8c8165'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#bfb18d'; ctx.lineWidth = .8;
  ctx.beginPath(); ctx.moveTo(x - radius * .6, y - radius * .3); ctx.lineTo(x + radius * .5, y);
  ctx.lineTo(x - radius * .3, y + radius * .55); ctx.lineTo(x - radius * .6, y - radius * .3);
  ctx.moveTo(x, y - radius * .8); ctx.lineTo(x + radius * .5, y); ctx.stroke();
}
