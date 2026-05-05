# 推し活ダッシュボード

坂道46グループ（乃木坂46・櫻坂46・日向坂46）の推しメンバー情報を毎朝自動収集してWeb表示する、個人用ダッシュボードです。

🔗 公開URL: https://tjykk45-spec.github.io/oshi-katsu-dashboard/

---

## 🎛️ 調整できる数値（設定の場所）

すべての主要パラメータは **`scripts/config.ts`** に集約されています。

| 設定 | 変数名 | 場所 | デフォルト | 役割 |
|---|---|---|---|---|
| 取得対象期間 | `FETCH_HOURS` | `scripts/config.ts` | `48` (時間) | 何時間以内の記事を取得するか |
| 保持期間 | `KEEP_DAYS` | `scripts/config.ts` | `14` (日) | `data/news.json` に何日分保持するか |
| 各グループの表示上限 | `MAX_PER_GROUP` | `scripts/config.ts` | `10` (件) | 1グループあたり最大何件表示するか |
| 監視対象メンバー | `MEMBERS` | `scripts/config.ts` | (5名) | 追加・変更したい場合 |
| 許可タグ | `ALLOWED_TAGS` | `scripts/config.ts` | (18種) | AIが付与するタグの候補 |
| 自動実行時刻 | `cron` | `.github/workflows/update-data.yml` | `0 21 * * *` (UTC=JST 06:00) | 毎日のフェッチ時刻 |

### 調整例

**「保持期間を7日にしたい」**
→ `scripts/config.ts` の `KEEP_DAYS = 14` を `KEEP_DAYS = 7` に変更

**「各グループ5件まで表示にしたい」**
→ `scripts/config.ts` の `MAX_PER_GROUP = 10` を `MAX_PER_GROUP = 5` に変更

変更後はビルド & デプロイが必要です（下記コマンド参照）。

---

## 🚀 デプロイ手順

### ローカルで開発・データ取得

```bash
# 依存関係インストール
npm install

# .env を作成（GEMINI_API_KEY を記入）
cp .env.example .env

# データ取得（公式サイト → AI要約 → news.json 更新）
npx tsx scripts/run.ts

# 開発サーバー起動
npm run dev   # → http://localhost:3000
```

### GitHub Pages に手動デプロイ

```bash
npm run build                          # out/ にビルド成果物が生成される
npx gh-pages -d out -t -m "deploy"     # gh-pages ブランチに push
```

### 自動更新（GitHub Actions）

- ファイル: `.github/workflows/update-data.yml`
- 動作: 毎日JST 06:00 に発火 → 公式サイトをフェッチ → Gemini要約 → `data/news.json` を更新 → main にコミット
- 手動実行: GitHub Actions タブの「Update News Data & Deploy」→「Run workflow」

---

## 📁 プロジェクト構造

```
oshi-katsu-dashboard/
├── app/page.tsx                    # メインページ（サーバーコンポーネント）
├── components/
│   ├── GroupSection.tsx            # グループ別セクション
│   ├── NewsCard.tsx                # 記事カード（アコーディオン）
│   └── PetalCanvas.tsx             # 桜の花びらアニメーション
├── scripts/
│   ├── config.ts                   # 🎛️ 設定の集約 (SSOT)
│   ├── schema.ts                   # Zod スキーマ
│   ├── fetch-blog.ts               # 各メンバーの公式ブログ取得
│   ├── fetch-news.ts               # 各グループの公式ニュース取得
│   ├── summarize.ts                # Gemini AI 要約
│   ├── run.ts                      # メインオーケストレーター
│   └── errors.ts                   # UserFacingError
├── data/news.json                  # 🤖 自動生成データ（最新N日分）
├── public/avatars/                 # メンバー画像
└── .github/workflows/update-data.yml  # 自動更新ワークフロー
```

---

## 🔑 必要な環境変数

| 変数名 | 用途 | 取得方法 |
|---|---|---|
| `GEMINI_API_KEY` | AI要約 | https://aistudio.google.com/app/apikey |

GitHub Actions で動かす場合は **Settings → Secrets and variables → Actions** に `GEMINI_API_KEY` を追加。

---

## 💰 コスト

- データ取得: 公式サイトのスクレイピング → **無料**
- AI要約: Gemini Flash の無料枠（1,500リクエスト/日）→ **無料**
- ホスティング: GitHub Pages → **無料**

合計 **¥0/月** で運用できます。

---

## 🛠 既知の制約

- 櫻坂46・日向坂46 のブログ一覧は `ct` パラメータがサーバー側で効かないため、HTMLテキストにメンバー名が含まれているかどうかでフィルターしています。サイト構造が変わると壊れる可能性があります。
- Gemini無料枠は **1日5RPM**。一度に大量の記事が取れた場合、5件×1コールのバッチ処理でレート制限を回避していますが、それでも超過した場合は一部記事の要約が失われます（次の日に取得し直されます）。
