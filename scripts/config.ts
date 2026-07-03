export type GroupId = "nogizaka46" | "sakurazaka46" | "hinatazaka46";

export interface GroupConfig {
  label: string;
  emoji: string;
  cssClass: "nogi" | "saku" | "hina";
}

export interface MemberConfig {
  id: string;
  name: string;
  group: GroupId;
  avatar: string; // public/avatars/ のファイル名（差し替えたい時はここを変更）
  /**
   * 画像の拡大率。1 = 等倍、1.2 = 20%拡大して寄り（顔をアップに）。
   * コラージュ／バッジで顔が小さい・切れる時に調整する。省略時は 1。
   */
  imageScale?: number;
  /**
   * 画像の表示位置（CSS object-position）。"center top" / "50% 30%" など。
   * 顔が見切れる時に上下左右の基準を調整する。省略時は "center top"。
   */
  imagePosition?: string;
  blogListUrl: string | null; // ブログ一覧ページURL
  /**
   * 誕生日 "MM-DD" 形式（例: "06-18"）。空文字なら誕生日カウントダウン非表示。
   * 実在の方の生年月日なので、公式プロフィール等で確認した正確な値を入力すること。
   */
  birthday: string;
}

export interface SourceConfig {
  group: GroupId;
  label: string;
  newsUrl: string;
  newsSelector: {
    list: string;
    title: string;
    link: string;
    date: string | null;
  };
}

export const GROUPS: Record<GroupId, GroupConfig> = {
  nogizaka46: { label: "乃木坂46", emoji: "🌸", cssClass: "nogi" },
  sakurazaka46: { label: "櫻坂46", emoji: "🌹", cssClass: "saku" },
  hinatazaka46: { label: "日向坂46", emoji: "🌻", cssClass: "hina" },
};

// 📸 メンバー画像の調整について
//   - 画像を差し替えたい  → public/avatars/ に画像を置き、avatar のファイル名を変更
//   - 顔が小さい／大きい  → imageScale を 1.0〜1.5 程度で調整（大きいほど寄る）
//   - 顔が見切れる        → imagePosition を "center top" / "50% 25%" などで調整
//   ※ コラージュ・丸アバター・カードのバッジすべてに反映されます。
//   配列の並び順がコラージュの配置になります（[0]=左の大きい枠 → 右下へ）。
export const MEMBERS: MemberConfig[] = [
  {
    id: "endo-sakura",
    name: "遠藤さくら",
    group: "nogizaka46",
    avatar: "endo-sakura.jpg",
    imageScale: 1,
    imagePosition: "center top",
    blogListUrl: "https://www.nogizaka46.com/s/n46/api/list/blog?ct=48006&rw=5",
    birthday: "", // TODO: "MM-DD" 形式で入力（例: "06-18"）
  },
  {
    id: "ikeda-teresa",
    name: "池田瑛紗",
    group: "nogizaka46",
    avatar: "ikeda-teresa.jpg",
    imageScale: 1,
    imagePosition: "center top",
    blogListUrl: "https://www.nogizaka46.com/s/n46/api/list/blog?ct=55397&rw=5",
    birthday: "", // TODO: "MM-DD" 形式で入力
  },
  {
    id: "murai-yu",
    name: "村井優",
    group: "sakurazaka46",
    avatar: "murai-yu.jpg",
    imageScale: 1,
    imagePosition: "center top",
    blogListUrl: "https://sakurazaka46.com/s/s46/diary/blog/list?ima=0000&ct=67",
    birthday: "", // TODO: "MM-DD" 形式で入力
  },
  {
    id: "ishimori-rika",
    name: "石森璃花",
    group: "sakurazaka46",
    avatar: "ishimori-rika.jpg",
    imageScale: 1,
    imagePosition: "center top",
    // ct は石森璃花のメンバーID（ブログ一覧ページから確認）
    blogListUrl: "https://sakurazaka46.com/s/s46/diary/blog/list?ima=0000&ct=59",
    birthday: "", // TODO: "MM-DD" 形式で入力
  },
  {
    id: "kosaka-nao",
    name: "小坂菜緒",
    group: "hinatazaka46",
    avatar: "kosaka-nao.jpg",
    imageScale: 1,
    imagePosition: "center top",
    blogListUrl: "https://www.hinatazaka46.com/s/official/diary/member/list?ct=14",
    birthday: "", // TODO: "MM-DD" 形式で入力
  },
];

// 各グループ公式サイトのニュース設定
export const NEWS_SOURCES: SourceConfig[] = [
  {
    group: "nogizaka46",
    label: "乃木坂46公式",
    // JSON APIで取得（最新50件）
    newsUrl: "https://www.nogizaka46.com/s/n46/api/list/news_v2?rw=50",
    newsSelector: {
      list: "",       // JSON APIのため未使用
      title: "",
      link: "",
      date: null,
    },
  },
  {
    group: "sakurazaka46",
    label: "櫻坂46公式",
    newsUrl: "https://sakurazaka46.com/s/s46/news/list",
    newsSelector: {
      list: "a[href*='/news/detail/']",
      title: ".title",
      link: "",       // 親要素がa
      date: ".date.wf-a",
    },
  },
  {
    group: "hinatazaka46",
    label: "日向坂46公式",
    newsUrl: "https://www.hinatazaka46.com/s/official/news/list",
    newsSelector: {
      list: ".p-news__list__item, li.p-news__item, .p-news-article",
      title: ".c-news__title, .p-news__text",
      link: "a",
      date: ".c-news__date, .p-news__date",
    },
  },
];

export const ALLOWED_TAGS = [
  "#チケット", "#グッズ", "#写真集", "#TV出演", "#CM", "#ライブ",
  "#握手会", "#サイン会", "#ブログ更新", "#新曲", "#MV", "#バースデー",
  "#卒業", "#加入", "#お知らせ", "#受賞", "#SNS更新", "#継続ウォッチ",
] as const;

// ============================================================
// 🎛️ チューニング可能な設定（README参照）
// ============================================================

/** 何時間以内の記事を取得するか（毎回のフェッチ時の対象範囲） */
export const FETCH_HOURS = 48;

/** news.json に保持する日数。これより古いデータは run.ts が自動削除 */
export const KEEP_DAYS = 14;

/** 各グループセクションで表示する最大記事数（page.tsx で使用） */
export const MAX_PER_GROUP = 10;

/** 最新フェッチ分を「NEW」とみなす時間窓（ms）。cron が1日1回なので6hで隣実行に誤爆しない */
export const NEW_WINDOW_MS = 6 * 60 * 60 * 1000;
