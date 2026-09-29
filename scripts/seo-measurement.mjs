import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PLATFORMS = ['chatgpt', 'gemini', 'google_ai_overview'];
const STATUSES = ['not_tested', 'ranked', 'not_present', 'indeterminate', 'failed'];
const observed = r => ['ranked', 'not_present', 'indeterminate'].includes(r.status);
const requireThat = (value, message) => { if (!value) throw new Error(message); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export function questionsFrom(text) {
  return [...text.split('## 固定問句')[1].split('## 初始狀態')[0].matchAll(/^(\d+)\. (.+)$/gm)]
    .map(([, id, prompt]) => ({ id: `q${id.padStart(2, '0')}`, prompt }));
}
export function baseline(questions) {
  return { schema_version: 1, timezone: 'Asia/Taipei', questions, records: questions.flatMap(q => PLATFORMS.map(platform => ({
    id: `baseline-${platform}-${q.id}`, question_id: q.id, platform, prompt: q.prompt,
    status: 'not_tested', measured_at: null, mode: null, source: null, context: null,
    evidence: null, brand_mentioned: null, site_link: null, recommended_sites: [], notes: '',
  }))) };
}
export function taipeiDate(timestamp) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp));
}
export function validate(data, expectedQuestions) {
  requireThat(data.schema_version === 1 && data.timezone === 'Asia/Taipei', 'Unsupported schema/timezone');
  requireThat(expectedQuestions.length === 25 && JSON.stringify(data.questions) === JSON.stringify(expectedQuestions), 'Questions must exactly match the 25 fixed prompts in SEO_MEASUREMENT.md');
  requireThat(Array.isArray(data.records), 'records must be an array');
  const ids = new Set();
  for (const r of data.records) {
    const fail = message => requireThat(false, `${r.id ?? '(missing id)'}: ${message}`);
    if (!nonempty(r.id) || ids.has(r.id)) fail('record id must be unique');
    ids.add(r.id);
    if (!PLATFORMS.includes(r.platform) || !STATUSES.includes(r.status)) fail('invalid platform/status');
    if (expectedQuestions.find(q => q.id === r.question_id)?.prompt !== r.prompt) fail('unknown question or changed prompt');
    if (!Array.isArray(r.recommended_sites) || typeof r.notes !== 'string') fail('recommended_sites array and notes string required');
    if (r.status === 'not_tested') {
      if (['measured_at', 'mode', 'source', 'context', 'evidence', 'brand_mentioned', 'site_link'].some(k => r[k] !== null) || r.recommended_sites.length) fail('not_tested must have null observation fields and no sites');
      continue;
    }
    if (!nonempty(r.measured_at) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(r.measured_at) || !Number.isFinite(Date.parse(r.measured_at))) fail('valid ISO timestamp with timezone required');
    const datePart = r.measured_at.slice(0, 10);
    if (new Date(`${datePart}T00:00:00Z`).toISOString().slice(0, 10) !== datePart) fail('invalid calendar date');
    if (!nonempty(r.mode) || r.source !== 'direct_platform' || r.context?.language !== 'zh-TW' || r.context?.region !== 'TW' || r.context?.fresh_session !== true || r.context?.unprompted_target !== true) fail('direct platform, mode and neutral Taiwan/fresh-session context required');
    if (!r.evidence || !['full_response', 'screenshot', 'error'].includes(r.evidence.kind) || !nonempty(r.evidence.value)) fail('full response, screenshot reference or error evidence required');
    if (r.status === 'failed') {
      if (r.evidence.kind !== 'error' || r.brand_mentioned !== null || r.site_link !== null || r.recommended_sites.length || !nonempty(r.notes)) fail('failed requires error evidence/notes and null observations');
      continue;
    }
    if (r.evidence.kind === 'error' || typeof r.brand_mentioned !== 'boolean') fail('actual response evidence and brand_mentioned boolean required');
    if (r.site_link !== null) {
      let url;
      try { url = new URL(r.site_link); } catch { fail('invalid target link'); }
      if (url.protocol !== 'https:' || !['xn--4kq449bj1fmzj.tw', 'www.xn--4kq449bj1fmzj.tw'].includes(url.hostname)) fail('site_link must link to the target domain');
    }
    const sites = new Set();
    for (const site of r.recommended_sites) {
      if (!nonempty(site.site_id) || !nonempty(site.name) || typeof site.is_target !== 'boolean' || sites.has(site.site_id)) fail('sites require unique canonical site_id, name and is_target');
      sites.add(site.site_id);
      if (site.is_target !== (site.site_id === 'second-phone-king')) fail('target must use canonical id second-phone-king');
    }
    const target = r.recommended_sites.some(s => s.is_target);
    if (r.status === 'ranked' && (!target || (!r.brand_mentioned && r.site_link === null))) fail('ranked requires a target recommendation and target mention/link');
    if (r.status === 'not_present' && (target || !r.recommended_sites.length)) fail('not_present requires an ordered list without target');
    if (r.status === 'indeterminate' && (r.recommended_sites.length || !nonempty(r.notes))) fail('indeterminate has no ranked list; explain why in notes');
  }
  return data;
}
export function outcome(r) {
  const rank = r.status === 'ranked' ? r.recommended_sites.findIndex(s => s.is_target) + 1 : null;
  return { ...r, date: r.measured_at ? taipeiDate(r.measured_at) : null,
    target_rank: rank, top_three_sites: r.recommended_sites.slice(0, 3),
    single_top_three: rank !== null ? rank <= 3 : r.status === 'not_present' ? false : null };
}
export function summarize(data) {
  const records = data.records.map(outcome);
  return { schema_version: 1, timezone: data.timezone, policy: 'Latest 3 response dates; earliest actual response per Taipei date; failed attempts retained but not measured dates',
    platforms: PLATFORMS.map(platform => {
      const rows = records.filter(r => r.platform === platform);
      const questions = data.questions.map(q => {
        const attempts = rows.filter(r => r.question_id === q.id && r.status !== 'not_tested').sort((a, b) => Date.parse(a.measured_at) - Date.parse(b.measured_at) || a.id.localeCompare(b.id));
        const daily = new Map();
        for (const r of attempts.filter(observed)) if (!daily.has(r.date)) daily.set(r.date, r);
        const window = [...daily.values()].slice(-3);
        const hits = window.filter(r => r.single_top_three === true).length;
        const misses = window.filter(r => r.single_top_three === false).length;
        const stable = window.length < 3 ? 'unknown' : hits >= 2 ? 'met' : misses >= 2 ? 'not_met' : 'unknown';
        return { ...q, attempted: attempts.length > 0, measured_dates: daily.size,
          status_counts: Object.fromEntries(STATUSES.map(s => [s, rows.filter(r => r.question_id === q.id && r.status === s).length])),
          single_top_three_count: attempts.some(r => r.single_top_three !== null) ? attempts.filter(r => r.single_top_three === true).length : null,
          selected_record_ids: window.map(r => r.id), stable };
      });
      const known = questions.filter(q => q.stable !== 'unknown');
      return { platform, total_questions: questions.length, untested_questions: questions.filter(q => !q.attempted).length,
        single_top_three_records: rows.some(r => r.single_top_three !== null) ? rows.filter(r => r.single_top_three === true).length : null,
        confirmed_stable_questions: questions.filter(q => q.stable === 'met').length,
        stable_total: known.length === questions.length ? questions.filter(q => q.stable === 'met').length : null,
        stable_unknown_questions: questions.length - known.length, questions };
    }), records };
}
const display = value => value === null ? '未知' : value;
export function markdown(report) {
  const lines = ['# AI 搜尋曝光驗收報表', '', '由資料產生；未測不是零曝光。三平台分開判定，目標各為 8 組；本工具不執行 AI 搜尋。', '',
    '| 平台 | 未測問句 | 單次前三紀錄 | 已確認穩定組數（下限） | 穩定總組數 | 穩定未知問句 |', '|---|---:|---:|---:|---:|---:|'];
  for (const p of report.platforms) lines.push(`| ${p.platform} | ${p.untested_questions} | ${display(p.single_top_three_records)} | ${p.confirmed_stable_questions} | ${display(p.stable_total)} | ${p.stable_unknown_questions} |`);
  for (const p of report.platforms) {
    lines.push('', `## ${p.platform}`, '', '| 問句 ID | 實測日期數 | 單次前三 | 穩定判定 | 採用紀錄 ID |', '|---|---:|---:|---|---|');
    for (const q of p.questions) lines.push(`| ${q.id} | ${q.measured_dates} | ${display(q.single_top_three_count)} | ${{met:'達標',not_met:'未達標',unknown:'未知'}[q.stable]} | ${q.selected_record_ids.join(', ') || '—'} |`);
  }
  lines.push('', '完整問句、各狀態計數、品牌提及、本站連結、前三網站、名次與全部原始紀錄請見同目錄 report.json。', '只有完整、可判讀的推薦網站順序可計名次；引用來源列不計。證據真實性仍須人工核對。', '');
  return lines.join('\n');
}
function main() {
  const [command = 'report', input = 'seo-measurement/results.json', output = 'seo-measurement/reports'] = process.argv.slice(2);
  requireThat(['init', 'validate', 'report'].includes(command), 'Usage: node scripts/seo-measurement.mjs init|validate|report [input.json] [output-directory]');
  const questions = questionsFrom(readFileSync(resolve(ROOT, 'SEO_MEASUREMENT.md'), 'utf8'));
  const file = resolve(input);
  if (command === 'init') {
    const data = baseline(questions);
    validate(data, questions);
    writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
    console.log(`Created empty baseline: ${file}`);
    return;
  }
  const data = validate(JSON.parse(readFileSync(file, 'utf8')), questions);
  if (command === 'validate') { console.log(`Valid: ${data.records.length} records`); return; }
  const report = summarize(data);
  const out = resolve(output);
  requireThat(![resolve(out, 'report.json'), resolve(out, 'report.md')].includes(file), 'Output must not overwrite input');
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(resolve(out, 'report.md'), markdown(report));
  console.log(markdown(report).split('\n##')[0]);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
