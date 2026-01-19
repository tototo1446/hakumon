
import React, { useState, useEffect } from 'react';
import { Organization } from '../types';
import { MOCK_ORGS } from '../constants';
import { getOrganizationById, getOrganizationByAccountId } from '../services/organizationService';

interface LoginProps {
  onLogin: (org: Organization, isSuperAdmin?: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tenantOrg, setTenantOrg] = useState<Organization | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tenantId = params.get('tenant'); // slug（会社名ベース）を使用
    
    if (tenantId) {
      loadTenantOrganization(tenantId);
    }
  }, []);

  const loadTenantOrganization = async (orgId: string) => {
    try {
      // まずSupabaseから取得を試みる
      const org = await getOrganizationById(orgId);
      if (org) {
        setTenantOrg(org);
        setAccountId(org.accountId);
        return;
      }
    } catch (error) {
      console.error('法人の取得に失敗しました:', error);
    }
    
    // Supabaseから取得できない場合は、MOCK_ORGSから検索（後方互換性）
    const org = MOCK_ORGS.find(o => o.id === orgId || o.slug === orgId);
    if (org) {
      setTenantOrg(org);
      setAccountId(org.accountId);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // エラーメッセージをリセット

    // 法人用ログインページの場合（tenantOrgが設定されている）
    if (tenantOrg) {
      // その法人のアカウントIDのみ受け付ける
      if (accountId !== tenantOrg.accountId) {
        setError('この法人のアカウントIDを入力してください。');
        return;
      }

      // パスワードチェック
      if (tenantOrg.password === password || password === 'demo123') {
        onLogin(tenantOrg, false);
      } else {
        setError('パスワードが正しくありません。');
      }
      return;
    }

    // 管理者用ログインページの場合（tenantOrgが設定されていない）
    // 管理者ID（admin）のみ受け付ける
    if (accountId === 'admin' && password === 'admin') {
      // システム管理者用のダミー組織を作成
      const adminOrg: Organization = {
        id: 'system-admin',
        slug: 'system',
        name: 'システム管理者',
        createdAt: new Date().toISOString(),
        memberCount: 0,
        avgScore: 0,
        accountId: 'admin',
        password: 'admin',
      };
      onLogin(adminOrg, true);
      return;
    }

    // 管理者用ログインページでアカウントIDが入力された場合、アカウントIDで法人を検索
    try {
      const org = await getOrganizationByAccountId(accountId);
      if (org) {
        // パスワードチェック
        if (org.password === password || password === 'demo123') {
          onLogin(org, false);
        } else {
          setError('パスワードが正しくありません。');
        }
        return;
      }
    } catch (error) {
      console.error('法人の取得に失敗しました:', error);
    }

    // MOCK_ORGSからも検索（後方互換性）
    const mockOrg = MOCK_ORGS.find(o => o.accountId === accountId);
    if (mockOrg) {
      if (mockOrg.password === password || password === 'demo123') {
        onLogin(mockOrg, false);
      } else {
        setError('パスワードが正しくありません。');
      }
      return;
    }

    setError('アカウントIDまたはパスワードが正しくありません。');
  };

  const clearTenant = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('tenant');
    window.location.href = url.toString();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 border-t-4 border-indigo-600">
          <div className="text-center mb-8 sm:mb-10">
            {tenantOrg ? (
              <>
                <div className="inline-block p-3 rounded-xl bg-indigo-50 text-indigo-600 mb-4">
                  <span className="text-xl sm:text-2xl font-bold">🏢</span>
                </div>
                <div className="flex justify-center mb-3">
                  <img src="/HAKUMON logo.png" alt="HAKUMON" className="h-8 sm:h-10 w-auto" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">{tenantOrg.name}</h1>
                <p className="text-slate-500 text-xs sm:text-sm">HAKUMON ログイン</p>
                <button 
                  onClick={clearTenant}
                  className="mt-2 text-[10px] text-slate-400 hover:text-indigo-600 font-bold uppercase tracking-widest"
                >
                  ← システム全体ログインに戻る
                </button>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <img src="/HAKUMON logo.png" alt="HAKUMON" className="h-12 sm:h-16 w-auto" />
                </div>
                <p className="text-slate-500 text-sm sm:text-base">システム管理者用ログイン</p>
              </>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {tenantOrg ? 'アカウントID' : '管理者ID'}
              </label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder={tenantOrg ? tenantOrg.accountId : "管理者ID (admin)"}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                required
                readOnly={!!tenantOrg} // 法人用ログインページでは読み取り専用
              />
              {tenantOrg ? (
                <p className="mt-1 text-xs text-slate-500">
                  この法人のアカウントID: {tenantOrg.accountId}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  管理者用ログインページでは管理者ID（admin）のみ使用できます
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">パスワード</label>
                <a href="#" className="text-xs text-indigo-600 hover:text-indigo-500">パスワードを忘れましたか？</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-95"
            >
              ログイン
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100">
            <p className="text-center text-xs text-slate-400 font-medium uppercase tracking-widest mb-4">Demo Accounts</p>
            <div className="grid grid-cols-1 gap-3">
              {tenantOrg ? (
                // 法人用ログインページ：その法人のアカウントのみ
                <button
                  onClick={() => { setAccountId(tenantOrg.accountId); setPassword('demo123'); }}
                  className="text-[10px] py-2 px-3 bg-slate-50 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  {tenantOrg.name}
                </button>
              ) : (
                // 管理者用ログインページ：管理者アカウントのみ
                <button
                  onClick={() => { setAccountId('admin'); setPassword('admin'); }}
                  className="text-[10px] py-2 px-3 bg-slate-50 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  System Admin
                </button>
              )}
            </div>
          </div>
        </div>
        <p className="mt-8 text-center text-slate-400 text-sm">
          &copy; 2024 HAKUMON
        </p>
      </div>
    </div>
  );
};

export default Login;
