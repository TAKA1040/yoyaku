'use client'

import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

function RescheduleContent() {
  // 元のコンポーネント内容をここに移動
  return <div>Loading...</div>
}

export default function ReschedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <RescheduleContent />
    </Suspense>
  )
}
