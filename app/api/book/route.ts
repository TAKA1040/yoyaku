import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/db'
import { bookingCreateSchema, verifyTurnstile } from '@/lib/validation'
import { findBestStaff, isTimeOverlapping } from '@/lib/time'
import { notificationService } from '@/lib/notifications'
import dayjs from 'dayjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Booking request:', body)

    // バリデーション
    const validatedData = bookingCreateSchema.parse(body)
    
    // Turnstile検証
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    const turnstileValid = await verifyTurnstile(validatedData.turnstileToken, clientIP)
    if (!turnstileValid) {
      return NextResponse.json(
        { error: 'BOT対策認証に失敗しました' },
        { status: 400 }
      )
    }

    // メニュー情報取得
    const { data: menu, error: menuError } = await supabaseAdmin
      .from('menus')
      .select('*')
      .eq('id', validatedData.menu_id)
      .single()
    
    if (menuError || !menu) {
      return NextResponse.json(
        { error: 'メニューが見つかりません' },
        { status: 400 }
      )
    }

    const startTime = dayjs(validatedData.startISO)
    const endTime = startTime.add(menu.duration_min, 'minute')
    
    // 営業時間チェック（簡易版）
    const hour = startTime.hour()
    if (hour < 9 || hour >= 18) {
      return NextResponse.json(
        { error: '営業時間外です（9:00-18:00）' },
        { status: 400 }
      )
    }

    // 過去の日時チェック
    if (startTime.isBefore(dayjs())) {
      return NextResponse.json(
        { error: '過去の日時は予約できません' },
        { status: 400 }
      )
    }

    // 手動で予約処理（RPCは使用せず、直接処理）
    return await handleBookingManually(
      validatedData,
      menu,
      startTime.toISOString(),
      endTime.toISOString()
    )

  } catch (error) {
    console.error('Booking API error:', error)
    
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

// 手動での予約処理
async function handleBookingManually(
  validatedData: any,
  menu: any,
  startTimeISO: string,
  endTimeISO: string
) {
  try {
    // 1. 患者データの作成または取得
    let patientId: string
    
    if (validatedData.email) {
      // 既存患者チェック（メールアドレス）
      const { data: existingPatient } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('email', validatedData.email)
        .single()
      
      if (existingPatient) {
        patientId = existingPatient.id
        // 名前などの情報を更新
        await supabaseAdmin
          .from('patients')
          .update({
            name: validatedData.name,
            phone: validatedData.phone || null,
            preferred_contact: validatedData.contact_channels.includes('email') ? 'email' : 'sms'
          })
          .eq('id', patientId)
      } else {
        // 新規患者作成
        const { data: newPatient, error: patientError } = await supabaseAdmin
          .from('patients')
          .insert({
            name: validatedData.name,
            email: validatedData.email || null,
            phone: validatedData.phone || null,
            preferred_contact: validatedData.contact_channels.includes('email') ? 'email' : 'sms'
          })
          .select('id')
          .single()
        
        if (patientError || !newPatient) {
          throw new Error('患者データの作成に失敗しました')
        }
        patientId = newPatient.id
      }
    } else {
      // メールアドレスなしの場合は新規作成
      const { data: newPatient, error: patientError } = await supabaseAdmin
        .from('patients')
        .insert({
          name: validatedData.name,
          phone: validatedData.phone || null,
          preferred_contact: 'sms'
        })
        .select('id')
        .single()
      
      if (patientError || !newPatient) {
        throw new Error('患者データの作成に失敗しました')
      }
      patientId = newPatient.id
    }

    // 2. スタッフの自動割当（指名なしの場合）
    let assignedStaffId = validatedData.staff_id
    if (!assignedStaffId) {
      assignedStaffId = await findBestStaff(
        dayjs(startTimeISO).format('YYYY-MM-DD'),
        startTimeISO,
        menu.duration_min
      )
      
      if (!assignedStaffId) {
        return NextResponse.json(
          { error: '指定の時間に対応可能なスタッフがいません' },
          { status: 400 }
        )
      }
    }

    // 3. 重複チェック
    const date = dayjs(startTimeISO).format('YYYY-MM-DD')
    const { data: existingBookings, error: checkError } = await supabaseAdmin
      .from('bookings')
      .select('start_ts, end_ts')
      .eq('staff_id', assignedStaffId)
      .eq('status', 'confirmed')
      .gte('start_ts', `${date}T00:00:00Z`)
      .lte('start_ts', `${date}T23:59:59Z`)

    if (checkError) {
      throw new Error('予約重複チェックに失敗しました')
    }

    // 重複判定
    for (const booking of existingBookings || []) {
      if (isTimeOverlapping(startTimeISO, endTimeISO, booking.start_ts, booking.end_ts)) {
        return NextResponse.json(
          { error: 'この時間帯は既に予約が入っています' },
          { status: 400 }
        )
      }
    }

    // 4. 予約作成
    const { data: newBooking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        patient_id: patientId,
        menu_id: validatedData.menu_id,
        staff_id: assignedStaffId,
        start_ts: startTimeISO,
        end_ts: endTimeISO,
        status: 'confirmed',
        contact_channels: validatedData.contact_channels
      })
      .select(`
        id,
        start_ts,
        end_ts,
        patient:patients(*),
        menu:menus(*),
        staff:staffs(*)
      `)
      .single()

    if (bookingError || !newBooking) {
      console.error('Booking creation error:', bookingError)
      throw new Error('予約の作成に失敗しました')
    }

    // 5. 通知送信（非同期）
    try {
      await notificationService.sendConfirm(newBooking.id)
    } catch (notifyError) {
      console.error('Notification failed (but booking created):', notifyError)
      // 通知失敗は予約自体には影響させない
    }

    return NextResponse.json({
      booking_id: newBooking.id,
      assigned_staff_id: assignedStaffId,
      startISO: newBooking.start_ts,
      endISO: newBooking.end_ts,
      message: '予約が確定しました'
    })

  } catch (error) {
    console.error('Manual booking failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '予約処理に失敗しました' },
      { status: 500 }
    )
  }
}