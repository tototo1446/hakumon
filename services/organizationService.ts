import { supabase } from '../lib/supabase';
import { Organization } from '../types';
import { calculateOrgAverageScore, calculateOverallScore } from './literacyScoreService';
import { getRankDefinition } from './rankDefinitionService';

/**
 * Supabaseから全法人を取得
 */
export async function getOrganizations(): Promise<Organization[]> {
  try {
    // 環境変数が設定されていない場合は空配列を返す
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      console.warn('Supabase環境変数が設定されていないため、空の配列を返します。');
      return [];
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('法人一覧の取得エラー:', error);
      return []; // エラー時は空配列を返す
    }

    // SupabaseのデータをOrganization型に変換（メンバー数と平均スコアを計算）
    const organizations = await Promise.all((data || []).map(async (org) => {
      // メンバー数をprofilesテーブルから集計
      const { count: memberCount, error: memberError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      if (memberError) {
        console.error(`法人 ${org.name} のメンバー数取得エラー:`, memberError);
      }

      // 平均スコアをsurvey_responsesテーブルから計算
      let avgScore = 0;
      try {
        const { data: responses, error: responseError } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('organization_id', org.id);

        if (responseError) {
          console.error(`法人 ${org.name} の回答データ取得エラー:`, responseError);
        } else if (responses && responses.length > 0) {
          // SurveyResponse型に変換
          const surveyResponses = responses.map((r: any) => ({
            id: r.id,
            surveyId: r.survey_id,
            orgId: r.organization_id,
            respondentName: r.respondent_name || '',
            submittedAt: r.submitted_at,
            answers: Array.isArray(r.answers) ? r.answers : (typeof r.answers === 'string' ? JSON.parse(r.answers) : []),
          }));

          const rankDefinition = getRankDefinition(org.id);
          const orgScores = calculateOrgAverageScore(org.id, surveyResponses, rankDefinition);
          avgScore = calculateOverallScore(orgScores);
        }
      } catch (error) {
        console.error(`法人 ${org.name} の平均スコア計算エラー:`, error);
      }

      return {
        id: org.id,
        slug: org.slug,
        name: org.name,
        createdAt: org.created_at.split('T')[0], // YYYY-MM-DD形式に変換
        memberCount: memberCount || 0,
        avgScore: Math.round(avgScore),
        // account_idカラムが存在する場合はそれを使用、なければslugを使用（後方互換性）
        accountId: (org as any).account_id || org.slug,
        password: (org as any).password, // パスワードを取得
        email: (org as any).email, // メールアドレスを取得
        minRequiredRespondents: (org as any).min_required_respondents ?? undefined,
        logo: (org as any).logo || undefined,
      };
    }));

    return organizations;
  } catch (error) {
    console.error('法人一覧の取得に失敗しました:', error);
    return [];
  }
}

/**
 * IDまたはSlugで法人を取得
 */
