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
  /** 表示対象（フィルタ適用後・visibleCount で切り詰め済み） */
  articles: Article[];
  /** フィルタ適用後の総件数（もっと見るボタンの残数表示に使用） */
  totalMatched: number;
  newIds: Set<string>;
  memberAvatars: Map<string, AvatarInfo>;
  activeTag: string | null;
  onTagClick: (tag: string) => void;
  onShowMore: () => void;
  /** メンバー/検索/タグのいずれかで絞り込み中かどうか */
  isFiltering: boolean;
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

export default function GroupSection({
  group, articles, totalMatched, newIds, memberAvatars, activeTag, onTagClick, onShowMore, isFiltering,
}: Props) {
  if (totalMatched === 0 && !isFiltering) return null;
  const g = group.cssClass;
  const remaining = totalMatched - articles.length;

  return (
    <section id={group.id} className="section">
      <div className="section-header">
        <div className={`section-emblem ${g}`}>{group.emoji}</div>
        <div>
          <div className={`section-name ${g}`}>{group.label}</div>
          <div className="section-count">{totalMatched}件のニュース</div>
        </div>
      </div>
      {totalMatched === 0 ? (
        <div className="section-empty">この絞り込みに一致するニュースはありません</div>
      ) : (
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
              activeTag={activeTag}
              onTagClick={onTagClick}
            />
          ))}
        </div>
        {remaining > 0 && (
          <button type="button" className={`show-more ${g}`} onClick={onShowMore}>
            もっと見る（+{remaining}件）
          </button>
        )}
      </div>
      )}
    </section>
  );
}
