import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const text = value => typeof value === "string" && value.trim().length > 0;

function calendarDate(value) {
  if (typeof value !== "string" || !DATE.test(value) || value.startsWith("0000")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function timestamp(value) {
  if (typeof value !== "string" || !TIMESTAMP.test(value) || !calendarDate(value.slice(0, 10))) return NaN;
  return Date.parse(value);
}

function taipeiDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}

/** Structural/date checks only: no network requests or archive mutations. */
export function validateNews(news, { now = Date.now() } = {}) {
  if (!Number.isFinite(now)) throw new TypeError("now must be epoch milliseconds");
  const errors = [];
  const fail = (path, message) => errors.push(`${path}: ${message}`);
  if (!Array.isArray(news) || news.length === 0) return ["news: expected a non-empty array"];
  const slugs = new Set();
  const today = taipeiDate(now);
  news.forEach((article, i) => {
    const path = `news[${i}]`;
    if (!object(article)) { fail(path, "expected an object"); return; }
    for (const key of ["slug", "title", "description", "category"]) {
      if (!text(article[key])) fail(`${path}.${key}`, "expected a non-empty string");
    }
    if (typeof article.slug === "string") {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) fail(`${path}.slug`, "expected ASCII kebab-case");
      if (slugs.has(article.slug)) fail(`${path}.slug`, `duplicate slug: ${article.slug}`);
      slugs.add(article.slug);
    }
    const published = timestamp(article.publishedAt);
    const updated = timestamp(article.updatedAt);
    for (const [key, value] of [["publishedAt", published], ["updatedAt", updated]]) {
      if (!Number.isFinite(value)) fail(`${path}.${key}`, "expected a real ISO timestamp with timezone");
      else if (value > now + CLOCK_SKEW_MS) fail(`${path}.${key}`, "more than 5 minutes in the future");
    }
    if (updated < published) fail(`${path}.updatedAt`, "must not precede publishedAt");

    if (!Array.isArray(article.sections) || article.sections.length === 0) {
      fail(`${path}.sections`, "expected a non-empty array");
    } else article.sections.forEach((section, j) => {
      const sectionPath = `${path}.sections[${j}]`;
      if (!object(section)) { fail(sectionPath, "expected an object"); return; }
      if (!text(section.heading)) fail(`${sectionPath}.heading`, "expected a non-empty string");
      if (!Array.isArray(section.paragraphs) || section.paragraphs.length === 0) {
        fail(`${sectionPath}.paragraphs`, "expected a non-empty array");
      } else section.paragraphs.forEach((paragraph, k) => {
        if (!text(paragraph)) fail(`${sectionPath}.paragraphs[${k}]`, "expected a non-empty string");
      });
    });

    if (!Array.isArray(article.sources) || article.sources.length === 0) {
      fail(`${path}.sources`, "expected a non-empty array");
    } else article.sources.forEach((source, j) => {
      const sourcePath = `${path}.sources[${j}]`;
      if (!object(source)) { fail(sourcePath, "expected an object"); return; }
      if (!text(source.name)) fail(`${sourcePath}.name`, "expected a non-empty string");
      try {
        if (typeof source.url !== "string" || !/^https?:\/\//i.test(source.url) || /[\s\\]/.test(source.url)) throw new Error();
        const url = new URL(source.url);
        if (!url.hostname || url.username || url.password) throw new Error();
      } catch { fail(`${sourcePath}.url`, "expected an absolute HTTP(S) URL without credentials or whitespace"); }
      if (!calendarDate(source.date)) fail(`${sourcePath}.date`, "expected a real YYYY-MM-DD date");
      else {
        if (source.date > today) fail(`${sourcePath}.date`, "must not be after today (Asia/Taipei)");
        // Sources may be added on an update. Date-only values use the site's timezone.
        if (Number.isFinite(updated) && source.date > taipeiDate(updated)) {
          fail(`${sourcePath}.date`, "must not be after updatedAt's date (Asia/Taipei)");
        }
      }
    });
  });
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const file = process.argv[2] ?? new URL("../content/news.json", import.meta.url);
    const news = JSON.parse(await readFile(file, "utf8"));
    const errors = validateNews(news);
    if (errors.length) throw new Error(errors.join("\n"));
    console.log(`News validation passed: ${news.length} articles.`);
  } catch (error) {
    console.error(`News validation failed:\n${error.message}`);
    process.exitCode = 1;
  }
}
