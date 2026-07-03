# 推し活ダッシュボード

坂道46グループ（乃木坂46・櫻坂46・日向坂46）のニュース・ブログを毎朝自動収集し、Gemini で要約して GitHub Pages に静的公開する個人用ダッシュボード。セットアップ手順・環境変数・調整可能な数値は [README.md](README.md) を参照。本ファイルはコードを触る際のアーキテクチャ・SSOT・実装ルールをまとめる。

## パイプライン全体像

```
scripts/run.ts
  ├─ fetch-blog.ts / fetch-news.ts   各メンバー・グループを並列フェッチ（既存URLは除外）
  ├─ summarize.ts                    Gemini Flash で5件バッチ要約
  └─ data/news.json 保存（KEEP_DAYS 以内のみ保持、新しい順）
      ↓
app/page.tsx（サーバーコンポーネント）
  └─ data/news.json を fs で読み込み → NewsExplorer（クライアント）に全件を渡す
      ↓
components/NewsExplorer.tsx（クライアント）
  ├─ HeroCollage           推しメンバーの顔写真タップで絞り込み
  ├─ 検索・タグ絞り込み
  └─ GroupSection × 3       グループごとに「もっと見る」でページング表示
```

`.github/workflows/update-data.yml` が毎朝 JST 6:00 に `scripts/run.ts` を実行し、`data/news.json` を更新して push（`deploy.yml` が push を受けて `gh-pages` ブランチへ再デプロイ）。

## SSOT: `scripts/config.ts`

メンバー・グループ・許可タグ・チューニング定数（`FETCH_HOURS` / `KEEP_DAYS` / `MAX_PER_GROUP` / `NEW_WINDOW_MS`）はすべてここに集約。設定値のハードコードは禁止。詳細は [README.md](README.md) の「調整できる数値」表を参照。

`MemberConfig.birthday`（"MM-DD" 形式）は誕生日カウントダウン機能で使用。**実在の方の生年月日なので、公式プロフィール等で確認した正確な値を入力すること**（未入力ならその機能は非表示のまま安全に動作する）。

## 誕生日カウントダウン（`lib/birthday.ts`）

- GitHub Actions のランナーは **UTC** で動く（cron は `0 21 * * *` = UTC 21:00 = JST 翌6:00）。素朴な `new Date()` で日数計算すると実行環境依存でズレるため、`todayJst()` / `daysUntilBirthday()` は必ず JST を明示して計算する（`toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })` で ISO 順の日付文字列を得るのがポイント）
- 表示は3段階: 14日以内でバナー表示・7日以内で強調（`HeroCollage` の顔写真に🎂バッジ）・当日は特別演出

## エラー処理・構造変更検知（`fetch-news.ts` / `fetch-blog.ts` / `run.ts`）

- 各フェッチャーは「セレクタ一致件数（`rawMatched`）」を返す。**日付フィルタ後の0件**（新着なし、日常的）と**セレクタ一致自体が0件**（サイト構造変更の疑い）を区別するため
- `run.ts` は構造変更・取得失敗・要約全滅を検知しても、**取得できた分の保存（`data/news.json` 書き込み）までは必ず完遂**してから `process.exitCode = 1` を設定する（保存前に throw して他ソースの成果を捨てない）。失敗した日は GitHub Actions が赤くなるが、`needs: update` により deploy はスキップされ、サイトは前日分のまま表示され続ける
- `summarize.ts` はバッチ失敗時に60秒待って1回だけ再試行する（レート制限等の一時的失敗で記事を失わないため。`KEEP_DAYS=48時間` の窓しかなく、2日連続失敗すると記事が永久に取得できなくなる）

## クライアント/サーバー境界

`output: "export"`（静的サイト）。`app/page.tsx` はサーバーコンポーネントとして `fs.readFileSync` で `data/news.json` を読み込み、**全件（未スライス）** を `NewsExplorer`（`"use client"`）に渡す。`NewsExplorer` が import する `GroupSection` / `NewsCard` は自身に `"use client"` を付けていないが、クライアントコンポーネントから import されることで自動的にクライアントバンドルへ含まれる（Next.js の標準的な挙動。サーバー専用APIを使っていないので問題ない）。

## よくある作業

- **メンバー追加/変更**: `scripts/config.ts` の `MEMBERS` 配列（README「調整できる数値」参照）
- **タグ追加/変更**: `scripts/config.ts` の `ALLOWED_TAGS`（`summarize.ts` の Gemini スキーマにも自動反映される）
- **画像調整**: `imageScale` / `imagePosition`（README参照）
- **フィルタ・検索のUI変更**: `components/NewsExplorer.tsx` が状態管理の中心

## 禁止事項

- `scripts/config.ts` 以外のファイルで設定値をハードコードしない
- `fetch-*.ts` の構造変更検知（`rawMatched`）を削除・迂回しない
