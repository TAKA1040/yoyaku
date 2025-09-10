-- 予約管理システム MVP用スキーマ
-- RLSを有効化し、サーバールートでservice roleを使用することを前提とした設計

-- 患者マスタ
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  preferred_contact text check (preferred_contact in ('email','sms','none')) default 'email',
  line_user_id text, -- 将来のLINE連携用
  created_at timestamptz default now()
);

-- スタッフマスタ
create table if not exists staffs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean default true,
  is_public boolean default true, -- 指名予約で表示するかどうか
  max_parallel int default 1 -- 同時対応可能数
);

-- 施術メニューマスタ
create table if not exists menus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_min int not null,
  description text,
  required_skills jsonb default '[]'::jsonb -- 必要なスキル（将来拡張用）
);

-- 営業時間設定
create table if not exists business_hours (
  id bigserial primary key,
  weekday int not null check (weekday between 0 and 6), -- 0:日曜, 1:月曜 ... 6:土曜
  open_time time not null,
  close_time time not null,
  is_closed boolean default false -- 定休日フラグ
);

-- スタッフの勤務スケジュール
create table if not exists staff_schedules (
  id bigserial primary key,
  staff_id uuid references staffs(id) on delete cascade,
  date date not null,
  is_off boolean default false, -- 休み
  work_start time, -- 個別の勤務開始時間（nullなら営業時間に従う）
  work_end time -- 個別の勤務終了時間（nullなら営業時間に従う）
);

-- 予約テーブル
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete set null,
  menu_id uuid references menus(id),
  staff_id uuid references staffs(id), -- nullなら自動割当
  start_ts timestamptz not null,
  end_ts timestamptz not null,
  status text check (status in ('confirmed','canceled')) default 'confirmed',
  contact_channels text[] not null default array['email'], -- 通知チャネル
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 通知ログ
create table if not exists notification_logs (
  id bigserial primary key,
  booking_id uuid references bookings(id) on delete cascade,
  channel text check (channel in ('email','sms','line')) not null,
  event text check (event in ('confirm','reminder','changed','canceled')) not null,
  sent_at timestamptz not null default now(),
  result text, -- 送信結果（成功/失敗の詳細）
  provider_msg_id text -- プロバイダーのメッセージID
);

-- インデックス作成
create index if not exists idx_bookings_start_ts on bookings(start_ts);
create index if not exists idx_bookings_staff_date on bookings(staff_id, date(start_ts));
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_staff_schedules_staff_date on staff_schedules(staff_id, date);
create index if not exists idx_business_hours_weekday on business_hours(weekday);

-- RLS（Row Level Security）を有効化
-- 直接SELECTは原則不可。サーバールートでservice role使用を前提。
alter table patients enable row level security;
alter table staffs enable row level security;
alter table menus enable row level security;
alter table business_hours enable row level security;
alter table staff_schedules enable row level security;
alter table bookings enable row level security;
alter table notification_logs enable row level security;

-- 直接アクセスを禁止するポリシー
create policy "no direct select" on patients for select using (false);
create policy "no direct select" on staffs for select using (false);
create policy "no direct select" on menus for select using (false);
create policy "no direct select" on business_hours for select using (false);
create policy "no direct select" on staff_schedules for select using (false);
create policy "no direct select" on bookings for select using (false);
create policy "no direct select" on notification_logs for select using (false);

-- 患者の予約フォームからの匿名INSERTを許可したい場合はRPC経由推奨
-- 本MVPではサーバールートがservice roleでinsert/update/deleteする設計

-- 更新日時の自動更新用関数
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- bookingsテーブルのupdated_at自動更新トリガー
create trigger bookings_updated_at
  before update on bookings
  for each row
  execute function update_updated_at();