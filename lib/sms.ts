import { formatDateTime, formatTime } from './time'
import { generateMagicLink, generateShortUrl } from './sign'

// Twilioクライアントを遅延初期化
function getTwilioClient() {
  if (process.env.NODE_ENV === 'development' || 
      !process.env.TWILIO_ACCOUNT_SID || 
      !process.env.TWILIO_AUTH_TOKEN) {
    return null
  }
  
  try {
    const { Twilio } = require('twilio')
    return new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error)
    return null
  }
}

const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '+819012345678'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'クリニック'

export interface SMSData {
  to: string
  patientName: string
  bookingId: string
  menuName: string
  staffName: string
  startTime: string
  endTime: string
}

// SMS送信の結果
export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

// 予約確定SMS
export async function sendConfirmationSMS(data: SMSData): Promise<SMSResult> {
  try {
    const cancelLink = generateShortUrl(generateMagicLink(data.bookingId, 'cancel'))
    
    const message = `【${APP_NAME}】ご予約確定
${data.patientName}様
${formatDateTime(data.startTime)} 
${data.menuName}(${data.staffName})
変更・キャンセル: ${cancelLink}`
    
    return await sendSMS(data.to, message)
  } catch (error) {
    console.error('SMS send failed:', error)
    return { success: false, error: String(error) }
  }
}

// 前日リマインダーSMS
export async function sendReminderSMS(data: SMSData): Promise<SMSResult> {
  try {
    const cancelLink = generateShortUrl(generateMagicLink(data.bookingId, 'cancel'))
    
    const message = `【${APP_NAME}】明日のご予約
${formatDateTime(data.startTime)}〜${formatTime(data.endTime)}
${data.menuName}(${data.staffName})
10分前にお越しください
変更・キャンセル: ${cancelLink}`
    
    return await sendSMS(data.to, message)
  } catch (error) {
    console.error('SMS send failed:', error)
    return { success: false, error: String(error) }
  }
}

// キャンセル通知SMS
export async function sendCancellationSMS(data: SMSData): Promise<SMSResult> {
  try {
    const message = `【${APP_NAME}】予約キャンセル
${data.patientName}様
${formatDateTime(data.startTime)}の${data.menuName}をキャンセルいたしました。
またのご利用をお待ちしております。`
    
    return await sendSMS(data.to, message)
  } catch (error) {
    console.error('SMS send failed:', error)
    return { success: false, error: String(error) }
  }
}

// 共通SMS送信関数
async function sendSMS(to: string, message: string): Promise<SMSResult> {
  // 開発環境ではコンソール出力のみ
  if (process.env.NODE_ENV === 'development') {
    console.log('📱 [DEV] SMS:', {
      to,
      message,
      length: message.length
    })
    return { success: true, messageId: 'dev-mode' }
  }
  
  try {
    const twilioClient = getTwilioClient()
    if (!twilioClient) {
      return { success: false, error: 'Twilio client not available' }
    }
    
    // 電話番号の正規化（日本の携帯電話番号）
    const normalizedTo = normalizePhoneNumber(to)
    if (!normalizedTo) {
      return { success: false, error: 'Invalid phone number format' }
    }
    
    const result = await twilioClient.messages.create({
      body: message,
      from: FROM_NUMBER,
      to: normalizedTo
    })
    
    if (result.errorCode) {
      console.error('Twilio SMS error:', result.errorMessage)
      return { success: false, error: result.errorMessage || 'SMS send failed' }
    }
    
    return { success: true, messageId: result.sid }
    
  } catch (error) {
    console.error('SMS send failed:', error)
    return { success: false, error: String(error) }
  }
}

// 電話番号の正規化（日本の携帯電話番号を国際形式に変換）
function normalizePhoneNumber(phoneNumber: string): string | null {
  // 数字のみ抽出
  const digits = phoneNumber.replace(/\D/g, '')
  
  // 日本の携帯電話番号パターン
  if (digits.match(/^0[789]0\d{8}$/)) {
    // 090/080/070 -> +8190/+8180/+8170
    return `+81${digits.slice(1)}`
  }
  
  // 既に国際形式の場合
  if (digits.match(/^81[789]0\d{8}$/)) {
    return `+${digits}`
  }
  
  // その他の形式（固定電話など）は今回は対象外
  console.warn('Unsupported phone number format:', phoneNumber)
  return null
}

// SMS文字数制限チェック（70文字推奨）
export function validateSMSMessage(message: string): { valid: boolean; length: number; warning?: string } {
  const length = message.length
  
  if (length > 160) {
    return {
      valid: false,
      length,
      warning: 'SMS message exceeds 160 characters limit'
    }
  }
  
  if (length > 70) {
    return {
      valid: true,
      length,
      warning: 'SMS message exceeds recommended 70 characters'
    }
  }
  
  return { valid: true, length }
}