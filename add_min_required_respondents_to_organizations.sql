-- organizationsテーブルに min_required_respondents カラムを追加するマイグレーション
-- AI戦略アドバイスを表示するために必要な最小回答者数を法人ごとに設定可能にする
-- Supabase SQL Editorで実行してください

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'min_required_respondents') THEN
    ALTER TABLE public.organizations ADD COLUMN min_required_respondents INTEGER DEFAULT 5;
    
    -- 既存データにはデフォルト値5を適用（既にDEFAULTで設定される）
    RAISE NOTICE 'min_required_respondentsカラムを追加しました（デフォルト: 5）';
  ELSE
    RAISE NOTICE 'min_required_respondentsカラムは既に存在します';
  END IF;
END $$;
