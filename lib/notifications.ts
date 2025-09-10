import { supabaseAdmin, Booking } from './db'
import { sendConfirmationEmail, sendReminderEmail, sendCancellationEmail, EmailData } from './mailer'
import { sendConfirmationSMS, sendReminderSMS, sendCancellationSMS, SMSData } from './sms'

// 送信チャネル抽象化インターフェース
export interface NotificationResult {
  success: boolean
  messageId?: string
  error?: string
  channel: 'email' | 'sms' | 'line'
  event: 'confirm' | 'reminder' | 'changed' | 'canceled'
}

// 通知送信の統一インターフェース
export interface Notifier {
  sendConfirm(bookingId: string): Promise<NotificationResult[]>
  sendReminder(bookingId: string): Promise<NotificationResult[]>
  sendCanceled(bookingId: string): Promise<NotificationResult[]>
  sendChanged(bookingId: string, oldData: any, newData: any): Promise<NotificationResult[]>
}

// 予約データ取得（通知送信用）
async function getBookingNotificationData(bookingId: string): Promise<{
  booking: Booking
  emailData: EmailData
  smsData: SMSData
} | null> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not available')
    return null
  }
  
  const { data: booking, error } = await (supabaseAdmin as any)
    .from('bookings')
    .select(`
      *,
      patient:patients(*),
      menu:menus(*),
      staff:staffs(*)
    `)
    .eq('id', bookingId)
    .single()
  
  if (error || !booking || !booking.patient) {
    console.error('Booking not found or invalid:', error)
    return null
  }
  
  const emailData: EmailData = {
    to: booking.patient.email || '',
    patientName: booking.patient.name,
    bookingId: booking.id,
    menuName: booking.menu?.name || '施術',
    staffName: booking.staff?.name || 'スタッフ',
    startTime: booking.start_ts,
    endTime: booking.end_ts
  }
  
  const smsData: SMSData = {
    to: booking.patient.phone || '',
    patientName: booking.patient.name,
    bookingId: booking.id,
    menuName: booking.menu?.name || '施術',
    staffName: booking.staff?.name || 'スタッフ',
    startTime: booking.start_ts,
    endTime: booking.end_ts
  }
  
  return { booking, emailData, smsData }
}

// 通知ログ記録
async function logNotification(
  bookingId: string,
  channel: 'email' | 'sms' | 'line',
  event: 'confirm' | 'reminder' | 'changed' | 'canceled',
  result: { success: boolean; messageId?: string; error?: string }
): Promise<void> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not available for logging')
    return
  }
  
  try {
    await (supabaseAdmin as any)
      .from('notification_logs')
      .insert({
        booking_id: bookingId,
        channel,
        event,
        result: result.success ? 'success' : `error: ${result.error}`,
        provider_msg_id: result.messageId
      })
  } catch (error) {
    console.error('Failed to log notification:', error)
  }
}

// メイン通知送信クラス
export class NotificationService implements Notifier {
  
  // 予約確定通知
  async sendConfirm(bookingId: string): Promise<NotificationResult[]> {
    const data = await getBookingNotificationData(bookingId)
    if (!data) return []
    
    const { booking, emailData, smsData } = data
    const results: NotificationResult[] = []
    const channels = booking.contact_channels || ['email']
    
    // メール送信（contact_channelsに'email'が含まれる場合）
    if (channels.includes('email') && emailData.to) {
      const emailResult = await sendConfirmationEmail(emailData)
      const result: NotificationResult = {
        ...emailResult,
        channel: 'email',
        event: 'confirm'
      }
      results.push(result)
      await logNotification(bookingId, 'email', 'confirm', emailResult)
    }
    
    // SMS送信（contact_channelsに'sms'が含まれる場合）
    if (channels.includes('sms') && smsData.to) {
      const smsResult = await sendConfirmationSMS(smsData)
      const result: NotificationResult = {
        ...smsResult,
        channel: 'sms',
        event: 'confirm'
      }
      results.push(result)
      await logNotification(bookingId, 'sms', 'confirm', smsResult)
    }
    
    return results
  }
  
  // 前日リマインダー通知
  async sendReminder(bookingId: string): Promise<NotificationResult[]> {
    const data = await getBookingNotificationData(bookingId)
    if (!data) return []
    
    const { booking, emailData, smsData } = data
    const results: NotificationResult[] = []
    const channels = booking.contact_channels || ['email']
    
    // メール送信
    if (channels.includes('email') && emailData.to) {
      const emailResult = await sendReminderEmail(emailData)
      const result: NotificationResult = {
        ...emailResult,
        channel: 'email',
        event: 'reminder'
      }
      results.push(result)
      await logNotification(bookingId, 'email', 'reminder', emailResult)
    }
    
    // SMS送信
    if (channels.includes('sms') && smsData.to) {
      const smsResult = await sendReminderSMS(smsData)
      const result: NotificationResult = {
        ...smsResult,
        channel: 'sms',
        event: 'reminder'
      }
      results.push(result)
      await logNotification(bookingId, 'sms', 'reminder', smsResult)
    }
    
    return results
  }
  
  // キャンセル通知
  async sendCanceled(bookingId: string): Promise<NotificationResult[]> {
    const data = await getBookingNotificationData(bookingId)
    if (!data) return []
    
    const { booking, emailData, smsData } = data
    const results: NotificationResult[] = []
    const channels = booking.contact_channels || ['email']
    
    // メール送信
    if (channels.includes('email') && emailData.to) {
      const emailResult = await sendCancellationEmail(emailData)
      const result: NotificationResult = {
        ...emailResult,
        channel: 'email',
        event: 'canceled'
      }
      results.push(result)
      await logNotification(bookingId, 'email', 'canceled', emailResult)
    }
    
    // SMS送信
    if (channels.includes('sms') && smsData.to) {
      const smsResult = await sendCancellationSMS(smsData)
      const result: NotificationResult = {
        ...smsResult,
        channel: 'sms',
        event: 'canceled'
      }
      results.push(result)
      await logNotification(bookingId, 'sms', 'canceled', smsResult)
    }
    
    return results
  }
  
  // 変更通知（将来実装）
  async sendChanged(bookingId: string, oldData: any, newData: any): Promise<NotificationResult[]> {
    // 現在はキャンセル→新規予約として処理しているため、
    // 将来的に日時変更機能を実装する際に詳細を実装
    console.log('Change notification not yet implemented')
    return []
  }
}

// シングルトンインスタンス
export const notificationService = new NotificationService()

// 将来のLINE連携用プロバイダー（スケルトン）
export class LineNotificationProvider {
  async sendMessage(userId: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // LINE PROLINE API 実装予定地
    console.log('[LINE] Message would be sent:', { userId, message })
    return { success: false, error: 'LINE provider not yet implemented' }
  }
}