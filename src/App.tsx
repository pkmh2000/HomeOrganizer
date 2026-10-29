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
  loadStagingDrafts,
  checkAndRestoreFromIndexedDb,
  getSyncChannel,
} from './utils/storage';
import { useUndoHistory } from './hooks/useUndoHistory';
import { useMobileBackGesture } from './hooks/useMobileBackGesture';
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
import { UserLoginModal } from './components/UserLoginModal';
import { getActiveAuthSession, logoutCurrentSession, AuthAccount } from './utils/authManager';
import { TransferPayload } from './components/NodeTransferModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  WifiOff,
  Camera,
  Plus,
  AlertTriangle,
  PanelBottomOpen,
  Layers,
  RotateCcw,
  RotateCw,
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

  // User Authentication & Session (初次啟動或再進 app 需登入，支援記住帳密與生物辨識)
  const [authSession, setAuthSession] = useState(() => getActiveAuthSession());

  // User Accounts & Multi-Spaces State
  const [activeUser, setActiveUser] = useState<UserProfile>(() => {
    const session = getActiveAuthSession();
    const base = loadActiveUser();
    if (session.account) {
      return {
        ...base,
        name: session.account.name,
        avatar: session.account.avatar || '👤',
        email: session.account.email,
      };
    }
    return base;
  });
  const [activeSpaceId, setActiveSpaceId] = useState<string>(() => loadActiveSpaceId());
  const [spaces, setSpaces] = useState<StorageSpace[]>(() => loadSpaces());
  const [unlockedContainerIds, setUnlockedContainerIds] = useState<Set<string>>(new Set());
  const [openUnfiledInbox, setOpenUnfiledInbox] = useState(false);
  const [stagingCount, setStagingCount] = useState<number>(() => loadStagingDrafts().length);
  // Default to false: prevents false alarm "怎麼一直有更新通知"
  const [hasUpdateAvailable, setHasUpdateAvailable] = useState<boolean>(false);

  const handleLoginSuccess = (account: AuthAccount) => {
    setAuthSession({ isAuthenticated: true, account });
    setActiveUser((prev) => ({
      ...prev,
      name: account.name,
      avatar: account.avatar || '👤',
      email: account.email,
    }));
    setSyncToastMessage(`👋 歡迎回來，${account.name}！已安全登入個人收納帳戶。`);
  };

  const handleLogout = () => {
    logoutCurrentSession();
    setAuthSession({ isAuthenticated: false, account: null });
    setIsAccountSpaceModalOpen(false);
  };

  // Undo / Redo History Stack (at least 3 steps, supported up to 20 steps)
  const {
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    toastMessage,
    recordHistory,
    undo,
    redo,
    dismissToast,
  } = useUndoHistory(20);

  // UI Navigation State: 開啟 app 優先進入「空間收納」畫面
  const [activeTab, setActiveTab] = useState<ViewTab>('containers');
  const [currentContainerId, setCurrentContainerId] = useState<string | null>(null);
  const [showPrivate, setShowPrivate] = useState<boolean>(true);

  // Pure View Mode: Hides bottom navigation bar so view area is 100% unobstructed!
  const [pureViewMode, setPureViewMode] = useState<boolean>(false);

  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab);
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

  // Multi-Tab & Sync Notification State
  const [isDuplicateTabOpen, setIsDuplicateTabOpen] = useState(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Auto-dismiss sync toast after 3 seconds
  useEffect(() => {
    if (!syncToastMessage) return;
    const timer = setTimeout(() => {
      setSyncToastMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [syncToastMessage]);

  const isInitializedRef = React.useRef(false);

  // 1. Initial Launch: Verify if IndexedDB contains user records or photos (prevents data loss on PWA updates/restarts)
  useEffect(() => {
    checkAndRestoreFromIndexedDb().then((restored) => {
      isInitializedRef.current = true;
      if (restored) {
        setNodes(restored);
      }
    }).catch(() => {
      isInitializedRef.current = true;
    });

    // Check genuine ServiceWorker updates quietly in the background without false notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        if (reg.waiting) {
          setHasUpdateAvailable(true);
        }
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setHasUpdateAvailable(true);
              }
            });
          }
        });
      }).catch(() => {});
    }
  }, []);

  // 2. Multi-Tab Detection & Real-Time Syncing (BroadcastChannel + storage event + visibilitychange)
  useEffect(() => {
    const myTabId = 'tab-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const channel = getSyncChannel();

    if (channel) {
      // Broadcast discovery ping
      channel.postMessage({ type: 'PING_TAB', tabId: myTabId });

      channel.onmessage = (e) => {
        const data = e.data;
        if (!data || !data.type) return;

        if (data.type === 'PING_TAB' && data.tabId !== myTabId) {
          // Another tab just opened, answer PONG so it knows an instance is running
          channel.postMessage({ type: 'PONG_TAB', tabId: myTabId });
        } else if (data.type === 'PONG_TAB' && data.tabId !== myTabId) {
          // Detected that another tab is open in this browser
          setIsDuplicateTabOpen(true);
        } else if (data.type === 'nodes') {
          // Another tab updated items -> live sync to prevent overwriting
          const fresh = loadNodes();
          setNodes(fresh);
          setSyncToastMessage('🔄 已自動即時同步最新收納物件');
        } else if (data.type === 'memos') {
          const fresh = loadMemos();
          setMemos(fresh);
        }
      };
    }

    // Storage event fallback (guaranteed cross-tab synchronization)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'homeorganizer_nodes_v2' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) {
            setNodes(updated);
            setSyncToastMessage('🔄 已自動即時同步最新收納物件');
          }
        } catch {}
      }
      if (e.key === 'homeorganizer_memos_v2' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) setMemos(updated);
        } catch {}
      }
    };

    // When returning to app window or unlocking phone, refresh state
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const fresh = loadNodes();
        if (fresh.length !== nodes.length) {
          setNodes(fresh);
        }
        setStagingCount(loadStagingDrafts().length);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [nodes.length]);

  // Sync to local storage & IndexedDB only after initial restoration check
  useEffect(() => {
    if (!isInitializedRef.current) return;
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

  // Mobile Back Gesture Handler:
  // 1. Closes any open modal/lightbox/editor/scanner.
  // 2. Navigates up to parent container if inside a folder.
  // 3. Double-back to exit protection at root.
  const hasOpenModal = Boolean(
    isBatchIntakeOpen ||
    isItemEditOpen ||
    isScannerOpen ||
    isVisualSearchOpen ||
    isPrintModalOpen ||
    isSuggestionsOpen ||
    isGeminiOpen ||
    isGalleryOpen ||
    isAccountSpaceModalOpen ||
    openUnfiledInbox
  );

  const handleCloseTopModal = () => {
    if (isItemEditOpen) {
      setIsItemEditOpen(false);
      setNodeToEdit(null);
    } else if (isBatchIntakeOpen) {
      setIsBatchIntakeOpen(false);
    } else if (isScannerOpen) {
      setIsScannerOpen(false);
    } else if (isVisualSearchOpen) {
      setIsVisualSearchOpen(false);
    } else if (isPrintModalOpen) {
      setIsPrintModalOpen(false);
      setPrintNode(null);
    } else if (isSuggestionsOpen) {
      setIsSuggestionsOpen(false);
    } else if (isGeminiOpen) {
      setIsGeminiOpen(false);
    } else if (isGalleryOpen) {
      setIsGalleryOpen(false);
    } else if (isAccountSpaceModalOpen) {
      setIsAccountSpaceModalOpen(false);
    } else if (openUnfiledInbox) {
      setOpenUnfiledInbox(false);
    }
  };

  const handleNavigateUp = () => {
    if (currentContainerId) {
      const current = nodes.find((n) => n.id === currentContainerId);
      setCurrentContainerId(current?.parentId || null);
    }
  };

  useMobileBackGesture({
    hasOpenModal,
    onCloseTopModal: handleCloseTopModal,
    currentContainerId,
    onNavigateUp: handleNavigateUp,
    onShowToast: (msg) => setSyncToastMessage(msg),
  });

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

  // Redo Handler (至少三次，最高20步)
  const handleRedo = () => {
    const next = redo(nodes);
    if (next) {
      setNodes(next);
    }
  };

  // Save new batch photos into current container or unfiled inbox
  const handleSaveBatchNodes = (
    newNodes: InventoryNode[],
    targetDestinationId: string | null | 'inbox' = 'inbox'
  ) => {
    recordHistory(nodes, `批次存入 ${newNodes.length} 張照片物件`);
    const updated = [...nodes, ...newNodes];
    saveNodes(updated);
    setNodes(updated);
    setActiveTab('containers');

    const destLabel =
      targetDestinationId === 'inbox'
        ? '未歸檔收件匣'
        : targetDestinationId === 'current'
        ? currentContainerName
        : targetDestinationId === 'root'
        ? '全家總覽空間'
        : nodes.find((n) => n.id === targetDestinationId)?.name || '指定容器';

    if (targetDestinationId === 'inbox') {
      setCurrentContainerId(null);
      setOpenUnfiledInbox(true);
    } else {
      setOpenUnfiledInbox(false);
      if (targetDestinationId === 'root') {
        setCurrentContainerId(null);
      } else if (targetDestinationId && targetDestinationId !== 'current') {
        setCurrentContainerId(targetDestinationId);
        // If container belongs to a specific space, align activeSpaceId so user sees the newly deposited item
        const destContainer = updated.find((n) => n.id === targetDestinationId);
        if (destContainer?.spaceId && destContainer.spaceId !== activeSpaceId) {
          setActiveSpaceId(destContainer.spaceId);
          saveActiveSpaceId(destContainer.spaceId);
        }
      }
    }

    setSyncToastMessage(`🎉 已成功存入 ${newNodes.length} 項物件至「${destLabel}」！`);
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

      {/* Multi-Tab Open Warning (App 在手機如果已開啟, 不要再開, 會影響更新或前一分頁編輯 誤以為消失等異狀) */}
      {isDuplicateTabOpen && (
        <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border-b border-amber-500/60 px-3 py-2 text-xs text-amber-200 flex items-center justify-between gap-2 z-50 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              <strong>提醒</strong>：手機中已開啟另一個分頁！本頁已自動即時同步最新資料，建議關閉多餘分頁以避免重複操作。
            </span>
          </div>
          <button
            onClick={() => setIsDuplicateTabOpen(false)}
            className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold shrink-0 border border-amber-500/40 text-[11px]"
          >
            知道了 ✕
          </button>
        </div>
      )}

      {/* Real-time Cross-tab Sync & Mobile Gesture Toast */}
      {syncToastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] sm:max-w-md px-3.5 py-2 rounded-2xl bg-teal-950/95 border border-teal-400 text-teal-200 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2">
          <span>{syncToastMessage}</span>
          <button
            onClick={() => setSyncToastMessage(null)}
            className="p-0.5 text-teal-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Navbar with Compact Function Header & Auto-collapsing Menu */}
      <Navbar
        householdName={householdName}
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        showPrivate={showPrivate}
        onToggleShowPrivate={() => setShowPrivate((p) => !p)}
        onOpenSearch={() => setIsVisualSearchOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenSuggestions={() => setIsSuggestionsOpen(true)}
        onOpenGemini={() => setIsGeminiOpen(true)}
        expiringAlertCount={expiringCount}
        memoCount={memos.filter((m) => !m.isDone).length}
        currentContainerName={currentContainerName}
        currentContainerId={currentContainerId}
        onBackContainer={handleBackContainer}
        onUndo={handleUndo}
        canUndo={canUndo}
        undoCount={undoCount}
        onRedo={handleRedo}
        canRedo={canRedo}
        redoCount={redoCount}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenAccountSpace={() => setIsAccountSpaceModalOpen(true)}
        hasUpdateAvailable={hasUpdateAvailable}
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
            stagingCount={stagingCount}
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
            activeUserEmail={authSession.account?.email}
            onUpdateHouseholdName={setHouseholdName}
            onRestoreData={handleRestoreData}
            onClose={() => handleTabChange('dashboard')}
          />
        )}

        {/* Pure View Mode Quick Restore Pill (when pureViewMode is active) */}
        {pureViewMode && (
          <button
            onClick={() => setPureViewMode(false)}
            title="退出純淨全螢幕檢視，還原底部功能導航列"
            className="fixed bottom-5 right-5 z-40 px-3.5 py-2 rounded-full bg-slate-900/95 border border-teal-500/50 text-teal-300 hover:text-white font-bold text-xs shadow-2xl flex items-center gap-1.5 backdrop-blur-md transition active:scale-95"
          >
            <Eye className="w-4 h-4" />
            <span>退出純淨模式</span>
          </button>
        )}
      </main>

      {/* Floating Undo & Redo Toast Notification (至少3次，最高20步) */}
      {toastMessage && (
        <div className="fixed bottom-22 sm:bottom-18 left-1/2 -translate-x-1/2 z-50 bg-slate-900/98 border border-teal-500/70 text-slate-100 text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-fade-in max-w-md w-full mx-auto">
          <span className="truncate flex-1 font-medium">{toastMessage}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {canUndo && (
              <button
                onClick={handleUndo}
                className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 shadow flex items-center gap-1"
                title={`復原 (${undoCount} 步可用)`}
              >
                <RotateCcw className="w-3 h-3 stroke-[3]" />
                <span>復原 ({undoCount})</span>
              </button>
            )}
            {canRedo && (
              <button
                onClick={handleRedo}
                className="px-2.5 py-1 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition active:scale-95 shadow flex items-center gap-1"
                title={`重做 (${redoCount} 步可用)`}
              >
                <RotateCw className="w-3 h-3 stroke-[3]" />
                <span>重做 ({redoCount})</span>
              </button>
            )}
          </div>
          <button
            onClick={dismissToast}
            className="text-slate-400 hover:text-white p-1 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 常駐手機與平板底部導航列 (清晰切換功能，非純淨模式時常駐顯示) */}
      {!pureViewMode && (
        <BottomNav
          activeTab={activeTab}
          onChangeTab={handleTabChange}
          onOpenBatchIntake={() => setIsBatchIntakeOpen(true)}
          expiringAlertCount={expiringCount}
          memoCount={memos.filter((m) => !m.isDone).length}
          stagingCount={stagingCount}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onOpenAccountSpace={() => setIsAccountSpaceModalOpen(true)}
          onOpenSearch={() => setIsVisualSearchOpen(true)}
          onOpenGemini={() => setIsGeminiOpen(true)}
          pureViewMode={pureViewMode}
          onTogglePureViewMode={() => setPureViewMode((p) => !p)}
        />
      )}

      {/* MODALS */}
      {/* 1. Batch Photo Intake Modal */}
      <BatchPhotoIntakeModal
        isOpen={isBatchIntakeOpen}
        onClose={() => setIsBatchIntakeOpen(false)}
        currentContainerId={currentContainerId}
        currentContainerName={currentContainerName}
        allNodes={nodes}
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        onSaveBatch={handleSaveBatchNodes}
        onStagingCountChange={(count) => setStagingCount(count)}
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
        members={members}
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
        onMembersChange={setMembers}
        onLogout={handleLogout}
      />

      {/* 10. User Login / Security Gate (初次進入或再進 app 需登入，記住帳密與生物辨識) */}
      {!authSession.isAuthenticated && (
        <UserLoginModal onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}
