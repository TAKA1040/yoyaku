import { supabase, supabaseAdmin } from './db'

// 通知チャンネルの優先順位
export type NotificationChannel = 'line' | 'email' | 'sms'
export type NotificationEvent = 'confirm' | 'reminder' | 'changed' | 'canceled'

// 通知結果
export interface NotificationResult {
  success: boolean
  channel: NotificationChannel
  message?: string
  providerId?: string
  error?: string
}

// 患者の連絡先情報
export interface PatientContact {
  id: string
  name: string
  email?: string
  phone?: string
  line_user_id?: string
  preferred_contact: NotificationChannel | 'none'
}

// 予約情報
export interface BookingInfo {
  id: string
  patient: PatientContact
  menu_name: string
  staff_name: string
  start_ts: string
  end_ts: string
  status: string
}

// 通知テンプレート
export interface NotificationTemplate {
  line?: string
  email?: {
    subject: string
    body: string
  }
  sms?: string
}

// メッセージテンプレート
const MESSAGE_TEMPLATES: Record<NotificationEvent, NotificationTemplate> = {
  confirm: {
    line: `【予約確認】
{patient_name}様

ご予約を承りました。

📅 日時: {datetime}
🔧 メニュー: {menu_name}
👤 担当: {staff_name}

当日はお時間に余裕を持ってお越しください。`,
    email: {
      subject: '予約確認 - {clinic_name}',
      body: `{patient_name}様

この度は、{clinic_name}をご利用いただき、ありがとうございます。
ご予約を承りましたので、確認のご連絡をいたします。

■ 予約内容
日時: {datetime}
メニュー: {menu_name}
担当: {staff_name}

■ お願い
・予約時間の10分前にはお越しください
・変更・キャンセルの場合は事前にご連絡ください

何かご不明な点がございましたら、お気軽にお問い合わせください。

{clinic_name}`
    },
    sms: `【{clinic_name}】予約確認
{patient_name}様
{datetime} {menu_name}（担当:{staff_name}）
10分前にお越しください。`
  },
  reminder: {
    line: `【予約リマインダー】
{patient_name}様

明日のご予約のお知らせです。

📅 日時: {datetime}
🔧 メニュー: {menu_name}
👤 担当: {staff_name}

お待ちしております！`,
    email: {
      subject: '明日のご予約について - {clinic_name}',
      body: `{patient_name}様

明日のご予約のリマインダーをお送りいたします。

■ 予約内容
日時: {datetime}
メニュー: {menu_name}
担当: {staff_name}

お待ちしております。

{clinic_name}`
    },
    sms: `【{clinic_name}】明日のご予約
{patient_name}様
{datetime} {menu_name}（担当:{staff_name}）
お待ちしております。`
  },
  changed: {
    line: `【予約変更】
{patient_name}様

ご予約の変更がございます。

📅 新しい日時: {datetime}
🔧 メニュー: {menu_name}
👤 担当: {staff_name}

ご不明な点がございましたらお問い合わせください。`,
    email: {
      subject: '予約変更のお知らせ - {clinic_name}',
      body: `{patient_name}様

ご予約の変更をいたしましたので、お知らせいたします。

■ 変更後の予約内容
日時: {datetime}
メニュー: {menu_name}
担当: {staff_name}

ご不明な点がございましたら、お気軽にお問い合わせください。

{clinic_name}`
    },
    sms: `【{clinic_name}】予約変更
{patient_name}様
変更後: {datetime} {menu_name}（担当:{staff_name}）`
  },
  canceled: {
    line: `【予約キャンセル】
{patient_name}様

ご予約をキャンセルいたしました。

またのご利用をお待ちしております。`,
    email: {
      subject: '予約キャンセルのお知らせ - {clinic_name}',
      body: `{patient_name}様

ご予約をキャンセルいたしましたので、お知らせいたします。

またのご利用を心よりお待ちしております。

{clinic_name}`
    },
    sms: `【{clinic_name}】予約キャンセル
{patient_name}様
ご予約をキャンセルいたしました。またのご利用をお待ちしております。`
  }
}

// メッセージの変数置換
function replaceMessageVariables(template: string, booking: BookingInfo): string {
  const clinicName = process.env.NEXT_PUBLIC_APP_NAME || 'クリニック'
  const datetime = new Date(booking.start_ts).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })

  return template
    .replace(/{clinic_name}/g, clinicName)
    .replace(/{patient_name}/g, booking.patient.name)
    .replace(/{datetime}/g, datetime)
    .replace(/{menu_name}/g, booking.menu_name)
    .replace(/{staff_name}/g, booking.staff_name)
}

// 利用可能な通知チャンネルを優先順位順で取得
export function getAvailableChannels(patient: PatientContact): NotificationChannel[] {
  const channels: NotificationChannel[] = []
  
  // 優先順位: LINE > Email > SMS
  if (patient.line_user_id) channels.push('line')
  if (patient.email) channels.push('email')
  if (patient.phone) channels.push('sms')
  
  return channels
}

// 最適な通知チャンネルを選択
export function selectNotificationChannel(patient: PatientContact): NotificationChannel | null {
  // 患者の希望がある場合はそれを優先（利用可能な場合のみ）
  const availableChannels = getAvailableChannels(patient)
  
  if (patient.preferred_contact !== 'none' && availableChannels.includes(patient.preferred_contact)) {
    return patient.preferred_contact
  }
  
  // 希望がない、または利用不可の場合は優先順位で選択
  return availableChannels[0] || null
}

