import type { Article } from "@/scripts/schema";
import NewsCard from "./NewsCard";

interface GroupMeta {
  id: string;
  label: string;
  emoji: string;
  cssClass: "nogi" | "saku" | "hina";
}

interface Props {
  group: GroupMeta;
  articles: Article[];
}

export default function GroupSection({ group, articles }: Props) {
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
      <div className="card-list">
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
