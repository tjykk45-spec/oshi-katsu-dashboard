"use client";

interface MemberInfo {
  name: string;
  group: "nogi" | "saku" | "hina";
  avatar: string;
}

interface GroupInfo {
  id: string;
  label: string;
  cssClass: "nogi" | "saku" | "hina";
}

interface Props {
  members: MemberInfo[];
  newMemberNames: Set<string>;
  groups: GroupInfo[];
}

export default function HeroCollage({ members, newMemberNames, groups }: Props) {
  // 2–1–2 グリッド: [0,1] [2] [3,4]
  const row1 = members.slice(0, 2);
  const row2 = members.slice(2, 3);
  const row3 = members.slice(3, 5);

  const groupHref = (g: "nogi" | "saku" | "hina") => {
    const found = groups.find((x) => x.cssClass === g);
    return found ? `#${found.id}` : "#";
  };

  return (
    <>
      <div className="hero-collage">
        <div className="collage-bg-text">🌸 坂道46 🌹 推し活 🌻</div>
        <div className="collage-row collage-row--outer">
          {row1.map((m) => <CollageCard key={m.name} m={m} isNew={newMemberNames.has(m.name)} href={groupHref(m.group)} size="sm" />)}
        </div>
        <div className="collage-row collage-row--center">
          {row2.map((m) => <CollageCard key={m.name} m={m} isNew={newMemberNames.has(m.name)} href={groupHref(m.group)} size="lg" />)}
        </div>
        <div className="collage-row collage-row--outer">
          {row3.map((m) => <CollageCard key={m.name} m={m} isNew={newMemberNames.has(m.name)} href={groupHref(m.group)} size="sm" />)}
        </div>
        <div className="collage-title">
          <h2>推しメンの最新情報</h2>
          <p>坂道46 · 推し活ニュースダッシュボード</p>
        </div>
      </div>

      <style>{`
        .hero-collage {
          position: relative;
          margin: 16px 0 0;
          padding: 24px 12px 20px;
          border-radius: 24px;
          background: linear-gradient(
            145deg,
            oklch(93% 0.06 310 / 0.85) 0%,
            oklch(94% 0.07 5 / 0.80) 50%,
            oklch(95% 0.06 80 / 0.75) 100%
          );
          border: 1px solid oklch(88% 0.05 320 / 0.5);
          backdrop-filter: blur(12px);
          overflow: hidden;
        }
        .collage-bg-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 11px;
          letter-spacing: 0.25em;
          color: oklch(65% 0.06 310 / 0.25);
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          font-weight: 700;
        }
        .collage-row {
          display: flex;
          justify-content: center;
          gap: 8px;
          position: relative;
        }
        .collage-row--outer { margin-bottom: 6px; }
        .collage-row--center { margin-bottom: 6px; }

        .collage-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          text-decoration: none;
          position: relative;
          flex-shrink: 0;
        }
        .collage-photo-wrap {
          position: relative;
          border-radius: 14px;
          overflow: visible;
        }
        .collage-photo-wrap.sm { width: 88px; }
        .collage-photo-wrap.lg { width: 112px; }
        .collage-photo {
          width: 100%;
          aspect-ratio: 3 / 4;
          object-fit: cover;
          object-position: center top;
          border-radius: 14px;
          display: block;
        }
        .collage-photo-wrap.nogi {
          border: 2.5px solid var(--nogi-main);
          box-shadow: 0 0 0 3px oklch(90% 0.08 310 / 0.4), 0 6px 20px oklch(0% 0 0 / 0.12);
        }
        .collage-photo-wrap.saku {
          border: 2.5px solid var(--saku-main);
          box-shadow: 0 0 0 3px oklch(92% 0.08 5 / 0.4), 0 6px 20px oklch(0% 0 0 / 0.12);
        }
        .collage-photo-wrap.hina {
          border: 2.5px solid var(--hina-main);
          box-shadow: 0 0 0 3px oklch(90% 0.06 210 / 0.4), 0 6px 20px oklch(0% 0 0 / 0.12);
        }
        .collage-photo-wrap.lg.nogi {
          animation: collage-glow-nogi 3.2s ease-in-out infinite;
        }
        @keyframes collage-glow-nogi {
          0%, 100% { box-shadow: 0 0 0 3px oklch(90% 0.08 310 / 0.4), 0 6px 20px oklch(0% 0 0 / 0.12); }
          50%       { box-shadow: 0 0 0 6px oklch(85% 0.14 310 / 0.5), 0 8px 28px oklch(62% 0.18 310 / 0.2); }
        }

        .collage-new-pill {
          position: absolute;
          top: -6px;
          right: -6px;
          background: oklch(63% 0.22 25);
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 10px;
          letter-spacing: 0.05em;
          animation: pulse-dot 2s ease-in-out infinite;
          z-index: 2;
          border: 1.5px solid #fff;
        }

        .collage-name {
          font-family: 'Shippori Mincho', serif;
          font-size: 10px;
          font-weight: 700;
          color: oklch(30% 0.06 310);
          white-space: nowrap;
          letter-spacing: 0.06em;
        }
        .collage-group-tag {
          font-size: 8.5px;
          font-weight: 700;
          padding: 1px 7px;
          border-radius: 10px;
          letter-spacing: 0.05em;
        }
        .collage-group-tag.nogi { background: var(--nogi-soft); color: var(--nogi-text); }
        .collage-group-tag.saku { background: var(--saku-soft); color: var(--saku-text); }
        .collage-group-tag.hina { background: oklch(94% 0.04 210); color: #2c7a96; }

        .collage-title {
          text-align: center;
          margin-top: 14px;
        }
        .collage-title h2 {
          font-family: 'Shippori Mincho', serif;
          font-size: 14px;
          font-weight: 700;
          background: linear-gradient(120deg, var(--nogi-main), var(--saku-main), #2c7a96);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 0.1em;
        }
        .collage-title p {
          font-size: 10px;
          color: oklch(55% 0 0);
          letter-spacing: 0.08em;
          margin-top: 3px;
        }

        @media (prefers-reduced-motion: reduce) {
          .collage-photo-wrap.lg.nogi { animation: none; }
          .collage-new-pill { animation: none; }
        }
      `}</style>
    </>
  );
}

function CollageCard({
  m,
  isNew,
  href,
  size,
}: {
  m: MemberInfo;
  isNew: boolean;
  href: string;
  size: "sm" | "lg";
}) {
  const label = m.group === "nogi" ? "乃木坂46" : m.group === "saku" ? "櫻坂46" : "日向坂46";
  return (
    <a href={href} className="collage-card" aria-label={`${m.name}（${label}）のニュースへ`}>
      <div className={`collage-photo-wrap ${size} ${m.group}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.avatar} alt={`${m.name}（${label}）`} className="collage-photo" loading="eager" />
        {isNew && <span className="collage-new-pill" aria-label="新着">NEW</span>}
      </div>
      <div className="collage-name">{m.name}</div>
      <div className={`collage-group-tag ${m.group}`}>{label}</div>
    </a>
  );
}
