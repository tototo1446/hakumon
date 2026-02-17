# タスク: AI分析機能の実装とGemini文言の削除

## 概要
- APIキー設定済みのため、AI分析機能を有効化
- UI上の「Gemini」表記を削除

## 実装計画

1. **geminiService.ts**
   - ユーザー向けエラーメッセージから「GEMINI_API_KEY」等の表記を削除
   - 汎用的な「APIキー」表記に変更

2. **components/Dashboard.tsx**
   - 「Powered by Gemini 3 Flash」フッターを削除または汎用表記に変更
   - タイトル「AI 分析アドバイス」はそのまま（Gemini表記なし）

3. **動作確認**
   - VITE_GEMINI_API_KEY が .env.local に設定済みであることを確認済み

---

# タスク: 管理者ダッシュボードの法人選択をSupabase連携に変更

## 概要
- 法人選択ドロップダウンがMOCK_ORGS（ハードコード）だった問題を修正
- Supabaseから実際に登録された法人一覧を取得して表示

## 実装計画

1. **App.tsx**
   - organizationsForAdmin state を追加
   - システム管理者ログイン時に getOrganizations() でSupabaseから法人一覧を取得
   - Dashboard / RespondentGrowthAnalysis に organizationsForAdmin を渡す（MOCK_ORGS の代わり）
   - loadOrganizationById の MOCK_ORGS フォールバックを削除
