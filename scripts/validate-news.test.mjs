import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
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

test("workflow gate: four required failures cannot reach commit or push", () => {
  const workflow = readFileSync(new URL("../.github/workflows/daily-news.yml", import.meta.url), "utf8");
  assert.match(workflow, /- cron: "15 18 \* \* \*"/);
  assert.doesNotMatch(workflow, /continue-on-error|always\(\)/);
  assert.match(workflow, /if: \$\{\{ success\(\) && steps.validate-news.outcome == 'success' \}\}/);
  const validateCommand = workflow.match(/id: validate-news\n\s+run: (.+)/)[1];
  const commitBody = workflow.split("      - name: Commit and push when news changed\n")[1]
    .split("        run: |\n")[1].split("\n").map(line => line.replace(/^          /, "")).join("\n");
  assert.ok(workflow.indexOf(validateCommand) < workflow.indexOf("- name: Commit and push"));
  const dir = mkdtempSync(join(tmpdir(), "news-gate-"));
  try {
    const path = join(dir, "news.json");
    const marker = join(dir, "git-calls");
    // Execute the actual workflow commands in one fail-fast shell (a stricter
    // version of the sequential Actions success gate). Git is a local stub.
    const shell = `git() { printf '%s\\n' "$*" >> "$GIT_MARKER"; if [ "$1" = diff ]; then return 1; fi; };\n${validateCommand.replace("node scripts/validate-news.mjs", '"$NODE" "$VALIDATOR" "$NEWS"')}\n${commitBody}`;
    for (const [, mutate] of cases.slice(0, 4)) {
      const news = fixture(); mutate(news); writeFileSync(path, JSON.stringify(news));
      const result = spawnSync("bash", ["-e", "-o", "pipefail", "-c", shell], {
        encoding: "utf8", env: { ...process.env, NODE: process.execPath, VALIDATOR: validator, NEWS: path, GIT_MARKER: marker },
      });
      assert.equal(result.status, 1, result.stderr);
      assert.equal(existsSync(marker), false, "validation failure must not reach git");
    }
    writeFileSync(path, JSON.stringify(fixture()));
    const valid = spawnSync("bash", ["-e", "-o", "pipefail", "-c", shell], {
      encoding: "utf8", env: { ...process.env, NODE: process.execPath, VALIDATOR: validator, NEWS: path, GIT_MARKER: marker },
    });
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(readFileSync(marker, "utf8"), /commit -m/);
    assert.match(readFileSync(marker, "utf8"), /push/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
