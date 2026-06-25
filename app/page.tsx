import { readFileSync } from "fs";
import { join } from "path";
import { NewsDataSchema, type Article } from "@/scripts/schema";
import {
  MAX_PER_GROUP,
  NEW_WINDOW_MS,
  GROUPS as GROUP_CONFIG,
  MEMBERS as MEMBER_CONFIG,
  type GroupId,
} from "@/scripts/config";
import GroupSection from "@/components/GroupSection";
import PetalCanvas from "@/components/PetalCanvas";
import HeroCollage from "@/components/HeroCollage";
import type { AvatarInfo } from "@/components/NewsCard";

const GROUP_ORDER: GroupId[] = ["nogizaka46", "sakurazaka46", "hinatazaka46"];

// scripts/config.ts（SSOT）から表示用に整形
const GROUPS = GROUP_ORDER.map((id) => ({
  id,
  label: GROUP_CONFIG[id].label,
  emoji: GROUP_CONFIG[id].emoji,
  cssClass: GROUP_CONFIG[id].cssClass,
}));

const MEMBERS = MEMBER_CONFIG.map((m) => ({
  name: m.name,
  group: GROUP_CONFIG[m.group].cssClass,
  avatar: `avatars/${m.avatar}`,
  imageScale: m.imageScale,
  imagePosition: m.imagePosition,
}));

// メンバー名 → カードのバッジ用アバター情報
const MEMBER_AVATARS = new Map<string, AvatarInfo>(
  MEMBER_CONFIG.map((m) => [
    m.name,
    { src: `avatars/${m.avatar}`, scale: m.imageScale, position: m.imagePosition },
  ])
);

