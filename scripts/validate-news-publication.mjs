import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { validatePublication } from "./news-publication.mjs";

/** Fail closed on fetch failures and stale branches; never rebase or force-push. */
export function readFreshMain({ cwd = process.cwd() } = {}) {
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("fetch", "origin", "main:refs/remotes/origin/main");
  const sha = git("rev-parse", "refs/remotes/origin/main");
  try { git("merge-base", "--is-ancestor", sha, "HEAD"); }
  catch { throw new Error(`Stale main: update the branch to ${sha}, then recheck the quota and timestamps; do not blindly rebase a news publication`); }
  return { sha, news: JSON.parse(git("show", `${sha}:content/news.json`)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length > 2) throw new Error("Run from the repository root without arguments; the baseline is always freshly fetched origin/main");
    const { sha, news: base } = readFreshMain();
    const proposed = JSON.parse(await readFile("content/news.json", "utf8"));
    const errors = validatePublication(base, proposed);
    if (errors.length) throw new Error(errors.join("\n"));
    console.log(`Publication validation passed against fresh main ${sha}. Editorial review and deployment still require verification.`);
  } catch (error) {
    console.error(`Publication validation failed:\n${error.message}`);
    process.exitCode = 1;
  }
}
