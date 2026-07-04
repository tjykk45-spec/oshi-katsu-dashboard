"use client";

import { useMemo, useState } from "react";
import type { Article } from "@/scripts/schema";
import HeroCollage, { type MemberInfo } from "./HeroCollage";
import GroupSection from "./GroupSection";
import type { AvatarInfo } from "./NewsCard";

interface GroupMeta {
  id: string;
  label: string;
  emoji: string;
  cssClass: "nogi" | "saku" | "hina";
}

interface Props {
  articles: Article[]; // 全件（未スライス）
  groups: GroupMeta[];
  members: MemberInfo[];
  memberAvatars: Record<string, AvatarInfo>;
  newIds: string[];
  /** 誕生日カウントダウン強調ウィンドウ内（🎂バッジ対象）のメンバー名 */
  celebratingNames: string[];
  pageSize: number;
}

function matchesQuery(article: Article, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return article.title.toLowerCase().includes(q) || article.summary.toLowerCase().includes(q);
}

export default function NewsExplorer({ articles, groups, members, memberAvatars, newIds, celebratingNames, pageSize }: Props) {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  const newIdSet = useMemo(() => new Set(newIds), [newIds]);
  const memberAvatarMap = useMemo(() => new Map(Object.entries(memberAvatars)), [memberAvatars]);
  const celebratingSet = useMemo(() => new Set(celebratingNames), [celebratingNames]);

  const trimmedQuery = query.trim();
  const isFiltering = selectedMembers.size > 0 || activeTag !== null || trimmedQuery !== "";

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (selectedMembers.size > 0 && !(a.memberName && selectedMembers.has(a.memberName))) return false;
      if (activeTag && !a.tags.includes(activeTag)) return false;
      if (!matchesQuery(a, trimmedQuery)) return false;
      return true;
    });
  }, [articles, selectedMembers, activeTag, trimmedQuery]);

  function toggleMember(name: string) {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function clearFilters() {
    setSelectedMembers(new Set());
    setActiveTag(null);
    setQuery("");
  }

  return (
    <>
      <HeroCollage
        members={members}
        selectedNames={selectedMembers}
        onToggleMember={toggleMember}
        celebratingNames={celebratingSet}
      />

      <div className="explorer-bar">
        <div className="explorer-search">
          <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="キーワードで検索"
            aria-label="ニュースをキーワード検索"
          />
        </div>
        {isFiltering && (
          <div className="explorer-active">
            <span>
              {selectedMembers.size > 0 && `推し${selectedMembers.size}人`}
              {selectedMembers.size > 0 && (activeTag || trimmedQuery) && " · "}
              {activeTag && `タグ「${activeTag}」`}
              {activeTag && trimmedQuery && " · "}
              {trimmedQuery && `「${trimmedQuery}」`}
              で絞り込み中
            </span>
            <button type="button" className="explorer-clear" onClick={clearFilters}>すべて解除</button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        {groups.map((g, i) => {
          const matched = filtered.filter((a) => a.group === g.id);
          const visibleCount = visibleCounts[g.id] ?? pageSize;
          return (
            <div key={g.id}>
              {i > 0 && <div className="group-divider" />}
              <GroupSection
                group={g}
                articles={matched.slice(0, visibleCount)}
                totalMatched={matched.length}
                newIds={newIdSet}
                memberAvatars={memberAvatarMap}
                activeTag={activeTag}
                onTagClick={(tag) => setActiveTag((prev) => (prev === tag ? null : tag))}
                onShowMore={() => setVisibleCounts((prev) => ({ ...prev, [g.id]: visibleCount + pageSize }))}
                isFiltering={isFiltering}
              />
            </div>
          );
        })}
      </div>

      <style>{`
        .explorer-bar { margin-top: 16px; }
        .explorer-search {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; border-radius: 14px;
          background: oklch(97% 0 0); border: 1px solid oklch(90% 0 0);
          color: oklch(55% 0 0);
        }
        .explorer-search input {
          flex: 1; border: none; background: transparent; outline: none;
          font-size: 13px; color: oklch(20% 0 0); font-family: inherit;
        }
        .explorer-search input::placeholder { color: oklch(65% 0 0); }
        .explorer-active {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          margin-top: 8px; padding: 6px 4px;
          font-size: 11px; color: oklch(45% 0 0);
        }
        .explorer-clear {
          flex-shrink: 0; font-size: 11px; font-weight: 700;
          padding: 4px 10px; border-radius: 12px; border: 1px solid oklch(80% 0 0);
          background: #fff; color: oklch(40% 0 0); cursor: pointer;
        }
        .explorer-clear:hover { background: oklch(95% 0 0); }

        .section-empty {
          padding: 20px 12px; text-align: center; font-size: 12px;
          color: oklch(60% 0 0); border: 1px dashed oklch(85% 0 0); border-radius: 16px;
        }

        .show-more {
          display: block; width: 100%; margin-top: 10px; padding: 9px;
          border-radius: 12px; border: none; cursor: pointer;
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em;
        }
        .show-more.nogi { background: var(--nogi-soft); color: var(--nogi-text); }
        .show-more.saku { background: var(--saku-soft); color: var(--saku-text); }
        .show-more.hina { background: #e8f7fb; color: #2c7a96; }
        .show-more:hover { filter: brightness(0.96); }

        .tag { border: none; cursor: pointer; font-family: inherit; }
        .tag:disabled { cursor: default; }
        .tag-active { outline: 2px solid currentColor; outline-offset: 1px; }
      `}</style>
    </>
  );
}
