import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Plus,
  Trash2,
  X,
  Box,
  Layers,
  CheckCircle2,
  Lock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { InventoryNode, NodeType } from '../types';

interface BatchPhotoIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContainerId: string | null;
  currentContainerName: string;
  onSaveBatch: (newNodes: InventoryNode[]) => void;
}

interface DraftCard {
  id: string;
  photoUrl: string;
  name: string;
  type: NodeType;
  isPrivate: boolean;
  quantity: number;
  category?: string;
  color?: string;
  description?: string;
  expirationDate?: string;
}

export const BatchPhotoIntakeModal: React.FC<BatchPhotoIntakeModalProps> = ({
  isOpen,
  onClose,
  currentContainerId,
  currentContainerName,
  onSaveBatch,
}) => {
  const [draftCards, setDraftCards] = useState<DraftCard[]>([]);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysisProgress, setAiAnalysisProgress] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          const draftId = 'draft-' + Date.now() + '-' + index + '-' + Math.random().toString(36).substring(2, 6);
          setDraftCards((prev) => [
            ...prev,
            {
              id: draftId,
              photoUrl: result,
              name: `未命名物品 #${prev.length + 1}`,
              type: 'item',
              isPrivate: false,
              quantity: 1,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const updateDraft = (id: string, updates: Partial<DraftCard>) => {
    setDraftCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const removeDraft = (id: string) => {
    setDraftCards((prev) => prev.filter((c) => c.id !== id));
  };

  // Trigger Gemini AI Multi-Photo Analysis
  const handleGeminiBatchAnalyze = async () => {
    if (draftCards.length === 0 || isAiAnalyzing) return;
    setIsAiAnalyzing(true);
    setAiAnalysisProgress('Gemini 正在辨識照片中...');

    try {
      const updated = [...draftCards];
      for (let i = 0; i < updated.length; i++) {
        const card = updated[i];
        setAiAnalysisProgress(`正在辨識第 ${i + 1} / ${updated.length} 張照片...`);

        try {
          const res = await fetch('/api/gemini/analyze-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: card.photoUrl }),
          });

          const json = await res.json();
          if (json.success && json.data) {
            const data = json.data;
            let expiryStr: string | undefined = undefined;
            if (data.estimatedDaysToExpiry) {
              const d = new Date();
              d.setDate(d.getDate() + Number(data.estimatedDaysToExpiry));
              expiryStr = d.toISOString().split('T')[0];
            }

            updated[i] = {
              ...card,
              name: data.name || card.name,
              type: data.type === 'container' ? 'container' : 'item',
              category: data.category || '一般物品',
              color: data.color || '#0d9488',
              description: data.description || '',
              expirationDate: expiryStr,
            };
          }
        } catch (itemErr) {
          console.warn('Failed item Gemini analysis', itemErr);
        }
      }

      setDraftCards(updated);
      setAiAnalysisProgress('Gemini AI 辨識完成！');
    } catch (err) {
      console.error('Batch analyze error:', err);
    } finally {
      setIsAiAnalyzing(false);
      setTimeout(() => setAiAnalysisProgress(''), 3000);
    }
  };

  const handleFinish = () => {
    if (draftCards.length === 0) {
      onClose();
      return;
    }

    const now = new Date().toISOString();
    const createdNodes: InventoryNode[] = draftCards.map((draft, idx) => ({
      id: 'node-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 7),
      parentId: currentContainerId,
      type: draft.type,
      name: draft.name.trim() || (draft.type === 'container' ? '未命名收納盒' : '未命名物品'),
      isPrivate: draft.isPrivate,
      photos: [draft.photoUrl],
      quantity: draft.quantity || 1,
      unit: draft.type === 'container' ? '個' : '件',
      description: draft.description,
      expirationDate: draft.expirationDate,
      tags: draft.category
        ? [{ id: 't-gemini-' + idx, name: draft.category, color: draft.color || '#0d9488' }]
        : draft.type === 'container'
        ? [{ id: 't-box', name: '收納容器', color: '#6366f1' }]
        : [{ id: 't-new', name: '待補資料', color: '#f59e0b' }],
      lastStoredDate: new Date().toISOString().split('T')[0],
      createdAt: now,
      updatedAt: now,
    }));

    onSaveBatch(createdNodes);
    setDraftCards([]);
    onClose();
  };

  // Quick preset sample photos
  const addSamplePhotoDraft = (label: string, emoji: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f766e" />
          <stop offset="100%" stop-color="#042f2e" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" rx="20" fill="url(#g)" />
      <text x="200" y="140" font-size="72" text-anchor="middle" dominant-baseline="central">${emoji}</text>
      <rect x="50" y="210" width="300" height="50" rx="12" fill="#0f172a" opacity="0.7" />
      <text x="200" y="242" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${label}</text>
    </svg>`;
    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    setDraftCards((prev) => [
      ...prev,
      {
        id: 'draft-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        photoUrl: dataUri,
        name: label,
        type: 'item',
        isPrivate: false,
        quantity: 1,
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-teal-400" />
            快速多照片批次收納
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            收納目標位置：<span className="text-teal-300 font-semibold">{currentContainerName}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Photo Capture Triggers & Gemini AI Button */}
      <div className="p-3.5 bg-slate-900/50 border-b border-slate-800 flex flex-wrap items-center gap-2">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition"
        >
          <Camera className="w-4 h-4" />
          <span>相機拍照</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 active:scale-95 transition"
        >
          <Upload className="w-4 h-4 text-teal-400" />
          <span>多張照片</span>
        </button>

        {/* Gemini AI Auto-Recognize Button */}
        {draftCards.length > 0 && (
          <button
            onClick={handleGeminiBatchAnalyze}
            disabled={isAiAnalyzing}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-600 via-indigo-600 to-sky-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-95 active:scale-95 transition"
          >
            <Sparkles className={`w-4 h-4 text-amber-300 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
            <span>
              {isAiAnalyzing
                ? aiAnalysisProgress || 'Gemini 正在分析中...'
                : `✨ Gemini AI 一鍵智能辨識 (${draftCards.length} 張照片)`}
            </span>
          </button>
        )}
      </div>

      {/* Draft Cards Grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {draftCards.length === 0 ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-teal-400">
              <Camera className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-slate-300">尚未載入照片</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              點擊上方「拍照」或「選取照片」，可利用 <strong>Gemini AI</strong> 自動辨識物品名稱、分類並切換為容器或物件。
            </p>

            {/* Quick Demo Photo Buttons */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-xs">
              <span className="text-[11px] text-slate-500 w-full">快速體驗（加入範例照片）：</span>
              <button
                onClick={() => addSamplePhotoDraft('藍色抽屜收納盒', '📦')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-teal-400 border border-slate-700"
              >
                + 📦 藍色收納盒
              </button>
              <button
                onClick={() => addSamplePhotoDraft('抗藍光護目眼鏡', '👓')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-teal-400 border border-slate-700"
              >
                + 👓 護目眼鏡
              </button>
              <button
                onClick={() => addSamplePhotoDraft('戶外露營手電筒', '🔦')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-teal-400 border border-slate-700"
              >
                + 🔦 露營手電筒
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>已載入 <strong>{draftCards.length}</strong> 張照片（點上方按鈕可由 Gemini 自動辨識）</span>
              <button
                onClick={() => setDraftCards([])}
                className="text-rose-400 hover:text-rose-300 text-xs"
              >
                全部清除
              </button>
            </div>

            {draftCards.map((card, idx) => (
              <div
                key={card.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex gap-3 items-start shadow-md"
              >
                {/* Photo Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60 relative">
                  <img src={card.photoUrl} alt="" className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] bg-black/75 text-white font-mono">
                    #{idx + 1}
                  </span>
                </div>

                {/* Editable Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={card.name}
                      onChange={(e) => updateDraft(card.id, { name: e.target.value })}
                      placeholder="物品或容器名稱..."
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-semibold focus:outline-none focus:border-teal-500"
                    />
                    {card.category && (
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 text-white"
                        style={{ backgroundColor: card.color || '#0d9488' }}
                      >
                        {card.category}
                      </span>
                    )}
                  </div>

                  {/* Switch Container vs Item */}
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg bg-slate-800 p-0.5 text-xs">
                      <button
                        onClick={() => updateDraft(card.id, { type: 'item' })}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                          card.type === 'item'
                            ? 'bg-teal-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Box className="w-3.5 h-3.5" />
                        <span>物件</span>
                      </button>
                      <button
                        onClick={() => updateDraft(card.id, { type: 'container' })}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                          card.type === 'container'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>轉為容器 📦</span>
                      </button>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg text-xs text-slate-300">
                      <span>數量:</span>
                      <input
                        type="number"
                        min="1"
                        value={card.quantity}
                        onChange={(e) =>
                          updateDraft(card.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                        }
                        className="w-10 bg-transparent text-center text-teal-400 font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Description / Note if Gemini identified */}
                  {card.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                      ✨ {card.description}
                    </p>
                  )}

                  {/* Private toggle & delete */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
                      <input
                        type="checkbox"
                        checked={card.isPrivate}
                        onChange={(e) => updateDraft(card.id, { isPrivate: e.target.checked })}
                        className="rounded border-slate-700 text-rose-500 focus:ring-0"
                      />
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>設為私人</span>
                    </label>

                    <button
                      onClick={() => removeDraft(card.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 pb-8 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          詳細屬性可於日後隨時點選補齊。
        </span>
        <button
          onClick={handleFinish}
          disabled={draftCards.length === 0}
          className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg active:scale-95 transition"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>確認存入 ({draftCards.length})</span>
        </button>
      </div>
    </div>
  );
};
