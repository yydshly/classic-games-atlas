#!/usr/bin/env node
/**
 * Reproducible OFFSCREEN RENDERER previews using actual four-player engine state.
 * This is simulated input coverage, NOT a browser screenshot or browser input test.
 * Requires the already-installed @napi-rs/canvas. Optional video uses installed ffmpeg
 * with libx264; the script never installs dependencies or downloads anything.
 * Run from any directory: node scripts/render_court_preview.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createGame, start, step, action, snapshot } from '../games/court/engine.mjs';
import { render } from '../games/court/renderer.mjs';
const require = createRequire(import.meta.url);
const { createCanvas } = require('@napi-rs/canvas');
globalThis.OffscreenCanvas = class { constructor(w, h) { return createCanvas(w, h); } };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs', 'court-qa');
fs.mkdirSync(out, { recursive: true });
const canvas = createCanvas(1200, 800);
const ctx = canvas.getContext('2d');
const FPS = 30, SECONDS = 8, FRAMES = FPS * SECONDS;
const inputSchedule = [
  { from: 0, to: 1.2, input: { x: 1, y: -0.35 }, purpose: 'Drive into open space' },
  { at: 1.2, action: 'pass', purpose: 'Pass to actual AI-controlled teammate' },
  { from: 1.2, to: 2.0, input: { x: 1, y: 0.25 }, purpose: 'Move while pass resolves' },
  { from: 2.0, to: 2.5333333333, input: { x: 0, y: 0, shoot: true }, purpose: 'Hold shot charge for 32 simulation ticks' },
  { from: 2.5333333333, to: 3.5, input: { x: 1, y: -0.4, shoot: false }, purpose: 'Release shot and pursue rebound' },
  { at: 4.0, action: 'switch', purpose: 'Change controlled teammate' },
  { from: 3.5, to: 4.0, input: { x: -1, y: 0.3 }, purpose: 'Recover defensive position' },
  { from: 4.0, to: 4.5333333333, input: { x: 0, y: 0, shoot: true }, purpose: 'Charge a shot after switching to the current ball handler' },
  { from: 4.5333333333, to: 5.3, input: { x: 1, y: -0.2, shoot: false }, purpose: 'Release and follow the shot' },
  { at: 5.0, action: 'steal', purpose: 'Attempt steal if game state permits' },
  { from: 5.3, to: 8.0, input: { x: 0.8, y: -0.15 }, purpose: 'Return toward attacking basket' },
];
function controlsAt(frame) {
  const t = frame / FPS;
  return inputSchedule.find(item => item.from !== undefined && t >= item.from && t < item.to)?.input || {};
}
function advance(s, frame, actions) {
  for (const item of inputSchedule) {
    if (item.at !== undefined && frame === Math.round(item.at * FPS)) {
      const before = { owner: s.ball.owner, controlled: s.controlled, mode: s.ball.mode };
      action(s, item.action);
      actions.push({ second: frame / FPS, action: item.action, before, after: { owner: s.ball.owner, controlled: s.controlled, mode: s.ball.mode } });
    }
  }
  // step integrates the real deterministic engine in two 1/60-second ticks.
  step(s, 1 / FPS, controlsAt(frame));
}
function draw(s, frame) {
  render(ctx, s, { width: 1200, height: 800, time: (frame + 1) / FPS * 1000 });
  ctx.save();
  ctx.fillStyle = 'rgba(35,64,66,.72)';
  ctx.textAlign = 'right';
  ctx.font = '10px sans-serif';
  ctx.fillText('OFFSCREEN RENDERER PREVIEW · SIMULATED INPUTS', 1176, 785);
  ctx.restore();
}
const report = {
  kind: 'Offscreen renderer preview and actual-engine simulation',
  browserVerified: false,
  caveat: 'No browser was launched and no real keyboard, mouse, or touch events were exercised. Controls were supplied directly to the actual engine API.',
  renderer: 'games/court/renderer.mjs', engine: 'games/court/engine.mjs',
  dimensions: [1200, 800], framesPerSecond: FPS, seconds: SECONDS,
  inputSchedule, environments: [],
};
for (const [levelIndex, filename] of [[0, 'renderer-daylight.png'], [3, 'golden.png'], [6, 'rain.png']]) {
  const s = start(createGame(levelIndex)), actions = [];
  for (let frame = 0; frame < 48; frame++) advance(s, frame, actions);
  draw(s, 47);
  fs.writeFileSync(path.join(out, filename), canvas.toBuffer('image/png'));
  report.environments.push({ levelIndex, levelId: s.level.id, filename, simulatedSeconds: s.elapsed, players: s.players.length, tick: s.tick, score: s.score, ballMode: s.ball.mode, actions, snapshot: snapshot(s) });
}
const encoders = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' });
if (encoders.error || !encoders.stdout.includes('libx264')) {
  report.video = { produced: false, reason: 'Installed ffmpeg with libx264 is unavailable. No installation was attempted.' };
  fs.writeFileSync(path.join(out, 'simulation-log.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ previews: report.environments.map(e => e.filename), video: report.video }));
  process.exit(0);
}
const movie = path.join(out, 'engine-simulation-8s.mp4');
const encoder = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', '1200x800', '-framerate', String(FPS), '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', movie], { stdio: ['pipe', 'ignore', 'pipe'] });
let encoderError = '';
encoder.stderr.on('data', data => { encoderError += data.toString(); });
const exit = once(encoder, 'close');
const s = start(createGame(0)), actions = [], samples = [], modes = new Set();
let framesWritten = 0;
try {
  for (let frame = 0; frame < FRAMES; frame++) {
    advance(s, frame, actions);
    if (s.players.length !== 4) throw new Error(`Expected four actual players; received ${s.players.length}`);
    modes.add(s.ball.mode);
    draw(s, frame);
    const pixels = ctx.getImageData(0, 0, 1200, 800).data;
    if (!encoder.stdin.write(Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength))) await once(encoder.stdin, 'drain');
    framesWritten++;
    if (frame % FPS === FPS - 1) samples.push({ second: (frame + 1) / FPS, tick: s.tick, score: [...s.score], ball: { x: s.ball.x, y: s.ball.y, z: s.ball.z, mode: s.ball.mode, owner: s.ball.owner }, controlled: s.controlled, players: s.players.map(p => ({ id: p.id, team: p.team, x: p.x, y: p.y, action: p.action })) });
  }
  encoder.stdin.end();
  const [code] = await exit;
  if (code !== 0) throw new Error(`ffmpeg failed (${code}): ${encoderError}`);
  report.video = { produced: true, filename: path.basename(movie), frames: framesWritten, seconds: SECONDS, codec: 'H.264 / libx264', actualEngineTicks: s.tick, actualPlayerCount: s.players.length, ballModesObserved: [...modes], actions, samples, finalSnapshot: snapshot(s) };
} catch (error) {
  encoder.stdin.destroy();
  encoder.kill('SIGTERM');
  report.video = { produced: false, framesWritten, error: String(error), encoderError };
}
fs.writeFileSync(path.join(out, 'simulation-log.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ previews: report.environments.map(e => e.filename), video: { ...report.video, actions: undefined, samples: undefined, finalSnapshot: undefined }, outputDirectory: out }, null, 2));
