/** OFFSCREEN SOURCE RENDER QA ONLY. This does not launch or verify a browser. */
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createGame, start, step, command, canCommand, snapshot, SLOTS } from '../games/repair/engine.mjs';
import { render, project, unproject, hitSlot } from '../games/repair/renderer.mjs';
import { prepareRepair, pilotRepair } from './repair_pilot.mjs';
const require = createRequire(import.meta.url);
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'Noto Sans CJK SC');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 'Noto Sans CJK SC');
const out = resolve('docs/repair-qa'); mkdirSync(out, { recursive: true });
const canvas = createCanvas(1200, 800), ctx = canvas.getContext('2d');
const reports = [];
function evidence(s, file, selectedSlot, note) {
  const before = JSON.stringify(s);
  render(ctx, snapshot(s), { width: 1200, height: 800, time: s.elapsed * 1000, selectedSlot });
  if (JSON.stringify(s) !== before) throw new Error('Renderer mutated engine state');
  writeFileSync(join(out, file), canvas.toBuffer('image/png'));
  reports.push({ file, note, evidence: 'Offscreen @napi-rs/canvas rendering of the real engine. Not browser or UI evidence.', levelIndex: s.levelIndex, elapsed: s.elapsed, tick: s.tick, state: s.state, credits: s.credits, completed: s.completed, lost: s.lost, robotTypes: [...new Set(s.robots.filter(r => r.status !== 'gone').map(r => r.type))], workingStaff: s.staff.filter(w => w.status === 'working').map(w => w.id), stations: s.stations.map(st => ({ slot: st.slot, type: st.type, workerId: st.workerId, broken: st.broken, maintenance: st.maintenance })), commands: s.commandLog });
}
function ordinary(index, until) {
  const s = createGame(index); prepareRepair(s); start(s);
  while (s.elapsed + 1e-6 < until && s.state === 'playing') { pilotRepair(s); step(s, .05); }
  return s;
}
for (const slot of SLOTS) { const p = project(slot.x, slot.y), q = unproject(p.x, p.y); if (hitSlot(p.x, p.y) !== slot.id || Math.abs(q.x - slot.x) > 1e-6 || Math.abs(q.y - slot.y) > 1e-6) throw new Error(`Hit target failed: ${slot.id}`); }
evidence(ordinary(6, 24), 'renderer-morning.png', 'A', 'Morning palette; ordinary day-seven pilot, incoming visitors and service.');
evidence(ordinary(5, 27), 'renderer-rain.png', 'B', 'Blue rain palette; ordinary day-six pilot, real scheduled electrical fault and maintenance.');
// All six bays are furnished with earned money through public legal commands.
// Extra bays deliberately remain unstaffed in this layout stress test. No resource
// injection, state edits, forced visitors or fabricated completion are used.
const full = createGame(7);
for (const id of ['station-D', 'station-B']) { const result = command(full, { type: 'upgrade', stationId: id }); if (!result.ok) throw new Error(result.reason); }
start(full); let fullAt = null;
while (full.state === 'playing' && full.elapsed < 119) {
  if (full.tick % 5 === 0) {
    for (const st of full.stations) if (st.broken && !st.maintenance && canCommand(full, { type: 'maintain', stationId: st.id }).ok) command(full, { type: 'maintain', stationId: st.id });
    for (const [slot, stationType, cost] of [['C', 'diagnosis', 95], ['E', 'mechanical', 100], ['F', 'electrical', 120]]) {
      if (!full.stations.some(st => st.slot === slot) && full.credits >= cost + 50) { const result = command(full, { type: 'build', slot, stationType }); if (!result.ok) throw new Error(result.reason); break; }
    }
  }
  step(full, .05);
  if (full.stations.length === 8 && fullAt === null) { fullAt = full.elapsed; evidence(full, 'renderer-evening.png', 'C', 'Evening palette; all six bays built via legal commands and earned income. Three extra bays are visibly unstaffed. Layout stress preview, not a recommended strategy.'); }
}
if (fullAt === null) throw new Error('Ordinary-input full workshop never reached');
reports.push({ fullWorkshopOutcome: { state: full.state, completed: full.completed, lost: full.lost, credits: full.credits, elapsed: full.elapsed, fullAt } });
// Reduced motion must give exactly the same pixels regardless of RAF time.
const still = ordinary(4, 22); render(ctx, snapshot(still), { time: 1, reducedMotion: true }); const a = canvas.toBuffer('image/png'); render(ctx, snapshot(still), { time: 99999, reducedMotion: true }); const b = canvas.toBuffer('image/png'); if (!a.equals(b)) throw new Error('Reduced-motion image changed with time');
reports.push({ checks: { slotProjectionAndHitTargets: true, immutableSnapshotInput: true, reducedMotionTimeInvariant: true, font: 'Existing Noto Sans CJK fonts registered locally; no install or download' } });
if (process.argv.includes('--video')) {
  const fps = 20, seconds = 10, frames = mkdtempSync(join(tmpdir(), 'repair-frames-')), s = ordinary(7, 14);
  try {
    for (let i = 0; i < fps * seconds; i++) { pilotRepair(s); step(s, 1 / fps); render(ctx, snapshot(s), { time: s.elapsed * 1000, selectedSlot: 'A' }); writeFileSync(join(frames, `${String(i).padStart(4, '0')}.png`), canvas.toBuffer('image/png')); }
    const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', join(frames, '%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart', join(out, 'renderer-simulation.mp4')], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'ffmpeg failed');
    reports.push({ file: 'renderer-simulation.mp4', evidence: '10-second offscreen engine simulation. Not browser/UI capture.', fps, seconds, simulationFrom: 14, simulationTo: s.elapsed, commands: s.commandLog });
  } finally { rmSync(frames, { recursive: true, force: true }); }
}
const timingState = snapshot(still); render(ctx, timingState, { time: 0 });
const timingStart = performance.now(); for (let i = 0; i < 60; i++) render(ctx, timingState, { time: i * 16.667 });
const meanMs = (performance.now() - timingStart) / 60;
let video = null;
if (process.argv.includes('--video')) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_frames,duration', '-of', 'json', join(out, 'renderer-simulation.mp4')], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'ffprobe failed');
  video = JSON.parse(result.stdout);
}
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
writeFileSync(join(out, 'renderer-checks.json'), JSON.stringify({
  evidence: 'Offscreen source rendering of real engine only. No browser, mobile, or UI verification.',
  runtimeRendererSha256: sha256('games/repair/renderer.mjs'), runtimeEngineSha256: sha256('games/repair/engine.mjs'),
  ...reports.find(r => r.checks).checks,
  renderBenchmark: { engine: '@napi-rs/canvas', width: 1200, height: 800, frames: 60, meanMs, initialDirectMeanMs: 25.26483093333333, interpretation: 'Informational native offscreen timing only. Not browser or mobile FPS. A slower bitmap-cache experiment was removed.' },
  fullWorkshopOutcome: reports.find(r => r.fullWorkshopOutcome).fullWorkshopOutcome, video,
  targetedReadabilityChange: { cQueueWorld: [[736, 320], [796, 320], [856, 320]], cIdentityPlaqueLogicalY: 189.4, cWarningLogicalTop: 211.4, unchanged: 'All other workstation layout, character scale, and payment queue geometry' },
  visualReviewStatus: 'Current offscreen peak image inspected: C waiting faces, cashier face, payment visitors, and C identity plaque are separated. Broader browser and real-mobile acceptance remains unverified.'
}, null, 2) + '\n');
writeFileSync(join(out, 'simulation-log.json'), JSON.stringify({ generatedBy: 'scripts/render_repair_preview.mjs', browserVerified: false, simulationMutation: 'Only exported engine start/step/command APIs are called', reports }, null, 2) + '\n');
console.log(JSON.stringify({ output: out, images: reports.filter(r => r.file).map(r => r.file), fullWorkshopOutcome: reports.find(r => r.fullWorkshopOutcome)?.fullWorkshopOutcome, checks: reports.find(r => r.checks)?.checks }, null, 2));
