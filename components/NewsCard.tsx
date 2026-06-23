import type { Article } from "@/scripts/schema";

type Group = "nogi" | "saku" | "hina";

const GROUP_CSS: Record<string, Group> = {
  nogizaka46: "nogi",
  sakurazaka46: "saku",
  hinatazaka46: "hina",
};

const BULLET_CHAR: Record<Group, string> = {
  nogi: "✿", saku: "✿", hina: "✿",
};

interface Props {
  article: Article;
  isNew?: boolean;
}

export default function NewsCard({ article, isNew }: Props) {
  const g = GROUP_CSS[article.group] ?? "nogi";
  const sourceLabel = article.source === "blog" ? "ブログ" : "公式ニュース";

  return (
    <details className={`news-card card-${g}`}>
      <summary>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* バッジ行 */}
            <div className="badge-row">
              {isNew && <span className="new-badge" aria-label="新着">NEW</span>}
              {article.memberName ? (
                <span className={`member-badge ${g}`}>{article.memberName}</span>
              ) : (
                <span className="member-badge group">グループ</span>
              )}
              <span className="type-label">{sourceLabel}</span>
              <span className="date-label">· {article.date}</span>
            </div>
            {/* タイトル */}
            <div className="card-title">{article.title}</div>
            {/* AI要約 */}
            <div className="card-summary">{article.summary}</div>
            {/* タグ */}
            <div className="tag-row">
              {article.tags.map((tag) => (
                <span key={tag} className={`tag ${g}`}>{tag}</span>
              ))}
            </div>
          </div>
          {/* シェブロン */}
          <div className="chevron-wrap">
            <svg className="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" width={12} height={12}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </summary>

      {/* 展開エリア */}
      <div className={`expand-body ${g}`}>
        <ul className="bullet-list">
          {article.bullets.map((b, i) => (
            <li key={i}>
              <span className={`bullet ${g}`}>{BULLET_CHAR[g]}</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <a href={article.url} target="_blank" rel="noopener noreferrer" className={`read-more ${g}`}>
          元記事を読む
          <svg width={12} height={12} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </details>
  );
}
