"use client";

export interface MemberInfo {
  name: string;
  group: "nogi" | "saku" | "hina";
  avatar: string;        // 画像URL（例: avatars/endo-sakura.jpg）
  imageScale?: number;   // 拡大率（既定 1）
  imagePosition?: string; // object-position（既定 "center top"）
}

interface GroupInfo {
  id: string;
  label: string;
  cssClass: "nogi" | "saku" | "hina";
}

interface Props {
  members: MemberInfo[];
  groups: GroupInfo[];
}

// 配列の並び順 → コラージュの 5 枠（[0]=左の大きい枠 → 右下へ）
const SLOT_CLASS = ["cp-slot1", "cp-slot2", "cp-slot3", "cp-slot4", "cp-slot5"] as const;

function imgStyle(m: MemberInfo): React.CSSProperties {
  const scale = m.imageScale ?? 1;
  return {
    objectPosition: m.imagePosition ?? "center top",
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: "center top",
  };
}

export default function HeroCollage({ members, groups }: Props) {
  const slots = members.slice(0, 5);
  const names = slots.map((m) => m.name);
  const labelTop = names.slice(0, 2).join(" · ");
  const labelBottom = names.slice(2).join(" · ");

  return (
    <>
      <div className="collage-hero">
        <div className="collage-grid">
          {slots.map((m, i) => (
            <div key={m.name} className={`collage-photo ${SLOT_CLASS[i]}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.avatar} alt={m.name} style={imgStyle(m)} loading="eager" />
            </div>
          ))}
        </div>

        {/* グループバッジ（左上） */}
        <div className="collage-badge">
          {groups.map((g) => (
            <span key={g.id} className={`cbadge ${g.cssClass}`}>{g.label}</span>
          ))}
        </div>

        {/* タイトルオーバーレイ（下部） */}
        <div className="collage-title-bar">
          <h2>推し活ニュース</h2>
          <div className="collage-members-label">
            {labelTop}
            <br />
            {labelBottom}
          </div>
        </div>
      </div>

      <style>{`
        .collage-hero {
          margin: 14px 0 20px;
          border-radius: 24px;
          overflow: hidden;
          position: relative;
          background: linear-gradient(145deg,
            oklch(88% 0.09 310) 0%,
            oklch(88% 0.10 5) 50%,
            oklch(90% 0.08 200) 100%
          );
          box-shadow: 0 8px 32px oklch(0% 0 0 / 0.10);
        }
        .collage-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 3px;
          height: 300px;
        }
        .collage-photo { position: relative; overflow: hidden; }
        .collage-photo img {
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
        }
        /* 枠の配置（[0]=左の縦長 → 右下へ） */
        .cp-slot1 { grid-row: 1 / 3; grid-column: 1; }
        .cp-slot2 { grid-row: 1;     grid-column: 2; }
        .cp-slot3 { grid-row: 1;     grid-column: 3; }
        .cp-slot4 { grid-row: 2;     grid-column: 2; }
        .cp-slot5 { grid-row: 2;     grid-column: 3; }

        /* カラーティント */
        .collage-photo::after { content: ''; position: absolute; inset: 0; pointer-events: none; }
        .cp-slot1::after { background: linear-gradient(180deg, oklch(75% 0.16 310 / 0.18) 0%, transparent 45%); }
        .cp-slot2::after { background: linear-gradient(180deg, oklch(72% 0.18 295 / 0.18) 0%, transparent 45%); }
        .cp-slot3::after { background: linear-gradient(180deg, oklch(68% 0.22 5   / 0.18) 0%, transparent 45%); }
        .cp-slot4::after { background: linear-gradient(180deg, oklch(68% 0.22 0   / 0.18) 0%, transparent 45%); }
        .cp-slot5::after { background: linear-gradient(180deg, oklch(65% 0.18 200 / 0.18) 0%, transparent 45%); }

        .collage-title-bar {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 28px 18px 14px;
          background: linear-gradient(0deg, oklch(0% 0 0 / 0.45) 0%, transparent 100%);
          display: flex; align-items: flex-end; justify-content: space-between;
          pointer-events: none;
        }
        .collage-title-bar h2 {
          font-family: var(--font-min, 'Shippori Mincho', serif);
          font-size: 17px; font-weight: 700; color: #fff;
          letter-spacing: 0.12em;
          text-shadow: 0 1px 8px oklch(0% 0 0 / 0.4);
        }
        .collage-members-label {
          font-size: 9.5px; color: oklch(95% 0 0 / 0.85);
          letter-spacing: 0.07em; text-align: right; line-height: 1.6;
          text-shadow: 0 1px 4px oklch(0% 0 0 / 0.4);
        }

        .collage-badge {
          position: absolute; top: 12px; left: 12px;
          display: flex; gap: 4px;
        }
        .cbadge {
          font-size: 9px; font-weight: 700;
          padding: 3px 7px; border-radius: 10px;
          backdrop-filter: blur(8px);
          letter-spacing: 0.06em;
        }
        .cbadge.nogi { background: oklch(62% 0.18 310 / 0.85); color: #fff; }
        .cbadge.saku { background: oklch(60% 0.22 0   / 0.85); color: #fff; }
        .cbadge.hina { background: #7cc7e8cc; color: #fff; }
      `}</style>
    </>
  );
}
