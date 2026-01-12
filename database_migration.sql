-- EffiQ データベースマイグレーションSQL
-- 既存のテーブル構造に必要なカラムを追加します
-- Supabase SQL Editorで実行してください

-- ============================================
-- 1. profiles テーブルのid制約を変更（auth.users参照から独立UUIDに）
-- ============================================

DO $$
BEGIN
  -- 既存の外部キー制約を削除（auth.users参照を削除）
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'profiles' 
    AND constraint_name = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;

  -- idカラムを自動生成UUIDに変更（既存データがある場合はそのまま）
  -- デフォルト値を設定（新規レコード用）
  ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;
  ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
END $$;

-- roleカラムをENUM型からVARCHAR型に変更（コードとの互換性のため）
-- 注意: 依存しているRLSポリシーがあるため、先に削除してから変更します
DO $$
BEGIN
  -- roleカラムの型を確認（ENUM型の場合のみ処理）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
    AND data_type = 'USER-DEFINED'  -- ENUM型の場合
  ) THEN
    -- 依存しているRLSポリシーを一時的に削除
    DROP POLICY IF EXISTS "Users can view own responses, Admins view org responses" ON public.survey_responses;
    DROP POLICY IF EXISTS "Users can view profiles in own org" ON public.profiles;
    
    -- ENUM型からVARCHAR型に変更
    -- 既存データを保持するため、一時カラムを使用
    ALTER TABLE public.profiles ADD COLUMN role_temp VARCHAR(50);
    -- ENUM値を文字列に変換（既存データを保持）
    UPDATE public.profiles SET role_temp = role::text;
    ALTER TABLE public.profiles DROP COLUMN role;
    ALTER TABLE public.profiles RENAME COLUMN role_temp TO role;
    ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'USER';
    ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;
  END IF;
END $$;

-- ============================================
-- 2. profiles テーブルに必要なカラムを追加
-- ============================================

DO $$ 
BEGIN
  -- email カラムの追加（auth.usersから取得することもできますが、コードが直接参照するため追加）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
    -- ユニークインデックスを作成（NULL値を許可）
    CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON public.profiles(email) WHERE email IS NOT NULL;
  END IF;

  -- department カラムの追加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'department') THEN
    ALTER TABLE public.profiles ADD COLUMN department TEXT;
  END IF;

  -- position カラムの追加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'position') THEN
    ALTER TABLE public.profiles ADD COLUMN position TEXT;
  END IF;

  -- scores カラムの追加（JSONB形式のリテラシースコア）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'scores') THEN
    ALTER TABLE public.profiles ADD COLUMN scores JSONB DEFAULT '{"basics": 0, "prompting": 0, "ethics": 0, "tools": 0, "automation": 0}'::jsonb;
  END IF;

  -- pending_password カラムの追加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'pending_password') THEN
    ALTER TABLE public.profiles ADD COLUMN pending_password BOOLEAN DEFAULT false;
  END IF;

  -- invitation_token カラムの追加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'invitation_token') THEN
    ALTER TABLE public.profiles ADD COLUMN invitation_token TEXT;
  END IF;

  -- invitation_expires_at カラムの追加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'invitation_expires_at') THEN
    ALTER TABLE public.profiles ADD COLUMN invitation_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- updated_at カラムの追加（既存テーブルにない場合）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
  END IF;

END $$;

-- ============================================
-- 2. updated_at自動更新のトリガー関数（既存の関数がある場合は更新）
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profiles テーブル用トリガー
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- organizations テーブル用トリガー（既に存在する場合は更新）
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. インデックスの追加（パフォーマンス向上）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;

-- ============================================
-- 4. RLSポリシーの追加（開発環境用 - 既存ポリシーは保持）
-- ============================================

-- profiles テーブルのRLSポリシー追加（既存ポリシーと併存）
-- 開発環境用：全ユーザーがアクセス可能なポリシーを追加

-- 既存のポリシーがある場合はスキップ、開発用の簡単なポリシーを追加
DO $$
BEGIN
  -- 開発環境用の全アクセス許可ポリシー（既に存在する場合はスキップ）
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profiles_select_all_dev'
  ) THEN
    CREATE POLICY "profiles_select_all_dev"
      ON public.profiles
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profiles_insert_all_dev'
  ) THEN
    CREATE POLICY "profiles_insert_all_dev"
      ON public.profiles
      FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profiles_update_all_dev'
  ) THEN
    CREATE POLICY "profiles_update_all_dev"
      ON public.profiles
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profiles_delete_all_dev'
  ) THEN
    CREATE POLICY "profiles_delete_all_dev"
      ON public.profiles
      FOR DELETE
      USING (true);
  END IF;
END $$;

-- organizations テーブルにも開発用ポリシーを追加（既存ポリシーと併存）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations' 
    AND policyname = 'organizations_select_all_dev'
  ) THEN
    CREATE POLICY "organizations_select_all_dev"
      ON public.organizations
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations' 
    AND policyname = 'organizations_insert_all_dev'
  ) THEN
    CREATE POLICY "organizations_insert_all_dev"
      ON public.organizations
      FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations' 
    AND policyname = 'organizations_update_all_dev'
  ) THEN
    CREATE POLICY "organizations_update_all_dev"
      ON public.organizations
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations' 
    AND policyname = 'organizations_delete_all_dev'
  ) THEN
    CREATE POLICY "organizations_delete_all_dev"
      ON public.organizations
      FOR DELETE
      USING (true);
  END IF;
END $$;

-- ============================================
-- 5. 削除したRLSポリシーの再作成（VARCHAR型のroleに対応）
-- ============================================

-- profiles テーブルのRLSポリシー再作成
DO $$
BEGIN
  -- 既存のポリシーが削除されている場合のみ再作成
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view profiles in own org'
  ) THEN
    CREATE POLICY "Users can view profiles in own org" ON public.profiles
    FOR SELECT USING (
      organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    );
  END IF;
END $$;

-- survey_responses テーブルのRLSポリシー再作成
DO $$
BEGIN
  -- 既存のポリシーが削除されている場合のみ再作成
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'survey_responses' 
    AND policyname = 'Users can view own responses, Admins view org responses'
  ) THEN
    CREATE POLICY "Users can view own responses, Admins view org responses" ON public.survey_responses
    FOR SELECT USING (
      (auth.uid() = user_id) OR 
      (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() 
        AND role = 'ORG_ADMIN' 
        AND organization_id = public.survey_responses.organization_id
      ))
    );
  END IF;
END $$;
