import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { InventoryNode } from '../types';
import {
  getNodeAncestors,
  getSubtreeStats,
  getExpirationStatus,
  exportContainerSubtree,
  isNodeUnfiled,
} from '../utils/storage';

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
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [viewUnfiledOnly, setViewUnfiledOnly] = useState(false);

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Move Modal State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetContainerForMove, setTargetContainerForMove] = useState<string | null>(null);

  // Quick Archive Modal State (for single unfiled item)
  const [itemToArchive, setItemToArchive] = useState<InventoryNode | null>(null);
  const [targetContainerForArchive, setTargetContainerForArchive] = useState<string>('');

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
              {currentContainer.photos && currentContainer.photos[0] ? (
                <img
                  src={currentContainer.photos[0]}
                  alt={currentContainer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <Layers className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-100 truncate">
                    {currentContainer.name}
                  </h2>
                  {currentContainer.isPrivate && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-semibold">
                      <Lock className="w-3 h-3" /> 私人
                    </span>
                  )}
                  {currentContainer.accessKey && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono">
                      🔑 私鑰保護
                    </span>
                  )}
                </div>

                {/* Container Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onPrintContainer(currentContainer)}
                    title="列印 QR Code 收納標籤"
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 transition"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleExportThisContainer}
                    title="單獨匯出此容器子樹"
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditNode(currentContainer)}
                    title="編輯此容器"
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    <Edit className="w-4 h-4" />
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
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs border border-teal-500/30 flex items-center gap-1.5 transition active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">批次拍照</span>
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

      {/* Scrollable Content Area: CRITICAL pb-36 ensures the bottom-most item is NEVER blocked by bottom desk */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-36">
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
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-950/80 mb-2.5 relative">
                      {container.photos && container.photos[0] ? (
                        <img
                          src={container.photos[0]}
                          alt={container.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Layers className="w-6 h-6" />
                        </div>
                      )}
                      {container.isPrivate && (
                        <span className="absolute bottom-1.5 left-1.5 p-1 rounded bg-black/70 text-rose-400">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {/* Name & Sub items count */}
                    <div>
                      <h4 className="font-bold text-sm text-slate-100 group-hover:text-teal-300 transition truncate">
                        {container.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {nodes.filter((n) => n.parentId === container.id).length} 個物件/隔層
                      </p>
                    </div>

                    {/* Enter Arrow */}
                    {!isSelectMode && (
                      <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-teal-400 font-semibold">
                        <span>進入容器</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                點選右側「歸檔」按鈕，即可將物品收入對應容器中
              </span>
            )}
          </div>

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
                    <div className="w-16 h-16 rounded-xl bg-slate-950/80 overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-800">
                      {item.photos && item.photos[0] ? (
                        <img
                          src={item.photos[0]}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      ) : (
                        <Box className="w-6 h-6 text-slate-600" />
                      )}
                      {item.quantity > 1 && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded-md bg-slate-950/80 text-[10px] text-teal-300 font-bold border border-slate-800">
                          x{item.quantity}
                        </span>
                      )}
                    </div>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-100 group-hover:text-teal-300 transition text-sm truncate">
                          {item.name}
                        </h4>
                        {isUnfiledItem && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                            待歸檔
                          </span>
                        )}
                        {item.isPrivate && (
                          <span className="p-0.5 rounded text-rose-400 text-[10px]">
                            <Lock className="w-3 h-3 inline" />
                          </span>
                        )}
                        {item.loanStatus?.isLoaned && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            借出: {item.loanStatus.borrower}
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

                    {/* Quick Archive button if unfiled, or quick upgrade to container */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {isUnfiledItem ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToArchive(item);
                            setTargetContainerForArchive(availableContainers[0]?.id || '');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-slate-950 font-bold text-xs flex items-center gap-1 shadow active:scale-95 transition"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>快速歸檔</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleType(item);
                          }}
                          title="將此物件升格為容器 (可收納更多物品)"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px]"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">轉成容器</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING BATCH ACTIONS TOOLBAR (when in Multi-Select Mode) */}
      {isSelectMode && (
        <div className="fixed bottom-6 inset-x-4 max-w-xl mx-auto z-40 bg-slate-900/95 border border-teal-500/60 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-2 backdrop-blur-md animate-fade-in text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-lg bg-teal-500 text-slate-950 font-black">
              已選 {selectedIds.size} 項
            </span>
            <button
              onClick={selectedIds.size === displayedNodes.length ? handleDeselectAll : handleSelectAll}
              className="text-slate-300 hover:text-white underline font-semibold"
            >
              {selectedIds.size === displayedNodes.length ? '取消全選' : '全選此頁'}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Batch Move */}
            <button
              disabled={selectedIds.size === 0}
              onClick={() => setIsMoveModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold disabled:opacity-40 transition flex items-center gap-1"
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>移動至...</span>
            </button>

            {/* Batch Archive */}
            <button
              disabled={selectedIds.size === 0}
              onClick={handleConfirmBatchArchive}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold disabled:opacity-40 transition flex items-center gap-1 border border-amber-500/30"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>歸檔</span>
            </button>

            {/* Batch Delete */}
            <button
              disabled={selectedIds.size === 0}
              onClick={handleConfirmBatchDelete}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-semibold disabled:opacity-40 transition flex items-center gap-1 border border-rose-500/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>刪除</span>
            </button>

            <button
              onClick={() => {
                setIsSelectMode(false);
                setSelectedIds(new Set());
              }}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white ml-1"
            >
              <X className="w-4 h-4" />
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
    </div>
  );
};
