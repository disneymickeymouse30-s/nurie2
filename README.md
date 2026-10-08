# Coloria（コロリア）

> 見るだけだった写真を、自分だけのアートに。

スマートフォンで快適に使える「大人の塗り絵」Web アプリです。
用意された塗り絵を塗るだけでなく、**自分の写真をアップロードして、その場で塗り絵に変換**できます。

現在は **Phase 1（MVP）** が完成しています。登録なし・サーバーなしで、ブラウザだけで動きます。

## できること（Phase 1）

| 機能 | 内容 |
| --- | --- |
| ホーム | 今日の1枚（デイリーチャレンジ・連続日数）、メインメニュー、続きから、人気の塗り絵 |
| 塗り絵一覧 | オリジナル線画 25 種類。人気・新着・動物・花・風景・建物・食べ物・ファンタジー・和風・幾何学・マンダラ・癒やし・高難易度・お気に入りで絞り込み、検索 |
| 塗り絵詳細 | 難易度★5段階、所要時間の目安、お気に入り、続きから／新しく塗る |
| エディター | タップで塗りつぶし、ブラシ（細・中・太、はみ出し防止つき）、消しゴム、移動、ピンチズーム、ダブルタップズーム、Undo / Redo（最大60操作） |
| カラー | パステル・ベーシック・ビビッド・アース・モノトーン・和色・自然、テーマ（夕暮れ・森林・春・和風・幻想的）、最近使った色、この作品に合う色、HEX / RGB 入力のカラーピッカー、自分で作った色の保存 |
| 自動保存 | 塗るたびに自動保存（「保存済み・3分前」を表示）。アプリを閉じる・切り替える時にも保存 |
| 写真から作る | カメラ／アルバムから JPG・PNG・WEBP（20MB まで）。やさしい／スタンダード／精密／アート／マンダラ風、線の細かさ・太さ・密度・背景・被写体を調整。元の写真と見比べてから開始 |
| 完成 | 完成作品、使った色、制作時間、使用した塗り絵、完成日時、色づかいへのひとこと |
| 保存・共有 | PNG / JPG 書き出し、スマホの共有シート（LINE・X・Instagram など）、「Created with Coloria」ウォーターマークの ON/OFF |
| マイギャラリー | 制作中・完成・お気に入り・自分で作った塗り絵 |
| マイページ | 作品数・完成数・お気に入り・連続日数、最近使った色、最近の作品、設定 |
| PWA | ホーム画面に追加、オフラインでも起動・塗り続けられる |
| AIで作る | 入口と画面のみ（Phase 2 でサーバー側 AI をつなぐ） |

## はじめかた

```bash
npm install
npm run dev        # http://localhost:5173 （--host 付きなので同じ Wi-Fi のスマホからも開ける）
npm test           # 塗りつぶし・線画変換のユニットテスト
npm run build      # dist/ に静的ファイルを出力
npm run preview    # ビルド結果を確認
```

### GitHub Pages で公開する

1. GitHub に新しいリポジトリ（例: `coloria`）を作り、このフォルダの中身を push する
2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする
3. `main` に push するたびに `.github/workflows/deploy.yml` がテスト・ビルドして自動公開
4. `https://<ユーザー名>.github.io/coloria/` をスマホで開き、共有メニューから「ホーム画面に追加」するとアプリとして使えます

`dist/` は静的ファイルだけなので、GitHub Pages・Netlify・Vercel・Cloudflare Pages などにそのまま置けます。
PWA（Service Worker）は HTTPS 配信時に有効になります。

### スマホでの通しテスト（任意）

```bash
pip install playwright && python3 -m playwright install chromium
npm run build && npx vite preview --port 4173 &
python3 scripts/e2e.py      # 390×844 のスマホ表示で、基本フローと写真フローを自動操作して out/shots/ に保存
```

## 技術構成

- **Vite + React 19 + TypeScript + Tailwind CSS v4**
- 描画: HTML Canvas 2D（着色レイヤー＋線画レイヤーを乗算合成、CSS transform でズーム／パン）
- 写真→線画変換: Web Worker で実行（UI が固まらない）
- 保存: IndexedDB（作品・画像）＋ localStorage（設定・最近使った色など）

### Next.js ではなく Vite にした理由

