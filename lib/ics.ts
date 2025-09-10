import * as ics from 'ics'
import { formatDateTime } from './time'
import dayjs from 'dayjs'

export interface ICSEventData {
  bookingId: string
  patientName: string
  menuName: string
  staffName: string
  startTime: string // ISO string
  endTime: string   // ISO string
  clinicName: string
  clinicAddress?: string
  description?: string
}

// ICSファイル生成
export function generateICS(eventData: ICSEventData): string | null {
  try {
    const start = dayjs(eventData.startTime)
    const end = dayjs(eventData.endTime)
    
    const event = {
      start: [
        start.year(),
        start.month() + 1, // ICSは1ベース
        start.date(),
        start.hour(),
        start.minute()
      ] as [number, number, number, number, number],
      end: [
        end.year(),
        end.month() + 1,
        end.date(),
        end.hour(),
        end.minute()
      ] as [number, number, number, number, number],
      title: `${eventData.menuName} - ${eventData.clinicName}`,
      description: [
        `予約者: ${eventData.patientName}`,
        `担当: ${eventData.staffName}`,
        `施術: ${eventData.menuName}`,
        eventData.description ? `詳細: ${eventData.description}` : '',
        ``,
        `予約ID: ${eventData.bookingId}`,
        `※ご不明点がございましたらお気軽にお問い合わせください。`
      ].filter(Boolean).join('\\n'),
      location: eventData.clinicAddress || eventData.clinicName,
      status: 'CONFIRMED' as const,
      busyStatus: 'BUSY' as const,
      organizer: {
        name: eventData.clinicName,
        email: process.env.EMAIL_FROM || 'noreply@example.com'
      },
      attendees: [
        {
          name: eventData.patientName,
          email: '', // 患者のメールアドレスが必要な場合は引数で受け取る
          rsvp: true,
          partstat: 'ACCEPTED' as const,
          role: 'REQ-PARTICIPANT' as const
        }
      ]
    }
    
    const { error, value } = ics.createEvent(event)
    
    if (error) {
      console.error('ICS generation error:', error)
      return null
    }
    
    return value || null
  } catch (error) {
    console.error('ICS generation failed:', error)
    return null
  }
}

// メール添付用のICSファイル情報
export interface ICSAttachment {
  filename: string
  content: string
  contentType: string
}

export function createICSAttachment(eventData: ICSEventData): ICSAttachment | null {
  const icsContent = generateICS(eventData)
  
  if (!icsContent) return null
  
  const filename = `reservation_${eventData.bookingId.slice(0, 8)}.ics`
  
  return {
    filename,
    content: icsContent,
    contentType: 'text/calendar; charset=utf-8'
  }
}

// カレンダー追加用のリンク生成（Google Calendar）
export function generateGoogleCalendarLink(eventData: ICSEventData): string {
  const start = dayjs(eventData.startTime).format('YYYYMMDDTHHmmss')
  const end = dayjs(eventData.endTime).format('YYYYMMDDTHHmmss')
  const title = encodeURIComponent(`${eventData.menuName} - ${eventData.clinicName}`)
  const details = encodeURIComponent([
    `予約者: ${eventData.patientName}`,
    `担当: ${eventData.staffName}`,
    `施術: ${eventData.menuName}`,
    eventData.description ? `詳細: ${eventData.description}` : '',
    ``,
    `予約ID: ${eventData.bookingId}`
  ].filter(Boolean).join('\n'))
  const location = encodeURIComponent(eventData.clinicAddress || eventData.clinicName)
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    dates: `${start}/${end}`,
    text: title,
    details: details,
    location: location,
    trp: 'false'
  })
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}