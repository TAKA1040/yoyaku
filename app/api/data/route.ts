import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { generateAvailableSlots } from '@/lib/time'

// APIルートを動的にする（静的生成を無効化）
export const dynamic = 'force-dynamic'

// 予約フォーム用のデータ取得API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const date = searchParams.get('date')
    const menuId = searchParams.get('menu_id')
    const staffId = searchParams.get('staff_id')

    switch (type) {
      case 'menus':
        return await getMenus()
      
      case 'staffs':
        return await getStaffs()
      
      case 'slots':
        if (!date || !menuId) {
          return NextResponse.json(
            { error: 'date and menu_id are required for slots' },
            { status: 400 }
          )
        }
        return await getAvailableSlots(date, menuId, staffId)
      
      case 'business_hours':
        return await getBusinessHours()
      
      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Data API error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}

// メニュー一覧取得
async function getMenus() {
  const { data: menus, error } = await supabaseAdmin
    .from('menus')
    .select('*')
    .order('name')
  
  if (error) {
    throw error
  }
  
  return NextResponse.json({ menus: menus || [] })
}

// スタッフ一覧取得（指名予約用）
async function getStaffs() {
  const { data: staffs, error } = await supabaseAdmin
    .from('staffs')
    .select('*')
    .eq('is_active', true)
    .eq('is_public', true)
    .order('name')
  
  if (error) {
    throw error
  }
  
  return NextResponse.json({ staffs: staffs || [] })
}

// 利用可能な予約スロット取得
async function getAvailableSlots(date: string, menuId: string, staffId?: string | null) {
  // メニュー情報取得
  const { data: menu, error: menuError } = await supabaseAdmin
    .from('menus')
    .select('*')
    .eq('id', menuId)
    .single()
  
  if (menuError || !menu) {
    return NextResponse.json(
      { error: 'Menu not found' },
      { status: 404 }
    )
  }

  // 利用可能スロット生成
  const slots = await generateAvailableSlots(
    date,
    menu.duration_min,
    staffId || undefined
  )
  
  return NextResponse.json({ 
    slots,
    menu,
    date 
  })
}

// 営業時間取得
async function getBusinessHours() {
  const { data: businessHours, error } = await supabaseAdmin
    .from('business_hours')
    .select('*')
    .order('weekday')
  
  if (error) {
    throw error
  }
  
  return NextResponse.json({ businessHours: businessHours || [] })
}