// LINE通知を送信
async function sendLineNotification(
  lineUserId: string, 
  message: string
): Promise<NotificationResult> {
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    // 開発環境ではコンソールに出力
    console.log('📱 LINE通知 (開発環境):', { lineUserId, message })
    return { success: true, channel: 'line', message: 'Development mode - logged to console' }
  }
  
  try {
    // 本番環境でのLINE Messaging API呼び出し
    // TODO: LINE Messaging APIの実装
    console.log('LINE通知送信:', { lineUserId, message })
    return { success: true, channel: 'line', providerId: 'line_' + Date.now() }
  } catch (error) {
    return { 
      success: false, 
      channel: 'line', 
      error: error instanceof Error ? error.message : 'LINE送信エラー' 
    }
  }
}

// メール通知を送信
async function sendEmailNotification(
  email: string,
  subject: string,
  body: string
): Promise<NotificationResult> {
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    // 開発環境ではコンソールに出力
    console.log('📧 メール通知 (開発環境):', { email, subject, body })
    return { success: true, channel: 'email', message: 'Development mode - logged to console' }
  }
  
  try {
    // 本番環境でのResend API呼び出し
    // TODO: Resend APIの実装
    console.log('メール通知送信:', { email, subject, body })
    return { success: true, channel: 'email', providerId: 'email_' + Date.now() }
  } catch (error) {
    return { 
      success: false, 
      channel: 'email', 
      error: error instanceof Error ? error.message : 'メール送信エラー' 
    }
  }
}

// SMS通知を送信
async function sendSmsNotification(
  phone: string,
  message: string
): Promise<NotificationResult> {
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    // 開発環境ではコンソールに出力
    console.log('📱 SMS通知 (開発環境):', { phone, message })
    return { success: true, channel: 'sms', message: 'Development mode - logged to console' }
  }
  
  try {
    // 本番環境でのTwilio API呼び出し
    // TODO: Twilio APIの実装
    console.log('SMS通知送信:', { phone, message })
    return { success: true, channel: 'sms', providerId: 'sms_' + Date.now() }
  } catch (error) {
    return { 
      success: false, 
      channel: 'sms', 
      error: error instanceof Error ? error.message : 'SMS送信エラー' 
    }
  }
}

// 通知を送信
export async function sendNotification(
  booking: BookingInfo,
  event: NotificationEvent,
  channel?: NotificationChannel
): Promise<NotificationResult> {
  const selectedChannel = channel || selectNotificationChannel(booking.patient)
  
  if (!selectedChannel) {
    return { 
      success: false, 
      channel: 'email', // デフォルト
      error: '利用可能な通知チャンネルがありません' 
    }
  }
  
  const template = MESSAGE_TEMPLATES[event]
  let result: NotificationResult
  
  try {
    switch (selectedChannel) {
      case 'line':
        if (!booking.patient.line_user_id || !template.line) {
          throw new Error('LINE情報が不足しています')
        }
        const lineMessage = replaceMessageVariables(template.line, booking)
        result = await sendLineNotification(booking.patient.line_user_id, lineMessage)
        break
        
      case 'email':
        if (!booking.patient.email || !template.email) {
          throw new Error('メール情報が不足しています')
        }
        const emailSubject = replaceMessageVariables(template.email.subject, booking)
        const emailBody = replaceMessageVariables(template.email.body, booking)
        result = await sendEmailNotification(booking.patient.email, emailSubject, emailBody)
        break
        
      case 'sms':
        if (!booking.patient.phone || !template.sms) {
          throw new Error('SMS情報が不足しています')
        }
        const smsMessage = replaceMessageVariables(template.sms, booking)
        result = await sendSmsNotification(booking.patient.phone, smsMessage)
        break
        
      default:
        throw new Error('未対応の通知チャンネルです')
    }
    
    // 通知ログを記録
    await logNotification(booking.id, result, event)
    
    return result
  } catch (error) {
    const errorResult: NotificationResult = {
      success: false,
      channel: selectedChannel,
      error: error instanceof Error ? error.message : '通知送信エラー'
    }
    
    // エラーログも記録
    await logNotification(booking.id, errorResult, event)
    
    return errorResult
  }
}

// 通知ログを記録
async function logNotification(
  bookingId: string,
  result: NotificationResult,
  event: NotificationEvent
): Promise<void> {
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev || !supabaseAdmin) {
    // 開発環境ではコンソールに記録
    console.log('📝 通知ログ (開発環境):', {
      booking_id: bookingId,
      channel: result.channel,
      event,
      result: result.success ? 'success' : 'failed',
      error: result.error,
      provider_msg_id: result.providerId
    })
    return
  }
  
  try {
    await supabaseAdmin
      .from('notification_logs')
      .insert({
        booking_id: bookingId,
        channel: result.channel,
        event,
        sent_at: new Date().toISOString(),
        result: result.success ? JSON.stringify(result) : undefined,
        provider_msg_id: result.providerId
      })
  } catch (error) {
    console.error('通知ログの記録に失敗:', error)
  }
}

// 複数チャンネルでの通知送信（フォールバック機能）
export async function sendNotificationWithFallback(
  booking: BookingInfo,
  event: NotificationEvent
): Promise<NotificationResult[]> {
  const availableChannels = getAvailableChannels(booking.patient)
  const results: NotificationResult[] = []
  
  for (const channel of availableChannels) {
    const result = await sendNotification(booking, event, channel)
    results.push(result)
    
    // 成功したら以降のチャンネルは試さない
    if (result.success) {
      break
    }
  }
  
  return results
}