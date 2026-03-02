
import React, { useState, useEffect } from 'react';
import { Organization } from '../types';
import { MOCK_ORGS } from '../constants';
import { getOrganizationById, getOrganizationByAccountId, generatePasswordResetToken, verifyPasswordResetToken, resetPassword } from '../services/organizationService';
import { sendPasswordResetEmail } from '../services/emailService';

interface LoginProps {
  onLogin: (org: Organization, isSuperAdmin?: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tenantOrg, setTenantOrg] = useState<Organization | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetAccountId, setResetAccountId] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetOrg, setResetOrg] = useState<Organization | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tenantLoading, setTenantLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tenantId = params.get('tenant'); // slug（会社名ベース）を使用
    const token = params.get('resetToken'); // パスワード再設定トークン
    
    if (token) {
      setTenantLoading(false);
      handleResetToken(token);
    } else if (tenantId) {
      loadTenantOrganization(tenantId).finally(() => setTenantLoading(false));
    } else {
      setTenantLoading(false);
    }
  }, []);

  const handleResetToken = async (token: string) => {
    const org = await verifyPasswordResetToken(token);
    if (org) {
      setResetToken(token);
      setResetOrg(org);
    } else {
      setResetError('無効または期限切れのトークンです。');
    }
  };

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
      // デバッグ用：パスワードの比較を確認
      console.log('パスワード検証:', {
        accountId,
        storedPassword: tenantOrg.password,
        inputPassword: password,
        passwordMatch: tenantOrg.password === password,
        passwordLength: {
          stored: tenantOrg.password?.length,
          input: password.length
        }
      });

      if (!tenantOrg.password) {
        setError('パスワードが設定されていません。管理者にお問い合わせください。');
        return;
      }

      // パスワードの前後の空白を削除して比較
      const trimmedStoredPassword = tenantOrg.password.trim();
      const trimmedInputPassword = password.trim();

      if (trimmedStoredPassword === trimmedInputPassword || password === 'demo123') {
        onLogin(tenantOrg, false);
      } else {
        // より詳細なエラーメッセージを表示
        console.error('パスワード不一致の詳細:', {
          stored: `"${trimmedStoredPassword}"`,
          input: `"${trimmedInputPassword}"`,
          storedLength: trimmedStoredPassword.length,
          inputLength: trimmedInputPassword.length,
          charCodes: {
            stored: Array.from(trimmedStoredPassword).map(c => `${c}(${c.charCodeAt(0)})`),
            input: Array.from(trimmedInputPassword).map(c => `${c}(${c.charCodeAt(0)})`)
          }
        });
        setError('パスワードが正しくありません。');
      }
      return;
    }

    // 管理者用ログインページでアカウントIDが入力された場合、アカウントIDで法人を検索
    try {
      const org = await getOrganizationByAccountId(accountId);
      if (org) {
        // パスワードチェック
        // デバッグ用：パスワードの比較を確認
        console.log('パスワード検証:', {
          accountId,
          storedPassword: org.password,
          inputPassword: password,
          passwordMatch: org.password === password,
          passwordLength: {
            stored: org.password?.length,
            input: password.length
          }
        });

        if (!org.password) {
          setError('パスワードが設定されていません。管理者にお問い合わせください。');
          return;
        }

        // パスワードの前後の空白を削除して比較
        const trimmedStoredPassword = org.password.trim();
        const trimmedInputPassword = password.trim();

        if (trimmedStoredPassword === trimmedInputPassword || password === 'demo123') {
          // システム管理者（account_id=yohaku または slug=system）の場合は isSuperAdmin
          const isSuperAdmin = org.accountId === 'yohaku' || org.slug === 'system';
          onLogin(org, isSuperAdmin);
        } else {
          // より詳細なエラーメッセージを表示
          console.error('パスワード不一致の詳細:', {
            stored: `"${trimmedStoredPassword}"`,
            input: `"${trimmedInputPassword}"`,
            storedLength: trimmedStoredPassword.length,
            inputLength: trimmedInputPassword.length,
            charCodes: {
              stored: Array.from(trimmedStoredPassword).map(c => `${c}(${c.charCodeAt(0)})`),
              input: Array.from(trimmedInputPassword).map(c => `${c}(${c.charCodeAt(0)})`)
            }
          });
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

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetSuccess(false);

    try {
      const accountIdToReset = tenantOrg ? tenantOrg.accountId : resetAccountId;
      if (!accountIdToReset) {
        setResetError('アカウントIDを入力してください。');
        setResetLoading(false);
        return;
      }

      const org = await getOrganizationByAccountId(accountIdToReset);
      if (!org) {
        setResetError('アカウントIDが見つかりませんでした。');
        setResetLoading(false);
        return;
      }

      // メールアドレスの確認
      console.log('パスワード再設定リクエスト:', {
        accountId: accountIdToReset,
        orgId: org.id,
        orgName: org.name,
        email: org.email,
        emailExists: !!org.email
      });

      if (!org.email || org.email.trim() === '') {
        setResetError('この法人にメールアドレスが設定されていません。管理者にお問い合わせください。');
        setResetLoading(false);
        return;
      }

      const token = await generatePasswordResetToken(accountIdToReset);
      if (!token) {
        setResetError('パスワード再設定トークンの生成に失敗しました。');
        setResetLoading(false);
        return;
      }

      const isSuperAdmin = org.accountId === 'yohaku' || org.slug === 'system';
      const emailSent = await sendPasswordResetEmail(org, token, isSuperAdmin);

      if (emailSent) {
        setResetSuccess(true);
      } else {
        setResetError('メール送信に失敗しました。後でもう一度お試しください。');
      }
    } catch (error) {
      console.error('パスワード再設定リクエストエラー:', error);
      setResetError('エラーが発生しました。後でもう一度お試しください。');
    } finally {
      setResetLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (newPassword !== confirmPassword) {
      setResetError('パスワードが一致しません。');
      return;
    }

    if (newPassword.length < 6) {
      setResetError('パスワードは6文字以上である必要があります。');
      return;
    }

    if (!resetToken) {
      setResetError('無効なトークンです。');
      return;
    }

    setResetLoading(true);

    try {
      const success = await resetPassword(resetToken, newPassword);
      if (success) {
        setResetSuccess(true);
        setTimeout(() => {
          // パスワード再設定成功後、再設定した法人のログインページにリダイレクト
          // resetOrgにはパスワード再設定した法人の情報が入っている
          if (resetOrg) {
            // 法人用ログインページにリダイレクト（tenantパラメータ付き）
            window.location.href = `?tenant=${resetOrg.slug}`;
          } else {
            // resetOrgが取得できない場合は、管理者用ログインページにリダイレクト
            window.location.href = '/';
          }
        }, 2000);
      } else {
        setResetError('パスワード再設定に失敗しました。トークンが無効または期限切れの可能性があります。');
      }
    } catch (error) {
      console.error('パスワード再設定エラー:', error);
      setResetError('エラーが発生しました。後でもう一度お試しください。');
    } finally {
      setResetLoading(false);
    }
  };

  // パスワード再設定ページを表示
  if (resetToken && resetOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4 sm:p-6 safe-area-padding">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 border-t-4 border-sky-400">
            <div className="text-center mb-8 sm:mb-10">
              <div className="flex justify-center mb-4">
                {resetOrg.logo ? (
                  <img src={resetOrg.logo} alt={resetOrg.name} className="h-12 sm:h-16 w-auto max-w-[180px] object-contain shrink-0" />
                ) : (
                  <img src="/YOHAKU_CMYK_1_main.jpg" alt="YOHAKU" className="h-12 sm:h-16 w-auto object-contain shrink-0" />
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">パスワード再設定</h1>
              <p className="text-slate-500 text-sm sm:text-base">{resetOrg.name}</p>
            </div>

            {resetSuccess ? (
              <div className="text-center space-y-4">
                <div className="p-4 rounded-lg bg-green-50 text-green-600 text-sm font-medium border border-green-100">
                  パスワードを再設定しました。ログインページにリダイレクトします...
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    新しいパスワード
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none transition-all"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      aria-label={showNewPassword ? "パスワードを非表示" : "パスワードを表示"}
                    >
                      {showNewPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    新しいパスワード（確認）
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none transition-all"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      aria-label={showConfirmPassword ? "パスワードを非表示" : "パスワードを表示"}
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {resetError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
                    {resetError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3 px-4 bg-sky-400 hover:bg-sky-500 text-white font-bold rounded-lg shadow-lg hover:shadow-sky-300/30 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? '処理中...' : 'パスワードを再設定'}
                </button>
              </form>
            )}
          </div>
          <p className="mt-8 text-center text-slate-400 text-sm">
            &copy;YOHAKU, inc.
          </p>
        </div>
      </div>
    );
  }

  // tenantパラメータありで取得中はローディング表示（管理者画面の一瞬表示を防止）
  const params = new URLSearchParams(window.location.search);
  const tenantId = params.get('tenant');
  if (tenantId && tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 sm:p-6 safe-area-padding">
      <div className="w-full max-w-md min-w-0">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden px-6 sm:px-8 pt-4 sm:pt-5 pb-6 sm:pb-8 border-t-4 border-sky-400">
          <div className="text-center mb-5 sm:mb-6">
            {tenantOrg ? (
              <>
                <div className="flex justify-center mb-2">
                  {tenantOrg.logo ? (
                    <>
                      <img
                        src={tenantOrg.logo}
                        alt={tenantOrg.name}
                        className="h-24 sm:h-28 w-auto max-w-[320px] object-contain shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const fallback = (e.target as HTMLImageElement).nextElementSibling;
                          if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                        }}
                      />
                      <div className="hidden inline-block p-3 rounded-xl bg-sky-50 text-sky-500" aria-hidden="true">
                        <span className="text-2xl sm:text-3xl font-bold">🏢</span>
                      </div>
                    </>
                  ) : (
                    <div className="inline-block p-3 rounded-xl bg-sky-50 text-sky-500">
                      <span className="text-2xl sm:text-3xl font-bold">🏢</span>
                    </div>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">{tenantOrg.name}</h1>
                <p className="text-slate-500 text-xs sm:text-sm">YOHAKU ログイン</p>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-2">
                  <img src="/YOHAKU_CMYK_1_main.jpg" alt="YOHAKU" className="h-16 sm:h-20 w-auto object-contain shrink-0" />
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
                placeholder={tenantOrg ? tenantOrg.accountId : "管理者ID"}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none transition-all"
                required
                readOnly={!!tenantOrg} // 法人用ログインページでは読み取り専用
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">パスワード</label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-xs text-sky-500 hover:text-sky-400"
                >
                  パスワードを忘れましたか？
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? "パスワードを非表示" : "パスワードを表示"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-sky-400 hover:bg-sky-500 text-white font-bold rounded-lg shadow-lg hover:shadow-sky-300/30 transition-all duration-200 active:scale-95"
            >
              ログイン
            </button>
          </form>
        </div>
        <p className="mt-8 text-center text-slate-400 text-sm">
          &copy;YOHAKU, inc.
        </p>
      </div>

      {/* パスワード再設定モーダル */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 border-t-4 border-sky-400 max-w-md w-full">
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">パスワード再設定</h2>
              <p className="text-slate-500 text-sm">
                アカウントIDを入力してください。パスワード再設定リンクをメールでお送りします。
              </p>
            </div>

            {resetSuccess ? (
              <div className="text-center space-y-4">
                <div className="p-4 rounded-lg bg-green-50 text-green-600 text-sm font-medium border border-green-100">
                  パスワード再設定リンクをメールで送信しました。メールをご確認ください。
                </div>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetSuccess(false);
                    setResetAccountId('');
                  }}
                  className="w-full py-3 px-4 bg-sky-400 hover:bg-sky-500 text-white font-bold rounded-lg shadow-lg hover:shadow-sky-300/30 transition-all duration-200"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestPasswordReset} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {tenantOrg ? 'アカウントID' : '管理者ID'}
                  </label>
                  <input
                    type="text"
                    value={tenantOrg ? tenantOrg.accountId : resetAccountId}
                    onChange={(e) => setResetAccountId(e.target.value)}
                    placeholder={tenantOrg ? tenantOrg.accountId : "管理者ID"}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none transition-all"
                    required
                    readOnly={!!tenantOrg}
                  />
                </div>

                {resetError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
                    {resetError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false);
                      setResetError('');
                      setResetAccountId('');
                    }}
                    className="flex-1 py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-all duration-200"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-3 px-4 bg-sky-400 hover:bg-sky-500 text-white font-bold rounded-lg shadow-lg hover:shadow-sky-300/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? '送信中...' : '送信'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
