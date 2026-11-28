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
  const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!date(start) || !date(end) || start > end) throw Error('Invalid date range');
  const length = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  if (length > 3660) throw Error('Date range exceeds 3660 days');
  const grouped = new Map();
  for (const row of rows) {
    if (!date(row.day) || !Number.isSafeInteger(row.views) || row.views <= 0 || !publicPath(row.path)) throw Error('Invalid traffic row');
    if (row.day < start || row.day > end) continue;
    const paths = grouped.get(row.day) ?? new Map();
    const path = publicPath(row.path);
    if (paths.has(path)) throw Error('Duplicate daily path row');
    paths.set(path, row.views);
    grouped.set(row.day, paths);
  }
  const sum = values => {
    const total = values.reduce((n, value) => n + value, 0);
    if (!Number.isSafeInteger(total)) throw Error('Unsafe pageview total');
    return total;
  };
  const daily = Array.from({length}, (_, index) => {
    const day = new Date(Date.parse(start) + index * 86400000).toISOString().slice(0, 10);
    const paths = grouped.get(day);
    return {day, recordedPageviews: paths ? sum([...paths.values()]) : null,
      status: paths ? 'recorded_events_only' : 'unknown', uniqueVisitors: null, timeOnSite: null,
      pages: paths ? [...paths].sort(([a], [b]) => a.localeCompare(b)).map(([path, views]) => ({path, views})) : []};
  });
  const recorded = daily.filter(row => row.recordedPageviews !== null);
  return {start, end, timezone: 'Asia/Taipei', recordedPageviews: recorded.length ? sum(recorded.map(row => row.recordedPageviews)) : null,
    status: recorded.length ? 'recorded_events_only' : 'unknown', browserIdentifiers: null, people: null,
    uniqueVisitors: null, timeOnSite: null, daily,
    note: 'Empty data is unknown, not zero visitors. Counts exclude explicit QA but do not identify humans or prove complete tracking coverage.'};
}
