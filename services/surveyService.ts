import { Survey, Question } from '../types';
import { supabase } from '../lib/supabase';

const STORAGE_KEY_PREFIX = 'surveys_';

/**
 * アンケートを保存（localStorage）
 */
export function saveSurvey(survey: Survey): void {
  const key = `${STORAGE_KEY_PREFIX}${survey.orgId}`;
  const existingSurveys = getSurveysByOrg(survey.orgId);
  const updatedSurveys = existingSurveys.map(s => 
    s.id === survey.id ? survey : s
  );
  
  // 新規アンケートの場合は追加
  if (!existingSurveys.find(s => s.id === survey.id)) {
    updatedSurveys.push(survey);
  }
  
  localStorage.setItem(key, JSON.stringify(updatedSurveys));
}

/**
 * アンケート一覧を保存（localStorage）
 */
export function saveSurveys(orgId: string, surveys: Survey[]): void {
  const key = `${STORAGE_KEY_PREFIX}${orgId}`;
  localStorage.setItem(key, JSON.stringify(surveys));
}

/**
 * 法人別のアンケート一覧を取得
 */
export function getSurveysByOrg(orgId: string): Survey[] {
  const key = `${STORAGE_KEY_PREFIX}${orgId}`;
  const data = localStorage.getItem(key);
  if (!data) return [];
  try {
    return JSON.parse(data) as Survey[];
  } catch {
    return [];
  }
}

/**
 * アンケートIDでアンケートを取得
 */
export function getSurveyById(surveyId: string, orgId: string): Survey | null {
  const surveys = getSurveysByOrg(orgId);
  return surveys.find(s => s.id === surveyId) || null;
}

/**
 * すべてのアンケートからIDで検索（orgIdが不明な場合）
 */
export function findSurveyById(surveyId: string): Survey | null {
  // すべてのlocalStorageキーをチェック
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
      try {
        const surveys = JSON.parse(localStorage.getItem(key) || '[]') as Survey[];
        const survey = surveys.find(s => s.id === surveyId);
        if (survey) return survey;
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * アンケートを削除
 */
export function deleteSurvey(surveyId: string, orgId: string): void {
  const surveys = getSurveysByOrg(orgId);
  const updatedSurveys = surveys.filter(s => s.id !== surveyId);
  saveSurveys(orgId, updatedSurveys);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * アンケートをSupabaseに保存（upsert）
 * 公開リンクで未ログインユーザーがアクセスできるようにするために必要
 */
export async function saveSurveyToSupabase(survey: Survey): Promise<Survey | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      console.warn('Supabase環境変数が設定されていないため、保存をスキップします。');
      return null;
    }

    // organization_id が UUID 形式でない場合はスキップ（MOCK等）
    if (!UUID_REGEX.test(survey.orgId)) {
      console.warn('organization_id がUUID形式でないため、Supabase保存をスキップします:', survey.orgId);
      return null;
    }

    const row = {
      id: UUID_REGEX.test(survey.id) ? survey.id : crypto.randomUUID(),
      title: survey.title,
      description: survey.description || '',
      questions: survey.questions,
      organization_id: survey.orgId,
      created_by: null, // 法人ログインの場合は profiles がないため null
      is_active: survey.isActive ?? true,
      created_at: survey.createdAt,
      updated_at: survey.updatedAt,
    };

    const { data, error } = await supabase
      .from('surveys')
      .upsert(row, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('アンケートのSupabase保存に失敗しました:', error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      questions: (data.questions as any) || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isActive: data.is_active ?? true,
      createdBy: data.created_by ?? survey.createdBy ?? survey.orgId,
      orgId: data.organization_id,
    };
  } catch (error) {
    console.error('アンケートのSupabase保存中にエラーが発生しました:', error);
    return null;
  }
}

/**
 * Supabaseから法人別のアンケート一覧を取得
 */
export async function getSurveysByOrgFromSupabase(orgId: string): Promise<Survey[]> {
  try {
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('アンケートデータの取得に失敗しました:', error);
      return [];
    }

    if (!data) return [];

    // データベースの形式をアプリケーションの形式に変換
    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      questions: (row.questions as any) || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active ?? true,
      createdBy: row.created_by,
      orgId: row.organization_id,
    }));
  } catch (error) {
    console.error('アンケートデータの取得中にエラーが発生しました:', error);
    return [];
  }
}

/**
 * SupabaseからアンケートIDのみでアンケートを取得（公開リンク用・orgId不要）
 * surveyIdがUUID形式の場合のみSupabaseを検索（SupabaseのidはUUID）
 */
export async function getSurveyByIdFromSupabaseByIdOnly(surveyId: string): Promise<Survey | null> {
  if (!UUID_REGEX.test(surveyId)) return null;
  try {
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      questions: (data.questions as any) || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isActive: data.is_active ?? true,
      createdBy: data.created_by,
      orgId: data.organization_id,
    };
  } catch {
    return null;
  }
}

/**
 * SupabaseからアンケートIDでアンケートを取得
 */
export async function getSurveyByIdFromSupabase(surveyId: string, orgId: string): Promise<Survey | null> {
  try {
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      console.error('アンケートデータの取得に失敗しました:', error);
      return null;
    }

    if (!data) return null;

    // データベースの形式をアプリケーションの形式に変換
    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      questions: (data.questions as any) || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isActive: data.is_active ?? true,
      createdBy: data.created_by,
      orgId: data.organization_id,
    };
  } catch (error) {
    console.error('アンケートデータの取得中にエラーが発生しました:', error);
    return null;
  }
}

