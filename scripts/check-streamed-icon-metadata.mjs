// Production-build HTTP regression. Local Worker only; never deploys or writes app data.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.METADATA_TEST_PORT || 8791);
assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
const state = path.join(root, '.sites-runtime/metadata-smoke');
mkdirSync(path.join(state, 'config'), { recursive: true });
const server = spawn(process.execPath, [
  '--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js',
  'dev', '--config', 'dist/server/wrangler.json', '--local', '--ip', '127.0.0.1',
  '--port', String(port), '--inspector-port', '0', '--persist-to', path.join(state, 'state'),
], {
  cwd: root,
  env: { ...process.env, XDG_CONFIG_HOME: path.join(state, 'config'), CLOUDFLARE_CF_FETCH_ENABLED: 'false', WRANGLER_SEND_METRICS: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { log = (log + chunk).slice(-12000); });
let spawnError;
server.on('error', error => { spawnError = error; });
const request = (route, userAgent = 'metadata-regression-test', headers = {}) => new Promise((resolve, reject) => {
  const req = http.get({ hostname: '127.0.0.1', port, path: route, headers: { 'User-Agent': userAgent, ...headers }, timeout: 10000 }, res => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    res.on('error', reject);
  });
  req.on('timeout', () => req.destroy(new Error('HTTP timeout')));
  req.on('error', reject);
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const mobileGooglebot = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.60 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const origin = 'https://xn--4kq449bj1fmzj.tw';
const news = JSON.parse(readFileSync(path.join(root, 'content/news.json'), 'utf8'));
const total = Math.ceil(news.length / 12);
const keys = new Map();

function checkPage(result, page, streamed) {
  assert.equal(result.status, 200);
  assert.doesNotMatch(result.body, /\/news(?::|%3a)[a-z0-9]/i, 'No URL-shaped marker in HTML or embedded RSC');
  const hrefs = [...result.body.matchAll(/\bhref="([^"]+)"/g)].map(match => match[1]);
  const canonical = page === 1 ? `${origin}/news` : `${origin}/news?page=${page}`;
  assert.ok(result.body.includes(`<link rel="canonical" href="${canonical}"`));
  if (page > 1) assert.ok(hrefs.includes(page === 2 ? '/news' : `/news?page=${page - 1}`));
  if (page < total) assert.ok(hrefs.includes(`/news?page=${page + 1}`));
  const articleLinks = hrefs.filter(href => href.startsWith('/news/'));
  assert.ok(articleLinks.length > 0);
  for (const href of articleLinks) assert.ok(news.some(item => href === `/news/${item.slug}`));
  assert.equal(hrefs.filter(href => href === '/favicon.svg').length, 1);
  const markers = [...result.body.matchAll(/<link data-vinext-streamed-icon="([^"]+)"/g)].map(match => match[1]);
  if (streamed) {
    assert.equal(markers.length, 1);
    assert.match(markers[0], /^vxi-[a-f0-9]{16}:0$/);
    if (keys.has(page)) assert.equal(markers[0], keys.get(page));
    keys.set(page, markers[0]);
    assert.ok(result.body.includes('metadataKey\\\":\\\"' + markers[0].slice(0, -2)), 'RSC and HTML use the same key');
  } else assert.equal(markers.length, 0);
}

try {
  const deadline = Date.now() + 45000;
  for (;;) {
    if (spawnError) throw spawnError;
    if (server.exitCode !== null) throw new Error(`Local Worker exited: ${server.exitCode}\n${log}`);
    try { await request('/news?page=3'); break; } catch (error) {
      if (Date.now() >= deadline) throw new Error(`Local Worker did not start: ${error.message}\n${log}`);
      await delay(250);
    }
  }
  for (const page of new Set([1, 2, 3, 4, total])) checkPage(await request(`/news?page=${page}`), page, true);
  checkPage(await request('/news?page=3', mobileGooglebot), 3, true);
  checkPage(await request('/news?page=3', 'Twitterbot/1.0'), 3, false);
  assert.equal(new Set(keys.values()).size, keys.size, 'Different page metadata has distinct keys');
  const rsc = await request('/news.rsc?page=3&_rsc', mobileGooglebot, { RSC: '1', Accept: 'text/x-component' });
  assert.equal(rsc.status, 200);
  assert.match(rsc.headers['content-type'], /text\/x-component/);
  assert.doesNotMatch(rsc.body, /\/news(?::|%3a)[a-z0-9]/i);
  assert.ok(rsc.body.includes(`"metadataKey":"${keys.get(3).slice(0, -2)}"`), 'Direct RSC preserves the same opaque key');
  const bad = await request('/news:d9wvo1');
  assert.equal(bad.status, 404);
  assert.equal(bad.headers.location, undefined, 'No blanket redirect');
  console.log(JSON.stringify({ status: 'PASS', newsCount: news.length, pages: [...keys.keys()], googlebotMobile: true, blockingBot: true, directRsc: true, malformedUrl: 404, browserHydration: 'not exercised' }, null, 2));
} finally {
  server.kill('SIGTERM');
}
