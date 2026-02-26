-- organizationsテーブルに email カラムを追加するマイグレーション
-- パスワード再設定メールの送信先として使用
-- Supabase SQL Editorで実行してください

DO $$ 
BEGIN
  -- emailカラムの追加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'email') THEN
    ALTER TABLE public.organizations ADD COLUMN email VARCHAR(255);
    
    RAISE NOTICE 'emailカラムを追加しました';
  ELSE
    RAISE NOTICE 'emailカラムは既に存在します';
  END IF;
END $$;
