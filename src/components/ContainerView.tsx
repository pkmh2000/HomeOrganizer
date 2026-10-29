import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronRight,
  Plus,
  Camera,
  Layers,
  Box,
  Share2,
  Printer,
  Edit,
  ArrowRight,
  MoreVertical,
  Lock,
  Calendar,
  AlertCircle,
  Tag as TagIcon,
  Search,
  Sparkles,
  Download,
  FolderPlus,
  CheckSquare,
  Square,
  Trash2,
  FolderInput,
  Inbox,
  Archive,
  Eye,
  EyeOff,
  Unlock,
  Check,
  X,
  ArrowRightLeft,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Maximize2,
} from 'lucide-react';
import { InventoryNode } from '../types';
import {
  getNodeAncestors,
  getSubtreeStats,
  getExpirationStatus,
  exportContainerSubtree,
  isNodeUnfiled,
  getSafePhotoUrl,
} from '../utils/storage';
import { getCachedThumbnail, getSynchronousThumbnail } from '../utils/thumbnailCache';
import { NodeTransferModal, TransferPayload } from './NodeTransferModal';
import { ImageLightboxModal } from './ImageLightboxModal';

// Resilient thumbnail component for containers: handles broken base64 or failed images without ugly broken icon
const ContainerThumbnail: React.FC<{
  container: InventoryNode;
  onPreview: (photos: string[], name: string) => void;
  onEdit: (node: InventoryNode) => void;
  fitMode?: 'contain' | 'cover';
}> = ({ container, onPreview, onEdit, fitMode = 'contain' }) => {
  const [imgError, setImgError] = useState(false);
  const rawUrl = container.photos?.[0];
  const safeUrl = getSafePhotoUrl(rawUrl);
  const showImage = safeUrl !== null && !imgError;
  const [thumbSrc, setThumbSrc] = useState<string>(() => (safeUrl ? getSynchronousThumbnail(safeUrl) || safeUrl : ''));

  useEffect(() => {
    let active = true;
    if (safeUrl) {
      getCachedThumbnail(safeUrl).then((thumb) => {
        if (active && thumb) setThumbSrc(thumb);
      });
    }
    return () => {
      active = false;
    };
  }, [safeUrl]);

  return (
    <div
      onClick={(e) => {
        if (showImage && container.photos) {
          e.stopPropagation();
          onPreview(
            container.photos.filter((p) => getSafePhotoUrl(p) !== null),
            container.name
          );
        } else {
          e.stopPropagation();
          onEdit(container);
        }
      }}
      className={`aspect-video w-full rounded-xl overflow-hidden bg-slate-950 mb-2.5 relative group/img border border-slate-800/80 ${
        showImage ? 'cursor-pointer' : 'cursor-pointer hover:border-teal-500/50'
      }`}
      title={showImage ? '點擊大圖預覽（支援雙指放大縮小）' : '點擊為此容器補拍/上傳封面照'}
    >
      {showImage ? (
        <>
          {fitMode === 'contain' && (
            <div
              className="absolute inset-0 bg-cover bg-center blur-md opacity-25 scale-110 pointer-events-none"
              style={{ backgroundImage: `url(${thumbSrc || safeUrl})` }}
            />
          )}
          <img
            src={thumbSrc || safeUrl}
            alt=""
            onError={() => setImgError(true)}
            className={`relative z-1 w-full h-full transition duration-300 ${
              fitMode === 'contain' ? 'object-contain p-1' : 'object-cover group-hover:scale-105'
            }`}
          />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-2 text-center group-hover:text-teal-400 transition">
          <Layers className="w-7 h-7 mb-1 text-slate-600 group-hover:text-teal-400 group-hover:scale-110 transition" />
          <span className="text-[10px] font-semibold text-slate-400 group-hover:text-teal-300 flex items-center gap-1">
            <Camera className="w-3 h-3" />
            <span>補拍照片</span>
          </span>
        </div>
      )}
      {container.isPrivate && (
        <span className="absolute bottom-1.5 left-1.5 p-1 rounded bg-black/70 text-rose-400 z-10">
          <Lock className="w-3 h-3" />
        </span>
      )}
      {showImage && (
        <span className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition shadow z-10">
          <Maximize2 className="w-3 h-3 text-teal-300" />
        </span>
      )}
    </div>
  );
};

