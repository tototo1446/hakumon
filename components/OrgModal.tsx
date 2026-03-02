import React, { useState, useEffect } from 'react';
import { Organization } from '../types';
import { generateRandomOrgId, generateRandomSlug } from '../utils/idGenerator';
import { checkNameAvailability, checkSlugAvailability } from '../services/organizationService';

interface OrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (org: Omit<Organization, 'id' | 'createdAt' | 'memberCount' | 'avgScore'>, generatedId?: string) => void;
  org?: Organization | null; // 編集時は既存の法人データ、新規追加時はnull
}

const OrgModal: React.FC<OrgModalProps> = ({ isOpen, onClose, onSave, org }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo: '',
    description: '',
    website: '',
    address: '',
    phone: '',
    email: '',
    accountId: '',
    password: '',
    minRequiredRespondents: '' as string | number,
  });

  const [logoPreview, setLogoPreview] = useState<string>('');
  const [generatedId, setGeneratedId] = useState<string>('');

  useEffect(() => {
    if (org) {
      // 編集モード：既存データをフォームに設定
      setFormData({
        name: org.name || '',
        slug: org.slug || '',
        logo: org.logo || '',
        description: org.description || '',
        website: org.website || '',
        address: org.address || '',
        phone: org.phone || '',
        email: org.email || '',
        accountId: org.accountId || '',
        password: '', // セキュリティのため、編集時は空にする
        minRequiredRespondents: org.minRequiredRespondents ?? '',
      });
      setLogoPreview(org.logo || '');
      setGeneratedId(''); // 編集時はIDを表示しない
    } else {
      // 新規追加モード：フォームをリセットし、ランダム識別IDとSlugを生成
      const newId = generateRandomOrgId();
      const newSlug = generateRandomSlug();
      setGeneratedId(newId);
      setFormData({
        name: '',
        slug: newSlug, // ランダムSlugを自動設定
        logo: '',
        description: '',
        website: '',
        address: '',
        phone: '',
        email: '',
        accountId: '',
        password: '',
        minRequiredRespondents: 5, // デフォルト5名
      });
      setLogoPreview('');
    }
  }, [org, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // 注: Slugは新規作成時に自動生成されるため、手動変更は可能だが推奨しない
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, logo: url }));
    setLogoPreview(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ファイルをData URLに変換してプレビュー
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        setFormData(prev => ({ ...prev, logo: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.slug.trim()) {
      alert('法人名とSlugは必須項目です。');
      return;
    }

    // 法人名の重複チェック（新規作成時、または編集時に名前が変更された場合）
    const nameChanged = org ? formData.name.trim() !== org.name : true;
    if (nameChanged) {
      const isNameAvailable = await checkNameAvailability(formData.name.trim(), org?.id);
      if (!isNameAvailable) {
        alert('この法人名は既に使用されています。別の名前を入力してください。');
        return;
      }
    }

    // Slugの重複チェック（新規作成時、または編集時にSlugが変更された場合）
    const slugChanged = org ? formData.slug !== org.slug : true;
    if (slugChanged) {
      const isAvailable = await checkSlugAvailability(formData.slug.trim(), org?.id);
      if (!isAvailable) {
        alert('このSlugは既に使用されています。別のSlugを入力してください。');
        return;
      }
    }

    if (!formData.accountId.trim()) {
      alert('アカウントIDは必須項目です。');
      return;
    }

    if (!formData.email.trim()) {
      alert('メールアドレスは必須項目です。');
      return;
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      alert('有効なメールアドレスを入力してください。');
      return;
    }

    if (!org && !formData.password.trim()) {
      alert('新規作成時はパスワードを入力してください。');
      return;
    }

    const minVal = formData.minRequiredRespondents === '' || formData.minRequiredRespondents === undefined
      ? undefined
      : Number(formData.minRequiredRespondents);
    const minRequiredRespondents = minVal != null && !Number.isNaN(minVal) && minVal >= 1 ? minVal : undefined;

    onSave({
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      logo: formData.logo || undefined,
      description: formData.description.trim() || undefined,
      website: formData.website.trim() || undefined,
      address: formData.address.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim(),
      accountId: formData.accountId.trim(),
      password: formData.password.trim() || undefined, // 編集時でパスワードが空の場合は変更しない
      minRequiredRespondents,
    }, generatedId || undefined); // 新規作成時のみ生成されたIDを渡す
    
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

        {/* モーダル: モバイルでフル幅・下から表示 */}
        <div className="inline-block w-full max-h-[90vh] sm:max-h-[85vh] align-bottom bg-white rounded-t-2xl sm:rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            <div className="bg-white px-4 sm:px-6 pt-6 pb-4 overflow-y-auto min-h-0 max-h-[calc(90vh-7rem)] sm:max-h-[calc(85vh-7rem)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {org ? '法人情報を編集' : '新規法人を追加'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              <div className="space-y-6">
                {/* ロゴセクション */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ロゴ
                  </label>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="ロゴプレビュー"
                          className="w-24 h-24 object-contain border border-slate-200 rounded-lg bg-slate-50"
                          onError={() => setLogoPreview('')}
                        />
                      ) : (
                        <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center">
                          <span className="text-slate-400 text-2xl">🏢</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        name="logo"
                        value={formData.logo}
                        onChange={handleLogoChange}
                        placeholder="画像URLを入力"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none text-sm"
                      />
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button
                          type="button"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-sm text-slate-700 transition-colors"
                        >
                          ファイルを選択
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 法人名 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    法人名 <span className="text-red-500">*</span>
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

                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Slug (URL識別子) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    required
                    pattern="[a-z0-9-]+"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none font-mono text-sm"
                    readOnly={!org} // 新規作成時は読み取り専用（自動生成）
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {!org 
                      ? 'ランダムで自動生成されます（小文字の英数字とハイフンのみ）'
                      : '小文字の英数字とハイフンのみ使用可能（例: tech-frontier）'
                    }
                  </p>
                </div>

                {/* ランダム識別ID（新規作成時のみ表示） */}
                {!org && generatedId && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      法人識別ID（自動生成）
                    </label>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg">
                      <code className="text-sm font-mono text-slate-700 break-all">
                        {generatedId}
                      </code>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      このIDは自動で生成され、法人管理の識別子として使用されます（Supabase連携時に使用）
                    </p>
                  </div>
                )}

                {/* 既存法人のID（編集時のみ表示） */}
                {org && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      法人識別ID（スラッグ）
                    </label>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg">
                      <code className="text-sm font-mono text-slate-700 break-all">
                        {org.slug}
                      </code>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      法人管理の識別子として使用されています（URLにも使用されます）
                    </p>
                  </div>
                )}

                {/* 詳細説明 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    詳細説明
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none resize-none"
                    placeholder="法人の概要や特徴を入力してください"
                  />
                </div>

                {/* ウェブサイト */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ウェブサイト
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* 住所 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    住所
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="〒123-4567 東京都..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* 電話番号とメールアドレス */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      電話番号
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="03-1234-5678"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                    />
                  </div>
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
                      placeholder="contact@example.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      パスワード再設定メールの送信先として使用されます
                    </p>
                  </div>
                </div>

                {/* AI戦略アドバイスに必要な最小回答者数 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    AI戦略アドバイスに必要な最小回答者数
                  </label>
                  <input
                    type="number"
                    name="minRequiredRespondents"
                    value={formData.minRequiredRespondents}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData(prev => ({ ...prev, minRequiredRespondents: v === '' ? '' : Number(v) }));
                    }}
                    min={1}
                    placeholder="5"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    この人数以上の回答が集まるまでAI戦略アドバイスは表示されません。空欄の場合は5名がデフォルトです
                  </p>
                </div>

                {/* アカウントIDとパスワード */}
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-4">ログイン情報</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        アカウントID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="accountId"
                        value={formData.accountId}
                        onChange={handleInputChange}
                        required
                        readOnly={false}
                        disabled={false}
                        autoComplete="off"
                        placeholder="法人のログインID"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        この法人のログインに使用するアカウントID
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        パスワード {!org && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required={!org}
                        autoComplete="new-password"
                        placeholder={org ? "変更する場合のみ入力" : "パスワードを入力"}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        {org ? "変更しない場合は空欄のままにしてください" : "8文字以上推奨"}
                      </p>
                    </div>
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
                {org ? '更新' : '作成'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrgModal;

