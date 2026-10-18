/** Campaign records are independent from an interrupted shift. No browser globals. */
export const PROGRESS_KEY = 'atlas-v2-repair-20261018-progress-v1';
export const SHIFT_KEY = 'atlas-v2-repair-20261018-shift-v1';
export const DAY_COUNT = 8;

export function emptyProgress() {
  return { version: 1, unlocked: 0, best: {} };
}

function boundedInteger(value, maximum = 1000000) {
  return Number.isInteger(value) && value >= 0 && value <= maximum;
}

function validRecord(record) {
  return record && typeof record === 'object' && !Array.isArray(record)
    && boundedInteger(record.completed, 10000)
    && boundedInteger(record.lost, 10000)
    && boundedInteger(record.credits);
}

/** Salvage valid day records even if an unrelated property is damaged. */
export function parseProgress(raw) {
  const result = emptyProgress();
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return result; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.version !== 1) return result;
  if (boundedInteger(parsed.unlocked, DAY_COUNT - 1)) result.unlocked = parsed.unlocked;
  if (parsed.best && typeof parsed.best === 'object' && !Array.isArray(parsed.best)) {
    for (let day = 0; day < DAY_COUNT; day += 1) {
      const record = parsed.best[day];
      if (!validRecord(record)) continue;
      result.best[day] = {
        completed: record.completed,
        lost: record.lost,
        credits: record.credits,
      };
      result.unlocked = Math.max(result.unlocked, Math.min(DAY_COUNT - 1, day + 1));
    }
  }
  return result;
}

function betterRecord(next, previous) {
  if (!previous) return true;
  if (next.completed !== previous.completed) return next.completed > previous.completed;
  if (next.lost !== previous.lost) return next.lost < previous.lost;
  return next.credits > previous.credits;
}

/** Only the caller's observed engine victory may enter the campaign record. */
export function recordVictory(progress, dayIndex, result) {
  if (!boundedInteger(dayIndex, DAY_COUNT - 1) || !validRecord(result)) return progress;
  const clean = parseProgress(JSON.stringify(progress));
  if (dayIndex > clean.unlocked) return progress;
  const record = { completed: result.completed, lost: result.lost, credits: result.credits };
  return {
    version: 1,
    unlocked: Math.max(clean.unlocked, Math.min(DAY_COUNT - 1, dayIndex + 1)),
    best: betterRecord(record, clean.best[dayIndex])
      ? { ...clean.best, [dayIndex]: record }
      : { ...clean.best },
  };
}

/** Storage failures remain visible for this session; a later success cannot hide them. */
export function createProgressStore(storage) {
  let unavailable = false;
  let damagedShift = false;
  let cachedProgress = emptyProgress();
  function read(key) {
    try { return storage.getItem(key); } catch { unavailable = true; return null; }
  }
  function write(key, value) {
    try { storage.setItem(key, value); return true; } catch { unavailable = true; return false; }
  }
  function remove(key) {
    try { storage.removeItem(key); return true; } catch { unavailable = true; return false; }
  }
  return {
    get unavailable() { return unavailable; },
    get damagedShift() { return damagedShift; },
    loadProgress() {
      cachedProgress = parseProgress(read(PROGRESS_KEY));
      return cachedProgress;
    },
    saveProgress(progress) {
      // Keep session progress even when private browsing or quota blocks a write.
      cachedProgress = parseProgress(JSON.stringify(progress));
      return write(PROGRESS_KEY, JSON.stringify(cachedProgress));
    },
    loadShift() {
      const raw = read(SHIFT_KEY);
      if (raw === null) return null;
      try {
        const envelope = JSON.parse(raw);
        if (!envelope || envelope.version !== 1 || !envelope.checkpoint
          || typeof envelope.checkpoint !== 'object' || Array.isArray(envelope.checkpoint)) {
          damagedShift = true;
          return null;
        }
        return envelope.checkpoint;
      } catch {
        damagedShift = true;
        return null;
      }
    },
    saveShift(checkpoint) {
      if (!checkpoint || typeof checkpoint !== 'object' || Array.isArray(checkpoint)) return false;
      try {
        return write(SHIFT_KEY, JSON.stringify({ version: 1, checkpoint }));
      } catch {
        unavailable = true;
        return false;
      }
    },
    rejectShift() {
      damagedShift = true;
      // Never clear campaign records while discarding a rejected engine checkpoint.
      return remove(SHIFT_KEY);
    },
    clearShift() { return remove(SHIFT_KEY); },
  };
}

/** A canceled or dragged contact must never become a canvas activation. */
export function isPointerActivation(start, end, maximumDistance = 12) {
  return Boolean(start && end && !start.cancelled && !end.cancelled
    && start.pointerId === end.pointerId
    && Number.isFinite(start.x) && Number.isFinite(start.y)
    && Number.isFinite(end.x) && Number.isFinite(end.y)
    && Math.hypot(end.x - start.x, end.y - start.y) <= maximumDistance);
}
