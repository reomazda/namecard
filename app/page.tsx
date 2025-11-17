'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface BusinessCard {
  id: string;
  fullName?: string;
  companyName?: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  website?: string;
  imagePath?: string;
  notes?: string;
  createdAt: string;
}

export default function Dashboard() {
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<BusinessCard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRunningOcr, setIsRunningOcr] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const auth = sessionStorage.getItem('authenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchCards();
    } else {
      router.push('/login');
    }
  }, [router]);

  const fetchCards = async () => {
    try {
      const response = await fetch('/api/cards');
      const data = await response.json();
      setCards(data.cards || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    let file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Convert HEIC to JPEG if needed
      if (file.type === 'image/heic' || file.type === 'image/heif' ||
          file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        setOcrProgress('HEIC画像をJPEGに変換中...');
        try {
          // Dynamically import heic2any only when needed (client-side only)
          const heic2any = (await import('heic2any')).default;

          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9,
          });

          // heic2any returns Blob or Blob[], handle both cases
          const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

          // Create a new File object from the converted Blob
          file = new File([blob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), {
            type: 'image/jpeg',
          });
          console.log('HEIC converted to JPEG successfully');
        } catch (conversionError) {
          console.error('HEIC conversion failed:', conversionError);
          alert('HEIC画像の変換に失敗しました。別の画像を試してください。');
          return;
        }
      }

      // Upload to server without OCR
      setOcrProgress('サーバーに保存中...');
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/cards', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        await fetchCards();
        setOcrProgress('');
        alert('名刺が正常にアップロードされました！カード詳細からOCRを実行できます。');
      } else {
        const errorDetails = [
          'アップロードに失敗しました',
          data.error ? `エラー: ${data.error}` : '',
          data.details ? `詳細: ${data.details}` : '',
          data.type ? `タイプ: ${data.type}` : ''
        ].filter(Boolean).join('\n');

        console.error('Upload failed:', data);
        alert(errorDetails);
      }
    } catch (error) {
      console.error('Error uploading card:', error);
      alert('アップロードエラーが発生しました: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
      setOcrProgress('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この名刺を削除しますか？')) return;

    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchCards();
        setSelectedCard(null);
        alert('名刺が削除されました');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('削除エラーが発生しました');
    }
  };

  const handleUpdate = async (card: BusinessCard) => {
    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(card)
      });

      if (response.ok) {
        await fetchCards();
        setIsEditing(false);
        alert('名刺が更新されました');
      }
    } catch (error) {
      console.error('Error updating card:', error);
      alert('更新エラーが発生しました');
    }
  };

  const handleOcr = async (card: BusinessCard) => {
    if (!card.imagePath) {
      alert('画像が見つかりません');
      return;
    }

    setIsRunningOcr(true);
    setOcrProgress('Claude Sonnet 4.5で名刺を解析中...');

    try {
      // Fetch the image from S3
      const imageResponse = await fetch(card.imagePath);
      const imageBlob = await imageResponse.blob();

      // Create FormData and append the image
      const formData = new FormData();
      formData.append('image', imageBlob, 'card.jpg');

      // Call OCR API
      const ocrResponse = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      });

      const ocrData = await ocrResponse.json();

      if (!ocrData.success) {
        const errorDetails = [
          'OCR処理に失敗しました',
          `エラー: ${ocrData.error || '不明なエラー'}`,
          ocrData.details ? `詳細: ${ocrData.details}` : '',
          ocrData.apiError ? `API Error: ${JSON.stringify(ocrData.apiError)}` : ''
        ].filter(Boolean).join('\n');

        console.error('OCR Error:', ocrData);
        alert(errorDetails);
        return;
      }

      const cardInfo = ocrData.cardInfo;

      // Update card with OCR data
      setOcrProgress('カード情報を更新中...');
      const updateResponse = await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: cardInfo.fullName,
          companyName: cardInfo.companyName,
          department: cardInfo.department,
          position: cardInfo.position,
          email: cardInfo.email,
          phone: cardInfo.phone,
          mobile: cardInfo.mobile,
          address: cardInfo.address,
          website: cardInfo.website,
          rawText: ocrData.rawText,
          ocrJson: JSON.stringify(cardInfo)
        })
      });

      const updateData = await updateResponse.json();

      if (updateData.success) {
        await fetchCards();
        // Update selected card with new data
        setSelectedCard(updateData.card);
        setOcrProgress('');
        alert('OCR処理が完了しました！');
      } else {
        alert('カード情報の更新に失敗しました');
      }
    } catch (error) {
      console.error('Error running OCR:', error);
      alert('OCR処理エラーが発生しました: ' + (error as Error).message);
    } finally {
      setIsRunningOcr(false);
      setOcrProgress('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('authenticated');
    router.push('/login');
  };

  if (!isAuthenticated) {
    return null; // Show nothing while redirecting
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-indigo-600">CardConnect</h1>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md">
                {isUploading ? ocrProgress || '処理中...' : '+ 名刺を追加'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress indicator */}
      {isUploading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded">
            <p className="font-medium">{ocrProgress}</p>
            <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {cards.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📇</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">名刺がまだありません</h2>
            <p className="text-gray-500">「名刺を追加」ボタンから名刺をアップロードしてください</p>
            <p className="text-gray-400 text-sm mt-2">※HEIC形式（iPhone写真）も自動的にJPEGに変換されます</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
              >
                {card.imagePath && (
                  <div className="relative h-48 bg-gray-100">
                    <Image
                      src={card.imagePath}
                      alt={card.fullName || '名刺'}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800 mb-1">
                    {card.fullName || '名前なし'}
                  </h3>
                  {card.position && (
                    <p className="text-sm text-gray-600">{card.position}</p>
                  )}
                  {card.companyName && (
                    <p className="text-sm text-gray-700 font-medium mt-2">{card.companyName}</p>
                  )}
                  {card.email && (
                    <p className="text-sm text-indigo-600 mt-2">{card.email}</p>
                  )}
                  {card.phone && (
                    <p className="text-sm text-gray-600 mt-1">{card.phone}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedCard(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-800">名刺詳細</h2>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {selectedCard.imagePath && (
                <div className="relative h-64 bg-gray-100 rounded-lg mb-6">
                  <Image
                    src={selectedCard.imagePath}
                    alt={selectedCard.fullName || '名刺'}
                    fill
                    className="object-contain p-4"
                  />
                </div>
              )}

              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={selectedCard.fullName || ''}
                    onChange={(e) => setSelectedCard({ ...selectedCard, fullName: e.target.value })}
                    placeholder="氏名"
                    className="w-full px-4 py-2 border rounded-lg text-gray-900 placeholder-gray-400"
                  />
                  <input
                    type="text"
                    value={selectedCard.companyName || ''}
                    onChange={(e) => setSelectedCard({ ...selectedCard, companyName: e.target.value })}
                    placeholder="会社名"
                    className="w-full px-4 py-2 border rounded-lg text-gray-900 placeholder-gray-400"
                  />
                  <input
                    type="text"
                    value={selectedCard.position || ''}
                    onChange={(e) => setSelectedCard({ ...selectedCard, position: e.target.value })}
                    placeholder="役職"
                    className="w-full px-4 py-2 border rounded-lg text-gray-900 placeholder-gray-400"
                  />
                  <input
                    type="email"
                    value={selectedCard.email || ''}
                    onChange={(e) => setSelectedCard({ ...selectedCard, email: e.target.value })}
                    placeholder="メールアドレス"
                    className="w-full px-4 py-2 border rounded-lg text-gray-900 placeholder-gray-400"
                  />
                  <input
                    type="tel"
                    value={selectedCard.phone || ''}
                    onChange={(e) => setSelectedCard({ ...selectedCard, phone: e.target.value })}
                    placeholder="電話番号"
                    className="w-full px-4 py-2 border rounded-lg text-gray-900 placeholder-gray-400"
                  />
                  <textarea
                    value={selectedCard.notes || ''}
                    onChange={(e) => setSelectedCard({ ...selectedCard, notes: e.target.value })}
                    placeholder="メモ"
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg text-gray-900 placeholder-gray-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(selectedCard)}
                      className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedCard.fullName && (
                    <div>
                      <span className="font-semibold text-gray-700">氏名: </span>
                      <span>{selectedCard.fullName}</span>
                    </div>
                  )}
                  {selectedCard.companyName && (
                    <div>
                      <span className="font-semibold text-gray-700">会社: </span>
                      <span>{selectedCard.companyName}</span>
                    </div>
                  )}
                  {selectedCard.department && (
                    <div>
                      <span className="font-semibold text-gray-700">部署: </span>
                      <span>{selectedCard.department}</span>
                    </div>
                  )}
                  {selectedCard.position && (
                    <div>
                      <span className="font-semibold text-gray-700">役職: </span>
                      <span>{selectedCard.position}</span>
                    </div>
                  )}
                  {selectedCard.email && (
                    <div>
                      <span className="font-semibold text-gray-700">メール: </span>
                      <a href={`mailto:${selectedCard.email}`} className="text-indigo-600 hover:underline">
                        {selectedCard.email}
                      </a>
                    </div>
                  )}
                  {selectedCard.phone && (
                    <div>
                      <span className="font-semibold text-gray-700">電話: </span>
                      <a href={`tel:${selectedCard.phone}`} className="text-indigo-600 hover:underline">
                        {selectedCard.phone}
                      </a>
                    </div>
                  )}
                  {selectedCard.mobile && (
                    <div>
                      <span className="font-semibold text-gray-700">携帯: </span>
                      <span>{selectedCard.mobile}</span>
                    </div>
                  )}
                  {selectedCard.address && (
                    <div>
                      <span className="font-semibold text-gray-700">住所: </span>
                      <span>{selectedCard.address}</span>
                    </div>
                  )}
                  {selectedCard.website && (
                    <div>
                      <span className="font-semibold text-gray-700">Web: </span>
                      <a href={selectedCard.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        {selectedCard.website}
                      </a>
                    </div>
                  )}
                  {selectedCard.notes && (
                    <div>
                      <span className="font-semibold text-gray-700">メモ: </span>
                      <p className="mt-1 text-gray-600">{selectedCard.notes}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleOcr(selectedCard)}
                      disabled={isRunningOcr || !selectedCard.imagePath}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isRunningOcr ? ocrProgress : 'OCR実行 (Claude Sonnet 4.5)'}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(selectedCard.id)}
                        className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
