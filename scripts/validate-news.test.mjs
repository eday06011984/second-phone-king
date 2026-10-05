import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { validateNews } from "./validate-news.mjs";

const now = Date.parse("2026-10-03T00:00:00Z");
const fixture = () => [{
  slug: "valid-news", title: "新聞", description: "摘要", category: "手機",
  publishedAt: "2026-10-02T09:00:00+08:00", updatedAt: "2026-10-02T09:00:00+08:00",
  sections: [{ heading: "官方資訊", paragraphs: ["內文"] }],
  sources: [{ name: "官方", url: "https://example.com/公告", date: "2026-10-02" }],
}];
const cases = [
  ["missing sections", n => delete n[0].sections, /sections/],
  ["duplicate slug", n => n.push(structuredClone(n[0])), /duplicate slug/],
  ["bad URL", n => n[0].sources[0].url = "not a URL", /sources\[0\].url/],
  ["bad publication date", n => n[0].publishedAt = "not a date", /publishedAt/],
  ["bad update date", n => n[0].updatedAt = "2026-02-30T09:00:00Z", /updatedAt/],
  ["bad source date", n => n[0].sources[0].date = "2026-02-30", /sources\[0\].date/],
  ["empty sections", n => n[0].sections = [], /sections/],
  ["empty paragraphs", n => n[0].sections[0].paragraphs = [], /paragraphs/],
  ["wrong paragraph type", n => n[0].sections[0].paragraphs = [42], /paragraphs/],
  ["blank paragraph", n => n[0].sections[0].paragraphs = ["  "], /paragraphs/],
  ["null section", n => n[0].sections = [null], /sections/],
  ["empty sources", n => n[0].sources = [], /sources/],
  ["null source", n => n[0].sources = [null], /sources/],
  ["non-http URL", n => n[0].sources[0].url = "javascript:alert(1)", /url/],
  ["invalid host", n => n[0].sources[0].url = "https://[invalid", /url/],
  ["timezone absent", n => n[0].publishedAt = "2026-10-02T09:00:00", /publishedAt/],
  ["update before publication", n => n[0].updatedAt = "2026-10-01T09:00:00+08:00", /updatedAt/],
  ["future publication", n => n[0].publishedAt = "2099-01-01T00:00:00Z", /future/],
  ["future update", n => n[0].updatedAt = "2099-01-01T00:00:00Z", /future/],
  ["future source", n => n[0].sources[0].date = "2099-01-01", /sources\[0\].date/],
  ["source after update", n => n[0].sources[0].date = "2026-10-03", /after updatedAt/],
  ["invalid slug", n => n[0].slug = "../news", /slug/],
];
for (const field of ["slug", "title", "description", "category"]) {
  cases.push([`missing ${field}`, n => delete n[0][field], new RegExp(field)]);
  cases.push([`wrong ${field} type`, n => n[0][field] = {}, new RegExp(field)]);
}

test("valid archive, timezone boundary and microseconds pass without mutation", () => {
  const news = fixture();
  news[0].publishedAt = "2026-10-01T23:30:00.845387+00:00";
  news[0].updatedAt = news[0].publishedAt;
  const before = JSON.stringify(news);
  assert.deepEqual(validateNews(news, { now }), []);
  assert.equal(JSON.stringify(news), before);
});
test("older source and later source added at update are allowed", () => {
  const news = fixture();
  news[0].publishedAt = "2020-01-01T00:00:00Z";
  assert.deepEqual(validateNews(news, { now }), []);
  news[0].sources[0].date = "2019-01-01";
  assert.deepEqual(validateNews(news, { now }), []);
});
test("invalid root and article types fail", () => {
  for (const value of [null, {}, [], [null], ["article"]]) {
    assert.ok(validateNews(value, { now }).length);
  }
});
for (const [name, mutate, expected] of cases) {
  test(name, () => {
    const news = fixture(); mutate(news);
    assert.match(validateNews(news, { now }).join("\n"), expected);
  });
}

const validator = fileURLToPath(new URL("./validate-news.mjs", import.meta.url));
test("CLI rejects bad JSON and unreadable files", () => {
  const dir = mkdtempSync(join(tmpdir(), "news-cli-"));
  try {
    const path = join(dir, "bad.json"); writeFileSync(path, "{");
    for (const file of [path, join(dir, "missing.json")]) {
      const result = spawnSync(process.execPath, [validator, file], { encoding: "utf8" });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /News validation failed/);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scheduled feed collection has no publication credentials or commit/push path", () => {
  const workflow = readFileSync(new URL("../.github/workflows/daily-news.yml", import.meta.url), "utf8");
  assert.match(workflow, /- cron: "15 18 \* \* \*"/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /path: work\/news-candidates.json/);
  assert.doesNotMatch(workflow, /contents: write|git (?:commit|push)|publish-reviewed-news|continue-on-error/);
  const publication = readFileSync(new URL("../.github/workflows/news-publication.yml", import.meta.url), "utf8");
  assert.match(publication, /pull_request:/);
  assert.match(publication, /merge_group:/);
  assert.doesNotMatch(publication, /paths:/);
  assert.match(publication, /fetch-depth: 0/);
  assert.match(publication, /npm run validate:news:publication/);
  assert.doesNotMatch(publication, /contents: write|git (?:commit|push)|continue-on-error/);
});
