import type { BirthdayEntry } from "@/lib/birthday";

interface Props {
  /** 14日以内の誕生日一覧（近い順） */
  entries: BirthdayEntry[];
}

export default function BirthdayBanner({ entries }: Props) {
  if (entries.length === 0) return null;
  const [top, ...rest] = entries;
  const isToday = top.daysUntil === 0;
  const isSoon = top.daysUntil <= 7;

  const label = isToday
    ? `🎉 今日は${top.name}の誕生日です！`
    : `🎂 ${top.name}の誕生日まであと${top.daysUntil}日`;

  return (
    <div className={`bday-banner ${isToday ? "is-today" : isSoon ? "is-soon" : ""}`}>
      <span className="bday-label">{label}</span>
      {rest.length > 0 && <span className="bday-more">ほか{rest.length}人</span>}

      <style>{`
        .bday-banner {
          margin-top: 12px; padding: 10px 14px; border-radius: 14px;
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          font-size: 12px; font-weight: 700;
          background: oklch(96% 0.03 320); color: oklch(40% 0.05 320);
          border: 1px solid oklch(90% 0.05 320);
        }
        .bday-banner.is-soon {
          background: linear-gradient(135deg, oklch(90% 0.10 340), oklch(92% 0.08 20));
          color: oklch(35% 0.10 340);
          border-color: oklch(80% 0.12 340);
        }
        .bday-banner.is-today {
          background: linear-gradient(135deg, oklch(78% 0.20 340), oklch(80% 0.18 20));
          color: #fff;
          border-color: oklch(65% 0.22 340);
          animation: bday-pulse 1.6s ease-in-out infinite;
        }
        @keyframes bday-pulse {
          0%, 100% { box-shadow: 0 0 0 0 oklch(70% 0.22 340 / 0.5); }
          50% { box-shadow: 0 0 0 8px oklch(70% 0.22 340 / 0); }
        }
        .bday-more { flex-shrink: 0; font-size: 10px; opacity: 0.8; }
        @media (prefers-reduced-motion: reduce) {
          .bday-banner.is-today { animation: none; }
        }
      `}</style>
    </div>
  );
}
