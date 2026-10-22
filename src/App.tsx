import React, { useState, useEffect, useMemo } from 'react';
import { ViewTab, InventoryNode, FamilyMemo, UserProfile, StorageSpace } from './types';
import {
  loadNodes,
  saveNodes,
  loadMemos,
  saveMemos,
  loadMembers,
  saveMembers,
  loadHouseholdName,
  saveHouseholdName,
  getExpirationStatus,
  loadActiveUser,
  saveActiveUser,
  loadActiveSpaceId,
  saveActiveSpaceId,
  loadSpaces,
  isNodeUnfiled,
} from './utils/storage';
import { useUndoHistory } from './hooks/useUndoHistory';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { ContainerView } from './components/ContainerView';
import { HierarchyTreeView } from './components/HierarchyTreeView';
import { FamilyCalendarView } from './components/FamilyCalendarView';
import { FamilyMemosView } from './components/FamilyMemosView';
import { BackupShareModal } from './components/BackupShareModal';
import { BatchPhotoIntakeModal } from './components/BatchPhotoIntakeModal';
import { ItemEditModal } from './components/ItemEditModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { VisualSearchModal } from './components/VisualSearchModal';
import { PrintableLabelModal } from './components/PrintableLabelModal';
import { SuggestionsModal } from './components/SuggestionsModal';
import { GeminiAssistantModal } from './components/GeminiAssistantModal';
import { MobileInstallBanner } from './components/MobileInstallBanner';
import { PhotoGalleryModal } from './components/PhotoGalleryModal';
import { AccountSpaceModal } from './components/AccountSpaceModal';
import { TransferPayload } from './components/NodeTransferModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  WifiOff,
  Camera,
  Plus,
  PanelBottomOpen,
  Layers,
  RotateCcw,
  Eye,
  Inbox,
  Check,
  X,
} from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();

  // Primary Data State
  const [nodes, setNodes] = useState<InventoryNode[]>(() => loadNodes());
  const [memos, setMemos] = useState<FamilyMemo[]>(() => loadMemos());
  const [members, setMembers] = useState<string[]>(() => loadMembers());
  const [householdName, setHouseholdName] = useState<string>(() => loadHouseholdName());

  // User Accounts & Multi-Spaces State
  const [activeUser, setActiveUser] = useState<UserProfile>(() => loadActiveUser());
  const [activeSpaceId, setActiveSpaceId] = useState<string>(() => loadActiveSpaceId());
  const [spaces, setSpaces] = useState<StorageSpace[]>(() => loadSpaces());
  const [unlockedContainerIds, setUnlockedContainerIds] = useState<Set<string>>(new Set());
  const [openUnfiledInbox, setOpenUnfiledInbox] = useState(false);

  // Undo / Redo History Stack (at least 5 steps, supported up to 20 steps)
  const {
    canUndo,
    canRedo,
    undoCount,
    toastMessage,
    recordHistory,
    undo,
    dismissToast,
  } = useUndoHistory(20);

  // UI Navigation State
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [currentContainerId, setCurrentContainerId] = useState<string | null>(null);
  const [showPrivate, setShowPrivate] = useState<boolean>(true);

  // Pure View Mode: Hides floating desk & camera buttons so view area is 100% unobstructed!
  const [pureViewMode, setPureViewMode] = useState<boolean>(false);

  // Bottom Desk Toggle
  const [showBottomDesk, setShowBottomDesk] = useState<boolean>(false);

  const toggleBottomDesk = () => {
    setShowBottomDesk((prev) => !prev);
  };

  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab);
    setShowBottomDesk(false); // auto-collapse!
  };

  // Modals State
  const [isBatchIntakeOpen, setIsBatchIntakeOpen] = useState(false);
  const [isItemEditOpen, setIsItemEditOpen] = useState(false);
  const [nodeToEdit, setNodeToEdit] = useState<InventoryNode | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printNode, setPrintNode] = useState<InventoryNode | null>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isGeminiOpen, setIsGeminiOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isAccountSpaceModalOpen, setIsAccountSpaceModalOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    saveNodes(nodes);
  }, [nodes]);

  useEffect(() => {
    saveMemos(memos);
  }, [memos]);

  useEffect(() => {
    saveMembers(members);
  }, [members]);

  useEffect(() => {
    saveHouseholdName(householdName);
  }, [householdName]);

  // Privacy & Space Filter:
  // "照片與物件/容器私有同步, 設為私有, 只有擁有人才能看到"
  const visibleNodes = useMemo(() => {
    let result = nodes;

    // 1. If global private toggle is off, hide all private nodes
    if (!showPrivate) {
      result = result.filter((n) => !n.isPrivate);
    } else if (activeUser.role !== 'admin' && activeUser.name !== '全家 / 公共視角') {
      // 2. Member level privacy: if private and owned by another user, hide unless unlocked with private key
      result = result.filter((n) => {
        if (!n.isPrivate) return true;
        if (!n.ownerName || n.ownerName === activeUser.name || n.ownerName === '全家') return true;
        if (unlockedContainerIds.has(n.id)) return true;
        return false;
      });
    }

    // 3. Space filter (if container/node belongs to a specific space)
    if (activeSpaceId) {
      result = result.filter((n) => !n.spaceId || n.spaceId === activeSpaceId);
    }

    return result;
  }, [nodes, showPrivate, activeUser, unlockedContainerIds, activeSpaceId]);

  // Unfiled nodes count
  const unfiledCount = useMemo(() => {
    return nodes.filter(isNodeUnfiled).length;
  }, [nodes]);

  // Active Space Name
  const activeSpaceObj = spaces.find((s) => s.id === activeSpaceId);
  const activeSpaceName = activeSpaceObj ? `${activeSpaceObj.icon} ${activeSpaceObj.name}` : householdName;

  // Current Container Name & Back Navigation
  const currentContainerName = useMemo(() => {
    if (!currentContainerId) return '全家總覽空間';
    const found = nodes.find((n) => n.id === currentContainerId);
    return found ? found.name : '未知容器';
  }, [nodes, currentContainerId]);

  const handleBackContainer = () => {
    if (!currentContainerId) return;
    const current = nodes.find((n) => n.id === currentContainerId);
    setCurrentContainerId(current?.parentId || null);
  };

  // Expiring count for alert ping
  const expiringCount = useMemo(() => {
    return nodes.filter((n) => {
      if (!n.expirationDate) return false;
      const exp = getExpirationStatus(n.expirationDate);
      return exp.status === 'expiring_soon' || exp.status === 'expired';
    }).length;
  }, [nodes]);

  // Undo Handler
  const handleUndo = () => {
    const restored = undo(nodes);
    if (restored) {
      setNodes(restored);
    }
  };

  // Save new batch photos into current container or unfiled inbox
  const handleSaveBatchNodes = (
    newNodes: InventoryNode[],
    targetPlacement: 'inbox' | 'current' = 'inbox'
  ) => {
    recordHistory(nodes, `批次新增 ${newNodes.length} 張照片物件`);
    setNodes((prev) => [...prev, ...newNodes]);
    setActiveTab('containers');
    setShowBottomDesk(false);

    if (targetPlacement === 'inbox') {
      setCurrentContainerId(null);
      setOpenUnfiledInbox(true);
    }
  };

  // Unified Node Transfer handler (single or batch)
  const handleExecuteTransfer = (payload: TransferPayload) => {
    const { nodeIds, targetParentId, targetSpaceId, targetOwnerName, isArchived, cascadeToChildren } = payload;
    const count = nodeIds.length;
    recordHistory(nodes, `移轉 ${count} 項物件/容器`);

    const idSet = new Set(nodeIds);

    // If cascade to children for spaces
    if (cascadeToChildren && targetSpaceId) {
      const addChildren = (parentId: string) => {
        nodes.forEach((n) => {
          if (n.parentId === parentId) {
            idSet.add(n.id);
            if (n.type === 'container') addChildren(n.id);
          }
        });
      };
      nodeIds.forEach((id) => addChildren(id));
    }

    setNodes((prev) =>
      prev.map((n) => {
        if (!idSet.has(n.id)) return n;
        const updated = { ...n, updatedAt: new Date().toISOString() };
        if (targetParentId !== undefined) {
          updated.parentId = targetParentId;
        }
        if (isArchived !== undefined) {
          updated.isArchived = isArchived;
        }
        if (targetSpaceId !== undefined) {
          updated.spaceId = targetSpaceId;
        }
        if (targetOwnerName !== undefined) {
          updated.ownerName = targetOwnerName;
        }
        return updated;
      })
    );
  };

  // Save or update an item/container
  const handleSaveNode = (savedNode: InventoryNode) => {
    recordHistory(nodes, `更新「${savedNode.name}」`);
    setNodes((prev) => {
      const idx = prev.findIndex((n) => n.id === savedNode.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = savedNode;
        return updated;
      } else {
        return [...prev, savedNode];
      }
    });
  };

  // Single delete node and its subtree
  const handleDeleteNode = (nodeId: string) => {
    const targetNode = nodes.find((n) => n.id === nodeId);
    recordHistory(nodes, `刪除「${targetNode?.name || '物品/容器'}」`);
    setNodes((prev) => {
      const idsToDelete = new Set<string>([nodeId]);
      const findDescendants = (parentId: string) => {
        prev.forEach((n) => {
          if (n.parentId === parentId) {
            idsToDelete.add(n.id);
            if (n.type === 'container') {
              findDescendants(n.id);
            }
          }
        });
      };
      findDescendants(nodeId);
      return prev.filter((n) => !idsToDelete.has(n.id));
    });
  };

  // Batch delete nodes
  const handleBatchDelete = (nodeIds: string[]) => {
    recordHistory(nodes, `批次刪除 ${nodeIds.length} 項物件與容器`);
    const idSet = new Set(nodeIds);
    setNodes((prev) => prev.filter((n) => !idSet.has(n.id)));
  };

  // Batch move nodes to target container
  const handleBatchMove = (nodeIds: string[], targetParentId: string | null) => {
    recordHistory(nodes, `批次移動 ${nodeIds.length} 項至目的地`);
    const idSet = new Set(nodeIds);
    setNodes((prev) =>
      prev.map((n) =>
        idSet.has(n.id)
          ? {
              ...n,
              parentId: targetParentId,
              isArchived: true,
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );
  };

  // Batch toggle private/shared
  const handleBatchTogglePrivate = (nodeIds: string[]) => {
    recordHistory(nodes, `批次切換 ${nodeIds.length} 項隱私狀態`);
    const idSet = new Set(nodeIds);
    setNodes((prev) =>
      prev.map((n) =>
        idSet.has(n.id)
          ? {
              ...n,
              isPrivate: !n.isPrivate,
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );
  };

  // Batch archive
  const handleBatchArchive = (nodeIds: string[]) => {
    recordHistory(nodes, `批次歸檔 ${nodeIds.length} 項物品`);
    const idSet = new Set(nodeIds);
    setNodes((prev) =>
      prev.map((n) =>
        idSet.has(n.id)
          ? {
              ...n,
              isArchived: true,
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );
  };

  // Quick single item archive
  const handleQuickArchiveItem = (itemId: string, targetParentId: string) => {
    const item = nodes.find((n) => n.id === itemId);
    recordHistory(nodes, `歸檔「${item?.name || '物品'}」`);
    setNodes((prev) =>
      prev.map((n) =>
        n.id === itemId
          ? {
              ...n,
              parentId: targetParentId,
              isArchived: true,
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );
  };

  // Unlock private container with key
  const handleUnlockContainer = (containerId: string) => {
    setUnlockedContainerIds((prev) => new Set([...prev, containerId]));
  };

  // Fast toggle between container and item
  const handleToggleNodeType = (targetNode: InventoryNode) => {
    recordHistory(nodes, `轉換「${targetNode.name}」類型`);
    const newType = targetNode.type === 'container' ? 'item' : 'container';
    setNodes((prev) =>
      prev.map((n) =>
        n.id === targetNode.id
          ? {
              ...n,
              type: newType,
              unit: newType === 'container' ? '個' : n.unit || '件',
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );
  };

  // Barcode Scan result handler
  const handleScanResult = (code: string) => {
    const trimmed = code.trim();
    const existing = nodes.find((n) => n.barcode === trimmed);
    if (existing) {
      setNodeToEdit(existing);
      setIsItemEditOpen(true);
    } else {
      const newItem: Partial<InventoryNode> = {
        id: 'node-' + Date.now(),
        parentId: currentContainerId,
        type: 'item',
        name: `掃描條碼建檔 (#${trimmed.slice(-4)})`,
        barcode: trimmed,
        quantity: 1,
        unit: '個',
        isPrivate: false,
        isArchived: currentContainerId !== null,
        photos: [],
        tags: [{ id: 't-scan', name: '掃碼建檔', color: '#0d9488' }],
      };
      setNodeToEdit(newItem as InventoryNode);
      setIsItemEditOpen(true);
    }
  };

  // Memo actions
  const handleSaveMemo = (newMemo: FamilyMemo) => {
    setMemos((prev) => {
      const idx = prev.findIndex((m) => m.id === newMemo.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newMemo;
        return updated;
      }
      return [newMemo, ...prev];
    });
  };

  const handleDeleteMemo = (memoId: string) => {
    setMemos((prev) => prev.filter((m) => m.id !== memoId));
  };

  const handleToggleMemoDone = (memoId: string) => {
    setMemos((prev) =>
      prev.map((m) => (m.id === memoId ? { ...m, isDone: !m.isDone } : m))
    );
  };

  // Restore imported data
  const handleRestoreData = (newNodes: InventoryNode[], newMemos: FamilyMemo[]) => {
    recordHistory(nodes, '還原歷史資料備份');
    setNodes(newNodes);
    setMemos(newMemos);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Offline Standalone Notification */}
      {!isOnline && (
        <div className="bg-emerald-900/90 border-b border-emerald-700/60 px-3 py-1 text-[11px] text-emerald-200 flex items-center justify-center gap-1.5 z-50">
          <WifiOff className="w-3 h-3 text-emerald-300" />
          <span>自成一體離線運行中：拍照、收納與資料庫均完整保存在設備本機。</span>
        </div>
      )}

      {/* Top Navbar with Compact Function Header & Auto-collapsing Menu */}
      <Navbar
        householdName={householdName}
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        showPrivate={showPrivate}
        onToggleShowPrivate={() => setShowPrivate((p) => !p)}
        showBottomDesk={showBottomDesk}
        onToggleBottomDesk={toggleBottomDesk}
        onOpenSearch={() => setIsVisualSearchOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenSuggestions={() => setIsSuggestionsOpen(true)}
        onOpenGemini={() => setIsGeminiOpen(true)}
        expiringAlertCount={expiringCount}
        currentContainerName={currentContainerName}
        currentContainerId={currentContainerId}
        onBackContainer={handleBackContainer}
        onUndo={handleUndo}
        canUndo={canUndo}
        undoCount={undoCount}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenAccountSpace={() => setIsAccountSpaceModalOpen(true)}
        activeUser={activeUser}
        activeSpaceName={activeSpaceName}
        pureViewMode={pureViewMode}
        onTogglePureViewMode={() => setPureViewMode((p) => !p)}
        unfiledCount={unfiledCount}
      />

      {/* Mobile PWA Install Reminder Banner (prompts when on mobile and not installed) */}
      <MobileInstallBanner />

      {/* Main View Area (100% focused on current function) */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {activeTab === 'dashboard' && (
          <Dashboard
            nodes={visibleNodes}
            memos={memos}
            householdName={householdName}
            onOpenBatchIntake={() => setIsBatchIntakeOpen(true)}
            onOpenSearch={() => setIsVisualSearchOpen(true)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onSelectNode={(node) => {
              setNodeToEdit(node);
              setIsItemEditOpen(true);
            }}
            onNavigateToContainer={(cid) => {
              setCurrentContainerId(cid);
              handleTabChange('containers');
            }}
            onToggleMemoDone={handleToggleMemoDone}
            onNavigateTab={handleTabChange}
          />
        )}

        {activeTab === 'containers' && (
          <ContainerView
            currentContainerId={currentContainerId}
            nodes={visibleNodes}
            onNavigateContainer={(id) => {
              setCurrentContainerId(id);
              setShowBottomDesk(false); // auto-collapse desk when entering container!
            }}
            onOpenBatchIntake={() => setIsBatchIntakeOpen(true)}
            onOpenNewItem={() => {
              setNodeToEdit(null);
              setIsItemEditOpen(true);
            }}
            onEditNode={(node) => {
              setNodeToEdit(node);
              setIsItemEditOpen(true);
            }}
            onToggleType={handleToggleNodeType}
            onPrintContainer={(container) => {
              setPrintNode(container);
              setIsPrintModalOpen(true);
            }}
            onBatchDelete={handleBatchDelete}
            onBatchMove={handleBatchMove}
            onBatchTogglePrivate={handleBatchTogglePrivate}
            onBatchArchive={handleBatchArchive}
            onQuickArchiveItem={handleQuickArchiveItem}
            onExecuteTransfer={handleExecuteTransfer}
            openUnfiledDirectly={openUnfiledInbox}
            onHandledUnfiledDirectly={() => setOpenUnfiledInbox(false)}
          />
        )}

        {activeTab === 'tree' && (
          <HierarchyTreeView
            nodes={visibleNodes}
            onSelectNode={(node) => {
              setNodeToEdit(node);
              setIsItemEditOpen(true);
            }}
            onNavigateToContainer={(cid) => {
              setCurrentContainerId(cid);
              handleTabChange('containers');
            }}
          />
        )}

        {activeTab === 'calendar' && (
          <FamilyCalendarView
            nodes={visibleNodes}
            memos={memos}
            onSelectNode={(node) => {
              setNodeToEdit(node);
              setIsItemEditOpen(true);
            }}
            onNavigateToContainer={(cid) => {
              setCurrentContainerId(cid);
              handleTabChange('containers');
            }}
          />
        )}

        {activeTab === 'memos' && (
          <FamilyMemosView
            memos={memos}
            members={members}
            nodes={visibleNodes}
            onSaveMemo={handleSaveMemo}
            onDeleteMemo={handleDeleteMemo}
            onToggleDone={handleToggleMemoDone}
          />
        )}

        {activeTab === 'settings' && (
          <BackupShareModal
            nodes={nodes}
            memos={memos}
            members={members}
            householdName={householdName}
            onUpdateHouseholdName={setHouseholdName}
            onRestoreData={handleRestoreData}
            onClose={() => handleTabChange('dashboard')}
          />
        )}

        {/* Floating Controls when bottom desk is closed (User request: 無用的 desk 平時收起；需要時可隱藏避開最後一項) */}
        {!showBottomDesk && !pureViewMode && (
          <div className="fixed bottom-5 inset-x-0 z-30 flex items-center justify-between px-4 pointer-events-none animate-fade-in">
            {/* Left: Open Desk Toggle Pill */}
            <button
              onClick={() => setShowBottomDesk(true)}
              title="開啟功能導航工作盤"
              className="pointer-events-auto h-11 px-3.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-teal-400 font-bold text-xs flex items-center gap-1.5 shadow-xl border border-slate-700/80 active:scale-95 transition backdrop-blur-md"
            >
              <PanelBottomOpen className="w-4 h-4" />
              <span>工作盤</span>
              {expiringCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>

            {/* Right: Quick Camera Batch Photo Action */}
            <button
              onClick={() => setIsBatchIntakeOpen(true)}
              title="拍照 / 多照片批次收納"
              className="pointer-events-auto h-11 px-4 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_6px_20px_rgba(20,184,166,0.4)] active:scale-90 transition border border-slate-900 group"
            >
              <Camera className="w-4.5 h-4.5 stroke-[2.2]" />
              <span>拍照收納</span>
            </button>
          </div>
        )}

        {/* Pure View Mode Quick Restore Pill (when pureViewMode is active) */}
        {pureViewMode && (
          <button
            onClick={() => setPureViewMode(false)}
            title="退出純淨全螢幕檢視，還原工作盤與拍照快捷鈕"
            className="fixed bottom-4 right-4 z-30 px-3 py-1.5 rounded-full bg-slate-900/90 border border-teal-500/40 text-teal-300 hover:text-white font-semibold text-xs shadow-xl flex items-center gap-1.5 backdrop-blur-md transition active:scale-95"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>退出純淨模式</span>
          </button>
        )}
      </main>

      {/* Floating Undo Toast Notification (避免誤刪，隨時可一鍵復原) */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-teal-500/70 text-slate-100 text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-fade-in max-w-sm w-full mx-auto">
          <span className="truncate flex-1 font-medium">{toastMessage}</span>
          {canUndo && (
            <button
              onClick={handleUndo}
              className="px-2.5 py-1 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition active:scale-95 shadow shrink-0 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 stroke-[3]" />
              <span>復原</span>
            </button>
          )}
          <button
            onClick={dismissToast}
            className="text-slate-400 hover:text-white p-1 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Desk */}
      {showBottomDesk && (
        <BottomNav
          activeTab={activeTab}
          onChangeTab={handleTabChange}
          onOpenBatchIntake={() => setIsBatchIntakeOpen(true)}
          onCloseDesk={() => setShowBottomDesk(false)}
          expiringAlertCount={expiringCount}
          memoCount={memos.filter((m) => !m.isDone).length}
        />
      )}

      {/* MODALS */}
      {/* 1. Batch Photo Intake Modal */}
      <BatchPhotoIntakeModal
        isOpen={isBatchIntakeOpen}
        onClose={() => setIsBatchIntakeOpen(false)}
        currentContainerId={currentContainerId}
        currentContainerName={currentContainerName}
        onSaveBatch={handleSaveBatchNodes}
      />

      {/* 2. Full Item/Container Edit Modal */}
      <ItemEditModal
        isOpen={isItemEditOpen}
        onClose={() => {
          setIsItemEditOpen(false);
          setNodeToEdit(null);
        }}
        nodeToEdit={nodeToEdit}
        currentContainerId={currentContainerId}
        allNodes={nodes}
        onSaveNode={handleSaveNode}
        onDeleteNode={handleDeleteNode}
        onDrillIntoContainer={(cid) => {
          setCurrentContainerId(cid);
          handleTabChange('containers');
        }}
      />

      {/* 3. Barcode & QR Camera Scanner */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanResult={handleScanResult}
      />

      {/* 4. Visual Search with Parent-Child Picture Chain */}
      <VisualSearchModal
        isOpen={isVisualSearchOpen}
        onClose={() => setIsVisualSearchOpen(false)}
        nodes={visibleNodes}
        onSelectNode={(node) => {
          setNodeToEdit(node);
          setIsItemEditOpen(true);
        }}
        onNavigateToContainer={(cid) => {
          setCurrentContainerId(cid);
          handleTabChange('containers');
        }}
      />

      {/* 5. Printable Container Label with QR Code */}
      <PrintableLabelModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintNode(null);
        }}
        targetNode={printNode}
      />

      {/* 6. Feature Suggestions Modal */}
      <SuggestionsModal
        isOpen={isSuggestionsOpen}
        onClose={() => setIsSuggestionsOpen(false)}
        onApplyFeature={(featKey) => {
          if (featKey === 'shopping') {
            handleTabChange('dashboard');
          }
        }}
      />

      {/* 7. Gemini AI Household Assistant Modal */}
      <GeminiAssistantModal
        isOpen={isGeminiOpen}
        onClose={() => setIsGeminiOpen(false)}
        nodes={nodes}
        onSelectNode={(node) => {
          setNodeToEdit(node);
          setIsItemEditOpen(true);
        }}
        onNavigateToContainer={(cid) => {
          setCurrentContainerId(cid);
          handleTabChange('containers');
        }}
      />

      {/* 8. Dedicated Photo Gallery Modal */}
      <PhotoGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        nodes={nodes}
      />

      {/* 9. Accounts, Passwords & Multiple Spaces Modal */}
      <AccountSpaceModal
        isOpen={isAccountSpaceModalOpen}
        onClose={() => setIsAccountSpaceModalOpen(false)}
        nodes={nodes}
        activeUser={activeUser}
        onChangeActiveUser={(u) => {
          setActiveUser(u);
          saveActiveUser(u);
        }}
        activeSpaceId={activeSpaceId}
        onChangeActiveSpace={(sId) => {
          setActiveSpaceId(sId);
          saveActiveSpaceId(sId);
        }}
        unlockedContainerIds={unlockedContainerIds}
        onUnlockContainer={handleUnlockContainer}
      />
    </div>
  );
}
