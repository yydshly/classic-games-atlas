// Deadlines cover the response body too: a connected request can still stall.
export async function readJson(url, {timeoutMs = 8000, fetcher = fetch} = {}) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('资料读取超时'));
    }, timeoutMs);
  });
  try {
    return await Promise.race([(async () => {
      const response = await fetcher(url, {cache: 'no-cache', signal: controller.signal});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    })(), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export function validateRecommendations(catalogue, comparisonData, candidates) {
  const expected = [...catalogue.experiments.map(item => item.id), ...candidates.map(item => item.slug)];
  const items = comparisonData?.items;
  if (!Array.isArray(items) || items.length !== expected.length ||
      new Set(items.map(item => item?.slug)).size !== expected.length ||
      !expected.every(slug => items.some(item => item?.slug === slug && typeof item.play_url === 'string' && item.play_url))) {
    throw new Error('推荐版本资料不完整');
  }
  return items;
}
