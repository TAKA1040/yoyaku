import jwt from 'jsonwebtoken'

const SECRET = process.env.MAGIC_LINK_SECRET!

export interface MagicLinkPayload {
  bookingId: string
  action: 'cancel' | 'reschedule'
  exp?: number
}

// 署名付きURL生成（キャンセル・変更用）
export function generateMagicLink(bookingId: string, action: 'cancel' | 'reschedule'): string {
  const payload: MagicLinkPayload = {
    bookingId,
    action,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7日間有効
  }
  
  const token = jwt.sign(payload, SECRET)
  const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000'
  
  if (action === 'cancel') {
    return `${baseUrl}/cancel?token=${token}`
  } else {
    return `${baseUrl}/reschedule?token=${token}`
  }
}

// トークン検証
export function verifyMagicToken(token: string): MagicLinkPayload | null {
  try {
    const payload = jwt.verify(token, SECRET) as MagicLinkPayload
    return payload
  } catch (error) {
    console.error('Invalid magic token:', error)
    return null
  }
}

// 短縮URL生成用（本番では独自ドメインに置き換え可能）
export function generateShortUrl(originalUrl: string): string {
  // 開発環境では元のURLをそのまま返す
  // 本番では短縮URL サービスのAPIを呼ぶ
  if (process.env.NODE_ENV === 'development') {
    return originalUrl
  }
  
  // 本番用短縮URL実装はここに追加
  // 例: bit.ly, tinyurl.com, 独自短縮サービス等
  return originalUrl
}