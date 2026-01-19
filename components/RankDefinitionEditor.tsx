import React, { useState, useEffect } from 'react';
import { RankDefinition, RankItem } from '../types';
import { saveRankDefinition, DEFAULT_RANK_DEFINITION } from '../services/rankDefinitionService';

interface RankDefinitionEditorProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (rankDefinition: RankDefinition) => void;
  initialRankDefinition?: RankDefinition | null;
}

const RankDefinitionEditor: React.FC<RankDefinitionEditorProps> = ({
  orgId,
  isOpen,
  onClose,
  onSave,
  initialRankDefinition,
}) => {
  const [rankDefinition, setRankDefinition] = useState<RankDefinition>({
    orgId,
    ranks: DEFAULT_RANK_DEFINITION,
  });

  useEffect(() => {
    if (initialRankDefinition) {
      setRankDefinition(initialRankDefinition);
    } else {
      setRankDefinition({
        orgId,
        ranks: DEFAULT_RANK_DEFINITION,
      });
    }
  }, [initialRankDefinition, orgId, isOpen]);

  const handleRankNameChange = (rankId: string, name: string) => {
    setRankDefinition(prev => ({
      ...prev,
      ranks: prev.ranks.map(rank =>
        rank.id === rankId ? { ...rank, name } : rank
      ),
    }));
  };

  const handleDescriptionChange = (rankId: string, index: number, value: string) => {
    setRankDefinition(prev => ({
      ...prev,
      ranks: prev.ranks.map(rank =>
        rank.id === rankId
          ? {
              ...rank,
              descriptions: rank.descriptions.map((desc, i) => (i === index ? value : desc)),
            }
          : rank
      ),
    }));
  };

  const handleAddDescription = (rankId: string) => {
    setRankDefinition(prev => ({
      ...prev,
      ranks: prev.ranks.map(rank =>
        rank.id === rankId
          ? {
              ...rank,
              descriptions: [...rank.descriptions, ''],
            }
          : rank
      ),
    }));
  };

  const handleDeleteDescription = (rankId: string, index: number) => {
    setRankDefinition(prev => ({
      ...prev,
      ranks: prev.ranks.map(rank =>
        rank.id === rankId
          ? {
              ...rank,
              descriptions: rank.descriptions.filter((_, i) => i !== index),
            }
          : rank
      ),
    }));
  };

  const handleSave = () => {
    saveRankDefinition(rankDefinition);
    onSave(rankDefinition);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-slate-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">ランク定義の編集</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {rankDefinition.ranks.map((rank, rankIndex) => (
                <div key={rank.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ランク{rankIndex + 1} 名称
                    </label>
                    <input
                      type="text"
                      value={rank.name}
                      onChange={(e) => handleRankNameChange(rank.id, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                      placeholder="例: ランク1（ビギナー）"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">
                        説明文
                      </label>
                      <button
                        type="button"
                        onClick={() => handleAddDescription(rank.id)}
                        className="text-xs px-2 py-1 bg-sky-50 text-sky-500 rounded hover:bg-sky-100 transition-colors"
                      >
                        + 説明を追加
                      </button>
                    </div>
                    <div className="space-y-2">
                      {rank.descriptions.map((description, descIndex) => (
                        <div key={descIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={description}
                            onChange={(e) =>
                              handleDescriptionChange(rank.id, descIndex, e.target.value)
                            }
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none text-sm"
                            placeholder="説明文を入力"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteDescription(rank.id, descIndex)}
                            className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankDefinitionEditor;

