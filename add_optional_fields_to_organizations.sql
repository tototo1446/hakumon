-- organizations テーブルに任意項目カラムを追加
-- Supabase SQL Editorで実行してください

-- description（詳細説明）カラムの追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN description TEXT;
  END IF;
END $$;

-- website（ウェブサイト）カラムの追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'website'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN website VARCHAR(500);
  END IF;
END $$;

-- address（住所）カラムの追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN address TEXT;
  END IF;
END $$;

-- phone（電話番号）カラムの追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN phone VARCHAR(50);
  END IF;
END $$;
