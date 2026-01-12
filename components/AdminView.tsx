
import React, { useState, useEffect } from 'react';
import { Organization, User, Role, RankDefinition } from '../types';
import { MOCK_ORGS, MOCK_USERS } from '../constants';
import OrgModal from './OrgModal';
import UserModal from './UserModal';
import RankDefinitionEditor from './RankDefinitionEditor';
import { getRankDefinition } from '../services/rankDefinitionService';
import { generateRandomOrgId } from '../utils/idGenerator';
import { 
  getOrganizations, 
  createOrganization, 
  updateOrganization, 
  deleteOrganization 
} from '../services/organizationService';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser as deleteUserService
} from '../services/userService';

interface AdminViewProps {
  type: 'orgs' | 'users';
  onSelectOrg?: (org: Organization) => void;
  orgId?: string; // 法人専用ダッシュボードの場合、所属法人IDを指定
}

const AdminView: React.FC<AdminViewProps> = ({ type, onSelectOrg, orgId }) => {
  const [orgs, setOrgs] = useState<Organization[]>(MOCK_ORGS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRankDefinitionModalOpen, setIsRankDefinitionModalOpen] = useState(false);
  const [editingRankDefinitionOrg, setEditingRankDefinitionOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);

  // Supabaseからデータを取得
  useEffect(() => {
    if (type === 'orgs') {
      loadOrganizations();
    } else if (type === 'users') {
      loadUsers();
    }
  }, [type, orgId]);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const data = await getOrganizations();
      if (data.length > 0) {
        setOrgs(data);
      } else {
        // Supabaseにデータがない場合は、MOCK_ORGSを使用（後方互換性）
        setOrgs(MOCK_ORGS);
      }
    } catch (error) {
      console.error('法人一覧の読み込みに失敗しました:', error);
      // エラー時はMOCK_ORGSを使用
      setOrgs(MOCK_ORGS);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers(orgId);
      if (data.length > 0) {
        setUsers(data);
      } else {
        // Supabaseにデータがない場合は、MOCK_USERSを使用（後方互換性）
        // orgIdでフィルタリング
        const filteredUsers = orgId 
          ? MOCK_USERS.filter(u => u.orgId === orgId)
          : MOCK_USERS;
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.error('ユーザー一覧の読み込みに失敗しました:', error);
      // エラー時はMOCK_USERSを使用
      const filteredUsers = orgId 
        ? MOCK_USERS.filter(u => u.orgId === orgId)
        : MOCK_USERS;
      setUsers(filteredUsers);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrg = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('この法人アカウントを削除してもよろしいですか？すべてのデータが消失します。')) {
      try {
        await deleteOrganization(id);
        setOrgs(orgs.filter(o => o.id !== id));
      } catch (error) {
        console.error('法人の削除に失敗しました:', error);
        alert('法人の削除に失敗しました。もう一度お試しください。');
      }
    }
  };

  const handleDeleteUser = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('このユーザーを削除してもよろしいですか？')) {
      try {
        await deleteUserService(id);
        setUsers(users.filter(u => u.id !== id));
      } catch (error) {
        console.error('ユーザーの削除に失敗しました:', error);
        alert('ユーザーの削除に失敗しました。もう一度お試しください。');
      }
    }
  };

  const handleOpenTenantLogin = (org: Organization) => {
    // Generate the URL for the specific corporation's login page using slug
    const url = new URL(window.location.href);
    url.searchParams.set('tenant', org.slug); // slug（会社名ベース）を使用
    // Redirect to simulate jumping to the corporate-specific dashboard login
    window.location.href = url.toString();
  };

  const handleOpenAddOrgModal = () => {
    setEditingOrg(null);
    setIsOrgModalOpen(true);
  };

  const handleOpenEditOrgModal = (org: Organization) => {
    setEditingOrg(org);
    setIsOrgModalOpen(true);
  };

  const handleOpenRankDefinitionEditor = (org: Organization) => {
    setEditingRankDefinitionOrg(org);
    setIsRankDefinitionModalOpen(true);
  };

  const handleSaveRankDefinition = (rankDefinition: RankDefinition) => {
    if (editingRankDefinitionOrg) {
      setOrgs(orgs.map(org =>
        org.id === editingRankDefinitionOrg.id
          ? { ...org, rankDefinition }
          : org
      ));
    }
  };

  const handleOpenAddUserModal = () => {
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUserModal = (user: User) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleSaveOrg = async (
    orgData: Omit<Organization, 'id' | 'createdAt' | 'memberCount' | 'avgScore'>, 
    generatedId?: string
  ) => {
    try {
      if (editingOrg) {
        // 編集モード：Supabaseに更新
        const updatedOrg = await updateOrganization(editingOrg.id, orgData);
        if (updatedOrg) {
          // パスワードが空の場合は既存のパスワードを保持
          const updatedOrgData = orgData.password 
            ? orgData 
            : { ...orgData, password: editingOrg.password };
          setOrgs(orgs.map(org => 
            org.id === editingOrg.id 
              ? { ...updatedOrg, ...updatedOrgData }
              : org
          ));
        }
      } else {
        // 新規追加モード：Supabaseに作成
        const newOrg = await createOrganization(orgData);
        if (newOrg) {
          setOrgs([...orgs, newOrg]);
        }
      }
      setIsOrgModalOpen(false);
      setEditingOrg(null);
    } catch (error) {
      console.error('法人の保存に失敗しました:', error);
      alert('法人の保存に失敗しました。もう一度お試しください。');
    }
  };

  const handleSaveUser = async (userData: Omit<User, 'id' | 'scores'>) => {
    try {
      if (editingUser) {
        // 編集モード：Supabaseに更新
        const updatedUser = await updateUser(editingUser.id, userData);
        if (updatedUser) {
          setUsers(users.map(user => 
            user.id === editingUser.id 
              ? updatedUser
              : user
          ));
        }
      } else {
        // 新規追加モード：Supabaseに作成
        const newUser = await createUser(userData);
        if (newUser) {
          setUsers([...users, newUser]);
        }
      }
      setIsUserModalOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error('ユーザーの保存に失敗しました:', error);
      const errorMessage = error?.message || 'ユーザーの保存に失敗しました。';
      
      if (errorMessage.includes('Supabase環境変数')) {
        alert('Supabase環境変数が設定されていません。\n\n.env.localファイルに以下の環境変数を設定してください：\n\nVITE_SUPABASE_URL=your_supabase_url\nVITE_SUPABASE_ANON_KEY=your_supabase_anon_key\n\n設定後、開発サーバーを再起動してください。');
      } else {
        alert(`ユーザーの保存に失敗しました：${errorMessage}\n\nもう一度お試しください。`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={type === 'orgs' ? '法人名で検索...' : '名前またはメールで検索...'}
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>
        {type === 'orgs' ? (
          <button
            onClick={handleOpenAddOrgModal}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            新規法人を追加
          </button>
        ) : (
          <button
            onClick={handleOpenAddUserModal}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            ユーザーを追加
          </button>
        )}
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {type === 'orgs' ? (
                <>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ロゴ</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">法人名</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">識別ID</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">登録日</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">メンバー数</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">平均スコア</th>
                </>
              ) : (
                <>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">氏名</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">メールアドレス</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ロール</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">部署</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">役職</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">所属法人ID</th>
                </>
              )}
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {type === 'orgs' ? (
              orgs.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    {org.logo ? (
                      <img
                        src={org.logo}
                        alt={org.name}
                        className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded border border-slate-200 bg-white"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded border border-slate-200 bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-400 text-base sm:text-lg">🏢</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{org.name}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden lg:table-cell">
                    <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono break-all">
                      {org.id}
                    </code>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden md:table-cell">{org.createdAt}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">{org.memberCount} 名</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${org.avgScore > 70 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                      {org.avgScore}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex flex-wrap justify-end gap-1 sm:gap-2">
                      <button 
                        onClick={() => handleOpenTenantLogin(org)}
                        className="text-indigo-600 hover:text-indigo-900 text-xs sm:text-sm font-bold bg-indigo-50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-block"
                        title="ログインページへ飛ぶ"
                      >
                        ログイン
                      </button>
                      <button 
                        onClick={() => handleOpenRankDefinitionEditor(org)}
                        className="text-purple-600 hover:text-purple-900 text-xs"
                        title="ランク定義を編集"
                      >
                        ランク
                      </button>
                      <button 
                        onClick={() => handleOpenEditOrgModal(org)}
                        className="text-slate-400 hover:text-indigo-600 text-xs"
                      >
                        編集
                      </button>
                      <button onClick={(e) => handleDeleteOrg(org.id, e)} className="text-red-400 hover:text-red-600 text-xs">削除</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              (() => {
                // ユーザーリストをフィルタリング
                let filteredUsers = users;
                
                // 法人専用ダッシュボードの場合、その法人のユーザーのみ表示
                if (orgId) {
                  filteredUsers = filteredUsers.filter(u => u.orgId === orgId);
                }
                
                // 検索クエリでフィルタリング
                if (searchQuery) {
                  const query = searchQuery.toLowerCase();
                  filteredUsers = filteredUsers.filter(u => 
                    u.name.toLowerCase().includes(query) || 
                    u.email.toLowerCase().includes(query)
                  );
                }
                
                return filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-500">
                        {user.name.charAt(0)}
                      </div>
                      <div className="ml-2 sm:ml-3 text-sm font-medium text-slate-900 truncate">{user.name}</div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden md:table-cell truncate max-w-xs">{user.email}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${
                      user.role === Role.SUPER_ADMIN ? 'bg-purple-100 text-purple-800' : 
                      user.role === Role.ORG_ADMIN ? 'bg-blue-100 text-blue-800' : 
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden md:table-cell">{user.department || '-'}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden md:table-cell">{user.position || '-'}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden lg:table-cell truncate">
                    {(() => {
                      const userOrg = orgs.find(o => o.id === user.orgId);
                      return userOrg ? userOrg.slug : user.orgId;
                    })()}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button 
                        onClick={() => handleOpenEditUserModal(user)}
                        className="text-indigo-600 hover:text-indigo-900 text-xs"
                      >
                        編集
                      </button>
                      <button onClick={(e) => handleDeleteUser(user.id, e)} className="text-red-400 hover:text-red-600 text-xs">削除</button>
                    </div>
                  </td>
                </tr>
                ));
              })()
            )}
          </tbody>
        </table>
      </div>

      {/* 法人編集/追加モーダル */}
      {type === 'orgs' && (
        <OrgModal
          isOpen={isOrgModalOpen}
          onClose={() => {
            setIsOrgModalOpen(false);
            setEditingOrg(null);
          }}
          onSave={handleSaveOrg}
          org={editingOrg}
        />
      )}

      {/* ユーザー編集/追加モーダル */}
      {type === 'users' && (
        <UserModal
          isOpen={isUserModalOpen}
          onClose={() => {
            setIsUserModalOpen(false);
            setEditingUser(null);
          }}
          onSave={handleSaveUser}
          user={editingUser}
          orgId={orgId}
          organizations={orgs}
        />
      )}

      {/* ランク定義編集モーダル */}
      {type === 'orgs' && editingRankDefinitionOrg && (
        <RankDefinitionEditor
          orgId={editingRankDefinitionOrg.id}
          isOpen={isRankDefinitionModalOpen}
          onClose={() => {
            setIsRankDefinitionModalOpen(false);
            setEditingRankDefinitionOrg(null);
          }}
          onSave={handleSaveRankDefinition}
          initialRankDefinition={editingRankDefinitionOrg.rankDefinition || getRankDefinition(editingRankDefinitionOrg.id)}
        />
      )}
    </div>
  );
};

export default AdminView;
