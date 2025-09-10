'use client'

import { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { formatDate } from '@/lib/time'
import { User, Clock, Phone, Mail } from 'lucide-react'

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

interface TimelineViewProps {
  bookings: Booking[]
  selectedDate: string
  onBookingSelect?: (booking: Booking) => void
}

export function TimelineView({ bookings, selectedDate, onBookingSelect }: TimelineViewProps) {
  const [timeSlot, setTimeSlot] = useState(30) // 30分刻み

  // 選択日の予約をフィルタリング
  const dayBookings = useMemo(() => {
    return bookings.filter(booking => 
      booking.status === 'confirmed' && 
      dayjs(booking.start_ts).isSame(selectedDate, 'day')
    )
  }, [bookings, selectedDate])

  // タイムスロットを生成（9:00-21:00）
  const timeSlots = useMemo(() => {
    const slots = []
    const startHour = 9
    const endHour = 21
    const interval = timeSlot // 分単位

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeString)
      }
    }
    return slots
  }, [timeSlot])

  // 各タイムスロットの予約を取得
  const getBookingsForTimeSlot = (timeString: string) => {
    const [hour, minute] = timeString.split(':').map(Number)
    const slotStart = dayjs(selectedDate).hour(hour).minute(minute)
    const slotEnd = slotStart.add(timeSlot, 'minute')

    return dayBookings.filter(booking => {
      const bookingStart = dayjs(booking.start_ts)
      const bookingEnd = dayjs(booking.end_ts)
      
      // 予約時間がタイムスロットと重複している場合
      return (
        (bookingStart.isBefore(slotEnd) && bookingEnd.isAfter(slotStart)) ||
        (bookingStart.isSame(slotStart) || bookingEnd.isSame(slotEnd))
      )
    })
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            タイムライン表示 - {formatDate(selectedDate)}
          </h3>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">間隔:</label>
            <select 
              value={timeSlot} 
              onChange={(e) => setTimeSlot(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1"
            >
              <option value={15}>15分</option>
              <option value={30}>30分</option>
              <option value={60}>60分</option>
            </select>
          </div>
        </div>
        {dayBookings.length > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            {dayBookings.length}件の予約があります
          </p>
        )}
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {timeSlots.map((timeString) => {
          const slotBookings = getBookingsForTimeSlot(timeString)
          
          return (
            <div key={timeString} className="relative border-b border-gray-100 min-h-[60px]">
              <div className="flex">
                {/* 時間表示 */}
                <div className="w-16 flex-shrink-0 bg-gray-50 border-r flex items-center justify-center">
                  <div className="text-xs font-medium text-gray-600">
                    {timeString}
                  </div>
                </div>
                
                {/* 予約表示エリア */}
                <div className="flex-1 relative min-h-[60px] p-1">
                  {slotBookings.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                      -
                    </div>
                  ) : (
                    <div className="flex gap-1 h-full">
                      {slotBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className={`
                            flex-1 min-w-0 rounded border-l-4 cursor-pointer transition-all hover:shadow-md
                            ${booking.status === 'confirmed' 
                              ? 'bg-blue-50 border-blue-400 hover:bg-blue-100' 
                              : 'bg-gray-50 border-gray-400 hover:bg-gray-100'
                            }
                          `}
                          onClick={() => onBookingSelect?.(booking)}
                        >
                          <div className="p-2 h-full">
                            <div className="text-xs font-medium text-gray-900 truncate">
                              {booking.patient?.name}
                            </div>
                            <div className="text-xs text-gray-600 truncate">
                              {booking.menu?.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {dayjs(booking.start_ts).format('HH:mm')} - {dayjs(booking.end_ts).format('HH:mm')}
                            </div>
                            {booking.staff?.name && (
                              <div className="text-xs text-gray-500 truncate">
                                {booking.staff.name}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {dayBookings.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          この日の予約はありません
        </div>
      )}
    </div>
  )
}