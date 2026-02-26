
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  USER = 'USER'
}

export interface LiteracyScores {
  basics: number;
  prompting: number;
  ethics: number;
  tools: number;
  automation: number;
}

export interface Organization {
  id: string;
  slug: string; // URL identifier
  name: string;
  createdAt: string;
  memberCount: number;
  avgScore: number;
  logo?: string; // ロゴ画像のURL
  description?: string; // 法人の詳細説明
  website?: string; // ウェブサイトURL
  address?: string; // 住所
  phone?: string; // 電話番号
  email?: string; // 連絡先メールアドレス
  accountId: string; // 法人アカウントID
  password?: string; // パスワード（ハッシュ化されたもの）
  rankDefinition?: RankDefinition; // 法人毎のランク定義
  minRequiredRespondents?: number; // AI戦略アドバイス表示に必要な最小回答者数（未設定時は5）
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgId: string;
  scores: LiteracyScores;
  password?: string; // パスワード（ハッシュ化されたもの）
  pendingPassword?: boolean; // パスワード設定待ちかどうか
  invitationToken?: string; // 招待トークン
  invitationExpiresAt?: string; // 招待トークンの有効期限
  department?: string; // 部署
  position?: string; // 役職
}

export interface AuthState {
  org: Organization | null;
  viewingOrg: Organization | null;
  isAuthenticated: boolean;
  isSuperAdmin?: boolean; // システム管理者かどうか
}

// アンケート関連の型定義
export type QuestionType = 'radio' | 'checkbox' | 'text' | 'textarea' | 'rank';

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface Question {
  id: string;
  title: string;
  type: QuestionType;
  required: boolean;
  options?: QuestionOption[];
  placeholder?: string;
  maxLength?: number;
  description?: string; // ランク評価などの説明用
  rankDescriptions?: { [key: string]: string[] }; // ランクごとの説明
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  createdBy: string; // ユーザーID
  orgId: string; // 法人ID（回答リンクから回答する際に必要）
}

// アンケート回答関連の型定義
export interface Answer {
  questionId: string;
  value: string | string[]; // 単一選択はstring、複数選択はstring[]
  type: QuestionType;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentName: string; // 回答者名
  orgId: string; // 法人ID
  answers: Answer[]; // 回答データ
  submittedAt: string; // 回答日時
}

// ランク定義関連の型定義
export interface RankItem {
  id: string; // rank1, rank2, rank3, rank4, rank5
  name: string; // ランク名（例: "ビギナー", "ベーシック"）
  descriptions: string[]; // ランクの説明文リスト
}

export interface RankDefinition {
  orgId: string;
  ranks: RankItem[]; // 5段階固定
}