// Resilient thumbnail component for items: fallback cleanly to Box icon if no image or error
const ItemThumbnail: React.FC<{
  item: InventoryNode;
  onPreview: (photos: string[], name: string) => void;
  fitMode?: 'contain' | 'cover';
}> = ({ item, onPreview, fitMode = 'contain' }) => {
  const [imgError, setImgError] = useState(false);
  const rawUrl = item.photos?.[0];
  const safeUrl = getSafePhotoUrl(rawUrl);
  const showImage = safeUrl !== null && !imgError;
  const [thumbSrc, setThumbSrc] = useState<string>(() => (safeUrl ? getSynchronousThumbnail(safeUrl) || safeUrl : ''));

  useEffect(() => {
    let active = true;
    if (safeUrl) {
      getCachedThumbnail(safeUrl).then((thumb) => {
        if (active && thumb) setThumbSrc(thumb);
      });
    }
    return () => {
      active = false;
    };
  }, [safeUrl]);

  return (
    <div
      onClick={(e) => {
        if (showImage && item.photos) {
          e.stopPropagation();
          onPreview(
            item.photos.filter((p) => getSafePhotoUrl(p) !== null),
            item.name
          );
        }
      }}
      className={`w-16 h-16 rounded-xl bg-slate-950 overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-800 group/thumb ${
        showImage ? 'cursor-pointer' : ''
      }`}
      title={showImage ? '點擊大圖預覽（雙指縮放）' : ''}
    >
      {showImage ? (
        <>
          {fitMode === 'contain' && (
            <div
              className="absolute inset-0 bg-cover bg-center blur-sm opacity-20 scale-125 pointer-events-none"
              style={{ backgroundImage: `url(${thumbSrc || safeUrl})` }}
            />
          )}
          <img
            src={thumbSrc || safeUrl}
            alt=""
            onError={() => setImgError(true)}
            className={`relative z-1 w-full h-full transition ${
              fitMode === 'contain' ? 'object-contain p-0.5' : 'object-cover group-hover:scale-105'
            }`}
          />
        </>
      ) : (
        <Box className="w-6 h-6 text-slate-600" />
      )}
      {item.quantity > 1 && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded-md bg-slate-950/80 text-[10px] text-teal-300 font-bold border border-slate-800 z-10">
          x{item.quantity}
        </span>
      )}
      {showImage && (
        <span className="absolute top-1 right-1 p-0.5 rounded bg-black/70 text-teal-300 opacity-0 group-hover/thumb:opacity-100 transition shadow z-10">
          <Maximize2 className="w-2.5 h-2.5" />
        </span>
      )}
    </div>
  );
};

interface ContainerViewProps {
  currentContainerId: string | null;
  nodes: InventoryNode[];
  onNavigateContainer: (id: string | null) => void;
  onOpenBatchIntake: () => void;
  onOpenNewItem: () => void;
  onEditNode: (node: InventoryNode) => void;
  onToggleType: (node: InventoryNode) => void;
  onPrintContainer: (container: InventoryNode) => void;
  // Batch & Archiving Actions
  onBatchDelete?: (nodeIds: string[]) => void;
  onBatchMove?: (nodeIds: string[], targetParentId: string | null) => void;
  onBatchTogglePrivate?: (nodeIds: string[]) => void;
  onBatchArchive?: (nodeIds: string[]) => void;
  onQuickArchiveItem?: (itemId: string, targetParentId: string) => void;
  onExecuteTransfer?: (payload: TransferPayload) => void;
  openUnfiledDirectly?: boolean;
  onHandledUnfiledDirectly?: () => void;
  stagingCount?: number;
}

