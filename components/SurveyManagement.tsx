import React, { useState, useEffect } from 'react';
import { Survey, Question, QuestionOption, Role, QuestionType, SurveyResponse } from '../types';
import SurveyEditor from './SurveyEditor';
import SurveyResponseForm from './SurveyResponseForm';
import { saveSurveys, getSurveysByOrg, getSurveysByOrgFromSupabase } from '../services/surveyService';
import { getResponsesBySurveyFromSupabase } from '../services/surveyResponseService';

interface SurveyManagementProps {
  userRole: Role;
  orgId: string;
}

// デフォルトのアンケート構造（1枚目の画像から）
const DEFAULT_SURVEY_QUESTIONS: Question[] = [
  {
    id: 'q-name-default',
    title: '名前',
    type: 'text',
    required: true,
    placeholder: 'お名前を入力してください',
  },
  {
    id: 'q-department',
    title: '所属部署',
    type: 'radio',
    required: false,
    options: [
      { id: 'opt-dept-1', label: '営業部', value: 'sales' },
      { id: 'opt-dept-2', label: '開発部', value: 'development' },
      { id: 'opt-dept-3', label: 'マーケティング部', value: 'marketing' },
      { id: 'opt-dept-4', label: '人事部', value: 'hr' },
      { id: 'opt-dept-5', label: '経理部', value: 'accounting' },
      { id: 'opt-dept-6', label: 'その他', value: 'other' },
    ],
  },
  {
    id: 'q-position',
    title: '役職',
    type: 'radio',
    required: false,
    options: [
      { id: 'opt-pos-1', label: '部長', value: 'director' },
      { id: 'opt-pos-2', label: '課長', value: 'manager' },
      { id: 'opt-pos-3', label: '主任', value: 'senior' },
      { id: 'opt-pos-4', label: '一般社員', value: 'staff' },
      { id: 'opt-pos-5', label: 'その他', value: 'other' },
    ],
  },
  {
    id: 'q1',
    title: 'AI活用の有無',
    type: 'radio',
    required: true,
    options: [
      { id: 'opt1-1', label: '① ほぼ毎日使っている', value: 'daily' },
      { id: 'opt1-2', label: '② 週に数回使っている', value: 'weekly' },
      { id: 'opt1-3', label: '③ 月に数回使っている', value: 'monthly' },
      { id: 'opt1-4', label: '④ 使ったことはあるが、今は使っていない', value: 'used_before' },
      { id: 'opt1-5', label: '⑤ 使ったことがない', value: 'never' },
    ],
  },
  {
    id: 'q2',
    title: '主に利用しているAIツール（複数選択可）',
    type: 'checkbox',
    required: false,
    options: [
      { id: 'opt2-1', label: 'ChatGPT', value: 'chatgpt' },
      { id: 'opt2-2', label: 'Claude', value: 'claude' },
      { id: 'opt2-3', label: 'Gemini', value: 'gemini' },
      { id: 'opt2-4', label: '社内・専用AIツール', value: 'internal' },
      { id: 'opt2-5', label: '画像生成AI（例: Midjourney等）', value: 'image_gen' },
      { id: 'opt2-6', label: '動画/音声AI（例: Runway, Voicemod等）', value: 'video_audio' },
      { id: 'opt2-7', label: 'その他', value: 'other' },
    ],
  },
  {
    id: 'q3',
    title: '有料AIツールの利用状況',
    type: 'radio',
    required: false,
    options: [
      { id: 'opt3-1', label: '① 個人で契約している', value: 'personal' },
      { id: 'opt3-2', label: '② 会社の補助で利用している', value: 'company_subsidy' },
      { id: 'opt3-3', label: '③ 無料版のみ使っている', value: 'free_only' },
    ],
  },
  {
    id: 'q4',
    title: '主な利用用途（複数選択可）',
    type: 'checkbox',
    required: false,
    options: [
      { id: 'opt4-1', label: '文章、資料作成', value: 'document' },
      { id: 'opt4-2', label: 'アイデア出し・壁打ち', value: 'brainstorming' },
      { id: 'opt4-3', label: 'リサーチ・分析', value: 'research' },
      { id: 'opt4-4', label: 'コーディング・スクリプト作成', value: 'coding' },
      { id: 'opt4-5', label: '画像、動画、音声生成', value: 'media_gen' },
      { id: 'opt4-6', label: '広告文・キャッチコピー作成', value: 'ad_copy' },
      { id: 'opt4-7', label: 'その他', value: 'other' },
    ],
  },
  {
    id: 'q5',
    title: 'AIツールの具体的な使用用途（自由記述）',
    type: 'textarea',
    required: false,
    placeholder: 'どのような業務で、どのAIツールをどのように活用しているか、具体的に記入してください。',
  },
  {
    id: 'q6',
    title: '1週間あたりの業務時間削減効果（自己評価）',
    type: 'radio',
    required: false,
    options: [
      { id: 'opt6-1', label: '① 5時間未満', value: 'less_than_5' },
      { id: 'opt6-2', label: '② 5~10時間', value: '5_to_10' },
      { id: 'opt6-3', label: '③ 10~20時間', value: '10_to_20' },
      { id: 'opt6-4', label: '④ 20時間以上', value: 'more_than_20' },
      { id: 'opt6-5', label: '⑤ 効果は感じていない', value: 'no_effect' },
    ],
  },
  {
    id: 'q7',
    title: '今後もっとAIを活用するために必要なこと（複数選択可）',
    type: 'checkbox',
    required: false,
    options: [
      { id: 'opt7-1', label: '具体的な活用事例・テンプレート', value: 'use_cases' },
      { id: 'opt7-2', label: '勉強会・研修', value: 'training' },
      { id: 'opt7-3', label: '有料ツール補助', value: 'tool_subsidy' },
      { id: 'opt7-4', label: '専門部署のサポート', value: 'specialized_support' },
      { id: 'opt7-5', label: 'セキュリティ・ルール整備', value: 'security_rules' },
      { id: 'opt7-6', label: 'その他', value: 'other' },
    ],
  },
  {
    id: 'q8',
    title: 'AI活用レベル自己評価',
    type: 'rank',
    required: false,
    rankDescriptions: {
      'rank1': [
        '生成AIをほぼ使ったことがない状態',
        'AIの基本用語に自信がない',
        '業務でAIを使ったことがほとんどない',
        'トレーニングや研修は未受講',
        '「何に使えるのか」がまだイメージできない',
      ],
      'rank2': [
        'AIを知っていて触れたことがある',
        'ChatGPTなどを試した経験はある',
        '用語（プロンプトなど）は何となく理解',
        '文章生成・画像生成などの一般的な使い方を知っている',
        '業務活用はまだ習慣化していない',
      ],
      'rank3': [
        '業務でAIを使い始めている',
        'メール下書き、要約などでAIを週1回以上使う',
        'シンプルなプロンプトを工夫できる',
        '小規模タスクでAI活用の成果を実感',
        '小規模プロジェクトや改善に参加したことがある',
      ],
      'rank4': [
        '日常業務の中で成果が出ている',
        'カスタムプロンプトやワークフロー化を実践',
        '複数ツールやAPI連携を使った経験あり',
        '明確な成果（工数削減・品質向上）がある',
        '部署内でAI活用の相談役になっている',
      ],
      'rank5': [
        '高度なAI活用で価値創出している',
        'RAGやファインチューニングなども理解し実践',
        '複雑な自動化・システム連携が可能',
        '新規サービス・業務プロセスを構築できる',
        '社内外で教育・研修ができるレベル',
      ],
    },
    options: [
      { id: 'opt8-1', label: 'ランク1（ビギナー）', value: 'rank1' },
      { id: 'opt8-2', label: 'ランク2（ベーシック）', value: 'rank2' },
      { id: 'opt8-3', label: 'ランク3（プラクティス）', value: 'rank3' },
      { id: 'opt8-4', label: 'ランク4（アドバンス）', value: 'rank4' },
      { id: 'opt8-5', label: 'ランク5（エキスパート）', value: 'rank5' },
    ],
  },
  {
    id: 'q9',
    title: 'フィードバック・要望',
    type: 'textarea',
    required: false,
    placeholder: '例:社内勉強会を増やしてほしい、活用事例を共有してほしい、など',
    maxLength: 500,
  },
];

