import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { supabaseAdmin, BusinessHour, StaffSchedule, Booking } from './db'

dayjs.extend(utc)
dayjs.extend(timezone)

const TZ = 'Asia/Tokyo'

export interface TimeSlot {
  start: string // ISO string
  end: string   // ISO string
  staffId: string
  staffName: string
  available: boolean
}

// 営業時間チェック
export async function getBusinessHours(): Promise<BusinessHour[]> {
  const { data, error } = await supabaseAdmin
    .from('business_hours')
    .select('*')
    .order('weekday')
  
  if (error) throw error
  return data || []
}

// 指定日の営業時間を取得
export async function getBusinessHoursForDate(date: string): Promise<{ openTime: string; closeTime: string; isClosed: boolean }> {
  const weekday = dayjs(date).day() // 0=Sunday, 1=Monday, ...
  
  const { data, error } = await supabaseAdmin
    .from('business_hours')
    .select('*')
    .eq('weekday', weekday)
    .single()
  
  if (error || !data) {
    // デフォルト値
    return { openTime: '09:00', closeTime: '18:00', isClosed: true }
  }
  
  return {
    openTime: data.open_time,
    closeTime: data.close_time,
    isClosed: data.is_closed
  }
}

// スタッフの勤務スケジュール取得
export async function getStaffSchedule(staffId: string, date: string): Promise<StaffSchedule | null> {
  const { data, error } = await supabaseAdmin
    .from('staff_schedules')
    .select('*')
    .eq('staff_id', staffId)
    .eq('date', date)
    .maybeSingle()
  
  if (error) throw error
  return data
}

// 指定日・スタッフの既存予約を取得
export async function getExistingBookings(staffId: string, date: string): Promise<Booking[]> {
  const startOfDay = dayjs(date).tz(TZ).startOf('day').toISOString()
  const endOfDay = dayjs(date).tz(TZ).endOf('day').toISOString()
  
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      patient:patients(*),
      menu:menus(*),
      staff:staffs(*)
    `)
    .eq('staff_id', staffId)
    .eq('status', 'confirmed')
    .gte('start_ts', startOfDay)
    .lte('start_ts', endOfDay)
    .order('start_ts')
  
  if (error) throw error
  return data || []
}

// 時間重複チェック
export function isTimeOverlapping(
  newStart: string,
  newEnd: string,
  existingStart: string,
  existingEnd: string
): boolean {
  const newStartMs = dayjs(newStart).valueOf()
  const newEndMs = dayjs(newEnd).valueOf()
  const existingStartMs = dayjs(existingStart).valueOf()
  const existingEndMs = dayjs(existingEnd).valueOf()
  
  return newStartMs < existingEndMs && existingStartMs < newEndMs
}

// 指定日・時間の利用可能スロット生成
export async function generateAvailableSlots(
  date: string,
  durationMinutes: number,
  staffId?: string // 指名予約の場合
): Promise<TimeSlot[]> {
  const businessHours = await getBusinessHoursForDate(date)
  
  if (businessHours.isClosed) {
    return []
  }
  
  // スタッフ一覧取得（指名ありなら対象スタッフのみ）
  const staffQuery = supabaseAdmin
    .from('staffs')
    .select('*')
    .eq('is_active', true)
  
  if (staffId) {
    staffQuery.eq('id', staffId)
  } else {
    staffQuery.eq('is_public', true) // 指名可能なスタッフのみ
  }
  
  const { data: staffs, error: staffError } = await staffQuery
  if (staffError || !staffs) return []
  
  const slots: TimeSlot[] = []
  
  for (const staff of staffs) {
    // スタッフの勤務スケジュール確認
    const schedule = await getStaffSchedule(staff.id, date)
    if (schedule?.is_off) continue // 休みならスキップ
    
    // 勤務時間決定（個別設定があればそれを優先、なければ営業時間）
    const workStart = schedule?.work_start || businessHours.openTime
    const workEnd = schedule?.work_end || businessHours.closeTime
    
    // 既存予約取得
    const existingBookings = await getExistingBookings(staff.id, date)
    
    // スロット生成（30分刻み）
    const startTime = dayjs(`${date} ${workStart}`).tz(TZ)
    const endTime = dayjs(`${date} ${workEnd}`).tz(TZ)
    
    let currentTime = startTime
    while (currentTime.add(durationMinutes, 'minute').isBefore(endTime) || currentTime.add(durationMinutes, 'minute').isSame(endTime)) {
      const slotStart = currentTime.toISOString()
      const slotEnd = currentTime.add(durationMinutes, 'minute').toISOString()
      
      // 既存予約と重複チェック
      const isAvailable = !existingBookings.some(booking => 
        isTimeOverlapping(slotStart, slotEnd, booking.start_ts, booking.end_ts)
      )
      
      slots.push({
        start: slotStart,
        end: slotEnd,
        staffId: staff.id,
        staffName: staff.name,
        available: isAvailable
      })
      
      currentTime = currentTime.add(30, 'minute') // 30分刻みで生成
    }
  }
  
  return slots.sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf())
}

// 最適なスタッフ自動選択（負荷分散）
export async function findBestStaff(date: string, startTime: string, durationMinutes: number): Promise<string | null> {
  const { data: staffs, error } = await supabaseAdmin
    .from('staffs')
    .select('*')
    .eq('is_active', true)
  
  if (error || !staffs) return null
  
  const endTime = dayjs(startTime).add(durationMinutes, 'minute').toISOString()
  
  // 各スタッフの予約数カウントと可用性チェック
  const staffLoads: Array<{ staffId: string; bookingCount: number; available: boolean }> = []
  
  for (const staff of staffs) {
    // スタッフの勤務スケジュール確認
    const schedule = await getStaffSchedule(staff.id, date)
    if (schedule?.is_off) continue
    
    // 既存予約取得
    const existingBookings = await getExistingBookings(staff.id, date)
    
    // 時間重複チェック
    const hasConflict = existingBookings.some(booking =>
      isTimeOverlapping(startTime, endTime, booking.start_ts, booking.end_ts)
    )
    
    if (!hasConflict && existingBookings.length < staff.max_parallel) {
      staffLoads.push({
        staffId: staff.id,
        bookingCount: existingBookings.length,
        available: true
      })
    }
  }
  
  if (staffLoads.length === 0) return null
  
  // 予約数が最少のスタッフを選択
  staffLoads.sort((a, b) => a.bookingCount - b.bookingCount)
  return staffLoads[0].staffId
}

// フォーマット用ユーティリティ
export function formatDateTime(isoString: string): string {
  return dayjs(isoString).tz(TZ).format('YYYY年MM月DD日(ddd) HH:mm')
}

export function formatDate(isoString: string): string {
  return dayjs(isoString).tz(TZ).format('YYYY年MM月DD日(ddd)')
}

export function formatTime(isoString: string): string {
  return dayjs(isoString).tz(TZ).format('HH:mm')
}