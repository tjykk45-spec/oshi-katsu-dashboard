import { z } from "zod";

export const ArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  date: z.string(),          // YYYY-MM-DD
  group: z.enum(["nogizaka46", "sakurazaka46", "hinatazaka46"]),
  memberId: z.string().nullable(),
  memberName: z.string().nullable(),
  source: z.enum(["news", "blog"]),
  summary: z.string(),       // ~100字
  bullets: z.array(z.string()).min(1).max(3),
  tags: z.array(z.string()),
  fetchedAt: z.string(),     // ISO 8601
});

export type Article = z.infer<typeof ArticleSchema>;

export const NewsDataSchema = z.array(ArticleSchema);
