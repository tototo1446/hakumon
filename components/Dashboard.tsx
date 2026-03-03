
import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar } from 'recharts';
import { LiteracyScores, Organization, SurveyResponse, Survey } from '../types';
import { getLiteracyInsight, aggregateResponses } from '../services/geminiService';
import { getResponsesByOrg, getResponsesByOrgFromSupabase } from '../services/surveyResponseService';
import { calculateOrgAverageScore, calculateOverallScore, calculateScoreFromResponse } from '../services/literacyScoreService';
import { getRankFromScore } from '../services/rankCalculationService';
import { getRankDefinition } from '../services/rankDefinitionService';
import { getOrganizations } from '../services/organizationService';
import { getSurveysByOrgFromSupabase } from '../services/surveyService';

interface DashboardProps {
  org: Organization;
  viewingOrg: Organization | null;
  onClearView: () => void;
  organizations?: Organization[]; // 法人一覧（システム管理者用）
  onSelectOrg?: (org: Organization | null) => void; // 法人選択コールバック
  isSuperAdmin?: boolean; // システム管理者かどうか
}

const Dashboard: React.FC<DashboardProps> = ({ 
  org, 
  viewingOrg, 
  onClearView, 
  organizations = [],
  onSelectOrg,
  isSuperAdmin = false
}) => {
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyIdForDistribution, setSelectedSurveyIdForDistribution] = useState<string>('');
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [allOrgResponses, setAllOrgResponses] = useState<SurveyResponse[]>([]);

  const targetOrgId = viewingOrg?.id || org.id;
  const orgResponses = responses.filter(r => r.orgId === targetOrgId);
  const rankDefinition = viewingOrg?.rankDefinition || org.rankDefinition || getRankDefinition(targetOrgId);

  // 回答データからスコアを計算（AI分析・ランク分布用）
  const calculatedScores = orgResponses.length > 0
    ? calculateOrgAverageScore(targetOrgId, orgResponses, rankDefinition || undefined)
    : null;
  const displayScores: LiteracyScores = calculatedScores || (viewingOrg
    ? { basics: viewingOrg.avgScore + 5, prompting: viewingOrg.avgScore - 10, ethics: viewingOrg.avgScore + 2, tools: viewingOrg.avgScore, automation: viewingOrg.avgScore - 5 }
    : { basics: org.avgScore + 5, prompting: org.avgScore - 10, ethics: org.avgScore + 2, tools: org.avgScore, automation: org.avgScore - 5 });

  const minRequiredRespondents = (viewingOrg || org).minRequiredRespondents ?? 5;
  const hasEnoughDataForInsight = orgResponses.length >= minRequiredRespondents;
  const getInsightStorageKey = (orgId: string) => `yohaku_ai_insight_${orgId}`;

  const fetchInsight = async () => {
    if (!hasEnoughDataForInsight) return;
    setLoadingInsight(true);
    try {
      const promptName = viewingOrg ? `${viewingOrg.name}（組織全体）` : org.name;
      const aggregation = orgResponses.length > 0 ? aggregateResponses(orgResponses) : undefined;
      const text = await getLiteracyInsight(displayScores, promptName, aggregation);
      const result = text || '';
      setInsight(result);
      try {
        localStorage.setItem(getInsightStorageKey(targetOrgId), JSON.stringify({ text: result, generatedAt: new Date().toISOString() }));
      } catch { /* ignore */ }
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    try {
      const key = getInsightStorageKey(targetOrgId);
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as { text?: string };
        setInsight(parsed.text ?? '');
      } else {
        setInsight('');
      }
    } catch {
      setInsight('');
    }
  }, [targetOrgId]);

  // 回答データを取得
  useEffect(() => {
    const targetOrgId = viewingOrg?.id || org.id;
    
    // Supabaseからデータを取得
    const loadData = async () => {
      try {
        const orgResponses = await getResponsesByOrgFromSupabase(targetOrgId);
        setResponses(orgResponses.length > 0 ? orgResponses : getResponsesByOrg(targetOrgId));

        const orgSurveys = await getSurveysByOrgFromSupabase(targetOrgId);
        if (orgSurveys.length > 0) {
          setSurveys(orgSurveys.filter(s => s.isActive));
        } else {
          // localStorageから取得（フォールバック）
          const surveysData = localStorage.getItem('surveys');
          if (surveysData) {
            try {
              const parsedSurveys = JSON.parse(surveysData) as Survey[];
              setSurveys(parsedSurveys.filter(s => s.isActive && s.orgId === targetOrgId));
            } catch {
              setSurveys([]);
            }
          } else {
            setSurveys([]);
          }
        }
      } catch (error) {
        console.error('データの取得に失敗しました:', error);
        // エラー時はlocalStorageから取得
        const orgResponses = getResponsesByOrg(targetOrgId);
        setResponses(orgResponses);
        
        const surveysData = localStorage.getItem('surveys');
        if (surveysData) {
          try {
            const parsedSurveys = JSON.parse(surveysData) as Survey[];
            setSurveys(parsedSurveys.filter(s => s.isActive && s.orgId === targetOrgId));
          } catch {
            setSurveys([]);
          }
        } else {
          setSurveys([]);
        }
      }
    };

    loadData();
  }, [viewingOrg, org]);

  // 管理者用：全法人のデータを取得
  useEffect(() => {
    if (isSuperAdmin && organizations.length > 0) {
      const loadAllOrgData = async () => {
        try {
          const orgs = await getOrganizations();
          setAllOrganizations(orgs.length > 0 ? orgs : organizations);
          const allResponses: SurveyResponse[] = [];
          for (const orgItem of (orgs.length > 0 ? orgs : organizations)) {
            try {
              const orgResps = await getResponsesByOrgFromSupabase(orgItem.id);
              allResponses.push(...orgResps);
            } catch (error) {
              console.error(`法人 ${orgItem.name} の回答データ取得に失敗:`, error);
            }
          }
          setAllOrgResponses(allResponses);
        } catch (error) {
          console.error('全法人データの取得に失敗しました:', error);
          setAllOrganizations(organizations);
        }
      };
      loadAllOrgData();
    }
  }, [isSuperAdmin, organizations]);

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOrgId = e.target.value;
    if (selectedOrgId === '') {
      onSelectOrg?.(null);
      onClearView();
    } else {
      const selectedOrg = organizations.find(org => org.id === selectedOrgId);
      if (selectedOrg) {
        onSelectOrg?.(selectedOrg);
      }
    }
  };

  // ランク分布・平均ランク・回答率を計算
  const { rankDistribution, averageRank, responseRate, uniqueRespondentCount } = useMemo(() => {
    const memberCount = (viewingOrg || org).memberCount || 0;
    const byRespondent = new Map<string, SurveyResponse>();
    orgResponses.forEach(r => {
      const existing = byRespondent.get(r.respondentName);
      if (!existing || new Date(r.submittedAt) > new Date(existing.submittedAt)) {
        byRespondent.set(r.respondentName, r);
      }
    });
    const latestResponses = Array.from(byRespondent.values());
    const count = latestResponses.length;
    const dist = [0, 0, 0, 0, 0];
    let rankSum = 0;
    latestResponses.forEach(res => {
      const scores = calculateScoreFromResponse(res, rankDefinition || undefined);
      const overall = calculateOverallScore(scores);
      const rank = getRankFromScore(overall);
      dist[rank - 1]++;
      rankSum += rank;
    });
    const avgRank = count > 0 ? Math.round((rankSum / count) * 10) / 10 : 0;
    const rate = memberCount > 0 ? Math.round((count / memberCount) * 100) : 0;
    return {
      rankDistribution: [
        { rank: 1, name: 'ランク1', count: dist[0], fill: '#94a3b8' },
        { rank: 2, name: 'ランク2', count: dist[1], fill: '#64748b' },
        { rank: 3, name: 'ランク3', count: dist[2], fill: '#6366f1' },
        { rank: 4, name: 'ランク4', count: dist[3], fill: '#8b5cf6' },
        { rank: 5, name: 'ランク5', count: dist[4], fill: '#22c55e' },
      ],
      averageRank: avgRank,
      responseRate: rate,
      uniqueRespondentCount: count,
    };
  }, [orgResponses, targetOrgId, rankDefinition, viewingOrg, org]);

  // 部署質問を特定
  const departmentQuestion = useMemo(() => {
    const keywords = ['部署', 'department', '所属部署', '所属', '事業部', '部', '課'];
    for (const survey of surveys) {
      for (const q of survey.questions) {
        const t = q.title.toLowerCase();
        const id = q.id.toLowerCase();
        if (keywords.some(k => t.includes(k.toLowerCase()) || id.includes('department') || id.includes('dept') || id.includes('部署'))) {
          return { questionId: q.id, options: q.options };
        }
      }
    }
    return null;
  }, [surveys]);

  const extractDepartmentLabel = (response: SurveyResponse): string | null => {
    if (!departmentQuestion) return null;
    const ans = response.answers.find(a => a.questionId === departmentQuestion.questionId);
    if (!ans || typeof ans.value !== 'string') return null;
    const opt = departmentQuestion.options?.find(o => o.value === ans.value);
    return opt ? opt.label : ans.value;
  };

  // 部門別平均ランク
  const departmentAvgRank = useMemo(() => {
    if (!departmentQuestion || orgResponses.length === 0) return [];
    const byDept = new Map<string, { rankSum: number; count: number }>();
    const byRespondent = new Map<string, SurveyResponse>();
    orgResponses.forEach(r => {
      const existing = byRespondent.get(r.respondentName);
      if (!existing || new Date(r.submittedAt) > new Date(existing.submittedAt)) {
        byRespondent.set(r.respondentName, r);
      }
    });
    Array.from(byRespondent.values()).forEach(res => {
      const dept = extractDepartmentLabel(res);
      if (!dept) return;
      const scores = calculateScoreFromResponse(res, rankDefinition || undefined);
      const rank = getRankFromScore(calculateOverallScore(scores));
      const cur = byDept.get(dept) || { rankSum: 0, count: 0 };
      cur.rankSum += rank;
      cur.count += 1;
      byDept.set(dept, cur);
    });
    return Array.from(byDept.entries())
      .map(([name, { rankSum, count }]) => ({
        name,
        avgRank: Math.round((rankSum / count) * 10) / 10,
        count,
        pct: Math.round((rankSum / count / 5) * 100),
      }))
      .sort((a, b) => b.avgRank - a.avgRank);
  }, [orgResponses, departmentQuestion, rankDefinition]);



  // アンケート毎の質問の回答分布（選択肢別の人数）
  const surveyQuestionDistribution = useMemo(() => {
    return surveys.map(survey => {
      const surveyResponses = orgResponses.filter(r => r.surveyId === survey.id);
      const total = surveyResponses.length;
      const questions = survey.questions.map(q => {
        const distribution: { label: string; count: number; pct: number }[] = [];

        if ((q.type === 'radio' || q.type === 'rank') && q.options) {
          const countByValue = new Map<string, number>();
          q.options.forEach(opt => countByValue.set(opt.value, 0));
          surveyResponses.forEach(r => {
            const ans = r.answers.find(a => a.questionId === q.id);
            if (ans && typeof ans.value === 'string') {
              countByValue.set(ans.value, (countByValue.get(ans.value) ?? 0) + 1);
            }
          });
          q.options.forEach(opt => {
            const c = countByValue.get(opt.value) ?? 0;
            distribution.push({
              label: opt.label,
              count: c,
              pct: total > 0 ? Math.round((c / total) * 100) : 0,
            });
          });
        } else if (q.type === 'checkbox' && q.options) {
          const countByValue = new Map<string, number>();
          q.options.forEach(opt => countByValue.set(opt.value, 0));
          surveyResponses.forEach(r => {
            const ans = r.answers.find(a => a.questionId === q.id);
            if (ans && Array.isArray(ans.value)) {
              (ans.value as string[]).forEach(val => {
                countByValue.set(val, (countByValue.get(val) ?? 0) + 1);
              });
            }
          });
          q.options.forEach(opt => {
            const c = countByValue.get(opt.value) ?? 0;
            distribution.push({
              label: opt.label,
              count: c,
              pct: total > 0 ? Math.round((c / total) * 100) : 0,
            });
          });
        } else {
          // text / textarea: 回答済み人数のみ
          const answered = surveyResponses.filter(r => {
            const ans = r.answers.find(a => a.questionId === q.id);
            if (!ans) return false;
            const v = ans.value;
            return (typeof v === 'string' && (v as string).trim() !== '') || (Array.isArray(v) && v.length > 0);
          }).length;
          distribution.push({
            label: '回答済み',
            count: answered,
            pct: total > 0 ? Math.round((answered / total) * 100) : 0,
          });
        }

        return { id: q.id, title: q.title, description: q.description, type: q.type, distribution: distribution.length > 0 ? distribution : [{ label: 'データなし', count: 0, pct: 0 }], total };
      });
      return { survey, questions, total };
    });
  }, [surveys, orgResponses]);

  // 質問ごとのカード用にフラット化（グリッド表示用）
  const questionCards = useMemo(() => {
    const cards: { key: string; surveyId: string; surveyTitle: string; surveyTotal: number; question: { id: string; title: string; description?: string; type: string; distribution: { label: string; count: number; pct: number }[]; total: number } }[] = [];
    surveyQuestionDistribution.forEach(({ survey, questions, total }) => {
      questions.forEach(q => {
        cards.push({
          key: `${survey.id}-${q.id}`,
          surveyId: survey.id,
          surveyTitle: survey.title,
          surveyTotal: total,
          question: q,
        });
      });
    });
    return cards;
  }, [surveyQuestionDistribution]);

  // アンケート選択時：未選択または無効な選択なら最初のアンケートをデフォルトに
  useEffect(() => {
    if (surveys.length === 0) return;
    const exists = surveys.some(s => s.id === selectedSurveyIdForDistribution);
    if (!selectedSurveyIdForDistribution || !exists) {
      setSelectedSurveyIdForDistribution(surveys[0].id);
    }
  }, [surveys, selectedSurveyIdForDistribution]);

  // 選択中のアンケートの質問カードのみ表示
  const filteredQuestionCards = useMemo(() => {
    if (!selectedSurveyIdForDistribution) return [];
    return questionCards.filter(c => c.surveyId === selectedSurveyIdForDistribution);
  }, [questionCards, selectedSurveyIdForDistribution]);

  const cardClass = 'bg-white rounded-xl shadow-sm border border-slate-200';
  const labelClass = 'text-slate-500 text-xs font-semibold uppercase tracking-wider';
  const valueClass = 'text-slate-900 text-2xl sm:text-4xl font-bold';

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full min-w-0">
      {/* システム管理者用：法人選択セレクター */}
      {isSuperAdmin && organizations.length > 0 && (
        <div className={cardClass + ' p-4'}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <span className="text-lg flex-shrink-0">🏢</span>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  法人を選択してダッシュボードを表示
                </label>
                <select
                  value={viewingOrg?.id || ''}
                  onChange={handleOrgChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-white text-slate-900"
                >
                  <option value="">マイダッシュボード</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {viewingOrg && (
              <button 
                onClick={() => {
                  onSelectOrg?.(null);
                  onClearView();
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                クリア
              </button>
            )}
          </div>
        </div>
      )}

      {/* 法人ビュー表示バナー（システム管理者が他法人を選択した時のみ表示。法人アカウントは自組織のみのため不要） */}
      {viewingOrg && isSuperAdmin && (
        <div className="bg-sky-400 text-white px-4 sm:px-6 py-4 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {viewingOrg.logo ? (
              <img
                src={viewingOrg.logo}
                alt={viewingOrg.name}
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain bg-white rounded-lg p-1 flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-xl sm:text-2xl flex-shrink-0">🏢</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-sky-200 font-bold uppercase tracking-wider">組織ビュー実行中</p>
              <h3 className="text-base sm:text-xl font-bold truncate">{viewingOrg.name} の状況を表示しています</h3>
            </div>
          </div>
          <button 
            onClick={() => {
              onSelectOrg?.(null);
              onClearView();
            }}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            {isSuperAdmin ? 'マイダッシュボードに戻る' : 'クリア'}
          </button>
        </div>
      )}

      {/* AI分析アドバイス */}
      <div className={cardClass + ' p-4 sm:p-6 flex flex-col'}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-800">
            {viewingOrg ? '組織向け AI 戦略アドバイス' : 'AI 分析アドバイス'}
          </h3>
          {hasEnoughDataForInsight && (
            <button
              onClick={fetchInsight}
              disabled={loadingInsight}
              className="text-xs text-sky-500 hover:text-sky-800 font-medium whitespace-nowrap ml-2"
            >
              {loadingInsight ? '分析中...' : insight ? '再分析' : '分析'}
            </button>
          )}
        </div>
        <div className="flex-1 bg-sky-50/50 rounded-lg p-4 sm:p-5 border border-sky-100 text-slate-700 text-xs sm:text-sm leading-relaxed overflow-y-auto max-h-64">
          {!hasEnoughDataForInsight ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2 text-center">
              <p className="text-slate-600 font-medium">回答者数が {minRequiredRespondents} 名に達するまで分析できません</p>
              <p className="text-slate-500 text-xs">現在 {orgResponses.length} 名 / {minRequiredRespondents} 名</p>
              <p className="text-slate-400 text-xs mt-2">法人ごとの最小回答者数は、管理者画面で設定できます</p>
            </div>
          ) : loadingInsight ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 italic">スコアをAIが解析しています...</p>
            </div>
          ) : (
            <div className="ai-insight-markdown">
              {insight ? (
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => <h2 className="text-sm font-bold text-slate-800 mt-4 mb-2 first:mt-0">{children}</h2>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                    li: ({ children }) => <li className="text-slate-700">{children}</li>,
                    p: ({ children }) => <p className="my-2 text-slate-700">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
                  }}
                >
                  {insight}
                </ReactMarkdown>
              ) : (
                <p className="text-slate-600">「分析」ボタンをクリックすると、現在のデータに基づいてAI戦略アドバイスを生成します</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <div className={cardClass + ' p-4 sm:p-6 relative'}>
          <div className="flex items-start justify-between">
            <div>
              <p className={labelClass + ' mb-1'}>回答者数</p>
              <div className="flex items-end space-x-1 sm:space-x-2">
                <span className="text-xl sm:text-3xl font-bold text-sky-500">
                  {uniqueRespondentCount}名
                </span>
              </div>
            </div>
            <button className="text-slate-500 hover:text-slate-700 p-1" title="アンケートに回答した人数（重複除く）">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>
        <div className={cardClass + ' p-4 sm:p-6 relative'}>
          <div className="flex items-start justify-between">
            <div>
              <p className={labelClass + ' mb-1'}>平均ランク</p>
              <div className="flex items-end space-x-1 sm:space-x-2">
                <span className="text-xl sm:text-3xl font-bold text-amber-600">
                  {averageRank.toFixed(1)}
                </span>
                <span className="text-slate-400 text-xs sm:text-sm mb-1">/ 5</span>
              </div>
            </div>
            <button className="text-slate-500 hover:text-slate-700 p-1" title="回答者の平均ランク（1〜5）">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>
        <div className={cardClass + ' p-4 sm:p-6 relative'}>
          <div className="flex items-start justify-between">
            <div>
              <p className={labelClass + ' mb-1'}>回答率</p>
              <div className="flex items-end space-x-1 sm:space-x-2">
                <span className="text-xl sm:text-3xl font-bold text-teal-600">
                  {responseRate}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {uniqueRespondentCount}名 / {(viewingOrg || org).memberCount || 0}名
              </p>
            </div>
            <button className="text-slate-500 hover:text-slate-700 p-1" title="組織メンバーに対する回答者の割合">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ランク分布 */}
      {orgResponses.length > 0 && (
        <div className={cardClass + ' p-4 sm:p-6'}>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4">ランク分布</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankDistribution} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} width={60} />
                  <Tooltip formatter={(value: number) => [`${value}名`, '人数']} />
                  <Bar dataKey="count" name="人数" radius={[0, 4, 4, 0]}>
                    {rankDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rankDistribution.filter(d => d.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="name"
                    label={({ name, value, percent }) => `${name} ${value}名 (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                  >
                    {rankDistribution.filter(d => d.count > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value}名`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
            {rankDistribution.map(d => (
              <span key={d.rank}>
                <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: d.fill }} />
                {d.name}: {d.count}名
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 部門別平均ランク */}
      {departmentAvgRank.length > 0 && (
        <div className={cardClass + ' p-4 sm:p-6'}>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4">部門別平均ランク</h3>
          <div className="space-y-4">
            {departmentAvgRank.map((d, idx) => {
              const colors = ['bg-sky-500', 'bg-teal-500', 'bg-emerald-500', 'bg-violet-500', 'bg-pink-500', 'bg-amber-500'];
              return (
                <div key={d.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{d.name}</span>
                    <span className="text-slate-600 font-medium">{d.avgRank} / 5 ({d.pct}%) · {d.count}名</span>
                  </div>
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-500`}
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* アンケート毎の質問の回答分布（質問ごとにカード） */}
      {questionCards.length > 0 && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">質問別・回答分布</h3>
              <p className="text-xs text-slate-500 mt-1">各質問で何を選んだ人が何人いるかを表示します</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="survey-select-distribution" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                表示するアンケート:
              </label>
              <select
                id="survey-select-distribution"
                value={selectedSurveyIdForDistribution}
                onChange={(e) => setSelectedSurveyIdForDistribution(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-white text-slate-900 text-sm min-w-[200px]"
              >
                {surveys.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {filteredQuestionCards.length > 0 && filteredQuestionCards[0].surveyTotal === 0 ? (
            <div className={cardClass + ' p-8 sm:p-12 text-center'}>
              <p className="text-slate-400 text-lg mb-2">まだ回答がありません</p>
              <p className="text-slate-400 text-sm">アンケートの公開リンクを共有して回答を集めましょう</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredQuestionCards.map(({ key, surveyTitle, surveyTotal, question }) => (
                <div key={key} className={cardClass + ' p-4 sm:p-5'}>
                  <h4 className="text-sm font-semibold text-slate-800 mb-1">{question.title}</h4>
                  <p className="text-xs text-slate-500 mb-3">{surveyTitle}（{surveyTotal}件回答）</p>
                  {question.description && (
                    <p className="text-xs text-slate-600 mb-3">{question.description}</p>
                  )}
                  <div className="space-y-3">
                    {question.distribution.map((item, dIdx) => {
                      const colors = ['bg-sky-500', 'bg-teal-500', 'bg-emerald-500', 'bg-violet-500', 'bg-pink-500', 'bg-amber-500'];
                      return (
                        <div key={dIdx}>
                          <div className="flex justify-between text-xs sm:text-sm mb-0.5">
                            <span className="text-slate-700 truncate mr-2">{item.label}</span>
                            <span className="text-slate-600 font-medium shrink-0">{item.count}名 ({item.pct}%)</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors[dIdx % colors.length]} rounded-full transition-all duration-500`}
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 業務削減時間分析 */}
      {orgResponses.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6">業務削減時間分析</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-4">削減時間の分布</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(() => {
                        const distribution: { name: string; value: number }[] = [
                          { name: '5時間未満', value: 0 },
                          { name: '5~10時間', value: 0 },
                          { name: '10~20時間', value: 0 },
                          { name: '20時間以上', value: 0 },
                          { name: '効果なし', value: 0 },
                        ];
                        orgResponses.forEach(response => {
                          const timeReductionAnswer = response.answers.find(a => {
                            const question = surveys.find(s => s.id === response.surveyId)?.questions.find(q => q.id === a.questionId);
                            return question?.title.includes('業務時間削減効果');
                          });
                          if (timeReductionAnswer && typeof timeReductionAnswer.value === 'string') {
                            const value = timeReductionAnswer.value;
                            if (value === 'less_than_5') distribution[0].value++;
                            else if (value === '5_to_10') distribution[1].value++;
                            else if (value === '10_to_20') distribution[2].value++;
                            else if (value === 'more_than_20') distribution[3].value++;
                            else if (value === 'no_effect') distribution[4].value++;
                          }
                        });
                        return distribution.filter(d => d.value > 0);
                      })()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#6b7280'].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-2">平均削減時間</p>
                <p className="text-2xl font-bold text-slate-800">
                  {(() => {
                    const totalHours = orgResponses.reduce((sum, response) => {
                      const timeReductionAnswer = response.answers.find(a => {
                        const question = surveys.find(s => s.id === response.surveyId)?.questions.find(q => q.id === a.questionId);
                        return question?.title.includes('業務時間削減効果');
                      });
                      if (timeReductionAnswer && typeof timeReductionAnswer.value === 'string') {
                        const value = timeReductionAnswer.value;
                        if (value === 'less_than_5') return 2.5;
                        if (value === '5_to_10') return 7.5;
                        if (value === '10_to_20') return 15;
                        if (value === 'more_than_20') return 25;
                      }
                      return 0;
                    }, 0);
                    return orgResponses.length > 0 ? `${(totalHours / orgResponses.length).toFixed(1)}時間/週` : '0時間/週';
                  })()}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-2">最大削減時間</p>
                <p className="text-2xl font-bold text-slate-800">
                  {(() => {
                    let maxHours = 0;
                    orgResponses.forEach(response => {
                      const timeReductionAnswer = response.answers.find(a => {
                        const question = surveys.find(s => s.id === response.surveyId)?.questions.find(q => q.id === a.questionId);
                        return question?.title.includes('業務時間削減効果');
                      });
                      if (timeReductionAnswer && typeof timeReductionAnswer.value === 'string') {
                        const value = timeReductionAnswer.value;
                        let hours = 0;
                        if (value === 'less_than_5') hours = 2.5;
                        else if (value === '5_to_10') hours = 7.5;
                        else if (value === '10_to_20') hours = 15;
                        else if (value === 'more_than_20') hours = 25;
                        maxHours = Math.max(maxHours, hours);
                      }
                    });
                    return `${maxHours}時間/週`;
                  })()}
                </p>
              </div>
              <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
                <p className="text-sm text-sky-700 mb-2">削減時間の割合</p>
                <p className="text-2xl font-bold text-sky-800">
                  {(() => {
                    const totalHours = orgResponses.reduce((sum, response) => {
                      const timeReductionAnswer = response.answers.find(a => {
                        const question = surveys.find(s => s.id === response.surveyId)?.questions.find(q => q.id === a.questionId);
                        return question?.title.includes('業務時間削減効果');
                      });
                      if (timeReductionAnswer && typeof timeReductionAnswer.value === 'string') {
                        const value = timeReductionAnswer.value;
                        if (value === 'less_than_5') return 2.5;
                        if (value === '5_to_10') return 7.5;
                        if (value === '10_to_20') return 15;
                        if (value === 'more_than_20') return 25;
                      }
                      return 0;
                    }, 0);
                    const totalWorkHours = orgResponses.length * 40; // 40時間/週
                    const reductionRate = totalWorkHours > 0 ? ((totalHours / totalWorkHours) * 100).toFixed(1) : '0';
                    return `${reductionRate}%`;
                  })()}
                </p>
                <p className="text-xs text-sky-500 mt-1">
                  総労働時間（{orgResponses.length}名 × 40時間/週）に対する削減時間の割合
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 管理者用：法人ごとの成長率分析 */}
      {isSuperAdmin && allOrganizations.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6">法人ごとの成長率分析</h3>
          <div className="space-y-4 mb-6">
            {allOrganizations.map((orgItem) => {
              const orgItemResponses = allOrgResponses.filter(r => r.orgId === orgItem.id);
              const orgItemRankDefinition = orgItem.rankDefinition || getRankDefinition(orgItem.id);
              const latestResponses = orgItemResponses
                .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                .slice(0, Math.min(10, orgItemResponses.length));
              const olderResponses = orgItemResponses
                .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                .slice(10, Math.min(20, orgItemResponses.length));
              const calcAvgRank = (resps: SurveyResponse[]) => {
                if (resps.length === 0) return 0;
                let rankSum = 0;
                resps.forEach(r => {
                  const scores = calculateScoreFromResponse(r, orgItemRankDefinition || undefined);
                  rankSum += getRankFromScore(calculateOverallScore(scores));
                });
                return Math.round((rankSum / resps.length) * 10) / 10;
              };
              const latestAvgRank = calcAvgRank(latestResponses);
              const olderAvgRank = calcAvgRank(olderResponses);
              const growthRate = olderAvgRank > 0 ? Math.round(((latestAvgRank - olderAvgRank) / olderAvgRank) * 100) : 0;
              const monthlyData = new Map<string, { rankSum: number; count: number }>();
              orgItemResponses.forEach(response => {
                const date = new Date(response.submittedAt);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const scores = calculateScoreFromResponse(response, orgItemRankDefinition || undefined);
                const rank = getRankFromScore(calculateOverallScore(scores));
                if (!monthlyData.has(monthKey)) monthlyData.set(monthKey, { rankSum: 0, count: 0 });
                const data = monthlyData.get(monthKey)!;
                data.rankSum += rank;
                data.count += 1;
              });
              const trendData = Array.from(monthlyData.entries())
                .map(([month, data]) => ({ month: month.replace('-', '/'), avgRank: Math.round((data.rankSum / data.count) * 10) / 10 }))
                .sort((a, b) => a.month.localeCompare(b.month))
                .slice(-6);
              return (
                <div key={orgItem.id} className="border border-slate-200 rounded-lg p-4 hover:border-sky-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      {orgItem.logo ? (
                        <img src={orgItem.logo} alt={orgItem.name} className="w-10 h-10 object-contain rounded border border-slate-200 bg-white" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-10 h-10 rounded border border-slate-200 bg-slate-100 flex items-center justify-center"><span className="text-slate-400 text-lg">🏢</span></div>
                      )}
                      <div>
                        <h4 className="font-semibold text-slate-800">{orgItem.name}</h4>
                        <p className="text-xs text-slate-500">{orgItemResponses.length}件の回答 / {new Set(orgItemResponses.map(r => r.respondentName)).size}名の回答者</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-600 mb-1">平均ランク</p>
                        <p className="text-xl sm:text-2xl font-bold text-sky-500">{latestAvgRank.toFixed(1)} / 5</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-600 mb-1">成長率</p>
                        <p className={`text-xl sm:text-2xl font-bold ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>{growthRate >= 0 ? '+' : ''}{growthRate}%</p>
                      </div>
                      <button onClick={() => onSelectOrg?.(orgItem)} className="px-3 py-2 text-sm text-sky-500 hover:text-sky-800 border border-sky-300 rounded-lg hover:bg-sky-50 transition-colors whitespace-nowrap w-full sm:w-auto">詳細を見る</button>
                    </div>
                  </div>
                  {trendData.length > 0 && (
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
                          <YAxis domain={[0, 5]} tick={{ fill: '#64748b', fontSize: 10 }} />
                          <Tooltip formatter={(value: number) => [`${value}`, '平均ランク']} labelFormatter={(label) => `期間: ${label}`} />
                          <Line type="monotone" dataKey="avgRank" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="平均ランク" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {allOrganizations.length > 1 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-700 mb-4">法人間の成長率比較</h4>
              <div className="h-56 sm:h-64 w-full min-w-0 overflow-x-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allOrganizations.map(orgItem => {
                    const orgItemResponses = allOrgResponses.filter(r => r.orgId === orgItem.id);
                    const orgItemRankDefinition = orgItem.rankDefinition || getRankDefinition(orgItem.id);
                    const calcAvgRank = (resps: SurveyResponse[]) => {
                      if (resps.length === 0) return 0;
                      let rankSum = 0;
                      resps.forEach(r => {
                        const scores = calculateScoreFromResponse(r, orgItemRankDefinition || undefined);
                        rankSum += getRankFromScore(calculateOverallScore(scores));
                      });
                      return Math.round((rankSum / resps.length) * 10) / 10;
                    };
                    const latestResponses = orgItemResponses.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).slice(0, Math.min(10, orgItemResponses.length));
                    const olderResponses = orgItemResponses.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).slice(10, Math.min(20, orgItemResponses.length));
                    const latestAvgRank = calcAvgRank(latestResponses);
                    const olderAvgRank = calcAvgRank(olderResponses);
                    const growthRate = olderAvgRank > 0 ? Math.round(((latestAvgRank - olderAvgRank) / olderAvgRank) * 100) : 0;
                    return { name: orgItem.name.length > 10 ? orgItem.name.substring(0, 10) + '...' : orgItem.name, growthRate, avgRank: latestAvgRank };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip formatter={(value: number, name: string) => (name === 'growthRate' ? [`${value >= 0 ? '+' : ''}${value}%`, '成長率'] : [`${value}`, '平均ランク']) as [string, string]} />
                    <Legend />
                    <Bar dataKey="growthRate" fill="#6366f1" name="成長率 (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Dashboard;
