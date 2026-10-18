/** Independent campaign records and interrupted command logs. No browser globals. */
export const PROGRESS_KEY = 'atlas-civic-progress-v1';
export const CURRENT_KEY = 'atlas-civic-current-v1';
export const CHAPTER_COUNT = 8;
const MAX_SAVE_LENGTH = 250000;
const object = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const integer = (value, max = 1000000, min = 0) => Number.isInteger(value) && value >= min && value <= max;
const validRecord = value => object(value) && integer(value.turns, 1000, 1) && integer(value.food) && integer(value.trade);
export const emptyProgress = () => ({ version: 1, unlocked: 0, best: {} });

/** Only finite, known chapter records survive; unrelated damaged fields are discarded. */
export function parseProgress(raw) {
  const result = emptyProgress();
  let data;
  if (typeof raw !== 'string' || raw.length > MAX_SAVE_LENGTH) return result;
  try { data = JSON.parse(raw); } catch { return result; }
  if (!object(data) || data.version !== 1) return result;
  if (integer(data.unlocked, CHAPTER_COUNT - 1)) result.unlocked = data.unlocked;
  if (object(data.best)) {
    for (let index = 0; index < CHAPTER_COUNT; index++) {
      const record = data.best[index];
      if (!validRecord(record)) continue;
      result.best[index] = { turns: record.turns, food: record.food, trade: record.trade };
      result.unlocked = Math.max(result.unlocked, Math.min(index + 1, CHAPTER_COUNT - 1));
    }
  }
  return result;
}
function better(next, previous) {
  return !previous || next.turns < previous.turns
    || next.turns === previous.turns && (next.food > previous.food
      || next.food === previous.food && next.trade > previous.trade);
}
/** Caller must pass an actual observed engine victory; no award for paused/lost games. */
export function recordVictory(progress, index, game) {
  if (!integer(index, CHAPTER_COUNT - 1) || !object(game) || game.state !== 'won') return progress;
  const record = { turns: game.turn, food: game.resources?.food, trade: game.tradeDelivered };
  if (!validRecord(record)) return progress;
  const clean = parseProgress(JSON.stringify(progress));
  if (index > clean.unlocked) return progress;
  return {
    version: 1,
    unlocked: Math.max(clean.unlocked, Math.min(index + 1, CHAPTER_COUNT - 1)),
    best: better(record, clean.best[index]) ? { ...clean.best, [index]: record } : { ...clean.best },
  };
}
export function createProgressStore(storage) {
  let unavailable = false;
  let damagedCurrent = false;
  const read = key => { try { return storage.getItem(key); } catch { unavailable = true; return null; } };
  const write = (key, value) => { try { storage.setItem(key, value); return true; } catch { unavailable = true; return false; } };
  const remove = key => { try { storage.removeItem(key); return true; } catch { unavailable = true; return false; } };
  return {
    get unavailable() { return unavailable; },
    get damagedCurrent() { return damagedCurrent; },
    loadProgress() { return parseProgress(read(PROGRESS_KEY)); },
    saveProgress(progress) {
      try { return write(PROGRESS_KEY, JSON.stringify(parseProgress(JSON.stringify(progress)))); }
      catch { unavailable = true; return false; }
    },
    loadCurrent() {
      const raw = read(CURRENT_KEY);
      if (raw === null) return null;
      try {
        if (typeof raw !== 'string' || raw.length > MAX_SAVE_LENGTH) throw new Error('oversized');
        const envelope = JSON.parse(raw);
        if (!object(envelope) || envelope.version !== 1 || !object(envelope.checkpoint)) throw new Error('schema');
        return envelope.checkpoint;
      } catch { damagedCurrent = true; return null; }
    },
    saveCurrent(checkpoint) {
      if (!object(checkpoint)) return false;
      try {
        const raw = JSON.stringify({ version: 1, checkpoint });
        if (raw.length > MAX_SAVE_LENGTH) { unavailable = true; return false; }
        return write(CURRENT_KEY, raw);
      } catch { unavailable = true; return false; }
    },
    rejectCurrent() { damagedCurrent = true; return remove(CURRENT_KEY); },
    clearCurrent() { return remove(CURRENT_KEY); },
  };
}
/** A drag, cancellation, stale input generation or different pointer is never a tap. */
export function isPointerActivation(start, end, maximumDistance = 12) {
  return Boolean(start && end && !start.cancelled && !end.cancelled
    && start.pointerId === end.pointerId && Number.isFinite(maximumDistance) && maximumDistance >= 0
    && Number.isFinite(start.x) && Number.isFinite(start.y) && Number.isFinite(end.x) && Number.isFinite(end.y)
    && Math.hypot(end.x - start.x, end.y - start.y) <= maximumDistance);
}
