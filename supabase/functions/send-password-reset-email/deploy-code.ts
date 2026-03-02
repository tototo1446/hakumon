import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, resetUrl, orgName, emailContent } = await req.json();

    if (!to || !subject || !resetUrl) {
      return new Response(
        JSON.stringify({ error: "必須パラメータが不足しています" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEYが設定されていません");
      return new Response(
        JSON.stringify({ error: "メール送信サービスが設定されていません" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const displayName = orgName || "ユーザー";
    const htmlBody = [
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">',
      '<h2 style="color: #0ea5e9;">YOHAKU パスワード再設定</h2>',
      "<p>" + displayName + " 様</p>",
      "<p>パスワード再設定のリクエストを受け付けました。</p>",
      "<p>以下のリンクから新しいパスワードを設定してください：</p>",
      '<p style="margin: 20px 0;">',
      '<a href="' + resetUrl + '" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">パスワードを再設定</a>',
      "</p>",
      '<p style="color: #666; font-size: 14px;">このリンクは1時間有効です。</p>',
      '<p style="color: #666; font-size: 14px;">このリクエストに心当たりがない場合は、このメールを無視してください。</p>',
      '<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">',
      '<p style="color: #999; font-size: 12px;">&copy;YOHAKU, inc.</p>',
      "</div>",
    ].join("\n");

    const textBody = emailContent || "パスワード再設定のリクエストを受け付けました。\n\n以下のリンクから新しいパスワードを設定してください：\n" + resetUrl + "\n\nこのリンクは1時間有効です。";

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "YOHAKU <onboarding@resend.dev>",
        to: [to],
        subject: subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend APIエラー:", resendResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "メール送信に失敗しました", details: errorText }),
        {
          status: resendResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await resendResponse.json();
    console.log("メール送信成功:", result);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("エラー:", error);
    return new Response(
      JSON.stringify({ error: "メール送信処理中にエラーが発生しました", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
