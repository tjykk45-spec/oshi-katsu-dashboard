import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "推し活ニュース ✦ 坂道46",
  description: "遠藤さくら・池田瑛紗・村井優・石森璃花・小坂菜緒の最新情報",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "推し活ニュース",
  },
};

export const viewport: Viewport = {
  themeColor: "#c084fc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Shippori+Mincho:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        {/* PWA / ホーム画面アイコン（相対パス：GitHub Pages サブディレクトリ対応） */}
        <link rel="icon" type="image/svg+xml" href="icon.svg" />
        <link rel="apple-touch-icon" href="apple-touch-icon.png" />
        <link rel="manifest" href="manifest.webmanifest" />
      </head>
      <body>{children}</body>
    </html>
  );
}
