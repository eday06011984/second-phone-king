import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../app/news/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('the news heading uses its own layout class beside the shared intro spacing', () => {
  assert.match(page, /<div className="intro news-intro">/);
  assert.match(page, /<h1>3C 新聞<\/h1>/);
});

test('the news intro stacks text without changing the shared flex toolbar', () => {
  assert.match(css, /\.intro\s*\{[^}]*display\s*:\s*flex\s*;/);
  assert.match(css, /\.intro\.news-intro\s*\{\s*display\s*:\s*block\s*;?\s*\}/);
});
