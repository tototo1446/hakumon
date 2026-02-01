# SupabaseダッシュボードからEdge Functionsをデプロイする方法

CLI経由でのデプロイが権限エラーで失敗する場合、Supabaseダッシュボードから直接デプロイできます。

## 手順

### 1. Supabaseダッシュボードにアクセス

1. https://app.supabase.com にアクセス
2. プロジェクト `hzukayhgfmuvkllvybac` を選択

### 2. Edge Functionsページに移動

1. 左サイドバーから「Edge Functions」をクリック
2. 「Create a new function」または「New Function」をクリック

### 3. 関数名を入力

- Function name: `send-password-reset-email`

### 4. コードをコピー＆ペースト

以下のコードをコピーして、エディタに貼り付けます：

```typescript
// Supabase Edge Function: パスワード再設定メール送信
// Resend APIを使用してメールを送信します

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, resetUrl, orgName, emailContent } = await req.json();

    if (!to || !subject || !resetUrl) {
      return new Response(
        JSON.stringify({ error: '必須パラメータが不足しています' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEYが設定されていません');
      return new Response(
        JSON.stringify({ error: 'メール送信サービスが設定されていません' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Resend APIを使用してメール送信
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'HAKUMON <onboarding@resend.dev>', // Resendのデフォルトドメイン（独自ドメイン設定後は変更）
        to: [to],
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0ea5e9;">HAKUMON パスワード再設定</h2>
            <p>${orgName || 'ユーザー'} 様</p>
            <p>パスワード再設定のリクエストを受け付けました。</p>
            <p>以下のリンクから新しいパスワードを設定してください：</p>
            <p style="margin: 20px 0;">
              <a href="${resetUrl}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">パスワードを再設定</a>
            </p>
            <p style="color: #666; font-size: 14px;">このリンクは1時間有効です。</p>
            <p style="color: #666; font-size: 14px;">このリクエストに心当たりがない場合は、このメールを無視してください。</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">©YOHAKU, inc.</p>
          </div>
        `,
        text: emailContent || `パスワード再設定のリクエストを受け付けました。\n\n以下のリンクから新しいパスワードを設定してください：\n${resetUrl}\n\nこのリンクは1時間有効です。`,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend APIエラー:', resendResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'メール送信に失敗しました', details: errorText }),
        {
          status: resendResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await resendResponse.json();
    console.log('メール送信成功:', result);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('エラー:', error);
    return new Response(
      JSON.stringify({ error: 'メール送信処理中にエラーが発生しました', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

### 5. 環境変数（Secrets）の設定

1. Edge Functionsページで「Settings」または「Secrets」タブをクリック
2. 「Add Secret」をクリック
3. 以下のシークレットを追加：
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_BYPMcN2w_84H3eUUsptPtUHbVuofFrZFQ`

### 6. デプロイ

1. 「Deploy」または「Save」ボタンをクリック
2. デプロイが完了するまで待ちます（数秒〜数分）

### 7. 動作確認

デプロイが完了したら、パスワード再設定機能を試してください。メールが正しく送信されるはずです。

## トラブルシューティング

### メールが送信されない場合

1. Supabaseダッシュボードの「Edge Functions」→「Logs」でエラーログを確認
2. Resend APIキーが正しく設定されているか確認（Secretsページで確認）
3. Resendダッシュボードで送信履歴を確認

### エラーログの確認方法

1. Supabaseダッシュボードで「Edge Functions」を開く
2. `send-password-reset-email`関数を選択
3. 「Logs」タブをクリック
4. エラーメッセージを確認

## 参考リンク

- [Supabase Edge Functions ドキュメント](https://supabase.com/docs/guides/functions)
- [Resend API ドキュメント](https://resend.com/docs)
