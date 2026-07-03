import { GoogleGenAI } from "@google/genai";
import { createHash } from "crypto";
import { ALLOWED_TAGS, MEMBERS } from "./config.js";
import type { Article } from "./schema.js";
import type { RawBlogArticle } from "./fetch-blog.js";
import type { RawNewsArticle } from "./fetch-news.js";

type RawArticle = RawBlogArticle | RawNewsArticle;

// バッチ用スキーマ（複数記事を1回のAPIコールで処理）
const BATCH_JSON_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          summary: { type: "string", description: "100字前後のAI要約（です・ます調）" },
          bullets: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 3,
          },
          tags: {
            type: "array",
            items: { type: "string", enum: ALLOWED_TAGS as unknown as string[] },
          },
        },
        required: ["summary", "bullets", "tags"],
      },
    },
  },
  required: ["results"],
};

const SYSTEM_INSTRUCTION = `あなたは推し活情報ダッシュボード用のJSON生成AIです。
各記事についてsummary（100字前後）・bullets（1〜3件）・tagsを生成してください。
- summaryはです・ます調、ファンが知りたい具体的な内容
- bulletsは重要ポイントを箇条書き
- tagsは許可リストから1〜3個
- JSONのみ出力（説明文不要）
- 日本語で出力`;

function buildPrompt(articles: RawArticle[]): string {
  return articles.map((raw, i) => {
    const memberLabel = "memberName" in raw && raw.memberName
      ? `${raw.memberName}（${raw.group}）`
      : `${raw.group} グループ`;
    const sourceLabel = raw.source === "blog" ? "公式ブログ" : "公式ニュース";
    const body = "bodyText" in raw && raw.bodyText ? `\n本文抜粋: ${raw.bodyText}` : "";

    return `[${i + 1}] ${memberLabel} / ${sourceLabel}
タイトル: ${raw.title}
日付: ${raw.date}${body}`;
  }).join("\n\n");
}

// バッチサイズ: 無料枠 5RPM に合わせて1回のコールで複数記事を処理
const BATCH_SIZE = 5;

type BatchItem = { summary: string; bullets: string[]; tags: string[] };

async function callGeminiBatch(
  ai: GoogleGenAI,
  model: string,
  batch: RawArticle[]
): Promise<BatchItem[]> {
  const res = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: buildPrompt(batch) }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: BATCH_JSON_SCHEMA,
      temperature: 0.3,
    },
  });

  const candidate = res.candidates?.[0];
  if (candidate?.finishReason === "SAFETY") {
    console.warn(`[AI] Safetyフィルタ`);
    return [];
  }

  const text = candidate?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(text) as { results: BatchItem[] };
  return parsed.results;
}

export async function summarizeArticles(
  rawList: RawArticle[],
  ai: GoogleGenAI
): Promise<Article[]> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const results: Article[] = [];

  // BATCH_SIZE 件ずつ処理
  for (let i = 0; i < rawList.length; i += BATCH_SIZE) {
    const batch = rawList.slice(i, i + BATCH_SIZE);
    const batchNo = Math.floor(i / BATCH_SIZE) + 1;

    // 一時的なエラー（レート制限等）で丸ごと記事を失わないよう、1回だけ再試行する
    let batchItems: BatchItem[] | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        batchItems = await callGeminiBatch(ai, model, batch);
        break;
      } catch (err) {
        console.warn(`[AI] バッチ${batchNo} 失敗（試行${attempt}/2）:`, (err as Error).message.slice(0, 120));
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 60_000));
        }
      }
    }

    if (batchItems) {
      if (batchItems.length !== batch.length) {
        console.warn(`[AI] バッチ${batchNo}: 件数不一致（要求${batch.length}件 / 応答${batchItems.length}件）`);
      }

      batchItems.forEach((item, j) => {
        const raw = batch[j];
        if (!raw || !item) return;
        results.push({
          id: createHash("sha256").update(raw.url).digest("hex").slice(0, 12),
          title: raw.title,
          url: raw.url,
          date: raw.date,
          group: raw.group as Article["group"],
          memberId: "memberId" in raw ? raw.memberId : null,
          memberName: "memberName" in raw ? raw.memberName : null,
          source: raw.source,
          summary: item.summary ?? "",
          bullets: (item.bullets ?? []).slice(0, 3),
          tags: (item.tags ?? []).slice(0, 3),
          fetchedAt: new Date().toISOString(),
        });
      });

      console.log(`[AI] バッチ${batchNo}: ${batchItems.length}件要約`);
    } else {
      console.warn(`[AI] バッチ${batchNo}: 2回失敗のためスキップ`);
    }

    // 次のバッチまで待機（5RPM = 13秒間隔）
    if (i + BATCH_SIZE < rawList.length) {
      await new Promise((r) => setTimeout(r, 13_000));
    }
  }

  return results;
}
