import { XMLParser } from "fast-xml-parser";
import { MEMBERS, FETCH_HOURS } from "./config.js";

export interface RawArticle {
  title: string;
  url: string;
  date: string;       // YYYY-MM-DD
  memberId: string;
  memberName: string;
  group: string;
  source: "blog";
}

const parser = new XMLParser({ ignoreAttributes: false });

async function fetchRss(url: string): Promise<{ title: string; link: string; pubDate: string }[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "DailyOshiBot/1.0 (+mailto:tjykk45@gmail.com)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const xml = await res.text();
  const parsed = parser.parse(xml);

  // RSS 2.0
  const channel = parsed?.rss?.channel;
  if (channel) {
    const items = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);
    return items.map((item: Record<string, unknown>) => ({
      title: String(item.title ?? ""),
      link: String(item.link ?? ""),
      pubDate: String(item.pubDate ?? item["dc:date"] ?? ""),
    }));
  }
  // RSS 1.0 / RDF
  const rdf = parsed?.["rdf:RDF"];
  if (rdf) {
    const items = Array.isArray(rdf.item) ? rdf.item : [rdf.item].filter(Boolean);
    return items.map((item: Record<string, unknown>) => ({
      title: String(item.title ?? ""),
      link: String(item.link ?? ""),
      pubDate: String(item["dc:date"] ?? ""),
    }));
  }
  return [];
}

function toDateStr(pubDate: string): string {
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function isWithinHours(pubDate: string, hours: number): boolean {
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return true; // 日付不明は含める
  return Date.now() - d.getTime() < hours * 60 * 60 * 1000;
}

export async function fetchAllBlogs(existingUrls: Set<string>): Promise<RawArticle[]> {
  const results: RawArticle[] = [];

  await Promise.allSettled(
    MEMBERS.filter((m) => m.blogRssUrl).map(async (member) => {
      try {
        const items = await fetchRss(member.blogRssUrl!);
        for (const item of items) {
          if (!item.link || existingUrls.has(item.link)) continue;
          if (!isWithinHours(item.pubDate, FETCH_HOURS)) continue;
          results.push({
            title: item.title.trim(),
            url: item.link.trim(),
            date: toDateStr(item.pubDate),
            memberId: member.id,
            memberName: member.name,
            group: member.group,
            source: "blog",
          });
        }
      } catch (err) {
        console.warn(`[RSS] ${member.name} 取得失敗:`, (err as Error).message);
      }
    })
  );

  return results;
}
