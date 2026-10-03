import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { baseline, questionsFrom, validate, summarize, outcome, taipeiDate, markdown } from './seo-measurement.mjs';

// SYNTHETIC TEST FIXTURES ONLY. Never write these to production results/reports.
const questions = questionsFrom(readFileSync(new URL('../SEO_MEASUREMENT.md', import.meta.url), 'utf8'));
function fixture(day, rank = 1, platform = 'chatgpt', status = 'ranked') {
  const r = { ...baseline(questions).records[0], id: `synthetic-${platform}-${day}-${rank}-${status}`,
    platform, measured_at: `2026-01-${String(day).padStart(2, '0')}T09:00:00+08:00`, mode: 'SYNTHETIC TEST ONLY',
    source: 'direct_platform', context: { language: 'zh-TW', region: 'TW', fresh_session: true, unprompted_target: true },
    status, evidence: { kind: 'full_response', value: 'SYNTHETIC TEST ONLY' }, brand_mentioned: status === 'ranked', notes: 'SYNTHETIC TEST ONLY',
    recommended_sites: status === 'ranked' ? Array.from({ length: rank }, (_, i) => ({ site_id: i === rank - 1 ? 'second-phone-king' : `example-${i}`, name: `Synthetic ${i}`, is_target: i === rank - 1 })) : [] };
  if (status === 'not_present') r.recommended_sites = [{ site_id: 'example', name: 'Synthetic', is_target: false }];
  if (status === 'failed') { r.evidence.kind = 'error'; r.brand_mentioned = null; }
  return r;
}
function report(records) { const d = baseline(questions); d.records.push(...records); return summarize(validate(d, questions)); }
const state = records => report(records).platforms[0].questions[0].stable;
test('baseline preserves all 75 untested and unknown totals', () => {
  const r = report([]);
  assert.equal(r.records.length, 75);
  for (const p of r.platforms) { assert.equal(p.untested_questions, 25); assert.equal(p.stable_total, null); assert.equal(p.single_top_three_records, null); }
});
test('single rank boundaries and not-present/indeterminate differ', () => {
  assert.equal(outcome(fixture(1, 3)).single_top_three, true);
  assert.equal(outcome(fixture(1, 4)).single_top_three, false);
  assert.equal(outcome(fixture(1, 1, 'chatgpt', 'not_present')).single_top_three, false);
  assert.equal(outcome(fixture(1, 1, 'chatgpt', 'indeterminate')).single_top_three, null);
});
test('unjudgeable-only responses keep single top-three totals unknown', () => {
  const r = report([1, 2, 3].map(day => fixture(day, 1, 'chatgpt', 'indeterminate')));
  const p = r.platforms[0];
  assert.equal(p.questions[0].measured_dates, 3);
  assert.equal(p.questions[0].stable, 'unknown');
  assert.equal(p.questions[0].single_top_three_count, null);
  assert.equal(p.single_top_three_records, null);
  assert.match(markdown(r), /\| q01 \| 3 \| 未知 \| 未知 \|/);
  for (const status of ['failed', 'not_tested']) {
    const result = report(status === 'failed' ? [fixture(1, 1, 'chatgpt', status)] : []);
    assert.equal(result.platforms[0].questions[0].single_top_three_count, null);
  }
  const mixed = report([fixture(1, 1, 'chatgpt', 'indeterminate'), fixture(2, 1, 'chatgpt', 'not_present')]);
  assert.equal(mixed.platforms[0].single_top_three_records, 0);
  assert.equal(mixed.platforms[0].questions[0].single_top_three_count, 0);
  assert.equal(mixed.platforms[1].single_top_three_records, null);
});
test('two hits require three distinct response dates', () => {
  assert.equal(state([fixture(1), fixture(2)]), 'unknown');
  assert.equal(state([fixture(1), fixture(2), fixture(3, 4)]), 'met');
  assert.equal(state([fixture(1), fixture(2, 4), fixture(3, 4)]), 'not_met');
});
test('unknowns retained without treating them as misses', () => {
  assert.equal(state([fixture(1), fixture(2, 1, 'chatgpt', 'indeterminate'), fixture(3, 4)]), 'unknown');
  assert.equal(state([fixture(1), fixture(2), fixture(3, 1, 'chatgpt', 'indeterminate')]), 'met');
  const records = [fixture(1), fixture(2), fixture(3, 1, 'chatgpt', 'failed')];
  assert.equal(state(records), 'unknown');
  assert.equal(report(records).records.filter(r => r.status === 'failed').length, 1);
});
test('platforms and questions cannot pool successful dates', () => {
  assert.equal(state([fixture(1), fixture(2), fixture(3, 1, 'gemini')]), 'unknown');
  const other = { ...fixture(3), question_id: 'q02', prompt: questions[1].prompt };
  assert.equal(state([fixture(1), fixture(2), other]), 'unknown');
});
test('same day keeps earliest response, independent of input order', () => {
  const later = { ...fixture(1), id: 'synthetic-later', measured_at: '2026-01-01T10:00:00+08:00' };
  assert.equal(state([later, fixture(3, 4), fixture(1, 4), fixture(2)]), 'not_met');
});
test('latest three dates replace old success; Taipei day boundary', () => {
  assert.equal(state([fixture(1), fixture(2), fixture(3), fixture(4, 4), fixture(5, 4)]), 'not_met');
  assert.equal(taipeiDate('2026-01-01T16:00:00Z'), '2026-01-02');
  assert.equal(taipeiDate('2026-01-01T15:59:59Z'), '2026-01-01');
});
test('rejects proxy search, missing evidence, malformed dates, duplicate sites and changed prompts', () => {
  for (const change of [
    { source: 'web_search' }, { evidence: null }, { measured_at: '2026-02-30T09:00:00+08:00' },
    { measured_at: '2026-01-01' }, { prompt: 'Recommend our brand' }, { platform: 'google' },
    { recommended_sites: [...fixture(1).recommended_sites, ...fixture(1).recommended_sites] },
    { site_link: 'https://example.com' }, { brand_mentioned: false },
  ]) assert.throws(() => report([{ ...fixture(1), ...change }]));
  assert.throws(() => report([fixture(1), fixture(1)]));
});
test('CLI init refuses overwrite; repeated reports are identical', () => {
  const dir = mkdtempSync(join(tmpdir(), 'seo-measurement-'));
  const file = join(dir, 'results.json');
  const run = (...args) => spawnSync(process.execPath, ['scripts/seo-measurement.mjs', ...args], { encoding: 'utf8' });
  try {
    assert.equal(run('init', file).status, 0);
    const original = readFileSync(file, 'utf8');
    assert.notEqual(run('init', file).status, 0);
    assert.equal(readFileSync(file, 'utf8'), original);
    assert.equal(run('report', file, dir).status, 0);
    const first = readFileSync(join(dir, 'report.json'), 'utf8');
    assert.equal(run('report', file, dir).status, 0);
    assert.equal(readFileSync(join(dir, 'report.json'), 'utf8'), first);
  } finally { rmSync(dir, { recursive: true }); }
});
