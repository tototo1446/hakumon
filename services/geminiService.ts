
import { GoogleGenAI } from "@google/genai";
import { LiteracyScores, SurveyResponse } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features will not work.");
}
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/** アンケート回答から集計データを抽出する */
export interface ResponseAggregation {
  totalRespondents: number;
  // AI活用頻度の分布
  usageFrequency: { daily: number; weekly: number; monthly: number; usedBefore: number; never: number };
  // 利用ツールの分布
  toolUsage: { chatgpt: number; claude: number; gemini: number; internal: number; imageGen: number; videoAudio: number; other: number };
  // 有料ツール利用状況
  paidToolStatus: { personal: number; companySubsidy: number; freeOnly: number };
  // 利用用途の分布
  useCases: { document: number; brainstorming: number; research: number; coding: number; mediaGen: number; adCopy: number; other: number };
  // 業務時間削減
  timeReduction: { lessThan5: number; fiveTo10: number; tenTo20: number; moreThan20: number; noEffect: number };
  // 今後必要なこと
  needs: { useCases: number; training: number; toolSubsidy: number; specializedSupport: number; securityRules: number; other: number };
  // ランク分布
  rankDistribution: { rank1: number; rank2: number; rank3: number; rank4: number; rank5: number };
  // 自由記述（代表的なもの）
  freeTextSamples: string[];
  feedbackSamples: string[];
}

/** アンケート回答データから集計を行う */
export function aggregateResponses(responses: SurveyResponse[]): ResponseAggregation {
  const agg: ResponseAggregation = {
    totalRespondents: responses.length,
    usageFrequency: { daily: 0, weekly: 0, monthly: 0, usedBefore: 0, never: 0 },
    toolUsage: { chatgpt: 0, claude: 0, gemini: 0, internal: 0, imageGen: 0, videoAudio: 0, other: 0 },
    paidToolStatus: { personal: 0, companySubsidy: 0, freeOnly: 0 },
    useCases: { document: 0, brainstorming: 0, research: 0, coding: 0, mediaGen: 0, adCopy: 0, other: 0 },
    timeReduction: { lessThan5: 0, fiveTo10: 0, tenTo20: 0, moreThan20: 0, noEffect: 0 },
    needs: { useCases: 0, training: 0, toolSubsidy: 0, specializedSupport: 0, securityRules: 0, other: 0 },
    rankDistribution: { rank1: 0, rank2: 0, rank3: 0, rank4: 0, rank5: 0 },
    freeTextSamples: [],
    feedbackSamples: [],
  };

  for (const response of responses) {
    for (const answer of response.answers) {
      const val = answer.value;

      // q1: AI活用の有無
      if (answer.questionId === 'q1' && typeof val === 'string') {
        const map: Record<string, keyof typeof agg.usageFrequency> = {
          daily: 'daily', weekly: 'weekly', monthly: 'monthly', used_before: 'usedBefore', never: 'never'
        };
        if (map[val]) agg.usageFrequency[map[val]]++;
      }

      // q2: 利用ツール
      if (answer.questionId === 'q2' && Array.isArray(val)) {
        const map: Record<string, keyof typeof agg.toolUsage> = {
          chatgpt: 'chatgpt', claude: 'claude', gemini: 'gemini', internal: 'internal',
          image_gen: 'imageGen', video_audio: 'videoAudio', other: 'other'
        };
        for (const v of val) {
          if (map[v]) agg.toolUsage[map[v]]++;
        }
      }

      // q3: 有料ツール
      if (answer.questionId === 'q3' && typeof val === 'string') {
        const map: Record<string, keyof typeof agg.paidToolStatus> = {
          personal: 'personal', company_subsidy: 'companySubsidy', free_only: 'freeOnly'
        };
        if (map[val]) agg.paidToolStatus[map[val]]++;
      }

      // q4: 利用用途
      if (answer.questionId === 'q4' && Array.isArray(val)) {
        const map: Record<string, keyof typeof agg.useCases> = {
          document: 'document', brainstorming: 'brainstorming', research: 'research',
          coding: 'coding', media_gen: 'mediaGen', ad_copy: 'adCopy', other: 'other'
        };
        for (const v of val) {
          if (map[v]) agg.useCases[map[v]]++;
        }
      }

      // q5: 具体的な使用用途（自由記述）
      if (answer.questionId === 'q5' && typeof val === 'string' && val.trim()) {
        if (agg.freeTextSamples.length < 5) {
          agg.freeTextSamples.push(val.trim().slice(0, 200));
        }
      }

      // q6: 業務時間削減
      if (answer.questionId === 'q6' && typeof val === 'string') {
        const map: Record<string, keyof typeof agg.timeReduction> = {
          less_than_5: 'lessThan5', '5_to_10': 'fiveTo10', '10_to_20': 'tenTo20',
          more_than_20: 'moreThan20', no_effect: 'noEffect'
        };
        if (map[val]) agg.timeReduction[map[val]]++;
      }

      // q7: 今後必要なこと
      if (answer.questionId === 'q7' && Array.isArray(val)) {
        const map: Record<string, keyof typeof agg.needs> = {
          use_cases: 'useCases', training: 'training', tool_subsidy: 'toolSubsidy',
          specialized_support: 'specializedSupport', security_rules: 'securityRules', other: 'other'
        };
        for (const v of val) {
          if (map[v]) agg.needs[map[v]]++;
        }
      }

      // q8: ランク自己評価
      if (answer.type === 'rank' && typeof val === 'string') {
        const rankKey = val as keyof typeof agg.rankDistribution;
        if (agg.rankDistribution[rankKey] !== undefined) {
          agg.rankDistribution[rankKey]++;
        }
      }

      // q9: フィードバック
      if (answer.questionId === 'q9' && typeof val === 'string' && val.trim()) {
        if (agg.feedbackSamples.length < 5) {
          agg.feedbackSamples.push(val.trim().slice(0, 200));
        }
      }
    }
  }

  return agg;
}

