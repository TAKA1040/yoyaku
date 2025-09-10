-- 予約管理システム MVP用初期データ
-- schema.sql実行後に実行してください

-- スタッフマスタの初期データ
insert into staffs (name, is_active, is_public, max_parallel) values
('山田', true, true, 1),
('佐藤', true, true, 1),
('鈴木', true, true, 1),
('田中', true, false, 2); -- 指名不可（管理者など）

-- 施術メニューマスタの初期データ
insert into menus (name, duration_min, description) values
('初診カウンセリング', 30, '初めての方向けのカウンセリング'),
('再診施術', 20, '2回目以降の施術'),
('歯科検診', 30, '定期検診・メンテナンス'),
('歯科治療', 45, '虫歯治療・歯石除去等'),
('整体施術', 40, '全身調整'),
('部分施術', 20, '肩・腰等の部分的な施術');

-- 営業時間設定（月〜土 9:00-18:00、日曜休み）
do $$
declare 
  d int;
begin
  for d in 0..6 loop
    insert into business_hours (weekday, open_time, close_time, is_closed)
    values (d, '09:00', '18:00', d = 0); -- 日曜(0)は休み
  end loop;
end$$;

-- 当面のシフト（全員勤務扱い、今日から2週間分）
insert into staff_schedules (staff_id, date, is_off, work_start, work_end)
select 
  s.id,
  (current_date + i) as date,
  false as is_off, -- 基本的に勤務
  null as work_start, -- 営業時間に従う
  null as work_end -- 営業時間に従う
from staffs s, 
     generate_series(0, 14) g(i)
where s.is_active = true;

-- 一部スタッフの休み設定例（日曜・祝日は全員休み扱いにしておく）
update staff_schedules 
set is_off = true 
where extract(dow from date) = 0; -- 日曜日

-- サンプル患者データ（テスト用）
insert into patients (name, email, phone, preferred_contact) values
('テスト太郎', 'test@example.com', '090-1234-5678', 'email'),
('サンプル花子', 'sample@example.com', '080-9876-5432', 'sms'),
('デモ次郎', 'demo@example.com', '070-1111-2222', 'email');

-- コメント: 実際のデータはこの後、予約フォームから患者が入力することで蓄積される