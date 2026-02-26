import React, { useState, useEffect } from 'react';
import { User, Role, Organization } from '../types';
import { MOCK_ORGS } from '../constants';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Omit<User, 'id' | 'scores'>) => void;
  user?: User | null; // 編集時は既存のユーザーデータ、新規追加時はnull
  orgId?: string; // 法人専用ダッシュボードの場合、所属法人IDを指定
  organizations?: Organization[]; // 組織一覧（Supabaseから取得）
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, user, orgId, organizations }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: Role.USER,
    orgId: orgId || '',
    department: '',
    position: '',
  });

  useEffect(() => {
    if (user) {
      // 編集モード：既存データをフォームに設定
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || Role.USER,
        orgId: user.orgId || orgId || '',
        department: user.department || '',
        position: user.position || '',
      });
    } else {
      // 新規追加モード：フォームをリセット
      setFormData({
        name: '',
        email: '',
        role: Role.USER,
        orgId: orgId || '',
        department: '',
        position: '',
      });
    }
  }, [user, orgId, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.orgId) {
      alert('名前、メールアドレス、所属法人は必須項目です。');
      return;
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('有効なメールアドレスを入力してください。');
      return;
    }

    const userData: Omit<User, 'id' | 'scores'> = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
      orgId: formData.orgId,
      department: formData.department.trim() || undefined,
      position: formData.position.trim() || undefined,
      pendingPassword: false,
    };

    onSave(userData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden">
      <div className="flex items-end sm:items-center justify-center min-h-screen px-0 sm:px-4 pt-4 pb-0 sm:pb-20 text-center sm:block sm:p-0">
        {/* オーバーレイ */}
        <div 
          className="fixed inset-0 transition-opacity bg-slate-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* モーダル */}
        <div className="inline-block w-full max-h-[90vh] sm:max-h-none align-bottom bg-white rounded-t-2xl sm:rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 sm:px-6 pt-6 pb-4 overflow-y-auto max-h-[calc(90vh-8rem)] sm:max-h-none">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {user ? 'ユーザー情報を編集' : '新規ユーザーを追加'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* 名前 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    氏名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* メールアドレス */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={!!user} // 編集時はメールアドレス変更不可
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none ${
                      user ? 'bg-slate-50 text-slate-500' : ''
                    }`}
                  />
                  {user && (
                    <p className="mt-1 text-xs text-slate-500">
                      メールアドレスは変更できません
                    </p>
                  )}
                </div>

                {/* ロール */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ロール <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                  >
                    <option value={Role.USER}>ユーザー</option>
                    <option value={Role.ORG_ADMIN}>法人管理者</option>
                    {!orgId && (
                      <option value={Role.SUPER_ADMIN}>システム管理者</option>
                    )}
                  </select>
                </div>

                {/* 所属法人 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    所属法人 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="orgId"
                    value={formData.orgId}
                    onChange={handleInputChange}
                    required
                    disabled={!!orgId} // 法人専用ダッシュボードの場合は固定
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none ${
                      orgId ? 'bg-slate-50 text-slate-500' : ''
                    }`}
                  >
                    <option value="">選択してください</option>
                    {(organizations && organizations.length > 0 ? organizations : MOCK_ORGS).map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  {orgId && (
                    <p className="mt-1 text-xs text-slate-500">
                      この法人のメンバーとして追加されます
                    </p>
                  )}
                </div>

                {/* 部署と役職 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      部署
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      placeholder="例: IT企画部"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      役職
                    </label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      placeholder="例: 部長"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
              >
                {user ? '更新' : '追加'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserModal;