const SurveyManagement: React.FC<SurveyManagementProps> = ({ userRole, orgId }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);

  // Supabaseからアンケートデータを読み込む
  useEffect(() => {
    const loadSurveys = async () => {
      setLoadingSurveys(true);
      try {
        // まずSupabaseから取得を試みる
        const supabaseSurveys = await getSurveysByOrgFromSupabase(orgId);
        if (supabaseSurveys.length > 0) {
          setSurveys(supabaseSurveys);
        } else {
          // Supabaseにデータがない場合はlocalStorageから取得
          const localStorageSurveys = getSurveysByOrg(orgId);
          if (localStorageSurveys.length > 0) {
            setSurveys(localStorageSurveys);
          } else {
            // デフォルトデータ
            const defaultSurvey: Survey = {
              id: 'survey-1',
              title: 'AI活用状況アンケート',
              description: 'AIツールの利用状況や活用レベルを調査するアンケートです。',
              questions: DEFAULT_SURVEY_QUESTIONS,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isActive: true,
              createdBy: orgId,
              orgId: orgId,
            };
            setSurveys([defaultSurvey]);
            saveSurveys(orgId, [defaultSurvey]);
          }
        }
      } catch (error) {
        console.error('アンケートデータの読み込みに失敗しました:', error);
        // エラー時はlocalStorageから取得
        const localStorageSurveys = getSurveysByOrg(orgId);
        setSurveys(localStorageSurveys.length > 0 ? localStorageSurveys : []);
      } finally {
        setLoadingSurveys(false);
      }
    };
    loadSurveys();
  }, [orgId]);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});

  // 各アンケートの回答数を取得
  useEffect(() => {
    const fetchResponseCounts = async () => {
      const counts: Record<string, number> = {};
      for (const survey of surveys) {
        try {
          const surveyResponses = await getResponsesBySurveyFromSupabase(survey.id, orgId);
          counts[survey.id] = surveyResponses.length;
        } catch (error) {
          console.error(`アンケート ${survey.id} の回答数取得に失敗しました:`, error);
          counts[survey.id] = 0;
        }
      }
      setResponseCounts(counts);
    };
    fetchResponseCounts();
  }, [surveys, orgId]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [editingSurveyInEditor, setEditingSurveyInEditor] = useState<Survey | null>(null);
  const [respondingSurvey, setRespondingSurvey] = useState<Survey | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number>(-1);
  const [viewingResponses, setViewingResponses] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [formData, setFormData] = useState<Partial<Survey>>({
    title: '',
    description: '',
    isActive: true,
  });
  const [questionFormData, setQuestionFormData] = useState<Partial<Question>>({
    title: '',
    type: 'radio',
    required: false,
    options: [],
    placeholder: '',
    maxLength: undefined,
    rankDescriptions: {},
  });

  // 管理者のみアクセス可能
  const isAdmin = userRole === Role.SUPER_ADMIN || userRole === Role.ORG_ADMIN;

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl p-12 text-center relative overflow-hidden min-h-[400px] flex items-center justify-center border border-slate-200">
        <div className="relative z-10">
          <p className="text-slate-800 text-xl mb-4">管理者のみアクセス可能です</p>
          <p className="text-slate-500 text-sm">この機能を利用するには管理者権限が必要です。</p>
        </div>
        <div className="absolute bottom-10 right-10 text-slate-300 text-6xl animate-bounce">
          🐱
        </div>
      </div>
    );
  }

  const handleOpenAddModal = () => {
    setEditingSurvey(null);
    setFormData({
      title: '',
      description: '',
      isActive: true,
    });
    // 新規作成時はアンケート内容作成画面（SurveyEditor）を直接表示
    const newDraftSurvey: Survey = {
      id: `survey-${Date.now()}`,
      title: '',
      description: '',
      questions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      createdBy: orgId,
      orgId: orgId,
    };
    setEditingSurveyInEditor(newDraftSurvey);
  };

  const handleOpenEditModal = (survey: Survey) => {
    setEditingSurvey(survey);
    setFormData({
      title: survey.title,
      description: survey.description || '',
      isActive: survey.isActive,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditor = (survey: Survey) => {
    setEditingSurveyInEditor(survey);
  };

  const handleSaveFromEditor = (updatedSurvey: Survey) => {
    const exists = surveys.some(s => s.id === updatedSurvey.id);
    const updatedSurveys = exists
      ? surveys.map(s => (s.id === updatedSurvey.id ? updatedSurvey : s))
      : [...surveys, updatedSurvey];
    saveSurveys(orgId, updatedSurveys);
    setSurveys(updatedSurveys);
    setEditingSurveyInEditor(null);
  };

  const handleCancelEditor = () => {
    setEditingSurveyInEditor(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSurvey(null);
    setFormData({
      title: '',
      description: '',
      isActive: true,
    });
  };

  const handleOpenQuestionModal = (survey: Survey, questionIndex?: number) => {
    if (questionIndex !== undefined) {
      // 編集モード
      const question = survey.questions[questionIndex];
      setEditingQuestion(question);
      setEditingQuestionIndex(questionIndex);
      setQuestionFormData({
        title: question.title,
        type: question.type,
        required: question.required,
        options: question.options ? [...question.options] : [],
        placeholder: question.placeholder || '',
        maxLength: question.maxLength,
        rankDescriptions: question.rankDescriptions ? { ...question.rankDescriptions } : {},
      });
    } else {
      // 新規作成モード
      setEditingQuestion(null);
      setEditingQuestionIndex(-1);
      setQuestionFormData({
        title: '',
        type: 'radio',
        required: false,
        options: [],
        placeholder: '',
        maxLength: undefined,
        rankDescriptions: {},
      });
    }
    setIsQuestionModalOpen(true);
  };

  const handleCloseQuestionModal = () => {
    setIsQuestionModalOpen(false);
    setEditingQuestion(null);
    setEditingQuestionIndex(-1);
    setQuestionFormData({
      title: '',
      type: 'radio',
      required: false,
      options: [],
      placeholder: '',
      maxLength: undefined,
      rankDescriptions: {},
    });
  };

  const handleSaveSurvey = () => {
    if (!formData.title?.trim()) {
      alert('アンケートタイトルを入力してください。');
      return;
    }

    let updatedSurveys: Survey[];
    if (editingSurvey) {
      // 編集
      updatedSurveys = surveys.map(s =>
        s.id === editingSurvey.id
          ? {
              ...s,
              title: formData.title!,
              description: formData.description,
              isActive: formData.isActive ?? true,
              updatedAt: new Date().toISOString(),
            }
          : s
      );
    } else {
      // 新規作成
      const newSurvey: Survey = {
        id: `survey-${Date.now()}`,
        title: formData.title!,
        description: formData.description,
        questions: DEFAULT_SURVEY_QUESTIONS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: formData.isActive ?? true,
        createdBy: orgId,
        orgId: orgId,
      };
      updatedSurveys = [...surveys, newSurvey];
    }
    saveSurveys(orgId, updatedSurveys);
    setSurveys(updatedSurveys);
    handleCloseModal();
  };

  const handleSaveQuestion = () => {
    if (!questionFormData.title?.trim()) {
      alert('質問タイトルを入力してください。');
      return;
    }

    if (!editingSurvey) return;

    const newQuestion: Question = {
      id: editingQuestion?.id || `q-${Date.now()}`,
      title: questionFormData.title!,
      type: questionFormData.type || 'radio',
      required: questionFormData.required ?? false,
      options: questionFormData.options || [],
      placeholder: questionFormData.placeholder,
      maxLength: questionFormData.maxLength,
      rankDescriptions: questionFormData.rankDescriptions,
    };

    const updatedQuestions = [...editingSurvey.questions];
    if (editingQuestionIndex >= 0) {
      // 編集
      updatedQuestions[editingQuestionIndex] = newQuestion;
    } else {
      // 新規追加
      updatedQuestions.push(newQuestion);
    }

    const updatedSurveys = surveys.map(s =>
      s.id === editingSurvey.id
        ? {
            ...s,
            questions: updatedQuestions,
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    saveSurveys(orgId, updatedSurveys);
    setSurveys(updatedSurveys);

    // 編集中のアンケートも更新
    setEditingSurvey({
      ...editingSurvey,
      questions: updatedQuestions,
      updatedAt: new Date().toISOString(),
    });

    handleCloseQuestionModal();
  };

  const handleDeleteQuestion = (surveyId: string, questionIndex: number) => {
    if (confirm('この質問を削除してもよろしいですか？')) {
      const updatedSurveys = surveys.map(s => {
        if (s.id === surveyId) {
          const updatedQuestions = s.questions.filter((_, idx) => idx !== questionIndex);
          return {
            ...s,
            questions: updatedQuestions,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });
      saveSurveys(orgId, updatedSurveys);
      setSurveys(updatedSurveys);

      // 編集中のアンケートも更新
      if (editingSurvey && editingSurvey.id === surveyId) {
        const updatedQuestions = editingSurvey.questions.filter((_, idx) => idx !== questionIndex);
        setEditingSurvey({
          ...editingSurvey,
          questions: updatedQuestions,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  };

  const handleMoveQuestion = (surveyId: string, questionIndex: number, direction: 'up' | 'down') => {
    const updatedSurveys = surveys.map(s => {
      if (s.id === surveyId) {
        const questions = [...s.questions];
        const newIndex = direction === 'up' ? questionIndex - 1 : questionIndex + 1;
        if (newIndex >= 0 && newIndex < questions.length) {
          [questions[questionIndex], questions[newIndex]] = [questions[newIndex], questions[questionIndex]];
          return {
            ...s,
            questions,
            updatedAt: new Date().toISOString(),
          };
        }
      }
      return s;
    });
    saveSurveys(orgId, updatedSurveys);
    setSurveys(updatedSurveys);

    // 編集中のアンケートも更新
    if (editingSurvey && editingSurvey.id === surveyId) {
      const questions = [...editingSurvey.questions];
      const newIndex = direction === 'up' ? questionIndex - 1 : questionIndex + 1;
      if (newIndex >= 0 && newIndex < questions.length) {
        [questions[questionIndex], questions[newIndex]] = [questions[newIndex], questions[questionIndex]];
        setEditingSurvey({
          ...editingSurvey,
          questions,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  };

  const handleAddOption = () => {
    const newOption: QuestionOption = {
      id: `opt-${Date.now()}`,
      label: '',
      value: '',
    };
    setQuestionFormData({
      ...questionFormData,
      options: [...(questionFormData.options || []), newOption],
    });
  };

  const handleUpdateOption = (index: number, field: 'label' | 'value', value: string) => {
    const options = [...(questionFormData.options || [])];
    options[index] = { ...options[index], [field]: value };
    setQuestionFormData({ ...questionFormData, options });
  };

  const handleDeleteOption = (index: number) => {
    const options = questionFormData.options?.filter((_, idx) => idx !== index) || [];
    setQuestionFormData({ ...questionFormData, options });
  };

  const handleUpdateRankDescription = (rank: string, index: number, value: string) => {
    const rankDescriptions = { ...(questionFormData.rankDescriptions || {}) };
    if (!rankDescriptions[rank]) {
      rankDescriptions[rank] = [];
    }
    rankDescriptions[rank][index] = value;
    setQuestionFormData({ ...questionFormData, rankDescriptions });
  };

  const handleAddRankDescription = (rank: string) => {
    const rankDescriptions = { ...(questionFormData.rankDescriptions || {}) };
    if (!rankDescriptions[rank]) {
      rankDescriptions[rank] = [];
    }
    rankDescriptions[rank].push('');
    setQuestionFormData({ ...questionFormData, rankDescriptions });
  };

  const handleDeleteRankDescription = (rank: string, index: number) => {
    const rankDescriptions = { ...(questionFormData.rankDescriptions || {}) };
    if (rankDescriptions[rank]) {
      rankDescriptions[rank] = rankDescriptions[rank].filter((_, idx) => idx !== index);
    }
    setQuestionFormData({ ...questionFormData, rankDescriptions });
  };

  const handleDeleteSurvey = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('このアンケートを削除してもよろしいですか？')) {
      const updatedSurveys = surveys.filter(s => s.id !== id);
      saveSurveys(orgId, updatedSurveys);
      setSurveys(updatedSurveys);
    }
  };

  const handleToggleActive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedSurveys = surveys.map(s =>
      s.id === id ? { ...s, isActive: !s.isActive, updatedAt: new Date().toISOString() } : s
    );
    saveSurveys(orgId, updatedSurveys);
    setSurveys(updatedSurveys);
  };

  // 回答リンクを生成（ルートパス固定：未ログインでもアクセス可能にするため）
  const getResponseLink = (surveyId: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/?survey=${surveyId}`;
  };

  // リンクをクリップボードにコピー
  const handleCopyLink = async (surveyId: string) => {
    const link = getResponseLink(surveyId);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLinkId(surveyId);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      // フォールバック: テキストエリアを使用
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedLinkId(surveyId);
      setTimeout(() => setCopiedLinkId(null), 2000);
    }
  };

  const needsOptions = (type: QuestionType) => {
    return type === 'radio' || type === 'checkbox' || type === 'rank';
  };

  const handleStartResponse = (survey: Survey) => {
    setRespondingSurvey(survey);
  };

  const handleResponseSubmit = (response: SurveyResponse) => {
    alert('回答が送信されました。ありがとうございます。');
    setRespondingSurvey(null);
  };

  const handleCancelResponse = () => {
    setRespondingSurvey(null);
  };

  const handleViewResponses = async (survey: Survey) => {
    console.log('回答結果を表示:', { surveyId: survey.id, surveyTitle: survey.title, orgId });
    setViewingResponses(survey);
    setLoadingResponses(true);
    try {
      const surveyResponses = await getResponsesBySurveyFromSupabase(survey.id, orgId);
      console.log('取得した回答数:', surveyResponses.length);
      setResponses(surveyResponses);
    } catch (error) {
      console.error('回答データの取得に失敗しました:', error);
      setResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleCloseResponsesModal = () => {
    setViewingResponses(null);
    setResponses([]);
  };

  // CSV形式に変換してダウンロード
  const handleExportToCSV = () => {
    if (!viewingResponses || responses.length === 0) {
      alert('エクスポートする回答データがありません。');
      return;
    }

    // CSVヘッダーを作成
    const headers = ['回答者名', '回答日時'];
    viewingResponses.questions.forEach((question) => {
      headers.push(question.title);
    });

    // CSVデータ行を作成
    const rows = responses.map((response) => {
      const row: string[] = [
        response.respondentName,
        new Date(response.submittedAt).toLocaleString('ja-JP'),
      ];

      viewingResponses.questions.forEach((question) => {
        const answer = response.answers.find((a) => a.questionId === question.id);
        let answerText = '';

        if (answer) {
          if (answer.type === 'checkbox' && Array.isArray(answer.value)) {
            // チェックボックスの場合、選択肢のラベルを結合
            const labels = answer.value.map((val) => {
              const option = question.options?.find((opt) => opt.value === val);
              return option ? option.label : val;
            });
            answerText = labels.join('、');
          } else if (answer.type === 'radio' || answer.type === 'rank') {
            // ラジオボタンやランクの場合、選択肢のラベルを取得
            const option = question.options?.find((opt) => opt.value === answer.value);
            answerText = option ? option.label : (answer.value as string) || '';
          } else {
            // テキストやテキストエリアの場合
            answerText = (answer.value as string) || '';
          }
        }

        // CSV形式に適した形式に変換（改行を削除、ダブルクォートで囲む）
        answerText = answerText.replace(/"/g, '""'); // ダブルクォートをエスケープ
        if (answerText.includes(',') || answerText.includes('\n') || answerText.includes('"')) {
          answerText = `"${answerText}"`;
        }
        row.push(answerText);
      });

      return row;
    });

    // CSV文字列を生成
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // BOMを追加してExcelで正しく表示されるようにする
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // ファイル名を生成（アンケートタイトル + 日時）
    const fileName = `${viewingResponses.title}_${new Date().toISOString().split('T')[0]}.csv`;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 回答画面を表示中の場合
  if (respondingSurvey) {
    return (
      <SurveyResponseForm
        survey={respondingSurvey}
        orgId={orgId}
        onSubmit={handleResponseSubmit}
        onCancel={handleCancelResponse}
      />
    );
  }

  // 編集画面を表示中の場合
  if (editingSurveyInEditor) {
    return (
      <SurveyEditor
        survey={editingSurveyInEditor}
        onSave={handleSaveFromEditor}
        onCancel={handleCancelEditor}
      />
    );
  }

  if (loadingSurveys) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">アンケート管理</h2>
            <p className="text-sm sm:text-base text-slate-600">アンケートの作成・編集</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">アンケート管理</h2>
          <p className="text-sm sm:text-base text-slate-600">アンケートの作成・編集</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-sky-400 text-white rounded-lg hover:bg-sky-500 transition-colors flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
        >
          <span>+</span>
          新規アンケート作成
        </button>
      </div>

      {/* アンケート一覧 */}
      <div className="grid gap-4">
        {surveys.map((survey) => (
          <div
            key={survey.id}
            className="bg-white rounded-lg p-6 border border-slate-200 hover:border-slate-300 transition-colors shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-800 break-words">{survey.title}</h3>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                      survey.isActive
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {survey.isActive ? '公開中' : '非公開'}
                  </span>
                </div>
                {survey.description && (
                  <p className="text-slate-600 text-sm mb-3 break-words">{survey.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-500">
                  <span>質問数: {survey.questions.length}</span>
                  <span>回答数: {responseCounts[survey.id] ?? 0}</span>
                  <span>作成日: {new Date(survey.createdAt).toLocaleDateString('ja-JP')}</span>
                  <span>更新日: {new Date(survey.updatedAt).toLocaleDateString('ja-JP')}</span>
                </div>
                {/* 回答リンクセクション */}
                {survey.isActive && (
                  <div className="mt-4 p-3 bg-sky-50 border border-sky-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-sky-900 mb-1">回答リンク</p>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            value={getResponseLink(survey.id)}
                            readOnly
                            className="flex-1 px-2 py-1 text-xs bg-white border border-sky-300 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 min-w-0"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <button
                            onClick={() => handleCopyLink(survey.id)}
                            className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                              copiedLinkId === survey.id
                                ? 'bg-green-500 text-white'
                                : 'bg-sky-400 text-white hover:bg-sky-500'
                            }`}
                          >
                            {copiedLinkId === survey.id ? '✓ コピー済み' : '📋 コピー'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:ml-4">
                <button
                  onClick={(e) => handleToggleActive(survey.id, e)}
                  className={`px-3 py-1.5 rounded text-xs sm:text-sm transition-colors whitespace-nowrap ${
                    survey.isActive
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-sky-400 text-white hover:bg-sky-500'
                  }`}
                >
                  {survey.isActive ? '非公開' : '公開'}
                </button>
                {survey.isActive && (
                  <button
                    onClick={() => handleStartResponse(survey)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded text-xs sm:text-sm hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    回答する
                  </button>
                )}
                <button
                  onClick={() => handleViewResponses(survey)}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs sm:text-sm hover:bg-purple-700 transition-colors whitespace-nowrap"
                >
                  回答結果
                </button>
                <button
                  onClick={() => handleOpenEditor(survey)}
                  className="px-3 py-1.5 bg-sky-400 text-white rounded text-xs sm:text-sm hover:bg-sky-500 transition-colors whitespace-nowrap"
                >
                  編集
                </button>
                <button
                  onClick={(e) => handleDeleteSurvey(survey.id, e)}
                  className="px-3 py-1.5 bg-red-600 text-white rounded text-xs sm:text-sm hover:bg-red-700 transition-colors whitespace-nowrap"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* アンケート編集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              {editingSurvey ? 'アンケート編集' : '新規アンケート作成'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  アンケートタイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="例: AI活用状況アンケート"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  説明
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  rows={3}
                  placeholder="アンケートの説明を入力してください"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-sky-500 bg-white border-slate-300 rounded focus:ring-sky-500"
                  />
                  公開状態にする
                </label>
              </div>
              {editingSurvey && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-2">
                    このアンケートには {editingSurvey.questions.length} 個の質問が含まれています。
                  </p>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      handleOpenQuestionModal(editingSurvey);
                    }}
                    className="text-sm text-sky-500 hover:text-sky-700 underline"
                  >
                    質問を編集する
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveSurvey}
                className="px-4 py-2 bg-sky-400 text-white rounded-lg hover:bg-sky-500 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 質問編集モーダル */}
      {isQuestionModalOpen && editingSurvey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              {editingQuestion ? '質問編集' : '新規質問追加'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  質問タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={questionFormData.title || ''}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="質問内容を入力してください"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  質問タイプ <span className="text-red-500">*</span>
                </label>
                <select
                  value={questionFormData.type || 'radio'}
                  onChange={(e) => {
                    const newType = e.target.value as QuestionType;
                    setQuestionFormData({
                      ...questionFormData,
                      type: newType,
                      options: needsOptions(newType) ? (questionFormData.options || []) : undefined,
                      rankDescriptions: newType === 'rank' ? (questionFormData.rankDescriptions || {}) : undefined,
                    });
                  }}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="radio">ラジオボタン（単一選択）</option>
                  <option value="checkbox">チェックボックス（複数選択）</option>
                  <option value="text">テキスト入力（1行）</option>
                  <option value="textarea">テキストエリア（複数行）</option>
                  <option value="rank">ランク評価</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={questionFormData.required ?? false}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, required: e.target.checked })}
                    className="w-4 h-4 text-sky-500 bg-white border-slate-300 rounded focus:ring-sky-500"
                  />
                  必須項目にする
                </label>
              </div>

              {(questionFormData.type === 'text' || questionFormData.type === 'textarea') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      プレースホルダー
                    </label>
                    <input
                      type="text"
                      value={questionFormData.placeholder || ''}
                      onChange={(e) => setQuestionFormData({ ...questionFormData, placeholder: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="プレースホルダーテキストを入力"
                    />
                  </div>
                  {questionFormData.type === 'textarea' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        最大文字数
                      </label>
                      <input
                        type="number"
                        value={questionFormData.maxLength || ''}
                        onChange={(e) => setQuestionFormData({
                          ...questionFormData,
                          maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                        })}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        placeholder="最大文字数を入力"
                      />
                    </div>
                  )}
                </>
              )}

              {needsOptions(questionFormData.type || 'radio') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      選択肢
                    </label>
                    <button
                      onClick={handleAddOption}
                      className="text-xs px-2 py-1 bg-sky-50 text-sky-500 rounded hover:bg-sky-100 transition-colors"
                    >
                      + 選択肢を追加
                    </button>
                  </div>
                  <div className="space-y-2">
                    {questionFormData.options?.map((option, optIndex) => (
                      <div key={option.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                        <input
                          type="text"
                          value={option.label}
                          onChange={(e) => handleUpdateOption(optIndex, 'label', e.target.value)}
                          placeholder="選択肢のラベル"
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <input
                          type="text"
                          value={option.value}
                          onChange={(e) => handleUpdateOption(optIndex, 'value', e.target.value)}
                          placeholder="値（英数字）"
                          className="w-32 px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <button
                          onClick={() => handleDeleteOption(optIndex)}
                          className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {questionFormData.type === 'rank' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ランク評価の説明
                  </label>
                  <div className="space-y-4">
                    {questionFormData.options?.map((option) => {
                      const rank = option.value;
                      const descriptions = questionFormData.rankDescriptions?.[rank] || [];
                      return (
                        <div key={option.id} className="p-4 bg-slate-50 rounded border border-slate-200">
                          <div className="font-medium text-sm text-slate-700 mb-2">{option.label}</div>
                          <div className="space-y-2">
                            {descriptions.map((desc, descIndex) => (
                              <div key={descIndex} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={desc}
                                  onChange={(e) => handleUpdateRankDescription(rank, descIndex, e.target.value)}
                                  placeholder="説明文を入力"
                                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                                <button
                                  onClick={() => handleDeleteRankDescription(rank, descIndex)}
                                  className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                >
                                  削除
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => handleAddRankDescription(rank)}
                              className="text-xs px-2 py-1 bg-sky-50 text-sky-500 rounded hover:bg-sky-100 transition-colors"
                            >
                              + 説明を追加
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseQuestionModal}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveQuestion}
                className="px-4 py-2 bg-sky-400 text-white rounded-lg hover:bg-sky-500 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 回答結果モーダル */}
      {viewingResponses && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                {viewingResponses.title} - 回答結果
              </h3>
              <button
                onClick={handleCloseResponsesModal}
                className="text-slate-500 hover:text-slate-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {loadingResponses ? (
              <div className="text-center py-8">
                <p className="text-slate-600">読み込み中...</p>
              </div>
            ) : responses.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-slate-600">まだ回答がありません。</p>
                <p className="text-xs text-slate-400">
                  アンケートID: {viewingResponses.id}
                </p>
                <p className="text-xs text-slate-400">
                  法人ID: {orgId}
                </p>
                <p className="text-xs text-slate-400 mt-4">
                  ※ ブラウザのコンソール（F12）で詳細なデバッグ情報を確認できます
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mb-4 p-3 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-sky-900">
                    回答数: <span className="font-bold">{responses.length}</span>件
                  </p>
                  <button
                    onClick={handleExportToCSV}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <span>📥</span>
                    CSVダウンロード
                  </button>
                </div>

                <div className="space-y-6">
                  {responses.map((response) => (
                    <div
                      key={response.id}
                      className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                    >
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
                        <div>
                          <h4 className="font-semibold text-slate-800">{response.respondentName}</h4>
                          <p className="text-xs text-slate-500">
                            回答日時: {new Date(response.submittedAt).toLocaleString('ja-JP')}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {viewingResponses.questions.map((question, qIndex) => {
                          const answer = response.answers.find(
                            (a) => a.questionId === question.id
                          );
                          if (!answer) return null;

                          return (
                            <div key={question.id} className="bg-white rounded p-3 border border-slate-200">
                              <p className="font-medium text-slate-700 mb-2 text-sm">
                                {qIndex + 1}. {question.title}
                                {question.required && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </p>
                              <div className="text-slate-600 text-sm">
                                {answer.type === 'checkbox' && Array.isArray(answer.value) ? (
                                  <ul className="list-disc list-inside space-y-1">
                                    {answer.value.map((val, idx) => {
                                      const option = question.options?.find((opt) => opt.value === val);
                                      return (
                                        <li key={idx}>{option ? option.label : val}</li>
                                      );
                                    })}
                                  </ul>
                                ) : answer.type === 'radio' || answer.type === 'rank' ? (
                                  (() => {
                                    const option = question.options?.find(
                                      (opt) => opt.value === answer.value
                                    );
                                    return <p>{option ? option.label : answer.value}</p>;
                                  })()
                                ) : (
                                  <p className="whitespace-pre-wrap">{answer.value || '(未回答)'}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-6">
              {responses.length > 0 && (
                <button
                  onClick={handleExportToCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <span>📥</span>
                  CSVダウンロード
                </button>
              )}
              <button
                onClick={handleCloseResponsesModal}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors ml-auto"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyManagement;
