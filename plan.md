# 無料名刺管理アプリ 開発計画書 v2（クラウド簡易運用）

この版では、技術的な抜け漏れ（UUID拡張、updated_atの自動更新、検索インデックス等）とスコープの曖昧さを修正し、無料運用を前提とした現実的な構成にアップデートしました。

## プロジェクト概要

### プロジェクト名
**CardConnect**（仮称）

### 目的
個人事業主・中小企業向けに、無料枠で運用可能な名刺管理Webアプリを提供し、手間の少ない取り込み・検索・共有を実現する。

### ターゲット
- 個人事業主 / 小規模スタートアップ
- 中小企業の営業担当
- 名刺管理コストを抑えたいビジネスパーソン

### 成功基準（MVP Done）
- メール+パスワードで登録/ログインできる（メール認証含む）
- 名刺画像をアップロードし、OCRで主要項目（氏名/会社/メール/電話）が自動抽出される
- 一覧/詳細/編集/削除/タグ付け/検索（氏名・会社・メールの部分一致）が利用可能
- CSVエクスポートが可能
- 無料枠内で画像保存・API利用量が収まる（課金なし）

### スコープ外（MVP）
- 高精度の名寄せ自動統合（候補提示のみ）
- 双方向連携（Google連絡先やカレンダーの自動同期）
- 大規模チーム運用（役割細分化・監査ログの詳細出力）

---

## フェーズ計画

「PCを落としていても動く」を満たすため、クラウド上の単一VM（もしくは同等のコンテナ実行環境）で、最短で動く構成に寄せています。外部連携や高度な権限管理は後回しにします。

### フェーズ1: MVP
1. 認証/登録
   - [ ] メール+パスワード登録、ログイン/ログアウト
   - [ ] メール認証、パスワードリセット
2. 名刺取り込み/OCR
   - [ ] 画像アップロード（スマホ/PC）
   - [ ] OCRで主要項目抽出、手動補正UI
3. 管理/検索
   - [ ] 一覧/詳細/編集/削除/タグ付け
   - [ ] 氏名/会社/メールの部分一致検索、並び替え
4. エクスポート
   - [ ] CSVエクスポート（選択/全件）
5. 基盤
   - [ ] 監査/エラーログ、レート制限、S3互換ストレージ

受け入れ基準: 上記機能で新規ユーザーが10枚の名刺を取り込み、検索・タグ付け・CSV出力まで完了できる。

### フェーズ2: 付加価値
- [ ] vCardエクスポート
- [ ] 簡易共有（ユーザー間共有/チーム共有、無料は100枚まで）
- [ ] オンライン名刺（QR/URL）
- [ ] フォローアップ用リマインダー（メール通知）

### フェーズ3: 高度機能
- [ ] 名寄せ候補提示/手動統合
- [ ] PWA/オフライン/プッシュ通知
- [ ] 外部連携（Google連絡先、カレンダー）

---

## 技術選定（クラウド簡易運用）

- アプリ形態: 単一リポジトリ・単一クラウドVMで完結（低コスト）
- フロント/バックエンド: `Next.js (App Router)` + `TypeScript`
- DB: `SQLite`（Prisma使用、`updatedAt @updatedAt` で自動更新）
- ストレージ: ローカル `uploads/` をVMの永続ディスク/Dockerボリュームで保持
- OCR: `tesseract.js`（Node実行、日英対応）
- 認証: シンプルなCredentials認証（固定ユーザーで開始、SSOは後回し）
- デプロイ: クラウドVMで `docker-compose up -d`、`Caddy` または `nginx` + Let's Encrypt 自動TLS
- CI/CD: 任意（型チェック・ESLintのみでも可）。必要なら GitHub Actions→SSHデプロイ

将来の拡張（後で検討）:
- Postgres（Neon/Supabase）+ S3/R2 へ移行して耐障害性を改善
- クラウドOCR（Cloud Vision）をオプションで追加

---

## 非機能要件
- パフォーマンス: 一覧表示<1.5s（50件）, 検索<800ms（インデックス活用）
- 可用性: 無料枠の仕様内で安定稼働（スリープ時のUX配慮）
- セキュリティ: HTTPS必須、レート制限、CSRF/XSS対策、ストレージは署名付きURL
- プライバシー: OCRはデフォルトローカル（クラウドOCRは明示オプトイン）
- 監視: 重要イベントのログ記録（監査/エラー/指標）

---

