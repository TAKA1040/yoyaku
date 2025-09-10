import { createClient } from '@supabase/supabase-js'

// 環境変数を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// サーバーサイド専用クライアント（service role使用）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// フロントエンド用クライアント（anon key使用）
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 型定義
export interface Patient {
  id: string
  name: string
  email?: string
  phone?: string
  preferred_contact: 'email' | 'sms' | 'none'
  line_user_id?: string
  created_at: string
}

export interface Staff {
  id: string
  name: string
  is_active: boolean
  is_public: boolean
  max_parallel: number
}

export interface Menu {
  id: string
  name: string
  duration_min: number
  description?: string
  required_skills: string[]
}

export interface BusinessHour {
  id: number
  weekday: number
  open_time: string
  close_time: string
  is_closed: boolean
}

export interface StaffSchedule {
  id: number
  staff_id: string
  date: string
  is_off: boolean
  work_start?: string
  work_end?: string
}

export interface Booking {
  id: string
  patient_id?: string
  menu_id: string
  staff_id: string
  start_ts: string
  end_ts: string
  status: 'confirmed' | 'canceled'
  contact_channels: string[]
  created_at: string
  updated_at: string
  // リレーション
  patient?: Patient
  menu?: Menu
  staff?: Staff
}

export interface NotificationLog {
  id: number
  booking_id: string
  channel: 'email' | 'sms' | 'line'
  event: 'confirm' | 'reminder' | 'changed' | 'canceled'
  sent_at: string
  result?: string
  provider_msg_id?: string
}