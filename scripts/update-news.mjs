/**
 * Daily, source-first news updater.
 *
 * This intentionally does not rewrite or delete the existing archive.  It only
 * appends articles that have a verifiable source URL and publication date.
 */
import { readFile, writeFile } from "node:fs/promises";

const NEWS_FILE = new URL("../content/news.json", import.meta.url);
const MAX_DAILY_ARTICLES = 3;
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

function taipeiDate(value) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function slugify(title) {
  const ascii = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const fallback = `mobile-news-${Date.now().toString(36)}`;
  return (ascii || fallback).slice(0, 72).replace(/-$/, "");
}

function articleFrom(item, usedSlugs) {
  const published = new Date(item.publishedAt);
  const publishedAt = published.toISOString();
  const sourceDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(published);
  const summary = item.description || `${item.source.name} 公開了與手機及 3C 產品相關的新資訊。`;
  let slug = slugify(item.title);
  let suffix = 2;
  while (usedSlugs.has(slug)) slug = `${slugify(item.title).slice(0, 66)}-${suffix++}`;
  usedSlugs.add(slug);

  return {
    slug,
    title: item.title,
    category: item.source.category,
    description: summary.slice(0, 180),
    publishedAt,
    updatedAt: publishedAt,
    sections: [
      { heading: "官方資訊", paragraphs: [`${item.source.name}於 ${sourceDate} 發布公告：${summary}`] },
      { heading: "購機觀察", paragraphs: ["公告內容應以來源頁的適用市場、機型、版本與實際供貨資訊為準。選購二手機時，請向店家確認實機型號、功能狀態、配件與保固，不要只依新聞標題推定所有功能都可使用。"] },
      { heading: "交機前的確認重點", paragraphs: ["建議在付款前開機確認基本功能、帳號移除狀態與軟體版本，並保留商品描述及保固憑證。本文為資訊整理與購機建議，不代表實機測試或價格承諾。"] },
    ],
    sources: [{ name: item.source.name, url: item.url, date: sourceDate }],
  };
}

const now = new Date();
const today = taipeiDate(now);
const news = JSON.parse(await readFile(NEWS_FILE, "utf8"));
const todayCount = news.filter(article => taipeiDate(article.publishedAt) === today).length;
const needed = Math.max(0, MAX_DAILY_ARTICLES - todayCount);

if (!needed) {
  console.log(`Already have ${todayCount} articles for ${today} (Asia/Taipei). Nothing to add.`);
  process.exit(0);
}

const responses = await Promise.allSettled(FEEDS.map(async feed => {
  const response = await fetch(feed.url, { headers: { "user-agent": "second-phone-king-news-updater/1.0" } });
  if (!response.ok) throw new Error(`${feed.name}: HTTP ${response.status}`);
  return parseFeed(await response.text(), feed);
}));
const candidates = responses.flatMap(result => result.status === "fulfilled" ? result.value : []);
for (const result of responses) if (result.status === "rejected") console.warn(result.reason.message);

const existingUrls = new Set(news.flatMap(article => article.sources.map(source => source.url)));
const existingTitles = new Set(news.map(article => article.title.trim().toLowerCase()));
const usedSlugs = new Set(news.map(article => article.slug));
const selected = candidates
  .filter(item => {
    const published = new Date(item.publishedAt);
    return !Number.isNaN(published.valueOf()) && now - published <= MAX_AGE_MS && published <= now
      && isMobileRelevant(item)
      && !existingUrls.has(item.url) && !existingTitles.has(item.title.trim().toLowerCase());
  })
  // Prefer the last 48 hours; only then fall back to older items within 7 days.
  .sort((a, b) => {
    const aFresh = now - new Date(a.publishedAt) <= FRESH_AGE_MS ? 1 : 0;
    const bFresh = now - new Date(b.publishedAt) <= FRESH_AGE_MS ? 1 : 0;
    return bFresh - aFresh || new Date(b.publishedAt) - new Date(a.publishedAt);
  })
  .slice(0, needed)
  .map(item => articleFrom(item, usedSlugs));

if (!selected.length) {
  console.log("No new verified official-source articles found; archive left unchanged.");
  process.exit(0);
}

await writeFile(NEWS_FILE, `${JSON.stringify([...news, ...selected], null, 2)}\n`);
console.log(`Added ${selected.length} article(s); ${Math.max(0, needed - selected.length)} slot(s) left unfilled because no verified source was available.`);
