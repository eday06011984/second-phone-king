import data from "@/content/news.json";
export const news = [...data].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
export const newsDate = (value:string) => new Intl.DateTimeFormat("zh-TW", {timeZone:"Asia/Taipei", year:"numeric", month:"2-digit", day:"2-digit"}).format(new Date(value));
