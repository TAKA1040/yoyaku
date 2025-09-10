import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            予約管理システム
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            クリニック・整骨院向け
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* 患者向け予約 */}
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              ご予約はこちら
            </h2>
            <p className="text-gray-600 mb-6">
              オンラインで簡単に予約できます。
            </p>
            <Link 
              href="/booking"
              className="inline-block px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-lg font-medium"
            >
              予約を取る
            </Link>
          </div>

          {/* スタッフ向け管理 */}
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              スタッフ管理画面
            </h2>
            <p className="text-gray-600 mb-6">
              予約の確認、変更、キャンセル。
            </p>
            <Link 
              href="/staff"
              className="inline-block px-8 py-3 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 text-lg font-medium"
            >
              スタッフメニュー
            </Link>
          </div>
        </div>

        <div className="text-center mt-16">
          <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📅 営業時間
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">月曜日〜土曜日</p>
                <p className="text-gray-600">9:00 - 18:00</p>
              </div>
              <div>
                <p className="font-medium">日曜日・祝日</p>
                <p className="text-gray-600">休診</p>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              ※予約時間の10分前にはお越しください
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