/** 集計データから読みやすいテキストを生成 */
function buildAggregationContext(agg: ResponseAggregation): string {
  const n = agg.totalRespondents;
  if (n === 0) return '';

  const pct = (count: number) => `${count}名 (${Math.round(count / n * 100)}%)`;

  const sections: string[] = [];

  // AI活用頻度
  const freq = agg.usageFrequency;
  const freqTotal = freq.daily + freq.weekly + freq.monthly + freq.usedBefore + freq.never;
  if (freqTotal > 0) {
    sections.push(`【AI活用頻度】
- ほぼ毎日: ${pct(freq.daily)}
- 週に数回: ${pct(freq.weekly)}
- 月に数回: ${pct(freq.monthly)}
- 過去に使用: ${pct(freq.usedBefore)}
- 未使用: ${pct(freq.never)}`);
  }

  // 利用ツール
  const tools = agg.toolUsage;
  const toolEntries = [
    ['ChatGPT', tools.chatgpt], ['Claude', tools.claude], ['Gemini', tools.gemini],
    ['社内AI', tools.internal], ['画像生成AI', tools.imageGen], ['動画/音声AI', tools.videoAudio]
  ].filter(([, count]) => (count as number) > 0) as [string, number][];
  if (toolEntries.length > 0) {
    sections.push(`【利用ツール（複数回答）】\n${toolEntries.map(([name, count]) => `- ${name}: ${pct(count)}`).join('\n')}`);
  }

  // 有料ツール
  const paid = agg.paidToolStatus;
  const paidTotal = paid.personal + paid.companySubsidy + paid.freeOnly;
  if (paidTotal > 0) {
    sections.push(`【有料ツール利用状況】
- 個人契約: ${pct(paid.personal)}
- 会社補助: ${pct(paid.companySubsidy)}
- 無料版のみ: ${pct(paid.freeOnly)}`);
  }

  // 利用用途
  const use = agg.useCases;
  const useEntries = [
    ['文章・資料作成', use.document], ['アイデア出し', use.brainstorming],
    ['リサーチ・分析', use.research], ['コーディング', use.coding],
    ['メディア生成', use.mediaGen], ['広告文作成', use.adCopy]
  ].filter(([, count]) => (count as number) > 0) as [string, number][];
  if (useEntries.length > 0) {
    sections.push(`【利用用途（複数回答）】\n${useEntries.map(([name, count]) => `- ${name}: ${pct(count)}`).join('\n')}`);
  }

  // 業務時間削減
  const time = agg.timeReduction;
  const timeTotal = time.lessThan5 + time.fiveTo10 + time.tenTo20 + time.moreThan20 + time.noEffect;
  if (timeTotal > 0) {
    sections.push(`【週あたり業務時間削減効果】
- 5時間未満: ${pct(time.lessThan5)}
- 5〜10時間: ${pct(time.fiveTo10)}
- 10〜20時間: ${pct(time.tenTo20)}
- 20時間以上: ${pct(time.moreThan20)}
- 効果なし: ${pct(time.noEffect)}`);
  }

  // 今後必要なこと
  const needs = agg.needs;
  const needEntries = [
    ['活用事例・テンプレート', needs.useCases], ['勉強会・研修', needs.training],
    ['有料ツール補助', needs.toolSubsidy], ['専門部署サポート', needs.specializedSupport],
    ['セキュリティ・ルール整備', needs.securityRules]
  ].filter(([, count]) => (count as number) > 0) as [string, number][];
  if (needEntries.length > 0) {
    sections.push(`【今後必要なこと（複数回答）】\n${needEntries.map(([name, count]) => `- ${name}: ${pct(count)}`).join('\n')}`);
  }

  // ランク分布
  const rank = agg.rankDistribution;
  const rankTotal = rank.rank1 + rank.rank2 + rank.rank3 + rank.rank4 + rank.rank5;
  if (rankTotal > 0) {
    sections.push(`【AI活用レベル自己評価の分布】
- ランク1（ビギナー）: ${pct(rank.rank1)}
- ランク2（ベーシック）: ${pct(rank.rank2)}
- ランク3（プラクティス）: ${pct(rank.rank3)}
- ランク4（アドバンス）: ${pct(rank.rank4)}
- ランク5（エキスパート）: ${pct(rank.rank5)}`);
  }

  // 自由記述サンプル
  if (agg.freeTextSamples.length > 0) {
    sections.push(`【具体的な活用方法（抜粋）】\n${agg.freeTextSamples.map(t => `- 「${t}」`).join('\n')}`);
  }

  // フィードバック
  if (agg.feedbackSamples.length > 0) {
    sections.push(`【社員からのフィードバック・要望（抜粋）】\n${agg.feedbackSamples.map(t => `- 「${t}」`).join('\n')}`);
  }

  return sections.join('\n\n');
}

