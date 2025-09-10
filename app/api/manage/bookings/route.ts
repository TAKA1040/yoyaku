import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import dayjs from 'dayjs'

// APIルートを動的にする（静的生成を無効化）
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const date = searchParams.get('date')
    const staffId = searchParams.get('staff_id')
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'データベース接続エラー' },
        { status: 500 }
      )
    }
    
    let query = (supabaseAdmin as any)
      .from('bookings')
      .select(`
        *,
        patient:patients(*),
        menu:menus(*),
        staff:staffs(*)
      `)
    
    // フィルタ適用
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (date) {
      const startOfDay = `${date}T00:00:00Z`
      const endOfDay = `${date}T23:59:59Z`
      query = query.gte('start_ts', startOfDay).lte('start_ts', endOfDay)
    }
    
    if (staffId) {
      query = query.eq('staff_id', staffId)
    }
    
    const { data: bookings, error, count } = await query
      .order('start_ts', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Failed to fetch bookings:', error)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      bookings: bookings || [],
      total: count || 0
    })
    
  } catch (error) {
    console.error('Bookings API error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}