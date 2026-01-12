/**
 * Supabaseにユーザーを追加するスクリプト
 * 
 * このスクリプトは、3つの法人（org-1, org-2, org-3）に対して
 * それぞれ3名ずつユーザーを追加します。
 * 
 * 実行方法:
 * 1. ブラウザのコンソールで実行するか
 * 2. 一時的なページコンポーネントとして実行
 */

import { createUser } from '../services/userService';
import { getOrganizationBySlug } from '../services/organizationService';
import { Role } from '../types';

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

/**
 * ユーザーをSupabaseに追加する関数
 */
export async function addUsersToSupabase(): Promise<void> {
  console.log('ユーザー追加処理を開始します...');

  for (const orgData of usersToAdd) {
    try {
      // 法人をslugで取得
      const org = await getOrganizationBySlug(orgData.slug);
      
      if (!org) {
        console.error(`法人が見つかりません: ${orgData.slug}`);
        continue;
      }

      console.log(`\n法人 "${org.name}" (ID: ${org.id}) にユーザーを追加中...`);

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
            console.log(`✓ ユーザー追加成功: ${userData.name} (${userData.email})`);
          } else {
            console.error(`✗ ユーザー追加失敗: ${userData.name}`);
          }
        } catch (error) {
          console.error(`✗ ユーザー追加エラー (${userData.name}):`, error);
        }

        // レート制限を避けるため、少し待機
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`法人 "${orgData.slug}" の処理でエラーが発生しました:`, error);
    }
  }

  console.log('\nユーザー追加処理が完了しました。');
}

// ブラウザのコンソールから実行可能にする
if (typeof window !== 'undefined') {
  (window as any).addUsersToSupabase = addUsersToSupabase;
}