export async function getOrganizationById(id: string): Promise<Organization | null> {
  try {
    // 環境変数が設定されていない場合はnullを返す
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      return null;
    }

    // UUID形式かどうかをチェック（UUIDは8-4-4-4-12の形式）
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let query = supabase.from('organizations').select('*');
    
    if (isUUID) {
      // UUID形式の場合はidで検索
      query = query.eq('id', id);
    } else {
      // UUID形式でない場合はslugで検索（'org-1'などの文字列IDの場合）
      query = query.eq('slug', id);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('法人の取得エラー:', error);
      console.error('検索パラメータ:', { id, isUUID, searchType: isUUID ? 'id' : 'slug' });
      return null;
    }

    if (!data) return null;

    // メンバー数をprofilesテーブルから集計
    const { count: memberCount, error: memberError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', data.id);

    if (memberError) {
      console.error(`法人 ${data.name} のメンバー数取得エラー:`, memberError);
    }

    // 平均スコアをsurvey_responsesテーブルから計算
    let avgScore = 0;
    try {
      const { data: responses, error: responseError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('organization_id', data.id);

      if (responseError) {
        console.error(`法人 ${data.name} の回答データ取得エラー:`, responseError);
      } else if (responses && responses.length > 0) {
        // SurveyResponse型に変換
        const surveyResponses = responses.map((r: any) => ({
          id: r.id,
          surveyId: r.survey_id,
          orgId: r.organization_id,
          respondentName: r.respondent_name || '',
          submittedAt: r.submitted_at,
          answers: Array.isArray(r.answers) ? r.answers : (typeof r.answers === 'string' ? JSON.parse(r.answers) : []),
        }));

        const rankDefinition = getRankDefinition(data.id);
        const orgScores = calculateOrgAverageScore(data.id, surveyResponses, rankDefinition);
        avgScore = calculateOverallScore(orgScores);
      }
    } catch (error) {
      console.error(`法人 ${data.name} の平均スコア計算エラー:`, error);
    }

      return {
        id: data.id,
        slug: data.slug,
        name: data.name,
        createdAt: data.created_at.split('T')[0],
        memberCount: memberCount || 0,
        avgScore: Math.round(avgScore),
        accountId: (data as any).account_id || data.slug,
        password: (data as any).password, // パスワードを取得
        email: (data as any).email, // メールアドレスを取得
        minRequiredRespondents: (data as any).min_required_respondents ?? undefined,
        logo: (data as any).logo || undefined,
      };
  } catch (error) {
    console.error('法人の取得に失敗しました:', error);
    return null;
  }
}

/**
 * Slugで法人を取得
 */
export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  try {
    // 環境変数が設定されていない場合はnullを返す
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      return null;
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('法人の取得エラー:', error);
      return null;
    }

    if (!data) return null;

    // メンバー数をprofilesテーブルから集計
    const { count: memberCount, error: memberError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', data.id);

    if (memberError) {
      console.error(`法人 ${data.name} のメンバー数取得エラー:`, memberError);
    }

    // 平均スコアをsurvey_responsesテーブルから計算
    let avgScore = 0;
    try {
      const { data: responses, error: responseError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('organization_id', data.id);

      if (responseError) {
        console.error(`法人 ${data.name} の回答データ取得エラー:`, responseError);
      } else if (responses && responses.length > 0) {
        // SurveyResponse型に変換
        const surveyResponses = responses.map((r: any) => ({
          id: r.id,
          surveyId: r.survey_id,
          orgId: r.organization_id,
          respondentName: r.respondent_name || '',
          submittedAt: r.submitted_at,
          answers: Array.isArray(r.answers) ? r.answers : (typeof r.answers === 'string' ? JSON.parse(r.answers) : []),
        }));

        const rankDefinition = getRankDefinition(data.id);
        const orgScores = calculateOrgAverageScore(data.id, surveyResponses, rankDefinition);
        avgScore = calculateOverallScore(orgScores);
      }
    } catch (error) {
      console.error(`法人 ${data.name} の平均スコア計算エラー:`, error);
    }

      return {
        id: data.id,
        slug: data.slug,
        name: data.name,
        createdAt: data.created_at.split('T')[0],
        memberCount: memberCount || 0,
        avgScore: Math.round(avgScore),
        accountId: (data as any).account_id || data.slug,
        password: (data as any).password, // パスワードを取得
        email: (data as any).email, // メールアドレスを取得
        minRequiredRespondents: (data as any).min_required_respondents ?? undefined,
        logo: (data as any).logo || undefined,
      };
  } catch (error) {
    console.error('法人の取得に失敗しました:', error);
    return null;
  }
}

/**
 * 新規法人を作成
 */
export async function createOrganization(
  orgData: Omit<Organization, 'id' | 'createdAt' | 'memberCount' | 'avgScore'>
): Promise<Organization | null> {
  try {
    // 環境変数が設定されていない場合はエラーを投げる
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      throw new Error('Supabase環境変数が設定されていません。');
    }

    const insertData: Record<string, unknown> = {
      slug: orgData.slug,
      name: orgData.name,
      account_id: orgData.accountId, // アカウントIDを保存
      password: orgData.password, // パスワードを保存
      email: orgData.email, // メールアドレスを保存
    };
    if (orgData.minRequiredRespondents != null) {
      insertData.min_required_respondents = orgData.minRequiredRespondents;
    }
    if (orgData.logo != null) {
      insertData.logo = orgData.logo;
    }

    const { data, error } = await supabase
      .from('organizations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('法人の作成エラー:', error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      createdAt: data.created_at.split('T')[0],
      memberCount: 0,
      avgScore: 0,
      accountId: (data as any).account_id || data.slug,
      password: (data as any).password || orgData.password, // Supabaseから取得したパスワードを使用
      // その他のフィールドは現在のスキーマにないため、デフォルト値を使用
      logo: orgData.logo,
      description: orgData.description,
      website: orgData.website,
      address: orgData.address,
      phone: orgData.phone,
      email: orgData.email,
      minRequiredRespondents: (data as any).min_required_respondents ?? orgData.minRequiredRespondents,
    };
  } catch (error) {
    console.error('法人の作成に失敗しました:', error);
    throw error;
  }
}

