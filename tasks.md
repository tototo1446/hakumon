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

---

# タスク: AI戦略アドバイスのデータ閾値と法人別カスタム

## 概要
- 集計結果がない状態で「それっぽい分析」を表示しない
- 法人ごとに「何名のデータが集まったら分析可能か」をカスタム可能にする

## 実装計画

1. **DBマイグレーション** `add_min_required_respondents_to_organizations.sql`
   - organizations に min_required_respondents (INTEGER, DEFAULT 5) を追加

2. **types.ts**
   - Organization に minRequiredRespondents?: number を追加

3. **organizationService.ts**
   - getOrganizations / getOrganizationById: min_required_respondents をマッピング
   - updateOrganization / createOrganization: minRequiredRespondents を保存

4. **Dashboard.tsx**
   - 閾値: (viewingOrg || org).minRequiredRespondents ?? 5
   - orgResponses.length < 閾値 のとき: 分析を実行せず、適切なメッセージを表示
   - 「再生成」ボタンは閾値未満では無効化

5. **OrgModal.tsx**
   - 法人編集フォームに「AI分析に必要な最小回答者数」入力欄を追加

---

# タスク: ダッシュボードのデザイン修正とスコア説明ドキュメント

## 概要
- 添付画像を参考にレイアウト・構成を改善（カラーデザイン変更は不要・ライトテーマ維持）
- スコア算出根拠をわかりやすくまとめたドキュメントを作成

## 実装計画

1. **Layout.tsx**
   - カラーデザイン変更は不要のためスキップ

2. **Dashboard.tsx**
   - 既存のライトテーマを維持
   - KPIカード4枚を上部に配置（総合スコア、回答者数、総削減時間、削減率）
   - トレンド・変化率を示す矢印アイコン・情報アイコン追加
   - 5次元リテラシーをプログレスバー形式で表示（目標達成率風）
   - 2カラムレイアウト（チャート・プログレスバー）
   - 月次推移グラフを棒グラフ風に変更
   - 最新の活動（回答一覧）セクションを簡潔に

3. **docs/DASHBOARD_SCORE.md**（新規）
   - スコア算出根拠の説明
   - 5次元の意味と計算方法
   - 総合スコア・ランクの算出ロジック
