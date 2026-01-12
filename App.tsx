
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthState, Organization, Role, Survey } from './types';
import { MOCK_ORGS } from './constants';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AdminView from './components/AdminView';
import Login from './components/Login';
import SurveyManagement from './components/SurveyManagement';
import RankDefinitionSettings from './components/RankDefinitionSettings';
import SurveyResponseForm from './components/SurveyResponseForm';
import RespondentGrowthAnalysis from './components/RespondentGrowthAnalysis';
import { findSurveyById } from './services/surveyService';
import { saveResponse } from './services/surveyResponseService';
import { getOrganizationById } from './services/organizationService';

// 認証が必要なルートを保護するコンポーネント
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  auth: AuthState;
  allowedForSuperAdmin?: boolean;
  allowedForOrgAdmin?: boolean;
}> = ({ children, auth, allowedForSuperAdmin = true, allowedForOrgAdmin = true }) => {
  const location = useLocation();

  if (!auth.isAuthenticated || !auth.org) {
    return <Navigate to="/" replace />;
  }

  // tenantパラメータを取得
  const params = new URLSearchParams(location.search);
  const tenantId = params.get('tenant');
  const tenantParam = tenantId ? `?tenant=${tenantId}` : '';

  if (auth.isSuperAdmin && !allowedForSuperAdmin) {
    return <Navigate to={`/dashboard${tenantParam}`} replace />;
  }

  if (!auth.isSuperAdmin && !allowedForOrgAdmin) {
    // 法人用の場合はtenantパラメータを保持
    const orgTenantParam = auth.org ? `?tenant=${auth.org.id}` : '';
    return <Navigate to={`/dashboard${orgTenantParam}`} replace />;
  }

  return <>{children}</>;
};

