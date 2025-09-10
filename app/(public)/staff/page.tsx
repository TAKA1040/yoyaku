'use client'

import Link from 'next/link'
import { Calendar, Users, MessageSquare, Settings, BarChart3, Clock, Bell } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function StaffMenuPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            スタッフメニュー
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {process.env.NEXT_PUBLIC_APP_NAME || 'クリニック'} 管理システム
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* 予約管理 */}
          <Link 
            href="/manage"
            className="group bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              予約管理
            </h2>
            <p className="text-gray-600 mb-6">
              予約の確認、変更、キャンセル<br />
              タイムライン表示で一目で把握
            </p>
            <div className="inline-flex items-center text-blue-600 font-medium">
              管理画面を開く
              <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* 顧客連絡 */}
          <Link 
            href="/manage?panel=notification"
            className="group bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-200 transition-colors">
              <MessageSquare className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              顧客連絡
            </h2>
            <p className="text-gray-600 mb-6">
              LINE・メール・SMS<br />
              自動優先順位で確実に連絡
            </p>
            <div className="inline-flex items-center text-green-600 font-medium">
              通知機能を使う
              <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* 顧客管理 */}
          <div className="group bg-white rounded-lg shadow-lg p-8 text-center opacity-60">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              顧客管理
            </h2>
            <p className="text-gray-600 mb-6">
              顧客情報の登録・編集<br />
              来店履歴・連絡先管理
            </p>
            <div className="inline-flex items-center text-gray-400 font-medium">
              準備中
            </div>
          </div>

          {/* 売上分析 */}
          <div className="group bg-white rounded-lg shadow-lg p-8 text-center opacity-60">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              売上分析
            </h2>
            <p className="text-gray-600 mb-6">
              日別・月別売上<br />
              メニュー別分析・レポート
            </p>
            <div className="inline-flex items-center text-gray-400 font-medium">
              準備中
            </div>
          </div>

          {/* 勤務管理 */}
          <div className="group bg-white rounded-lg shadow-lg p-8 text-center opacity-60">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              勤務管理
            </h2>
            <p className="text-gray-600 mb-6">
              スタッフスケジュール<br />
              勤務時間・休暇管理
            </p>
            <div className="inline-flex items-center text-gray-400 font-medium">
              準備中
            </div>
          </div>

          {/* システム設定 */}
          <div className="group bg-white rounded-lg shadow-lg p-8 text-center opacity-60">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Settings className="h-8 w-8 text-gray-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              システム設定
            </h2>
            <p className="text-gray-600 mb-6">
              営業時間・メニュー設定<br />
              通知設定・バックアップ
            </p>
            <div className="inline-flex items-center text-gray-400 font-medium">
              準備中
            </div>
          </div>
        </div>

        {/* クイックアクション */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow p-6 max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🚀 クイックアクション
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link 
                href="/manage"
                className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Calendar className="h-4 w-4 mr-2" />
                今日の予約を確認
              </Link>
              <Link 
                href="/manage?panel=notification"
                className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Bell className="h-4 w-4 mr-2" />
                リマインダー送信
              </Link>
              <Link 
                href="/"
                className="flex items-center justify-center px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Users className="h-4 w-4 mr-2" />
                顧客ページに戻る
              </Link>
            </div>
          </div>
        </div>

        {/* フッター情報 */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <div className="bg-white rounded-lg shadow p-4 max-w-2xl mx-auto">
            <p className="mb-2">
              📊 <strong>今日の予約:</strong> 12件 | 
              📧 <strong>送信済み通知:</strong> 8件 | 
              👥 <strong>来店予定:</strong> 5名
            </p>
            <p>
              最終更新: {new Date().toLocaleString('ja-JP')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}