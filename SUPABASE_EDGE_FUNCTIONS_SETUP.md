# Supabase Edge Functions セットアップガイド

パスワード再設定メール送信機能を有効にするために、Supabase Edge Functionsをセットアップする必要があります。

## 前提条件

- Supabase CLIがインストールされていること
- Resend APIキーを取得済みであること

## セットアップ手順

### 1. Supabase CLIのインストール

**macOSの場合（推奨）:**

```bash
brew install supabase/tap/supabase
```

**Homebrewがインストールされていない場合:**

Homebrewをインストール:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

その後、Supabase CLIをインストール:
```bash
brew install supabase/tap/supabase
```

**npmを使用する場合（Node.js 20以上が必要）:**

プロジェクトのローカル依存関係としてインストール:
```bash
npm install supabase --save-dev
```

その後、`npx supabase`でコマンドを実行します。

**npxで直接実行する場合（インストール不要）:**

```bash
npx supabase --help
```

### 2. Supabaseにログイン

```bash
cd /Users/p10516/Desktop/個人用/HAKUMON
supabase login
```

ブラウザが開き、Supabaseアカウントでログインする必要があります。

### 3. プロジェクトをリンク

```bash
supabase link --project-ref hzukayhgfmuvkllvybac
```

（`hzukayhgfmuvkllvybac`は`.env.local`の`VITE_SUPABASE_URL`から取得できます）

### 4. 環境変数の設定（Resend APIキー）

CLIから設定（推奨）:

```bash
supabase secrets set RESEND_API_KEY=re_BYPMcN2w_84H3eUUsptPtUHbVuofFrZFQ
```

または、Supabaseダッシュボードで設定：

1. https://app.supabase.com にアクセス
2. プロジェクトを選択
3. 「Settings」→「Edge Functions」→「Secrets」に移動
4. 以下のシークレットを追加：
   - `RESEND_API_KEY`: Resend APIキー（`re_`で始まる文字列）

### 5. Edge Functionsをデプロイ

```bash
supabase functions deploy send-password-reset-email
```

### 6. 動作確認

パスワード再設定機能を使用して、メールが正しく送信されることを確認してください。

## トラブルシューティング

### Edge Functionsがデプロイできない場合

1. Supabase CLIが最新バージョンであることを確認：
   ```bash
   supabase --version
   ```

2. プロジェクトが正しくリンクされているか確認：
   ```bash
   supabase status
   ```

### メールが送信されない場合

1. Supabaseダッシュボードの「Edge Functions」→「Logs」でエラーログを確認
2. Resend APIキーが正しく設定されているか確認
3. Resendダッシュボードで送信履歴を確認

### CORSエラーが発生する場合

`supabase/functions/_shared/cors.ts`ファイルが正しく配置されているか確認してください。

## 参考リンク

- [Supabase Edge Functions ドキュメント](https://supabase.com/docs/guides/functions)
- [Resend API ドキュメント](https://resend.com/docs)
