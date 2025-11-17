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
  backImagePath?: string;
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
  const [showBackImageUpload, setShowBackImageUpload] = useState(false);
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BusinessCard[]>([]);
  const [searchExplanation, setSearchExplanation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const router = useRouter();

  const fetchCards = async () => {
    try {
      console.log('Fetching cards...');
      setIsLoadingCards(true);
      const response = await fetch('/api/cards');

      if (!response.ok) {
        console.error('Failed to fetch cards:', response.status);
        return;
      }

      const data = await response.json();
      console.log('Cards fetched:', data.cards?.length || 0);
      setCards(data.cards || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setIsLoadingCards(false);
    }
  };

  useEffect(() => {
    // Check authentication
    const auth = sessionStorage.getItem('authenticated');
    console.log('Auth check:', auth);

    if (auth === 'true') {
      setIsAuthenticated(true);
      // Fetch cards after setting authentication
      fetchCards();
    } else {
      router.push('/login');
    }
  }, [router]);

  // Also fetch cards when component becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        console.log('Page visible, refreshing cards...');
        fetchCards();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    let file = event.target.files?.[0];
    if (!file) return;

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
          setOcrProgress('');
          return;
        }
      }

      // Save front image and show back image upload modal
      setFrontImageFile(file);
      setShowBackImageUpload(true);
      setOcrProgress('');
    } catch (error) {
      console.error('Error processing front image:', error);
      alert('画像処理エラーが発生しました: ' + (error as Error).message);
      setOcrProgress('');
    }
  };

  const handleBackImageUpload = async (backFile: File | null) => {
    if (!frontImageFile) {
      alert('表の画像が見つかりません');
      return;
    }

    setIsUploading(true);
    setShowBackImageUpload(false);

    try {
      // Upload to server without OCR
      setOcrProgress('サーバーに保存中...');
      const formData = new FormData();
      formData.append('image', frontImageFile);
      if (backFile) {
        formData.append('backImage', backFile);
      }

      const response = await fetch('/api/cards', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        await fetchCards();
        setOcrProgress('');
        setFrontImageFile(null);
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert('検索クエリを入力してください');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSearchExplanation('');

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: searchQuery })
      });

      const data = await response.json();

      if (data.success) {
        setSearchResults(data.results);
        setSearchExplanation(data.explanation);
      } else {
        alert('検索に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (error) {
      console.error('Error searching:', error);
      alert('検索エラーが発生しました: ' + (error as Error).message);
    } finally {
      setIsSearching(false);
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
              <button
                onClick={() => setShowSearchModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md"
              >
                🔍 AI検索
              </button>
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
        {isLoadingCards ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">名刺を読み込み中...</h2>
            <div className="mt-4 w-full max-w-md mx-auto bg-gray-200 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📇</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">名刺がまだありません</h2>
            <p className="text-gray-900">「名刺を追加」ボタンから名刺をアップロードしてください</p>
            <p className="text-gray-700 text-sm mt-2">※HEIC形式（iPhone写真）も自動的にJPEGに変換されます</p>
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
                  <h3 className="font-bold text-lg text-gray-900 mb-1">
                    {card.fullName || '名前なし'}
                  </h3>
                  {card.position && (
                    <p className="text-sm text-gray-900">{card.position}</p>
                  )}
                  {card.companyName && (
                    <p className="text-sm text-gray-900 font-medium mt-2">{card.companyName}</p>
                  )}
                  {card.email && (
                    <p className="text-sm text-indigo-600 mt-2">{card.email}</p>
                  )}
                  {card.phone && (
                    <p className="text-sm text-gray-900 mt-1">{card.phone}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Back Image Upload Modal */}
      {showBackImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">裏面の画像</h2>
            <p className="text-gray-900 mb-4">
              裏面の画像もアップロードしますか？<br />
              （スキップも可能です）
            </p>

            {frontImageFile && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">表面の画像:</p>
                <div className="relative h-40 bg-gray-100 rounded-lg">
                  <Image
                    src={URL.createObjectURL(frontImageFile)}
                    alt="表面"
                    fill
                    className="object-contain p-2"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors text-center">
                裏面の画像を選択
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={async (e) => {
                    let backFile = e.target.files?.[0];
                    if (!backFile) return;

                    // Convert HEIC to JPEG if needed
                    if (backFile.type === 'image/heic' || backFile.type === 'image/heif' ||
                        backFile.name.toLowerCase().endsWith('.heic') || backFile.name.toLowerCase().endsWith('.heif')) {
                      try {
                        const heic2any = (await import('heic2any')).default;
                        const convertedBlob = await heic2any({
                          blob: backFile,
                          toType: 'image/jpeg',
                          quality: 0.9,
                        });
                        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                        backFile = new File([blob], backFile.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), {
                          type: 'image/jpeg',
                        });
                      } catch (conversionError) {
                        console.error('HEIC conversion failed:', conversionError);
                        alert('HEIC画像の変換に失敗しました。');
                        return;
                      }
                    }

                    handleBackImageUpload(backFile);
                  }}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => handleBackImageUpload(null)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                スキップして保存
              </button>
              <button
                onClick={() => {
                  setShowBackImageUpload(false);
                  setFrontImageFile(null);
                }}
                className="text-gray-500 hover:text-gray-700 px-4 py-2 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">AI検索 (Claude Sonnet 4.5)</h2>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    setSearchExplanation('');
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-900 mb-4">
                  例: 「銀行業界につながってそうな人」「東京にいる人」「エンジニア」など
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isSearching) {
                        handleSearch();
                      }
                    }}
                    placeholder="検索クエリを入力..."
                    className="flex-1 px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400"
                    disabled={isSearching}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSearching ? '検索中...' : '検索'}
                  </button>
                </div>
              </div>

              {searchExplanation && (
                <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="text-sm font-semibold text-blue-900 mb-1">検索結果の説明:</p>
                  <p className="text-sm text-blue-800">{searchExplanation}</p>
                </div>
              )}

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => {
                        setSelectedCard(card);
                        setShowSearchModal(false);
                      }}
                      className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-500 cursor-pointer transition-colors"
                    >
                      {card.imagePath && (
                        <div className="relative h-32 bg-gray-100 rounded mb-3">
                          <Image
                            src={card.imagePath}
                            alt={card.fullName || '名刺'}
                            fill
                            className="object-contain p-2"
                          />
                        </div>
                      )}
                      <h3 className="font-bold text-lg text-gray-900 mb-1">
                        {card.fullName || '名前なし'}
                      </h3>
                      {card.position && (
                        <p className="text-sm text-gray-900">{card.position}</p>
                      )}
                      {card.companyName && (
                        <p className="text-sm text-gray-900 font-medium mt-1">{card.companyName}</p>
                      )}
                      {card.email && (
                        <p className="text-sm text-indigo-600 mt-1">{card.email}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                !isSearching && searchQuery && (
                  <div className="text-center py-10 text-gray-500">
                    検索結果が見つかりませんでした
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedCard(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">名刺詳細</h2>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {selectedCard.imagePath && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">表面</p>
                    <div className="relative h-64 bg-gray-100 rounded-lg">
                      <Image
                        src={selectedCard.imagePath}
                        alt={selectedCard.fullName || '名刺 表面'}
                        fill
                        className="object-contain p-4"
                      />
                    </div>
                  </div>
                )}
                {selectedCard.backImagePath && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">裏面</p>
                    <div className="relative h-64 bg-gray-100 rounded-lg">
                      <Image
                        src={selectedCard.backImagePath}
                        alt={selectedCard.fullName || '名刺 裏面'}
                        fill
                        className="object-contain p-4"
                      />
                    </div>
                  </div>
                )}
              </div>

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
                      <span className="text-gray-900">{selectedCard.fullName}</span>
                    </div>
                  )}
                  {selectedCard.companyName && (
                    <div>
                      <span className="font-semibold text-gray-700">会社: </span>
                      <span className="text-gray-900">{selectedCard.companyName}</span>
                    </div>
                  )}
                  {selectedCard.department && (
                    <div>
                      <span className="font-semibold text-gray-700">部署: </span>
                      <span className="text-gray-900">{selectedCard.department}</span>
                    </div>
                  )}
                  {selectedCard.position && (
                    <div>
                      <span className="font-semibold text-gray-700">役職: </span>
                      <span className="text-gray-900">{selectedCard.position}</span>
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
                      <span className="text-gray-900">{selectedCard.mobile}</span>
                    </div>
                  )}
                  {selectedCard.address && (
                    <div>
                      <span className="font-semibold text-gray-700">住所: </span>
                      <span className="text-gray-900">{selectedCard.address}</span>
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
                      <p className="mt-1 text-gray-900">{selectedCard.notes}</p>
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
