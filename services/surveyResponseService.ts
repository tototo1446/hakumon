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
 * 法人別の回答一覧を取得（デモデータは除外）
 */
export function getResponsesByOrg(orgId: string): SurveyResponse[] {
  const key = `${STORAGE_KEY_PREFIX}${orgId}`;
  const data = localStorage.getItem(key);
  if (!data) return [];
  try {
    const responses = JSON.parse(data) as SurveyResponse[];
    // デモデータをフィルタリングして除外
    const demoNames = ['山田 太郎', '佐藤 花子', '鈴木 一郎'];
    return responses.filter(response => {
      return !demoNames.includes(response.respondentName) && !response.id.startsWith('demo-response-');
    });
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
 * 回答者別の回答一覧を取得（デモデータは除外）
 */
export function getResponsesByRespondent(respondentName: string, orgId: string): SurveyResponse[] {
  // デモデータの回答者名の場合は空配列を返す
  const demoNames = ['山田 太郎', '佐藤 花子', '鈴木 一郎'];
  if (demoNames.includes(respondentName)) {
    return [];
  }
  
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
    console.log('回答データ取得開始:', { surveyId, orgId });
    
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyId)
      .eq('organization_id', orgId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('回答データの取得に失敗しました:', error);
      console.error('エラー詳細:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return [];
    }

    console.log('取得した回答データ:', data);

    if (!data || data.length === 0) {
      console.log('回答データが見つかりませんでした。survey_idとorganization_idを確認してください。');
      // デバッグ用: すべての回答データを取得して確認
      const { data: allData } = await supabase
        .from('survey_responses')
        .select('survey_id, organization_id, respondent_name')
        .limit(10);
      console.log('データベース内の回答データ（最初の10件）:', allData);
      return [];
    }

    // データベースの形式をアプリケーションの形式に変換
    const responses = data.map((row: any) => ({
      id: row.id,
      surveyId: row.survey_id,
      respondentName: row.respondent_name || '匿名',
      orgId: row.organization_id,
      answers: row.answers as Answer[],
      submittedAt: row.submitted_at,
    }));

    // デモデータをフィルタリングして除外
    const demoNames = ['山田 太郎', '佐藤 花子', '鈴木 一郎'];
    return responses.filter(response => {
      return !demoNames.includes(response.respondentName) && !response.id.startsWith('demo-response-');
    });
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
    const responses = data.map((row: any) => ({
      id: row.id,
      surveyId: row.survey_id,
      respondentName: row.respondent_name || '匿名',
      orgId: row.organization_id,
      answers: row.answers as Answer[],
      submittedAt: row.submitted_at,
    }));

    // デモデータをフィルタリングして除外
    const demoNames = ['山田 太郎', '佐藤 花子', '鈴木 一郎'];
    return responses.filter(response => {
      return !demoNames.includes(response.respondentName) && !response.id.startsWith('demo-response-');
    });
  } catch (error) {
    console.error('回答データの取得中にエラーが発生しました:', error);
    return [];
  }
}

/**
 * Supabaseからデモデータを削除
 */
export async function deleteDemoResponsesFromSupabase(orgId: string): Promise<void> {
  try {
    const demoNames = ['山田 太郎', '佐藤 花子', '鈴木 一郎'];
    
    // デモデータの回答者名でフィルタリングして削除
    for (const name of demoNames) {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('organization_id', orgId)
        .eq('respondent_name', name);

      if (error) {
        console.error(`デモデータ（${name}）の取得に失敗しました:`, error);
        continue;
      }

      if (data && data.length > 0) {
        const ids = data.map(row => row.id);
        const { error: deleteError } = await supabase
          .from('survey_responses')
          .delete()
          .in('id', ids);

        if (deleteError) {
          console.error(`デモデータ（${name}）の削除に失敗しました:`, deleteError);
        } else {
          console.log(`デモデータ（${name}）を削除しました: ${ids.length}件`);
        }
      }
    }

    // demo-response-で始まるIDも削除
    const { data: demoData, error: demoError } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('organization_id', orgId)
      .like('id', 'demo-response-%');

    if (!demoError && demoData && demoData.length > 0) {
      const ids = demoData.map(row => row.id);
      const { error: deleteError } = await supabase
        .from('survey_responses')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error('デモデータ（demo-response-*）の削除に失敗しました:', deleteError);
      } else {
        console.log(`デモデータ（demo-response-*）を削除しました: ${ids.length}件`);
      }
    }
  } catch (error) {
    console.error('デモデータの削除中にエラーが発生しました:', error);
  }
}

/**
 * Supabaseから回答者別の回答一覧を取得
 */
export async function getResponsesByRespondentFromSupabase(respondentName: string, orgId: string): Promise<SurveyResponse[]> {
  try {
    // デモデータの回答者名の場合は空配列を返す
    const demoNames = ['山田 太郎', '佐藤 花子', '鈴木 一郎'];
    if (demoNames.includes(respondentName)) {
      return [];
    }

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
    const responses = data.map((row: any) => ({
      id: row.id,
      surveyId: row.survey_id,
      respondentName: row.respondent_name || '匿名',
      orgId: row.organization_id,
      answers: row.answers as Answer[],
      submittedAt: row.submitted_at,
    }));

    // デモデータをフィルタリングして除外（念のため）
    return responses.filter(response => {
      return !response.id.startsWith('demo-response-');
    });
  } catch (error) {
    console.error('回答データの取得中にエラーが発生しました:', error);
    return [];
  }
}

