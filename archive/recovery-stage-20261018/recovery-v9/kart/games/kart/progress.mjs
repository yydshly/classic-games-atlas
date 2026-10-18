/** Local-only cup records. A bad current race never erases independent records. */
import { LEVELS } from './levels.mjs';
export const PROGRESS_KEY = 'atlas-kart-progress-v1';
export const CURRENT_KEY = 'atlas-kart-current-v1';
export const COURSE_COUNT = LEVELS.length;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value, low, high, fallback) => Number.isInteger(value) && value >= low && value <= high ? value : fallback;
const validRecord = (level, value) => isRecord(value) && Number.isInteger(value.place) && value.place >= 1 && value.place <= LEVELS[level - 1].targetPlace && Number.isFinite(value.time) && value.time > 0 && value.time <= LEVELS[level - 1].timeLimit;
export function emptyProgress() {
  return { version: 1, unlocked: 1, last: 1, tutorialSeen: false, best: {} };
}
export function sanitizeProgress(value) {
  const clean = emptyProgress();
  if (!isRecord(value)) return clean;
  // Even an old wrapper can contain independently verifiable records.
  if (isRecord(value.best)) for (let id = 1; id <= COURSE_COUNT; id++) {
    const record = value.best[id];
    if (validRecord(id, record)) {
      clean.best[id] = { place: record.place, time: record.time };
    }
  }
  clean.unlocked = integer(value.unlocked, 1, COURSE_COUNT, 1);
  for (const id of Object.keys(clean.best)) clean.unlocked = Math.max(clean.unlocked, Math.min(COURSE_COUNT, Number(id) + 1));
  clean.last = integer(value.last, 1, clean.unlocked, 1);
  clean.tutorialSeen = value.tutorialSeen === true;
  return clean;
}
export function loadProgress(storage) {
  try {
    const raw = storage.getItem(PROGRESS_KEY);
    if (raw === null) return { progress: emptyProgress(), available: true, damaged: false };
    try {
      const value = JSON.parse(raw);
      return { progress: sanitizeProgress(value), available: true, damaged: !isRecord(value) || value.version !== 1 };
    } catch {
      return { progress: emptyProgress(), available: true, damaged: true };
    }
  } catch { return { progress: emptyProgress(), available: false, damaged: false }; }
}
export function saveProgress(storage, progress) {
  try { storage.setItem(PROGRESS_KEY, JSON.stringify(sanitizeProgress(progress))); return true; }
  catch { return false; }
}
export function loadCurrent(storage, restore, unlocked = 1) {
  try {
    const raw = storage.getItem(CURRENT_KEY);
    if (raw === null) return { game: null, available: true, damaged: false };
    try {
      const game = restore(JSON.parse(raw));
      if (!game || !Number.isInteger(game.level) || game.level < 1 || game.level > unlocked || !['ready', 'paused'].includes(game.state)) {
        try { storage.removeItem(CURRENT_KEY); } catch { return { game: null, available: false, damaged: true }; }
        return { game: null, available: true, damaged: true };
      }
      return { game, available: true, damaged: false };
    } catch {
      try { storage.removeItem(CURRENT_KEY); } catch { return { game: null, available: false, damaged: true }; }
      return { game: null, available: true, damaged: true };
    }
  } catch { return { game: null, available: false, damaged: false }; }
}
export function saveCurrent(storage, game, checkpoint) {
  try {
    if (['won', 'lost'].includes(game.state)) storage.removeItem(CURRENT_KEY);
    else storage.setItem(CURRENT_KEY, JSON.stringify(checkpoint(game)));
    return true;
  } catch { return false; }
}
/** Call only for a completed engine result. Replaying a settlement is idempotent. */
export function recordFinish(progress, level, result) {
  if (!Number.isInteger(level) || level < 1 || level > COURSE_COUNT || !result || result.won !== true || !validRecord(level, result)) return false;
  const old = progress.best[level];
  if (!old || result.place < old.place || (result.place === old.place && result.time < old.time)) progress.best[level] = { place: result.place, time: result.time };
  progress.unlocked = Math.max(progress.unlocked, Math.min(COURSE_COUNT, level + 1));
  progress.last = level;
  return true;
}
