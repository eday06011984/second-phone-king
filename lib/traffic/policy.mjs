export const productionOrigin = 'https://xn--4kq449bj1fmzj.tw';
export const qaKey = 'spk_analytics_qa';
export function taipeiDay(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}
// Only public content paths. Never store query strings, referrers or account paths.
export function publicPath(value) {
  if (typeof value !== 'string' || value.length > 200 || /[?#\\%\s]/.test(value)) return null;
  if (!/^\/(?:$|(?:market|stores|phones|brands|guides|news|used-phones|about|faq|join|terms)(?:\/[A-Za-z0-9_-]+)?\/?$)/.test(value)) return null;
  return value === '/' ? value : value.replace(/\/$/, '');
}
export function trustedRequest(request) {
  return request.headers.get('origin') === productionOrigin && new URL(request.url).origin === productionOrigin && request.headers.get('sec-fetch-site') === 'same-origin';
}
export function qaState(search, storage) {
  const value = new URLSearchParams(search).get('analytics_qa');
  try {
    if (value === '1') storage?.setItem(qaKey, '1');
    if (value === '0') storage?.removeItem(qaKey);
    return value !== null || storage?.getItem(qaKey) === '1';
  } catch { return value !== null; }
}
export function summarizeDays(rows, start, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) throw Error('Invalid date range');
  const valid = rows.filter(r => r.day >= start && r.day <= end && Number.isSafeInteger(r.views) && r.views > 0 && publicPath(r.path));
  return {start, end, timezone: 'Asia/Taipei', recordedPageviews: valid.length ? valid.reduce((n,r) => n+r.views,0) : null, status: valid.length ? 'recorded_events_only' : 'unknown', browserIdentifiers: null, people: null, note: 'Empty data is unknown, not zero visitors. Counts exclude explicit QA but do not identify humans or prove complete tracking coverage.'};
}
