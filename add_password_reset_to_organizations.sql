-- organizationsテーブルにパスワード再設定用のカラムを追加
-- Supabase SQL Editorで実行してください

DO $$ 
BEGIN
  -- password_reset_token カラムの追加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'password_reset_token') THEN
    ALTER TABLE public.organizations ADD COLUMN password_reset_token VARCHAR(255);
  END IF;

  -- password_reset_expires_at カラムの追加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'password_reset_expires_at') THEN
    ALTER TABLE public.organizations ADD COLUMN password_reset_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- インデックスの作成（パスワード再設定トークンの検索を高速化）
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organizations_password_reset_token') THEN
    CREATE INDEX idx_organizations_password_reset_token ON public.organizations(password_reset_token);
  END IF;
END $$;
