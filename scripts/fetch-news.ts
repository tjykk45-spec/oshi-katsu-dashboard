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

export interface NewsFetchResult {
  articles: RawNewsArticle[];
  /** 構造変更・取得異常の疑いを表す説明文の一覧（空なら異常なし） */
  structureIssues: string[];
}

interface SourceFetchResult {
  articles: RawNewsArticle[];
  /** フィルタ前のセレクタ一致件数。0件なら新着なしではなく構造変更を疑う */
  rawMatched: number;
  dateParseFailures: number;
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

/** パースできた場合のみ "YYYY-MM-DD" を返す。できなければ null */
function parseDateStr(raw: string): string | null {
  const cleaned = raw.trim()
    .replace(/年/g, "-").replace(/月/g, "-").replace(/日.*/, "")
    .replace(/\./g, "-").replace(/\//g, "-")
    .replace(/\s.*/, "");
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/** パース失敗時は今日の日付にフォールバックしつつ、onFailure で呼び出し元に通知する */
function toDateStr(raw: string, onFailure: () => void): string {
  const parsed = parseDateStr(raw);
  if (parsed) return parsed;
  onFailure();
  return new Date().toISOString().slice(0, 10);
}

function isWithinHours(dateStr: string, hours: number): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  return Date.now() - d.getTime() < hours * 60 * 60 * 1000;
}

// 乃木坂46: JSON API
async function fetchNogizakaNews(existingUrls: Set<string>): Promise<SourceFetchResult> {
  const res = await fetch(
    "https://www.nogizaka46.com/s/n46/api/list/news_v2?rw=50",
    { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12_000) }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json() as { data: { title: string; date: string; link_url: string }[] };
  const items = json.data ?? [];
  const results: RawNewsArticle[] = [];
  let dateParseFailures = 0;

  for (const item of items) {
    const url = normalizeUrl(item.link_url);
    if (!url || existingUrls.has(url)) continue;
    const dateStr = toDateStr(item.date, () => dateParseFailures++);
    if (!isWithinHours(dateStr, FETCH_HOURS)) continue;
    results.push({ title: item.title, url, date: dateStr, memberId: null, memberName: null, group: "nogizaka46", source: "news" });
  }
  return { articles: results, rawMatched: items.length, dateParseFailures };
}

// 櫻坂46: HTML スクレイピング
async function fetchSakurazakaNews(existingUrls: Set<string>): Promise<SourceFetchResult> {
  const res = await fetch(
    "https://sakurazaka46.com/s/s46/news/list",
    { headers: { "User-Agent": UA, "Accept-Language": "ja,en;q=0.9" }, signal: AbortSignal.timeout(12_000) }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const $ = cheerio.load(await res.text());
  const results: RawNewsArticle[] = [];
  let dateParseFailures = 0;
  const matches = $("a[href*='/s/s46/news/detail/']");

  matches.each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const url = normalizeUrl(href.startsWith("http") ? href : BASE.sakurazaka46 + href);
    if (!url || existingUrls.has(url)) return;

    const title = $(el).find(".title").text().trim() || $(el).text().trim().slice(0, 80);
    const rawDate = $(el).find(".date.wf-a, .date").first().text().trim();
    const dateStr = toDateStr(rawDate, () => dateParseFailures++);

    if (!title || !isWithinHours(dateStr, FETCH_HOURS)) return;
    results.push({ title, url, date: dateStr, memberId: null, memberName: null, group: "sakurazaka46", source: "news" });
  });
  return { articles: results, rawMatched: matches.length, dateParseFailures };
}

// 日向坂46: HTML スクレイピング
// 実際のHTML構造: <li class="p-news__item"><a href="/s/official/news/detail/..."><time class="c-news__date">...</time><p class="c-news__text">...</p></a></li>
async function fetchHinatazakaNews(existingUrls: Set<string>): Promise<SourceFetchResult> {
  const res = await fetch(
    "https://www.hinatazaka46.com/s/official/news/list",
    { headers: { "User-Agent": UA, "Accept-Language": "ja,en;q=0.9" }, signal: AbortSignal.timeout(12_000) }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const $ = cheerio.load(await res.text());
  const results: RawNewsArticle[] = [];
  let dateParseFailures = 0;
  const matches = $("li.p-news__item a[href*='/news/detail/']");

  matches.each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const url = normalizeUrl(href.startsWith("http") ? href : BASE.hinatazaka46 + href);
    if (!url || existingUrls.has(url)) return;

    const title = $(el).find("p.c-news__text").text().trim();
    const rawDate = $(el).find("time.c-news__date").text().trim();
    const dateStr = toDateStr(rawDate, () => dateParseFailures++);

    if (!title || !isWithinHours(dateStr, FETCH_HOURS)) return;
    results.push({ title, url, date: dateStr, memberId: null, memberName: null, group: "hinatazaka46", source: "news" });
  });
  return { articles: results, rawMatched: matches.length, dateParseFailures };
}

export async function fetchAllNews(existingUrls: Set<string>): Promise<NewsFetchResult> {
  const articles: RawNewsArticle[] = [];
  const structureIssues: string[] = [];

  const fetchers = [
    { label: "乃木坂46", fn: () => fetchNogizakaNews(existingUrls) },
    { label: "櫻坂46",   fn: () => fetchSakurazakaNews(existingUrls) },
    { label: "日向坂46", fn: () => fetchHinatazakaNews(existingUrls) },
  ];

  await Promise.allSettled(
    fetchers.map(async ({ label, fn }) => {
      try {
        const { articles: found, rawMatched, dateParseFailures } = await fn();
        console.log(`[NEWS] ${label}: ${found.length}件`);
        articles.push(...found);
        if (rawMatched === 0) {
          structureIssues.push(`${label}ニュース: 記事0件（構造変更の可能性）`);
        }
        if (dateParseFailures > 0) {
          console.warn(`[NEWS] ${label}: 日付パース失敗 ${dateParseFailures}件（今日の日付にフォールバック）`);
        }
      } catch (err) {
        console.warn(`[NEWS] ${label} 取得失敗:`, (err as Error).message);
        structureIssues.push(`${label}ニュース: 取得失敗（${(err as Error).message.slice(0, 80)}）`);
      }
    })
  );

  return { articles, structureIssues };
}
