'use client';

import { useState } from 'react';

export default function MigratePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleMigrate = async () => {
    if (!confirm('既存のユーザーをadmin@driholdings.aeに更新しますか？')) {
      return;
    }

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await fetch('/api/migrate-user', {
        method: 'POST',
        headers: {
          'x-migration-secret': 'dev-migration-secret'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
      } else {
        setError(data.error || 'マイグレーションに失敗しました');
      }
    } catch (err: any) {
      setError('エラーが発生しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">データベース移行</h1>
          <p className="text-gray-600">既存ユーザーをadmin@driholdings.aeに更新</p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">注意事項</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>既存のユーザー（default@cardconnect.local）をadmin@driholdings.aeに変更します</li>
                  <li>パスワードは環境変数APP_PASSWORDの値が使用されます</li>
                  <li>このユーザーに紐づくすべての名刺データはそのまま保持されます</li>
                  <li>この操作は1回のみ実行してください</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={handleMigrate}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-4 rounded-lg transition-colors shadow-md text-lg"
          >
            {loading ? '実行中...' : 'マイグレーションを実行'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            <p className="font-semibold">エラー</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            <p className="font-semibold mb-2">✅ {result.message}</p>
            {result.user && (
              <div className="text-sm space-y-1">
                <p><strong>メールアドレス:</strong> {result.user.email}</p>
                <p><strong>ユーザー名:</strong> {result.user.username}</p>
                {result.user.cardCount !== undefined && (
                  <p><strong>名刺数:</strong> {result.user.cardCount}枚</p>
                )}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-green-300">
              <p className="text-sm">
                <strong>次のステップ:</strong>
                <br />
                <a href="/login" className="text-indigo-600 hover:text-indigo-800 underline">
                  ログインページ
                </a>
                から以下の情報でログインしてください：
              </p>
              <div className="mt-2 bg-white p-3 rounded border border-green-200">
                <p className="text-sm"><strong>メールアドレス:</strong> admin@driholdings.ae</p>
                <p className="text-sm"><strong>パスワード:</strong> cardconnect2025</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/login" className="text-indigo-600 hover:text-indigo-800 text-sm">
            ← ログインページに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
