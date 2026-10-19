export const PROGRESS_KEY = 'paper-v2-quality-2';
export const LEGACY_KEY = 'paper-v2-progress-1';
export const AUDIO_KEY = 'paper-v2-audio';
export function sanitize(raw, count = 2) {
  const clean = { unlocked: 0, best: {} };
  let value;
  try { value = JSON.parse(raw); } catch { return clean; }
  if (!value || !Number.isInteger(value.unlocked) || value.unlocked < 0) return clean;
  clean.unlocked = Math.min(count - 1, value.unlocked);
  for (let i = 0; i < count; i++) {
    const item = value.best?.[i];
    if (item && Number.isInteger(item.shots) && item.shots >= 1 && item.shots <= 3 &&
        Number.isFinite(item.seconds) && item.seconds > 0 && item.seconds < 1000) {
      clean.best[i] = { shots: item.shots, seconds: item.seconds };
    }
  }
  return clean;
}
export function loadProgress(storage, count = 2) {
  try {
    const legacy = sanitize(storage.getItem(LEGACY_KEY), count);
    const current = sanitize(storage.getItem(PROGRESS_KEY), count);
    current.unlocked = Math.max(current.unlocked, legacy.unlocked);
    return { current, legacy, sound: storage.getItem(AUDIO_KEY) !== 'off', available: true };
  } catch { return { current: sanitize(null, count), legacy: sanitize(null, count), sound: true, available: false }; }
}
export function recordWin(progress, level, shots, seconds, count = 2) {
  const previous = progress.best[level];
  if (!previous || shots < previous.shots || (shots === previous.shots && seconds < previous.seconds)) {
    progress.best[level] = { shots, seconds };
  }
  progress.unlocked = Math.min(count - 1, Math.max(progress.unlocked, level + 1));
}