// メインアプリケーションコンポーネント
const AppContent: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    org: null,
    viewingOrg: null,
    isAuthenticated: false,
    isSuperAdmin: false
  });

  const [publicSurvey, setPublicSurvey] = useState<Survey | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle URL params on initialization
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tenantId = params.get('tenant');
    const surveyId = params.get('survey');
    
    if (tenantId) {
      loadOrganizationById(tenantId);
    }
    
    if (surveyId) {
      const survey = findSurveyById(surveyId);
      if (survey && survey.isActive) {
        setPublicSurvey(survey);
      }
    }
  }, []);

  const loadOrganizationById = async (orgId: string) => {
    try {
      const org = await getOrganizationById(orgId);
      if (org) {
        setAuth(prev => ({ ...prev, viewingOrg: org }));
        return;
      }
    } catch (error) {
      console.error('法人の取得に失敗しました:', error);
    }
    
    const org = MOCK_ORGS.find(o => o.id === orgId || o.slug === orgId);
    if (org) {
      setAuth(prev => ({ ...prev, viewingOrg: org }));
    }
  };

  const handleLogin = (org: Organization, isSuperAdmin?: boolean) => {
    setAuth(prev => ({
      ...prev,
      org,
      isAuthenticated: true,
      isSuperAdmin: isSuperAdmin || false
    }));
    
    // ログイン後、ダッシュボードにリダイレクト
    // 法人用ログインの場合は、URLにtenantパラメータを含める
    const params = new URLSearchParams(window.location.search);
    const tenantId = params.get('tenant');
    
    if (!isSuperAdmin && tenantId) {
      // 法人用ログイン：tenantパラメータを保持
      navigate(`/dashboard?tenant=${tenantId}`);
    } else if (!isSuperAdmin && org) {
      // 法人用ログインだがtenantパラメータがない場合：org.idを使用
      navigate(`/dashboard?tenant=${org.id}`);
    } else {
      // 管理者用ログイン：tenantパラメータなし
      navigate('/dashboard');
    }
  };

  const handleLogout = () => {
    setAuth({ org: null, viewingOrg: null, isAuthenticated: false, isSuperAdmin: false });
    navigate('/');
  };

  const handleSelectOrg = (org: Organization | null) => {
    setAuth(prev => ({ ...prev, viewingOrg: org }));
    // 成長率分析画面以外ではダッシュボードにリダイレクト
    if (org && location.pathname !== '/growth') {
      // 法人用の場合はtenantパラメータを保持
      const params = new URLSearchParams(location.search);
      const tenantId = params.get('tenant');
      if (tenantId) {
        navigate(`/dashboard?tenant=${tenantId}`);
      } else {
        navigate('/dashboard');
      }
    }
  };

  const clearViewingOrg = () => {
    // 法人用の場合はtenantパラメータを保持（viewingOrgのみクリア）
    const params = new URLSearchParams(location.search);
    const tenantId = params.get('tenant');
    
    if (tenantId && !auth.isSuperAdmin) {
      // 法人用の場合はtenantパラメータを保持したままviewingOrgをクリア
      setAuth(prev => ({ ...prev, viewingOrg: null }));
    } else {
      // 管理者用の場合はtenantパラメータを削除
      const url = new URL(window.location.href);
      url.searchParams.delete('tenant');
      window.history.pushState({}, '', url.toString());
      setAuth(prev => ({ ...prev, viewingOrg: null }));
    }
  };

  // 公開回答画面を表示中の場合（ログイン不要）
  if (publicSurvey) {
    const handlePublicResponseSubmit = (response: any) => {
      saveResponse(response);
      alert('アンケートへのご回答ありがとうございました！');
      const url = new URL(window.location.href);
      url.searchParams.delete('survey');
      window.history.pushState({}, '', url.toString());
      setPublicSurvey(null);
    };

    const handlePublicResponseCancel = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('survey');
      window.history.pushState({}, '', url.toString());
      setPublicSurvey(null);
    };

    return (
      <div className="min-h-screen bg-slate-50">
        <SurveyResponseForm
          survey={publicSurvey}
          orgId={publicSurvey.orgId}
          onSubmit={handlePublicResponseSubmit}
          onCancel={handlePublicResponseCancel}
        />
      </div>
    );
  }

  // 現在のパスからactiveViewを決定
  const getActiveView = (): 'dashboard' | 'orgs' | 'surveys' | 'rankDefinition' | 'growth' => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/surveys')) return 'surveys';
    if (path.startsWith('/rank-definition')) return 'rankDefinition';
    if (path.startsWith('/growth')) return 'growth';
    if (path.startsWith('/orgs')) return 'orgs';
    return 'dashboard';
  };

  return (
    <>
      {!auth.isAuthenticated || !auth.org ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Layout
          org={auth.org}
          isSuperAdmin={auth.isSuperAdmin || false}
          onLogout={handleLogout}
          activeView={getActiveView()}
        >
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute auth={auth}>
                  <Dashboard 
                    org={auth.org!}
                    viewingOrg={auth.viewingOrg} 
                    onClearView={clearViewingOrg}
                    organizations={auth.isSuperAdmin ? MOCK_ORGS : undefined}
                    onSelectOrg={handleSelectOrg}
                    isSuperAdmin={auth.isSuperAdmin || false}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/surveys"
              element={
                <ProtectedRoute auth={auth} allowedForSuperAdmin={false}>
                  <SurveyManagement 
                    userRole={Role.ORG_ADMIN}
                    orgId={auth.org!.id}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rank-definition"
              element={
                <ProtectedRoute auth={auth} allowedForSuperAdmin={false}>
                  <RankDefinitionSettings org={auth.org!} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/growth"
              element={
                <ProtectedRoute auth={auth}>
                  <RespondentGrowthAnalysis 
                    org={auth.org!}
                    viewingOrg={auth.viewingOrg}
                    isSuperAdmin={auth.isSuperAdmin || false}
                    organizations={auth.isSuperAdmin ? MOCK_ORGS : undefined}
                    onSelectOrg={handleSelectOrg}
                    onClearView={clearViewingOrg}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orgs"
              element={
                <ProtectedRoute auth={auth} allowedForOrgAdmin={false}>
                  <AdminView type="orgs" onSelectOrg={handleSelectOrg} />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/" 
              element={
                <Navigate 
                  to={auth.isSuperAdmin ? '/dashboard' : `/dashboard?tenant=${auth.org!.id}`} 
                  replace 
                />
              } 
            />
            <Route 
              path="*" 
              element={
                <Navigate 
                  to={auth.isSuperAdmin ? '/dashboard' : `/dashboard?tenant=${auth.org!.id}`} 
                  replace 
                />
              } 
            />
          </Routes>
        </Layout>
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
