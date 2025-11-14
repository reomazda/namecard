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

## ステップ3: Vercelでデプロイ

1. https://vercel.com にログイン
2. 「New Project」をクリック
3. GitHubリポジトリ「cardconnect」を選択
4. 「Environment Variables」に以下を追加:
   - `DATABASE_URL` = Supabaseの接続文字列（ステップ2でコピーしたもの）
   - `APP_PASSWORD` = ログイン用パスワード（例: cardconnect2025）
5. 「Deploy」をクリック

## ステップ4: マイグレーションの実行

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

## ステップ5: 動作確認

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

### 画像がアップロードできない場合

Vercelでは `/public` ディレクトリが読み取り専用です。大量の画像を保存する場合は、以下のいずれかを使用してください：

- **Cloudinary**（無料枠あり）
- **Vercel Blob**（有料）
- **AWS S3**（無料枠あり）

## 環境変数まとめ

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `DATABASE_URL` | Supabase PostgreSQL接続文字列 | `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres` |
| `APP_PASSWORD` | アプリログイン用パスワード | `cardconnect2025` |

## 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
