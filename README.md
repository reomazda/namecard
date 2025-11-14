# CardConnect - 無料名刺管理アプリ

スマホで撮影した名刺を自動でOCR処理し、ダッシュボードで管理できる無料のWebアプリケーションです。

## 特徴

- 📸 **スマホカメラ対応**: 名刺をその場で撮影してアップロード
- 🤖 **自動OCR処理**: tesseract.jsによる日本語・英語対応の文字認識
- 📊 **ダッシュボード**: 見やすいカード形式での一覧表示
- ✏️ **編集機能**: OCR結果を手動で修正可能
- 🗑️ **削除機能**: 不要な名刺を簡単に削除
- 💾 **SQLiteデータベース**: 軽量で高速なローカルストレージ
- 🎨 **モダンUI**: Tailwind CSSによる洗練されたデザイン

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: SQLite + Prisma ORM
- **OCR**: tesseract.js (日本語・英語対応)
- **画像処理**: Sharp

## セットアップ

### 前提条件

- Node.js 18以上
- npm または yarn

### インストール

1. 依存パッケージをインストール:
```bash
npm install
```

2. データベースのマイグレーション:
```bash
npx prisma migrate dev
```

3. 開発サーバーを起動:
```bash
npm run dev
```

4. ブラウザで開く:
```
http://localhost:3000
```

## 使い方

### 1. 名刺をアップロード

1. トップページの「名刺を追加」ボタンをクリック
2. スマホのカメラで名刺を撮影（またはファイルから選択）
3. 自動的にOCR処理が実行され、名刺情報が抽出されます

### 2. 名刺の一覧表示

- ダッシュボードに名刺がカード形式で表示されます
- 各カードには名前、会社名、役職、メール、電話番号などが表示されます

### 3. 名刺の詳細表示

- カードをクリックすると詳細画面が表示されます
- 名刺画像と抽出された全ての情報を確認できます

### 4. 名刺の編集

1. 詳細画面で「編集」ボタンをクリック
2. OCRで誤認識された情報を手動で修正
3. 「保存」ボタンで変更を保存

### 5. 名刺の削除

1. 詳細画面で「削除」ボタンをクリック
2. 確認ダイアログで「OK」を選択

## OCRについて

### 対応言語
- 日本語
- 英語

### 抽出される情報
- 氏名
- 会社名
- 部署名
- 役職
- メールアドレス
- 電話番号
- 携帯電話番号
- 住所
- Webサイト

### OCR精度を上げるコツ
- 明るい場所で撮影する
- 名刺全体が写るように撮影する
- ピントを合わせる
- 影が入らないようにする
- 手ブレに注意する

## ディレクトリ構成

```
cardconnect/
├── app/
│   ├── api/
│   │   └── cards/           # 名刺管理API
│   │       ├── route.ts     # 一覧・作成API
│   │       └── [id]/
│   │           └── route.ts # 詳細・更新・削除API
│   ├── page.tsx             # メインダッシュボード
│   └── layout.tsx           # レイアウト
├── lib/
│   ├── prisma.ts            # Prismaクライアント
│   └── ocr.ts               # OCR処理ユーティリティ
├── prisma/
│   ├── schema.prisma        # データベーススキーマ
│   └── migrations/          # マイグレーションファイル
├── public/
│   └── uploads/             # アップロードされた画像
├── plan.md                  # 開発計画書
└── README.md                # このファイル
```

## データベーススキーマ

### User テーブル
- id: ユーザーID
- email: メールアドレス
- password: パスワード（ハッシュ化）
- username: ユーザー名
- createdAt: 作成日時
- updatedAt: 更新日時

### BusinessCard テーブル
- id: 名刺ID
- ownerId: 所有者ID
- fullName: 氏名
- companyName: 会社名
- department: 部署名
- position: 役職
- email: メールアドレス
- phone: 電話番号
- mobile: 携帯電話番号
- fax: FAX番号
- address: 住所
- website: Webサイト
- imagePath: 画像パス
- rawText: OCR生テキスト
- ocrJson: OCR結果JSON
- notes: メモ
- isShared: 共有フラグ
- createdAt: 作成日時
- updatedAt: 更新日時

## Vercelへのデプロイ

### 前提条件
- Vercelアカウント（無料）
- GitHubアカウント

### デプロイ手順

1. **GitHubリポジトリの作成**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/cardconnect.git
git push -u origin main
```

2. **Vercelにデプロイ**
   - [Vercel](https://vercel.com)にログイン
   - 「New Project」をクリック
   - GitHubリポジトリを選択
   - 環境変数を設定:
     - `APP_PASSWORD`: ログインパスワード（例: cardconnect2025）
     - `DATABASE_URL`: PostgreSQLの接続文字列（Vercel PostgresまたはNeon等）

3. **データベースのセットアップ（Vercel Postgres推奨）**
   - Vercelダッシュボードで「Storage」→「Create Database」→「Postgres」
   - 自動的に`DATABASE_URL`が環境変数に設定されます
   - Prismaマイグレーションを実行:
   ```bash
   npx prisma migrate deploy
   ```

4. **デプロイ完了**
   - デプロイが完了したら、提供されたURLにアクセス
   - ログインページが表示されます
   - 設定したパスワードでログイン

### 注意事項
- **SQLite vs PostgreSQL**: 本番環境（Vercel）ではPostgreSQLを使用してください。SQLiteはローカル開発のみ対応
- **環境変数**: `.env`ファイルの内容をVercelの環境変数に設定してください
- **画像保存**: Vercelはファイルシステムが一時的なため、大量の画像を保存する場合はCloudinaryやS3等の外部ストレージを推奨

## 今後の機能拡張予定

- [x] 簡易ログイン機能
- [x] 日本語・英語の氏名検出改善
- [ ] タグ機能
- [ ] 検索機能（氏名・会社名・メールアドレス等）
- [ ] CSVエクスポート
- [ ] vCardエクスポート
- [ ] チーム共有機能
- [ ] 名寄せ機能（重複検出）
- [ ] PWA対応（オフライン利用）
- [ ] より高精度なOCR（Google Cloud Vision API等）
- [ ] 外部ストレージ対応（Cloudinary/S3）

## トラブルシューティング

### OCR処理が遅い
- tesseract.jsは初回起動時に言語データをダウンロードするため、最初は時間がかかります
- 2回目以降は高速に動作します

### 画像がアップロードできない
- ファイルサイズが大きすぎる可能性があります（10MB以下を推奨）
- 対応フォーマット: JPEG, PNG, GIF, WebP

### データベースエラー
```bash
# マイグレーションをリセット
npx prisma migrate reset

# 再度マイグレーション
npx prisma migrate dev
```

## ライセンス

MIT License

## 作者

CardConnect Development Team

## 貢献

プルリクエストを歓迎します！バグ報告や機能リクエストはIssueからお願いします。
