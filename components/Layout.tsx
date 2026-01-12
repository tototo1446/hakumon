
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Organization } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  org: Organization;
  isSuperAdmin: boolean;
  onLogout: () => void;
  activeView: string;
}

const Layout: React.FC<LayoutProps> = ({ children, org, isSuperAdmin, onLogout, activeView }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // 現在のパスが指定されたパスと一致するかチェック
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  // 法人用の場合はtenantパラメータを取得
  const getTenantParam = () => {
    if (isSuperAdmin) return '';
    const params = new URLSearchParams(location.search);
    const tenantId = params.get('tenant');
    return tenantId ? `?tenant=${tenantId}` : (org ? `?tenant=${org.id}` : '');
  };

  // Linkのto属性を生成（法人用の場合はtenantパラメータを追加）
  const createLinkTo = (path: string) => {
    const tenantParam = getTenantParam();
    return tenantParam ? `${path}${tenantParam}` : path;
  };

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 text-slate-900 flex flex-col transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <img src="/EffiQ-logo.png" alt="EffiQ" className="h-8 w-auto" />
          </div>
          <p className="text-xs text-slate-500 mt-1">Enterprise Dashboard</p>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-1">
          <Link
            to={createLinkTo('/dashboard')}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/dashboard') ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            <span className="mr-3">📊</span>
            ダッシュボード
          </Link>

          {!isSuperAdmin && (
            <Link
              to={createLinkTo('/surveys')}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/surveys') ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <span className="mr-3">📝</span>
              アンケート管理
            </Link>
          )}

          {!isSuperAdmin && (
            <Link
              to={createLinkTo('/rank-definition')}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/rank-definition') ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <span className="mr-3">⭐</span>
              ランク定義設定
            </Link>
          )}

          <Link
            to={createLinkTo('/growth')}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/growth') ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            <span className="mr-3">📈</span>
            成長率分析
          </Link>

          {isSuperAdmin && (
            <Link
              to="/orgs"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/orgs') ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <span className="mr-3">🏢</span>
              法人管理
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center p-3 mb-4 rounded-lg bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-xs text-white">
              {org.name.charAt(0)}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium truncate text-slate-900">{org.name}</p>
              <p className="text-xs text-slate-500 truncate">{isSuperAdmin ? 'システム管理者' : '法人アカウント'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              onLogout();
              setIsMobileMenuOpen(false);
            }}
            className="w-full py-2 px-4 rounded-lg border border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50 transition-all text-sm"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full lg:w-auto bg-slate-900">
        <header className="h-16 bg-slate-800 border-b border-slate-700 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="メニューを開く"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-base lg:text-lg font-semibold text-white">
            {isActive('/dashboard') && '分析ダッシュボード'}
            {isActive('/surveys') && !isSuperAdmin && 'アンケート管理'}
            {isActive('/rank-definition') && !isSuperAdmin && 'ランク定義設定'}
            {isActive('/growth') && '回答者別成長率分析'}
            {isActive('/orgs') && '法人アカウント管理'}
            </h2>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-4">
            <div className="text-xs font-medium px-2 lg:px-2.5 py-0.5 rounded-full bg-indigo-600 text-indigo-100 border border-indigo-500 whitespace-nowrap">
              {isSuperAdmin ? 'システム管理者' : '法人アカウント'}
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-8 bg-slate-900">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
