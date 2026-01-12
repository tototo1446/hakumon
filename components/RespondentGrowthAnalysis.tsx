import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell } from 'recharts';
import { Organization, SurveyResponse, Answer, Survey } from '../types';
import { LITERACY_DIMENSIONS } from '../constants';
import { getResponsesByOrg, getResponsesByRespondent, saveResponse } from '../services/surveyResponseService';
import { calculateScoreFromResponse, calculateOverallScore, calculateOrgAverageScore } from '../services/literacyScoreService';
import { getRankDefinition } from '../services/rankDefinitionService';
import { generateDemoResponses } from '../services/demoDataService';
import { calculateRankChanges, calculateRankChangeStats, getRankFromScore } from '../services/rankCalculationService';
import { getSurveysByOrg } from '../services/surveyService';

interface RespondentGrowthAnalysisProps {
  org: Organization;
  viewingOrg: Organization | null;
  isSuperAdmin?: boolean;
  organizations?: Organization[];
  onSelectOrg?: (org: Organization | null) => void;
  onClearView?: () => void;
}

const RespondentGrowthAnalysis: React.FC<RespondentGrowthAnalysisProps> = ({ 
  org, 
  viewingOrg,
  isSuperAdmin = false,
  organizations = [],
  onSelectOrg,
  onClearView
}) => {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [selectedRespondent, setSelectedRespondent] = useState<string | null>(null);
  
  // 期間選択用のstate
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // 属性フィルタ用のstate
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [attributeFilters, setAttributeFilters] = useState<{ [key: string]: string }>({});

  const targetOrgId = viewingOrg?.id || org.id;
  const rankDefinition = viewingOrg?.rankDefinition || org.rankDefinition || getRankDefinition(targetOrgId);
  const orgResponses = responses.filter(r => r.orgId === targetOrgId);

  // 属性質問を特定する関数（部署、役職など）
  const identifyAttributeQuestions = useMemo(() => {
    const attributeKeywords = {
      department: ['部署', 'department', '所属部署', '所属', '事業部'],
      position: ['役職', 'position', '職位', '職種', '役割'],
    };

    const attributeQuestions: { [key: string]: { questionId: string; title: string; type: string } } = {};

    surveys.forEach(survey => {
      survey.questions.forEach(question => {
        const titleLower = question.title.toLowerCase();
        
        // 部署関連の質問を検出
        if (attributeKeywords.department.some(keyword => 
          titleLower.includes(keyword.toLowerCase()) || 
          question.id.toLowerCase().includes('department') ||
          question.id.toLowerCase().includes('dept')
        )) {
          if (!attributeQuestions.department) {
            attributeQuestions.department = {
              questionId: question.id,
              title: question.title,
              type: question.type,
            };
          }
        }
        
        // 役職関連の質問を検出
        if (attributeKeywords.position.some(keyword => 
          titleLower.includes(keyword.toLowerCase()) || 
          question.id.toLowerCase().includes('position') ||
          question.id.toLowerCase().includes('role')
        )) {
          if (!attributeQuestions.position) {
            attributeQuestions.position = {
              questionId: question.id,
              title: question.title,
              type: question.type,
            };
          }
        }
      });
    });

    return attributeQuestions;
  }, [surveys]);

  // 回答データから属性情報を抽出
  const extractAttributeValue = (response: SurveyResponse, questionId: string): string | null => {
    const answer = response.answers.find(a => a.questionId === questionId);
    if (!answer) return null;
    
    if (Array.isArray(answer.value)) {
      return answer.value.join(', ');
    }
    return answer.value || null;
  };

  // 属性フィルタリングを含むフィルタリング（useCallbackでメモ化）
  const applyAttributeFilters = useCallback((responses: SurveyResponse[]): SurveyResponse[] => {
    return responses.filter(response => {
      // 各属性フィルタをチェック
      for (const [attributeKey, filterValue] of Object.entries(attributeFilters)) {
        if (!filterValue) continue; // フィルタが設定されていない場合はスキップ
        
        const questionInfo = identifyAttributeQuestions[attributeKey];
        if (!questionInfo) continue;
        
        const attributeValue = extractAttributeValue(response, questionInfo.questionId);
        if (!attributeValue || attributeValue !== filterValue) {
          return false; // フィルタに一致しない場合は除外
        }
      }
      return true; // すべてのフィルタに一致
    });
  }, [attributeFilters, identifyAttributeQuestions]);

  // 各属性の選択肢を取得
  const getAttributeOptions = (attributeKey: string): string[] => {
    const questionInfo = identifyAttributeQuestions[attributeKey];
    if (!questionInfo) return [];
    
    const values = new Set<string>();
    orgResponses.forEach(response => {
      const value = extractAttributeValue(response, questionInfo.questionId);
      if (value) {
        // 複数選択の場合は分割
        if (value.includes(',')) {
          value.split(',').forEach(v => values.add(v.trim()));
        } else {
          values.add(value);
        }
      }
    });
    
    return Array.from(values).sort();
  };

  // 初期期間を設定（データが存在する場合は最初と最後の日付を使用）
  useEffect(() => {
    if (orgResponses.length > 0 && !startDate && !endDate) {
      const dates = orgResponses
        .map(r => new Date(r.submittedAt))
        .sort((a, b) => a.getTime() - b.getTime());
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      
      // YYYY-MM形式で設定
      const firstMonth = `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, '0')}`;
      const lastMonth = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;
      
      setStartDate(firstMonth);
      setEndDate(lastMonth);
    }
  }, [orgResponses.length]);

  // 期間と属性でフィルタリングされた回答データ
  const filteredResponses = useMemo(() => {
    let filtered = orgResponses;
    
    // 期間フィルタを適用
    if (startDate && endDate) {
      const start = new Date(startDate + '-01');
      const end = new Date(endDate + '-01');
      // 終了月の最後の日を設定
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(response => {
        const responseDate = new Date(response.submittedAt);
        return responseDate >= start && responseDate <= end;
      });
    }
    
    // 属性フィルタを適用
    filtered = applyAttributeFilters(filtered);
    
    return filtered;
  }, [orgResponses, startDate, endDate, attributeFilters, identifyAttributeQuestions]);

  // 回答データを取得し、データが存在しない場合は初期デモデータを生成
  useEffect(() => {
    const loadedResponses = getResponsesByOrg(targetOrgId);
    
    // データが存在しない場合、初期デモデータを生成
    if (loadedResponses.length === 0) {
      const demoResponses = generateDemoResponses(targetOrgId);
      // 各回答を保存
      demoResponses.forEach(response => {
        saveResponse(response);
      });
      // 保存したデータを取得
      const allResponses = getResponsesByOrg(targetOrgId);
      setResponses(allResponses);
    } else {
      setResponses(loadedResponses);
    }
    
    // アンケートデータを取得（属性情報抽出用）
    const orgSurveys = getSurveysByOrg(targetOrgId);
    setSurveys(orgSurveys);
    
    // 法人が変更されたら、選択された回答者とフィルタをリセット
    setSelectedRespondent(null);
    setAttributeFilters({});
  }, [targetOrgId, viewingOrg, org]);

  // 回答者一覧を取得（フィルタリング後のデータから）
  const respondents = useMemo(() => {
    const uniqueNames = new Set(filteredResponses.map(r => r.respondentName));
    return Array.from(uniqueNames).sort();
  }, [filteredResponses]);

  // 選択された回答者の回答履歴を取得（時系列でソート、期間・属性フィルタ適用）
  const respondentHistory = useMemo(() => {
    if (!selectedRespondent) return [];
    const allRespondentResponses = getResponsesByRespondent(selectedRespondent, targetOrgId);
    // 期間フィルタを適用
    let respondentResponses = allRespondentResponses.filter(response => {
      if (!startDate || !endDate) return true;
      const responseDate = new Date(response.submittedAt);
      const start = new Date(startDate + '-01');
      const end = new Date(endDate + '-01');
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      return responseDate >= start && responseDate <= end;
    });
    // 属性フィルタを適用
    respondentResponses = applyAttributeFilters(respondentResponses);
    return respondentResponses
      .map(response => {
        const scores = calculateScoreFromResponse(response, rankDefinition || undefined);
        const overallScore = calculateOverallScore(scores);
        return {
          ...response,
          overallScore,
          date: new Date(response.submittedAt).toLocaleDateString('ja-JP'),
          timestamp: new Date(response.submittedAt).getTime(),
          // 各次元のスコアを直接アクセスできるように展開
          basics: scores.basics,
          prompting: scores.prompting,
          ethics: scores.ethics,
          tools: scores.tools,
          automation: scores.automation,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [selectedRespondent, targetOrgId, rankDefinition, startDate, endDate, attributeFilters, identifyAttributeQuestions]);

  // 成長率を計算
  const growthRate = useMemo(() => {
    if (respondentHistory.length < 2) return null;
    const firstScore = respondentHistory[0].overallScore;
    const lastScore = respondentHistory[respondentHistory.length - 1].overallScore;
    if (firstScore === 0) return null;
    const rate = ((lastScore - firstScore) / firstScore) * 100;
    return Math.round(rate * 10) / 10; // 小数点第1位まで
  }, [respondentHistory]);

  // 回答者毎の最新スコアと成長率を計算（期間・属性フィルタ適用）
  const respondentStats = useMemo(() => {
    return respondents.map(name => {
      const allRespondentResponses = getResponsesByRespondent(name, targetOrgId);
      // 期間フィルタを適用
      let respondentResponses = allRespondentResponses
        .filter(response => {
          if (!startDate || !endDate) return true;
          const responseDate = new Date(response.submittedAt);
          const start = new Date(startDate + '-01');
          const end = new Date(endDate + '-01');
          end.setMonth(end.getMonth() + 1);
          end.setDate(0);
          end.setHours(23, 59, 59, 999);
          return responseDate >= start && responseDate <= end;
        });
      // 属性フィルタを適用
      respondentResponses = applyAttributeFilters(respondentResponses);
      // スコア計算
      respondentResponses = respondentResponses
        .map(response => {
          const scores = calculateScoreFromResponse(response, rankDefinition || undefined);
          const overallScore = calculateOverallScore(scores);
          return {
            ...response,
            overallScore,
            timestamp: new Date(response.submittedAt).getTime(),
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      if (respondentResponses.length === 0) return null;

      const firstScore = respondentResponses[0].overallScore;
      const lastScore = respondentResponses[respondentResponses.length - 1].overallScore;
      const growthRate = firstScore > 0 
        ? Math.round(((lastScore - firstScore) / firstScore) * 100 * 10) / 10
        : 0;

      return {
        name,
        firstScore,
        lastScore,
        growthRate,
        responseCount: respondentResponses.length,
      };
    }).filter(Boolean) as Array<{
      name: string;
      firstScore: number;
      lastScore: number;
      growthRate: number;
      responseCount: number;
    }>;
  }, [respondents, targetOrgId, rankDefinition, startDate, endDate, attributeFilters, identifyAttributeQuestions]);

  // ランク変動情報を計算（期間フィルタ適用）
  const rankChanges = useMemo(() => {
    return calculateRankChanges(filteredResponses, targetOrgId, rankDefinition || undefined);
  }, [filteredResponses, targetOrgId, rankDefinition]);

  // ランク変動統計を計算
  const rankStats = useMemo(() => {
    return calculateRankChangeStats(rankChanges);
  }, [rankChanges]);

  // ランク名を取得
  const getRankName = (rankNumber: number): string => {
    if (!rankDefinition || !rankDefinition.ranks[rankNumber - 1]) {
      return `ランク ${rankNumber}`;
    }
    return rankDefinition.ranks[rankNumber - 1].name;
  };

  // ランクの色を取得
  const getRankColor = (rankNumber: number): string => {
    const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1'];
    return colors[rankNumber - 1] || '#64748b';
  };

  // 名前の最初の文字を取得（アバター用）
  const getInitial = (name: string): string => {
    return name.charAt(0);
  };

  // 法人選択ハンドラー
  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOrgId = e.target.value;
    if (selectedOrgId === '') {
      onSelectOrg?.(null);
      onClearView?.();
    } else {
      const selectedOrg = organizations?.find(org => org.id === selectedOrgId);
      if (selectedOrg) {
        onSelectOrg?.(selectedOrg);
      }
    }
  };

  // 法人全体の平均スコア推移を計算（月次、期間フィルタ適用）
  const orgAverageTrend = useMemo(() => {
    // viewingOrgがnullの場合は、現在のorgを使用
    const targetOrg = viewingOrg || org;
    
    const monthlyData = new Map<string, { totalScore: number; count: number }>();
    
    filteredResponses.forEach(response => {
      const date = new Date(response.submittedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const scores = calculateScoreFromResponse(response, rankDefinition || undefined);
      const overallScore = calculateOverallScore(scores);
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { totalScore: 0, count: 0 });
      }
      const data = monthlyData.get(monthKey)!;
      data.totalScore += overallScore;
      data.count += 1;
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month: month.replace('-', '/'),
        avgScore: Math.round(data.totalScore / data.count),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [viewingOrg, org, filteredResponses, rankDefinition]);

  // 期間をリセットする関数
  const resetDateRange = () => {
    if (orgResponses.length > 0) {
      const dates = orgResponses
        .map(r => new Date(r.submittedAt))
        .sort((a, b) => a.getTime() - b.getTime());
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      const firstMonth = `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, '0')}`;
      const lastMonth = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;
      setStartDate(firstMonth);
      setEndDate(lastMonth);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">ランク推移</h2>
          <p className="text-sm sm:text-base text-slate-600">社員のAI活用レベルの変化を追跡</p>
        </div>
        {isSuperAdmin && organizations && organizations.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">法人を選択:</label>
            <select
              value={viewingOrg?.id || ''}
              onChange={handleOrgChange}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-900"
            >
              <option value="">すべての法人</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            {viewingOrg && (
              <button
                onClick={() => {
                  onSelectOrg?.(null);
                  onClearView?.();
                }}
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
              >
                クリア
              </button>
            )}
          </div>
        )}
      </div>

      {/* フィルタセクション */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        {/* 期間選択 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">分析期間の選択</h3>
            <p className="text-xs sm:text-sm text-slate-600">特定の期間に絞って分析できます</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">開始:</label>
              <input
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">終了:</label>
              <input
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-900"
              />
            </div>
            <button
              onClick={resetDateRange}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              期間をリセット
            </button>
          </div>
        </div>

        {/* 属性フィルタ */}
        {(identifyAttributeQuestions.department || identifyAttributeQuestions.position) && (
          <>
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3">属性で絞り込み</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {identifyAttributeQuestions.department && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {identifyAttributeQuestions.department.title}
                    </label>
                    <select
                      value={attributeFilters.department || ''}
                      onChange={(e) => setAttributeFilters(prev => ({
                        ...prev,
                        department: e.target.value || ''
                      }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-900"
                    >
                      <option value="">すべて</option>
                      {getAttributeOptions('department').map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                )}
                {identifyAttributeQuestions.position && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {identifyAttributeQuestions.position.title}
                    </label>
                    <select
                      value={attributeFilters.position || ''}
                      onChange={(e) => setAttributeFilters(prev => ({
                        ...prev,
                        position: e.target.value || ''
                      }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-900"
                    >
                      <option value="">すべて</option>
                      {getAttributeOptions('position').map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {(attributeFilters.department || attributeFilters.position) && (
                <button
                  onClick={() => setAttributeFilters({})}
                  className="mt-3 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  属性フィルタをクリア
                </button>
              )}
            </div>
          </>
        )}

        {/* フィルタサマリー */}
        {(startDate || endDate || attributeFilters.department || attributeFilters.position) && (
          <div className="border-t border-slate-200 pt-3">
            <p className="text-xs text-slate-600">
              表示中のデータ: 
              {startDate && endDate && (
                <span className="font-medium text-slate-800 ml-1">
                  {startDate.replace('-', '年').replace(/(\d{4})年(\d{2})/, '$1年$2月')} ～ {endDate.replace('-', '年').replace(/(\d{4})年(\d{2})/, '$1年$2月')}
                </span>
              )}
              {(attributeFilters.department || attributeFilters.position) && (
                <span className="font-medium text-slate-800 ml-1">
                  {attributeFilters.department && ` | ${identifyAttributeQuestions.department?.title}: ${attributeFilters.department}`}
                  {attributeFilters.position && ` | ${identifyAttributeQuestions.position?.title}: ${attributeFilters.position}`}
                </span>
              )}
              <span className="ml-2 text-slate-500">
                ({filteredResponses.length}件の回答データ)
              </span>
            </p>
          </div>
        )}
      </div>

      {isSuperAdmin && viewingOrg && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>{viewingOrg.name}</strong> のデータを表示中
          </p>
        </div>
      )}

      {/* ランクサマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 text-lg sm:text-xl">↑</span>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-600">ランクアップ</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{rankStats.rankUp}名</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">前期比</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="text-slate-600 text-lg sm:text-xl">—</span>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-600">維持</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{rankStats.maintain}名</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">安定した活用</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="text-red-600 text-lg sm:text-xl">↓</span>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-600">ランクダウン</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{rankStats.rankDown}名</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">要フォローアップ</p>
        </div>
      </div>

      {/* 法人全体の平均スコア推移 */}
      {orgAverageTrend.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4">
            {(viewingOrg || org).name} の全体推移（平均スコア）
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={orgAverageTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fill: '#64748b', fontSize: 12 }}
                label={{ value: '平均スコア', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value}点`, '平均スコア']}
                labelFormatter={(label) => `期間: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="avgScore" 
                stroke="#6366f1" 
                strokeWidth={3}
                activeDot={{ r: 8 }}
                name="平均スコア"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 最近のランク変動 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">最近のランク変動</h3>
          <p className="text-xs sm:text-sm text-slate-600">直近のアンケート結果に基づく変化</p>
        </div>
        
        {rankChanges.length > 0 ? (
          <div className="space-y-3">
            {rankChanges.map((change, index) => {
              const rankName = getRankName(change.currentRank);
              const rankColor = getRankColor(change.currentRank);
              
              return (
                <div
                  key={`${change.name}-${index}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: rankColor }}
                  >
                    {getInitial(change.name)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{change.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {change.changeType === 'new' && (
                      <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                        新規
                      </span>
                    )}
                    <span
                      className="px-3 py-1 text-sm font-medium text-white rounded"
                      style={{ backgroundColor: rankColor }}
                    >
                      {rankName}
                    </span>
                    <span className="text-sm text-slate-500">{change.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            ランク変動データがありません。
          </div>
        )}
      </div>

      {/* 回答者選択 */}
      {respondents.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            回答者を選択して詳細を表示
          </label>
          <div className="flex gap-2 flex-wrap">
            {respondents.map(name => (
              <button
                key={name}
                onClick={() => setSelectedRespondent(selectedRespondent === name ? null : name)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  selectedRespondent === name
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 回答者別成長率一覧 */}
      {respondentStats.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4">全回答者の成長率</h3>
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={respondentStats.sort((a, b) => b.growthRate - a.growthRate)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  label={{ value: '成長率 (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [
                    `${value}%`, 
                    '成長率',
                    `初回: ${props.payload.firstScore}点 → 最新: ${props.payload.lastScore}点 (回答数: ${props.payload.responseCount})`
                  ]}
                  labelFormatter={(label) => `回答者: ${label}`}
                />
                <Bar 
                  dataKey="growthRate" 
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                >
                  {respondentStats.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.growthRate >= 0 ? '#10b981' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 選択された回答者の詳細グラフ */}
      {selectedRespondent && respondentHistory.length > 0 && (
        <div className="space-y-6">
          {/* スコアサマリーカード */}
          {growthRate !== null && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
              <h4 className="text-md font-semibold text-slate-700 mb-4">
                {selectedRespondent} の成長サマリー
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-indigo-100">
                  <p className="text-xs text-slate-600 mb-1">初回スコア</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {respondentHistory[0].overallScore}点
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-indigo-100">
                  <p className="text-xs text-slate-600 mb-1">最新スコア</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {respondentHistory[respondentHistory.length - 1].overallScore}点
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-indigo-100">
                  <p className="text-xs text-slate-600 mb-1">成長率</p>
                  <p className={`text-2xl font-bold ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {growthRate >= 0 ? '+' : ''}{growthRate}%
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-indigo-100">
                  <p className="text-xs text-slate-600 mb-1">回答回数</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {respondentHistory.length}回
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 総合スコア推移 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h4 className="text-md font-semibold text-slate-700 mb-4">
              {selectedRespondent} の総合スコア推移
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={respondentHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  label={{ value: 'スコア', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value}点`, '総合スコア']}
                  labelFormatter={(label) => `回答日: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="overallScore" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  activeDot={{ r: 8 }}
                  name="総合スコア"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 各次元のスコア推移 */}
          {respondentHistory.length > 1 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h4 className="text-md font-semibold text-slate-700 mb-4">
                各次元のスコア推移
              </h4>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={respondentHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    label={{ value: 'スコア', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip />
                  <Legend />
                  {LITERACY_DIMENSIONS.map((dim, index) => {
                    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                    return (
                      <Line 
                        key={dim.key}
                        type="monotone" 
                        dataKey={dim.key}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        name={dim.label}
                        dot={{ r: 4 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {selectedRespondent && respondentHistory.length === 0 && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center">
          <p className="text-slate-500 text-lg">
            {selectedRespondent} の回答履歴がありません。
          </p>
        </div>
      )}

      {!selectedRespondent && respondents.length === 0 && orgResponses.length === 0 && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center">
          <p className="text-slate-500 text-lg">
            {(viewingOrg || org).name} の回答データがありません。
          </p>
          <p className="text-slate-400 text-sm mt-2">
            アンケート回答データが登録されると、ここに成長率分析が表示されます。
          </p>
        </div>
      )}

      {!selectedRespondent && respondents.length === 0 && orgResponses.length > 0 && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center">
          <p className="text-slate-500 text-lg">
            回答データを読み込んでいます...
          </p>
        </div>
      )}

      {!selectedRespondent && respondents.length > 0 && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center">
          <p className="text-slate-500 text-lg">
            上記から回答者を選択すると、詳細な成長率グラフが表示されます。
          </p>
        </div>
      )}
    </div>
  );
};

export default RespondentGrowthAnalysis;

