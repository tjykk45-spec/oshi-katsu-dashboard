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
  avatar: string; // public/avatars/ のファイル名
  blogListUrl: string | null; // ブログ一覧ページURL
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

export const MEMBERS: MemberConfig[] = [
  {
    id: "endo-sakura",
    name: "遠藤さくら",
    group: "nogizaka46",
    avatar: "endo-sakura.jpg",
    blogListUrl: "https://www.nogizaka46.com/s/n46/api/list/blog?ct=48006&rw=5",
  },
  {
    id: "ikeda-teresa",
    name: "池田瑛紗",
    group: "nogizaka46",
    avatar: "ikeda-teresa.jpg",
    blogListUrl: "https://www.nogizaka46.com/s/n46/api/list/blog?ct=55397&rw=5",
  },
  {
    id: "murai-yu",
    name: "村井優",
    group: "sakurazaka46",
    avatar: "murai-yu.jpg",
    blogListUrl: "https://sakurazaka46.com/s/s46/diary/blog/list?ima=0000&ct=67",
  },
  {
    id: "ishimori-rika",
    name: "石森璃花",
    group: "sakurazaka46",
    avatar: "ishimori-rika.jpg",
    // ct は石森璃花のメンバーID（ブログ一覧ページから確認）
    blogListUrl: "https://sakurazaka46.com/s/s46/diary/blog/list?ima=0000&ct=59",
  },
  {
    id: "kosaka-nao",
    name: "小坂菜緒",
    group: "hinatazaka46",
    avatar: "kosaka-nao.jpg",
    blogListUrl: "https://www.hinatazaka46.com/s/official/diary/member/list?ct=14",
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

export const FETCH_HOURS = 48; // 何時間以内の記事を取得するか
