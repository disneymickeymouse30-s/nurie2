# API 仕様（Phase 2 で追加予定）

Phase 1 はサーバーなしで動きます（写真→線画変換は端末内、保存は IndexedDB）。
AI 変換やクラウド保存を追加するときは、以下のエンドポイントをサーバー側（Next.js Route Handlers 等）に用意し、
クライアントは `src/lib/coloringProvider.ts` の `ImageToColoringProvider` 実装を差し替えるだけで対応できます。

**AI の API キーは必ずサーバーの環境変数に置き、ブラウザへ渡しません。**

## 共通

- 認証: Supabase のセッション（Cookie）。未ログインは 401
- CSRF: Cookie 認証のため、`Origin` ヘッダー検証＋ `SameSite=Lax` Cookie
- Rate Limit: ユーザー単位・IP 単位（例: 1分あたり 10 リクエスト）。超過時は 429
- エラー応答: `{ "error": { "code": "RATE_LIMITED", "message": "少し時間をおいてお試しください" } }`
  （`message` はそのまま画面に出せる日本語。技術的な詳細はログにのみ記録）

## POST /api/coloring/photo

写真から塗り絵を作る。

- リクエスト: `multipart/form-data`
  - `image`: JPG / PNG / WEBP、20MB 以下（サーバーでもマジックナンバーとサイズを再検証、デコードして再エンコード＝EXIF 除去）
  - `options`: JSON（`ConvertOptions`：style, detail, thickness, background, subject, density）
- レスポンス: `{ "lineArtUrl": "...", "originalUrl": "...", "pageId": "..." }`
- 制限: 無料プランは月 `AI_FREE_MONTHLY_LIMIT` 回（`ai_usage` で判定）

## POST /api/coloring/prompt

文章から塗り絵を作る。

- リクエスト: `{ "prompt": "桜の木の下で猫が昼寝している" }`（200 文字まで）
- サーバー側でプロンプトに「白黒・線画・塗り絵用・影なし」の指示を必ず付与する
- 不適切な内容はモデレーションで拒否（`code: "PROMPT_REJECTED"`）

## 作品の同期（クラウド保存）

| メソッド | パス | 内容 |
| --- | --- | --- |
| GET | /api/artworks | 自分の作品一覧（更新日時の降順） |
| PUT | /api/artworks/:id | 作品メタデータの保存 |
| POST | /api/artworks/:id/upload-url | 着色レイヤー・完成画像をアップロードする署名付き URL を発行 |
| DELETE | /api/artworks/:id | 作品の削除（Storage の画像も削除） |