/**
 * 法人を更新
 */
export async function updateOrganization(
  id: string,
  orgData: Partial<Omit<Organization, 'id' | 'createdAt' | 'memberCount' | 'avgScore'>>
): Promise<Organization | null> {
  try {
    // 環境変数が設定されていない場合はエラーを投げる
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      throw new Error('Supabase環境変数が設定されていません。');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (orgData.name) updateData.name = orgData.name;
    if (orgData.slug) updateData.slug = orgData.slug;
    if (orgData.accountId) updateData.account_id = orgData.accountId;
    if (orgData.password) updateData.password = orgData.password; // パスワードを更新
    if (orgData.email !== undefined) updateData.email = orgData.email; // メールアドレスを更新（空文字列も許可）
    if (orgData.minRequiredRespondents !== undefined) updateData.min_required_respondents = orgData.minRequiredRespondents;
    if (orgData.logo !== undefined) updateData.logo = orgData.logo;

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('法人の更新エラー:', error);
      throw error;
    }

    if (!data) return null;

    // メンバー数をprofilesテーブルから集計
    const { count: memberCount, error: memberError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', data.id);

    if (memberError) {
      console.error(`法人 ${data.name} のメンバー数取得エラー:`, memberError);
    }

    // 平均スコアをsurvey_responsesテーブルから計算
    let avgScore = 0;
    try {
      const { data: responses, error: responseError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('organization_id', data.id);

      if (responseError) {
        console.error(`法人 ${data.name} の回答データ取得エラー:`, responseError);
      } else if (responses && responses.length > 0) {
        // SurveyResponse型に変換
        const surveyResponses = responses.map((r: any) => ({
          id: r.id,
          surveyId: r.survey_id,
          orgId: r.organization_id,
          respondentName: r.respondent_name || '',
          submittedAt: r.submitted_at,
          answers: Array.isArray(r.answers) ? r.answers : (typeof r.answers === 'string' ? JSON.parse(r.answers) : []),
        }));

        const rankDefinition = getRankDefinition(data.id);
        const orgScores = calculateOrgAverageScore(data.id, surveyResponses, rankDefinition);
        avgScore = calculateOverallScore(orgScores);
      }
    } catch (error) {
      console.error(`法人 ${data.name} の平均スコア計算エラー:`, error);
    }

      return {
        id: data.id,
        slug: data.slug,
        name: data.name,
        createdAt: data.created_at.split('T')[0],
        memberCount: memberCount || 0,
        avgScore: Math.round(avgScore),
        accountId: (data as any).account_id || data.slug,
        password: (data as any).password, // パスワードを取得
        email: (data as any).email, // メールアドレスを取得
        minRequiredRespondents: (data as any).min_required_respondents ?? undefined,
        logo: (data as any).logo || undefined,
      };
  } catch (error) {
    console.error('法人の更新に失敗しました:', error);
    throw error;
  }
}

/**
 * 法人を削除
 */
export async function deleteOrganization(id: string): Promise<boolean> {
  try {
    // 環境変数が設定されていない場合はエラーを投げる
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      throw new Error('Supabase環境変数が設定されていません。');
    }

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('法人の削除エラー:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('法人の削除に失敗しました:', error);
    throw error;
  }
}

/**
 * Slugの重複チェック
 */
export async function checkSlugAvailability(slug: string, excludeId?: string): Promise<boolean> {
  try {
    // 環境変数が設定されていない場合はtrueを返す（チェックをスキップ）
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      console.warn('Supabase環境変数が設定されていないため、Slugの重複チェックをスキップします。');
      return true;
    }

    let query = supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Slugの重複チェックエラー:', error);
      return false;
    }

    // データが存在しない場合、利用可能
    return (data || []).length === 0;
  } catch (error) {
    console.error('Slugの重複チェックに失敗しました:', error);
    return false;
  }
}

