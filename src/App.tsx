import React, { useState, useEffect, useMemo } from 'react';
import { ViewTab, InventoryNode, FamilyMemo } from './types';
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
} from './utils/storage';
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
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { WifiOff, Camera, Plus, PanelBottomOpen, Layers } from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();

  // Primary Data State
  const [nodes, setNodes] = useState<InventoryNode[]>(() => loadNodes());
  const [memos, setMemos] = useState<FamilyMemo[]>(() => loadMemos());
  const [members, setMembers] = useState<string[]>(() => loadMembers());
  const [householdName, setHouseholdName] = useState<string>(() => loadHouseholdName());

  // UI Navigation State
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [currentContainerId, setCurrentContainerId] = useState<string | null>(null);
  const [showPrivate, setShowPrivate] = useState<boolean>(true);

  // Bottom Desk Toggle: Defaults to false so screen real estate is 100% maximized!
  // User requirement: "進入每一個功能 無用的 desk 可以收起 盡量可以操作當下功能"
  const [showBottomDesk, setShowBottomDesk] = useState<boolean>(false);

  const toggleBottomDesk = () => {
    setShowBottomDesk((prev) => !prev);
  };

  // When changing tab, auto-collapse desk so the target function is fully operable
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

  // Filter nodes according to privacy toggle
  const visibleNodes = useMemo(() => {
    if (showPrivate) return nodes;
    return nodes.filter((n) => !n.isPrivate);
  }, [nodes, showPrivate]);

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

  // Save new batch photos into current container
  const handleSaveBatchNodes = (newNodes: InventoryNode[]) => {
    setNodes((prev) => [...prev, ...newNodes]);
    setActiveTab('containers');
    setShowBottomDesk(false);
  };

  // Save or update an item/container
  const handleSaveNode = (savedNode: InventoryNode) => {
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

  // Delete node and its subtree
  const handleDeleteNode = (nodeId: string) => {
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

  // Fast toggle between container and item
  const handleToggleNodeType = (targetNode: InventoryNode) => {
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
      />

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

        {/* Floating Controls when bottom desk is closed (User request: 無用的 desk 平時收起，需要才開啟) */}
        {!showBottomDesk && (
          <div className="fixed bottom-5 inset-x-0 z-30 flex items-center justify-between px-4 pointer-events-none">
            {/* Left: Open Desk Toggle Pill */}
            <button
              onClick={() => setShowBottomDesk(true)}
              title="開啟功能導航工作盤"
              className="pointer-events-auto h-11 px-3.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-teal-400 font-bold text-xs flex items-center gap-1.5 shadow-xl border border-slate-700/80 active:scale-95 transition backdrop-blur-md"
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
      </main>

      {/* Android Mobile Bottom Navigation Desk (Only visible when requested, auto-collapses on tab click) */}
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
    </div>
  );
}
