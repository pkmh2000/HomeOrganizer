import React, { useState, useMemo } from 'react';
import {
  ArrowRightLeft,
  X,
  Box,
  Layers,
  Building,
  User,
  Inbox,
  Check,
  Search,
  Sparkles,
  Home,
  CheckCircle2,
} from 'lucide-react';
import { InventoryNode, StorageSpace, UserProfile } from '../types';
import { loadSpaces, loadUserProfiles } from '../utils/storage';

export interface TransferPayload {
  nodeIds: string[];
  targetParentId?: string | null;
  targetSpaceId?: string;
  targetOwnerName?: string;
  isArchived?: boolean;
  cascadeToChildren?: boolean;
}

interface NodeTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Node to transfer (single mode) OR list of nodeIds (batch mode)
  targetNodes: InventoryNode[];
  allNodes: InventoryNode[];
  onExecuteTransfer: (payload: TransferPayload) => void;
}

export const NodeTransferModal: React.FC<NodeTransferModalProps> = ({
  isOpen,
  onClose,
  targetNodes,
  allNodes,
  onExecuteTransfer,
}) => {
  const [activeTab, setActiveTab] = useState<'container' | 'space' | 'owner'>('container');
  const [containerSearch, setContainerSearch] = useState('');

  // Selected transfer parameters
  const [selectedParentId, setSelectedParentId] = useState<string | null | 'unfiled' | 'keep'>('keep');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | 'keep'>('keep');
  const [selectedOwnerName, setSelectedOwnerName] = useState<string | 'keep'>('keep');
  const [cascadeChildren, setCascadeChildren] = useState<boolean>(true);

  const spaces: StorageSpace[] = useMemo(() => loadSpaces(), []);
  const userProfiles: UserProfile[] = useMemo(() => loadUserProfiles(), []);

  // Filter out the nodes themselves and any of their descendants to avoid cyclic nesting
  const invalidContainerIds = useMemo(() => {
    const ids = new Set<string>();
    const targetIds = targetNodes.map((n) => n.id);
    targetIds.forEach((id) => ids.add(id));

    const addDescendants = (parentId: string) => {
      allNodes.forEach((n) => {
        if (n.parentId === parentId) {
          ids.add(n.id);
          if (n.type === 'container') {
            addDescendants(n.id);
          }
        }
      });
    };

    targetIds.forEach((id) => addDescendants(id));
    return ids;
  }, [targetNodes, allNodes]);

  // Available valid containers
  const availableContainers = useMemo(() => {
    return allNodes
      .filter((n) => n.type === 'container' && !invalidContainerIds.has(n.id))
      .filter((n) => {
        if (!containerSearch) return true;
        return n.name.toLowerCase().includes(containerSearch.toLowerCase());
      });
  }, [allNodes, invalidContainerIds, containerSearch]);

  if (!isOpen || targetNodes.length === 0) return null;

  const isBatch = targetNodes.length > 1;
  const singleNode = !isBatch ? targetNodes[0] : null;

  // Handle confirmation
  const handleConfirm = () => {
    const payload: TransferPayload = {
      nodeIds: targetNodes.map((n) => n.id),
      cascadeToChildren: cascadeChildren,
    };

    if (selectedParentId !== 'keep') {
      if (selectedParentId === 'unfiled') {
        payload.targetParentId = null;
        payload.isArchived = false;
      } else {
        payload.targetParentId = selectedParentId;
        payload.isArchived = true;
      }
    }

    if (selectedSpaceId !== 'keep') {
      payload.targetSpaceId = selectedSpaceId;
    }

    if (selectedOwnerName !== 'keep') {
      payload.targetOwnerName = selectedOwnerName;
    }

    onExecuteTransfer(payload);
    onClose();
  };

  // Find parent container name of a container for display
  const getContainerPath = (c: InventoryNode): string => {
    if (!c.parentId) return '頂層區域';
    const parent = allNodes.find((n) => n.id === c.parentId);
    return parent ? `${parent.name} > ${c.name}` : c.name;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-teal-500/50 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                <span>{isBatch ? `批次移轉與歸檔 (${targetNodes.length} 項)` : `移轉與歸檔「${singleNode?.name}」`}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                自由變更收納容器、所屬空間（家庭/辦公室）或擁有者
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('container')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'container'
                ? 'bg-teal-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>變更容器 / 歸檔</span>
          </button>

          <button
            onClick={() => setActiveTab('space')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'space'
                ? 'bg-teal-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>跨空間移轉</span>
          </button>

          <button
            onClick={() => setActiveTab('owner')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'owner'
                ? 'bg-teal-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>轉移擁有者</span>
          </button>
        </div>

        {/* Tab 1: Container / Archiving Selection */}
        {activeTab === 'container' && (
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={containerSearch}
                onChange={(e) => setContainerSearch(e.target.value)}
                placeholder="搜尋目標收納容器名稱..."
                className="bg-transparent text-slate-100 placeholder-slate-500 flex-1 outline-none"
              />
              {containerSearch && (
                <button onClick={() => setContainerSearch('')} className="text-slate-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Special Quick Destination Options */}
            <div className="space-y-1.5">
              {/* Option A: Move to Unfiled Inbox (待整理) */}
              <div
                onClick={() => setSelectedParentId('unfiled')}
                className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  selectedParentId === 'unfiled'
                    ? 'bg-amber-950/40 border-amber-400 text-amber-200'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-amber-500/40 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
                      <span>📥 移至未歸檔收件匣</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        解除歸檔
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">移出容器，放入待分類的收件匣中重新整理</p>
                  </div>
                </div>
                {selectedParentId === 'unfiled' && <Check className="w-4 h-4 text-amber-400" />}
              </div>

              {/* Option B: Top-level Standalone Root */}
              <div
                onClick={() => setSelectedParentId(null)}
                className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  selectedParentId === null
                    ? 'bg-teal-950/40 border-teal-400 text-teal-200'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-teal-500/40 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-100">🏠 設為頂層獨立空間 / 房間</h4>
                    <p className="text-[11px] text-slate-400">作為根目錄大區域（如客廳、廚房、獨立倉）</p>
                  </div>
                </div>
                {selectedParentId === null && <Check className="w-4 h-4 text-teal-400" />}
              </div>
            </div>

            {/* Container List */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                收納容器清單 ({availableContainers.length})
              </span>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {availableContainers.map((c) => {
                  const isSelected = selectedParentId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedParentId(c.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-teal-950/50 border-teal-400 text-teal-100 shadow'
                          : 'bg-slate-950/30 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-teal-400 text-xs">
                          {c.photos?.[0] ? (
                            <img src={c.photos[0]} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Box className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-slate-100 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{getContainerPath(c)}</p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Cross-Space Transfer Selection */}
        {activeTab === 'space' && (
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            <p className="text-xs text-slate-300">
              選擇要將此物品/容器移轉至哪一個實體空間環境（例如從家裡帶到辦公室）：
            </p>

            <div className="space-y-2">
              {spaces.map((sp) => {
                const isSelected = selectedSpaceId === sp.id;
                return (
                  <div
                    key={sp.id}
                    onClick={() => setSelectedSpaceId(sp.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-950/50 border-indigo-400 text-indigo-100 shadow'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                        {sp.icon || '🏠'}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-100">{sp.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{sp.description || '自訂空間'}</p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                  </div>
                );
              })}
            </div>

            {targetNodes.some((n) => n.type === 'container') && (
              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 cursor-pointer mt-3">
                <input
                  type="checkbox"
                  checked={cascadeChildren}
                  onChange={(e) => setCascadeChildren(e.target.checked)}
                  className="rounded text-teal-500 focus:ring-0"
                />
                <span>連同此容器內部所有子容器與物品一併轉移至新空間</span>
              </label>
            )}
          </div>
        )}

        {/* Tab 3: Owner / Responsibility Transfer Selection */}
        {activeTab === 'owner' && (
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            <p className="text-xs text-slate-300">
              選擇新的物品負責人或擁有人（家庭共有、特定成員或同事）：
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {userProfiles.map((user) => {
                const isSelected = selectedOwnerName === user.name;
                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedOwnerName(user.name)}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal-950/50 border-teal-400 text-teal-100 shadow'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{user.avatar}</span>
                      <div>
                        <p className="font-bold text-xs text-slate-100">{user.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {user.role === 'admin' ? '系統管理員' : '一般家庭/組織成員'}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-teal-400" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Summary & Action */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            {selectedParentId !== 'keep' && (
              <span className="block text-teal-300 font-semibold truncate max-w-[200px]">
                目的地：{selectedParentId === 'unfiled' ? '未歸檔收件匣' : selectedParentId === null ? '頂層區域' : '所選容器'}
              </span>
            )}
            {selectedSpaceId !== 'keep' && (
              <span className="block text-indigo-300 font-semibold truncate max-w-[200px]">
                新空間：{spaces.find((s) => s.id === selectedSpaceId)?.name}
              </span>
            )}
            {selectedOwnerName !== 'keep' && (
              <span className="block text-emerald-300 font-semibold truncate max-w-[200px]">
                新擁有者：{selectedOwnerName}
              </span>
            )}
            {selectedParentId === 'keep' && selectedSpaceId === 'keep' && selectedOwnerName === 'keep' && (
              <span>請選取上方欲變更之項目</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedParentId === 'keep' && selectedSpaceId === 'keep' && selectedOwnerName === 'keep'}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-lg active:scale-95 disabled:opacity-40 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>確定移轉</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
