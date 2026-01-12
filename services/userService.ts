import { supabase } from '../lib/supabase';
import { User, Role, LiteracyScores } from '../types';

/**
 * Supabaseから全ユーザーを取得
 */
export async function getUsers(orgId?: string): Promise<User[]> {
  try {
    // 環境変数が設定されていない場合は空配列を返す
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      console.warn('Supabase環境変数が設定されていないため、空の配列を返します。');
      return [];
    }

    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // orgIdが指定されている場合はフィルタリング
    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('ユーザー一覧の取得エラー:', error);
      return []; // エラー時は空配列を返す
    }

    // SupabaseのデータをUser型に変換
    return (data || []).map((profile) => ({
      id: profile.id,
      name: profile.name || '',
      email: profile.email || '',
      role: (profile.role as Role) || Role.USER,
      orgId: profile.organization_id || '',
      scores: profile.scores ? JSON.parse(JSON.stringify(profile.scores)) : {
        basics: 0,
        prompting: 0,
        ethics: 0,
        tools: 0,
        automation: 0,
      } as LiteracyScores,
      department: profile.department || undefined,
      position: profile.position || undefined,
      pendingPassword: profile.pending_password || false,
      invitationToken: profile.invitation_token || undefined,
      invitationExpiresAt: profile.invitation_expires_at || undefined,
    }));
  } catch (error) {
    console.error('ユーザー一覧の取得に失敗しました:', error);
    return [];
  }
}

/**
 * IDでユーザーを取得
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    // 環境変数が設定されていない場合はnullを返す
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('ユーザーの取得エラー:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name || '',
      email: data.email || '',
      role: (data.role as Role) || Role.USER,
      orgId: data.organization_id || '',
      scores: data.scores ? JSON.parse(JSON.stringify(data.scores)) : {
        basics: 0,
        prompting: 0,
        ethics: 0,
        tools: 0,
        automation: 0,
      } as LiteracyScores,
      department: data.department || undefined,
      position: data.position || undefined,
      pendingPassword: data.pending_password || false,
      invitationToken: data.invitation_token || undefined,
      invitationExpiresAt: data.invitation_expires_at || undefined,
    };
  } catch (error) {
    console.error('ユーザーの取得に失敗しました:', error);
    return null;
  }
}

/**
 * 新規ユーザーを作成
 */
export async function createUser(
  userData: Omit<User, 'id' | 'scores'>
): Promise<User | null> {
  try {
    // 環境変数が設定されていない場合はエラーを投げる
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      throw new Error('Supabase環境変数が設定されていません。');
    }

    const insertData: any = {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      organization_id: userData.orgId,
      scores: {
        basics: 0,
        prompting: 0,
        ethics: 0,
        tools: 0,
        automation: 0,
      },
      pending_password: userData.pendingPassword || false,
    };

    if (userData.department) {
      insertData.department = userData.department;
    }
    if (userData.position) {
      insertData.position = userData.position;
    }
    if (userData.invitationToken) {
      insertData.invitation_token = userData.invitationToken;
    }
    if (userData.invitationExpiresAt) {
      insertData.invitation_expires_at = userData.invitationExpiresAt;
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('ユーザーの作成エラー:', error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name || '',
      email: data.email || '',
      role: (data.role as Role) || Role.USER,
      orgId: data.organization_id || '',
      scores: data.scores ? JSON.parse(JSON.stringify(data.scores)) : {
        basics: 0,
        prompting: 0,
        ethics: 0,
        tools: 0,
        automation: 0,
      } as LiteracyScores,
      department: data.department || undefined,
      position: data.position || undefined,
      pendingPassword: data.pending_password || false,
      invitationToken: data.invitation_token || undefined,
      invitationExpiresAt: data.invitation_expires_at || undefined,
    };
  } catch (error) {
    console.error('ユーザーの作成に失敗しました:', error);
    throw error;
  }
}

/**
 * ユーザーを更新
 */
export async function updateUser(
  id: string,
  userData: Partial<Omit<User, 'id' | 'scores'>>
): Promise<User | null> {
  try {
    // 環境変数が設定されていない場合はエラーを投げる
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      throw new Error('Supabase環境変数が設定されていません。');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (userData.name) updateData.name = userData.name;
    if (userData.email) updateData.email = userData.email;
    if (userData.role) updateData.role = userData.role;
    if (userData.orgId) updateData.organization_id = userData.orgId;
    if (userData.department !== undefined) updateData.department = userData.department || null;
    if (userData.position !== undefined) updateData.position = userData.position || null;
    if (userData.pendingPassword !== undefined) updateData.pending_password = userData.pendingPassword;
    if (userData.invitationToken !== undefined) updateData.invitation_token = userData.invitationToken || null;
    if (userData.invitationExpiresAt !== undefined) updateData.invitation_expires_at = userData.invitationExpiresAt || null;

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('ユーザーの更新エラー:', error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name || '',
      email: data.email || '',
      role: (data.role as Role) || Role.USER,
      orgId: data.organization_id || '',
      scores: data.scores ? JSON.parse(JSON.stringify(data.scores)) : {
        basics: 0,
        prompting: 0,
        ethics: 0,
        tools: 0,
        automation: 0,
      } as LiteracyScores,
      department: data.department || undefined,
      position: data.position || undefined,
      pendingPassword: data.pending_password || false,
      invitationToken: data.invitation_token || undefined,
      invitationExpiresAt: data.invitation_expires_at || undefined,
    };
  } catch (error) {
    console.error('ユーザーの更新に失敗しました:', error);
    throw error;
  }
}

/**
 * ユーザーを削除
 */
export async function deleteUser(id: string): Promise<boolean> {
  try {
    // 環境変数が設定されていない場合はエラーを投げる
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      throw new Error('Supabase環境変数が設定されていません。');
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('ユーザーの削除エラー:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('ユーザーの削除に失敗しました:', error);
    throw error;
  }
}
