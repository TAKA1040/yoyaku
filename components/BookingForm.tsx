'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { formatDateTime, formatDate } from '@/lib/time'
import dayjs from 'dayjs'

interface Menu {
  id: string
  name: string
  duration_min: number
  description?: string
}

interface Staff {
  id: string
  name: string
}

interface TimeSlot {
  start: string
  end: string
  staffId: string
  staffName: string
  available: boolean
}

interface BookingFormProps {
  onSuccess?: (bookingId: string) => void
}

export function BookingForm({ onSuccess }: BookingFormProps) {
  const { toast } = useToast()
  
  // State
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [menus, setMenus] = useState<Menu[]>([])
  const [staffs, setStaffs] = useState<Staff[]>([])
  const [slots, setSlots] = useState<TimeSlot[]>([])
  
  // Form data
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
    phone: '',
    contactChannels: ['email'] as string[]
  })

  // 初期データ読み込み
  useEffect(() => {
    loadMenus()
    loadStaffs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 選択された日時とメニューに基づいてスロット読み込み
  useEffect(() => {
    if (selectedDate && selectedMenu) {
      loadSlots(selectedDate, selectedMenu.id, selectedStaff?.id)
    }
  }, [selectedDate, selectedMenu, selectedStaff]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMenus() {
    try {
      const response = await fetch('/api/data?type=menus')
      const data = await response.json()
      setMenus(data.menus || [])
    } catch (error) {
      console.error('Failed to load menus:', error)
      toast({
        title: 'エラー',
        description: 'メニューの読み込みに失敗しました',
        variant: 'destructive'
      })
    }
  }

  async function loadStaffs() {
    try {
      const response = await fetch('/api/data?type=staffs')
      const data = await response.json()
      setStaffs(data.staffs || [])
    } catch (error) {
      console.error('Failed to load staffs:', error)
    }
  }

  async function loadSlots(date: string, menuId: string, staffId?: string) {
    try {
      const params = new URLSearchParams({
        type: 'slots',
        date,
        menu_id: menuId
      })
      
      if (staffId) {
        params.append('staff_id', staffId)
      }

      const response = await fetch(`/api/data?${params}`)
      const data = await response.json()
      setSlots(data.slots || [])
    } catch (error) {
      console.error('Failed to load slots:', error)
      toast({
        title: 'エラー',
        description: '予約可能時間の読み込みに失敗しました',
        variant: 'destructive'
      })
    }
  }

  async function handleSubmit() {
    if (!selectedSlot || !selectedMenu) {
      toast({
        title: 'エラー',
        description: '予約情報が不完全です',
        variant: 'destructive'
      })
      return
    }

    // 連絡先チェック
    if (contactInfo.contactChannels.includes('email') && !contactInfo.email) {
      toast({
        title: 'エラー',
        description: 'メール通知を希望する場合はメールアドレスを入力してください',
        variant: 'destructive'
      })
      return
    }

    if (contactInfo.contactChannels.includes('sms') && !contactInfo.phone) {
      toast({
        title: 'エラー',
        description: 'SMS通知を希望する場合は電話番号を入力してください',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: contactInfo.name,
          email: contactInfo.email || undefined,
          phone: contactInfo.phone || undefined,
          menu_id: selectedMenu.id,
          startISO: selectedSlot.start,
          staff_id: selectedSlot.staffId,
          contact_channels: contactInfo.contactChannels,
          turnstileToken: 'dummy-token-for-dev' // 開発用
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '予約に失敗しました')
      }

      toast({
        title: '予約完了',
        description: '予約が確定しました。確認メールをお送りしています。'
      })

      onSuccess?.(result.booking_id)

    } catch (error) {
      console.error('Booking failed:', error)
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '予約に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // 今日から2週間先までの日付オプション
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const date = dayjs().add(i + 1, 'day') // 明日から
    return {
      value: date.format('YYYY-MM-DD'),
      label: date.format('MM月DD日(ddd)')
    }
  })

  // 利用可能なスロットのみフィルタ
  const availableSlots = slots.filter(slot => slot.available)

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">ご予約フォーム</h1>
        <p className="mt-2 text-gray-600">
          ステップ {step}/4: {
            step === 1 ? '日時選択' :
            step === 2 ? 'メニュー選択' :
            step === 3 ? '担当者選択' :
            '連絡先入力'
          }
        </p>
      </div>

      {/* ステップ1: 日時選択 */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <Label htmlFor="date">ご希望日</Label>
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger>
                <SelectValue placeholder="日付を選択してください" />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedDate && (
            <div>
              <Label>施術メニュー</Label>
              <div className="grid gap-3 mt-2">
                {menus.map(menu => (
                  <div
                    key={menu.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedMenu?.id === menu.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedMenu(menu)}
                  >
                    <div className="font-medium">{menu.name}</div>
                    <div className="text-sm text-gray-600">
                      {menu.duration_min}分
                      {menu.description && ` - ${menu.description}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedDate || !selectedMenu}
            >
              次へ
            </Button>
          </div>
        </div>
      )}

      {/* ステップ2: 時間選択 */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                選択中: {formatDate(selectedDate)} / {selectedMenu?.name} ({selectedMenu?.duration_min}分)
              </p>
            </div>

            <Label>担当者選択（任意）</Label>
            <div className="mt-2 space-y-2">
              <div
                className={`p-3 border rounded-lg cursor-pointer ${
                  !selectedStaff ? 'border-primary bg-primary/5' : 'border-gray-200'
                }`}
                onClick={() => setSelectedStaff(null)}
              >
                おまかせ（自動で最適なスタッフを選択）
              </div>
              {staffs.map(staff => (
                <div
                  key={staff.id}
                  className={`p-3 border rounded-lg cursor-pointer ${
                    selectedStaff?.id === staff.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedStaff(staff)}
                >
                  {staff.name} 指名
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              戻る
            </Button>
            <Button onClick={() => setStep(3)}>
              時間を選択
            </Button>
          </div>
        </div>
      )}

      {/* ステップ3: 時間スロット選択 */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                選択中: {formatDate(selectedDate)} / {selectedMenu?.name}
                {selectedStaff && ` / ${selectedStaff.name}指名`}
              </p>
            </div>

            <Label>ご希望時間</Label>
            
            {availableSlots.length === 0 ? (
              <div className="mt-2 p-4 text-center text-gray-500 border rounded-lg">
                この条件では予約可能な時間がありません
              </div>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {availableSlots.map((slot, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer text-center ${
                      selectedSlot?.start === slot.start
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <div className="font-medium">
                      {dayjs(slot.start).format('HH:mm')}
                    </div>
                    <div className="text-xs text-gray-600">
                      {slot.staffName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              戻る
            </Button>
            <Button
              onClick={() => setStep(4)}
              disabled={!selectedSlot}
            >
              次へ
            </Button>
          </div>
        </div>
      )}

      {/* ステップ4: 連絡先入力 */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="font-medium mb-2">予約内容確認</p>
            <p className="text-sm text-gray-600">
              日時: {selectedSlot && formatDateTime(selectedSlot.start)}<br />
              メニュー: {selectedMenu?.name} ({selectedMenu?.duration_min}分)<br />
              担当: {selectedSlot?.staffName}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">お名前 *</Label>
              <Input
                id="name"
                type="text"
                value={contactInfo.name}
                onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="山田太郎"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={contactInfo.email}
                onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="example@email.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                type="tel"
                value={contactInfo.phone}
                onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="090-1234-5678"
              />
            </div>

            <div>
              <Label>通知方法</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email-notification"
                    checked={contactInfo.contactChannels.includes('email')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setContactInfo(prev => ({
                          ...prev,
                          contactChannels: [...prev.contactChannels, 'email']
                        }))
                      } else {
                        setContactInfo(prev => ({
                          ...prev,
                          contactChannels: prev.contactChannels.filter(c => c !== 'email')
                        }))
                      }
                    }}
                  />
                  <label htmlFor="email-notification" className="text-sm">
                    メール通知（確認メール・リマインダー）
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sms-notification"
                    checked={contactInfo.contactChannels.includes('sms')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setContactInfo(prev => ({
                          ...prev,
                          contactChannels: [...prev.contactChannels, 'sms']
                        }))
                      } else {
                        setContactInfo(prev => ({
                          ...prev,
                          contactChannels: prev.contactChannels.filter(c => c !== 'sms')
                        }))
                      }
                    }}
                  />
                  <label htmlFor="sms-notification" className="text-sm">
                    SMS通知（前日・当日リマインダー）
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>
              戻る
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !contactInfo.name || contactInfo.contactChannels.length === 0}
            >
              {loading ? '予約中...' : '予約を確定する'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}