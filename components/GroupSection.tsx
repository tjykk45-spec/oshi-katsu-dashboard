import type { Article } from "@/scripts/schema";
import NewsCard, { type AvatarInfo } from "./NewsCard";

interface GroupMeta {
  id: string;
  label: string;
  emoji: string;
  cssClass: "nogi" | "saku" | "hina";
}

interface Props {
  group: GroupMeta;
  articles: Article[];
  newIds: Set<string>;
  memberAvatars: Map<string, AvatarInfo>;
}

const SECTION_BG: Record<string, string> = {
  nogi: "linear-gradient(160deg, oklch(95% 0.05 310 / 0.55) 0%, oklch(97% 0.03 320 / 0.3) 100%)",
  saku: "linear-gradient(160deg, oklch(95% 0.06 5   / 0.55) 0%, oklch(97% 0.03 355 / 0.3) 100%)",
  hina: "linear-gradient(160deg, rgba(210,240,252,0.55)       0%, rgba(230,248,255,0.3)   100%)",
};

const SECTION_BORDER: Record<string, string> = {
  nogi: "1px solid oklch(88% 0.08 310 / 0.5)",
  saku: "1px solid oklch(88% 0.10 5   / 0.5)",
  hina: "1px solid rgba(160,218,240,0.5)",
};

export default function GroupSection({ group, articles, newIds, memberAvatars }: Props) {
  if (articles.length === 0) return null;
  const g = group.cssClass;

  return (
    <section id={group.id} className="section">
      <div className="section-header">
        <div className={`section-emblem ${g}`}>{group.emoji}</div>
        <div>
          <div className={`section-name ${g}`}>{group.label}</div>
          <div className="section-count">{articles.length}件のニュース</div>
        </div>
      </div>
      <div
        style={{
          background: SECTION_BG[g],
          border: SECTION_BORDER[g],
          borderRadius: 20,
          padding: "14px 12px",
        }}
      >
        <div className="card-list">
          {articles.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              isNew={newIds.has(article.id)}
              avatar={article.memberName ? memberAvatars.get(article.memberName) : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
