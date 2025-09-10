import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { notificationService } from '@/lib/notifications'
import dayjs from 'dayjs'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（本番ではVercel Cronの認証ヘッダーまたは専用トークンで保護）
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET || 'dev-cron-secret'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      console.warn('Unauthorized cron request')
      // 開発環境では警告のみ
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
    const tomorrowStart = `${tomorrow}T00:00:00Z`
    const tomorrowEnd = `${tomorrow}T23:59:59Z`

    console.log(`🔔 Running reminder cron for ${tomorrow}`)

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'データベース接続エラー' },
        { status: 500 }
      )
    }

    // 明日の予約を取得
    const { data: bookings, error } = await (supabaseAdmin as any)
      .from('bookings')
      .select(`
        id,
        start_ts,
        end_ts,
        contact_channels,
        patient:patients(*),
        menu:menus(*),
        staff:staffs(*)
      `)
      .eq('status', 'confirmed')
      .gte('start_ts', tomorrowStart)
      .lte('start_ts', tomorrowEnd)
      .order('start_ts')

    if (error) {
      console.error('Failed to fetch bookings for reminder:', error)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (!bookings || bookings.length === 0) {
      console.log('No bookings found for reminder')
      return NextResponse.json({
        message: 'No bookings to remind',
        date: tomorrow,
        count: 0
      })
    }

    console.log(`Found ${bookings.length} bookings to remind`)

    // 各予約にリマインダー送信
    const results = []
    let successCount = 0
    let errorCount = 0

    for (const booking of bookings) {
      try {
        console.log(`Sending reminder for booking ${booking.id}`)
        
        // 既に今日リマインダーを送信済みかチェック
        const today = dayjs().format('YYYY-MM-DD')
        const { data: existingLog } = await (supabaseAdmin as any)
          .from('notification_logs')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('event', 'reminder')
          .gte('sent_at', `${today}T00:00:00Z`)
          .maybeSingle()

        if (existingLog) {
          console.log(`Reminder already sent for booking ${booking.id}`)
          results.push({
            booking_id: booking.id,
            status: 'skipped',
            reason: 'already_sent'
          })
          continue
        }

        // リマインダー送信
        const notificationResults = await notificationService.sendReminder(booking.id)
        
        let hasSuccess = false
        let errors = []

        for (const result of notificationResults) {
          if (result.success) {
            hasSuccess = true
          } else {
            errors.push(`${result.channel}: ${result.error}`)
          }
        }

        if (hasSuccess) {
          successCount++
          results.push({
            booking_id: booking.id,
            patient_name: (booking.patient as any)?.name,
            start_time: booking.start_ts,
            status: 'success',
            notifications: notificationResults.length
          })
        } else {
          errorCount++
          results.push({
            booking_id: booking.id,
            patient_name: (booking.patient as any)?.name,
            start_time: booking.start_ts,
            status: 'error',
            errors
          })
        }

      } catch (error) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, error)
        errorCount++
        results.push({
          booking_id: booking.id,
          status: 'error',
          error: String(error)
        })
      }
    }

    console.log(`✅ Reminder cron completed: ${successCount} success, ${errorCount} errors`)

    return NextResponse.json({
      message: 'Reminder cron completed',
      date: tomorrow,
      total_bookings: bookings.length,
      success_count: successCount,
      error_count: errorCount,
      results
    })

  } catch (error) {
    console.error('Reminder cron error:', error)
    return NextResponse.json(
      { 
        error: 'Cron execution failed',
        details: String(error)
      },
      { status: 500 }
    )
  }
}

// 手動テスト用のGETエンドポイント
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  // 開発環境でのテスト実行
  return POST(request)
}