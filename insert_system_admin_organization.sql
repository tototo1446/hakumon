-- システム管理者組織の登録（正式管理者アカウント）
-- Supabase SQL Editor で実行してください
--
-- 前提: add_account_id_to_organizations.sql および add_password_to_organizations.sql
--       のマイグレーションが適用済みであること
--
-- 管理者ID: hakumon
-- パスワード: hakumon1446

-- システム管理者用組織を upsert（既存の system 組織があれば更新）
-- 注意: 他の組織で account_id='hakumon' を使用している場合は、先に変更するか削除してください
INSERT INTO public.organizations (id, slug, name, account_id, password, created_at, updated_at)
VALUES (
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'system',
  'システム管理者',
  'hakumon',
  'hakumon1446',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  account_id = EXCLUDED.account_id,
  password = EXCLUDED.password,
  updated_at = NOW();

-- 挿入結果の確認
SELECT id, slug, name, account_id, created_at, updated_at
FROM public.organizations
WHERE slug = 'system';
