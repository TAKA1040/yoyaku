# Google ログイン + 承認フロー 簡易導入マニュアル（Next.js 15 + Supabase）

この手順書は、最小構成で「Google ログイン → プロファイル作成 → 承認待ち → 管理者承認 → 利用開始」までを再現できるようにまとめたものです。以降は、固有情報を全てプレースホルダ（仮名）で記載します。あなたの値に置き換えてください。

---

## このマニュアルの読み方（2段階方式）
- PART 1: ログインのみ（最小構成）
  - これだけで「Googleログイン → セッション確立 → 指定画面へ遷移」まで動きます。
- PART 2: 承認フロー追加
  - `profiles` テーブル/RLS/承認待ちUIの導入で「PENDING → APPROVED」を運用できます。

---

## 0. 匿名化と表記ルール
このマニュアルに登場する固有値は全てプレースホルダです。必ずあなたの環境に置き換えてください。

- YOUR_SUPABASE_URL（例: `https://your-project-id.supabase.co`）
- YOUR_SUPABASE_ANON_KEY（例: `eyJhbGciOi...<redacted>...`）
- YOUR_DOMAIN（例: `https://www.example.com`）
- YOUR_VERCEL_PROJECT（例: `your-vercel-project`）
- YOUR_PORT（例: `3002`）
- ADMIN_EMAILS / PRE_APPROVED_EMAILS（例: `admin@example.com`, `partner@example.com`）

- YOUR_LOGIN_PAGE_PATH（例: `src/app/login/page.tsx`）
- YOUR_AUTH_CALLBACK_ROUTE_PATH（例: `src/app/auth/callback/route.ts`）
- YOUR_MIDDLEWARE_PATH（例: `src/middleware.ts`）
- YOUR_SUPABASE_CLIENT_PATH（例: `src/lib/supabase/client.ts`）
- YOUR_SUPABASE_SERVER_PATH（例: `src/lib/supabase/server.ts`）
- YOUR_SUPABASE_MIDDLEWARE_PATH（例: `src/lib/supabase/middleware.ts`）
- YOUR_AUTH_ERROR_PAGE_PATH（例: `src/app/auth/auth-code-error/page.tsx`）

> 上記の「例」は理解補助です。実際のファイル名/パスは全て YOUR_*** に置換して運用してください。

---

## 1. 前提・バージョン
- Next.js: 15.x（App Router）
- React: 19.x
- Supabase: `@supabase/ssr` + `@supabase/supabase-js`
- ローカルポート: YOUR_PORT

---

## 2. Supabase 側の準備
1) プロジェクト作成（既存でも可）
2) Authentication → Providers → Google を有効化
3) Authentication → URL Configuration を設定
   - Site URL: `YOUR_DOMAIN`
   - Redirect URLs:
     - 本番: `YOUR_DOMAIN/auth/callback`
     - プレビュー: `https://YOUR_VERCEL_PROJECT.vercel.app/auth/callback`
     - 開発: `http://localhost:YOUR_PORT/auth/callback`
4) `YOUR_SUPABASE_URL` と `YOUR_SUPABASE_ANON_KEY` を取得

### 2.1 Google Cloud Console（OAuth）設定
1) Google Cloud Console → APIs & Services → Credentials
2) Create credentials → OAuth client ID → Application type: Web を選択
3) Authorized redirect URIs に以下を追加
   - `YOUR_DOMAIN/auth/callback`
   - `https://YOUR_VERCEL_PROJECT.vercel.app/auth/callback`
   - `http://localhost:YOUR_PORT/auth/callback`
4) 発行された Client ID / Client secret を Supabase → Authentication → Providers → Google に設定

---

## 3. Next.js 側の設定
### 3.0 依存関係のインストール
```bash
npm i @supabase/ssr @supabase/supabase-js
```
### 3.1 環境変数（.env.local）
プロジェクト直下に `.env.local` を作成：

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

保存後、開発サーバーを再起動（HMRで拾えない場合があります）。

### 3.2 開発サーバー起動（例: PowerShell）
```powershell
$env:PORT=YOUR_PORT
npm run dev -- --port $env:PORT
```
ポート競合（EADDRINUSE）の場合：
```powershell
netstat -ano | findstr :YOUR_PORT
# 例: PID 48552 を強制終了
# taskkill /PID 48552 /F
```

---

## 4. サーバー/クライアント分離の鉄則（重要）
- クライアント: `YOUR_SUPABASE_CLIENT_PATH` → `createBrowserClient()` を使用
- サーバー: `YOUR_SUPABASE_SERVER_PATH` → `createServerClient()` を使用
  - Next.js 15 の `cookies()` は Promise を返します。`await cookies()` の上で同期API（`get/set/delete`）を扱ってください。
- Middleware/Edge: `YOUR_SUPABASE_MIDDLEWARE_PATH` を使用（`NextRequest/NextResponse`）

---

## PART 1: Google ログインのみ（完全レシピ）

これだけ実施すれば「ログインのみ」が動作します。以下のコードはプレースホルダ前提です。

### P1-1. Supabase 側設定（再掲）
- Providers: Google を有効化
- URL Configuration に Redirect URLs（本番/プレビュー/開発）を登録

