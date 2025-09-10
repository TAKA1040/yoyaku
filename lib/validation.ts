import { z } from 'zod'

// 予約作成のバリデーションスキーマ
export const bookingCreateSchema = z.object({
  name: z.string().min(1, '名前を入力してください').max(50, '名前は50文字以内で入力してください'),
  email: z.string().email('正しいメールアドレスを入力してください').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  menu_id: z.string().uuid('無効なメニューIDです'),
  startISO: z.string().datetime('正しい日時形式を入力してください'),
  staff_id: z.string().uuid('無効なスタッフIDです').optional().nullable(),
  contact_channels: z.array(z.enum(['email', 'sms'])).min(1, '少なくとも1つの連絡方法を選択してください'),
  turnstileToken: z.string().min(1, 'BOT対策認証が必要です')
}).refine(data => {
  // contact_channelsに'email'がある場合はemailが必須
  if (data.contact_channels.includes('email') && !data.email) {
    return false
  }
  // contact_channelsに'sms'がある場合はphoneが必須
  if (data.contact_channels.includes('sms') && !data.phone) {
    return false
  }
  return true
}, {
  message: '選択した連絡方法に対応する連絡先を入力してください',
  path: ['contact_channels']
})

// Turnstile検証用
export const turnstileVerifySchema = z.object({
  token: z.string(),
  secret: z.string(),
  remoteip: z.string().optional()
})

// 日時変更用のスキーマ
export const rescheduleSchema = z.object({
  startISO: z.string().datetime('正しい日時形式を入力してください'),
  menu_id: z.string().uuid('無効なメニューIDです').optional()
})

// Turnstile検証関数
export async function verifyTurnstile(token: string, remoteIP?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY not configured')
    return process.env.NODE_ENV === 'development' // 開発環境では通す
  }
  
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: remoteIP
      })
    })
    
    const result = await response.json()
    return result.success === true
    
  } catch (error) {
    console.error('Turnstile verification failed:', error)
    return false
  }
}