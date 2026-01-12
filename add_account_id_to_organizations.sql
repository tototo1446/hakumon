-- organizationsテーブルにaccount_idカラムを追加するマイグレーション
-- Supabase SQL Editorで実行してください

DO $$ 
BEGIN
  -- account_idカラムの追加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'account_id') THEN
    ALTER TABLE public.organizations ADD COLUMN account_id VARCHAR(255) UNIQUE;
    
    -- 既存データがある場合、slugをaccount_idにコピー（後方互換性のため）
    UPDATE public.organizations 
    SET account_id = slug 
    WHERE account_id IS NULL;
    
    -- インデックスを作成（検索性能向上のため）
    CREATE INDEX IF NOT EXISTS organizations_account_id_idx ON public.organizations(account_id);
    
    RAISE NOTICE 'account_idカラムを追加しました';
  ELSE
    RAISE NOTICE 'account_idカラムは既に存在します';
  END IF;
END $$;
