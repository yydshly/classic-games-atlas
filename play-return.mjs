// A one-use directory return receipt, separate from every game's saves.
export const PLAY_RETURN_KEY = 'classic-games-atlas:play-return:v1';
const versions = new Set(['all', 'v1', 'v2', 'v3', 'paused']);

function gameSlug(value, base) {
  try {
    const root = new URL('./', base), url = new URL(value, root);
    if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return null;
    const path=url.pathname.slice(root.pathname.length);
    if (/^versions\/v3\/games\/post\/cup\/(?:index\.html)?$/.test(path)) return 'post';
    return path.match(/^(?:versions\/v[23]\/)?(?:games|preview)\/([a-z0-9-]+)\/(?:index\.html)?$/)?.[1] || null;
  } catch { return null; }
}

function valid(state, base, now) {
  return state?.schema === 1 && typeof state.query === 'string' && state.query.length <= 120 &&
    versions.has(state.version) && Number.isInteger(state.limit) && state.limit >= 12 && state.limit <= 41 &&
    Number.isFinite(state.y) && state.y >= 0 && state.y <= 2e6 &&
    Number.isFinite(state.at) && now >= state.at && now - state.at <= 86400000 &&
    typeof state.slug === 'string' && gameSlug(state.href, base) === state.slug;
}

export function rememberPlayReturn(storage, base, href, state, now = Date.now()) {
  const receipt = {...state, href, schema: 1, at: now};
  if (!valid(receipt, base, now)) return false;
  try { storage.setItem(PLAY_RETURN_KEY, JSON.stringify(receipt)); return true; }
  catch { return false; }
}

export function consumePlayReturn(storage, base, referrer, now = Date.now()) {
  try {
    const state = JSON.parse(storage.getItem(PLAY_RETURN_KEY));
    if (!valid(state, base, now) || gameSlug(referrer, base) !== state.slug) return null;
    try { storage.removeItem(PLAY_RETURN_KEY); } catch { /* Navigation still works. */ }
    return state;
  } catch { return null; }
}
