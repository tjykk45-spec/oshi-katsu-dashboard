import { GoogleGenAI } from "@google/genai";
import { createHash } from "crypto";
import { ALLOWED_TAGS, MEMBERS } from "./config.js";
import type { Article } from "./schema.js";

interface RawArticleInput {
  title: string;
  url: string;
  date: string;
  memberId: string | null;
  memberName: string | null;
  group: string;
  source: "news" | "blog";
}

const GEMINI_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "100字前後のAI要約" },
    bullets: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 3,
      description: "重要ポイントを1〜3件の箇条書きで",
    },
    tags: {
      type: "array",
      items: { type: "string", enum: ALLOWED_TAGS as unknown as string[] },
      description: "当てはまるタグを1〜3個",
    },
  },
  required: ["summary", "bullets", "tags"],
};

const SYSTEM_INSTRUCTION = `あなたは推し活情報ダッシュボード用のJSON生成AIです。
ルール:
- 必ずJSONのみ出力（説明文・マークダウン不要）
- summaryは100字前後、です・ます調
- bulletsは1〜3件、ファンが知りたい具体的な情報
- tagsは許可リストから1〜3個選ぶ
- 日本語で出力`;

export async function summarizeArticle(
  raw: RawArticleInput,
  ai: GoogleGenAI
): Promise<Article | null> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const memberLabel = raw.memberName
    ? `メンバー: ${raw.memberName} (${MEMBERS.find((m) => m.id === raw.memberId)?.group ?? raw.group})`
    : `グループ: ${raw.group}`;

  const prompt = `${memberLabel}
ソース: ${raw.source === "blog" ? "公式ブログ" : "公式ニュース"}
タイトル: ${raw.title}
URL: ${raw.url}
日付: ${raw.date}

上記の情報からダッシュボード用JSONを生成してください。`;

  try {
    const res = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: GEMINI_JSON_SCHEMA,
        temperature: 0.3,
      },
    });

    const candidate = res.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") {
      console.warn(`[AI] Safetyフィルタにより除外: ${raw.title}`);
      return null;
    }

    const text = candidate?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as { summary: string; bullets: string[]; tags: string[] };

    return {
      id: createHash("sha256").update(raw.url).digest("hex").slice(0, 12),
      title: raw.title,
      url: raw.url,
      date: raw.date,
      group: raw.group as Article["group"],
      memberId: raw.memberId,
      memberName: raw.memberName,
      source: raw.source,
      summary: parsed.summary,
      bullets: parsed.bullets.slice(0, 3),
      tags: parsed.tags.slice(0, 3),
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`[AI] 要約失敗: ${raw.title}`, (err as Error).message);
    return null;
  }
}
