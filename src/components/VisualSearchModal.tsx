import React, { useState, useMemo } from 'react';
import { Search, X, ChevronRight, Tag as TagIcon, Box, Layers, Calendar, Lock, Users, ArrowUpRight } from 'lucide-react';
import { InventoryNode, Tag } from '../types';
import { getNodeAncestors, getExpirationStatus } from '../utils/storage';

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: InventoryNode[];
  onSelectNode: (node: InventoryNode) => void;
  onNavigateToContainer: (containerId: string | null) => void;
}

export const VisualSearchModal: React.FC<VisualSearchModalProps> = ({
  isOpen,
  onClose,
  nodes,
  onSelectNode,
  onNavigateToContainer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'item' | 'container'>('all');

  // Extract all unique tags
  const allTags = useMemo(() => {
    const map = new Map<string, Tag>();
    nodes.forEach((n) => {
      n.tags?.forEach((t) => {
        if (!map.has(t.name)) map.set(t.name, t);
      });
    });
    return Array.from(map.values());
  }, [nodes]);

  // Filtered nodes
  const results = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return nodes.filter((node) => {
      if (filterType !== 'all' && node.type !== filterType) return false;

      if (selectedTag && !node.tags?.some((t) => t.name === selectedTag)) {
        return false;
      }

      if (!term) return true;

      const matchName = node.name.toLowerCase().includes(term);
      const matchDesc = node.description?.toLowerCase().includes(term);
      const matchBarcode = node.barcode?.toLowerCase().includes(term);
      const matchBorrower = node.loanStatus?.borrower?.toLowerCase().includes(term);
      const matchTag = node.tags?.some((t) => t.name.toLowerCase().includes(term));

      return matchName || matchDesc || matchBarcode || matchBorrower || matchTag;
    });
  }, [nodes, searchTerm, selectedTag, filterType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md">
      {/* Search Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋物品名稱、標籤、條碼、借出人..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-medium"
        >
          取消
        </button>
      </div>

      {/* Filter Chips Bar */}
      <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
        {/* Type toggle */}
        <div className="flex rounded-lg bg-slate-800 p-0.5 shrink-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-md transition ${filterType === 'all' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            全部
          </button>
          <button
            onClick={() => setFilterType('container')}
            className={`px-2.5 py-1 rounded-md transition ${filterType === 'container' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            容器/房間
          </button>
          <button
            onClick={() => setFilterType('item')}
            className={`px-2.5 py-1 rounded-md transition ${filterType === 'item' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            單一物件
          </button>
        </div>

        {/* Tags chips */}
        {allTags.map((t) => (
          <button
            key={t.name}
            onClick={() => setSelectedTag(selectedTag === t.name ? null : t.name)}
            className={`px-2.5 py-1 rounded-full shrink-0 border transition flex items-center gap-1 ${
              selectedTag === t.name
                ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      {/* Search Results List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>找到 {results.length} 筆項目</span>
          <span className="text-[11px] text-teal-400/80">點擊位置可直達收納層</span>
        </div>

        {results.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Box className="w-12 h-12 mx-auto stroke-[1.5] mb-2 opacity-40" />
            <p className="text-sm">沒有找到相符的物品或容器</p>
            <p className="text-xs mt-1">請嘗試不同關鍵字或切換標籤篩選</p>
          </div>
        ) : (
          results.map((node) => {
            const ancestors = getNodeAncestors(nodes, node.id);
            const exp = getExpirationStatus(node.expirationDate);

            return (
              <div
                key={node.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition p-3.5 shadow-md flex flex-col gap-2.5"
              >
                {/* Main Node Row */}
                <div
                  onClick={() => {
                    onSelectNode(node);
                    onClose();
                  }}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60 relative">
                    {node.photos && node.photos[0] ? (
                      <img src={node.photos[0]} alt={node.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Box className="w-6 h-6" />
                      </div>
                    )}
                    <span
                      className={`absolute bottom-0 inset-x-0 py-0.5 text-[9px] text-center font-bold ${
                        node.type === 'container'
                          ? 'bg-indigo-600/90 text-white'
                          : 'bg-teal-600/90 text-white'
                      }`}
                    >
                      {node.type === 'container' ? '容器' : '物件'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-slate-100 group-hover:text-teal-300 transition text-sm truncate">
                        {node.name}
                      </h4>
                      {node.isPrivate && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> 私人
                        </span>
                      )}
                      {node.loanStatus?.isLoaned && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
                          <Users className="w-2.5 h-2.5" /> 借給 {node.loanStatus.borrower}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>數量: <strong className="text-slate-200">{node.quantity}</strong> {node.unit || '件'}</span>
                      {node.price !== undefined && (
                        <span>金額: NT$ <strong className="text-slate-200">{node.price.toLocaleString()}</strong></span>
                      )}
                    </div>

                    {/* Expiration or warranty badges */}
                    {node.expirationDate && (
                      <div className="mt-1 flex items-center gap-1 text-[11px]">
                        <span className={`px-2 py-0.5 rounded-full ${exp.badgeClass}`}>
                          {exp.label} ({node.expirationDate})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* VISUAL PARENT-CHILD BREADCRUMB CHAIN WITH THUMBNAIL PICTURES */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-teal-400" />
                    <span>存放層級與收納位置 (點擊可直達)：</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 bg-slate-950/60 rounded-xl border border-slate-800/60 no-scrollbar">
                    {ancestors.map((ancestor, idx) => {
                      const isLast = idx === ancestors.length - 1;
                      return (
                        <React.Fragment key={ancestor.id}>
                          <button
                            onClick={() => {
                              if (ancestor.type === 'container') {
                                onNavigateToContainer(ancestor.id);
                                onClose();
                              } else {
                                onSelectNode(ancestor);
                                onClose();
                              }
                            }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition shrink-0 ${
                              isLast
                                ? 'bg-teal-500/20 border border-teal-500/40 text-teal-300 font-semibold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                            }`}
                          >
                            <div className="w-5 h-5 rounded overflow-hidden bg-slate-700 shrink-0">
                              {ancestor.photos && ancestor.photos[0] ? (
                                <img src={ancestor.photos[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Box className="w-3.5 h-3.5 m-0.5 text-slate-400" />
                              )}
                            </div>
                            <span className="text-xs truncate max-w-[120px]">{ancestor.name}</span>
                          </button>
                          {!isLast && <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
