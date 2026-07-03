/**
 * JST の "YYYY-MM-DD" を返す。
 * GitHub Actions ランナーは UTC で動くため、実行環境のタイムゾーンに依存せず
 * 常に JST 基準で「今日」を求める必要がある（sv-SE ロケールは ISO 順の日付文字列を返す）。
 */
export function todayJst(now: Date = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

/**
 * "MM-DD" 形式の誕生日と JST の今日の日付から、次に迎える誕生日までの日数を返す。
 * 今日が誕生日なら 0。
 */
export function daysUntilBirthday(todayJstStr: string, birthdayMmDd: string): number {
  const [ty, tm, td] = todayJstStr.split("-").map(Number);
  const [bm, bd] = birthdayMmDd.split("-").map(Number);
  const today = Date.UTC(ty, tm - 1, td);
  let target = Date.UTC(ty, bm - 1, bd);
  if (target < today) target = Date.UTC(ty + 1, bm - 1, bd);
  return Math.round((target - today) / 86_400_000);
}

export interface BirthdayEntry {
  name: string;
  daysUntil: number;
}

/** 誕生日が windowDays 日以内のメンバーを、近い順にソートして返す */
export function collectUpcomingBirthdays(
  members: { name: string; birthday: string }[],
  todayJstStr: string,
  windowDays: number
): BirthdayEntry[] {
  return members
    .filter((m) => m.birthday)
    .map((m) => ({ name: m.name, daysUntil: daysUntilBirthday(todayJstStr, m.birthday) }))
    .filter((b) => b.daysUntil <= windowDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
