'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdminList } from '@/components/AdminList'
import { TimelineView } from '@/components/TimelineView'
import { NotificationPanel } from '@/components/NotificationPanel'
import { Button } from '@/components/ui/button'
import { Calendar, List, RefreshCw, Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import dayjs from 'dayjs'

export const dynamic = 'force-dynamic'

interface Booking {
  id: string
  start_ts: string
  end_ts: string
  status: 'confirmed' | 'canceled'
  created_at: string
  contact_channels: string[]
  patient?: {
    name: string
    email?: string
    phone?: string
    line_user_id?: string
    preferred_contact: string
  }
  menu?: {
    name: string
    duration_min: number
  }
  staff?: {
    name: string
  }
}

// 内部コンポーネント（useSearchParamsを使用）
function ManageContent() {
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)
  const searchParams = useSearchParams()

  // サンプルデータを生成（実際の実装では API から取得）
  const generateSampleBookings = (): Booking[] => {
    const bookings: Booking[] = []
    const today = dayjs()
    
    // 今日の予約
    for (let i = 0; i < 5; i++) {
      const startHour = 10 + Math.floor(Math.random() * 8)
      const startMinute = Math.random() > 0.5 ? 0 : 30
      const duration = [30, 60, 90][Math.floor(Math.random() * 3)]
      
      const start = today.hour(startHour).minute(startMinute).second(0)
      const end = start.add(duration, 'minute')
      
      bookings.push({
        id: `booking-${i}`,
        start_ts: start.toISOString(),
        end_ts: end.toISOString(),
        status: Math.random() > 0.1 ? 'confirmed' : 'canceled',
        created_at: today.subtract(Math.floor(Math.random() * 7), 'day').toISOString(),
        contact_channels: ['email', 'phone'],
        patient: {
          name: `患者${i + 1}`,
          email: `patient${i + 1}@example.com`,
          phone: `090-1234-567${i}`,
          line_user_id: i % 3 === 0 ? `line_user_${i}` : undefined, // 一部の患者にLINE IDを設定
          preferred_contact: ['line', 'email', 'sms'][i % 3]
        },
        menu: {
          name: ['カット', 'カラー', 'パーマ', 'トリートメント'][Math.floor(Math.random() * 4)],
          duration_min: duration
        },
        staff: {
          name: ['田中', '佐藤', '鈴木'][Math.floor(Math.random() * 3)]
        }
      })
    }

    // 同じ時間帯に8人の予約を作成（横並び表示テスト用）
    const conflictTime = today.hour(14).minute(0).second(0)
    for (let i = 0; i < 8; i++) {
      bookings.push({
        id: `conflict-${i}`,
        start_ts: conflictTime.toISOString(),
        end_ts: conflictTime.add(60, 'minute').toISOString(),
        status: 'confirmed',
        created_at: today.subtract(1, 'day').toISOString(),
        contact_channels: ['email'],
        patient: {
          name: `同時刻患者${i + 1}`,
          email: `conflict${i + 1}@example.com`,
          phone: `080-9876-543${i}`,
          line_user_id: i % 2 === 0 ? `line_conflict_${i}` : undefined,
          preferred_contact: ['line', 'email', 'sms'][i % 3]
        },
        menu: {
          name: ['カット', 'カラー', 'パーマ', 'トリートメント', 'シャンプー', 'ヘッドスパ', 'セット', 'カット+カラー'][i],
          duration_min: 60
        },
        staff: {
          name: ['田中', '佐藤', '鈴木', '高橋', '伊藤', '渡辺', '山本', '中村'][i]
        }
      })
    }
    
    return bookings
  }

  const loadBookings = useCallback(async () => {
    setLoading(true)
    try {
      // 実際の実装では API を呼び出し
      await new Promise(resolve => setTimeout(resolve, 500)) // 読み込み時間をシミュレート
      const sampleBookings = generateSampleBookings()
      setBookings(sampleBookings)
    } catch (error) {
      console.error('予約データの取得に失敗しました:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  // URLパラメータをチェックして通知パネルを自動で開く
  useEffect(() => {
    const panel = searchParams.get('panel')
    if (panel === 'notification') {
      setShowNotificationPanel(true)
      // 最初の予約を自動選択
      if (bookings.length > 0) {
        setSelectedBooking(bookings[0])
      }
    }
  }, [searchParams, bookings])

  const handleBookingSelect = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowNotificationPanel(true)
    // 詳細表示やモーダルを開く処理
    console.log('選択された予約:', booking)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            予約管理画面
          </h1>
          
          {/* コントロールパネル */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* 表示モード切替 */}
              <div className="flex items-center space-x-2">
                <Label>表示モード:</Label>
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('timeline')}
                    className="rounded-none"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    タイムライン
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-none"
                  >
                    <List className="h-4 w-4 mr-2" />
                    リスト
                  </Button>
                </div>
              </div>

              {/* 日付選択（タイムラインモード時のみ） */}
              {viewMode === 'timeline' && (
                <div className="flex items-center space-x-2">
                  <Label htmlFor="selectedDate">表示日:</Label>
                  <Input
                    id="selectedDate"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
              )}

              {/* 更新ボタン */}
              <Button
                onClick={loadBookings}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                更新
              </Button>

              {/* 通知パネル切り替え */}
              <Button
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                variant={showNotificationPanel ? 'default' : 'outline'}
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                通知パネル
              </Button>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="grid gap-6" style={{ gridTemplateColumns: showNotificationPanel && selectedBooking ? '1fr 400px' : '1fr' }}>
          <div>
            {viewMode === 'timeline' ? (
              <TimelineView
                bookings={bookings}
                selectedDate={selectedDate}
                onBookingSelect={handleBookingSelect}
              />
            ) : (
              <AdminList
                bookings={bookings}
                loading={loading}
                onRefresh={loadBookings}
                onBookingSelect={handleBookingSelect}
              />
            )}
          </div>

          {/* 通知パネル */}
          {showNotificationPanel && selectedBooking && (
            <div>
              <NotificationPanel 
                booking={selectedBooking}
                onClose={() => setShowNotificationPanel(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// メインページコンポーネント（Suspenseでラップ）
export default function ManagePage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-4">読み込み中...</div>}>
      <ManageContent />
    </Suspense>
  )
}