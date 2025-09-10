# 作業開始宣言（共通ルール・最終版）

最終更新: 2025-08-20

## 0) 目的

この宣言は、**人の規律に依存しない**“自動化されたガードレール”で開発を守るための共通ルールです。
**RLS（認可）／環境分離／CI品質ゲート**を中核に、誰が入っても同品質・同セキュリティで進められることを保証します。

---

## 1) 前提・採用スタック

* 認証基盤：**Supabase Auth**（Auth.js〔旧NextAuth.js〕は**不使用**と明記）
* ホスティング：**Vercel**（Local / Preview / Production を明確運用）
* DB：Postgres（Supabase）
* 開発ツールの役割分担

  * **Windsurf**：AIネイティブIDE（企画〜実装の対話ドリブン編集） ([Windsurf][1])
  * **Cursor**：AIコードエディタ（既存コードへの強力な編集・補完） ([Cursor][2])
  * **Claude / Gemini**：LLM（設計レビュー・コード生成・説明）
  * **CLI補助**：**gcloud/Google AI Studio CLI**（GeminiをCLIから使う場合の実体として）

> 表記ゆれ禁止：Auth.js（旧NextAuth.js）/ Windsurf / Cursor / Google Cloud OAuth 2.0

---

## 2) 環境分離と変数管理

* **環境**：`Development（Local）/ Staging（Preview）/ Production` を厳密に分離。Vercelの3環境に対応。 ([Vercel][3])
* **Supabaseプロジェクト**は環境ごとに分離（例：`myapp-dev / myapp-stg / myapp-prod`）。
* **環境変数**

  * ブラウザ露出は `NEXT_PUBLIC_` のみ。
  * それ以外は **Vercel Environment Variables** に環境別で登録。ローカル同期は `vercel pull` を用いる。 ([Vercel][4])
  * `.env.example` を必須配布。

---

## 3) OAuth/リダイレクトの厳格化

* **Google Cloud OAuth 2.0**

  * `Authorized redirect URIs` は**完全一致**が必須。合致しないと `redirect_uri_mismatch`。 ([Google for Developers][5])
* **Supabase 側**

  * **SITE\_URL** は本番ドメインを固定。
  * **Redirect URLs Allow List** には

    * `http://localhost:3000/**`（ローカル）
    * `https://*-<team>.vercel.app/**`（Vercelプレビュー）等、**ワイルドカード**を活用。 ([Supabase][6])
* **運用**：Supabaseダッシュボードに表示される**Callback URL**をGCPのAuthorized redirect URIsへ**必ず**登録。実値は\*\*/docs/feature-map.md\*\*に記録。

---

## 4) 認可（Authorization）＝RLSを必須化

* **全テーブルでRLS有効**、必要なアクセスのみ**Policiesで明示許可**。 ([Supabase][7])
* **代表ポリシー（例）**

  * `profiles`：本人のみ `select/update` 可（`auth.uid() = user_id`）
  * 管理者ロール（`profiles.role = 'admin'`）には全件許可ポリシーを別途付与
* **RPC**：既定は **SECURITY INVOKER**。必要時のみ **SECURITY DEFINER**（専用スキーマ、`search_path` 明示）。 ([Supabase][8])
* **Service Role Key**：**ブラウザ厳禁**。**サーバ専用**（Nodeランタイム）でのみ使用可。Edge/クライアントへの露出禁止。

---

## 5) データベース変更管理（唯一の真実はマイグレーション）

* **唯一の変更源**：`supabase/migrations/`（手作業での本番変更を禁止）。
* **フロー**：ローカルで変更 → `supabase db diff/pull` で差分生成 → Gitで管理 → CI/CDで適用。 ([Supabase][9])

---

## 6) CI/CD と品質ゲート（**通らなければマージ不可**）

* **PRに必須のチェック**（一例：`pnpm i → typecheck → lint → unit → e2e(Playwright) → build → secrets-scan`）
* **GitHub Secret scanning & Push Protection** を有効化（人為ミスの前に**ブロック**）。 ([GitHub Docs][10])
* **Vercel Preview** 自動デプロイ。**Required checks**を満たしたPRのみProduction反映。
* **feature-map更新の強制**：`src/app/**/page.tsx` に差分があり `/docs/feature-map.md` 未更新ならCIでFail。

---

## 7) 機能レジストリ & 作業記録

* **機能レジストリ**：`/docs/feature-map.md`（Notion貼り付けOKの表形式）

  * 追加＝**1行追加**、変更＝**状態/コミットID更新**、削除＝**行削除＋skip-logへ理由**。
* **JSON版（任意）**：`/docs/feature-registry.json`

  * “ツール自動追記”は前提にせず、**CIでコード注釈から生成**する方式に寄せる（現実的運用）。
* **作業記録**：`/docs/skip-log.md` に **日時/ツール/変更/確認/コミット** を最小で追記。

---

## 8) 秘密情報・漏洩対策（多層防御）

* **pre-commit**：`gitleaks` 等で秘密スキャン（ローカル段階）。 ([GitHub][11], [Pre-commit][12], [Medium][13])
* **CI段階**：同スキャンを再実行（取りこぼし防止）。
* **.gitignore** は秘密系の**二重除外**を維持（ログ/ビルド生成物/`.vercel/` 等）。
* **ビルド成果物**へ鍵・トークンを含めないこと。

---

## 9) コーディング/運用の実務ルール

* **非破壊原則**：新機能は既存を壊さない。削除/置換は**理由をskip-log**へ。
* **共通CSS**：最小の共通スタイルで**差分に強い**設計。
* **型整備**：（任意）`supabase gen types typescript` をCIで同期。
* **バージョン固定**：`.nvmrc` / `packageManager` / `engines` を明示。
* **モニタリング**：Sentry/Log 連携（Auth失敗・RLS拒否を可視化）。

---

## 10) OAuth 実値の記録ルール

* **本番 SITE\_URL**：固定値を `feature-map.md` に記録。
* **Allow List**：`localhost:3000/**` と `https://*-<team>.vercel.app/**` を登録（必要に応じて追加）。 ([Supabase][6])
* **GCP Authorized redirect URIs**：Supabase記載の**Callback URL**を**完全一致**で登録。 ([Google for Developers][5])

---

## 付録A：実装時の提示ルール

* 生成コードは**ファイルパス**と**目的**を先頭に明記。
* `package.json` 変更は**差分＋理由**を必ず記述。
* 完了報告は\*\*動作確認手順（コマンド／確認ポイント）\*\*を添付。

---

## 付録B：最短チェックリスト（貼って運用OK）

* [ ] **RLS**：全テーブル有効／ポリシーSQLはmigrationsに格納。 ([Supabase][7])
* [ ] **環境**：Dev/Preview/Prod分離・Vercel変数設定済・`vercel pull` 同期。 ([Vercel][3])
* [ ] **OAuth**：SITE\_URL固定・Allow List（localhost/プレビュー）・GCPは**完全一致**。 ([Supabase][6], [Google for Developers][5])
* [ ] **CI**：typecheck/lint/test/e2e/build/secrets-scan をPR必須。 ([GitHub Docs][10])
* [ ] **レジストリ**：`feature-map.md` 更新／未更新ならCIでFail。

