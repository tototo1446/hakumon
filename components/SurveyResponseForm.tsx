import React, { useState, useEffect } from 'react';
import { Survey, SurveyResponse, Answer, Question } from '../types';
import { saveResponse } from '../services/surveyResponseService';
import { calculateScoreFromResponse, calculateOverallScore } from '../services/literacyScoreService';
import { getRankDefinition } from '../services/rankDefinitionService';

interface SurveyResponseFormProps {
  survey: Survey;
  orgId: string;
  onSubmit: (response: SurveyResponse) => void;
  onCancel?: () => void;
}

const SurveyResponseForm: React.FC<SurveyResponseFormProps> = ({
  survey,
  orgId,
  onSubmit,
  onCancel,
}) => {
  const [answers, setAnswers] = useState<{ [questionId: string]: string | string[] }>({});
  const [respondentName, setRespondentName] = useState<string>('');
  const [errors, setErrors] = useState<{ [questionId: string]: string }>({});

  // 名前質問を探して初期値を設定
  useEffect(() => {
    const nameQuestion = survey.questions.find(q => q.id === 'q-name-default');
    if (nameQuestion && answers[nameQuestion.id]) {
      setRespondentName(answers[nameQuestion.id] as string);
    }
  }, [survey.questions, answers]);

  const handleAnswerChange = (questionId: string, value: string | string[], questionType: string) => {
    if (questionId === 'q-name-default') {
      setRespondentName(value as string);
    }

    if (questionType === 'checkbox') {
      const currentValues = (answers[questionId] as string[]) || [];
      const valueStr = value as string;
      if (currentValues.includes(valueStr)) {
        setAnswers({
          ...answers,
          [questionId]: currentValues.filter(v => v !== valueStr),
        });
      } else {
        setAnswers({
          ...answers,
          [questionId]: [...currentValues, valueStr],
        });
      }
    } else {
      setAnswers({
        ...answers,
        [questionId]: value,
      });
    }

    // エラーをクリア
    if (errors[questionId]) {
      setErrors({ ...errors, [questionId]: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [questionId: string]: string } = {};

    survey.questions.forEach(question => {
      if (question.required) {
        const answer = answers[question.id];
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          newErrors[question.id] = 'この項目は必須です';
        }
      }
    });

    // 名前は必須
    if (!respondentName.trim()) {
      const nameQuestion = survey.questions.find(q => q.id === 'q-name-default');
      if (nameQuestion) {
        newErrors[nameQuestion.id] = '名前を入力してください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!respondentName.trim()) {
      alert('名前を入力してください。');
      return;
    }

    const responseAnswers: Answer[] = survey.questions
      .filter(q => answers[q.id] !== undefined)
      .map(question => ({
        questionId: question.id,
        value: answers[question.id],
        type: question.type,
      }));

    // リテラシースコアと業務削減時間を計算
    const rankDefinition = getRankDefinition(orgId);
    const literacyScores = calculateScoreFromResponse(
      {
        id: `temp-${Date.now()}`,
        surveyId: survey.id,
        respondentName: respondentName.trim(),
        orgId,
        answers: responseAnswers,
        submittedAt: new Date().toISOString(),
      },
      rankDefinition
    );
    const overallScore = calculateOverallScore(literacyScores);

    // 業務削減時間を計算（q6の回答から）
    const timeReductionAnswer = responseAnswers.find(a => a.questionId === 'q6' && a.type === 'radio');
    let timeReductionHours = 0;
    if (timeReductionAnswer && typeof timeReductionAnswer.value === 'string') {
      switch (timeReductionAnswer.value) {
        case 'less_than_5':
          timeReductionHours = 2.5;
          break;
        case '5_to_10':
          timeReductionHours = 7.5;
          break;
        case '10_to_20':
          timeReductionHours = 15;
          break;
        case 'more_than_20':
          timeReductionHours = 25;
          break;
        case 'no_effect':
          timeReductionHours = 0;
          break;
      }
    }

    const response: SurveyResponse = {
      id: `response-${Date.now()}`,
      surveyId: survey.id,
      respondentName: respondentName.trim(),
      orgId,
      answers: responseAnswers,
      submittedAt: new Date().toISOString(),
      literacyScore: overallScore,
      timeReductionHours: timeReductionHours,
    };

    saveResponse(response);
    onSubmit(response);
  };

  const renderQuestionInput = (question: Question) => {
    const answer = answers[question.id];
    const error = errors[question.id];

    switch (question.type) {
      case 'radio':
        return (
          <div className="space-y-2">
            {question.options?.map(option => (
              <label key={option.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={answer === option.value}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                  className="text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-700">{option.label}</span>
              </label>
            ))}
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );

      case 'checkbox':
        const checkedValues = (answer as string[]) || [];
        return (
          <div className="space-y-2">
            {question.options?.map(option => (
              <label key={option.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={checkedValues.includes(option.value)}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                  className="text-sky-500 focus:ring-sky-500 rounded"
                />
                <span className="text-sm text-slate-700">{option.label}</span>
              </label>
            ))}
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );

      case 'text':
        return (
          <div>
            <input
              type="text"
              value={(answer as string) || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
              placeholder={question.placeholder || '短文回答'}
              maxLength={question.maxLength}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div>
            <textarea
              value={(answer as string) || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
              placeholder={question.placeholder || '長文回答'}
              rows={4}
              maxLength={question.maxLength}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none resize-none"
            />
            {question.maxLength && (
              <p className="text-xs text-slate-500 mt-1">
                {(answer as string)?.length || 0} / {question.maxLength} 文字
              </p>
            )}
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );

      case 'rank':
        return (
          <div className="space-y-3">
            {question.options?.map(option => {
              const rankDescriptions = question.rankDescriptions?.[option.value] || [];
              return (
                <div key={option.id} className="p-3 bg-slate-50 rounded border border-slate-200">
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name={question.id}
                      value={option.value}
                      checked={answer === option.value}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                      className="text-sky-500 focus:ring-sky-500"
                    />
                    <span className="font-medium text-sm text-slate-700">{option.label}</span>
                  </label>
                  {rankDescriptions.length > 0 && (
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 ml-6">
                      {rankDescriptions.map((desc, idx) => (
                        <li key={idx}>{desc}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* アンケートヘッダー */}
        <div className="bg-sky-500 rounded-t-lg p-4 sm:p-6 text-white">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">{survey.title}</h2>
          {survey.description && (
            <p className="text-sm sm:text-base text-sky-100">{survey.description}</p>
          )}
        </div>

        {/* 質問一覧 */}
        <div className="space-y-6">
          {(() => {
            // 名前質問を最初に配置
            const sortedQuestions = [...survey.questions].sort((a, b) => {
              if (a.id === 'q-name-default') return -1;
              if (b.id === 'q-name-default') return 1;
              return 0;
            });
            return sortedQuestions;
          })().map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg border-2 border-slate-200 p-4 sm:p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {index + 1}. {question.title}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderQuestionInput(question)}
              </div>
            </div>
          ))}
        </div>

        {/* 送信ボタン */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-6 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
          )}
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-medium"
          >
            送信する
          </button>
        </div>
      </form>
    </div>
  );
};

export default SurveyResponseForm;