/**
 * アカウントIDで法人を取得
 */
export async function getOrganizationByAccountId(accountId: string): Promise<Organization | null> {
  try {
    // 環境変数が設定されていない場合はnullを返す
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      return null;
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (error) {
      // account_idで見つからない場合は、slugで検索（後方互換性）
      const { data: slugData, error: slugError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', accountId)
        .single();

      if (slugError) {
        console.error('法人の取得エラー:', slugError);
        return null;
      }

      if (!slugData) return null;

      // メンバー数と平均スコアを計算（既存のロジックを再利用）
      const { count: memberCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', slugData.id);

      let avgScore = 0;
      try {
        const { data: responses } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('organization_id', slugData.id);

        if (responses && responses.length > 0) {
          const surveyResponses = responses.map((r: any) => ({
            id: r.id,
            surveyId: r.survey_id,
            orgId: r.organization_id,
            respondentName: r.respondent_name || '',
            submittedAt: r.submitted_at,
            answers: Array.isArray(r.answers) ? r.answers : (typeof r.answers === 'string' ? JSON.parse(r.answers) : []),
          }));

          const rankDefinition = getRankDefinition(slugData.id);
          const orgScores = calculateOrgAverageScore(slugData.id, surveyResponses, rankDefinition);
          avgScore = calculateOverallScore(orgScores);
        }
      } catch (error) {
        console.error(`法人 ${slugData.name} の平均スコア計算エラー:`, error);
      }

      return {
        id: slugData.id,
        slug: slugData.slug,
        name: slugData.name,
        createdAt: slugData.created_at.split('T')[0],
        memberCount: memberCount || 0,
        avgScore: Math.round(avgScore),
        accountId: (slugData as any).account_id || slugData.slug,
        password: (slugData as any).password, // パスワードを取得
        email: (slugData as any).email, // メールアドレスを取得
      };
    }

    if (!data) return null;

    // メンバー数と平均スコアを計算
    const { count: memberCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', data.id);

    let avgScore = 0;
    try {
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('organization_id', data.id);

      if (responses && responses.length > 0) {
        const surveyResponses = responses.map((r: any) => ({
          id: r.id,
          surveyId: r.survey_id,
          orgId: r.organization_id,
          respondentName: r.respondent_name || '',
          submittedAt: r.submitted_at,
          answers: Array.isArray(r.answers) ? r.answers : (typeof r.answers === 'string' ? JSON.parse(r.answers) : []),
        }));

        const rankDefinition = getRankDefinition(data.id);
        const orgScores = calculateOrgAverageScore(data.id, surveyResponses, rankDefinition);
        avgScore = calculateOverallScore(orgScores);
      }
    } catch (error) {
      console.error(`法人 ${data.name} の平均スコア計算エラー:`, error);
    }

      return {
        id: data.id,
        slug: data.slug,
        name: data.name,
        createdAt: data.created_at.split('T')[0],
        memberCount: memberCount || 0,
        avgScore: Math.round(avgScore),
        accountId: (data as any).account_id || data.slug,
        password: (data as any).password, // パスワードを取得
        email: (data as any).email, // メールアドレスを取得
        minRequiredRespondents: (data as any).min_required_respondents ?? undefined,
        logo: (data as any).logo || undefined,
      };
  } catch (error) {
    console.error('法人の取得に失敗しました:', error);
    return null;
  }
}

/**
 * パスワード再設定トークンを生成して保存
 */
export async function generatePasswordResetToken(accountId: string): Promise<string | null> {
  try {
    // 環境変数が設定されていない場合はエラーを投げる
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      throw new Error('Supabase環境変数が設定されていません。');
    }

    // アカウントIDで法人を検索
    const org = await getOrganizationByAccountId(accountId);
    if (!org) {
      return null;
    }

    // ランダムなトークンを生成（32文字の英数字）
    const resetToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // 有効期限は1時間後
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // organizationsテーブルにトークンと有効期限を保存
    const { error } = await supabase
      .from('organizations')
      .update({
        password_reset_token: resetToken,
        password_reset_expires_at: expiresAt.toISOString(),
      })
      .eq('id', org.id);

    if (error) {
      console.error('パスワード再設定トークンの保存エラー:', error);
      throw error;
    }

    return resetToken;
  } catch (error) {
    console.error('パスワード再設定トークンの生成に失敗しました:', error);
    return null;
  }
}

/**
 * パスワード再設定トークンを検証
 */
export async function verifyPasswordResetToken(resetToken: string): Promise<Organization | null> {
  try {
    // 環境変数が設定されていない場合はnullを返す
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      return null;
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('password_reset_token', resetToken)
      .gt('password_reset_expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      console.error('パスワード再設定トークンの検証エラー:', error);
      return null;
    }

    // メンバー数と平均スコアを計算
    const { count: memberCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', data.id);

    let avgScore = 0;
    try {
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('organization_id', data.id);

      if (responses && responses.length > 0) {
        const surveyResponses = responses.map((r: any) => ({
          id: r.id,
          surveyId: r.survey_id,
          orgId: r.organization_id,
          respondentName: r.respondent_name || '',
          submittedAt: r.submitted_at,
          answers: Array.isArray(r.answers) ? r.answers : (typeof r.answers === 'string' ? JSON.parse(r.answers) : []),
        }));

        const rankDefinition = getRankDefinition(data.id);
        const orgScores = calculateOrgAverageScore(data.id, surveyResponses, rankDefinition);
        avgScore = calculateOverallScore(orgScores);
      }
    } catch (error) {
      console.error(`法人 ${data.name} の平均スコア計算エラー:`, error);
    }

    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      createdAt: data.created_at.split('T')[0],
      memberCount: memberCount || 0,
      avgScore: Math.round(avgScore),
      accountId: (data as any).account_id || data.slug,
      password: (data as any).password,
      email: (data as any).email, // メールアドレスを取得
      minRequiredRespondents: (data as any).min_required_respondents ?? undefined,
      logo: (data as any).logo || undefined,
    };
  } catch (error) {
    console.error('パスワード再設定トークンの検証に失敗しました:', error);
    return null;
  }
}

/**
 * パスワードを再設定
 */
export async function resetPassword(resetToken: string, newPassword: string): Promise<boolean> {
  try {
    // 環境変数が設定されていない場合はエラーを投げる
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      throw new Error('Supabase環境変数が設定されていません。');
    }

    // トークンを検証
    const org = await verifyPasswordResetToken(resetToken);
    if (!org) {
      return false;
    }

    // パスワードを更新し、トークンを無効化
    const { error } = await supabase
      .from('organizations')
      .update({
        password: newPassword,
        password_reset_token: null,
        password_reset_expires_at: null,
      })
      .eq('id', org.id);

    if (error) {
      console.error('パスワード再設定エラー:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('パスワード再設定に失敗しました:', error);
    return false;
  }
}
