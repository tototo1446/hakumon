-- 検証用アンケートと回答データの挿入SQL
-- Supabase SQL Editorで実行してください
-- 3つの法人に対してそれぞれ1つのアンケートを作成し、各ユーザー（5名）の回答を追加します

-- ============================================
-- 注意: このSQLを実行する前に、surveysテーブルとsurvey_responsesテーブルが存在することを確認してください
-- テーブルが存在しない場合は、先にテーブルを作成する必要があります
-- ============================================

-- ============================================
-- 法人1: 株式会社テクノロジー・フロンティア (tech-frontier)
-- Organization ID: 550e8400-e29b-41d4-a716-446655440001
-- ============================================

-- アンケート1の作成
INSERT INTO public.surveys (id, title, description, questions, organization_id, created_by, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'AI活用状況アンケート',
  'AIツールの利用状況や活用レベルを調査するアンケートです。',
  '[
    {"id": "q-name-default", "title": "名前", "type": "text", "required": true, "placeholder": "お名前を入力してください"},
    {"id": "q1", "title": "AI活用の有無", "type": "radio", "required": true, "options": [{"id": "opt1-1", "label": "① ほぼ毎日使っている", "value": "daily"}, {"id": "opt1-2", "label": "② 週に数回使っている", "value": "weekly"}, {"id": "opt1-3", "label": "③ 月に数回使っている", "value": "monthly"}, {"id": "opt1-4", "label": "④ 使ったことはあるが、今は使っていない", "value": "used_before"}, {"id": "opt1-5", "label": "⑤ 使ったことがない", "value": "never"}]},
    {"id": "q2", "title": "主に利用しているAIツール（複数選択可）", "type": "checkbox", "required": false, "options": [{"id": "opt2-1", "label": "ChatGPT", "value": "chatgpt"}, {"id": "opt2-2", "label": "Claude", "value": "claude"}, {"id": "opt2-3", "label": "Gemini", "value": "gemini"}]},
    {"id": "q3", "title": "有料AIツールの利用状況", "type": "radio", "required": false, "options": [{"id": "opt3-1", "label": "① 個人で契約している", "value": "personal"}, {"id": "opt3-2", "label": "② 会社の補助で利用している", "value": "company_subsidy"}, {"id": "opt3-3", "label": "③ 無料版のみ使っている", "value": "free_only"}]},
    {"id": "q8", "title": "自己評価（現在のAIリテラシーレベル）", "type": "rank", "required": false, "options": [{"id": "opt8-1", "label": "ランク1（ビギナー）", "value": "rank1"}, {"id": "opt8-2", "label": "ランク2（ベーシック）", "value": "rank2"}, {"id": "opt8-3", "label": "ランク3（プラクティス）", "value": "rank3"}, {"id": "opt8-4", "label": "ランク4（アドバンス）", "value": "rank4"}, {"id": "opt8-5", "label": "ランク5（エキスパート）", "value": "rank5"}]}
  ]'::jsonb,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  (SELECT id FROM public.profiles WHERE organization_id = '550e8400-e29b-41d4-a716-446655440001'::uuid AND role = 'ORG_ADMIN' LIMIT 1),
  true,
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
);

