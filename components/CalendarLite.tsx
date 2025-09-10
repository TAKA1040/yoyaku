'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatDate } from '@/lib/time'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'

interface Booking {
  id: string
  start_ts: string
  end_ts: string
  status: 'confirmed' | 'canceled'
  patient?: {
    name: string
    email?: string
    phone?: string
  }
  menu?: {
    name: string
    duration_min: number
  }
  staff?: {
    name: string
  }
}

interface CalendarLiteProps {
  bookings: Booking[]
  onDateSelect?: (date: string) => void
  selectedDate?: string
}

export function CalendarLite({ bookings, onDateSelect, selectedDate }: CalendarLiteProps) {
  const [currentDate, setCurrentDate] = useState(dayjs())
  
  // 月の開始日と終了日を取得
  const startOfMonth = currentDate.startOf('month')
  const endOfMonth = currentDate.endOf('month')
  const startDate = startOfMonth.startOf('week')
  const endDate = endOfMonth.endOf('week')
  
  // カレンダーの日付一覧を生成
  const calendarDays = []
  let day = startDate
  while (day.isBefore(endDate) || day.isSame(endDate)) {
    calendarDays.push(day)
    day = day.add(1, 'day')
  }

  // 指定日の予約数を取得
  function getBookingCount(date: dayjs.Dayjs): number {
    const dateStr = date.format('YYYY-MM-DD')
    return bookings.filter(booking => 
      booking.status === 'confirmed' && 
      dayjs(booking.start_ts).format('YYYY-MM-DD') === dateStr
    ).length
  }

  // 指定日の予約を取得
  function getBookingsForDate(date: dayjs.Dayjs): Booking[] {
    const dateStr = date.format('YYYY-MM-DD')
    return bookings
      .filter(booking => 
        booking.status === 'confirmed' && 
        dayjs(booking.start_ts).format('YYYY-MM-DD') === dateStr
      )
      .sort((a, b) => dayjs(a.start_ts).valueOf() - dayjs(b.start_ts).valueOf())
  }

  const goToPrevMonth = () => {
    setCurrentDate(prev => prev.subtract(1, 'month'))
  }

  const goToNextMonth = () => {
    setCurrentDate(prev => prev.add(1, 'month'))
  }

  const handleDateClick = (date: dayjs.Dayjs) => {
    if (onDateSelect) {
      onDateSelect(date.format('YYYY-MM-DD'))
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPrevMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-lg font-semibold">
          {currentDate.format('YYYY年MM月')}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b">
        {['日', '月', '火', '水', '木', '金', '土'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* カレンダー本体 */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const isCurrentMonth = day.month() === currentDate.month()
          const isToday = day.isSame(dayjs(), 'day')
          const isSelected = selectedDate && day.format('YYYY-MM-DD') === selectedDate
          const bookingCount = getBookingCount(day)
          const isPast = day.isBefore(dayjs(), 'day')
          
          return (
            <div
              key={index}
              className={`
                min-h-[80px] p-2 border-b border-r cursor-pointer hover:bg-gray-50
                ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                ${isToday ? 'bg-blue-50' : ''}
                ${isSelected ? 'bg-primary/10' : ''}
                ${isPast ? 'opacity-60' : ''}
              `}
              onClick={() => handleDateClick(day)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`
                  text-sm font-medium
                  ${isToday ? 'text-blue-600' : ''}
                  ${isSelected ? 'text-primary' : ''}
                `}>
                  {day.format('D')}
                </span>
                
                {bookingCount > 0 && (
                  <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                    {bookingCount}
                  </span>
                )}
              </div>
              
              {/* 予約の簡易表示 */}
              {isCurrentMonth && bookingCount > 0 && (
                <div className="space-y-1">
                  {getBookingsForDate(day).slice(0, 2).map(booking => (
                    <div
                      key={booking.id}
                      className="text-xs px-1 py-0.5 bg-blue-100 text-blue-800 rounded truncate"
                      title={`${dayjs(booking.start_ts).format('HH:mm')} ${booking.patient?.name} ${booking.menu?.name}`}
                    >
                      {dayjs(booking.start_ts).format('HH:mm')} {booking.patient?.name}
                    </div>
                  ))}
                  {bookingCount > 2 && (
                    <div className="text-xs text-gray-500">
                      +{bookingCount - 2} 件
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}