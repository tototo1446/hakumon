-- surveys と survey_responses テーブルの作成SQL
-- Supabase SQL Editorで実行してください
-- insert_test_surveys_and_responses.sql を実行する前に、このSQLを実行してください

-- ============================================
-- 0. 依存テーブルの確認と作成（必要な場合）
-- ============================================

-- organizations テーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- profiles テーブルの作成（存在しない場合）
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
-- 1. surveys テーブルの作成
-- ============================================
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 既存のテーブルに不足しているカラムを追加（マイグレーション用）
DO $$ 
BEGIN
  -- surveys テーブルが存在する場合、不足しているカラムを追加
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'surveys') THEN
    
    -- organization_id カラムの追加（org_idから移行する場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'organization_id') THEN
      -- 既にorg_idカラムがある場合は、それをorganization_idにリネーム
      IF EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'org_id') THEN
        ALTER TABLE public.surveys RENAME COLUMN org_id TO organization_id;
      ELSE
        ALTER TABLE public.surveys ADD COLUMN organization_id UUID;
      END IF;
    END IF;
    
    -- organization_id カラムの型を修正（text型の場合はuuid型に変更）
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'surveys' 
               AND column_name = 'organization_id' AND data_type = 'text') THEN
      -- 外部キー制約を一時的に削除（存在する場合）
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'surveys' 
        AND constraint_name = 'surveys_organization_id_fkey'
      ) THEN
        ALTER TABLE public.surveys DROP CONSTRAINT surveys_organization_id_fkey;
      END IF;
      -- text型からuuid型に変更
      ALTER TABLE public.surveys ALTER COLUMN organization_id TYPE UUID USING organization_id::uuid;
    END IF;
    
    -- 外部キー制約を追加（既に存在しない場合のみ）
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'surveys' 
      AND constraint_name = 'surveys_organization_id_fkey'
    ) THEN
      ALTER TABLE public.surveys 
      ADD CONSTRAINT surveys_organization_id_fkey 
      FOREIGN KEY (organization_id) 
      REFERENCES public.organizations(id) 
      ON DELETE CASCADE;
    END IF;

  END IF;
END $$;

-- ============================================
-- 2. survey_responses テーブルの作成
-- ============================================
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  respondent_name VARCHAR(255) NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 既存のテーブルに不足しているカラムを追加（マイグレーション用）
DO $$ 
BEGIN
  -- survey_responses テーブルが存在する場合、不足しているカラムを追加
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_responses') THEN
    
    -- survey_id カラムの型を修正（text型の場合はuuid型に変更）
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'survey_responses' 
               AND column_name = 'survey_id' AND data_type = 'text') THEN
      -- 外部キー制約を一時的に削除（存在する場合）
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'survey_responses' 
        AND constraint_name = 'survey_responses_survey_id_fkey'
      ) THEN
        ALTER TABLE public.survey_responses DROP CONSTRAINT survey_responses_survey_id_fkey;
      END IF;
      -- text型からuuid型に変更
      ALTER TABLE public.survey_responses ALTER COLUMN survey_id TYPE UUID USING survey_id::uuid;
      -- 外部キー制約を再追加
      ALTER TABLE public.survey_responses 
      ADD CONSTRAINT survey_responses_survey_id_fkey 
      FOREIGN KEY (survey_id) 
      REFERENCES public.surveys(id) 
      ON DELETE CASCADE;
    END IF;
    
    -- respondent_name カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'respondent_name') THEN
      ALTER TABLE public.survey_responses ADD COLUMN respondent_name VARCHAR(255);
      -- 既存データがある場合、デフォルト値を設定（必要に応じて調整）
      UPDATE public.survey_responses SET respondent_name = '回答者' WHERE respondent_name IS NULL;
      -- NOT NULL制約を追加
      ALTER TABLE public.survey_responses ALTER COLUMN respondent_name SET NOT NULL;
    END IF;

    -- organization_id カラムの追加（org_idから移行する場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'organization_id') THEN
      -- 既にorg_idカラムがある場合は、それをorganization_idにリネーム
      IF EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'org_id') THEN
        ALTER TABLE public.survey_responses RENAME COLUMN org_id TO organization_id;
      ELSE
        ALTER TABLE public.survey_responses ADD COLUMN organization_id UUID;
      END IF;
    END IF;
    
    -- organization_id カラムの型を修正（text型の場合はuuid型に変更）
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'survey_responses' 
               AND column_name = 'organization_id' AND data_type = 'text') THEN
      -- 外部キー制約を一時的に削除（存在する場合）
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'survey_responses' 
        AND constraint_name = 'survey_responses_organization_id_fkey'
      ) THEN
        ALTER TABLE public.survey_responses DROP CONSTRAINT survey_responses_organization_id_fkey;
      END IF;
      -- text型からuuid型に変更
      ALTER TABLE public.survey_responses ALTER COLUMN organization_id TYPE UUID USING organization_id::uuid;
    END IF;
    
    -- 外部キー制約を追加（既に存在しない場合のみ）
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'survey_responses' 
      AND constraint_name = 'survey_responses_organization_id_fkey'
    ) THEN
      ALTER TABLE public.survey_responses 
      ADD CONSTRAINT survey_responses_organization_id_fkey 
      FOREIGN KEY (organization_id) 
      REFERENCES public.organizations(id) 
      ON DELETE CASCADE;
    END IF;

  END IF;
END $$;

-- ============================================
-- 3. インデックスの作成
-- ============================================
CREATE INDEX IF NOT EXISTS idx_surveys_organization_id ON public.surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_surveys_created_by ON public.surveys(created_by);
CREATE INDEX IF NOT EXISTS idx_surveys_is_active ON public.surveys(is_active);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_organization_id ON public.survey_responses(organization_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted_at ON public.survey_responses(submitted_at);

-- ============================================
-- 4. updated_at自動更新のトリガー（surveysテーブル用）
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_surveys_updated_at ON public.surveys;
CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Row Level Security (RLS) の設定
-- ============================================

-- RLSを有効化
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- surveys テーブルのRLSポリシー
DROP POLICY IF EXISTS "surveys_select_all" ON public.surveys;
CREATE POLICY "surveys_select_all"
  ON public.surveys
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "surveys_insert_all" ON public.surveys;
CREATE POLICY "surveys_insert_all"
  ON public.surveys
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "surveys_update_all" ON public.surveys;
CREATE POLICY "surveys_update_all"
  ON public.surveys
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "surveys_delete_all" ON public.surveys;
CREATE POLICY "surveys_delete_all"
  ON public.surveys
  FOR DELETE
  USING (true);

-- survey_responses テーブルのRLSポリシー
DROP POLICY IF EXISTS "survey_responses_select_all" ON public.survey_responses;
CREATE POLICY "survey_responses_select_all"
  ON public.survey_responses
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "survey_responses_insert_all" ON public.survey_responses;
CREATE POLICY "survey_responses_insert_all"
  ON public.survey_responses
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "survey_responses_update_all" ON public.survey_responses;
CREATE POLICY "survey_responses_update_all"
  ON public.survey_responses
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "survey_responses_delete_all" ON public.survey_responses;
CREATE POLICY "survey_responses_delete_all"
  ON public.survey_responses
  FOR DELETE
  USING (true);
