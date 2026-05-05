import "dotenv/config.js";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { fetchAllBlogs } from "./fetch-blog.js";
import { fetchAllNews } from "./fetch-news.js";
import { summarizeArticles } from "./summarize.js";
import { NewsDataSchema, type Article } from "./schema.js";
import { UserFacingError } from "./errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "../data/news.json");
const KEEP_DAYS = 30;

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

  const rawArticles = [
    ...(blogResults.status === "fulfilled" ? blogResults.value : []),
    ...(newsResults.status === "fulfilled" ? newsResults.value : []),
  ];

  console.log(`[run] 新規記事: ${rawArticles.length}件`);

  // バッチ処理でGemini要約（5件×1コール → API使用量1/5）
  const newArticles = await summarizeArticles(rawArticles, ai);
  console.log(`[run] 要約完了: ${newArticles.length}件`);

  // 30日以内のデータのみ保持
  const retained = existing.filter((a) => new Date(a.date) >= cutoff);
  const all = [...newArticles, ...retained].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  writeFileSync(DATA_PATH, JSON.stringify(all, null, 2), "utf-8");
  console.log(`[run] 保存完了: 合計${all.length}件 → data/news.json`);
}

main().catch((err) => {
  if (err instanceof UserFacingError) {
    console.error(`[USER-FACING] ${err.message}`);
  } else {
    console.error("[INTERNAL]", err);
  }
  process.exit(1);
});
