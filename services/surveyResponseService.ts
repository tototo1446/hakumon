import { SurveyResponse, Answer } from '../types';
import { supabase } from '../lib/supabase';

const STORAGE_KEY_PREFIX = 'survey_responses_';

/**
 * 回答データを保存（localStorage）
 */
export function saveResponse(response: SurveyResponse): void {
  const key = `${STORAGE_KEY_PREFIX}${response.orgId}`;
  const existingResponses = getResponsesByOrg(response.orgId);
  const updatedResponses = [...existingResponses, response];
  localStorage.setItem(key, JSON.stringify(updatedResponses));
}

/**
 * 法人別の回答一覧を取得
 */
export function getResponsesByOrg(orgId: string): SurveyResponse[] {
  const key = `${STORAGE_KEY_PREFIX}${orgId}`;
  const data = localStorage.getItem(key);
  if (!data) return [];
  try {
    return JSON.parse(data) as SurveyResponse[];
  } catch {
    return [];
  }
}

/**
 * アンケート別の回答一覧を取得
 */
export function getResponsesBySurvey(surveyId: string, orgId: string): SurveyResponse[] {
  const allResponses = getResponsesByOrg(orgId);
  return allResponses.filter(response => response.surveyId === surveyId);
}

/**
 * 回答者別の回答一覧を取得
 */
export function getResponsesByRespondent(respondentName: string, orgId: string): SurveyResponse[] {
  const allResponses = getResponsesByOrg(orgId);
  return allResponses.filter(response => response.respondentName === respondentName);
}

/**
 * 回答を削除
 */
export function deleteResponse(responseId: string, orgId: string): void {
  const allResponses = getResponsesByOrg(orgId);
  const updatedResponses = allResponses.filter(response => response.id !== responseId);
  const key = `${STORAGE_KEY_PREFIX}${orgId}`;
  localStorage.setItem(key, JSON.stringify(updatedResponses));
}

/**
 * 回答を更新
 */
export function updateResponse(updatedResponse: SurveyResponse): void {
  const allResponses = getResponsesByOrg(updatedResponse.orgId);
  const updatedResponses = allResponses.map(response =>
    response.id === updatedResponse.id ? updatedResponse : response
  );
  const key = `${STORAGE_KEY_PREFIX}${updatedResponse.orgId}`;
  localStorage.setItem(key, JSON.stringify(updatedResponses));
}

/**
 * 将来的にAPI連携する場合のインターフェース
 * 現時点ではlocalStorageを使用
 */
export async function saveResponseToAPI(response: SurveyResponse): Promise<SurveyResponse> {
  // TODO: API実装時にここを実装
  // const response = await fetch(`/api/surveys/${response.surveyId}/responses`, {
  //   method: 'POST',
  //   body: JSON.stringify(response),
  // });
  // return response.json();
  saveResponse(response);
  return response;
}

export async function getResponsesBySurveyFromAPI(surveyId: string, orgId: string): Promise<SurveyResponse[]> {
  // TODO: API実装時にここを実装
  // const response = await fetch(`/api/surveys/${surveyId}/responses?orgId=${orgId}`);
  // return response.json();
  return getResponsesBySurvey(surveyId, orgId);
}

/**
 * Supabaseからアンケート別の回答一覧を取得
 */
export async function getResponsesBySurveyFromSupabase(surveyId: string, orgId: string): Promise<SurveyResponse[]> {
  try {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyId)
      .eq('organization_id', orgId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('回答データの取得に失敗しました:', error);
      return [];
    }

    if (!data) return [];

    // データベースの形式をアプリケーションの形式に変換
    return data.map((row: any) => ({
      id: row.id,
      surveyId: row.survey_id,
      respondentName: row.respondent_name || '匿名',
      orgId: row.organization_id,
      answers: row.answers as Answer[],
      submittedAt: row.submitted_at,
    }));
  } catch (error) {
    console.error('回答データの取得中にエラーが発生しました:', error);
    return [];
  }
}

/**
 * Supabaseから法人別の回答一覧を取得
 */
export async function getResponsesByOrgFromSupabase(orgId: string): Promise<SurveyResponse[]> {
  try {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('organization_id', orgId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('回答データの取得に失敗しました:', error);
      return [];
    }

    if (!data) return [];

    // データベースの形式をアプリケーションの形式に変換
    return data.map((row: any) => ({
      id: row.id,
      surveyId: row.survey_id,
      respondentName: row.respondent_name || '匿名',
      orgId: row.organization_id,
      answers: row.answers as Answer[],
      submittedAt: row.submitted_at,
    }));
  } catch (error) {
    console.error('回答データの取得中にエラーが発生しました:', error);
    return [];
  }
}

/**
 * Supabaseから回答者別の回答一覧を取得
 */
export async function getResponsesByRespondentFromSupabase(respondentName: string, orgId: string): Promise<SurveyResponse[]> {
  try {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('respondent_name', respondentName)
      .eq('organization_id', orgId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('回答データの取得に失敗しました:', error);
      return [];
    }

    if (!data) return [];

    // データベースの形式をアプリケーションの形式に変換
    return data.map((row: any) => ({
      id: row.id,
      surveyId: row.survey_id,
      respondentName: row.respondent_name || '匿名',
      orgId: row.organization_id,
      answers: row.answers as Answer[],
      submittedAt: row.submitted_at,
    }));
  } catch (error) {
    console.error('回答データの取得中にエラーが発生しました:', error);
    return [];
  }
}

