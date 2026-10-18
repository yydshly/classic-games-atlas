/** Meadow League campaign records and active matches are isolated from other games. */
export const PROGRESS_KEY = 'atlas-v2-meadow-20261018-progress-v1';
export const CURRENT_KEY = 'atlas-v2-meadow-20261018-current-v1';
export const MATCH_COUNT = 8;
export const MAX_SAVE_LENGTH = 100000;
const object = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const integer = (value, max, min = 0) => Number.isInteger(value) && value >= min && value <= max;
const active = new Set(['kickoff', 'playing', 'goal', 'paused']);
const activeCheckpoint = value => object(value) && value.version === 1 && value.game === 'meadow'
  && object(value.data) && active.has(value.data.state);
const validScore = value => Array.isArray(value) && value.length === 2 && value.every(n => integer(n, 99));
const validRecord = value => object(value) && validScore(value.score) && value.score[0] > value.score[1];
export const emptyProgress = () => ({ version: 1, unlocked: 0, best: {} });

/** Copy only known, bounded fields. One damaged record cannot erase a valid neighbor. */
export function parseProgress(raw) {
  const result = emptyProgress();
  if (typeof raw !== 'string' || raw.length > MAX_SAVE_LENGTH) return result;
  let data;
  try { data = JSON.parse(raw); } catch { return result; }
  if (!object(data) || data.version !== 1) return result;
  if (integer(data.unlocked, MATCH_COUNT - 1)) result.unlocked = data.unlocked;
  if (object(data.best)) for (let index = 0; index < MATCH_COUNT; index += 1) {
    const record = data.best[index];
    if (!validRecord(record)) continue;
    result.best[index] = { score: [...record.score] };
    result.unlocked = Math.max(result.unlocked, Math.min(index + 1, MATCH_COUNT - 1));
  }
  return result;
}

/** A terminal engine victory is required. Ties, losses and locked matches cannot award. */
export function recordVictory(progress, index, game) {
  if (!integer(index, MATCH_COUNT - 1) || !object(game) || game.state !== 'won'
    || !validScore(game.score) || game.score[0] <= game.score[1]) return progress;
  let clean;
  try { clean = parseProgress(JSON.stringify(progress)); } catch { return progress; }
  if (index > clean.unlocked) return progress;
  const previous = clean.best[index]?.score;
  const next = game.score;
  const better = !previous || next[0] - next[1] > previous[0] - previous[1]
    || next[0] - next[1] === previous[0] - previous[1] && next[0] > previous[0];
  return { version: 1, unlocked: Math.max(clean.unlocked, Math.min(index + 1, MATCH_COUNT - 1)),
    best: better ? { ...clean.best, [index]: { score: [...next] } } : { ...clean.best } };
}

/** This layer validates the envelope; restoreCheckpoint validates every engine field. */
export function createProgressStore(storage) {
  let unavailable = false, damagedCurrent = false, damagedProgress = false;
  const read = key => { try { return storage.getItem(key); } catch { unavailable = true; return null; } };
  const write = (key, value) => { try { storage.setItem(key, value); return true; } catch { unavailable = true; return false; } };
  const remove = key => { try { storage.removeItem(key); return true; } catch { unavailable = true; return false; } };
  return {
    get unavailable() { return unavailable; },
    get damagedCurrent() { return damagedCurrent; },
    get damagedProgress() { return damagedProgress; },
    loadProgress() {
      const raw = read(PROGRESS_KEY);
      const clean = parseProgress(raw);
      if (raw !== null) {
        try {
          if (typeof raw !== 'string' || raw.length > MAX_SAVE_LENGTH) throw new Error('size');
          const source = JSON.parse(raw);
          damagedProgress = !object(source)
            || source.version !== 1 || !integer(source.unlocked, MATCH_COUNT - 1) || !object(source.best)
            || Object.entries(source.best).some(([key, value]) => !/^[0-7]$/.test(key) || !validRecord(value));
        } catch { damagedProgress = true; }
      }
      return clean;
    },
    saveProgress(progress) {
      try { return write(PROGRESS_KEY, JSON.stringify(parseProgress(JSON.stringify(progress)))); }
      catch { unavailable = true; return false; }
    },
    loadCurrent() {
      const raw = read(CURRENT_KEY);
      if (raw === null) return null;
      try {
        if (typeof raw !== 'string' || raw.length > MAX_SAVE_LENGTH) throw new Error('size');
        const data = JSON.parse(raw);
        if (!object(data) || data.version !== 1 || !activeCheckpoint(data.checkpoint)) throw new Error('envelope');
        // JSON.parse produces a fresh copy; the caller must still use engine validation.
        return data.checkpoint;
      } catch { damagedCurrent = true; return null; }
    },
    saveCurrent(checkpoint) {
      if (!activeCheckpoint(checkpoint)) return false;
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
