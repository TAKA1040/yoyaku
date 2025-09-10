# 予約管理システム MVP

整骨院・歯科向けのシンプルな予約管理システムです。

## 🚀 特徴

- **患者向け**: オンライン予約フォーム（スマホ対応）
- **スタッフ向け**: 管理画面（カレンダー表示・予約一覧）
- **通知機能**: メール・SMS対応（Resend + Twilio）
- **セキュリティ**: Cloudflare Turnstile（BOT対策）
- **将来拡張**: LINE連携対応予定

## 📁 プロジェクト構成

```
yoyaku/
├── app/
│   ├── (public)/
│   │   ├── booking/        # 患者向け予約画面
│   │   └── manage/         # スタッフ向け管理画面
│   ├── api/
│   │   ├── book/           # 予約API
│   │   ├── data/           # データ取得API
│   │   └── cron/           # リマインダー送信
│   ├── cancel/             # キャンセル画面
│   └── reschedule/         # 日時変更画面
├── components/
│   ├── ui/                 # shadcn/ui コンポーネント
│   ├── BookingForm.tsx     # 予約フォーム
│   ├── CalendarLite.tsx    # カレンダー表示
│   └── AdminList.tsx       # 予約一覧
├── lib/
│   ├── db.ts               # Supabase クライアント
│   ├── time.ts             # 時間・スロット管理
│   ├── mailer.ts           # メール送信
│   ├── sms.ts              # SMS送信
│   ├── notifications.ts    # 通知管理
│   ├── sign.ts             # マジックリンク生成
│   └── validation.ts       # バリデーション
├── sql/
│   ├── schema.sql          # DBスキーマ
│   └── seed.sql            # 初期データ
└── .env.local              # 環境変数
```

## 🛠️ セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
# または
pnpm install
```

### 2. 環境変数の設定

`.env.local.example` を `.env.local` にコピーして設定

```bash
cp .env.local.example .env.local
```

**ローカル開発の場合（Supabase未設定）:**
```env
# アプリケーション設定
NEXT_PUBLIC_APP_NAME="デモクリニック"
NEXT_PUBLIC_APP_BASE_URL="http://localhost:3000"

# ダミー値でOK（開発時はコンソール出力）
TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
RESEND_API_KEY="dummy-resend-key"
TWILIO_ACCOUNT_SID="dummy-twilio-sid"
MAGIC_LINK_SECRET="local-development-secret"
```

### 3. Supabaseの設定（本格運用時）

1. [Supabase](https://supabase.com) でプロジェクト作成
2. SQLエディタで以下を実行:
   ```sql
   -- sql/schema.sql の内容をコピー&実行
   -- sql/seed.sql の内容をコピー&実行
   ```
3. 環境変数を更新:
   ```env
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

### 4. 開発サーバーの起動

```bash
npm run dev
# または
pnpm dev
```

http://localhost:3000 でアクセス

## 🧪 テスト手順

### 基本動作テスト

1. **トップページ**: http://localhost:3000
   - 患者向け・スタッフ向けリンクが表示される

2. **予約フォーム**: http://localhost:3000/booking
   - ステップ1: 日付選択
   - ステップ2: メニュー選択  
   - ステップ3: 時間選択
   - ステップ4: 連絡先入力
   - 予約完了後、コンソールにメール/SMS内容が出力される

3. **管理画面**: http://localhost:3000/manage
   - カレンダー表示で予約確認
   - リスト表示で検索・フィルタ
   - 予約詳細の確認

4. **リマインダー送信テスト**:
   ```bash
   curl -X POST http://localhost:3000/api/cron/reminder \
     -H "Content-Type: application/json"
   ```

### API テスト

**予約作成**:
```bash
curl -X POST http://localhost:3000/api/book \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テスト太郎",
    "email": "test@example.com",
    "menu_id": "menu-uuid",
    "startISO": "2025-09-10T14:00:00+09:00",
    "contact_channels": ["email"],
    "turnstileToken": "dummy-token"
  }'
```

**データ取得**:
```bash
# メニュー一覧
curl http://localhost:3000/api/data?type=menus

# スタッフ一覧
curl http://localhost:3000/api/data?type=staffs

# 利用可能スロット
curl "http://localhost:3000/api/data?type=slots&date=2025-09-10&menu_id=menu-uuid"
```

## 📧 通知設定（本番環境）

### Resend設定
1. [Resend](https://resend.com) でアカウント作成
2. API keyを取得
3. 環境変数に設定:
   ```env
   RESEND_API_KEY="re_xxxxxxxxxx"
   EMAIL_FROM="noreply@yourdomain.com"
   ```

### Twilio設定
1. [Twilio](https://twilio.com) でアカウント作成  
2. 電話番号を取得
3. 認証情報を設定:
   ```env
   TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxx"
   TWILIO_AUTH_TOKEN="xxxxxxxxxxxxxxx"
   TWILIO_FROM_NUMBER="+819012345678"
   ```

### Cloudflare Turnstile設定
1. [Cloudflare](https://cloudflare.com) でTurnstileを設定
2. サイトキーとシークレットキーを取得:
   ```env
   NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4AAAAAAA..."
   TURNSTILE_SECRET_KEY="0x4AAAAAAA..."
   ```

## 🚀 デプロイメント

### Vercel デプロイ
```bash
# Vercel CLIインストール
npm i -g vercel

# プロジェクトをVercelにデプロイ
vercel

# 環境変数を設定
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... その他の環境変数
```

### Vercel Cron設定
`vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/reminder",
      "schedule": "0 19 * * *"
    }
  ]
}
```

## 🔧 カスタマイズ

### 営業時間の変更
`sql/seed.sql` の `business_hours` テーブルを修正

### メニューの追加
管理画面から追加、または `sql/seed.sql` を修正

### スタッフの追加  
`sql/seed.sql` の `staffs` テーブルを修正

### 通知テンプレートのカスタマイズ
`lib/mailer.ts` と `lib/sms.ts` を修正

## 📝 今後の拡張予定

- LINE PROLINE連携
- Googleカレンダー同期
- 決済機能（Stripe連携）
- 複数店舗対応
- スタッフ認証機能
- 詳細な分析・レポート機能

## 🆘 トラブルシューティング

### よくある問題

**1. 依存関係のエラー**
```bash
rm -rf node_modules package-lock.json
npm install
```

**2. データベース接続エラー**
- `.env.local` の `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` を確認
- Supabaseプロジェクトのステータスを確認

**3. 通知が送信されない**
- 開発環境では通知はコンソールに出力されます
- 本番環境では各プロバイダーのAPI設定を確認

**4. 予約が作成できない**
- ブラウザの開発者ツールでネットワークエラーを確認
- API レスポンスのエラーメッセージを確認

### ログの確認
```bash
# 開発サーバーのログを確認
npm run dev

# Vercel のログを確認（本番環境）
vercel logs
```

## 📄 ライセンス

MIT License

## 🤝 サポート

問題が発生した場合は、以下を確認してください:

1. このREADMEのトラブルシューティング
2. プロジェクトのIssuesページ
3. ブラウザの開発者ツールのコンソールエラー
4. サーバーログの内容