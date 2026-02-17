# 進捗ログ

## 2025-02-17: AI分析機能・Gemini文言削除

- [x] geminiService: エラーメッセージからGEMINI表記を削除
- [x] Dashboard: 「Powered by Gemini 3 Flash」フッターを削除
- [x] 未使用インポート（Type）を削除

## 2025-02-17: 管理者ダッシュボード法人選択のSupabase連携

- [x] App.tsx: organizationsForAdmin state 追加、getOrganizations() でSupabaseから取得
- [x] Dashboard / RespondentGrowthAnalysis に実データを渡すよう変更
- [x] loadOrganizationById の MOCK_ORGS フォールバックを削除
