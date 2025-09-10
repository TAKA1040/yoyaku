'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTime, formatDate } from '@/lib/time'
import { Search, Calendar, Clock, User, Phone, Mail } from 'lucide-react'
import dayjs from 'dayjs'

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

interface AdminListProps {
  bookings: Booking[]
  loading?: boolean
  onRefresh?: () => void
  onBookingSelect?: (booking: Booking) => void
}

export function AdminList({ bookings, loading, onRefresh, onBookingSelect }: AdminListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'start_ts' | 'created_at'>('start_ts')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // フィルタリングとソート
  const filteredAndSortedBookings = useMemo(() => {
    let filtered = [...bookings]

    // 検索フィルタ
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.patient?.name.includes(searchTerm) ||
        booking.patient?.email?.includes(searchTerm) ||
        booking.patient?.phone?.includes(searchTerm) ||
        booking.menu?.name.includes(searchTerm) ||
        booking.staff?.name.includes(searchTerm)
      )
    }

    // ステータスフィルタ
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter)
    }

    // 日付フィルタ
    if (dateFilter !== 'all') {
      const today = dayjs()
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(booking =>
            dayjs(booking.start_ts).isSame(today, 'day')
          )
          break
        case 'tomorrow':
          filtered = filtered.filter(booking =>
            dayjs(booking.start_ts).isSame(today.add(1, 'day'), 'day')
          )
          break
        case 'this_week':
          filtered = filtered.filter(booking =>
            dayjs(booking.start_ts).isSame(today, 'week')
          )
          break
        case 'next_week':
          filtered = filtered.filter(booking =>
            dayjs(booking.start_ts).isSame(today.add(1, 'week'), 'week')
          )
          break
      }
    }

    // ソート
    filtered.sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [bookings, searchTerm, statusFilter, dateFilter, sortBy, sortOrder])

  const handleSort = (field: 'start_ts' | 'created_at') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  // 統計情報
  const stats = useMemo(() => {
    const total = bookings.length
    const confirmed = bookings.filter(b => b.status === 'confirmed').length
    const canceled = bookings.filter(b => b.status === 'canceled').length
    const today = bookings.filter(b => 
      b.status === 'confirmed' && dayjs(b.start_ts).isSame(dayjs(), 'day')
    ).length

    return { total, confirmed, canceled, today }
  }, [bookings])

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">総予約数</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          <div className="text-sm text-gray-600">確定予約</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-red-600">{stats.canceled}</div>
          <div className="text-sm text-gray-600">キャンセル</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
          <div className="text-sm text-gray-600">本日の予約</div>
        </div>
      </div>

      {/* フィルタとソート */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label htmlFor="search">検索</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="患者名、メール、電話番号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">ステータス</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="confirmed">確定</SelectItem>
                <SelectItem value="canceled">キャンセル</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">日付</Label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="today">今日</SelectItem>
                <SelectItem value="tomorrow">明日</SelectItem>
                <SelectItem value="this_week">今週</SelectItem>
                <SelectItem value="next_week">来週</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button onClick={onRefresh} disabled={loading}>
              {loading ? '更新中...' : '更新'}
            </Button>
          </div>
        </div>
      </div>

      {/* 予約一覧 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('start_ts')}
                >
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>予約日時</span>
                    {sortBy === 'start_ts' && (
                      <span className="text-blue-500">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>患者情報</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  施術・担当
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>予約時刻</span>
                    {sortBy === 'created_at' && (
                      <span className="text-blue-500">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {loading ? '読み込み中...' : '該当する予約がありません'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedBookings.map((booking) => (
                  <tr 
                    key={booking.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onBookingSelect?.(booking)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(booking.start_ts)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {dayjs(booking.start_ts).format('HH:mm')} - {dayjs(booking.end_ts).format('HH:mm')}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {booking.patient?.name}
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          {booking.patient?.email && (
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{booking.patient.email}</span>
                            </div>
                          )}
                          {booking.patient?.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{booking.patient.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {booking.menu?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.staff?.name} ({booking.menu?.duration_min}分)
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          booking.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {booking.status === 'confirmed' ? '確定' : 'キャンセル'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dayjs(booking.created_at).format('MM/DD HH:mm')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onBookingSelect?.(booking)
                        }}
                      >
                        詳細
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 結果数表示 */}
      {filteredAndSortedBookings.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          {filteredAndSortedBookings.length} 件の予約を表示
          {bookings.length !== filteredAndSortedBookings.length && (
            <span> (全{bookings.length}件中)</span>
          )}
        </div>
      )}
    </div>
  )
}