function loadArticles(): Article[] {
  try {
    const raw = JSON.parse(readFileSync(join(process.cwd(), "data/news.json"), "utf-8"));
    const parsed = NewsDataSchema.safeParse(raw);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export default function Page() {
  const articles = loadArticles();
  const updatedAt = articles[0]?.fetchedAt
    ? new Date(articles[0].fetchedAt).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      })
    : "–";

  // ── NEW 判定（最新フェッチ分）
  const fetchTimes = articles.map((a) => Date.parse(a.fetchedAt)).filter(Number.isFinite);
  const latestFetchMs = fetchTimes.length ? Math.max(...fetchTimes) : 0;
  const newIds = new Set(
    articles
      .filter((a) => {
        const t = Date.parse(a.fetchedAt);
        return Number.isFinite(t) && latestFetchMs - t <= NEW_WINDOW_MS;
      })
      .map((a) => a.id)
  );

  // slice 前の全件から算出（ナビ NEW 取りこぼし防止）
  const hasNew = (gid: string) => articles.some((a) => a.group === gid && newIds.has(a.id));

  const byGroup = Object.fromEntries(
    GROUPS.map((g) => [
      g.id,
      articles
        .filter((a) => a.group === g.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, MAX_PER_GROUP),
    ])
  );
  const totalCount = articles.length;

  return (
    <>
      <PetalCanvas />

      <div className="page-wrap" style={{ position: "relative", zIndex: 2, maxWidth: 480, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* ── HEADER ── */}
        <header>
          <div className="header-top">
            <div className="header-title">
              <h1>推し活ニュース</h1>
              <span className="subtitle">坂道46</span>
            </div>
            <div className="header-meta">
              <span className="update-badge">
                <span className="live-dot" />
                {updatedAt}
              </span>
            </div>
          </div>
          <nav className="group-nav">
            {GROUPS.map((g) => (
              <a key={g.id} href={`#${g.id}`} className={`gnav-btn ${g.cssClass}`}>
                <span className="gnav-icon">{g.emoji}</span>
                {g.label}
                {hasNew(g.id) && <span className="gnav-new" aria-label="新着あり">NEW</span>}
              </a>
            ))}
          </nav>
        </header>

        {/* ── HERO COLLAGE ── */}
        <HeroCollage members={MEMBERS} groups={GROUPS} />

        {/* ── GROUP SECTIONS ── */}
        <div style={{ marginTop: 24 }}>
          {GROUPS.map((g, i) => (
            <div key={g.id}>
              {i > 0 && <div className="group-divider" />}
              <GroupSection group={g} articles={byGroup[g.id] ?? []} newIds={newIds} memberAvatars={MEMBER_AVATARS} />
            </div>
          ))}
        </div>

        {totalCount === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "oklch(60% 0 0)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🌸</div>
            <p style={{ fontSize: 14 }}>まだニュースがありません</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>
              <code>npm run fetch</code> を実行してデータを取得してください
            </p>
          </div>
        )}

        {/* ── FOOTER ── */}
        <footer style={{ marginTop: 40, padding: "20px 0", textAlign: "center" }}>
          <div style={{ fontSize: 18, letterSpacing: 4, marginBottom: 6, opacity: 0.5 }}>🌸 🌹 🌻</div>
          <div style={{ fontSize: 10, color: "oklch(70% 0 0)", letterSpacing: "0.1em" }}>
            推し活ニュース · 個人用ダッシュボード · 2026
          </div>
        </footer>
      </div>

      <style>{`
        .page-wrap { font-family: 'Noto Sans JP', sans-serif; }
        header {
          position: sticky; top: 0; z-index: 30;
          margin: 0 -16px; padding: 0 16px;
          background: oklch(100% 0 0 / 0.82);
          backdrop-filter: blur(18px) saturate(1.5);
          -webkit-backdrop-filter: blur(18px) saturate(1.5);
          border-bottom: 1px solid oklch(88% 0.04 320 / 0.5);
        }
        .header-top { display:flex; align-items:center; justify-content:space-between; padding:14px 0 8px; }
        .header-title { display:flex; align-items:baseline; gap:8px; }
        .header-title h1 {
          font-family: 'Shippori Mincho', serif;
          font-size:18px; font-weight:700;
          background: linear-gradient(120deg, var(--nogi-main), var(--saku-main), var(--hina-main));
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          letter-spacing:0.06em;
        }
        .subtitle { font-size:10px; color:oklch(60% 0 0); letter-spacing:0.1em; }
        .update-badge { font-size:10px; color:oklch(55% 0 0); display:flex; align-items:center; gap:4px; }

        /* ── グループナビ ── */
        .group-nav { display:flex; gap:6px; padding:0 0 12px; overflow-x:auto; scrollbar-width:none; }
        .group-nav::-webkit-scrollbar { display:none; }
        .gnav-btn {
          flex-shrink:0; position:relative; display:flex; align-items:center; gap:5px;
          padding:5px 12px 5px 8px; border-radius:20px;
          font-size:11px; font-weight:700; border:1.5px solid transparent;
          cursor:pointer; text-decoration:none;
          transition:transform 0.15s ease; letter-spacing:0.04em;
        }
        .gnav-btn:hover { transform:translateY(-1px); }
        .gnav-btn.nogi { background:linear-gradient(135deg,oklch(86% 0.10 310),oklch(91% 0.07 330)); color:var(--nogi-text); border-color:oklch(80% 0.10 310); }
        .gnav-btn.saku { background:linear-gradient(135deg,oklch(88% 0.10 5),oklch(92% 0.06 15)); color:var(--saku-text); border-color:oklch(82% 0.10 5); }
        .gnav-btn.hina { background:linear-gradient(135deg,#e8f7fb,#daf4f9); color:#2c7a96; border-color:#b8e5f0; }
        .gnav-icon { font-size:14px; }
        .gnav-new {
          margin-left:3px; padding:1px 5px; border-radius:8px;
          background: oklch(63% 0.22 25); color:#fff;
          font-size:8.5px; font-weight:800; letter-spacing:0.05em;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        /* ── カード ── */
        .section { padding-top:24px; }
        .section-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
        .section-emblem { width:38px; height:38px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
        .section-emblem.nogi { background:linear-gradient(135deg,oklch(86% 0.12 310),oklch(80% 0.18 325)); }
        .section-emblem.saku { background:linear-gradient(135deg,oklch(84% 0.14 358),oklch(78% 0.20 10)); }
        .section-emblem.hina { background:linear-gradient(135deg,#d9f0f7,#c5e8f2); }
        .section-name { font-family:'Shippori Mincho',serif; font-size:16px; font-weight:700; letter-spacing:0.08em; }
        .section-name.nogi { color:var(--nogi-text); }
        .section-name.saku { color:var(--saku-text); }
        .section-name.hina { color:#2c7a96; }
        .section-count { font-size:10px; color:oklch(60% 0 0); margin-top:1px; letter-spacing:0.06em; }
        .card-list { display:flex; flex-direction:column; gap:10px; }

        .card-inner { display:flex; align-items:flex-start; gap:10px; }
        .card-body { flex:1; min-width:0; }
        .badge-row { display:flex; flex-wrap:wrap; align-items:center; gap:5px; margin-bottom:7px; }
        .new-badge {
          font-size:10px; font-weight:800; padding:1px 7px; border-radius:10px;
          background: oklch(63% 0.22 25); color:#fff; letter-spacing:0.05em;
        }
        .member-badge {
          font-size:10.5px; font-weight:700; padding:2px 9px 2px 4px; border-radius:14px;
          letter-spacing:0.04em; display:inline-flex; align-items:center; gap:5px;
        }
        .member-badge.nogi { background:var(--nogi-main); color:#fff; }
        .member-badge.saku { background:var(--saku-main); color:#fff; }
        .member-badge.hina { background:var(--hina-main); color:#fff; }
        .member-badge.group { background:oklch(93% 0 0); color:oklch(45% 0 0); padding:2px 9px; }
        .badge-avatar {
          width:20px; height:20px; border-radius:50%;
          object-fit:cover; object-position:center top;
          border:1.5px solid oklch(100% 0 0 / 0.5); flex-shrink:0;
        }
        .type-label { font-size:10px; color:oklch(60% 0 0); letter-spacing:0.06em; }
        .date-label { font-size:10px; color:oklch(68% 0 0); }
        .card-title { font-size:13.5px; font-weight:700; color:oklch(20% 0 0); line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:5px; }
        .card-summary { font-size:11.5px; color:oklch(48% 0 0); line-height:1.65; margin-bottom:7px; }
        .tag-row { display:flex; flex-wrap:wrap; gap:4px; }
        .tag { font-size:10px; font-weight:600; padding:2px 8px; border-radius:10px; letter-spacing:0.04em; }
        .tag.nogi { background:var(--nogi-soft); color:var(--nogi-text); }
        .tag.saku { background:var(--saku-soft); color:var(--saku-text); }
        .tag.hina { background:#e8f7fb; color:#2c7a96; }
        .chevron-wrap { flex-shrink:0; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:oklch(95% 0 0); margin-top:2px; }
        .bullet-list { list-style:none; margin-bottom:12px; display:flex; flex-direction:column; gap:7px; }
        .bullet-list li { display:flex; align-items:flex-start; gap:8px; font-size:11.5px; color:oklch(25% 0 0); line-height:1.6; }
        .bullet { font-size:11px; flex-shrink:0; margin-top:2px; }
        .bullet.nogi { color:var(--nogi-main); }
        .bullet.saku { color:var(--saku-main); }
        .bullet.hina { color:#7cc7e8; }
        .read-more { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; text-decoration:none; letter-spacing:0.06em; transition:opacity 0.15s; }
        .read-more:hover { opacity:0.72; }
        .read-more.nogi { color:var(--nogi-text); }
        .read-more.saku { color:var(--saku-text); }
        .read-more.hina { color:#2c7a96; }
        .group-divider { margin:30px 0 0; height:1px; background:linear-gradient(90deg,transparent,oklch(86% 0.04 320),transparent); }

        @media (prefers-reduced-motion: reduce) {
          .gnav-new { animation: none; }
        }
      `}</style>
    </>
  );
}
