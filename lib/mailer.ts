import { Resend } from 'resend'
import { formatDateTime, formatDate, formatTime } from './time'
import { generateMagicLink, generateShortUrl } from './sign'
import { createICSAttachment, generateGoogleCalendarLink, ICSEventData } from './ics'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@example.com'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'クリニック'

export interface EmailData {
  to: string
  patientName: string
  bookingId: string
  menuName: string
  staffName: string
  startTime: string
  endTime: string
  clinicAddress?: string
}

// 予約確定メール
export async function sendConfirmationEmail(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const cancelLink = generateMagicLink(data.bookingId, 'cancel')
    const rescheduleLink = generateMagicLink(data.bookingId, 'reschedule')
    
    // ICS添付ファイル生成
    const icsData: ICSEventData = {
      bookingId: data.bookingId,
      patientName: data.patientName,
      menuName: data.menuName,
      staffName: data.staffName,
      startTime: data.startTime,
      endTime: data.endTime,
      clinicName: APP_NAME,
      clinicAddress: data.clinicAddress,
      description: '予約が確定いたしました'
    }
    
    const icsAttachment = createICSAttachment(icsData)
    const googleCalendarLink = generateGoogleCalendarLink(icsData)
    
    const subject = `【${APP_NAME}】ご予約確定のお知らせ - ${formatDate(data.startTime)}`
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ご予約確定のお知らせ</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
      ご予約確定のお知らせ
    </h2>
    
    <p>${data.patientName} 様</p>
    
    <p>この度は ${APP_NAME} をご利用いただき、誠にありがとうございます。<br>
    ご予約が確定いたしましたので、詳細をご確認ください。</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1e40af;">予約詳細</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 120px;">予約日時:</td>
          <td style="padding: 8px 0;">${formatDateTime(data.startTime)} 〜 ${formatTime(data.endTime)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">施術内容:</td>
          <td style="padding: 8px 0;">${data.menuName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">担当者:</td>
          <td style="padding: 8px 0;">${data.staffName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">予約番号:</td>
          <td style="padding: 8px 0; font-family: monospace;">${data.bookingId}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <h4 style="margin-top: 0; color: #92400e;">📅 カレンダーに追加</h4>
      <p style="margin-bottom: 10px;">予定をカレンダーに追加するには：</p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>添付のICSファイルをカレンダーアプリで開く</li>
        <li>または <a href="${googleCalendarLink}" style="color: #2563eb;" target="_blank">Google Calendar で追加</a></li>
      </ul>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
      <h4 style="color: #dc2626;">予約の変更・キャンセルについて</h4>
      <p>予約の変更やキャンセルが必要な場合は、以下のリンクをご利用ください：</p>
      <div style="margin: 15px 0;">
        <a href="${rescheduleLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">日時変更</a>
        <a href="${cancelLink}" style="display: inline-block; background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">キャンセル</a>
      </div>
      <p style="font-size: 14px; color: #6b7280;">※リンクは7日間有効です</p>
    </div>
    
    <div style="background-color: #f1f5f9; border-radius: 8px; padding: 15px; margin-top: 20px;">
      <p style="margin: 0; font-size: 14px; color: #475569;">
        ご不明な点がございましたら、お気軽にお問い合わせください。<br>
        当日は予約時間の10分前にはお越しください。
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
      ${APP_NAME}<br>
      このメールは自動送信されています
    </div>
  </div>
</body>
</html>
    `
    
    const emailOptions: any = {
      from: FROM_EMAIL,
      to: data.to,
      subject,
      html
    }
    
    // ICS添付がある場合は追加
    if (icsAttachment) {
      emailOptions.attachments = [
        {
          filename: icsAttachment.filename,
          content: Buffer.from(icsAttachment.content),
          contentType: icsAttachment.contentType
        }
      ]
    }
    
    // 開発環境ではコンソール出力
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 [DEV] Confirmation Email:', {
        to: data.to,
        subject,
        cancelLink: generateShortUrl(cancelLink),
        rescheduleLink: generateShortUrl(rescheduleLink),
        googleCalendarLink
      })
      return { success: true, messageId: 'dev-mode' }
    }
    
    const result = await resend.emails.send(emailOptions)
    
    if (result.error) {
      console.error('Email send error:', result.error)
      return { success: false, error: result.error.message }
    }
    
    return { success: true, messageId: result.data?.id }
    
  } catch (error) {
    console.error('Email send failed:', error)
    return { success: false, error: String(error) }
  }
}

// 前日リマインダーメール
export async function sendReminderEmail(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const cancelLink = generateShortUrl(generateMagicLink(data.bookingId, 'cancel'))
    const rescheduleLink = generateShortUrl(generateMagicLink(data.bookingId, 'reschedule'))
    
    const subject = `【${APP_NAME}】明日のご予約のリマインダー - ${formatDate(data.startTime)}`
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>明日のご予約のリマインダー</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
      明日のご予約のリマインダー
    </h2>
    
    <p>${data.patientName} 様</p>
    
    <p>明日のご予約についてお知らせいたします。</p>
    
    <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1e40af;">明日のご予約</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 120px;">予約日時:</td>
          <td style="padding: 8px 0; font-size: 18px; color: #1e40af;">${formatDateTime(data.startTime)} 〜 ${formatTime(data.endTime)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">施術内容:</td>
          <td style="padding: 8px 0;">${data.menuName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">担当者:</td>
          <td style="padding: 8px 0;">${data.staffName}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold; color: #92400e;">📍 ご来院について</p>
      <p style="margin: 10px 0 0 0; color: #92400e;">予約時間の10分前にはお越しください。</p>
    </div>
    
    <div style="text-align: center; margin: 20px 0;">
      <p>予約の変更・キャンセルが必要な場合：</p>
      <a href="${rescheduleLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 0 5px;">日時変更</a>
      <a href="${cancelLink}" style="display: inline-block; background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 0 5px;">キャンセル</a>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
      ${APP_NAME}<br>
      お待ちしております
    </div>
  </div>
</body>
</html>
    `
    
    // 開発環境ではコンソール出力
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 [DEV] Reminder Email:', {
        to: data.to,
        subject,
        reminderFor: formatDateTime(data.startTime)
      })
      return { success: true, messageId: 'dev-mode' }
    }
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject,
      html
    })
    
    if (result.error) {
      console.error('Email send error:', result.error)
      return { success: false, error: result.error.message }
    }
    
    return { success: true, messageId: result.data?.id }
    
  } catch (error) {
    console.error('Email send failed:', error)
    return { success: false, error: String(error) }
  }
}