-- 上記のsurvey_idを使用して回答を挿入（変数が使えないため、サブクエリを使用）
-- ユーザー1: 田中 健一（ORG_ADMIN、部長）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '田中 健一',
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '[
    {"questionId": "q-name-default", "value": "田中 健一", "type": "text"},
    {"questionId": "q1", "value": "daily", "type": "radio"},
    {"questionId": "q2", "value": ["chatgpt", "claude"], "type": "checkbox"},
    {"questionId": "q3", "value": "company_subsidy", "type": "radio"},
    {"questionId": "q8", "value": "rank4", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '25 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ユーザー2: 鈴木 美咲（USER、課長）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '鈴木 美咲',
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '[
    {"questionId": "q-name-default", "value": "鈴木 美咲", "type": "text"},
    {"questionId": "q1", "value": "weekly", "type": "radio"},
    {"questionId": "q2", "value": ["chatgpt"], "type": "checkbox"},
    {"questionId": "q3", "value": "free_only", "type": "radio"},
    {"questionId": "q8", "value": "rank3", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '20 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ユーザー3: 高橋 翔太（USER、主任）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '高橋 翔太',
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '[
    {"questionId": "q-name-default", "value": "高橋 翔太", "type": "text"},
    {"questionId": "q1", "value": "monthly", "type": "radio"},
    {"questionId": "q2", "value": ["gemini"], "type": "checkbox"},
    {"questionId": "q3", "value": "free_only", "type": "radio"},
    {"questionId": "q8", "value": "rank2", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '15 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ユーザー4: 佐藤 花子（USER、一般社員）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '佐藤 花子',
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '[
    {"questionId": "q-name-default", "value": "佐藤 花子", "type": "text"},
    {"questionId": "q1", "value": "used_before", "type": "radio"},
    {"questionId": "q2", "value": [], "type": "checkbox"},
    {"questionId": "q3", "value": "free_only", "type": "radio"},
    {"questionId": "q8", "value": "rank1", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '10 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ユーザー5: 山田 次郎（USER、一般社員）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '山田 次郎',
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '[
    {"questionId": "q-name-default", "value": "山田 次郎", "type": "text"},
    {"questionId": "q1", "value": "never", "type": "radio"},
    {"questionId": "q2", "value": [], "type": "checkbox"},
    {"questionId": "q3", "value": null, "type": "radio"},
    {"questionId": "q8", "value": "rank1", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '5 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ============================================
-- 法人2: グローバル・イノベーション・ソリューション (global-sol)
-- Organization ID: 550e8400-e29b-41d4-a716-446655440002
-- ============================================

-- アンケート2の作成
INSERT INTO public.surveys (id, title, description, questions, organization_id, created_by, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'AIツール導入効果調査',
  '社内でのAIツールの導入効果を測定するアンケートです。',
  '[
    {"id": "q-name-default", "title": "名前", "type": "text", "required": true, "placeholder": "お名前を入力してください"},
    {"id": "q1", "title": "AI活用の有無", "type": "radio", "required": true, "options": [{"id": "opt1-1", "label": "① ほぼ毎日使っている", "value": "daily"}, {"id": "opt1-2", "label": "② 週に数回使っている", "value": "weekly"}, {"id": "opt1-3", "label": "③ 月に数回使っている", "value": "monthly"}, {"id": "opt1-4", "label": "④ 使ったことはあるが、今は使っていない", "value": "used_before"}, {"id": "opt1-5", "label": "⑤ 使ったことがない", "value": "never"}]},
    {"id": "q2", "title": "主に利用しているAIツール（複数選択可）", "type": "checkbox", "required": false, "options": [{"id": "opt2-1", "label": "ChatGPT", "value": "chatgpt"}, {"id": "opt2-2", "label": "Claude", "value": "claude"}, {"id": "opt2-3", "label": "Gemini", "value": "gemini"}]},
    {"id": "q3", "title": "有料AIツールの利用状況", "type": "radio", "required": false, "options": [{"id": "opt3-1", "label": "① 個人で契約している", "value": "personal"}, {"id": "opt3-2", "label": "② 会社の補助で利用している", "value": "company_subsidy"}, {"id": "opt3-3", "label": "③ 無料版のみ使っている", "value": "free_only"}]},
    {"id": "q8", "title": "自己評価（現在のAIリテラシーレベル）", "type": "rank", "required": false, "options": [{"id": "opt8-1", "label": "ランク1（ビギナー）", "value": "rank1"}, {"id": "opt8-2", "label": "ランク2（ベーシック）", "value": "rank2"}, {"id": "opt8-3", "label": "ランク3（プラクティス）", "value": "rank3"}, {"id": "opt8-4", "label": "ランク4（アドバンス）", "value": "rank4"}, {"id": "opt8-5", "label": "ランク5（エキスパート）", "value": "rank5"}]}
  ]'::jsonb,
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  (SELECT id FROM public.profiles WHERE organization_id = '550e8400-e29b-41d4-a716-446655440002'::uuid AND role = 'ORG_ADMIN' LIMIT 1),
  true,
  NOW() - INTERVAL '28 days',
  NOW() - INTERVAL '28 days'
);

-- ユーザー1: 伊藤 麻衣（ORG_ADMIN、部長）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '伊藤 麻衣',
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '[
    {"questionId": "q-name-default", "value": "伊藤 麻衣", "type": "text"},
    {"questionId": "q1", "value": "weekly", "type": "radio"},
    {"questionId": "q2", "value": ["chatgpt", "claude"], "type": "checkbox"},
    {"questionId": "q3", "value": "company_subsidy", "type": "radio"},
    {"questionId": "q8", "value": "rank3", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '23 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440002'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ユーザー2: 渡辺 大輔（USER、課長）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '渡辺 大輔',
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '[
    {"questionId": "q-name-default", "value": "渡辺 大輔", "type": "text"},
    {"questionId": "q1", "value": "monthly", "type": "radio"},
    {"questionId": "q2", "value": ["chatgpt"], "type": "checkbox"},
    {"questionId": "q3", "value": "free_only", "type": "radio"},
    {"questionId": "q8", "value": "rank2", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '18 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440002'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ユーザー3: 中村 優香（USER、主任）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '中村 優香',
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '[
    {"questionId": "q-name-default", "value": "中村 優香", "type": "text"},
    {"questionId": "q1", "value": "used_before", "type": "radio"},
    {"questionId": "q2", "value": [], "type": "checkbox"},
    {"questionId": "q3", "value": "free_only", "type": "radio"},
    {"questionId": "q8", "value": "rank2", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '13 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440002'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ユーザー4: 小林 健（USER、一般社員）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '小林 健',
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '[
    {"questionId": "q-name-default", "value": "小林 健", "type": "text"},
    {"questionId": "q1", "value": "used_before", "type": "radio"},
    {"questionId": "q2", "value": [], "type": "checkbox"},
    {"questionId": "q3", "value": null, "type": "radio"},
    {"questionId": "q8", "value": "rank1", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '8 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440002'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ユーザー5: 加藤 さくら（USER、一般社員）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '加藤 さくら',
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '[
    {"questionId": "q-name-default", "value": "加藤 さくら", "type": "text"},
    {"questionId": "q1", "value": "never", "type": "radio"},
    {"questionId": "q2", "value": [], "type": "checkbox"},
    {"questionId": "q3", "value": null, "type": "radio"},
    {"questionId": "q8", "value": "rank1", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '3 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440002'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ============================================
-- 法人3: AI共創ラボ (ai-collab)
-- Organization ID: 550e8400-e29b-41d4-a716-446655440003
-- ============================================

-- アンケート3の作成
INSERT INTO public.surveys (id, title, description, questions, organization_id, created_by, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'AI技術スキル調査',
  '社員のAI技術に関するスキルレベルを調査するアンケートです。',
  '[
    {"id": "q-name-default", "title": "名前", "type": "text", "required": true, "placeholder": "お名前を入力してください"},
    {"id": "q1", "title": "AI活用の有無", "type": "radio", "required": true, "options": [{"id": "opt1-1", "label": "① ほぼ毎日使っている", "value": "daily"}, {"id": "opt1-2", "label": "② 週に数回使っている", "value": "weekly"}, {"id": "opt1-3", "label": "③ 月に数回使っている", "value": "monthly"}, {"id": "opt1-4", "label": "④ 使ったことはあるが、今は使っていない", "value": "used_before"}, {"id": "opt1-5", "label": "⑤ 使ったことがない", "value": "never"}]},
    {"id": "q2", "title": "主に利用しているAIツール（複数選択可）", "type": "checkbox", "required": false, "options": [{"id": "opt2-1", "label": "ChatGPT", "value": "chatgpt"}, {"id": "opt2-2", "label": "Claude", "value": "claude"}, {"id": "opt2-3", "label": "Gemini", "value": "gemini"}]},
    {"id": "q3", "title": "有料AIツールの利用状況", "type": "radio", "required": false, "options": [{"id": "opt3-1", "label": "① 個人で契約している", "value": "personal"}, {"id": "opt3-2", "label": "② 会社の補助で利用している", "value": "company_subsidy"}, {"id": "opt3-3", "label": "③ 無料版のみ使っている", "value": "free_only"}]},
    {"id": "q8", "title": "自己評価（現在のAIリテラシーレベル）", "type": "rank", "required": false, "options": [{"id": "opt8-1", "label": "ランク1（ビギナー）", "value": "rank1"}, {"id": "opt8-2", "label": "ランク2（ベーシック）", "value": "rank2"}, {"id": "opt8-3", "label": "ランク3（プラクティス）", "value": "rank3"}, {"id": "opt8-4", "label": "ランク4（アドバンス）", "value": "rank4"}, {"id": "opt8-5", "label": "ランク5（エキスパート）", "value": "rank5"}]}
  ]'::jsonb,
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  (SELECT id FROM public.profiles WHERE organization_id = '550e8400-e29b-41d4-a716-446655440003'::uuid AND role = 'ORG_ADMIN' LIMIT 1),
  true,
  NOW() - INTERVAL '26 days',
  NOW() - INTERVAL '26 days'
);

-- ユーザー1: 吉田 拓也（ORG_ADMIN、部長）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '吉田 拓也',
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  '[
    {"questionId": "q-name-default", "value": "吉田 拓也", "type": "text"},
    {"questionId": "q1", "value": "daily", "type": "radio"},
    {"questionId": "q2", "value": ["chatgpt", "claude", "gemini"], "type": "checkbox"},
    {"questionId": "q3", "value": "personal", "type": "radio"},
    {"questionId": "q8", "value": "rank5", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '24 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440003'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ユーザー2: 斉藤 彩（USER、課長）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '斉藤 彩',
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  '[
    {"questionId": "q-name-default", "value": "斉藤 彩", "type": "text"},
    {"questionId": "q1", "value": "daily", "type": "radio"},
    {"questionId": "q2", "value": ["chatgpt", "claude"], "type": "checkbox"},
    {"questionId": "q3", "value": "company_subsidy", "type": "radio"},
    {"questionId": "q8", "value": "rank4", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '21 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440003'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ユーザー3: 松本 亮（USER、主任）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '松本 亮',
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  '[
    {"questionId": "q-name-default", "value": "松本 亮", "type": "text"},
    {"questionId": "q1", "value": "weekly", "type": "radio"},
    {"questionId": "q2", "value": ["chatgpt", "gemini"], "type": "checkbox"},
    {"questionId": "q3", "value": "company_subsidy", "type": "radio"},
    {"questionId": "q8", "value": "rank3", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '16 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440003'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ユーザー4: 井上 由美（USER、一般社員）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '井上 由美',
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  '[
    {"questionId": "q-name-default", "value": "井上 由美", "type": "text"},
    {"questionId": "q1", "value": "weekly", "type": "radio"},
    {"questionId": "q2", "value": ["chatgpt"], "type": "checkbox"},
    {"questionId": "q3", "value": "free_only", "type": "radio"},
    {"questionId": "q8", "value": "rank3", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '11 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440003'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ユーザー5: 木村 達也（USER、一般社員）
INSERT INTO public.survey_responses (id, survey_id, respondent_name, organization_id, answers, submitted_at)
SELECT
  gen_random_uuid(),
  s.id,
  '木村 達也',
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  '[
    {"questionId": "q-name-default", "value": "木村 達也", "type": "text"},
    {"questionId": "q1", "value": "monthly", "type": "radio"},
    {"questionId": "q2", "value": ["chatgpt"], "type": "checkbox"},
    {"questionId": "q3", "value": "free_only", "type": "radio"},
    {"questionId": "q8", "value": "rank2", "type": "rank"}
  ]'::jsonb,
  NOW() - INTERVAL '6 days'
FROM public.surveys s
WHERE s.organization_id = '550e8400-e29b-41d4-a716-446655440003'::uuid
ORDER BY s.created_at DESC
LIMIT 1;

-- ============================================
-- 挿入結果の確認
-- ============================================
SELECT 
  s.id as survey_id,
  s.title,
  o.slug as organization_slug,
  o.name as organization_name,
  COUNT(sr.id) as response_count,
  s.created_at as survey_created_at
FROM public.surveys s
JOIN public.organizations o ON s.organization_id = o.id
LEFT JOIN public.survey_responses sr ON s.id::text = sr.survey_id::text
GROUP BY s.id, s.title, o.slug, o.name, s.created_at
ORDER BY o.slug, s.created_at;

-- 回答の詳細確認
SELECT 
  sr.id as response_id,
  sr.respondent_name,
  s.title as survey_title,
  o.slug as organization_slug,
  sr.submitted_at
FROM public.survey_responses sr
JOIN public.surveys s ON sr.survey_id::text = s.id::text
JOIN public.organizations o ON sr.organization_id::text = o.id::text
ORDER BY o.slug, sr.submitted_at;
