import React, { useState } from 'react';
import { createUser } from '../services/userService';
import { getOrganizationBySlug } from '../services/organizationService';
import { Role } from '../types';

/**
 * テスト用: Supabaseにユーザーを追加するコンポーネント
 * 開発用の一時的なコンポーネントです
 */
const AddTestUsers: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  // 追加するユーザーデータ
  const usersToAdd = [
    // org-1 (tech-frontier) のユーザー
    {
      slug: 'tech-frontier',
      users: [
        {
          name: '田中 健一',
          email: 'tanaka@tech-frontier.example.com',
          role: Role.ORG_ADMIN,
          department: '開発部',
          position: '部長'
        },
        {
          name: '鈴木 美咲',
          email: 'suzuki@tech-frontier.example.com',
          role: Role.USER,
          department: '開発部',
          position: '課長'
        },
        {
          name: '高橋 翔太',
          email: 'takahashi@tech-frontier.example.com',
          role: Role.USER,
          department: '企画部',
          position: '主任'
        }
      ]
    },
    // org-2 (global-sol) のユーザー
    {
      slug: 'global-sol',
      users: [
        {
          name: '伊藤 麻衣',
          email: 'ito@global-sol.example.com',
          role: Role.ORG_ADMIN,
          department: '営業部',
          position: '部長'
        },
        {
          name: '渡辺 大輔',
          email: 'watanabe@global-sol.example.com',
          role: Role.USER,
          department: '営業部',
          position: '課長'
        },
        {
          name: '中村 優香',
          email: 'nakamura@global-sol.example.com',
          role: Role.USER,
          department: 'マーケティング部',
          position: '主任'
        }
      ]
    },
    // org-3 (ai-collab) のユーザー
    {
      slug: 'ai-collab',
      users: [
        {
          name: '小林 慎一郎',
          email: 'kobayashi@ai-collab.example.com',
          role: Role.ORG_ADMIN,
          department: '研究開発部',
          position: '部長'
        },
        {
          name: '加藤 彩',
          email: 'kato@ai-collab.example.com',
          role: Role.USER,
          department: '研究開発部',
          position: '課長'
        },
        {
          name: '吉田 拓也',
          email: 'yoshida@ai-collab.example.com',
          role: Role.USER,
          department: 'データ分析部',
          position: '主任'
        }
      ]
    }
  ];

  const handleAddUsers = async () => {
    setLoading(true);
    setResults([]);
    const newResults: string[] = [];

    try {
      newResults.push('ユーザー追加処理を開始します...');

      for (const orgData of usersToAdd) {
        try {
          // 法人をslugで取得
          const org = await getOrganizationBySlug(orgData.slug);
          
          if (!org) {
            const errorMsg = `法人が見つかりません: ${orgData.slug}`;
            newResults.push(`✗ ${errorMsg}`);
            setResults([...newResults]);
            continue;
          }

          newResults.push(`\n法人 "${org.name}" (slug: ${org.slug}) にユーザーを追加中...`);
          setResults([...newResults]);

          // 各ユーザーを追加
          for (const userData of orgData.users) {
            try {
              const newUser = await createUser({
                name: userData.name,
                email: userData.email,
                role: userData.role,
                orgId: org.id,
                department: userData.department,
                position: userData.position,
                pendingPassword: false,
              });

              if (newUser) {
                const successMsg = `✓ ユーザー追加成功: ${userData.name} (${userData.email})`;
                newResults.push(successMsg);
                setResults([...newResults]);
              } else {
                const errorMsg = `✗ ユーザー追加失敗: ${userData.name}`;
                newResults.push(errorMsg);
                setResults([...newResults]);
              }
            } catch (error: any) {
              const errorMsg = `✗ ユーザー追加エラー (${userData.name}): ${error.message || error}`;
              newResults.push(errorMsg);
              setResults([...newResults]);
            }

            // レート制限を避けるため、少し待機
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error: any) {
          const errorMsg = `法人 "${orgData.slug}" の処理でエラーが発生しました: ${error.message || error}`;
          newResults.push(errorMsg);
          setResults([...newResults]);
        }
      }

      newResults.push('\nユーザー追加処理が完了しました。');
      setResults([...newResults]);
    } catch (error: any) {
      newResults.push(`エラー: ${error.message || error}`);
      setResults([...newResults]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-4">
        テストユーザー追加（開発用）
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        3つの法人（tech-frontier, global-sol, ai-collab）に対してそれぞれ3名ずつユーザーをSupabaseに追加します。
      </p>
      
      <button
        onClick={handleAddUsers}
        disabled={loading}
        className={`px-6 py-3 rounded-lg font-medium transition-colors ${
          loading
            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
            : 'bg-sky-500 text-white hover:bg-sky-600'
        }`}
      >
        {loading ? '追加中...' : 'ユーザーを追加'}
      </button>

      {results.length > 0 && (
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-2">実行結果:</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`text-sm font-mono ${
                  result.startsWith('✓')
                    ? 'text-green-600'
                    : result.startsWith('✗')
                    ? 'text-red-600'
                    : 'text-slate-700'
                }`}
              >
                {result}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddTestUsers;
