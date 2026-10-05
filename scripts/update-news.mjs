/**
 * Daily official-feed candidate collector (never a publisher).
 *
 * Raw feed text is unreviewed source material, not original Traditional Chinese.
 * Save it outside public content for the editorial workflow in NEWS_WORKFLOW.md.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MAX_DAILY_ARTICLES, taipeiDate } from "./news-publication.mjs";
import { validateNews } from "./validate-news.mjs";

const NEWS_FILE = new URL("../content/news.json", import.meta.url);
const CANDIDATES_FILE = new URL("../work/news-candidates.json", import.meta.url);
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const FRESH_AGE_MS = 48 * 60 * 60 * 1000;

// Keep the site tightly focused on phones, mobile software, accessories and the used-phone buying market.
const MOBILE_TERMS = /\b(iphone|ios|ipad|airpods|galaxy|pixel|android|smartphone|phone|mobile|foldable|wear os|one ui|camera|battery|charging|charger|usb-c|bluetooth|5g|esim|sim|app store|play store)\b/i;
const MOBILE_TERMS_ZH = /(手機|智慧型手機|二手機|中古機|蘋果手機|安卓|摺疊機|相機|電池|充電|充電器|行動裝置|行動通訊|耳機|穿戴|系統更新)/i;
const OFF_TOPIC = /\b(appliance|refrigerator|washer|dishwasher|oven|tv|television|monitor|projector|signage|semiconductor|foundry|memory chip|ai ran|network infrastructure|base station)\b/i;

function isMobileRelevant(item) {
  const text = `${item.title} ${item.description}`;
  if (OFF_TOPIC.test(text) && !MOBILE_TERMS.test(text) && !MOBILE_TERMS_ZH.test(text)) return false;
  return MOBILE_TERMS.test(text) || MOBILE_TERMS_ZH.test(text);
}

// Prefer manufacturer / platform announcements. Add another verified RSS/Atom
// feed here when a source is needed; never use scraped news sites as a source.
const FEEDS = [
  { name: "Apple Newsroom", url: "https://www.apple.com/newsroom/rss-feed.rss", category: "Apple 動態" },
  { name: "Samsung Newsroom", url: "https://news.samsung.com/global/feed", category: "Android 動態" },
  { name: "Google 官方網誌", url: "https://blog.google/products/android/rss/", category: "Android 動態" },
];

const clean = (value = "") => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&#x27;/gi, "'")
  .replace(/\s+/g, " ").trim();

function field(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return clean(match[1]);
  }
  return "";
}

function linkFor(block) {
  const textLink = field(block, ["link"]);
  if (textLink.startsWith("http")) return textLink;
  const href = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return href ? href[1] : "";
}

function parseFeed(xml, feed) {
  const blocks = [...xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].map(m => m[1]);
  return blocks.map(block => ({
    title: field(block, ["title"]),
    description: field(block, ["description", "summary", "content", "content:encoded"]),
    url: linkFor(block),
    publishedAt: field(block, ["pubDate", "published", "updated", "dc:date"]),
    source: feed,
  })).filter(item => item.title && item.url && item.publishedAt);
}

/** Read-only with respect to the published archive; safe to run without an editor. */
export async function collectCandidates(news, { now = Date.now(), fetchFeed = fetch } = {}) {
  const errors = validateNews(news, { now });
  if (errors.length) throw new Error(errors.join("\n"));
  const today = taipeiDate(now);
  const publishedToday = news.filter(article => taipeiDate(article.publishedAt) === today).length;
  const slotsRemaining = Math.max(0, MAX_DAILY_ARTICLES - publishedToday);
  const document = {
    kind: "feed-candidates", generatedAt: new Date(now).toISOString(),
    publicationDay: today, publishedToday, slotsRemaining,
    editorialRequired: true, candidates: [], failures: [],
  };
  if (!slotsRemaining) return document;
  const responses = await Promise.allSettled(FEEDS.map(async feed => {
    const response = await fetchFeed(feed.url, {
      headers: { "user-agent": "second-phone-king-news-updater/1.0" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`${feed.name}: HTTP ${response.status}`);
    return parseFeed(await response.text(), feed);
  }));
  document.failures = responses.filter(result => result.status === "rejected").map(result => String(result.reason.message));
  const urls = new Set(news.flatMap(article => article.sources.map(source => source.url)));
  const titles = new Set(news.map(article => article.title.trim().toLowerCase()));
  const candidates = responses.flatMap(result => result.status === "fulfilled" ? result.value : [])
    .filter(item => {
      const published = Date.parse(item.publishedAt);
      return Number.isFinite(published) && now - published <= MAX_AGE_MS && published <= now && isMobileRelevant(item);
    })
    .sort((a, b) => {
      const aFresh = now - Date.parse(a.publishedAt) <= FRESH_AGE_MS ? 1 : 0;
      const bFresh = now - Date.parse(b.publishedAt) <= FRESH_AGE_MS ? 1 : 0;
      return bFresh - aFresh || Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    });
  for (const item of candidates) {
    const title = item.title.trim().toLowerCase();
    if (urls.has(item.url) || titles.has(title)) continue;
    urls.add(item.url); titles.add(title);
    document.candidates.push({
      sourceTitle: item.title, sourceSummary: item.description,
      sourcePublishedAt: item.publishedAt, category: item.source.category,
      // A candidate date is provisional: the editor must check the original page.
      sources: [{ name: item.source.name, url: item.url, date: taipeiDate(item.publishedAt) }],
    });
    if (document.candidates.length >= slotsRemaining) break;
  }
  return document;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const news = JSON.parse(await readFile(NEWS_FILE, "utf8"));
    const document = await collectCandidates(news);
    await mkdir(dirname(fileURLToPath(CANDIDATES_FILE)), { recursive: true });
    await writeFile(CANDIDATES_FILE, `${JSON.stringify(document, null, 2)}\n`);
    for (const failure of document.failures) console.warn(failure);
    console.log(`Staged ${document.candidates.length} unreviewed candidate(s) in work/news-candidates.json; ${document.slotsRemaining} daily slot(s) remain. Published archive unchanged. Original Traditional Chinese writing and source review are required.`);
  } catch (error) {
    console.error(`Candidate collection failed:\n${error.message}`);
    process.exitCode = 1;
  }
}
