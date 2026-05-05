import * as cheerio from "cheerio";
import { NEWS_SOURCES, FETCH_HOURS } from "./config.js";

export interface RawArticle {
  title: string;
  url: string;
  date: string;
  memberId: null;
  memberName: null;
  group: string;
  source: "news";
}

function toDateStr(raw: string): string {
  const cleaned = raw.replace(/[年月]/g, "-").replace(/日/, "").trim();
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function isWithinHours(dateStr: string, hours: number): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  return Date.now() - d.getTime() < hours * 60 * 60 * 1000;
}

export async function fetchAllNews(existingUrls: Set<string>): Promise<RawArticle[]> {
  const results: RawArticle[] = [];

  await Promise.allSettled(
    NEWS_SOURCES.map(async (src) => {
      try {
        const res = await fetch(src.newsUrl, {
          headers: {
            "User-Agent": "DailyOshiBot/1.0 (+mailto:tjykk45@gmail.com)",
            "Accept-Language": "ja,en;q=0.9",
          },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const $ = cheerio.load(html);

        $(src.newsSelector.list).each((_, el) => {
          const $el = $(el);
          const rawTitle = $el.find(src.newsSelector.title).text().trim()
            || $el.text().trim();
          const href = $el.find(src.newsSelector.link).attr("href") ?? "";
          const rawDate = src.newsSelector.date
            ? $el.find(src.newsSelector.date).text().trim()
            : "";

          if (!rawTitle || !href) return;

          const url = href.startsWith("http") ? href : new URL(href, src.newsUrl).href;
          if (existingUrls.has(url)) return;

          const dateStr = rawDate ? toDateStr(rawDate) : new Date().toISOString().slice(0, 10);
          if (!isWithinHours(dateStr, FETCH_HOURS)) return;

          results.push({
            title: rawTitle.slice(0, 120),
            url,
            date: dateStr,
            memberId: null,
            memberName: null,
            group: src.group,
            source: "news",
          });
        });
      } catch (err) {
        console.warn(`[NEWS] ${src.label} 取得失敗:`, (err as Error).message);
      }
    })
  );

  return results;
}
