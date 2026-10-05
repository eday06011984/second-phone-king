import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { prepareReviewedPublication, taipeiDate, validatePublication } from "./news-publication.mjs";
import { collectCandidates } from "./update-news.mjs";
import { publishReviewedNews } from "./publish-reviewed-news.mjs";
import { readFreshMain } from "./validate-news-publication.mjs";

const now = Date.parse("2026-10-05T02:00:00Z");
const timestamp = "2026-10-05T10:00:00.000+08:00";
const draft = (id = "new") => ({
  slug: `news-${id}`, title: `原創新聞 ${id}`, category: "手機", description: `編輯查核摘要 ${id}`,
  sections: [{ heading: "官方事實與編輯觀察", paragraphs: ["這是合成測試資料，不得刊登。"] }],
  sources: [{ name: "測試官方", url: `https://example.com/${id}`, date: "2026-10-04" }],
});
const article = (id, date = "2026-10-04T10:00:00+08:00") => ({ ...draft(id), publishedAt: date, updatedAt: date });
const base = () => [article("old")];
const reviewed = (...articles) => ({ kind: "reviewed-news", articles });
const prepare = (archive, ...articles) => prepareReviewedPublication(archive, reviewed(...articles), { reviewed: true, now });

test("yesterday's source stays in sources.date while actual publication time is today", () => {
  const archive = base(); const before = JSON.stringify(archive);
  const proposed = prepare(archive, draft());
  assert.equal(proposed[1].sources[0].date, "2026-10-04");
  assert.equal(proposed[1].publishedAt, timestamp);
  assert.equal(proposed[1].updatedAt, timestamp);
  assert.equal(JSON.stringify(archive), before);
});
test("Taipei midnight resets quota even when UTC date is unchanged", () => {
  const beforeMidnight = Date.parse("2026-10-05T15:59:59.999Z");
  const midnight = beforeMidnight + 1;
  assert.equal(taipeiDate(beforeMidnight), "2026-10-05");
  assert.equal(taipeiDate(midnight), "2026-10-06");
  const full = [1, 2, 3].map(id => article(id, timestamp));
  assert.throws(() => prepareReviewedPublication(full, reviewed(draft()), { reviewed: true, now: beforeMidnight }), /daily limit/);
  const proposed = prepareReviewedPublication(full, reviewed(draft()), { reviewed: true, now: midnight });
  assert.equal(proposed[3].publishedAt, "2026-10-06T00:00:00.000+08:00");
  assert.match(validatePublication(full, prepare(base(), draft()), { now: midnight }).join("\n"), /today/);
});
test("same-day rerun of identical published draft is a no-op", () => {
  const published = prepare(base(), draft());
  assert.deepEqual(prepare(published, draft()), published);
});
test("fresh main's publications share the three-article daily quota", () => {
  const two = [article("one", timestamp), article("two", timestamp)];
  assert.equal(prepare(two, draft()).length, 3);
  assert.throws(() => prepare(two, draft("three"), draft("four")), /2 already published \+ 2 new/);
  const full = prepare(two, draft());
  assert.throws(() => prepare(full, draft("four")), /daily limit/);
});
test("historical over-quota archive is preserved and may be validated unchanged", () => {
  const old = [1, 2, 3, 4].map(id => article(id));
  assert.deepEqual(validatePublication(old, old, { now }), []);
  assert.equal(prepare(old, draft()).length, 5);
  const today = [1, 2, 3, 4].map(id => article(id, timestamp));
  assert.deepEqual(validatePublication(today, today, { now }), []);
  assert.throws(() => prepare(today, draft()), /daily limit/);
});
test("manual backdating, future dates and changing an existing publication fail", () => {
  const archive = base();
  assert.match(validatePublication(archive, [...archive, article("new")], { now }).join("\n"), /do not backdate/);
  assert.match(validatePublication(archive, [...archive, article("new", "2026-10-06T01:00:00+08:00")], { now }).join("\n"), /future/);
  for (const change of [
    news => { news[0].publishedAt = timestamp; news[0].updatedAt = timestamp; },
    news => { news[0].title = "改寫歷史"; },
    news => { news.shift(); },
    news => { news.reverse(); },
  ]) {
    const proposed = prepare(archive, draft()); change(proposed);
    // Use a new baseline because prepare intentionally reuses unchanged archive objects.
    assert.match(validatePublication(base(), proposed, { now }).join("\n"), /archive/);
  }
});
test("new article timestamps must be equal; drafts cannot provide either timestamp", () => {
  for (const key of ["publishedAt", "updatedAt"]) {
    assert.throws(() => prepare(base(), { ...draft(), [key]: timestamp }), /Omit publication timestamps/);
  }
  const proposed = prepare(base(), draft());
  proposed[1].updatedAt = "2026-10-05T10:01:00+08:00";
  assert.match(validatePublication(base(), proposed, { now }).join("\n"), /must match/);
});
test("same-source and same-title duplicates fail, including within one batch", () => {
  for (const duplicate of [
    { ...draft("duplicate"), sources: draft().sources },
    { ...draft("duplicate"), title: draft().title },
    draft(),
  ]) assert.throws(() => prepare(base(), draft(), duplicate), /duplicate|source already used/);
  assert.throws(() => prepare(base(), { ...draft(), sources: draft("old").sources }), /source already used/);
});
test("editorial acknowledgement and separate reviewed draft shape are required", () => {
  assert.throws(() => prepareReviewedPublication(base(), reviewed(draft()), { now }), /Editorial review required/);
  assert.throws(() => prepareReviewedPublication(base(), { kind: "feed-candidates", candidates: [{ sourceTitle: "New Android phone" }] }, { reviewed: true, now }), /raw feed candidates/);
});
const feed = `<rss><channel><item><title>New Android phone</title><description>Unedited English feed summary.</description><link>https://example.com/new-phone</link><pubDate>Sun, 04 Oct 2026 02:00:00 GMT</pubDate></item></channel></rss>`;
test("unedited English feed is only a deduplicated candidate, never an article", async () => {
  const archive = base(); const before = JSON.stringify(archive);
  const candidates = await collectCandidates(archive, { now, fetchFeed: async () => ({ ok: true, text: async () => feed }) });
  assert.equal(candidates.kind, "feed-candidates");
  assert.equal(candidates.candidates.length, 1);
  assert.equal(candidates.candidates[0].sourceTitle, "New Android phone");
  assert.equal(candidates.candidates[0].sources[0].date, "2026-10-04");
  assert.equal(candidates.candidates[0].publishedAt, undefined);
  assert.equal(candidates.candidates[0].sections, undefined);
  assert.equal(JSON.stringify(archive), before);
  assert.throws(() => prepareReviewedPublication(archive, candidates, { reviewed: true, now }), /raw feed candidates/);
});
test("feed failures and full quota leave the archive unchanged", async () => {
  const archive = base(); const before = JSON.stringify(archive);
  const failed = await collectCandidates(archive, { now, fetchFeed: async () => { throw new Error("offline"); } });
  assert.equal(failed.failures.length, 3);
  assert.deepEqual(failed.candidates, []);
  assert.equal(JSON.stringify(archive), before);
  const full = [1, 2, 3].map(id => article(id, timestamp));
  const result = await collectCandidates(full, { now, fetchFeed: async () => assert.fail("full quota must not fetch") });
  assert.equal(result.slotsRemaining, 0);
  assert.deepEqual(result.candidates, []);
});

