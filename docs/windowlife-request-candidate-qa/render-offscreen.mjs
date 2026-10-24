// Optional evidence helper. Uses an already installed @napi-rs/canvas only;
// it is not a runtime dependency and does not start a browser.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createScene, command, update } from '../../experiments/windowlife-request/scene.mjs';
import { Renderer } from '../../experiments/windowlife-request/view.mjs';
const require = createRequire(import.meta.url);
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'system-ui');
function render(name, g) {
  const canvas = createCanvas(900, 650), context = canvas.getContext('2d');
  // Skia's font parser does not render intermediate weight values like 650.
  // Approximate these only in this offscreen helper; runtime code is unchanged.
  const proxy = new Proxy(context, {
    get(target, key) { const value = target[key]; return typeof value === 'function' ? value.bind(target) : value; },
    set(target, key, value) { target[key] = key === 'font' ? value.replace(/^(\d+) /, (_, w) => Math.round(Number(w) / 100) * 100 + ' ') : value; return true; }
  });
  new Renderer({ width: 900, height: 650, getContext: () => proxy }).draw(g, g.time);
  writeFileSync(fileURLToPath(new URL(name + '.png', import.meta.url)), canvas.toBuffer('image/png'));
}
const offered = createScene(); command(offered, 'start'); render('offscreen-offered', offered);
for (const choice of ['now', 'later', 'alone']) {
  const g = createScene(); command(g, 'start'); command(g, choice);
  for (let i = 0; i < 1000 && g.state === 'playing'; i++) {
    update(g, .1);
    if ((choice === 'now' && g.phase === 'co-creating' && g.art.sketch.progress === 3) ||
        (choice === 'later' && g.phase === 'sharing' && g.art.share.progress === 3)) render('offscreen-' + choice + '-active', g);
  }
  if (g.state !== 'settled') throw new Error('Scene did not settle');
  render('offscreen-' + choice + '-settled', g);
}
const cancelled = createScene(); command(cancelled, 'start'); command(cancelled, 'now');
while (cancelled.phase !== 'co-creating') update(cancelled, .1);
update(cancelled, .1); render('offscreen-cancel-before', cancelled);
command(cancelled, 'cancel');
while (cancelled.state === 'playing') update(cancelled, .1);
render('offscreen-cancel-settled', cancelled);
console.log('Eight code-native offscreen images generated, including one-tick cancellation before/after. Not browser/UI screenshots. Typography uses a local font approximation.');
