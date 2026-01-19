import React, { useState, useEffect } from 'react';
import { Organization, RankDefinition } from '../types';
import { getRankDefinition, saveRankDefinition } from '../services/rankDefinitionService';
import RankDefinitionEditor from './RankDefinitionEditor';

interface RankDefinitionSettingsProps {
  org: Organization;
}

const RankDefinitionSettings: React.FC<RankDefinitionSettingsProps> = ({ org }) => {
  const [rankDefinition, setRankDefinition] = useState<RankDefinition | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    const currentRankDefinition = org.rankDefinition || getRankDefinition(org.id);
    setRankDefinition(currentRankDefinition);
  }, [org]);

  const handleSave = (updatedRankDefinition: RankDefinition) => {
    saveRankDefinition(updatedRankDefinition);
    setRankDefinition(updatedRankDefinition);
    setIsEditorOpen(false);
    
    // 組織データも更新（localStorageから読み込むため、実際の実装ではAPI経由で更新）
    // 現時点ではlocalStorageに保存されているので、次回読み込み時に反映される
  };

  const handleOpenEditor = () => {
    setIsEditorOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">ランク定義設定</h2>
          <p className="text-sm sm:text-base text-slate-600">AI活用レベルのランク定義をカスタマイズできます</p>
        </div>
        <button
          onClick={handleOpenEditor}
          className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
        >
          <span>✏️</span>
          ランク定義を編集
        </button>
      </div>

      {rankDefinition && (
        <div className="bg-white rounded-lg p-4 sm:p-6 border border-slate-200 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">現在のランク定義</h3>
          <div className="space-y-4">
            {rankDefinition.ranks.map((rank, index) => (
              <div key={rank.id} className="border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-sm sm:text-base text-slate-700 mb-2">{rank.name}</h4>
                <ul className="list-disc list-inside text-xs sm:text-sm text-slate-600 space-y-1 ml-4">
                  {rank.descriptions.map((desc, descIndex) => (
                    <li key={descIndex}>{desc}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">ランク定義について</h3>
        <p className="text-sm text-slate-600">
          ランク定義は、アンケートの「AI活用レベル自己評価」で使用されます。
          各ランクの名称と説明文をカスタマイズすることで、自社に適した評価基準を設定できます。
          ランク数は5段階固定です。
        </p>
      </div>

      {/* ランク定義編集モーダル */}
      {rankDefinition && (
        <RankDefinitionEditor
          orgId={org.id}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSave}
          initialRankDefinition={rankDefinition}
        />
      )}
    </div>
  );
};

export default RankDefinitionSettings;

