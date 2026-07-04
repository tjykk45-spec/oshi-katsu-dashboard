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
import { todayJst, collectUpcomingBirthdays } from "@/lib/birthday";
import NewsExplorer from "@/components/NewsExplorer";
import BirthdayBanner from "@/components/BirthdayBanner";
import PetalCanvas from "@/components/PetalCanvas";
import type { AvatarInfo } from "@/components/NewsCard";

const GROUP_ORDER: GroupId[] = ["nogizaka46", "sakurazaka46", "hinatazaka46"];

// バナー表示ウィンドウ（日）。7日以内は強調表示に切り替わる
const BIRTHDAY_WINDOW_DAYS = 14;
const BIRTHDAY_HIGHLIGHT_DAYS = 7;

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
const MEMBER_AVATARS: Record<string, AvatarInfo> = Object.fromEntries(
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
  const articles = loadArticles().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
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
  const newIds = articles
    .filter((a) => {
      const t = Date.parse(a.fetchedAt);
      return Number.isFinite(t) && latestFetchMs - t <= NEW_WINDOW_MS;
    })
    .map((a) => a.id);

  const hasNew = (gid: string) => articles.some((a) => a.group === gid && newIds.includes(a.id));
  const totalCount = articles.length;

  // ── 誕生日カウントダウン（JST 明示。GitHub Actions ランナーは UTC のため素朴な new Date() だとズレる）
  const today = todayJst();
  const birthdayEntries = collectUpcomingBirthdays(MEMBER_CONFIG, today, BIRTHDAY_WINDOW_DAYS);
  const celebratingNames = birthdayEntries
    .filter((b) => b.daysUntil <= BIRTHDAY_HIGHLIGHT_DAYS)
    .map((b) => b.name);

  return (
    <>
      <PetalCanvas />

      <div className="page-wrap" style={{ position: "relative", zIndex: 2, maxWidth: 480, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* ── HEADER（ヒーロー: 非sticky） ── */}
        <header>
          <div className="hero-card">
            <div className="hero-decor hero-decor-a" />
            <div className="hero-decor hero-decor-b" />
            <div className="hero-top">
              <div className="hero-brand">
                <div className="hero-badge">
                  <span>46</span>
                </div>
                <div className="hero-brand-text">
                  <h1>坂道46</h1>
                  <span className="hero-caption">OSHI-KATSU DASHBOARD</span>
                </div>
              </div>
              <div className="hero-meta">
                <span className="update-badge">
                  <span className="live-dot" />
                  {updatedAt}
                </span>
                {newIds.length > 0 && <span className="new-count">新着{newIds.length}件</span>}
              </div>
            </div>
          </div>

          {/* ── グループナビ（簡易バー: sticky） ── */}
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

        {/* ── 誕生日カウントダウン（非sticky） ── */}
        <BirthdayBanner entries={birthdayEntries} />

        {/* ── HERO COLLAGE + 検索・絞り込み・記事一覧 ── */}
        <NewsExplorer
          articles={articles}
          groups={GROUPS}
          members={MEMBERS}
          memberAvatars={MEMBER_AVATARS}
          newIds={newIds}
          celebratingNames={celebratingNames}
          pageSize={MAX_PER_GROUP}
        />

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

        /* ── ヒーローヘッダー（非sticky） ── */
        .hero-card {
          position: relative; overflow: hidden;
          margin: 14px 0 0; padding: 18px 20px;
          border-radius: 22px;
          background: linear-gradient(135deg, #FFE3EE 0%, #F7D3E9 32%, #E7D2F5 66%, #D9C5F2 100%);
          box-shadow: 0 14px 34px oklch(0% 0 0 / 0.12);
        }
        .hero-decor { position:absolute; border-radius:50%; pointer-events:none; }
        .hero-decor-a { top:-30px; right:30px; width:130px; height:130px; background:radial-gradient(circle, oklch(100% 0 0 / 0.55), transparent 70%); }
        .hero-decor-b { bottom:-40px; left:-20px; width:160px; height:160px; background:radial-gradient(circle, oklch(100% 0 0 / 0.35), transparent 70%); }
        .hero-top { position:relative; display:flex; align-items:flex-start; justify-content:space-between; gap:10px; flex-wrap:wrap; }
        .hero-brand { display:flex; align-items:center; gap:10px; }
        .hero-badge {
          width:46px; height:46px; border-radius:50%; flex-shrink:0;
          background: linear-gradient(135deg, #EE9AC4, #B79AE8);
          display:flex; align-items:center; justify-content:center;
        }
        .hero-badge span {
          width:38px; height:38px; border-radius:50%; background: oklch(100% 0 0 / 0.85);
          display:flex; align-items:center; justify-content:center;
          font-family: var(--font-min); font-weight:700; font-size:14px; color:#8A5FA8;
        }
        .hero-brand-text h1 {
          font-family: var(--font-min); font-weight:700; font-size:21px;
          letter-spacing:0.06em; color:#3A2E4A;
        }
        .hero-caption { font-size:9.5px; letter-spacing:0.16em; color:#8A6C98; font-weight:600; }
        .hero-meta { display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
        .update-badge { font-size:10.5px; color:#6A5678; display:flex; align-items:center; gap:4px; font-weight:500; }
        .new-count { font-size:9.5px; font-weight:700; color:oklch(55% 0.20 25); }

        /* ── グループナビ（簡易バー: sticky） ── */
        .group-nav {
          position: sticky; top: 0; z-index: 30;
          display:flex; gap:6px; margin:10px -16px 0; padding:8px 16px;
          overflow-x:auto; scrollbar-width:none;
          background: oklch(100% 0 0 / 0.82);
          backdrop-filter: blur(18px) saturate(1.5);
          -webkit-backdrop-filter: blur(18px) saturate(1.5);
          border-bottom: 1px solid oklch(88% 0.04 320 / 0.5);
        }
        .group-nav::-webkit-scrollbar { display:none; }
        .gnav-btn {
          flex-shrink:0; position:relative; display:flex; align-items:center; gap:5px;
          padding:6px 14px 6px 10px; border-radius:20px; min-height:36px;
          font-size:11px; font-weight:700; border:2px solid transparent;
          cursor:pointer; text-decoration:none;
          box-shadow: 0 2px 6px oklch(0% 0 0 / 0.12);
          transition:transform 0.15s ease, filter 0.15s ease; letter-spacing:0.04em;
        }
        .gnav-btn:hover { transform:translateY(-2px); filter:brightness(0.90); }
        .gnav-btn:active { transform:translateY(0); filter:brightness(0.82); }
        .gnav-btn.nogi { background:linear-gradient(135deg,oklch(72% 0.18 312),oklch(78% 0.14 328)); color:#fff; border-color:oklch(62% 0.20 312); }
        .gnav-btn.saku { background:linear-gradient(135deg,oklch(68% 0.18 5),oklch(74% 0.14 18)); color:#fff; border-color:oklch(58% 0.20 5); }
        .gnav-btn.hina { background:linear-gradient(135deg,oklch(68% 0.12 215),oklch(74% 0.10 205)); color:#fff; border-color:oklch(58% 0.14 215); }
        .gnav-icon { font-size:14px; }
        .gnav-new {
          margin-left:3px; padding:2px 6px; border-radius:8px;
          background: oklch(55% 0.26 25); color:#fff;
          font-size:9.5px; font-weight:800; letter-spacing:0.05em;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        /* ── カード ── */
        .section { padding-top:24px; }
        .section-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
        .section-emblem { width:38px; height:38px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
        .section-emblem.nogi { background:linear-gradient(135deg,oklch(86% 0.12 310),oklch(80% 0.18 325)); }
        .section-emblem.saku { background:linear-gradient(135deg,oklch(84% 0.14 358),oklch(78% 0.20 10)); }
        .section-emblem.hina { background:linear-gradient(135deg,#d9f0f7,#c5e8f2); }
        .section-name { font-family: var(--font-min); font-size:16px; font-weight:700; letter-spacing:0.08em; }
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
