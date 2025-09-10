'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  MessageCircle, 
  Mail, 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle 
} from 'lucide-react'
import { 
  sendNotification, 
  sendNotificationWithFallback, 
  getAvailableChannels,
  selectNotificationChannel,
  type NotificationChannel,
  type NotificationEvent,
  type NotificationResult
} from '@/lib/notification-service'

interface Booking {
  id: string
  start_ts: string
  end_ts: string
  status: 'confirmed' | 'canceled'
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

interface NotificationPanelProps {
  booking: Booking
  onClose?: () => void
}

const CHANNEL_ICONS = {
  line: MessageCircle,
  email: Mail,
  sms: MessageSquare
}

const CHANNEL_LABELS = {
  line: 'LINE',
  email: 'メール',
  sms: 'SMS'
}

const EVENT_LABELS = {
  confirm: '予約確認',
  reminder: 'リマインダー',
  changed: '予約変更',
  canceled: 'キャンセル通知'
}

export function NotificationPanel({ booking, onClose }: NotificationPanelProps) {
  const [selectedEvent, setSelectedEvent] = useState<NotificationEvent>('confirm')
  const [selectedChannel, setSelectedChannel] = useState<NotificationChannel | 'auto'>('auto')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<NotificationResult[]>([])

  if (!booking.patient) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center text-gray-500">
          患者情報が不足しています
        </div>
      </div>
    )
  }

  // 予約情報を通知サービス用の形式に変換
  const bookingInfo = {
    id: booking.id,
    patient: {
      id: booking.id,
      name: booking.patient.name,
      email: booking.patient.email,
      phone: booking.patient.phone,
      line_user_id: booking.patient.line_user_id,
      preferred_contact: booking.patient.preferred_contact as NotificationChannel | 'none'
    },
    menu_name: booking.menu?.name || '',
    staff_name: booking.staff?.name || '',
    start_ts: booking.start_ts,
    end_ts: booking.end_ts,
    status: booking.status
  }

  const availableChannels = getAvailableChannels(bookingInfo.patient)
  const recommendedChannel = selectNotificationChannel(bookingInfo.patient)

  const handleSendNotification = async () => {
    setIsLoading(true)
    setResults([])

    try {
      let notificationResults: NotificationResult[]

      if (selectedChannel === 'auto') {
        // 自動選択（フォールバック機能付き）
        notificationResults = await sendNotificationWithFallback(bookingInfo, selectedEvent)
      } else {
        // 指定チャンネルで送信
        const result = await sendNotification(bookingInfo, selectedEvent, selectedChannel)
        notificationResults = [result]
      }

      setResults(notificationResults)
    } catch (error) {
      console.error('通知送信エラー:', error)
      setResults([{
        success: false,
        channel: selectedChannel === 'auto' ? 'email' : selectedChannel,
        error: '通知送信に失敗しました'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          通知送信
        </h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      {/* 患者情報 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-gray-900 mb-2">送信先</h4>
        <div className="text-sm text-gray-600">
          <div className="font-medium">{booking.patient.name}様</div>
          <div className="mt-1">
            {booking.patient.email && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {booking.patient.email}
              </div>
            )}
            {booking.patient.phone && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {booking.patient.phone}
              </div>
            )}
            {booking.patient.line_user_id && (
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                LINE登録済み
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 利用可能チャンネル表示 */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-2">利用可能な通知方法</h4>
        <div className="flex gap-2">
          {availableChannels.map((channel) => {
            const Icon = CHANNEL_ICONS[channel]
            const isRecommended = channel === recommendedChannel
            return (
              <div
                key={channel}
                className={`
                  flex items-center gap-1 px-3 py-1 rounded-full text-xs border
                  ${isRecommended 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                  }
                `}
              >
                <Icon className="h-3 w-3" />
                {CHANNEL_LABELS[channel]}
                {isRecommended && (
                  <span className="ml-1 text-xs text-blue-500">推奨</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 通知種類選択 */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-2">通知内容</h4>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(EVENT_LABELS) as NotificationEvent[]).map((event) => (
            <Button
              key={event}
              variant={selectedEvent === event ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedEvent(event)}
            >
              {EVENT_LABELS[event]}
            </Button>
          ))}
        </div>
      </div>

      {/* 通知方法選択 */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-2">送信方法</h4>
        <div className="space-y-2">
          <Button
            variant={selectedChannel === 'auto' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedChannel('auto')}
            className="w-full justify-start"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            自動選択（優先順位: LINE → メール → SMS）
          </Button>
          
          {availableChannels.map((channel) => {
            const Icon = CHANNEL_ICONS[channel]
            return (
              <Button
                key={channel}
                variant={selectedChannel === channel ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChannel(channel)}
                className="w-full justify-start"
              >
                <Icon className="h-4 w-4 mr-2" />
                {CHANNEL_LABELS[channel]}のみ
              </Button>
            )
          })}
        </div>
      </div>

      {/* 送信ボタン */}
      <div className="mb-6">
        <Button
          onClick={handleSendNotification}
          disabled={isLoading || availableChannels.length === 0}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              送信中...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              通知を送信
            </>
          )}
        </Button>
      </div>

      {/* 送信結果 */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">送信結果</h4>
          {results.map((result, index) => {
            const Icon = CHANNEL_ICONS[result.channel]
            return (
              <div
                key={index}
                className={`
                  flex items-start gap-3 p-3 rounded-lg border
                  ${result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                  }
                `}
              >
                <Icon className="h-4 w-4 mt-0.5 text-gray-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">
                      {CHANNEL_LABELS[result.channel]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {result.success ? (
                      result.message || '送信完了'
                    ) : (
                      result.error || '送信失敗'
                    )}
                  </div>
                  {result.providerId && (
                    <div className="text-xs text-gray-500 mt-1">
                      ID: {result.providerId}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}