// キャンセル通知メール
export async function sendCancellationEmail(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const subject = `【${APP_NAME}】ご予約キャンセルのお知らせ - ${formatDate(data.startTime)}`
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ご予約キャンセルのお知らせ</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
      ご予約キャンセルのお知らせ
    </h2>
    
    <p>${data.patientName} 様</p>
    
    <p>以下のご予約がキャンセルされました。</p>
    
    <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #dc2626;">キャンセルされた予約</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 120px;">予約日時:</td>
          <td style="padding: 8px 0;">${formatDateTime(data.startTime)} 〜 ${formatTime(data.endTime)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">施術内容:</td>
          <td style="padding: 8px 0;">${data.menuName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">担当者:</td>
          <td style="padding: 8px 0;">${data.staffName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">予約番号:</td>
          <td style="padding: 8px 0; font-family: monospace;">${data.bookingId}</td>
        </tr>
      </table>
    </div>
    
    <p>またのご利用をお待ちしております。<br>
    ご不明な点がございましたら、お気軽にお問い合わせください。</p>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
      ${APP_NAME}
    </div>
  </div>
</body>
</html>
    `
    
    // 開発環境ではコンソール出力
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 [DEV] Cancellation Email:', {
        to: data.to,
        subject,
        cancelledBooking: data.bookingId
      })
      return { success: true, messageId: 'dev-mode' }
    }
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject,
      html
    })
    
    if (result.error) {
      console.error('Email send error:', result.error)
      return { success: false, error: result.error.message }
    }
    
    return { success: true, messageId: result.data?.id }
    
  } catch (error) {
    console.error('Email send failed:', error)
    return { success: false, error: String(error) }
  }
}