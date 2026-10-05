import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";
import { prepareReviewedPublication } from "./news-publication.mjs";
import { readFreshMain } from "./validate-news-publication.mjs";

/** Prepare local data only. Caller must validate fresh main again before push. */
export async function publishReviewedNews(file, { reviewed = false, cwd = process.cwd(), now = () => Date.now() } = {}) {
  const document = JSON.parse(await readFile(file, "utf8"));
  const { sha, news: base } = readFreshMain({ cwd });
  const target = `${cwd}/content/news.json`;
  const current = JSON.parse(await readFile(target, "utf8"));
  if (!isDeepStrictEqual(base, current)) throw new Error("Local news differs from fresh main; preserve your work and reconcile it before publication");
  const proposed = prepareReviewedPublication(base, document, { reviewed, now: now() });
  const added = proposed.length - base.length;
  if (added) {
    // Same-filesystem rename keeps partial writes out of the published archive.
    const temp = await mkdtemp(`${cwd}/content/.news-publication-`);
    try {
      await writeFile(`${temp}/news.json`, `${JSON.stringify(proposed, null, 2)}\n`);
      await rename(`${temp}/news.json`, target);
    } finally { await rm(temp, { recursive: true, force: true }); }
  }
  return { added, sha };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [file, acknowledgement, ...extra] = process.argv.slice(2);
    if (!file || acknowledgement !== "--reviewed" || extra.length) {
      throw new Error("Usage: node scripts/publish-reviewed-news.mjs <reviewed-draft.json> --reviewed (after the NEWS_WORKFLOW.md editorial checklist)");
    }
    const { added, sha } = await publishReviewedNews(file, { reviewed: true });
    console.log(`Prepared ${added} article(s) against main ${sha}; no commit, push, or deployment performed. Revalidate fresh main immediately before pushing.`);
  } catch (error) {
    console.error(`News publication stopped:\n${error.message}`);
    process.exitCode = 1;
  }
}
