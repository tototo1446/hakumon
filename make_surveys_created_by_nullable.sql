-- surveys テーブルの created_by を NULL 許容に変更
-- 法人ログイン（profiles なし）でアンケート作成する場合に必要
-- Supabase SQL Editor で実行してください

ALTER TABLE public.surveys 
  ALTER COLUMN created_by DROP NOT NULL;
