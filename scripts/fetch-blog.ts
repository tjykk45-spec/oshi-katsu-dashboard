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

export interface BlogFetchResult {
  articles: RawBlogArticle[];
  /** 構造変更・取得異常の疑いを表す説明文の一覧（空なら異常なし） */
  structureIssues: string[];
}

interface MemberFetchResult {
  articles: RawBlogArticle[];
  /**
   * フィルタ前のセレクタ一致件数（メンバー名絞り込み前）。
   * null の場合は本チェック対象外（例: JSON APIで既にメンバー確定済み）
   */
  rawMatched: number | null;
  dateParseFailures: number;
}

const UA = "Mozilla/5.0 (compatible; DailyOshiBot/1.0; +mailto:tjykk45@gmail.com)";

/** トラッキングパラメータ（ima など）を除去してURLを正規化 */
function normalizeUrl(url: string): string {
  return url.split("?")[0];
}

const BASE = {
  nogizaka46: "https://www.nogizaka46.com",
  sakurazaka46: "https://sakurazaka46.com",
  hinatazaka46: "https://www.hinatazaka46.com",
};

/** パースできた場合のみ "YYYY-MM-DD" を返す。できなければ null */
function parseDateStr(raw: string): string | null {
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
async function scrapeNogizakaBlog(member: typeof MEMBERS[0], existingUrls: Set<string>): Promise<MemberFetchResult> {
  const raw = await fetchPage(member.blogListUrl!);
  if (!raw) throw new Error("ページ取得失敗");

  // レスポンスは res({...}); の JSONP 形式
  const jsonStr = raw.replace(/^res\(/, "").replace(/\);?\s*$/, "").trim();
  const json = JSON.parse(jsonStr) as {
    data: { code: string; title: string; text: string; date: string; link: string }[]
  };

  const results: RawBlogArticle[] = [];
  let dateParseFailures = 0;
  for (const item of json.data ?? []) {
    const url = normalizeUrl(item.link || `${BASE.nogizaka46}/s/n46/diary/detail/${item.code}`);
    if (!url || existingUrls.has(url)) continue;
    const dateStr = toDateStr(item.date, () => dateParseFailures++);
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
  // ct でメンバーが確定するAPIのため、0件は「最近ブログを書いていないだけ」の可能性が高く
  // 構造変更チェックの対象にはしない（rawMatched: null）
  return { articles: results, rawMatched: null, dateParseFailures };
}

// 櫻坂46: li.box → h3.title / p.date.wf-a
async function scrapesakurazakaBlog(member: typeof MEMBERS[0], existingUrls: Set<string>): Promise<MemberFetchResult> {
  const html = await fetchPage(member.blogListUrl!);
  if (!html) throw new Error("ページ取得失敗");
  const $ = cheerio.load(html);
  const results: RawBlogArticle[] = [];
  let dateParseFailures = 0;
  const boxes = $("li.box");

  boxes.each((_, el) => {
    // ct パラメータはサーバー側で効かないため、テキスト内にメンバー名があるか確認して絞り込む
    // 注: ページ上は「村井 優」のように空白が入る場合があるため、両者の空白を除去して比較する
    const boxText = $(el).text().replace(/\s/g, "");
    const targetName = member.name.replace(/\s/g, "");
    if (!boxText.includes(targetName)) return;

    const href = $(el).find("a").first().attr("href") ?? "";
    const url = normalizeUrl(href.startsWith("http") ? href : BASE.sakurazaka46 + href);
    if (!url || existingUrls.has(url)) return;

    const title = $(el).find("h3.title").text().trim();
    const rawDate = $(el).find("p.date.wf-a").text().trim();
    const dateStr = toDateStr(rawDate, () => dateParseFailures++);

    if (!title || !isWithinHours(dateStr, FETCH_HOURS)) return;
    results.push({ title, url, date: dateStr, memberId: member.id, memberName: member.name, group: member.group, source: "blog" });
  });
  // boxes.length が0件なら、そのメンバーが書いていないのではなくページ全体の構造が壊れている
  return { articles: results, rawMatched: boxes.length, dateParseFailures };
}

// 日向坂46: div.p-blog-article → div.c-blog-article__title / div.c-blog-article__date / a.c-button-blog-detail
async function scrapeHinatazakaBlog(member: typeof MEMBERS[0], existingUrls: Set<string>): Promise<MemberFetchResult> {
  const html = await fetchPage(member.blogListUrl!);
  if (!html) throw new Error("ページ取得失敗");
  const $ = cheerio.load(html);
  const results: RawBlogArticle[] = [];
  let dateParseFailures = 0;
  const boxes = $("div.p-blog-article");

  boxes.each((_, el) => {
    // ct パラメータがサーバー側で効かない場合に備え、メンバー名で絞り込む
    const boxText = $(el).text().replace(/\s/g, "");
    const targetName = member.name.replace(/\s/g, "");
    if (!boxText.includes(targetName)) return;

    const href = $(el).find("a.c-button-blog-detail").attr("href") ?? "";
    const url = normalizeUrl(href.startsWith("http") ? href : BASE.hinatazaka46 + href);
    if (!url || existingUrls.has(url)) return;

    const title = $(el).find("div.c-blog-article__title").text().trim();
    const rawDate = $(el).find("div.c-blog-article__date").text().trim();
    const dateStr = toDateStr(rawDate, () => dateParseFailures++);

    if (!title || !isWithinHours(dateStr, FETCH_HOURS)) return;
    results.push({ title, url, date: dateStr, memberId: member.id, memberName: member.name, group: member.group, source: "blog" });
  });
  return { articles: results, rawMatched: boxes.length, dateParseFailures };
}

export async function fetchAllBlogs(existingUrls: Set<string>): Promise<BlogFetchResult> {
  const articles: RawBlogArticle[] = [];
  const structureIssues: string[] = [];

  await Promise.allSettled(
    MEMBERS.filter((m) => m.blogListUrl).map(async (member) => {
      try {
        let result: MemberFetchResult;
        if (member.group === "nogizaka46") {
          result = await scrapeNogizakaBlog(member, existingUrls);
        } else if (member.group === "sakurazaka46") {
          result = await scrapesakurazakaBlog(member, existingUrls);
        } else {
          result = await scrapeHinatazakaBlog(member, existingUrls);
        }
        console.log(`[BLOG] ${member.name}: ${result.articles.length}件`);
        articles.push(...result.articles);
        if (result.rawMatched === 0) {
          structureIssues.push(`${member.name}ブログ一覧: 0件（構造変更の可能性）`);
        }
        if (result.dateParseFailures > 0) {
          console.warn(`[BLOG] ${member.name}: 日付パース失敗 ${result.dateParseFailures}件（今日の日付にフォールバック）`);
        }
      } catch (err) {
        console.warn(`[BLOG] ${member.name} 取得失敗:`, (err as Error).message);
        structureIssues.push(`${member.name}ブログ: 取得失敗（${(err as Error).message.slice(0, 80)}）`);
      }
    })
  );

  return { articles, structureIssues };
}
