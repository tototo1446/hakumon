-- EffiQ データベーススキーマ（修正版）
-- Supabase SQL Editorで実行してください
-- 既存テーブルがある場合も安全に実行できます

-- ============================================
-- 1. organizations テーブルの作成・確認
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. profiles テーブルの作成（既存テーブルがある場合はスキップ）
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'USER',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department VARCHAR(255),
  position VARCHAR(255),
  scores JSONB DEFAULT '{"basics": 0, "prompting": 0, "ethics": 0, "tools": 0, "automation": 0}'::jsonb,
  pending_password BOOLEAN DEFAULT false,
  invitation_token VARCHAR(255),
  invitation_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. 既存テーブルがある場合のカラム追加（マイグレーション）
-- ============================================

DO $$ 
BEGIN
  -- テーブルが存在するか確認
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    
    -- name カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name') THEN
      ALTER TABLE public.profiles ADD COLUMN name VARCHAR(255);
    END IF;

    -- email カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
      ALTER TABLE public.profiles ADD COLUMN email VARCHAR(255);
      -- 既存データがある場合、一意制約は後で追加
      CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON public.profiles(email) WHERE email IS NOT NULL;
    END IF;

    -- role カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
      ALTER TABLE public.profiles ADD COLUMN role VARCHAR(50) DEFAULT 'USER' NOT NULL;
    END IF;

    -- organization_id カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id') THEN
      ALTER TABLE public.profiles ADD COLUMN organization_id UUID;
    END IF;

    -- department カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'department') THEN
      ALTER TABLE public.profiles ADD COLUMN department VARCHAR(255);
    END IF;

    -- position カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'position') THEN
      ALTER TABLE public.profiles ADD COLUMN position VARCHAR(255);
    END IF;

    -- scores カラムの追加
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
      ALTER TABLE public.profiles ADD COLUMN invitation_token VARCHAR(255);
    END IF;

    -- invitation_expires_at カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'invitation_expires_at') THEN
      ALTER TABLE public.profiles ADD COLUMN invitation_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- created_at カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at') THEN
      ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- updated_at カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
      ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

  END IF;
END $$;

-- ============================================
-- 4. 外部キー制約の追加（安全に実行）
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- organization_id に外部キー制約を追加（既に存在しない場合のみ）
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'profiles' 
      AND constraint_name = 'profiles_organization_id_fkey'
    ) THEN
      -- 外部キー制約を追加（既存のNULL値がある場合は制約を緩和）
      ALTER TABLE public.profiles 
      ADD CONSTRAINT profiles_organization_id_fkey 
      FOREIGN KEY (organization_id) 
      REFERENCES public.organizations(id) 
      ON DELETE CASCADE;
    END IF;

    -- email にユニーク制約を追加（既に存在しない場合のみ）
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'profiles' 
      AND constraint_name = 'profiles_email_key'
    ) THEN
      -- ユニークインデックスを作成（NULL値を許可）
      CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON public.profiles(email) WHERE email IS NOT NULL;
    END IF;
  END IF;
END $$;

-- ============================================
-- 5. インデックスの作成
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- ============================================
-- 6. updated_at自動更新のトリガー関数
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- organizations テーブル用トリガー
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- profiles テーブル用トリガー
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. Row Level Security (RLS) の設定
-- ============================================

-- RLSを有効化
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- organizations テーブルのRLSポリシー
DROP POLICY IF EXISTS "organizations_select_all" ON public.organizations;
CREATE POLICY "organizations_select_all"
  ON public.organizations
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "organizations_insert_all" ON public.organizations;
CREATE POLICY "organizations_insert_all"
  ON public.organizations
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "organizations_update_all" ON public.organizations;
CREATE POLICY "organizations_update_all"
  ON public.organizations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "organizations_delete_all" ON public.organizations;
CREATE POLICY "organizations_delete_all"
  ON public.organizations
  FOR DELETE
  USING (true);

-- profiles テーブルのRLSポリシー
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
CREATE POLICY "profiles_insert_all"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;
CREATE POLICY "profiles_update_all"
  ON public.profiles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_delete_all" ON public.profiles;
CREATE POLICY "profiles_delete_all"
  ON public.profiles
  FOR DELETE
  USING (true);
