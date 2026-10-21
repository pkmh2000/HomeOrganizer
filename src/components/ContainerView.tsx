import React, { useState } from 'react';
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
} from 'lucide-react';
import { InventoryNode } from '../types';
import { getNodeAncestors, getSubtreeStats, getExpirationStatus, exportContainerSubtree } from '../utils/storage';

interface ContainerViewProps {
  currentContainerId: string | null;
  nodes: InventoryNode[];
  onNavigateContainer: (id: string | null) => void;
  onOpenBatchIntake: () => void;
  onOpenNewItem: () => void;
  onEditNode: (node: InventoryNode) => void;
  onToggleType: (node: InventoryNode) => void;
  onPrintContainer: (container: InventoryNode) => void;
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
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  // Find current container object (null = Root Household view)
  const currentContainer = currentContainerId
    ? nodes.find((n) => n.id === currentContainerId)
    : null;

  // Ancestors for breadcrumbs
  const ancestors = currentContainerId ? getNodeAncestors(nodes, currentContainerId) : [];

  // Direct children
  const children = nodes.filter((n) => {
    if (n.parentId !== currentContainerId) return false;
    if (!filterQuery) return true;
    return (
      n.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      n.tags?.some((t) => t.name.toLowerCase().includes(filterQuery.toLowerCase()))
    );
  });

  const subContainers = children.filter((c) => c.type === 'container');
  const items = children.filter((c) => c.type === 'item');

  // Stats for current container
  const stats = getSubtreeStats(nodes, currentContainerId);

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
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
      {/* Breadcrumb Path Banner */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
        <button
          onClick={() => onNavigateContainer(null)}
          className={`flex items-center gap-1 font-semibold transition px-2 py-1 rounded-lg ${
            !currentContainerId
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span>🏠 全家總覽</span>
        </button>

        {ancestors.map((anc, idx) => {
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
      </div>

      {/* Container Hero Header if inside a container */}
      {currentContainer ? (
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
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onPrintContainer(currentContainer)}
                    title="列印 QR 貼紙標籤"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-teal-400"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleExportThisContainer}
                    title="匯出此容器 JSON"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-teal-400"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditNode(currentContainer)}
                    title="編輯此容器"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {currentContainer.description && (
                <p className="text-xs text-slate-400 line-clamp-1 mt-1">
                  {currentContainer.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                <span>
                  內含 <strong className="text-teal-400">{subContainers.length}</strong> 個子容器
                </span>
                <span>•</span>
                <span>
                  <strong className="text-teal-400">{items.length}</strong> 件物件
                </span>
                {stats.totalValue > 0 && (
                  <>
                    <span>•</span>
                    <span>估值 NT$ {stats.totalValue.toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Root Household Top bar */
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-400" />
              居家收納空間主目錄
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              共有 {subContainers.length} 個主要區域空間，包含 {stats.totalItems} 件家庭物品
            </p>
          </div>
        </div>
      )}

      {/* Action Bar: Batch multi-photo intake + Add Item */}
      <div className="p-3 bg-slate-900/40 border-b border-slate-800/80 flex items-center gap-2">
        <button
          onClick={onOpenBatchIntake}
          className="flex-1 py-2.5 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition"
        >
          <Camera className="w-4 h-4" />
          <span>📸 拍照 / 多照片批次收納</span>
        </button>

        <button
          onClick={onOpenNewItem}
          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 text-teal-400" />
          <span>手動新增</span>
        </button>
      </div>

      {/* Search / Filter in this container */}
      {(subContainers.length > 4 || items.length > 4) && (
        <div className="px-4 py-2 border-b border-slate-800/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="過濾此層級內的物件或容器..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* SUB-CONTAINERS SECTION */}
        {subContainers.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>收納容器 / 空間 ({subContainers.length})</span>
              </span>
              <span className="text-[11px] text-indigo-400/80">點擊卡片深入查看</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {subContainers.map((container) => {
                const cStats = getSubtreeStats(nodes, container.id);
                return (
                  <div
                    key={container.id}
                    onClick={() => onNavigateContainer(container.id)}
                    className="group relative rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-3 flex flex-col justify-between shadow-md cursor-pointer transition hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    {/* Thumbnail Photo */}
                    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-800 border border-slate-700/60 mb-2.5 relative">
                      {container.photos && container.photos[0] ? (
                        <img
                          src={container.photos[0]}
                          alt={container.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Layers className="w-8 h-8" />
                        </div>
                      )}
                      {container.isPrivate && (
                        <span className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-950/80 text-rose-300 border border-rose-500/40">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {/* Name & Stats */}
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-100 text-sm truncate group-hover:text-indigo-300 transition">
                        {container.name}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{cStats.totalItems} 件物品</span>
                        <span className="text-indigo-400 font-medium flex items-center">
                          進入 <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>

                    {/* Convert/Action hover button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditNode(container);
                      }}
                      className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 text-slate-300 hover:text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition"
                      title="編輯容器"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ITEMS SECTION */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Box className="w-4 h-4 text-teal-400" />
              <span>單一物件清單 ({items.length})</span>
            </span>
            <span className="text-[11px] text-teal-400/80">點擊卡片編輯・隨時可轉成容器</span>
          </div>

          {items.length === 0 ? (
            <div className="py-8 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 p-6">
              <Box className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">此層級尚未放置任何物品</p>
              <p className="text-xs text-slate-500 mt-1">
                點擊上方「拍照/多照片批次收納」直接為抽屜或箱子拍照建檔！
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => {
                const exp = getExpirationStatus(item.expirationDate);

                return (
                  <div
                    key={item.id}
                    onClick={() => onEditNode(item)}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition cursor-pointer flex items-center gap-3 group shadow-md"
                  >
                    {/* Item Photo */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/60 shrink-0 relative">
                      {item.photos && item.photos[0] ? (
                        <img
                          src={item.photos[0]}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Box className="w-6 h-6" />
                        </div>
                      )}
                      {item.quantity > 1 && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded text-[10px] bg-black/80 text-teal-400 font-bold">
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

                    {/* Quick Convert to Container button (User requirement: 個照片可以轉成容器 再擴展) */}
                    <div className="flex flex-col items-end gap-1.5">
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
