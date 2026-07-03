import "dotenv/config.js";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { fetchAllBlogs, type RawBlogArticle } from "./fetch-blog.js";
import { fetchAllNews, type RawNewsArticle } from "./fetch-news.js";
import { summarizeArticles } from "./summarize.js";
import { NewsDataSchema, type Article } from "./schema.js";
import { UserFacingError } from "./errors.js";
import { KEEP_DAYS } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "../data/news.json");

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new UserFacingError("GEMINI_API_KEY が設定されていません");

  const ai = new GoogleGenAI({ apiKey });

  // 既存データを読み込む
  let existing: Article[] = [];
  try {
    const raw = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
    const parsed = NewsDataSchema.safeParse(raw);
    if (parsed.success) existing = parsed.data;
  } catch {
    console.log("[run] news.json が空または初期化");
  }

  const existingUrls = new Set(existing.map((a) => a.url));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - KEEP_DAYS);

  // 並列でブログ・ニュースを取得
  console.log("[run] フェッチ開始...");
  const [blogResults, newsResults] = await Promise.allSettled([
    fetchAllBlogs(existingUrls),
    fetchAllNews(existingUrls),
  ]);

  const rawArticles: (RawBlogArticle | RawNewsArticle)[] = [];
  const structureIssues: string[] = [];

  if (blogResults.status === "fulfilled") {
    rawArticles.push(...blogResults.value.articles);
    structureIssues.push(...blogResults.value.structureIssues);
  } else {
    structureIssues.push(`ブログ取得全体が失敗: ${String(blogResults.reason)}`);
  }

  if (newsResults.status === "fulfilled") {
    rawArticles.push(...newsResults.value.articles);
    structureIssues.push(...newsResults.value.structureIssues);
  } else {
    structureIssues.push(`ニュース取得全体が失敗: ${String(newsResults.reason)}`);
  }

  console.log(`[run] 新規記事: ${rawArticles.length}件`);

  // バッチ処理でGemini要約（5件×1コール → API使用量1/5）
  const newArticles = await summarizeArticles(rawArticles, ai);
  console.log(`[run] 要約完了: ${newArticles.length}件`);

  if (rawArticles.length > 0 && newArticles.length === 0) {
    structureIssues.push(`要約が全滅（対象${rawArticles.length}件、成功0件）`);
  }

  // 30日以内のデータのみ保持
  const retained = existing.filter((a) => new Date(a.date) >= cutoff);
  const all = [...newArticles, ...retained].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  writeFileSync(DATA_PATH, JSON.stringify(all, null, 2), "utf-8");
  console.log(`[run] 保存完了: 合計${all.length}件 → data/news.json`);

  // 構造変更等を検知していても、取得できた分の保存・後続のデプロイまでは完遂させる。
  // その上で異常を検知したことだけを exitCode で伝える（GitHub Actions が失敗表示し気づける）。
  if (structureIssues.length > 0) {
    console.error("[run] 構造変更・取得異常の疑いを検知しました:");
    for (const issue of structureIssues) console.error(`  - ${issue}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  if (err instanceof UserFacingError) {
    console.error(`[USER-FACING] ${err.message}`);
  } else {
    console.error("[INTERNAL]", err);
  }
  process.exit(1);
});