export async function getLiteracyInsight(
  scores: LiteracyScores,
  name: string,
  aggregation?: ResponseAggregation
) {
  if (!ai) {
    return "AI機能を使用するには、APIキーを環境変数に設定してください。";
  }

  const overallScore = Math.round(
    (scores.basics + scores.prompting + scores.ethics + scores.tools + scores.automation) / 5
  );

  // ランクレベルの判定
  let rankLabel = 'ビギナー';
  if (overallScore >= 80) rankLabel = 'エキスパート';
  else if (overallScore >= 60) rankLabel = 'アドバンス';
  else if (overallScore >= 40) rankLabel = 'プラクティス';
  else if (overallScore >= 20) rankLabel = 'ベーシック';

  const aggregationContext = aggregation ? buildAggregationContext(aggregation) : '';

  const prompt = `あなたは企業のAI活用推進コンサルタントです。以下のデータに基づき、「${name}」への戦略的アドバイスを生成してください。

■ 総合スコア: ${overallScore}/100（${rankLabel}レベル）

■ 5次元スコア（各100点満点）:
- 基礎知識: ${scores.basics}
- プロンプト工学: ${scores.prompting}
- 倫理・リスク: ${scores.ethics}
- ツール選定: ${scores.tools}
- 自動化/活用: ${scores.automation}
${aggregationContext ? `\n■ アンケート回答の集計データ（回答者数: ${aggregation!.totalRespondents}名）:\n${aggregationContext}` : ''}

**必ずMarkdown形式で出力してください。** 見出しは ##、箇条書きは -、強調は ** を使用してください。

以下のセクション構成で、具体的かつ実用的なアドバイスを出力してください:

## 現状分析
${aggregation ? '回答データから見える組織のAI活用の現状を3〜4行で分析。活用頻度、ツール利用傾向、用途の偏りなどに言及。' : 'スコアから見える現状を2〜3行で分析。'}

## 強み
具体的な強みを2〜3点、箇条書きで。${aggregation ? 'データの裏付けを添えて。' : ''}

## 課題
改善が必要な点を2〜3点、箇条書きで。${aggregation ? 'データの裏付けを添えて。' : ''}

## 推奨アクションプラン
優先度の高い順に3〜5つの具体的なアクションを提案。${aggregation ? '社員の声（フィードバック）やニーズも考慮し、' : ''}実行可能で具体的な内容にしてください。各アクションは「何を」「どのように」「期待される効果」を含めてください。
${aggregation ? `
## 注目ポイント
データから読み取れる特に注目すべき傾向やリスク、差別化のチャンスを1〜2点。` : ''}

※ 各セクションは簡潔に。全体で600文字程度を目安にしてください。
※ 出力は必ずMarkdown形式のみとし、コードブロック・AIであることの説明・免責事項・補足説明は含めないでください。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("AI分析エラー:", error);
    return "AIアドバイスの生成中にエラーが発生しました。";
  }
}
