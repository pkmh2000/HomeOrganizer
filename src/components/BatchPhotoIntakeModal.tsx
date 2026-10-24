import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Inbox,
  Loader2,
  CheckSquare,
  Square,
  FolderTree,
  ChevronDown,
  Info,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { InventoryNode, NodeType, StorageSpace, StagingDraftCard } from '../types';
import { saveGalleryPhoto, loadStagingDrafts, saveStagingDrafts, clearStagingDrafts } from '../utils/storage';
import { compressImageFile } from '../utils/imageCompressor';

export interface BatchPhotoIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContainerId: string | null;
  currentContainerName: string;
  allNodes: InventoryNode[];
  spaces?: StorageSpace[];
  activeSpaceId?: string;
  onSaveBatch: (
    newNodes: InventoryNode[],
    targetDestinationId: string | null | 'inbox'
  ) => void;
  onStagingCountChange?: (count: number) => void;
}

export const BatchPhotoIntakeModal: React.FC<BatchPhotoIntakeModalProps> = ({
  isOpen,
  onClose,
  currentContainerId,
  currentContainerName,
  allNodes,
  spaces = [],
  activeSpaceId,
  onSaveBatch,
  onStagingCountChange,
}) => {
  // Staging Draft Cards (persistent in localStorage)
  const [draftCards, setDraftCards] = useState<StagingDraftCard[]>(() => loadStagingDrafts());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Destination Target: 'inbox' (default), 'current', 'root', or a container node ID
  const [targetDestination, setTargetDestination] = useState<string>('inbox');

  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysisProgress, setAiAnalysisProgress] = useState('');
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Load drafts on initial open if state was empty
  useEffect(() => {
    if (isOpen) {
      const stored = loadStagingDrafts();
      setDraftCards(stored);
      // Auto-select all existing drafts
      setSelectedIds(new Set(stored.map((c) => c.id)));
      if (onStagingCountChange) {
        onStagingCountChange(stored.length);
      }
    }
  }, [isOpen]);

  // Persist draft cards to localStorage whenever they change (Real-time updates)
  useEffect(() => {
    saveStagingDrafts(draftCards);
    if (onStagingCountChange) {
      onStagingCountChange(draftCards.length);
    }
  }, [draftCards, onStagingCountChange]);

  // Build hierarchical container tree for destination picker
  const containerOptions = useMemo(() => {
    const containers = allNodes.filter((n) => n.type === 'container');
    const result: { id: string; name: string; depth: number }[] = [];

    const buildTree = (parentId: string | null, depth: number) => {
      const children = containers.filter((c) => c.parentId === parentId);
      children.forEach((child) => {
        result.push({
          id: child.id,
          name: child.name,
          depth,
        });
        buildTree(child.id, depth + 1);
      });
    };

    buildTree(null, 0);
    return result;
  }, [allNodes]);

  if (!isOpen) return null;

  // Handle incoming camera or gallery photos
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingPhotos(true);
    setFeedbackMsg(null);

    try {
      const fileArray = Array.from(files);
      const newDrafts: StagingDraftCard[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
          // Compress high-res mobile photos to prevent exceeding browser localStorage quota
          const compressed = await compressImageFile(file, {
            maxWidth: 1080,
            maxHeight: 1080,
            quality: 0.82,
          });

          const draftId = 'draft-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substring(2, 6);
          newDrafts.push({
            id: draftId,
            photoUrl: compressed,
            name: `拍照物件 #${draftCards.length + newDrafts.length + 1}`,
            type: 'item',
            isPrivate: false,
            quantity: 1,
            createdAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Error compressing camera photo:', err);
        }
      }

      if (newDrafts.length > 0) {
        setDraftCards((prev) => [...prev, ...newDrafts]);
        // Auto-select newly added photos
        setSelectedIds((prev) => {
          const next = new Set(prev);
          newDrafts.forEach((d) => next.add(d.id));
          return next;
        });
        setFeedbackMsg(`📸 已新增 ${newDrafts.length} 張照片至拍照暫存區！`);
      }
    } finally {
      setIsProcessingPhotos(false);
    }
  };

  // Real-time Card Updating (Requirement 4: 拍照暫存區 內編輯的各物件內容為即時變更)
  const updateDraft = (id: string, updates: Partial<StagingDraftCard>) => {
    setDraftCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const removeDraft = (id: string) => {
    setDraftCards((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleClearAllStaging = () => {
    if (draftCards.length === 0) return;
    if (window.confirm('確定要清空拍照暫存區的所有未存入照片嗎？')) {
      setDraftCards([]);
      setSelectedIds(new Set());
      clearStagingDrafts();
      setFeedbackMsg('拍照暫存區已清空');
    }
  };

  // Selection toggles
  const toggleSelectCard = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === draftCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(draftCards.map((c) => c.id)));
    }
  };

  // Trigger Gemini AI Multi-Photo Analysis on selected or all cards
  const handleGeminiBatchAnalyze = async () => {
    const targetCards = draftCards.filter((c) =>
      selectedIds.size > 0 ? selectedIds.has(c.id) : true
    );

    if (targetCards.length === 0 || isAiAnalyzing) return;
    setIsAiAnalyzing(true);
    setAiAnalysisProgress('Gemini 正在辨識照片中...');

    try {
      const cardMap = new Map<string, StagingDraftCard>(draftCards.map((c) => [c.id, c]));

      for (let i = 0; i < targetCards.length; i++) {
        const card = targetCards[i];
        setAiAnalysisProgress(`正在辨識第 ${i + 1} / ${targetCards.length} 張照片...`);

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

            const current = cardMap.get(card.id);
            if (current) {
              cardMap.set(card.id, {
                ...current,
                name: data.name || current.name,
                type: data.type === 'container' ? 'container' : 'item',
                category: data.category || '一般物品',
                color: data.color || '#0d9488',
                description: data.description || '',
                expirationDate: expiryStr,
              });
            }
          }
        } catch (itemErr) {
          console.warn('Failed item Gemini analysis', itemErr);
        }
      }

      setDraftCards(Array.from(cardMap.values()));
      setAiAnalysisProgress('✨ Gemini AI 辨識完成！');
    } catch (err) {
      console.error('Batch analyze error:', err);
    } finally {
      setIsAiAnalyzing(false);
      setTimeout(() => setAiAnalysisProgress(''), 3000);
    }
  };

  // Requirement 1 & 2: 儲存目的地可選，按 "確定存入" 才依所選存入儲存目的地，未選取者保留在暫存區
  const handleDepositSelected = () => {
    const selectedCards = draftCards.filter((c) => selectedIds.has(c.id));
    if (selectedCards.length === 0) return;

    const now = new Date().toISOString();

    // Persist photos into gallery library
    selectedCards.forEach((draft) => {
      if (draft.photoUrl) {
        saveGalleryPhoto({
          id: 'gal-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          dataUrl: draft.photoUrl,
          title: draft.name || '相機拍照照片',
          createdAt: now,
          isPrivate: draft.isPrivate,
        });
      }
    });

    // Determine target parent container ID and archived state
    let targetParentId: string | null = null;
    let isArchived = true;

    if (targetDestination === 'inbox') {
      targetParentId = null;
      isArchived = false; // placed in unfiled inbox
    } else if (targetDestination === 'current') {
      targetParentId = currentContainerId;
      isArchived = true;
    } else if (targetDestination === 'root') {
      targetParentId = null;
      isArchived = true;
    } else {
      // Specific container node ID
      targetParentId = targetDestination;
      isArchived = true;
    }

    const createdNodes: InventoryNode[] = selectedCards.map((draft, idx) => ({
      id: 'node-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 7),
      parentId: targetParentId,
      type: draft.type,
      name: draft.name.trim() || (draft.type === 'container' ? '未命名收納盒' : '未命名物品'),
      isPrivate: draft.isPrivate,
      isArchived: isArchived,
      photos: draft.photoUrl ? [draft.photoUrl] : [],
      quantity: draft.quantity || 1,
      unit: draft.type === 'container' ? '個' : '件',
      description: draft.description,
      expirationDate: draft.expirationDate,
      tags: draft.category
        ? [{ id: 't-gemini-' + idx, name: draft.category, color: draft.color || '#0d9488' }]
        : draft.type === 'container'
        ? [{ id: 't-box', name: '收納容器', color: '#6366f1' }]
        : [{ id: 't-new', name: '待歸檔', color: '#f59e0b' }],
      lastStoredDate: new Date().toISOString().split('T')[0],
      createdAt: now,
      updatedAt: now,
    }));

    // Commit only selected nodes
    onSaveBatch(createdNodes, targetDestination);

    // Remove only the deposited cards from staging buffer, keeping remaining cards
    const remainingCards = draftCards.filter((c) => !selectedIds.has(c.id));
    setDraftCards(remainingCards);
    setSelectedIds(new Set(remainingCards.map((c) => c.id)));

    // Provide friendly status update
    const targetLabel =
      targetDestination === 'inbox'
        ? '未歸檔收件匣'
        : targetDestination === 'current'
        ? currentContainerName
        : targetDestination === 'root'
        ? '全家總覽 (頂層)'
        : allNodes.find((n) => n.id === targetDestination)?.name || '指定容器';

    if (remainingCards.length > 0) {
      setFeedbackMsg(`✅ 已成功存入 ${selectedCards.length} 項至「${targetLabel}」！暫存區尚保留 ${remainingCards.length} 項。`);
    } else {
      setFeedbackMsg(`🎉 已全數存入 ${selectedCards.length} 項至「${targetLabel}」！`);
      setTimeout(() => {
        onClose();
      }, 700);
    }
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

    const newId = 'draft-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newDraft: StagingDraftCard = {
      id: newId,
      photoUrl: dataUri,
      name: label,
      type: 'item',
      isPrivate: false,
      quantity: 1,
      createdAt: new Date().toISOString(),
    };

    setDraftCards((prev) => [...prev, newDraft]);
    setSelectedIds((prev) => new Set([...prev, newId]));
  };

  // Get current target label
  const destinationTitle = useMemo(() => {
    if (targetDestination === 'inbox') return '📥 未歸檔收件匣';
    if (targetDestination === 'current') return `📦 ${currentContainerName}`;
    if (targetDestination === 'root') return '🏠 全家總覽空間 (頂層)';
    const found = allNodes.find((n) => n.id === targetDestination);
    return found ? `📦 ${found.name}` : '自選目的地容器';
  }, [targetDestination, currentContainerName, allNodes]);

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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>拍照暫存區</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono">
                  暫存保留 {draftCards.length} 項
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                可連續拍照保留暫存，多選/單選後一鍵存入指定目的地
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {draftCards.length > 0 && (
            <button
              onClick={handleClearAllStaging}
              className="text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 transition"
              title="清空拍照暫存區"
            >
              清空暫存
            </button>
          )}
          <button
            onClick={onClose}
            title="關閉 (暫存照片將安全保留)"
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 儲存目的地可選區塊 (Requirements 1 & 2) */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <Layers className="w-4 h-4 text-teal-400" />
            <span>儲存目的地：</span>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setTargetDestination('inbox')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                targetDestination === 'inbox'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>📥 未歸檔收件匣 (預設)</span>
            </button>

            {currentContainerId && (
              <button
                type="button"
                onClick={() => setTargetDestination('current')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  targetDestination === 'current'
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>📍 當前: {currentContainerName}</span>
              </button>
            )}
          </div>
        </div>

        {/* Full Hierarchical Destination Dropdown (空間 / 容器 / 隔層可選) */}
        <div className="relative">
          <select
            value={targetDestination}
            onChange={(e) => setTargetDestination(e.target.value)}
            className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-medium focus:outline-none focus:border-teal-500 transition appearance-none cursor-pointer"
          >
            <option value="inbox">📥 未歸檔收件匣 (先集中存放，待日後細部歸檔)</option>
            {currentContainerId && (
              <option value="current">📍 當前所在容器：{currentContainerName}</option>
            )}
            <option value="root">🏠 全家總覽空間 (頂層獨立容器/物件)</option>
            {containerOptions.length > 0 && (
              <optgroup label="── 選擇空間隔層與收納容器 ──">
                {containerOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {'\u00A0'.repeat(opt.depth * 3)}
                    {opt.depth > 0 ? '└ 🗄️ ' : '📦 '}
                    {opt.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Status & Feedback Toast Banner */}
      {feedbackMsg && (
        <div className="bg-teal-950/90 border-b border-teal-500/40 px-4 py-2 text-xs text-teal-200 flex items-center justify-between animate-in fade-in">
          <span>{feedbackMsg}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-teal-400 hover:text-teal-200 text-xs ml-2 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Photo Compression Loading Banner */}
      {isProcessingPhotos && (
        <div className="bg-sky-950/90 border-b border-sky-500/40 px-4 py-2 text-xs text-sky-200 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          <span>正在壓縮處理相機照片並優化儲存體積...</span>
        </div>
      )}

      {/* Continuous Photo Triggers & Multi-Selection Action Bar */}
      <div className="p-3.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center gap-2">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition"
        >
          <Camera className="w-4 h-4" />
          <span>連續拍照輸入</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 active:scale-95 transition"
        >
          <Upload className="w-4 h-4 text-teal-400" />
          <span>選取照片檔案</span>
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
                : `✨ Gemini AI 智能辨識 (${selectedIds.size > 0 ? `已選 ${selectedIds.size} 張` : `全部 ${draftCards.length} 張`})`}
            </span>
          </button>
        )}
      </div>

      {/* Staging Selection Tools */}
      {draftCards.length > 0 && (
        <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300 font-semibold transition"
            >
              {selectedIds.size === draftCards.length ? (
                <CheckSquare className="w-4 h-4 text-teal-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>
                {selectedIds.size === draftCards.length ? '取消全選' : '全選全部'}
              </span>
            </button>
            <span>
              已選取 <strong className="text-teal-300 font-bold">{selectedIds.size}</strong> / {draftCards.length} 項
            </span>
          </div>

          <span className="text-[11px] text-slate-500 hidden sm:inline">
            💡 暫存區資料關閉後自動保存，下次進入依然保留
          </span>
        </div>
      )}

      {/* Staging Draft Cards List (Real-time updates) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {draftCards.length === 0 ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-teal-400 shadow-inner">
              <Camera className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-slate-200">拍照暫存區目前為空</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
              點選上方「連續拍照輸入」或「選取照片檔案」。在此暫存區可連續拍照、自由編輯名稱與類型，<strong>不會隨意遺失</strong>。隨時可勾選單一或多項，點選下方「確認存入」放入指定目的地。
            </p>

            {/* Quick Demo Sample Buttons */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-xs">
              <span className="text-[11px] text-slate-500 w-full font-medium">快速載入範例體驗：</span>
              <button
                onClick={() => addSamplePhotoDraft('客廳電視遙控器', '📺')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-teal-400 border border-slate-700"
              >
                + 📺 電視遙控器
              </button>
              <button
                onClick={() => addSamplePhotoDraft('抗藍光護目眼鏡', '👓')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-teal-400 border border-slate-700"
              >
                + 👓 護目眼鏡
              </button>
              <button
                onClick={() => addSamplePhotoDraft('電視櫃第二層收納隔盒', '📦')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-teal-400 border border-slate-700"
              >
                + 📦 收納隔盒
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {draftCards.map((card, idx) => {
              const isSelected = selectedIds.has(card.id);
              return (
                <div
                  key={card.id}
                  className={`p-3.5 rounded-2xl border transition-all flex gap-3 items-start shadow-md ${
                    isSelected
                      ? 'bg-slate-900/95 border-teal-500/60 ring-1 ring-teal-500/40'
                      : 'bg-slate-900/50 border-slate-800 opacity-75'
                  }`}
                >
                  {/* Select Checkbox & Thumbnail */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleSelectCard(card.id)}
                      className="p-1 rounded-lg hover:bg-slate-800 transition"
                      title={isSelected ? '取消勾選' : '勾選此項'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-teal-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600" />
                      )}
                    </button>

                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60 relative">
                      <img src={card.photoUrl} alt="" className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] bg-black/75 text-white font-mono">
                        #{idx + 1}
                      </span>
                    </div>
                  </div>

                  {/* Editable Details (Real-time updates) */}
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex rounded-lg bg-slate-800 p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => updateDraft(card.id, { type: 'item' })}
                          className={`flex items-center gap-1 px-2 py-0.8 rounded-md transition ${
                            card.type === 'item'
                              ? 'bg-teal-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Box className="w-3.5 h-3.5" />
                          <span>物件</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDraft(card.id, { type: 'container' })}
                          className={`flex items-center gap-1 px-2 py-0.8 rounded-md transition ${
                            card.type === 'container'
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>轉為隔層/容器 📦</span>
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
                            updateDraft(card.id, {
                              quantity: Math.max(1, parseInt(e.target.value) || 1),
                            })
                          }
                          className="w-10 bg-transparent text-center text-teal-400 font-bold focus:outline-none"
                        />
                      </div>

                      {/* Expiration Date if any */}
                      {card.expirationDate && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <Calendar className="w-3 h-3" />
                          <span>到期: {card.expirationDate}</span>
                        </div>
                      )}
                    </div>

                    {/* Description / Note if Gemini identified or manually added */}
                    {card.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                        ✨ {card.description}
                      </p>
                    )}

                    {/* Private toggle & delete */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
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
                        type="button"
                        onClick={() => removeDraft(card.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="自暫存區移除此張"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer / Confirm Deposit Actions */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 pb-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-400 text-center sm:text-left">
          <span>
            目的地：<strong className="text-teal-300">{destinationTitle}</strong>
          </span>
          <p className="text-[11px] text-slate-500">
            按下確定存入後，僅會存入勾選的項目，未勾選項目繼續保留在暫存區。
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            保留暫存並關閉
          </button>

          <button
            type="button"
            onClick={handleDepositSelected}
            disabled={selectedIds.size === 0}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>確定存入 (已選 {selectedIds.size} 項)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
