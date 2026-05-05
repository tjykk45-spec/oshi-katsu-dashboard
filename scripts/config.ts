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
  blogRssUrl: string | null;
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
    // 乃木坂46 メンバーブログはAmeba: https://ameblo.jp/nogizaka46-<member>/
    blogRssUrl: "https://rssblog.ameba.jp/nogizaka46-endosakura/rss20.xml",
  },
  {
    id: "ikeda-teresa",
    name: "池田瑛紗",
    group: "nogizaka46",
    avatar: "ikeda-teresa.jpg",
    blogRssUrl: "https://rssblog.ameba.jp/nogizaka46-ikedateresa/rss20.xml",
  },
  {
    id: "murai-yu",
    name: "村井優",
    group: "sakurazaka46",
    avatar: "murai-yu.jpg",
    blogRssUrl: "https://rssblog.ameba.jp/sakurazaka46-muraiyuu/rss20.xml",
  },
  {
    id: "ishimori-rika",
    name: "石森璃花",
    group: "sakurazaka46",
    avatar: "ishimori-rika.jpg",
    blogRssUrl: "https://rssblog.ameba.jp/sakurazaka46-ishimoririka/rss20.xml",
  },
  {
    id: "kosaka-nao",
    name: "小坂菜緒",
    group: "hinatazaka46",
    avatar: "kosaka-nao.jpg",
    blogRssUrl: "https://rssblog.ameba.jp/hinatazaka46-kosakanao/rss20.xml",
  },
];

// 各グループ公式サイトのニュース一覧スクレイピング設定
export const NEWS_SOURCES: SourceConfig[] = [
  {
    group: "nogizaka46",
    label: "乃木坂46公式",
    newsUrl: "https://www.nogizaka46.com/s/n46/news/list",
    newsSelector: {
      list: ".m-news__item",
      title: ".m-news__item__text",
      link: "a",
      date: ".m-news__item__date",
    },
  },
  {
    group: "sakurazaka46",
    label: "櫻坂46公式",
    newsUrl: "https://sakurazaka46.com/s/s46/news/list",
    newsSelector: {
      list: ".news-list li",
      title: ".text",
      link: "a",
      date: ".date",
    },
  },
  {
    group: "hinatazaka46",
    label: "日向坂46公式",
    newsUrl: "https://www.hinatazaka46.com/s/official/news/list",
    newsSelector: {
      list: ".m-news__item",
      title: ".m-news__item__text",
      link: "a",
      date: ".m-news__item__date",
    },
  },
];

export const ALLOWED_TAGS = [
  "#チケット", "#グッズ", "#写真集", "#TV出演", "#CM", "#ライブ",
  "#握手会", "#サイン会", "#ブログ更新", "#新曲", "#MV", "#バースデー",
  "#卒業", "#加入", "#お知らせ", "#受賞", "#SNS更新", "#継続ウォッチ",
] as const;

export const FETCH_HOURS = 48; // 何時間以内の記事を取得するか