### P1-2. ログインページ（YOUR_LOGIN_PAGE_PATH）
```tsx
'use client'
import { createClient } from 'YOUR_SUPABASE_CLIENT_PATH'

export default function LoginPage() {
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center'}}>
      <button onClick={handleGoogleLogin} style={{padding:'8px 16px',background:'#2563eb',color:'#fff',borderRadius:6}}>
        Login with Google
      </button>
    </div>
  )
}
```

- 遷移先保持（任意）
  - `redirectTo` を ``${location.origin}/auth/callback?next=/your/after/login`` のように変更し、コールバック側で `next` を解釈します。

#### P1-2.1 Supabase クライアント雛形（YOUR_SUPABASE_CLIENT_PATH）
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### P1-2.2 Supabase サーバークライアント雛形（YOUR_SUPABASE_SERVER_PATH）
```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Component からの呼び出し時は無視可能（middleware で同期するため）
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // 同上
          }
        },
      },
    }
  )
}
```

### P1-3. コールバック Route（YOUR_AUTH_CALLBACK_ROUTE_PATH）
```ts
import { NextResponse } from 'next/server'
import { createClient } from 'YOUR_SUPABASE_SERVER_PATH'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const next = searchParams.get('next') ?? '/'
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

### P1-3.1 エラーページ（YOUR_AUTH_ERROR_PAGE_PATH）
```tsx
export default function AuthCodeErrorPage() {
  return (
    <div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center'}}>
      <div>
        <h1>認証に失敗しました</h1>
        <p>お手数ですが、もう一度お試しください。</p>
      </div>
    </div>
  )
}
```

### P1-4. ミドルウェア（YOUR_MIDDLEWARE_PATH）
```ts
import { createClient } from 'YOUR_SUPABASE_MIDDLEWARE_PATH'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)
  // セッションを同期（Cookie → Supabase）
  await supabase.auth.getSession()
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### P1-5. 起動と確認
- 起動: `http://localhost:YOUR_PORT/login` を開く → 「Login with Google」 → Google 認証 → `/`（または `?next=` 指定先）へ戻る
- 失敗時: 開発サーバーのログとブラウザのネットワークタブを確認（`.env.local` ミスが主因のことが多い）

---

## PART 2: 承認フロー（PENDING → APPROVED）

必要に応じて、以下を追加します。

### P2-1. profiles テーブル作成（未作成の場合）
```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  status text not null check (status in ('PENDING','APPROVED')),
  role text not null check (role in ('USER','ADMIN')),
  created_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid
);

alter table public.profiles enable row level security;
```

### P2-2. RLS ポリシー（最小運用例）
```sql
create policy "profiles_select_self_or_admin" on public.profiles
for select
using (
  id = auth.uid() OR
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'ADMIN'
  )
);

create policy "profiles_insert_self" on public.profiles
for insert
with check (id = auth.uid());

create policy "profiles_update_admin" on public.profiles
for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'ADMIN'
  )
)
with check (true);
```

> 本番では更新可能カラムを `status, role, approved_at, approved_by` に限定する等、厳格化を推奨。

### P2-3. 設定値（YOUR_auth-config.ts 等）
```ts
export const AUTH_CONFIG = {
  DEFAULT_USER_STATUS: 'PENDING' as const,
  DEFAULT_USER_ROLE: 'USER' as const,
  DEFAULT_ADMIN_ROLE: 'ADMIN' as const,
  ADMIN_EMAILS: ['admin@example.com'],
  PRE_APPROVED_EMAILS: ['partner@example.com'],
}
```

### P2-4. アクセスガード（例: APPROVED 以外は /auth/status へ）
- 任意の保護ページで、`profiles` より `id = user.id` を取得し `status !== 'APPROVED'` の場合は `/auth/status` にリダイレクト。

### P2-5. /auth/status の役割
- `profiles` 未作成なら作成（初回）
- `status === 'APPROVED'` なら利用開始先へ遷移
- `PENDING` なら承認待ち UI を表示

---

## 13. 本番移行チェックリスト
- Supabase Auth → URL Configuration
  - Site URL: `YOUR_DOMAIN`
  - Redirect URLs:
    - `YOUR_DOMAIN/auth/callback`
    - `https://YOUR_VERCEL_PROJECT.vercel.app/auth/callback`
    - `http://localhost:YOUR_PORT/auth/callback`
- Vercel 環境変数
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ドメイン/DNS
  - `YOUR_DOMAIN` が Ready、Production デプロイに Alias 割当済み
- アプリ挙動
  - コールバックは `origin` ベースのリダイレクト（必要に応じて `?next=` 方式）
  - クライアントの `redirectTo` は ``${location.origin}/auth/callback`` を使用
- DB/RLS 整合
  - 本番 Supabase に `profiles` と RLS があること
- 承認フロー設定
  - `DEFAULT_USER_STATUS`/`ADMIN_EMAILS`/`PRE_APPROVED_EMAILS` を本番値に

---

## 14. トラブルシュート（ログインのみ）
- 401/403: Supabase の Redirect URLs 未設定/誤り
- 500: `.env.local` の URL/KEY ミス、Middleware 未設定、`cookies()` の扱い誤り
- 無限リダイレクト: Middleware の `matcher` が静的配信を除外しているか

---

以上。PART 1 の手順とコードをそのまま適用すれば、このドキュメントだけで「Google ログインのみ」を即時に構築できます。必要であれば PART 2 を段階導入してください。
