# 進捗ログ

## 2025-02-26: 公開アンケートリンクが開けない問題の修正

- [x] saveSurveyToSupabase: アンケートをSupabaseに保存（公開リンク用）
- [x] 新規アンケート作成時にUUIDを使用（Supabaseのid形式に合わせる）
- [x] 保存・編集・公開切替時にSupabaseへ同期
- [x] make_surveys_created_by_nullable.sql: created_by を NULL 許容に変更（要実行）

## 2025-02-26: 新規アンケート作成時に内容編集画面を表示

- [x] handleOpenAddModal: モーダルではなくSurveyEditorを直接表示
- [x] handleSaveFromEditor: 新規アンケート（未登録）の場合は一覧に追加
- [x] SurveyEditor: 保存時にタイトル未入力の場合はアラート表示
- [x] 編集ボタンによる後からの編集は従来どおり

## 2025-02-17: AI分析機能・Gemini文言削除

- [x] geminiService: エラーメッセージからGEMINI表記を削除
- [x] Dashboard: 「Powered by Gemini 3 Flash」フッターを削除
- [x] 未使用インポート（Type）を削除

## 2025-02-26: レスポンシブ対応

- [x] index.css: 横スクロール防止、セーフエリア対応
- [x] Layout: メインコンテンツ overflow 改善、パディング調整
- [x] Dashboard: グリッド・チャート・統計カードのレスポンシブ調整
- [x] Login: セーフエリア、min-w-0
- [x] OrgModal/UserModal: モバイルでフル幅・下から表示、スクロール可能に
- [x] AdminView/RespondentGrowthAnalysis: max-w-full, min-w-0

## 2025-02-26: AI戦略アドバイスのデータ閾値・法人別カスタム・手動分析

- [x] 自動分析を廃止：タブ移動等で勝手に分析しない
- [x] 分析結果をlocalStorageに保存、法人切り替え時に復元
- [x] ボタン文言：「分析」（初回）／「再分析」（既存あり）、クリック時のみ実行
- [x] add_min_required_respondents_to_organizations.sql: マイグレーション追加
- [x] types.ts: Organization に minRequiredRespondents 追加
- [x] organizationService: 取得・更新・作成で minRequiredRespondents を扱う
- [x] Dashboard: 閾値未満では分析せず「回答者数がN名に達するまで…」メッセージ表示
- [x] OrgModal: 法人編集に「AI戦略アドバイスに必要な最小回答者数」入力欄追加

## 2025-02-23: ツールロゴの変更

- [x] Layout.tsx, Login.tsx: ロゴを `/YOHAKU_CMYK_1_main.jpg` に変更

## 2025-02-17: 管理者ダッシュボード法人選択のSupabase連携

- [x] App.tsx: organizationsForAdmin state 追加、getOrganizations() でSupabaseから取得
- [x] Dashboard / RespondentGrowthAnalysis に実データを渡すよう変更
- [x] loadOrganizationById の MOCK_ORGS フォールバックを削除
