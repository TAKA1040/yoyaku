import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { verifyMagicToken } from '@/lib/sign'
import { notificationService } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const bookingId = params.id
    
    // リクエストボディまたはクエリパラメータからトークン取得
    let token: string
    const contentType = request.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      const body = await request.json()
      token = body.token
    } else {
      const url = new URL(request.url)
      token = url.searchParams.get('token') || ''
    }
    
    if (!token) {
      return NextResponse.json(
        { error: '認証トークンが必要です' },
        { status: 400 }
      )
    }

    // マジックリンクトークン検証
    const payload = verifyMagicToken(token)
    if (!payload || payload.bookingId !== bookingId || payload.action !== 'cancel') {
      return NextResponse.json(
        { error: '無効な認証トークンです' },
        { status: 401 }
      )
    }

    // 予約存在チェック
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        patient:patients(*),
        menu:menus(*),
        staff:staffs(*)
      `)
      .eq('id', bookingId)
      .single()
    
    if (fetchError || !booking) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      )
    }

    // 既にキャンセル済みチェック
    if (booking.status === 'canceled') {
      return NextResponse.json(
        { error: 'この予約は既にキャンセルされています' },
        { status: 400 }
      )
    }

    // キャンセル実行
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ 
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
    
    if (updateError) {
      console.error('Booking cancel error:', updateError)
      return NextResponse.json(
        { error: 'キャンセル処理に失敗しました' },
        { status: 500 }
      )
    }

    // キャンセル通知送信（非同期）
    try {
      await notificationService.sendCanceled(bookingId)
    } catch (notifyError) {
      console.error('Cancel notification failed:', notifyError)
      // 通知失敗してもキャンセル自体は成功
    }

    return NextResponse.json({
      message: '予約をキャンセルしました',
      booking_id: bookingId,
      canceled_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cancel API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// GET リクエストでキャンセルページ表示用
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    const bookingId = params.id
    
    if (!token) {
      return NextResponse.json(
        { error: '認証トークンが必要です' },
        { status: 400 }
      )
    }

    // トークン検証
    const payload = verifyMagicToken(token)
    if (!payload || payload.bookingId !== bookingId || payload.action !== 'cancel') {
      return NextResponse.json(
        { error: '無効な認証トークンです' },
        { status: 401 }
      )
    }

    // 予約情報取得
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        patient:patients(*),
        menu:menus(*),
        staff:staffs(*)
      `)
      .eq('id', bookingId)
      .single()
    
    if (fetchError || !booking) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      booking,
      can_cancel: booking.status === 'confirmed'
    })

  } catch (error) {
    console.error('Cancel GET API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}