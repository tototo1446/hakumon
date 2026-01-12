-- EffiQ データベーススキーマ
-- Supabase SQL Editorで実行してください

-- ============================================
-- 1. organizations テーブル（既存の場合も考慮）
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. profiles テーブル（ユーザー情報）
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
-- 3. インデックスの作成
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- ============================================
-- 4. updated_at自動更新のトリガー関数
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
-- 5. Row Level Security (RLS) の設定
-- ============================================

-- RLSを有効化
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- organizations テーブルのRLSポリシー
-- 全ユーザーが読み取り可能（匿名ユーザーも含む）
DROP POLICY IF EXISTS "organizations_select_all" ON public.organizations;
CREATE POLICY "organizations_select_all"
  ON public.organizations
  FOR SELECT
  USING (true);

-- 全ユーザーが挿入可能（開発環境用 - 本番環境では適切な認証に変更してください）
DROP POLICY IF EXISTS "organizations_insert_all" ON public.organizations;
CREATE POLICY "organizations_insert_all"
  ON public.organizations
  FOR INSERT
  WITH CHECK (true);

-- 全ユーザーが更新可能（開発環境用 - 本番環境では適切な認証に変更してください）
DROP POLICY IF EXISTS "organizations_update_all" ON public.organizations;
CREATE POLICY "organizations_update_all"
  ON public.organizations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 全ユーザーが削除可能（開発環境用 - 本番環境では適切な認証に変更してください）
DROP POLICY IF EXISTS "organizations_delete_all" ON public.organizations;
CREATE POLICY "organizations_delete_all"
  ON public.organizations
  FOR DELETE
  USING (true);

-- profiles テーブルのRLSポリシー
-- 全ユーザーが読み取り可能
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles
  FOR SELECT
  USING (true);

-- 全ユーザーが挿入可能（開発環境用）
DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
CREATE POLICY "profiles_insert_all"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- 全ユーザーが更新可能（開発環境用）
DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;
CREATE POLICY "profiles_update_all"
  ON public.profiles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 全ユーザーが削除可能（開発環境用）
DROP POLICY IF EXISTS "profiles_delete_all" ON public.profiles;
CREATE POLICY "profiles_delete_all"
  ON public.profiles
  FOR DELETE
  USING (true);

-- ============================================
-- 6. 既存テーブルがある場合のカラム追加（マイグレーション用）
-- ============================================

-- profiles テーブルにカラムが存在しない場合のみ追加
DO $$ 
BEGIN
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

  -- organization_id カラムの追加（外部キー制約なしで追加後、後で追加）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id') THEN
    ALTER TABLE public.profiles ADD COLUMN organization_id UUID;
  END IF;
END $$;

-- organization_id に外部キー制約を追加（既に存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'profiles' 
    AND constraint_name = 'profiles_organization_id_fkey'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_organization_id_fkey 
    FOREIGN KEY (organization_id) 
    REFERENCES public.organizations(id) 
    ON DELETE CASCADE;
  END IF;
END $$;
