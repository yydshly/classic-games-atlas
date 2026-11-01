import { WIDTH, HEIGHT, CAMP, EXIT, HEROES, FOES, REGIONS, walkable, armored } from './engine.mjs?v=mist-lamp-three-regions-1';

const TILE = 36, OX = 46, OY = 26;
const themes = [
  { top: '#173943', bottom: '#071c27', stone: '#264451', trace: '#365663' },
  { top: '#193c4a', bottom: '#092331', stone: '#315362', trace: '#4d7480' },
  { top: '#243847', bottom: '#0b1d32', stone: '#364e62', trace: '#5e7390' },
];
function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}
function character(ctx, x, y, index, scale = 1, down = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  if (down) ctx.globalAlpha = .38;
  const colors = ['#e9c987', '#b5cde0', '#b0d6c7'];
  ctx.fillStyle = colors[index]; ctx.beginPath(); ctx.arc(0, -10, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = index === 0 ? '#9a6851' : index === 1 ? '#63819b' : '#497e73';
  ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(7, -2); ctx.lineTo(index === 0 ? 10 : 7, 16); ctx.lineTo(-8, 16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#d8e5db'; ctx.lineWidth = 2;
  if (index === 0) { ctx.beginPath(); ctx.moveTo(-8, 1); ctx.lineTo(-14, 11); ctx.lineTo(-11, 18); ctx.stroke(); }
  else if (index === 1) { ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(15, 8); ctx.stroke(); ctx.strokeRect(14, 5, 5, 7); }
  else { ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(14, 8); ctx.lineTo(19, 5); ctx.stroke(); }
  ctx.restore();
}
function drawMap(ctx, game) {
  const theme = themes[game.region], gradient = ctx.createLinearGradient(0, 0, 920, 520);
  gradient.addColorStop(0, theme.top); gradient.addColorStop(1, theme.bottom);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 920, 520);
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = `rgba(156,199,196,${0.035 + i * .006})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 40 + i * 77); ctx.bezierCurveTo(220, 55 + i * 70, 500, 28 + i * 75, 920, 45 + i * 80); ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
    const px = OX + x * TILE, py = OY + y * TILE;
    if (walkable(x, y, game.region)) {
      roundRect(ctx, px + 1, py + 1, TILE - 2, TILE - 2, 5, theme.stone);
      ctx.strokeStyle = theme.trace; ctx.strokeRect(px + 6, py + 7, TILE - 12, TILE - 14);
    } else if ((x * 13 + y * 7) % 4 === 0) {
      ctx.fillStyle = game.region === 1 ? '#245166' : '#1b3942';
      ctx.beginPath(); ctx.moveTo(px + 4, py + 31); ctx.lineTo(px + 17, py + 12); ctx.lineTo(px + 31, py + 31); ctx.fill();
    }
  }
  const at = (x, y) => [OX + x * TILE + TILE / 2, OY + y * TILE + TILE / 2];
  const label = (text, x, y, color = '#f3dfb7') => { ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(text, x, y); };
  const enemy = (x, y, kind) => {
    if (game.cleared[kind]) return;
    const [px, py] = at(x, y);
    ctx.fillStyle = '#db8c7d'; ctx.beginPath(); ctx.arc(px, py - 2, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0d222c'; ctx.beginPath(); ctx.arc(px - 4, py - 4, 2, 0, Math.PI * 2); ctx.arc(px + 4, py - 4, 2, 0, Math.PI * 2); ctx.fill();
  };
  const cache = (x, y, taken, color = '#68b4ba') => {
    if (taken) return;
    const [px, py] = at(x, y); roundRect(ctx, px - 13, py - 11, 26, 21, 4, color);
    ctx.fillStyle = '#d7e5cf'; ctx.fillRect(px - 8, py - 7, 16, 4);
  };
  let [x, y] = at(CAMP.x, CAMP.y);
  ctx.fillStyle = '#e9c987'; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#344c50'; ctx.fillRect(x - 8, y - 3, 16, 13); ctx.fillStyle = '#f8e0a1'; ctx.fillRect(x - 4, y - 14, 8, 10);
  label('营地', x, y + 32);
  [x, y] = at(EXIT.x, EXIT.y);
  ctx.strokeStyle = '#e9c987'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#f8e1a5'; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 8, y + 7); ctx.lineTo(x - 8, y + 7); ctx.fill();
  label(game.region === 1 ? '图册' : game.region === 2 ? '主灯' : '雾灯', x, y + 33);
  if (game.region === 0) {
    enemy(10, 4, 'upper'); enemy(13, 10, 'lower'); cache(17, 10, game.visited.cache);
    [x, y] = at(16, 10); ctx.fillStyle = game.visited.bridge ? '#89ad9a' : '#d8ad75'; ctx.fillRect(x - 13, y - 11, 26, 22);
    ctx.fillStyle = '#243a3b'; ctx.fillRect(x - 2, y - 11, 4, 22);
    label('上路 · 近 / 强敌', 182, 145); label('下路 · 耗粮 / 饮剂', 410, 497);
  } else if (game.region === 1) {
    cache(14, 10, game.visited.archiveCache, '#8ac3a5');
    enemy(13, 10, 'archive');
    if (!game.visited.ward) {
      [x, y] = at(10, 4); ctx.fillStyle = '#ad9dd9'; ctx.beginPath(); ctx.moveTo(x, y - 15); ctx.lineTo(x + 12, y); ctx.lineTo(x, y + 15); ctx.lineTo(x - 12, y); ctx.fill();
    }
    label('上路 · 封障 / 2 法力', 228, 145); label('下路 · 清敌 / 药包', 412, 497);
  } else {
    enemy(11, 9, 'south'); cache(13, 3, game.visited.northCache); cache(13, 9, game.visited.southCache, '#8ac3a5');
    [x, y] = at(11, 3); ctx.fillStyle = game.visited.northHatch ? '#89ad9a' : '#d8ad75'; ctx.fillRect(x - 13, y - 11, 26, 22);
    label('北侧 · 耗粮 / 饮剂', 446, 101); label('中路 · 直达主灯', 485, 268); label('南侧 · 清敌 / 药包', 446, 409);
  }
  [x, y] = at(game.pos.x, game.pos.y);
  ctx.strokeStyle = '#ffe6a4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke();
  character(ctx, x, y + 9, 0, 1.15);
  ctx.textAlign = 'left'; ctx.font = 'bold 16px system-ui'; ctx.fillStyle = '#f5e5c0';
  ctx.fillText(`${game.region + 1}/3 · ${REGIONS[game.region].name}`, 36, 35);
}
function drawBattle(ctx, game) {
  const foe = FOES[game.battle.kind], gradient = ctx.createLinearGradient(0, 0, 0, 520);
  gradient.addColorStop(0, game.region === 2 ? '#253c52' : '#143844'); gradient.addColorStop(1, '#071824');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 920, 520);
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = `rgba(178,213,200,${.035 + i * .006})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20, 70 + i * 33); ctx.quadraticCurveTo(460, 20 + i * 35, 940, 80 + i * 34); ctx.stroke();
  }
  ctx.fillStyle = '#254754'; ctx.beginPath(); ctx.moveTo(0, 420); ctx.lineTo(920, 408); ctx.lineTo(920, 520); ctx.lineTo(0, 520); ctx.fill();
  HEROES.forEach((hero, i) => {
    const x = 145 + i * 136, y = 375 - (i === 1 ? 16 : 0);
    if (game.battle.actor === i) { ctx.fillStyle = 'rgba(239,209,141,.18)'; ctx.beginPath(); ctx.ellipse(x, y + 24, 42, 14, 0, 0, Math.PI * 2); ctx.fill(); }
    character(ctx, x, y, i, 3.4, game.party[i].hp === 0);
    ctx.textAlign = 'center'; ctx.fillStyle = '#e9ecdf'; ctx.font = 'bold 18px system-ui'; ctx.fillText(hero.name, x, 445);
    ctx.fillStyle = '#93c0ba'; ctx.font = '15px system-ui'; ctx.fillText(`${game.party[i].hp}/${hero.maxHp} HP`, x, 469);
  });
  const x = 726, y = 312;
  ctx.strokeStyle = armored(game) ? '#e0c687' : '#df8e7f'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(x, y - 32, 78, -.9, Math.PI * 1.45); ctx.stroke();
  ctx.fillStyle = game.battle.kind === 'final' ? '#6b718f' : '#84535b';
  ctx.beginPath(); ctx.moveTo(x - 58, y + 42); ctx.lineTo(x - 43, y - 46); ctx.lineTo(x, y - 88); ctx.lineTo(x + 55, y - 43); ctx.lineTo(x + 65, y + 47); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f2b68c'; ctx.beginPath(); ctx.arc(x, y - 28, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#071824'; ctx.beginPath(); ctx.arc(x, y - 28, 7, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'center'; ctx.fillStyle = '#f5e4d5'; ctx.font = 'bold 21px system-ui'; ctx.fillText(foe.name, x, 445);
  ctx.font = '17px system-ui'; ctx.fillText(`${game.battle.hp}/${foe.hp} HP`, x, 471);
  ctx.fillStyle = 'rgba(9,30,39,.8)'; ctx.fillRect(22, 18, 570, 66);
  ctx.fillStyle = '#f4d4a2'; ctx.textAlign = 'left'; ctx.font = 'bold 21px system-ui';
  ctx.fillText(`${game.region + 1}/3 · 第 ${game.battle.round + 1} 回合 · ${HEROES[game.battle.actor].name}行动`, 39, 58);
}
export function renderScene(canvas, game) {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (game.battle) drawBattle(ctx, game);
  else if (canvas.clientWidth < 550) {
    const zoom = 1.35, visibleW = canvas.width / zoom, visibleH = canvas.height / zoom;
    const px = OX + game.pos.x * TILE + TILE / 2, py = OY + game.pos.y * TILE + TILE / 2;
    const left = Math.max(0, Math.min(canvas.width - visibleW, px - visibleW / 2));
    const top = Math.max(0, Math.min(canvas.height - visibleH, py - visibleH / 2));
    ctx.save(); ctx.scale(zoom, zoom); ctx.translate(-left, -top); drawMap(ctx, game); ctx.restore();
  } else drawMap(ctx, game);
  if (game.status === 'paused') {
    ctx.fillStyle = 'rgba(5,18,25,.72)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center'; ctx.fillStyle = '#f4dcad'; ctx.font = 'bold 38px system-ui'; ctx.fillText('已暂停', canvas.width / 2, canvas.height / 2);
    ctx.font = '19px system-ui'; ctx.fillText('恢复后从当前位置继续', canvas.width / 2, canvas.height / 2 + 38);
  }
}
