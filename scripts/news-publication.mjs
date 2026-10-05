import { isDeepStrictEqual } from "node:util";
import { validateNews } from "./validate-news.mjs";

export const MAX_DAILY_ARTICLES = 3;
export function taipeiDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}

/** Compare with a freshly fetched main archive, not an old local quota count.
 * This validates publication mechanics; it cannot verify language, originality,
 * source reliability, or whether an editor actually performed their review.
 */
export function validatePublication(base, proposed, { now = Date.now() } = {}) {
  const errors = [...validateNews(base, { now }), ...validateNews(proposed, { now })];
  if (errors.length) return errors;
  if (!isDeepStrictEqual(proposed.slice(0, base.length), base)) {
    errors.push("Published archive order/content must be preserved; append new articles only");
  }
  const bySlug = new Map(proposed.map(article => [article.slug, article]));
  for (const article of base) {
    if (!isDeepStrictEqual(bySlug.get(article.slug), article)) {
      errors.push(`${article.slug}: published archive must remain unchanged`);
    }
  }
  const existingSlugs = new Set(base.map(article => article.slug));
  const additions = proposed.filter(article => !existingSlugs.has(article.slug));
  const today = taipeiDate(now);
  const todayCount = base.filter(article => taipeiDate(article.publishedAt) === today).length;
  if (additions.length && todayCount + additions.length > MAX_DAILY_ARTICLES) {
    errors.push(`${today} (Asia/Taipei): ${todayCount} already published + ${additions.length} new exceeds daily limit ${MAX_DAILY_ARTICLES}`);
  }
  const urls = new Set(base.flatMap(article => article.sources.map(source => source.url)));
  const titles = new Set(base.map(article => article.title.trim().toLowerCase()));
  for (const article of additions) {
    if (taipeiDate(article.publishedAt) !== today || taipeiDate(article.updatedAt) !== today) {
      errors.push(`${article.slug}: new publication timestamps must be today (Asia/Taipei); do not backdate to source dates`);
    }
    if (article.publishedAt !== article.updatedAt) {
      errors.push(`${article.slug}: new publishedAt and updatedAt must match`);
    }
    const title = article.title.trim().toLowerCase();
    if (titles.has(title)) errors.push(`${article.slug}: duplicate title`);
    titles.add(title);
    for (const source of article.sources) {
      if (urls.has(source.url)) errors.push(`${article.slug}: source already used: ${source.url}`);
      urls.add(source.url);
    }
  }
  return errors;
}

/** Only the editor's separately written article drafts enter this path.
 * --reviewed is an explicit caller acknowledgement, not machine proof of review.
 */
export function prepareReviewedPublication(base, document, { reviewed = false, now = Date.now() } = {}) {
  if (!reviewed) throw new Error("Editorial review required: verify sources and write original Traditional Chinese before using --reviewed");
  if (document?.kind !== "reviewed-news" || !Array.isArray(document.articles)) {
    throw new Error("Expected a reviewed-news document; raw feed candidates cannot be published");
  }
  const bySlug = new Map(base.map(article => [article.slug, article]));
  const additions = [];
  for (const draft of document.articles) {
    if (!draft || typeof draft !== "object" || Array.isArray(draft)) throw new Error("Expected an article draft object");
    if ("publishedAt" in draft || "updatedAt" in draft) throw new Error("Omit publication timestamps from drafts; the publisher stamps the actual current time");
    const existing = bySlug.get(draft.slug);
    if (existing) {
      const content = { ...existing };
      delete content.publishedAt; delete content.updatedAt;
      if (!isDeepStrictEqual(content, draft)) throw new Error(`${draft.slug}: published archive must remain unchanged`);
      continue; // Re-running an already published, identical draft is a no-op.
    }
    const publishedAt = new Date(now + 8 * 60 * 60 * 1000).toISOString().replace("Z", "+08:00");
    additions.push({ ...draft, publishedAt, updatedAt: publishedAt });
  }
  const proposed = [...base, ...additions];
  const errors = validatePublication(base, proposed, { now });
  if (errors.length) throw new Error(errors.join("\n"));
  return proposed;
}