export const ContainerView: React.FC<ContainerViewProps> = ({
  currentContainerId,
  nodes,
  onNavigateContainer,
  onOpenBatchIntake,
  onOpenNewItem,
  onEditNode,
  onToggleType,
  onPrintContainer,
  onBatchDelete,
  onBatchMove,
  onBatchTogglePrivate,
  onBatchArchive,
  onQuickArchiveItem,
  onExecuteTransfer,
  openUnfiledDirectly,
  onHandledUnfiledDirectly,
  stagingCount = 0,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [viewUnfiledOnly, setViewUnfiledOnly] = useState(false);

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Transfer & Move Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [nodesToTransfer, setNodesToTransfer] = useState<InventoryNode[]>([]);
  const [batchTargetContainer, setBatchTargetContainer] = useState<string>('');
  const [showTransferGuide, setShowTransferGuide] = useState(false);

  // Thumbnail fit mode: 'contain' (complete uncropped) vs 'cover' (fill crop)
  const [thumbnailFitMode, setThumbnailFitMode] = useState<'contain' | 'cover'>(() => {
    try {
      return (localStorage.getItem('homeorganizer_thumb_fit') as any) || 'contain';
    } catch {
      return 'contain';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('homeorganizer_thumb_fit', thumbnailFitMode);
    } catch {}
  }, [thumbnailFitMode]);

  // Move Modal State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetContainerForMove, setTargetContainerForMove] = useState<string | null>(null);

  // Quick Archive Modal State (for single unfiled item fallback)
  const [itemToArchive, setItemToArchive] = useState<InventoryNode | null>(null);
  const [targetContainerForArchive, setTargetContainerForArchive] = useState<string>('');

  // Image Lightbox Preview State (Full-screen with Pinch-to-zoom)
  const [previewLightbox, setPreviewLightbox] = useState<{
    photos: string[];
    index: number;
    name: string;
  } | null>(null);

  // Auto-switch to unfiled if openUnfiledDirectly requested, or exit unfiled if false
  React.useEffect(() => {
    if (openUnfiledDirectly === true) {
      setViewUnfiledOnly(true);
    } else if (openUnfiledDirectly === false) {
      setViewUnfiledOnly(false);
    }
  }, [openUnfiledDirectly]);

  // When navigating into a specific container, exit unfiled view and notify parent
  React.useEffect(() => {
    if (currentContainerId) {
      setViewUnfiledOnly(false);
      onHandledUnfiledDirectly?.();
    }
  }, [currentContainerId, onHandledUnfiledDirectly]);

  // Unfiled nodes count
  const unfiledNodes = useMemo(() => {
    return nodes.filter(isNodeUnfiled);
  }, [nodes]);

  // Find current container object (null = Root Household view)
  const currentContainer = currentContainerId
    ? nodes.find((n) => n.id === currentContainerId)
    : null;

  // Ancestors for breadcrumbs
  const ancestors = currentContainerId ? getNodeAncestors(nodes, currentContainerId) : [];

  // Direct children or unfiled list
  const displayedNodes = useMemo(() => {
    if (viewUnfiledOnly) {
      return unfiledNodes.filter((n) => {
        if (!filterQuery) return true;
        return (
          n.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
          n.tags?.some((t) => t.name.toLowerCase().includes(filterQuery.toLowerCase()))
        );
      });
    }

    return nodes.filter((n) => {
      if (n.parentId !== currentContainerId) return false;
      // In root view, hide unfiled items from normal listing so they stay neat in unfiled inbox
      if (!currentContainerId && isNodeUnfiled(n)) return false;

      if (!filterQuery) return true;
      return (
        n.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        n.tags?.some((t) => t.name.toLowerCase().includes(filterQuery.toLowerCase()))
      );
    });
  }, [nodes, currentContainerId, viewUnfiledOnly, unfiledNodes, filterQuery]);

  const subContainers = displayedNodes.filter((c) => c.type === 'container');
  const items = displayedNodes.filter((c) => c.type === 'item');

  // Stats for current container
  const stats = getSubtreeStats(nodes, currentContainerId);

  // All available containers for moving or archiving
  const availableContainers = useMemo(() => {
    return nodes.filter((n) => n.type === 'container');
  }, [nodes]);

  // Selection toggle
  const toggleSelectNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = displayedNodes.map((n) => n.id);
    setSelectedIds(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Batch action handlers
  const handleConfirmBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`確定要刪除選取的 ${selectedIds.size} 項物件/容器嗎？（刪除後可透過頂部復原按鈕隨時退回）`)) {
      onBatchDelete?.(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    }
  };

  const handleConfirmBatchMove = () => {
    if (selectedIds.size === 0) return;
    onBatchMove?.(Array.from(selectedIds), targetContainerForMove);
    setIsMoveModalOpen(false);
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const handleConfirmBatchArchive = () => {
    if (selectedIds.size === 0) return;
    onBatchArchive?.(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const handleConfirmBatchPrivacy = () => {
    if (selectedIds.size === 0) return;
    onBatchTogglePrivate?.(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  // Set default batch target container if none selected
  React.useEffect(() => {
    if (!batchTargetContainer && availableContainers.length > 0) {
      setBatchTargetContainer(availableContainers[0].id);
    }
  }, [availableContainers, batchTargetContainer]);

  // Instant direct batch archive without waiting modal
  const handleInstantBatchArchive = () => {
    if (selectedIds.size === 0 || !batchTargetContainer) return;
    onBatchMove?.(Array.from(selectedIds), batchTargetContainer);
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  // Instant direct single item archive without waiting modal
  const handleDirectSingleArchive = (itemId: string, targetContainerId: string) => {
    if (!targetContainerId) return;
    onQuickArchiveItem?.(itemId, targetContainerId);
  };

  // Open transfer modal for single node
  const handleOpenTransferSingle = (node: InventoryNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setNodesToTransfer([node]);
    setTransferModalOpen(true);
  };

  // Open transfer modal for batch selected nodes
  const handleOpenTransferBatch = () => {
    if (selectedIds.size === 0) return;
    const selectedNodesList = nodes.filter((n) => selectedIds.has(n.id));
    setNodesToTransfer(selectedNodesList);
    setTransferModalOpen(true);
  };

  const handleSingleArchiveConfirm = () => {
    if (!itemToArchive || !targetContainerForArchive) return;
    onQuickArchiveItem?.(itemToArchive.id, targetContainerForArchive);
    setItemToArchive(null);
    setTargetContainerForArchive('');
  };

  const handleExportThisContainer = () => {
    if (!currentContainerId || !currentContainer) return;
    const jsonStr = exportContainerSubtree(nodes, currentContainerId);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentContainer.name}-收納單元.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 relative">
      {/* Breadcrumb Path Banner */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar text-xs">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              setViewUnfiledOnly(false);
              onNavigateContainer(null);
              onHandledUnfiledDirectly?.();
            }}
            className={`flex items-center gap-1 font-semibold transition px-2 py-1 rounded-lg ${
              !currentContainerId && !viewUnfiledOnly
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>🏠 全家總覽</span>
          </button>

          {!viewUnfiledOnly &&
            ancestors.map((anc) => {
              const isCurrent = anc.id === currentContainerId;
              return (
                <React.Fragment key={anc.id}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <button
                    onClick={() => onNavigateContainer(anc.id)}
                    className={`flex items-center gap-1.5 font-medium transition px-2 py-1 rounded-lg shrink-0 ${
                      isCurrent
                        ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {anc.photos && anc.photos[0] && (
                      <img src={anc.photos[0]} alt="" className="w-4 h-4 rounded object-cover" />
                    )}
                    <span className="truncate max-w-[120px]">{anc.name}</span>
                  </button>
                </React.Fragment>
              );
            })}

          {viewUnfiledOnly && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                <Inbox className="w-3.5 h-3.5" />
                <span>未歸檔收納盒</span>
              </span>
            </>
          )}
        </div>

        {/* Unfiled Inbox & Multi-Select Action Switches */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Unfiled Inbox Button with Counter Badge */}
          <button
            onClick={() => setViewUnfiledOnly((prev) => !prev)}
            title="檢視尚未歸檔的物件"
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              viewUnfiledOnly
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : unfiledNodes.length > 0
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>未歸檔</span>
            {unfiledNodes.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">
                {unfiledNodes.length}
              </span>
            )}
          </button>

          {/* Multi-Select Toggle Button */}
          <button
            onClick={() => {
              setIsSelectMode((prev) => !prev);
              if (isSelectMode) setSelectedIds(new Set());
            }}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              isSelectMode
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{isSelectMode ? '結束多選' : '批次多選'}</span>
          </button>

          {/* Thumbnail Fit Toggle: 完整縮圖 (Contain) vs 填滿裁切 (Cover) */}
          <button
            type="button"
            onClick={() => setThumbnailFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
            title={
              thumbnailFitMode === 'contain'
                ? '目前為完整無裁切呈現，點擊切換為填滿裁切'
                : '目前為填滿裁切，點擊切換為完整無裁切呈現'
            }
            className={`px-2 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1 border shrink-0 ${
              thumbnailFitMode === 'contain'
                ? 'bg-teal-950/60 text-teal-300 border-teal-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <Maximize2 className="w-3 h-3 text-teal-400" />
            <span className="hidden sm:inline">
              {thumbnailFitMode === 'contain' ? '完整縮圖' : '填滿裁切'}
            </span>
            <span className="sm:hidden">
              {thumbnailFitMode === 'contain' ? '全圖' : '填滿'}
            </span>
          </button>
        </div>
      </div>

      {/* Unfiled Notice Banner if in Unfiled Mode */}
      {viewUnfiledOnly && (
        <div className="px-4 py-3 bg-amber-950/40 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>未歸檔收納區</strong>：拍照、掃碼或快速添加但未指定容器的物品。點選「快速歸檔」可一鍵移至指定收納空間。
            </span>
          </div>
          <button
            onClick={() => setViewUnfiledOnly(false)}
            className="text-amber-400 font-bold hover:underline shrink-0 ml-2"
          >
            返回總覽 ✕
          </button>
        </div>
      )}

      {/* Container Hero Header if inside a container */}
      {currentContainer && !viewUnfiledOnly && (
        <div className="p-4 bg-slate-900/60 border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0 relative group">
              {getSafePhotoUrl(currentContainer.photos?.[0]) ? (
                <img
                  src={getSafePhotoUrl(currentContainer.photos?.[0])!}
                  alt=""
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <Layers className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                  <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate min-w-0 flex-1">
                    {currentContainer.name}
                  </h2>
                  {currentContainer.isPrivate && (
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-semibold shrink-0">
                      <Lock className="w-3 h-3" /> 私人
                    </span>
                  )}
                  {currentContainer.accessKey && (
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono shrink-0">
                      🔑 私鑰
                    </span>
                  )}
                </div>

                {/* Container Actions: shrink-0 guarantees buttons NEVER get pushed off-screen on mobile */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <button
                    onClick={(e) => handleOpenTransferSingle(currentContainer, e)}
                    title="移轉此容器至其他容器、空間或擁有人"
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-white transition flex items-center gap-1 shrink-0"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs font-semibold">移轉</span>
                  </button>
                  <button
                    onClick={() => onPrintContainer(currentContainer)}
                    title="列印 QR Code 收納標籤"
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 transition shrink-0"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleExportThisContainer}
                    title="單獨匯出此容器子樹"
                    className="hidden sm:flex p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditNode(currentContainer)}
                    title="編輯此容器"
                    className="p-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 hover:text-white border border-teal-500/40 transition shrink-0 flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs font-semibold">編輯</span>
                  </button>
                </div>
              </div>

              {currentContainer.description && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {currentContainer.description}
                </p>
              )}

              {/* Subtree Stats */}
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                <span>
                  子容器: <strong className="text-teal-400">{subContainers.length}</strong>
                </span>
                <span>
                  物品項目: <strong className="text-emerald-400">{items.length}</strong>
                </span>
                {stats.totalValue > 0 && (
                  <span>
                    總估值: <strong className="text-amber-400">NT$ {stats.totalValue.toLocaleString()}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar (Search & Fast Add) */}
      <div className="p-3 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={
              viewUnfiledOnly
                ? '在未歸檔物品中搜尋...'
                : currentContainer
                ? `在「${currentContainer.name}」中搜尋...`
                : '搜尋全家物件或容器...'
            }
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenBatchIntake}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs border border-teal-500/30 flex items-center gap-1.5 transition active:scale-95 relative"
            title="開啟拍照暫存區"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              批次拍照{stagingCount > 0 ? ` (暫存 ${stagingCount})` : ''}
            </span>
            {stagingCount > 0 && (
              <span className="sm:hidden w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
          <button
            onClick={onOpenNewItem}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>新增物品/容器</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content Area: CRITICAL dynamic pb ensures the bottom-most item is NEVER blocked */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-6 ${isSelectMode ? 'pb-56' : 'pb-36'}`}>
        {/* SUB-CONTAINERS SECTION */}
        {!viewUnfiledOnly && subContainers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span>
                  {currentContainerId ? '下層收納容器 / 抽屜 / 格層' : '主要空間與頂層收納容器'} (
                  {subContainers.length})
                </span>
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {subContainers.map((container) => {
                const isSelected = selectedIds.has(container.id);
                return (
                  <div
                    key={container.id}
                    onClick={() => {
                      if (isSelectMode) {
                        toggleSelectNode(container.id, {} as any);
                      } else {
                        onNavigateContainer(container.id);
                      }
                    }}
                    className={`group relative rounded-2xl p-3 border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-teal-950/40 border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.25)]'
                        : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-teal-500/50 shadow-sm'
                    }`}
                  >
                    {/* Multi-Select Checkbox */}
                    {isSelectMode && (
                      <div
                        onClick={(e) => toggleSelectNode(container.id, e)}
                        className="absolute top-2 right-2 z-10 p-1 rounded-lg bg-slate-950/80"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-teal-400 fill-teal-400/20" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                    )}

                    {/* Container Image */}
                    <ContainerThumbnail
                      container={container}
                      onPreview={(photos, name) =>
                        setPreviewLightbox({
                          photos,
                          index: 0,
                          name,
                        })
                      }
                      onEdit={onEditNode}
                      fitMode={thumbnailFitMode}
                    />

                    {/* Name & Sub items count */}
                    <div>
                      <h4 className="font-bold text-sm text-slate-100 group-hover:text-teal-300 transition truncate">
                        {container.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {nodes.filter((n) => n.parentId === container.id).length} 個物件/隔層
                      </p>
                    </div>

                    {/* Actions: Transfer, Edit & Enter */}
                    {!isSelectMode && (
                      <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] gap-1">
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleOpenTransferSingle(container, e)}
                            title="移轉此容器至其他容器、空間或擁有人"
                            className="px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-teal-300 flex items-center gap-1 transition shrink-0"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>移轉</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditNode(container);
                            }}
                            title="編輯此容器"
                            className="px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-teal-400 hover:text-white flex items-center gap-1 transition shrink-0"
                          >
                            <Edit className="w-3 h-3" />
                            <span>編輯</span>
                          </button>
                        </div>
                        <span className="text-teal-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition shrink-0 ml-auto">
                          <span>進入容器</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transfer & Archiving Guide Banner (User request: 物件/容器 歸檔或轉移 要如何移轉?) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowTransferGuide((p) => !p)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-slate-300 hover:text-white transition"
          >
            <span className="flex items-center gap-2 font-bold text-teal-300">
              <HelpCircle className="w-4 h-4 text-teal-400" />
              <span>💡 物件與容器移轉／歸檔指南（點此展開查看）</span>
            </span>
            {showTransferGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTransferGuide && (
            <div className="px-4 pb-3.5 pt-1 text-slate-300 border-t border-slate-800/60 space-y-2 bg-slate-950/40">
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold shrink-0 text-[10px]">1</span>
                <p><strong>拍照與新收納</strong>：相機拍照後系統預設置於「未歸檔收件匣」，拍照時亦可直接選擇儲存容器。</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold shrink-0 text-[10px]">2</span>
                <p><strong>免等待多選歸檔</strong>：在未歸檔收件匣勾選多個項目，在下方控制列挑選目標容器並點擊「立即歸檔」，無需任何等待彈窗！</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold shrink-0 text-[10px]">3</span>
                <p><strong>容器與物件移轉</strong>：點擊卡片上的「⇄ 移轉」按鈕，可自由變更所屬容器、跨實體空間（例如家庭轉移到辦公室）或移轉給其他負責成員。</p>
              </div>
            </div>
          )}
        </div>

        {/* ITEMS SECTION */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {viewUnfiledOnly ? '未歸檔物件列表' : '此層存放的物品項目'} ({items.length})
              </span>
            </h3>

            {viewUnfiledOnly && items.length > 0 && (
              <span className="text-[11px] text-amber-300">
                可勾選下方物品直接歸檔，或點選卡片直接選定目標容器
              </span>
            )}
          </div>

          {/* Unfiled Multi-Select Archive Toolbar (User request: 快速歸檔 改成 多選歸檔, 不需要浮現等待) */}
          {viewUnfiledOnly && items.length > 0 && (
            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border border-amber-500/50 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="font-bold text-xs sm:text-sm text-amber-200">
                    多選歸檔控制台（免等待彈窗，勾選後立即入庫）
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectedIds.size === items.length ? handleDeselectAll : handleSelectAll}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  >
                    {selectedIds.size === items.length ? '取消全選' : `全選未歸檔 (${items.length})`}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                <span className="text-xs text-slate-300 font-semibold shrink-0">歸檔目標容器：</span>
                <select
                  value={batchTargetContainer}
                  onChange={(e) => setBatchTargetContainer(e.target.value)}
                  className="flex-1 min-w-[200px] bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-amber-400"
                >
                  {availableContainers.map((c) => (
                    <option key={c.id} value={c.id}>
                      📦 {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={selectedIds.size === 0 || !batchTargetContainer}
                  onClick={handleInstantBatchArchive}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-slate-950 font-black text-xs shadow-md active:scale-95 disabled:opacity-40 transition flex items-center gap-1.5"
                >
                  <Archive className="w-4 h-4 stroke-[2.5]" />
                  <span>立即歸檔 ({selectedIds.size} 件)</span>
                </button>
              </div>
            </div>
          )}

          {items.length === 0 && subContainers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500">
              <Box className="w-12 h-12 stroke-[1.2] mb-3 text-slate-600" />
              <p className="font-semibold text-slate-300 mb-1">
                {viewUnfiledOnly ? '未歸檔收納盒是空的！' : '此容器目前沒有任何物品'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                {viewUnfiledOnly
                  ? '太棒了！所有收納的物品均已完整編輯並歸入所屬容器。'
                  : '點選下方按鈕拍照或手動新增第一件物品。'}
              </p>
              {!viewUnfiledOnly && (
                <button
                  onClick={onOpenNewItem}
                  className="px-4 py-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold hover:bg-teal-500/30 transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>新增物品至此容器</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const exp = getExpirationStatus(item.expirationDate);
                const isUnfiledItem = isNodeUnfiled(item);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isSelectMode) {
                        toggleSelectNode(item.id, {} as any);
                      } else {
                        onEditNode(item);
                      }
                    }}
                    className={`group relative rounded-2xl p-3 border transition flex items-center gap-3.5 cursor-pointer ${
                      isSelected
                        ? 'bg-teal-950/40 border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.25)]'
                        : isUnfiledItem
                        ? 'bg-amber-950/20 hover:bg-amber-950/30 border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-teal-500/40'
                    }`}
                  >
                    {/* Multi-Select Checkbox */}
                    {isSelectMode && (
                      <div
                        onClick={(e) => toggleSelectNode(item.id, e)}
                        className="shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-teal-400 fill-teal-400/20" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                    )}

                    {/* Item Thumbnail */}
                    <ItemThumbnail
                      item={item}
                      onPreview={(photos, name) =>
                        setPreviewLightbox({
                          photos,
                          index: 0,
                          name,
                        })
                      }
                      fitMode={thumbnailFitMode}
                    />

                    {/* Item Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className="font-bold text-slate-100 group-hover:text-teal-300 transition text-sm truncate flex-1 min-w-0">
                          {item.name}
                        </h4>
                        {isUnfiledItem && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold shrink-0">
                            待歸檔
                          </span>
                        )}
                        {item.isPrivate && (
                          <span className="p-0.5 rounded text-rose-400 text-[10px] shrink-0">
                            <Lock className="w-3 h-3 inline" />
                          </span>
                        )}
                        {item.loanStatus?.isLoaned && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0 truncate max-w-[85px]">
                            借: {item.loanStatus.borrower}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>
                          數量: <strong className="text-slate-200">{item.quantity}</strong> {item.unit || '件'}
                        </span>
                        {item.price !== undefined && (
                          <span>NT$ {item.price.toLocaleString()}</span>
                        )}
                      </div>

                      {/* Expiration badge */}
                      {item.expirationDate && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className={`px-2 py-0.2 rounded-full text-[10px] ${exp.badgeClass}`}>
                            {exp.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons: Direct 1-click edit, container archive, transfer, or toggle type */}
                    <div className="flex items-center gap-1 shrink-0 ml-1.5" onClick={(e) => e.stopPropagation()}>
                      {isUnfiledItem ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleDirectSingleArchive(item.id, e.target.value);
                              }
                            }}
                            className="bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-200 text-xs rounded-xl px-2 py-1.5 font-bold outline-none cursor-pointer max-w-[95px] sm:max-w-[130px] truncate shrink-0"
                          >
                            <option value="" disabled>📥 歸檔...</option>
                            {availableContainers.map((c) => (
                              <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                                📦 {c.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => onEditNode(item)}
                            title="編輯此物件詳細資料"
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-white border border-slate-700 transition shrink-0"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenTransferSingle(item, e)}
                            title="移轉此物件容器或空間"
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-teal-400 border border-slate-700 transition shrink-0"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onEditNode(item)}
                            title="編輯此物件詳細資料"
                            className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-white border border-slate-700 transition flex items-center gap-1 text-[11px] font-semibold shrink-0"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">編輯</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenTransferSingle(item, e)}
                            title="移轉此物件至其他容器、空間或擁有人"
                            className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-teal-300 border border-slate-700 transition flex items-center gap-1 text-[11px] shrink-0"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">移轉</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleType(item);
                            }}
                            title="將此物件升格為容器 (可收納更多物品)"
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] shrink-0"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING BATCH ACTIONS TOOLBAR (Positioned ABOVE bottom nav at bottom-20 z-50 so it's NEVER covered!) */}
      {isSelectMode && (
        <div className="fixed bottom-20 sm:bottom-22 inset-x-2 sm:inset-x-4 max-w-xl mx-auto z-50 bg-slate-900/98 border-2 border-teal-500 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-3 flex flex-col gap-2.5 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-200 text-xs">
          {/* Top Row: Selection info and Close button */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-teal-400 text-slate-950 font-black text-xs shadow-sm">
                已勾選 {selectedIds.size} 項
              </span>
              <button
                type="button"
                onClick={selectedIds.size === displayedNodes.length ? handleDeselectAll : handleSelectAll}
                className="text-teal-300 hover:text-white underline font-semibold text-xs py-0.5 px-1"
              >
                {selectedIds.size === displayedNodes.length ? '取消全選' : `全選本頁 (${displayedNodes.length})`}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSelectMode(false);
                setSelectedIds(new Set());
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 font-semibold border border-slate-700 transition"
            >
              <span>結束多選</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bottom Row: 4 Clear Action Buttons */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {/* Batch Move */}
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => setIsMoveModalOpen(true)}
              className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-750 text-teal-300 font-bold disabled:opacity-35 disabled:pointer-events-none transition flex flex-col sm:flex-row items-center justify-center gap-1 border border-slate-700 shadow-sm active:scale-95"
              title="移動所選項目至其他容器"
            >
              <FolderInput className="w-4 h-4 text-teal-400" />
              <span className="text-[11px] sm:text-xs">移動</span>
            </button>

            {/* Batch Transfer (跨容器/跨空間/轉移責任人) */}
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleOpenTransferBatch}
              className="py-2 px-1 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-bold disabled:opacity-35 disabled:pointer-events-none transition flex flex-col sm:flex-row items-center justify-center gap-1 border border-teal-500/50 shadow-sm active:scale-95"
              title="移轉空間、負責成員或所屬容器"
            >
              <ArrowRightLeft className="w-4 h-4 text-teal-400" />
              <span className="text-[11px] sm:text-xs">移轉</span>
            </button>

            {/* Batch Archive */}
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleConfirmBatchArchive}
              className="py-2 px-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold disabled:opacity-35 disabled:pointer-events-none transition flex flex-col sm:flex-row items-center justify-center gap-1 border border-amber-500/40 shadow-sm active:scale-95"
              title="批次歸檔入庫"
            >
              <Archive className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] sm:text-xs">歸檔</span>
            </button>

            {/* Batch Delete */}
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleConfirmBatchDelete}
              className="py-2 px-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold disabled:opacity-35 disabled:pointer-events-none transition flex flex-col sm:flex-row items-center justify-center gap-1 border border-rose-500/40 shadow-sm active:scale-95"
              title="批次刪除 (可隨時復原)"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span className="text-[11px] sm:text-xs">刪除</span>
            </button>
          </div>
        </div>
      )}

      {/* BATCH MOVE MODAL */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl animate-fade-in">
            <h4 className="font-bold text-base text-white flex items-center gap-2">
              <FolderInput className="w-5 h-5 text-teal-400" />
              <span>批次移動 {selectedIds.size} 項物件/容器</span>
            </h4>
            <p className="text-xs text-slate-400">請選擇目的地收納空間或容器：</p>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              <div
                onClick={() => setTargetContainerForMove(null)}
                className={`p-2.5 rounded-xl border cursor-pointer text-xs font-semibold flex items-center justify-between ${
                  targetContainerForMove === null
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>🏠 全家頂層空間 (Root)</span>
                {targetContainerForMove === null && <Check className="w-4 h-4" />}
              </div>

              {availableContainers
                .filter((c) => !selectedIds.has(c.id))
                .map((container) => {
                  const isTarget = targetContainerForMove === container.id;
                  return (
                    <div
                      key={container.id}
                      onClick={() => setTargetContainerForMove(container.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer text-xs font-semibold flex items-center justify-between ${
                        isTarget
                          ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span className="truncate">{container.name}</span>
                      </div>
                      {isTarget && <Check className="w-4 h-4" />}
                    </div>
                  );
                })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsMoveModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300"
              >
                取消
              </button>
              <button
                onClick={handleConfirmBatchMove}
                className="px-4 py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
              >
                確認移動
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE QUICK ARCHIVE MODAL */}
      {itemToArchive && (
        <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl animate-fade-in">
            <h4 className="font-bold text-base text-white flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-400" />
              <span>快速歸檔物品：「{itemToArchive.name}」</span>
            </h4>
            <p className="text-xs text-slate-400">
              選擇此物品要歸納存放的容器或隔層，設定後即完成歸檔：
            </p>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {availableContainers.map((container) => {
                const isTarget = targetContainerForArchive === container.id;
                return (
                  <div
                    key={container.id}
                    onClick={() => setTargetContainerForArchive(container.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer text-xs font-semibold flex items-center justify-between ${
                      isTarget
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{container.name}</span>
                    </div>
                    {isTarget && <Check className="w-4 h-4" />}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setItemToArchive(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300"
              >
                取消
              </button>
              <button
                disabled={!targetContainerForArchive}
                onClick={handleSingleArchiveConfirm}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 disabled:opacity-40 text-slate-950 font-bold text-xs"
              >
                確認歸檔入庫
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NODE TRANSFER & ARCHIVING MODAL (Single & Batch) */}
      <NodeTransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        targetNodes={nodesToTransfer}
        allNodes={nodes}
        onExecuteTransfer={(payload) => {
          if (onExecuteTransfer) {
            onExecuteTransfer(payload);
          } else if (payload.targetParentId !== undefined) {
            onBatchMove?.(payload.nodeIds, payload.targetParentId);
          }
          setSelectedIds(new Set());
          setIsSelectMode(false);
        }}
      />

      {/* Image Lightbox Modal with Multi-Touch Pinch-to-Zoom */}
      <ImageLightboxModal
        isOpen={Boolean(previewLightbox)}
        onClose={() => setPreviewLightbox(null)}
        imageUrl={previewLightbox?.photos[previewLightbox.index] || null}
        images={previewLightbox?.photos || []}
        initialIndex={previewLightbox?.index || 0}
        title={previewLightbox ? `${previewLightbox.name} 照片` : ''}
      />
    </div>
  );
};
