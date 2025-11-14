# Vercel + Supabase デプロイ手順

## 前提条件
- Vercelアカウント
- Supabaseアカウント
- GitHubリポジトリに push 済み

## ステップ1: Supabaseでデータベースを作成

1. https://supabase.com にログイン
2. 「New project」をクリック
3. プロジェクト名を入力（例: cardconnect）
4. データベースパスワードを設定（メモしておく）
5. リージョンを選択（例: Tokyo）
6. 「Create new project」をクリック

## ステップ2: Supabaseの接続文字列を取得

1. Supabaseプロジェクトのダッシュボードで「Settings」→「Database」を開く
2. 「Connection string」セクションで「URI」を選択
3. `[YOUR-PASSWORD]` を実際のパスワードに置き換える
4. 接続文字列をコピー（例: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`）

## ステップ3: AWS S3バケットを作成

1. https://console.aws.amazon.com/s3 にアクセス
2. 「バケットを作成」をクリック
3. バケット名を入力（例: cardconnect-images-your-name）
4. リージョンを選択（例: ap-northeast-1 Tokyo）
5. 「ACL を有効にする」を選択
6. 「パブリックアクセスをブロック」を**すべてオフ**にする（画像を公開アクセス可能にするため）
7. 「バケットを作成」をクリック
8. 作成したバケットを開き、「アクセス許可」タブ→「バケットポリシー」で以下を追加:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

（`your-bucket-name`を実際のバケット名に置き換える）

9. CORS設定を追加（重要！）:
   - 「アクセス許可」タブ→「Cross-Origin Resource Sharing (CORS)」で以下を追加:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

10. パブリックアクセスが機能しているか確認:
   - テスト画像を手動でアップロード
   - 画像のURLをブラウザで開いて表示されることを確認
   - 例: `https://your-bucket-name.s3.your-region.amazonaws.com/test.jpg`
   - もし403エラーが出る場合は、ステップ6の「パブリックアクセスをブロック」設定とステップ8のバケットポリシーを再確認

11. IAMユーザーを作成してアクセスキーを取得:
   - https://console.aws.amazon.com/iam にアクセス
   - 「ユーザー」→「ユーザーを追加」
   - ユーザー名を入力（例: cardconnect-uploader）
   - 「アクセスキー - プログラムによるアクセス」を選択
   - 「既存のポリシーを直接アタッチ」→「AmazonS3FullAccess」を選択
   - 「次へ」→「ユーザーの作成」
   - アクセスキーIDとシークレットアクセスキーをメモ

## ステップ4: Vercelでデプロイ

1. https://vercel.com にログイン
2. 「New Project」をクリック
3. GitHubリポジトリ「cardconnect」を選択
4. 「Environment Variables」に以下を追加:
   - `DATABASE_URL` = Supabaseの接続文字列（ステップ2でコピーしたもの）
   - `APP_PASSWORD` = ログイン用パスワード（例: cardconnect2025）
   - `OPENAI_API_KEY` = OpenAI APIキー（sk-proj-で始まる文字列）
   - `AWS_ACCESS_KEY_ID` = IAMユーザーのアクセスキーID
   - `AWS_SECRET_ACCESS_KEY` = IAMユーザーのシークレットアクセスキー
   - `AWS_REGION` = S3バケットのリージョン（例: ap-northeast-1）
   - `AWS_S3_BUCKET_NAME` = S3バケット名（例: cardconnect-images-your-name）
5. 「Deploy」をクリック

## ステップ5: マイグレーションの実行

デプロイが完了したら、自動的にPrismaのマイグレーションが実行されます（`npm run build`スクリプトに含まれています）。

もしエラーが発生した場合：

1. Vercel CLIをインストール:
```bash
npm install -g vercel
```

2. プロジェクトにログインしてリンク:
```bash
vercel login
vercel link
```

3. 環境変数を取得:
```bash
vercel env pull .env.production
```

4. マイグレーションを実行:
```bash
npx prisma migrate deploy
```

5. Vercelで再デプロイ:
```bash
vercel --prod
```

## ステップ6: 動作確認

1. VercelのURLにアクセス（例: https://cardconnect.vercel.app）
2. ログインページが表示されることを確認
3. 設定したパスワードでログイン
4. 名刺をアップロードしてテスト

## トラブルシューティング

### ビルドエラーが発生する場合

**エラー: `Prisma Client could not locate the Query Engine`**

→ `package.json`の`postinstall`スクリプトで`prisma generate`が実行されているか確認

**エラー: `DATABASE_URL environment variable is not set`**

→ Vercelの環境変数に`DATABASE_URL`が正しく設定されているか確認

### マイグレーションエラーが発生する場合

**エラー: `Migration failed`**

→ Supabaseのデータベースが起動しているか、接続文字列が正しいか確認

手動でマイグレーションを実行:
```bash
# ローカルでSupabaseのDATABASE_URLを設定
export DATABASE_URL="postgresql://postgres:..."

# マイグレーション実行
npx prisma migrate deploy
```

### 画像が表示されない（502エラー）場合

**原因**: S3バケットのパブリックアクセス設定が正しくない

**解決方法**:
1. S3画像URLに直接アクセスして確認:
   ```
   https://your-bucket-name.s3.your-region.amazonaws.com/cards/xxxxx.jpg
   ```
2. 403エラーが出る場合、以下を確認:
   - 「パブリックアクセスをブロック」がすべてオフになっているか
   - バケットポリシーが正しく設定されているか（ステップ3-8を参照）
3. S3コンソールで「アクセス許可」→「パブリックアクセス」が「オブジェクトはパブリック」になっているか確認

**注意**: 現在の設定では Next.js の画像最適化を無効化しています（`unoptimized: true`）。これにより、S3から直接画像を配信するため、502エラーが解消されます。

### 画像がアップロードできない場合

Vercelでは `/public` ディレクトリが読み取り専用です。大量の画像を保存する場合は、以下のいずれかを使用してください：

- **AWS S3**（無料枠あり、推奨）
- **Cloudinary**（無料枠あり）
- **Vercel Blob**（有料）

## 環境変数まとめ

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `DATABASE_URL` | Supabase PostgreSQL接続文字列 | `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres` |
| `APP_PASSWORD` | アプリログイン用パスワード | `cardconnect2025` |
| `OPENAI_API_KEY` | OpenAI APIキー（GPT-5.1 Vision使用） | `sk-proj-xxxxxxxxxxxxx` |
| `AWS_ACCESS_KEY_ID` | AWS IAMアクセスキーID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAMシークレットアクセスキー | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | S3バケットのリージョン | `ap-northeast-1` |
| `AWS_S3_BUCKET_NAME` | S3バケット名 | `cardconnect-images-your-name` |

## 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