仕様の「最もシンプルで保守しやすい方法を選ぶ」に従い、Phase 1 はサーバーを持たない静的アプリにしました。
写真変換を端末内で行うので **API キーがそもそも存在せず、写真も外部に送られません**。
オフライン動作・無料ホスティングとも相性が良く、10 秒で塗り始められる軽さを優先しています。
Phase 2 で AI 変換・ログイン・クラウド保存を足すときは、Next.js（Route Handlers）か Supabase Edge Functions を
API 層として追加し、フロントはこのまま使えます（`docs/api.md`）。

## フォルダ構成

```
src/
  types.ts                 データモデル（User / ColoringPage / Artwork / ColorPalette / Favorite）
  data/
    samplePages.ts         オリジナル線画 25 種（コードで描いた SVG）とカテゴリー
    palettes.ts            カラーパレット
  editor/
    ColoringEngine.ts      エディターの中核（ジェスチャー・塗りつぶし・ブラシ・ズーム）
    History.ts             差分方式の Undo / Redo
    PaletteSheet.tsx       色選びシート
  lib/
    floodFill.ts           線画ベースの塗りつぶし（隙間ふさぎ・アンチエイリアス対応・白フチ防止）
    lineArt.ts             写真→線画変換（面分割＋XDoG）。DOM 非依存
    lineArt.worker.ts      変換を Worker で実行
    coloringProvider.ts    ImageToColoringProvider（AI サービス差し替え口）とマンダラ装飾
    image.ts               画像の検証（MIME＋マジックナンバー＋サイズ）、縮小、EXIF 除去
    export.ts              書き出し・共有・ウォーターマーク
    suggestColors.ts       「この作品に合う色」
    artworkComment.ts      完成作品へのポジティブなひとこと
    router.ts              ハッシュルーター
  store/
    db.ts                  IndexedDB リポジトリ
    artworks.ts            作品の作成・一覧フック
    settings.ts            設定・お気に入り・連続日数
  pages/                   各画面
  components/              共通 UI
docs/
  schema.sql               Supabase 用のテーブル定義と RLS
  api.md                   Phase 2 の API 仕様
scripts/
  e2e.py                   スマホ表示の通しテスト
  dump-samples.ts          サンプル線画を SVG ファイルに書き出す
```

## しくみのポイント

**塗りつぶし**: 塗る範囲は「いまの着色」ではなく「線画」だけで決めます。輝度しきい値でアンチエイリアスの灰色も線として扱い、
線マスクを 1px 膨らませてから領域を求めることで、線の小さな途切れから色が漏れないようにしています。
求めた領域は線の下まで少し広げ、線と色の間に白いフチが残らないようにしています。

**ブラシのはみ出し防止**: ストロークの開始地点の領域をマスクにして、その中だけに描きます（設定で OFF にできます）。

**Undo / Redo**: 画面全体ではなく変化した矩形だけを保存する差分方式。最大 60 操作、合計約 160MB を上限に古いものから捨てます。

**ジェスチャー**: 塗りつぶし・移動ツールでは 1 本指ドラッグでパン、ブラシでは 1 本指で描画。どのツールでも 2 本指でピンチ／パン、
ダブルタップで拡大／全体表示。2 本目の指が触れた瞬間に描きかけの線を取り消すので、ズームのつもりが線を引いてしまうことがありません。

## セキュリティ（Phase 1 で実装済み）

- 写真は端末内で変換し、外部に送信しない（API キー不要）
- アップロード時に拡張子・MIME だけでなく先頭バイトで JPG / PNG / WEBP を判定、20MB 上限
- Canvas で再エンコードして保存するため EXIF（位置情報など）が残らない
- 元写真と線画は別々に保存
- ユーザー入力を HTML として描画しない（React のエスケープに任せ、`dangerouslySetInnerHTML` 不使用）
- 権利のある写真だけを使う旨の確認をアップロード前に表示

Phase 2 でサーバーを足す際の CSRF・Rate Limit・RLS・Storage のアクセス制御は `docs/api.md` と `docs/schema.sql` にまとめています。

## 次のステップ

- **Phase 2**: AI 写真→塗り絵／AI プロンプト→塗り絵（`ImageToColoringProvider` のサーバー実装）、ログイン（Google・Apple・メール）とクラウド保存、環境音
- **Phase 3**: 作品の公開・いいね・コメント、ランキング、コンテスト、バッジ、プレミアム、印刷サービス

## ライセンスと素材

収録している塗り絵はすべて本プロジェクトのオリジナル線画（`src/data/samplePages.ts` のコードで生成）です。
