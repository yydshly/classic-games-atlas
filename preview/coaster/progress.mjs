/** Small, independent campaign records. This validates data; it is not an anti-cheat system. */
export const PROGRESS_KEY = 'atlas-preview-coaster-20261018-progress-v1';
export const CURRENT_KEY = 'atlas-preview-coaster-20261018-current-v1';
export const CHAPTER_COUNT = 8;
const MAX_SAVE_LENGTH = 250000;
const object = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const integer = (value, max = 1000000, min = 0) => Number.isInteger(value) && value >= min && value <= max;
const finite = (value, max = 1000000, min = 0) => Number.isFinite(value) && value >= min && value <= max;
const validRecord = value => object(value) && integer(value.runs, 1000, 1) && finite(value.revenue) && finite(value.reputation) && finite(value.cost);
export const emptyProgress = () => ({ version: 1, unlocked: 0, best: {} });

export function parseProgress(raw) {
  const result = emptyProgress();
  let data;
  if (typeof raw !== 'string' || raw.length > MAX_SAVE_LENGTH) return result;
  try { data = JSON.parse(raw); } catch { return result; }
  if (!object(data) || data.version !== 1) return result;
  if (integer(data.unlocked, CHAPTER_COUNT - 1)) result.unlocked = data.unlocked;
  if (object(data.best)) for (let index = 0; index < CHAPTER_COUNT; index++) {
    const record = data.best[index];
    if (!validRecord(record)) continue;
    result.best[index] = { runs: record.runs, revenue: record.revenue, reputation: record.reputation, cost: record.cost };
    result.unlocked = Math.max(result.unlocked, Math.min(index + 1, CHAPTER_COUNT - 1));
  }
  return result;
}
function better(next, previous) {
  return !previous || next.runs < previous.runs
    || next.runs === previous.runs && (next.cost < previous.cost
      || next.cost === previous.cost && (next.reputation > previous.reputation
        || next.reputation === previous.reputation && next.revenue > previous.revenue));
}
/** Called only on a controller-observed engine victory. Invalid and non-winning games earn nothing. */
export function recordVictory(progress, index, game) {
  if (!integer(index, CHAPTER_COUNT - 1) || !object(game) || game.state !== 'won' || game.levelIndex !== index) return progress;
  const record = { runs: game.runs, revenue: game.revenue, reputation: game.reputation, cost: game.cost };
  if (!validRecord(record)) return progress;
  let clean;
  try { clean = parseProgress(JSON.stringify(progress)); } catch { return progress; }
  if (index > clean.unlocked) return progress;
  return {
    version: 1,
    unlocked: Math.max(clean.unlocked, Math.min(index + 1, CHAPTER_COUNT - 1)),
    best: better(record, clean.best[index]) ? { ...clean.best, [index]: record } : { ...clean.best },
  };
}
export function createProgressStore(storage) {
  let unavailable = false, damagedCurrent = false;
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
        if (typeof raw !== 'string' || raw.length > MAX_SAVE_LENGTH) throw new Error('size');
        const envelope = JSON.parse(raw);
        if (!object(envelope) || envelope.version !== 1 || !object(envelope.checkpoint)) throw new Error('schema');
        return envelope.checkpoint;
      } catch { damagedCurrent = true; return null; }
    },
    saveCurrent(value) {
      if (!object(value)) return false;
      try {
        const raw = JSON.stringify({ version: 1, checkpoint: value });
        if (raw.length > MAX_SAVE_LENGTH) { unavailable = true; return false; }
        return write(CURRENT_KEY, raw);
      } catch { unavailable = true; return false; }
    },
    rejectCurrent() { damagedCurrent = true; return remove(CURRENT_KEY); },
    clearCurrent() { return remove(CURRENT_KEY); },
  };
}
/** Pointer cancellation, drags, missing data and mismatched pointer IDs never activate. */
export function isPointerActivation(start, end, maximumDistance = 12) {
  return Boolean(start && end && !start.cancelled && !end.cancelled
    && start.pointerId === end.pointerId && Number.isFinite(maximumDistance) && maximumDistance >= 0
    && Number.isFinite(start.x) && Number.isFinite(start.y) && Number.isFinite(end.x) && Number.isFinite(end.y)
    && Math.hypot(end.x - start.x, end.y - start.y) <= maximumDistance);
}