// Local bare repositories only. No GitHub/network calls or production writes.
function localRepos() {
  const root = mkdtempSync(join(tmpdir(), "news-publication-"));
  const origin = join(root, "origin.git"); const writer = join(root, "writer"); const stale = join(root, "stale");
  const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" }).trim();
  git(root, "init", "--bare", "--initial-branch=main", origin);
  git(root, "clone", origin, writer);
  git(writer, "config", "user.name", "Synthetic Test"); git(writer, "config", "user.email", "test@example.invalid");
  mkdirSync(join(writer, "content"));
  writeFileSync(join(writer, "content/news.json"), JSON.stringify(base()));
  git(writer, "add", "."); git(writer, "commit", "-m", "synthetic baseline"); git(writer, "push", "origin", "main");
  git(root, "clone", origin, stale);
  return { root, origin, writer, stale, git };
}
test("publisher fetches main, stamps once, writes only local news, and no-ops after publication", async () => {
  const r = localRepos();
  try {
    const path = join(r.root, "draft.json"); writeFileSync(path, JSON.stringify(reviewed(draft())));
    const beforeHead = r.git(r.writer, "rev-parse", "HEAD");
    let clockCalls = 0;
    const result = await publishReviewedNews(path, { cwd: r.writer, reviewed: true, now: () => { clockCalls++; return now; } });
    assert.equal(result.added, 1); assert.equal(clockCalls, 1);
    assert.equal(r.git(r.writer, "rev-parse", "HEAD"), beforeHead, "helper must not commit/push");
    const proposed = JSON.parse(readFileSync(join(r.writer, "content/news.json")));
    assert.equal(proposed[1].publishedAt, timestamp);
    r.git(r.writer, "add", "."); r.git(r.writer, "commit", "-m", "synthetic publish"); r.git(r.writer, "push", "origin", "main");
    const bytes = readFileSync(join(r.writer, "content/news.json"), "utf8");
    assert.equal((await publishReviewedNews(path, { cwd: r.writer, reviewed: true, now: () => now })).added, 0);
    assert.equal(readFileSync(join(r.writer, "content/news.json"), "utf8"), bytes);
  } finally { rmSync(r.root, { recursive: true, force: true }); }
});
test("racing writer makes stale main fail closed, then refreshed full quota still fails", async () => {
  const r = localRepos();
  try {
    const path = join(r.root, "draft.json"); writeFileSync(path, JSON.stringify(reviewed(draft("four"))));
    const before = readFileSync(join(r.stale, "content/news.json"), "utf8");
    const newMain = prepare(base(), draft("one"), draft("two"), draft("three"));
    writeFileSync(join(r.writer, "content/news.json"), JSON.stringify(newMain));
    r.git(r.writer, "add", "."); r.git(r.writer, "commit", "-m", "other writer used quota"); r.git(r.writer, "push", "origin", "main");
    await assert.rejects(publishReviewedNews(path, { cwd: r.stale, reviewed: true, now: () => now }), /Stale main/);
    assert.equal(readFileSync(join(r.stale, "content/news.json"), "utf8"), before);
    r.git(r.stale, "merge", "--ff-only", "origin/main");
    const refreshed = readFileSync(join(r.stale, "content/news.json"), "utf8");
    await assert.rejects(publishReviewedNews(path, { cwd: r.stale, reviewed: true, now: () => now }), /daily limit/);
    assert.equal(readFileSync(join(r.stale, "content/news.json"), "utf8"), refreshed);
  } finally { rmSync(r.root, { recursive: true, force: true }); }
});
test("failed fetch, invalid draft and local unpublished changes fail without mutation", async () => {
  const r = localRepos();
  try {
    const target = join(r.writer, "content/news.json"); const before = readFileSync(target, "utf8");
    const path = join(r.root, "draft.json");
    for (const mutate of [d => delete d.sections, d => d.slug = "invalid slug", d => d.sources[0].url = "bad", d => d.publishedAt = "yesterday"]) {
      const invalid = draft(); mutate(invalid); writeFileSync(path, JSON.stringify(reviewed(invalid)));
      await assert.rejects(publishReviewedNews(path, { cwd: r.writer, reviewed: true, now: () => now }));
      assert.equal(readFileSync(target, "utf8"), before);
    }
    writeFileSync(path, JSON.stringify(reviewed(draft())));
    writeFileSync(target, JSON.stringify(prepare(base(), draft("local"))));
    await assert.rejects(publishReviewedNews(path, { cwd: r.writer, reviewed: true, now: () => now }), /Local news differs/);
    r.git(r.writer, "remote", "set-url", "origin", join(r.root, "missing.git"));
    assert.throws(() => readFreshMain({ cwd: r.writer }));
  } finally { rmSync(r.root, { recursive: true, force: true }); }
});

test("fresh-main reader supports an archive larger than the default child-process buffer", () => {
  const r = localRepos();
  try {
    const large = base();
    large[0].sections[0].paragraphs = ["synthetic archive fixture ".repeat(50_000)];
    const json = JSON.stringify(large);
    assert.ok(Buffer.byteLength(json) > 1024 * 1024);
    writeFileSync(join(r.writer, "content/news.json"), json);
    r.git(r.writer, "add", "."); r.git(r.writer, "commit", "-m", "synthetic growing archive"); r.git(r.writer, "push", "origin", "main");
    assert.deepEqual(readFreshMain({ cwd: r.writer }).news, large);
  } finally { rmSync(r.root, { recursive: true, force: true }); }
});
