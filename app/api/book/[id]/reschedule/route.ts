import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/db'
import { verifyMagicToken } from '@/lib/sign'
import { rescheduleSchema } from '@/lib/validation'
import { findBestStaff, isTimeOverlapping } from '@/lib/time'
import { notificationService } from '@/lib/notifications'
import dayjs from 'dayjs'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const bookingId = params.id
    const body = await request.json()
    
    // トークン検証
    const token = body.token
    if (!token) {
      return NextResponse.json(
        { error: '認証トークンが必要です' },
        { status: 400 }
      )
    }

    const payload = verifyMagicToken(token)
    if (!payload || payload.bookingId !== bookingId || payload.action !== 'reschedule') {
      return NextResponse.json(
        { error: '無効な認証トークンです' },
        { status: 401 }
      )
    }

    // リクエストデータ検証
    const validatedData = rescheduleSchema.parse(body)


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

    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'キャンセル済みの予約は変更できません' },
        { status: 400 }
      )
    }

    // メニュー変更がある場合は新しいメニュー取得
    let menu = booking.menu
    if (validatedData.menu_id && validatedData.menu_id !== booking.menu_id) {
      const { data: newMenu, error: menuError } = await supabaseAdmin
        .from('menus')
        .select('*')
        .eq('id', validatedData.menu_id)
        .single()
      
      if (menuError || !newMenu) {
        return NextResponse.json(
          { error: '指定されたメニューが見つかりません' },
          { status: 400 }
        )
      }
      menu = newMenu
    }

    const newStartTime = dayjs(validatedData.startISO)
    const newEndTime = newStartTime.add(menu.duration_min, 'minute')
    
    // 営業時間チェック
    const hour = newStartTime.hour()
    if (hour < 9 || hour >= 18) {
      return NextResponse.json(
        { error: '営業時間外です（9:00-18:00）' },
        { status: 400 }
      )
    }

    // 過去の日時チェック
    if (newStartTime.isBefore(dayjs())) {
      return NextResponse.json(
        { error: '過去の日時には変更できません' },
        { status: 400 }
      )
    }

    // 同じ時間への変更チェック
    if (newStartTime.isSame(dayjs(booking.start_ts)) && menu.id === booking.menu_id) {
      return NextResponse.json(
        { error: '同じ日時・内容への変更です' },
        { status: 400 }
      )
    }

    // スタッフの自動割当（元のスタッフが空いていなければ他のスタッフを探す）
    const date = newStartTime.format('YYYY-MM-DD')
    let assignedStaffId = booking.staff_id

    // 既存予約の重複チェック（自分の予約は除外）
    const { data: existingBookings, error: checkError } = await supabaseAdmin
      .from('bookings')
      .select('start_ts, end_ts, staff_id')
      .eq('staff_id', assignedStaffId)
      .eq('status', 'confirmed')
      .neq('id', bookingId) // 自分の予約は除外
      .gte('start_ts', `${date}T00:00:00Z`)
      .lte('start_ts', `${date}T23:59:59Z`)

    if (checkError) {
      return NextResponse.json(
        { error: '予約重複チェックに失敗しました' },
        { status: 500 }
      )
    }

    // 元のスタッフで重複チェック
    const hasConflict = existingBookings?.some(existingBooking =>
      isTimeOverlapping(
        newStartTime.toISOString(),
        newEndTime.toISOString(),
        existingBooking.start_ts,
        existingBooking.end_ts
      )
    )

    // 元のスタッフが空いていない場合は他のスタッフを探す
    if (hasConflict) {
      const alternativeStaffId = await findBestStaff(
        date,
        newStartTime.toISOString(),
        menu.duration_min
      )
      
      if (!alternativeStaffId) {
        return NextResponse.json(
          { error: 'この時間帯に対応可能なスタッフがいません' },
          { status: 400 }
        )
      }
      assignedStaffId = alternativeStaffId
    }

    // 予約更新
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        menu_id: menu.id,
        staff_id: assignedStaffId,
        start_ts: newStartTime.toISOString(),
        end_ts: newEndTime.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
    
    if (updateError) {
      console.error('Booking update error:', updateError)
      return NextResponse.json(
        { error: '予約変更処理に失敗しました' },
        { status: 500 }
      )
    }

    // 変更通知送信（非同期）
    try {
      // 現在は新しい予約確定通知を送信（将来的に変更専用通知を実装）
      await notificationService.sendConfirm(bookingId)
    } catch (notifyError) {
      console.error('Reschedule notification failed:', notifyError)
      // 通知失敗しても変更自体は成功
    }

    // 更新された予約情報を取得
    const { data: updatedBooking } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        patient:patients(*),
        menu:menus(*),
        staff:staffs(*)
      `)
      .eq('id', bookingId)
      .single()

    return NextResponse.json({
      message: '予約を変更しました',
      booking: updatedBooking,
      changed_staff: assignedStaffId !== booking.staff_id
    })

  } catch (error) {
    console.error('Reschedule API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'データが不正です', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// GET リクエストで変更ページ表示用
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
    if (!payload || payload.bookingId !== bookingId || payload.action !== 'reschedule') {
      return NextResponse.json(
        { error: '無効な認証トークンです' },
        { status: 401 }
      )
    }

    // 予約情報とメニュー一覧を取得
    const [bookingResult, menusResult] = await Promise.all([
      supabaseAdmin
        .from('bookings')
        .select(`
          *,
          patient:patients(*),
          menu:menus(*),
          staff:staffs(*)
        `)
        .eq('id', bookingId)
        .single(),
      supabaseAdmin
        .from('menus')
        .select('*')
        .order('name')
    ])
    
    if (bookingResult.error || !bookingResult.data) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      booking: bookingResult.data,
      menus: menusResult.data || [],
      can_reschedule: bookingResult.data.status === 'confirmed'
    })

  } catch (error) {
    console.error('Reschedule GET API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}