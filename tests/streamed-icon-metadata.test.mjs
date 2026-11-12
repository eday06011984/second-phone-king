import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const vendor = realpathSync(path.join(root, 'node_modules/vinext'));
const wiring = readFileSync(path.join(vendor, 'dist/server/app-page-route-wiring.js'), 'utf8');
const { fnv1a64 } = await import(pathToFileURL(path.join(vendor, 'dist/utils/hash.js')));
const { reconcileStreamedIcons } = await import(pathToFileURL(path.join(vendor, 'dist/shims/streamed-icons.js')));

// Exercise the installed, patched implementation, not a reimplementation.
// This deliberately fails closed if an upgrade changes the pinned vendor seam.
const keySource = wiring.match(/function createStreamedIconKey\(pathname, metadataHtml\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(keySource, 'Review the vendor patch after any Vinext upgrade');
const createKey = vm.runInNewContext(`(${keySource})`, { fnv1a64 });
const fixture = readFileSync(new URL('./fixtures/news-page3-metadata.html', import.meta.url), 'utf8').trimEnd();

test('the exact pinned dependency patch is registered and installed', () => {
  assert.equal(JSON.parse(readFileSync(path.join(vendor, 'package.json'), 'utf8')).version, '1.0.0-beta.5');
  const workspace = readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8');
  assert.match(workspace, /vinext@1\.0\.0-beta\.5: patches\/vinext@1\.0\.0-beta\.5\.patch/);
  assert.match(keySource, /vxi-/);
  assert.doesNotMatch(keySource, /return `\$\{pathname\}:/);
});

test('the observed page-3 metadata no longer exposes /news:d9wvo1', () => {
  let oldHash = 2166136261;
  for (let i = 0; i < fixture.length; i++) oldHash = Math.imul(oldHash ^ fixture.charCodeAt(i), 16777619);
  assert.equal(`/news:${(oldHash >>> 0).toString(36)}`, '/news:d9wvo1');
  assert.match(createKey('/news', fixture), /^vxi-[a-f0-9]{16}$/);
  assert.doesNotMatch(createKey('/news', fixture), /news|\/|:|%3a/i);
});

test('keys retain route and metadata identity, including Unicode and separators', () => {
  const key = createKey('/news', fixture);
  assert.equal(createKey('/news', fixture), key);
  assert.notEqual(createKey('/other', fixture), key);
  assert.notEqual(createKey('/news', fixture.replace('第 3 頁', '第 4 頁')), key);
  assert.notEqual(createKey('/a', 'b:c'), createKey('/a:b', 'c'));
  for (const route of ['/', '/新聞', '/news:bad', '/a?b=1', '/a#fragment']) {
    assert.match(createKey(route, fixture), /^vxi-[a-f0-9]{16}$/);
  }
});

function documentDouble() {
  const nodes = [];
  const add = (id, marker, location = 'head') => {
    const node = {
      id, marker, location,
      getAttribute(name) {
        assert.equal(name, 'data-vinext-streamed-icon');
        return this.marker;
      },
      remove() { this.location = null; },
    };
    nodes.push(node);
    return node;
  };
  const document = {
    head: {
      appendChild(node) {
        node.location = 'head';
        nodes.splice(nodes.indexOf(node), 1);
        nodes.push(node);
      },
    },
    querySelectorAll(selector) {
      assert.match(selector, /^(body|head) link\[data-vinext-streamed-icon\]$/);
      return nodes.filter(node => node.location === selector.split(' ')[0] && node.marker !== null);
    },
  };
  return { document, add, head: () => nodes.filter(node => node.location === 'head').map(node => node.id) };
}

test('unchanged vendor reconciliation preserves order, deduplication and navigation cleanup', () => {
  const oldDocument = globalThis.document;
  const dom = documentDouble();
  globalThis.document = dom.document;
  try {
    const page3 = createKey('/news', fixture);
    const page4 = createKey('/news', fixture.replace('第 3 頁', '第 4 頁'));
    dom.add('third-party-icon', null);
    dom.add('previous-route', `${page4}:0`);
    dom.add('legacy-marker', '/news:d9wvo1:0');
    dom.add('second', `${page3}:1`, 'body');
    dom.add('duplicate-first', `${page3}:0`, 'body');
    dom.add('first', `${page3}:0`, 'body');
    dom.add('invalid-order', `${page3}:NaN`, 'body');
    dom.add('negative-order', `${page3}:-1`, 'body');
    reconcileStreamedIcons(page3);
    assert.deepEqual(dom.head(), ['third-party-icon', 'first', 'second']);
    reconcileStreamedIcons(page3);
    assert.deepEqual(dom.head(), ['third-party-icon', 'first', 'second']);
    dom.add('next-page', `${page4}:0`, 'body');
    reconcileStreamedIcons(page4);
    assert.deepEqual(dom.head(), ['third-party-icon', 'next-page']);
    dom.add('back-page', `${page3}:0`, 'body');
    reconcileStreamedIcons(page3);
    assert.deepEqual(dom.head(), ['third-party-icon', 'back-page']);
    reconcileStreamedIcons('');
    assert.deepEqual(dom.head(), ['third-party-icon']);
  } finally {
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});
