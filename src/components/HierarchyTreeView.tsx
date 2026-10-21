import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  Box,
  Lock,
  Plus,
  ArrowRight,
  Search,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { InventoryNode } from '../types';
import { getExpirationStatus } from '../utils/storage';

interface HierarchyTreeViewProps {
  nodes: InventoryNode[];
  onSelectNode: (node: InventoryNode) => void;
  onNavigateToContainer: (containerId: string | null) => void;
}

export const HierarchyTreeView: React.FC<HierarchyTreeViewProps> = ({
  nodes,
  onSelectNode,
  onNavigateToContainer,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(nodes.map((n) => n.id)));
  const [filterText, setFilterText] = useState('');

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(nodes.map((n) => n.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Render a single branch node recursively
  const renderBranch = (node: InventoryNode, depth: number) => {
    const isContainer = node.type === 'container';
    const children = nodes.filter((n) => n.parentId === node.id);
    const isExpanded = expandedIds.has(node.id);
    const exp = getExpirationStatus(node.expirationDate);

    // Filter matching
    const matchSelf = !filterText || node.name.toLowerCase().includes(filterText.toLowerCase());

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => {
            if (isContainer) {
              onNavigateToContainer(node.id);
            } else {
              onSelectNode(node);
            }
          }}
          style={{ paddingLeft: `${depth * 18 + 8}px` }}
          className={`flex items-center gap-2 py-2 pr-3 rounded-xl cursor-pointer transition group hover:bg-slate-900 ${
            matchSelf && filterText ? 'bg-teal-500/10 text-teal-300' : 'text-slate-300'
          }`}
        >
          {/* Arrow toggle for containers */}
          {isContainer ? (
            <button
              onClick={(e) => toggleExpand(node.id, e)}
              className="p-1 rounded text-slate-500 hover:text-white"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          {/* Node thumbnail photo */}
          <div className="w-6 h-6 rounded-md overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60">
            {node.photos && node.photos[0] ? (
              <img src={node.photos[0]} alt="" className="w-full h-full object-cover" />
            ) : isContainer ? (
              <Layers className="w-3.5 h-3.5 m-1 text-indigo-400" />
            ) : (
              <Box className="w-3.5 h-3.5 m-1 text-teal-400" />
            )}
          </div>

          {/* Title */}
          <span className="text-xs font-semibold truncate flex-1 group-hover:text-teal-300">
            {node.name}
          </span>

          {/* Badges */}
          {node.isPrivate && (
            <span className="text-rose-400 text-[10px]">
              <Lock className="w-3 h-3 inline" />
            </span>
          )}

          {isContainer && children.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-[10px] text-slate-400">
              {children.length}
            </span>
          )}

          {!isContainer && (
            <span className="text-[11px] text-slate-500">
              {node.quantity} {node.unit || '件'}
            </span>
          )}
        </div>

        {/* Children if container and expanded */}
        {isContainer && isExpanded && children.length > 0 && (
          <div className="border-l border-slate-800/80 ml-5">
            {children.map((child) => renderBranch(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootNodes = nodes.filter((n) => n.parentId === null);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
      {/* Header & Controls */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              層級收納樹狀清單
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              容器s ➔ 容器s ➔ 容器s ➔ 物件s
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={expandAll}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              全部展開
            </button>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              全部收合
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="過濾樹狀階層..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {rootNodes.map((rootNode) => renderBranch(rootNode, 0))}
      </div>
    </div>
  );
};
