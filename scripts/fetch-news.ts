import * as cheerio from "cheerio";
import { NEWS_SOURCES, FETCH_HOURS } from "./config.js";

export interface RawNewsArticle {
  title: string;
  url: string;
  date: string;
  memberId: null;
  memberName: null;
  group: string;
  source: "news";
}

const UA = "Mozilla/5.0 (compatible; DailyOshiBot/1.0; +mailto:tjykk45@gmail.com)";
const BASE = {
  nogizaka46: "https://www.nogizaka46.com",
  sakurazaka46: "https://sakurazaka46.com",
  hinatazaka46: "https://www.hinatazaka46.com",
};

/** トラッキングパラメータ（ima, pri1 など）を除去してURLを正規化 */
function normalizeUrl(url: string): string {
  return url.split("?")[0];
}

function toDateStr(raw: string): string {
  const cleaned = raw.trim()
    .replace(/年/g, "-").replace(/月/g, "-").replace(/日.*/, "")
    .replace(/\./g, "-").replace(/\//g, "-")
    .replace(/\s.*/, "");
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function isWithinHours(dateStr: string, hours: number): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  return Date.now() - d.getTime() < hours * 60 * 60 * 1000;
}

// 乃木坂46: JSON API
async function fetchNogizakaNews(existingUrls: Set<string>): Promise<RawNewsArticle[]> {
  const res = await fetch(
    "https://www.nogizaka46.com/s/n46/api/list/news_v2?rw=50",
    { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12_000) }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json() as { data: { title: string; date: string; link_url: string }[] };
  const results: RawNewsArticle[] = [];

  for (const item of json.data ?? []) {
    const url = normalizeUrl(item.link_url);
    if (!url || existingUrls.has(url)) continue;
    const dateStr = toDateStr(item.date);
    if (!isWithinHours(dateStr, FETCH_HOURS)) continue;
    results.push({ title: item.title, url, date: dateStr, memberId: null, memberName: null, group: "nogizaka46", source: "news" });
  }
  return results;
}

// 櫻坂46: HTML スクレイピング
async function fetchSakurazakaNews(existingUrls: Set<string>): Promise<RawNewsArticle[]> {
  const res = await fetch(
    "https://sakurazaka46.com/s/s46/news/list",
    { headers: { "User-Agent": UA, "Accept-Language": "ja,en;q=0.9" }, signal: AbortSignal.timeout(12_000) }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const $ = cheerio.load(await res.text());
  const results: RawNewsArticle[] = [];

  $("a[href*='/s/s46/news/detail/']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const url = normalizeUrl(href.startsWith("http") ? href : BASE.sakurazaka46 + href);
    if (!url || existingUrls.has(url)) return;

    const title = $(el).find(".title").text().trim() || $(el).text().trim().slice(0, 80);
    const rawDate = $(el).find(".date.wf-a, .date").first().text().trim();
    const dateStr = toDateStr(rawDate);

    if (!title || !isWithinHours(dateStr, FETCH_HOURS)) return;
    results.push({ title, url, date: dateStr, memberId: null, memberName: null, group: "sakurazaka46", source: "news" });
  });
  return results;
}

// 日向坂46: HTML スクレイピング
async function fetchHinatazakaNews(existingUrls: Set<string>): Promise<RawNewsArticle[]> {
  const res = await fetch(
    "https://www.hinatazaka46.com/s/official/news/list",
    { headers: { "User-Agent": UA, "Accept-Language": "ja,en;q=0.9" }, signal: AbortSignal.timeout(12_000) }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const $ = cheerio.load(await res.text());
  const results: RawNewsArticle[] = [];

  // 日向坂ニュースの実際のセレクタを試す
  $("a[href*='/news/detail/'], a[href*='/official/news/']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href.includes("news/detail")) return;
    const url = normalizeUrl(href.startsWith("http") ? href : BASE.hinatazaka46 + href);
    if (!url || existingUrls.has(url)) return;

    const title = $(el).find(".c-news__title, .p-news__text, .title").text().trim()
      || $(el).closest("li, div").find(".c-news__title, .title").text().trim();
    const rawDate = $(el).find(".c-news__date, .date").text().trim()
      || $(el).closest("li, div").find(".c-news__date, .date").text().trim();
    const dateStr = toDateStr(rawDate);

    if (!title || !isWithinHours(dateStr, FETCH_HOURS)) return;
    results.push({ title, url, date: dateStr, memberId: null, memberName: null, group: "hinatazaka46", source: "news" });
  });
  return results;
}

export async function fetchAllNews(existingUrls: Set<string>): Promise<RawNewsArticle[]> {
  const results: RawNewsArticle[] = [];

  const fetchers = [
    { label: "乃木坂46", fn: () => fetchNogizakaNews(existingUrls) },
    { label: "櫻坂46",   fn: () => fetchSakurazakaNews(existingUrls) },
    { label: "日向坂46", fn: () => fetchHinatazakaNews(existingUrls) },
  ];

  await Promise.allSettled(
    fetchers.map(async ({ label, fn }) => {
      try {
        const articles = await fn();
        console.log(`[NEWS] ${label}: ${articles.length}件`);
        results.push(...articles);
      } catch (err) {
        console.warn(`[NEWS] ${label} 取得失敗:`, (err as Error).message);
      }
    })
  );

  return results;
}
