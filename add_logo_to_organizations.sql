-- organizationsテーブルに logo カラムを追加するマイグレーション
-- 法人ログイン画面等で表示するロゴ画像のURLを保存
-- Supabase SQL Editorで実行してください

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'logo') THEN
    ALTER TABLE public.organizations ADD COLUMN logo TEXT;
    
    RAISE NOTICE 'logoカラムを追加しました';
  ELSE
    RAISE NOTICE 'logoカラムは既に存在します';
  END IF;
END $$;