## 主要API/ルーティング（概略）
- `POST /api/cards` 画像アップロード→OCR→下書き作成
- `GET /api/cards` 検索・並び替え・ページング
- `GET /api/cards/:id` 詳細取得
- `PATCH /api/cards/:id` 編集
- `DELETE /api/cards/:id` 削除
- `GET /api/export.csv` CSVエクスポート

備考: Next.js の Route Handlers で実装し、同一VM内で完結。認可はサーバ側で単純チェック。

---

## データベース設計（SQLite/Prisma）

Prisma モデル（概略）
```prisma
model User {
  id        String  @id @default(cuid())
  email     String  @unique
  password  String
  username  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  cards     BusinessCard[]
}

model BusinessCard {
  id          String   @id @default(cuid())
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id])
  fullName    String?
  companyName String?
  department  String?
  position    String?
  email       String?
  phone       String?
  mobile      String?
  fax         String?
  address     String?
  website     String?
  imagePath   String?  // uploads/ 内の相対パス
  rawText     String?  // OCR 生文字
  ocrJson     Json?
  fingerprint String?  @unique
  notes       String?
  isShared    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tags        CardTag[]
}

model Tag {
  id        String @id @default(cuid())
  ownerId   String
  owner     User   @relation(fields: [ownerId], references: [id])
  name      String
  color     String?
  createdAt DateTime @default(now())

  @@unique([ownerId, name])
}

model CardTag {
  cardId String
  tagId  String
  card   BusinessCard @relation(fields: [cardId], references: [id])
  tag    Tag          @relation(fields: [tagId], references: [id])
  @@id([cardId, tagId])
}
```

検索について: クラウド簡易運用では LIKE/前方一致で開始。必要に応じて SQLite FTS5 を採用。

---

## セキュリティ/プライバシー（クラウド簡易運用）
- ネットワーク: 80/443 のみ公開。SSHは鍵認証＋ポート変更、FWで自社IP制限
- TLS: `Caddy` か `nginx` + certbot で自動更新
- 認証: アプリ内Credentials（固定ユーザー）。管理画面のみ Basic 認証を重ね掛け可
- 権限: 最初は単一ユーザー想定（スキーマは複数ユーザー拡張可能）
- ストレージ: `uploads/` は永続ディスク。バックアップはオブジェクトストレージへ（R2/S3）
- レート制限: 画像アップロード/OCR/ログインに軽量実装
- OCR: ローカル実行。機微情報は外部送信しない

---

## 開発運用（クラウド簡易運用）
- ブランチ: main 直push可（小規模チーム想定）
- 品質: TypeCheck + ESLint のみ（pre-commit）
- リリース: SSH で `docker-compose pull && up -d`
- 監視: `docker logs` と VM のメトリクス（CPU/メモリ/ディスク）
- バックアップ: 週次で `sqlite.db` と `uploads/` を R2/S3 へ rsync/s3cmd

---

## リスクと対策（クラウド簡易運用）
- VM障害: 週次/日次バックアップ + VMスナップショット。復旧手順を手順化
- データ肥大: 画像を2MB以下へ圧縮、原本はアーカイブ。古い添付はR2へ退避
- OCR精度: 失敗時は手入力補正UIで回収。必要時に Cloud Vision をオプトイン
- 検索性能: 最初は LIKE、重くなれば FTS5。さらに必要なら Postgres へ移行

---

## タイムライン（クラウド展開の最短）
- Day 1: プロジェクト初期化（Next.js + Prisma + SQLite）、CRUD/画像アップロード
- Day 2: OCR組込み（tesseract.js）、編集UI、検索/タグ、CSV出力
- Day 3: docker-compose 化、Caddy/nginx でTLS、永続化（`uploads/`/`sqlite.db`）
- Day 4: クラウドVM用プロビジョニング（ユーザー/SSH/FW）、デプロイ、動作確認
- Day 5: 週次バックアップ（R2/S3）をcron化、監視最小設定（ディスク/CPU）

---

## 備考（クラウド簡易運用の注記）
- 単一クラウドVMで完結（Next.js + Prisma/SQLite + tesseract + 逆プロキシ）
- `updatedAt` は Prisma の `@updatedAt` で自動化
- 検索は LIKE で開始（必要になれば FTS5）。更に必要なら Postgres 移行
- 共有/チーム機能は後回し（スキーマは将来拡張可能な形を維持）
- デプロイは `docker-compose` 前提、Caddy/nginx で自動TLS
