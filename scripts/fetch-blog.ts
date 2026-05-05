import * as cheerio from "cheerio";
import { MEMBERS, FETCH_HOURS } from "./config.js";

export interface RawBlogArticle {
  title: string;
  url: string;
  date: string;       // YYYY-MM-DD
  memberId: string;
  memberName: string;
  group: string;
  source: "blog";
  bodyText?: string;  // 本文テキスト（APIで取得できた場合）
}

const UA = "Mozilla/5.0 (compatible; DailyOshiBot/1.0; +mailto:tjykk45@gmail.com)";
const BASE = {
  nogizaka46: "https://www.nogizaka46.com",
  sakurazaka46: "https://sakurazaka46.com",
  hinatazaka46: "https://www.hinatazaka46.com",
};

function toDateStr(raw: string): string {
  // 形式: "2026.04.29 11:22" / "2026/4/18" / "2026年04月29日"
  const cleaned = raw.trim()
    .replace(/年/g, "-").replace(/月/g, "-").replace(/日.*/, "")
    .replace(/\./g, "-")
    .replace(/\//g, "-")
    .replace(/\s.*/, "")
    .replace(/^(\d{4})-(\d{1})-(\d{1,2})$/, "$1-0$2-$3")
    .replace(/^(\d{4})-(\d{2})-(\d{1})$/, "$1-$2-0$3");
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function isWithinHours(dateStr: string, hours: number): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  return Date.now() - d.getTime() < hours * 60 * 60 * 1000;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "ja,en;q=0.9" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.warn(`[BLOG] フェッチ失敗: ${url}`, (err as Error).message);
    return null;
  }
}

// 乃木坂46: JSON API（本文付き、ct でメンバー確定）
async function scrapeNogizakaBlog(member: typeof MEMBERS[0], existingUrls: Set<string>): Promise<RawBlogArticle[]> {
  const raw = await fetchPage(member.blogListUrl!);
  if (!raw) return [];

  // レスポンスは res({...}); の JSONP 形式
  const jsonStr = raw.replace(/^res\(/, "").replace(/\);?\s*$/, "").trim();
  const json = JSON.parse(jsonStr) as {
    data: { code: string; title: string; text: string; date: string; link: string }[]
  };

  const results: RawBlogArticle[] = [];
  for (const item of json.data ?? []) {
    const url = item.link || `${BASE.nogizaka46}/s/n46/diary/detail/${item.code}`;
    if (!url || existingUrls.has(url)) continue;
    const dateStr = toDateStr(item.date);
    if (!isWithinHours(dateStr, FETCH_HOURS)) continue;

    // 本文テキストを HTML タグ除去して取得
    const bodyText = item.text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);

    results.push({
      title: item.title,
      url,
      date: dateStr,
      memberId: member.id,
      memberName: member.name,
      group: member.group,
      source: "blog",
      bodyText,  // 本文付き（要約精度向上）
    });
  }
  return results;
}

// 櫻坂46: li.box → h3.title / p.date.wf-a
async function scrapesakurazakaBlog(member: typeof MEMBERS[0], existingUrls: Set<string>): Promise<RawBlogArticle[]> {
  const html = await fetchPage(member.blogListUrl!);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results: RawBlogArticle[] = [];

  $("li.box").each((_, el) => {
    // ct パラメータはサーバー側で効かないため、テキスト内にメンバー名があるか確認して絞り込む
    // 注: ページ上は「村井 優」のように空白が入る場合があるため、両者の空白を除去して比較する
    const boxText = $(el).text().replace(/\s/g, "");
    const targetName = member.name.replace(/\s/g, "");
    if (!boxText.includes(targetName)) return;

    const href = $(el).find("a").first().attr("href") ?? "";
    const url = href.startsWith("http") ? href : BASE.sakurazaka46 + href;
    if (!url || existingUrls.has(url)) return;

    const title = $(el).find("h3.title").text().trim();
    const rawDate = $(el).find("p.date.wf-a").text().trim();
    const dateStr = toDateStr(rawDate);

    if (!title || !isWithinHours(dateStr, FETCH_HOURS)) return;
    results.push({ title, url, date: dateStr, memberId: member.id, memberName: member.name, group: member.group, source: "blog" });
  });
  return results;
}

// 日向坂46: div.p-blog-article → div.c-blog-article__title / div.c-blog-article__date / a.c-button-blog-detail
async function scrapeHinatazakaBlog(member: typeof MEMBERS[0], existingUrls: Set<string>): Promise<RawBlogArticle[]> {
  const html = await fetchPage(member.blogListUrl!);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results: RawBlogArticle[] = [];

  $("div.p-blog-article").each((_, el) => {
    // ct パラメータがサーバー側で効かない場合に備え、メンバー名で絞り込む
    const boxText = $(el).text().replace(/\s/g, "");
    const targetName = member.name.replace(/\s/g, "");
    if (!boxText.includes(targetName)) return;

    const href = $(el).find("a.c-button-blog-detail").attr("href") ?? "";
    const url = href.startsWith("http") ? href : BASE.hinatazaka46 + href;
    if (!url || existingUrls.has(url)) return;

    const title = $(el).find("div.c-blog-article__title").text().trim();
    const rawDate = $(el).find("div.c-blog-article__date").text().trim();
    const dateStr = toDateStr(rawDate);

    if (!title || !isWithinHours(dateStr, FETCH_HOURS)) return;
    results.push({ title, url, date: dateStr, memberId: member.id, memberName: member.name, group: member.group, source: "blog" });
  });
  return results;
}

export async function fetchAllBlogs(existingUrls: Set<string>): Promise<RawBlogArticle[]> {
  const results: RawBlogArticle[] = [];

  await Promise.allSettled(
    MEMBERS.filter((m) => m.blogListUrl).map(async (member) => {
      try {
        let articles: RawBlogArticle[] = [];
        if (member.group === "nogizaka46") {
          articles = await scrapeNogizakaBlog(member, existingUrls);
        } else if (member.group === "sakurazaka46") {
          articles = await scrapesakurazakaBlog(member, existingUrls);
        } else if (member.group === "hinatazaka46") {
          articles = await scrapeHinatazakaBlog(member, existingUrls);
        }
        console.log(`[BLOG] ${member.name}: ${articles.length}件`);
        results.push(...articles);
      } catch (err) {
        console.warn(`[BLOG] ${member.name} 取得失敗:`, (err as Error).message);
      }
    })
  );

  return results;
}
