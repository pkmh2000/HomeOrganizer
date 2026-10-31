import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  Share2,
  Cloud,
  Check,
  AlertTriangle,
  RotateCcw,
  Copy,
  FolderDown,
  Layers,
  X,
  Shield,
  Smartphone,
  WifiOff,
  RefreshCw,
  Cpu,
  Bookmark,
  Trash2,
  HardDrive,
  FileCode,
  ArrowRight,
  Plus,
  Server,
  ArrowRightLeft,
  Palette,
  LogOut,
  Sliders,
  Sparkles,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { InventoryNode, FamilyMemo, HouseholdData, LocalSnapshot, ExportDestination, UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { DatabaseDestinationManager } from './DatabaseDestinationManager';
import {
  exportFullHousehold,
  exportContainerSubtree,
  saveNodes,
  saveMemos,
  INITIAL_SAMPLE_NODES,
  INITIAL_SAMPLE_MEMOS,
  loadSnapshots,
  saveSnapshot,
  deleteSnapshot,
  loadExportDestination,
  saveExportDestination,
  APP_VERSION,
} from '../utils/storage';
import { checkOnlineUpdate, performSmoothUpdate } from '../utils/versionCheck';
import {
  PhotoEditorPreference,
  loadPhotoEditorPreference,
  clearPhotoEditorPreference,
  getPhotoEditorDisplayName,
} from '../utils/photoEditorManager';
import { PhotoEditorSelectorModal } from './PhotoEditorSelectorModal';

interface BackupShareModalProps {
  nodes: InventoryNode[];
  memos: FamilyMemo[];
  members: string[];
  householdName: string;
  activeUserEmail?: string;
  activeUser?: UserProfile;
  onUpdateHouseholdName: (name: string) => void;
  onRestoreData: (nodes: InventoryNode[], memos: FamilyMemo[]) => void;
  onClose: () => void;
  onLogout?: () => void;
}

export const BackupShareModal: React.FC<BackupShareModalProps> = ({
  nodes,
  memos,
  members,
  householdName,
  activeUserEmail,
  activeUser,
  onUpdateHouseholdName,
  onRestoreData,
  onClose,
  onLogout,
}) => {
  const [copied, setCopied] = useState(false);
  const [dataCopied, setDataCopied] = useState(false);
  const [selectedExportContainerId, setSelectedExportContainerId] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'latest' | 'available'>('idle');
  const [updateMsg, setUpdateMsg] = useState<string>('');

  // Default export destination preference
  const [exportDest, setExportDest] = useState<ExportDestination>(() => loadExportDestination());

  // Local Snapshots
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>(() => loadSnapshots());
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Paste code restore
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pastedJson, setPastedJson] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerNodes = nodes.filter((n) => n.type === 'container');

  const handleDestinationChange = (dest: ExportDestination) => {
    setExportDest(dest);
    saveExportDestination(dest);
  };

  // Full export
  const handleExportFull = () => {
    const jsonStr = exportFullHousehold(nodes, memos, members, householdName);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${householdName}-完整家庭收納備份-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Single container export
  const handleExportSingleContainer = () => {
    if (!selectedExportContainerId) return;
    const target = nodes.find((n) => n.id === selectedExportContainerId);
    if (!target) return;

    const jsonStr = exportContainerSubtree(nodes, selectedExportContainerId);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${target.name}-個別收納箱備份.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Create new local snapshot
  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const data: HouseholdData = {
      version: '2.0',
      householdName,
      exportedAt: new Date().toISOString(),
      nodes,
      memos,
      members,
    };
    saveSnapshot(newSnapshotName, data);
    setSnapshots(loadSnapshots());
    setNewSnapshotName('');
    setIsCreatingSnapshot(false);
    setImportStatus('已成功建立本機版本快照！');
  };

  // Restore from snapshot
  const handleRestoreSnapshot = (snap: LocalSnapshot) => {
    if (confirm(`確定要還原至快照「${snap.name}」嗎？（共 ${snap.nodeCount} 個物件）`)) {
      onRestoreData(snap.data.nodes, snap.data.memos);
      if (snap.data.householdName) {
        onUpdateHouseholdName(snap.data.householdName);
      }
      setImportStatus(`已成功還原快照「${snap.name}」！`);
    }
  };

  const handleDeleteSnapshot = (id: string, name: string) => {
    if (confirm(`確定要刪除快照「${name}」嗎？`)) {
      deleteSnapshot(id);
      setSnapshots(loadSnapshots());
    }
  };

  // Import JSON file
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        processParsedData(parsed);
      } catch (err) {
        setImportStatus('無法讀取檔案，請確認 JSON 語法正確。');
      }
    };
    reader.readAsText(file);
  };

  // Process parsed data for both file and pasted JSON
  const processParsedData = (parsed: any) => {
    if (parsed.type === 'container_export' && Array.isArray(parsed.nodes)) {
      const existingIds = new Set(nodes.map((n) => n.id));
      const newNodes = [...nodes];
      parsed.nodes.forEach((n: InventoryNode) => {
        if (!existingIds.has(n.id)) {
          newNodes.push(n);
        }
      });
      onRestoreData(newNodes, memos);
      setImportStatus(`成功匯入個別容器「${parsed.rootContainerName}」及 ${parsed.nodes.length} 項內容！`);
    } else if (Array.isArray(parsed.nodes)) {
      onRestoreData(parsed.nodes, parsed.memos || []);
      if (parsed.householdName) {
        onUpdateHouseholdName(parsed.householdName);
      }
      setImportStatus(`成功還原完整家庭資料（共 ${parsed.nodes.length} 個物件/容器）！`);
    } else {
      setImportStatus('檔案格式不相符，請確認為 HomeOrganizer 產生的 JSON 檔案。');
    }
  };

  // Paste code restore
  const handleRestoreFromPasted = () => {
    try {
      const parsed = JSON.parse(pastedJson.trim());
      processParsedData(parsed);
      setPastedJson('');
      setIsPasteOpen(false);
    } catch {
      setImportStatus('貼上的代碼語法不正確，請確認為完整的 JSON 格式。');
    }
  };

  // Share App URL
  const handleShareApp = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'HomeOrganizer 家庭智慧生活收納管家',
          text: '推薦這款專為家庭打造的物品拍照收納、層級容器管理與到期提醒工具！',
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Copy full data bundle JSON
  const handleCopyDataBundle = () => {
    const jsonStr = exportFullHousehold(nodes, memos, members, householdName);
    navigator.clipboard.writeText(jsonStr);
    setDataCopied(true);
    setTimeout(() => setDataCopied(false), 2500);
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await checkOnlineUpdate();
      if (res.hasUpdate) {
        setUpdateStatus('available');
        setUpdateMsg(res.message);
      } else {
        setUpdateStatus('latest');
        setUpdateMsg(res.message);
      }
    } catch {
      setUpdateStatus('latest');
      setUpdateMsg(`目前已是最新版本 v${APP_VERSION}，無須更新。`);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const [subTab, setSubTab] = useState<'destination' | 'backup' | 'editor' | 'system'>('destination');
  const [editorPref, setEditorPref] = useState<PhotoEditorPreference>(() => loadPhotoEditorPreference());
  const [isEditorSelectorOpen, setIsEditorSelectorOpen] = useState(false);
  const [editorNotice, setEditorNotice] = useState<string | null>(null);

  const SAMPLE_TEST_PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#090d16" rx="24"/>
      <rect x="24" y="24" width="552" height="352" fill="#0f172a" rx="16" stroke="#0d9488" stroke-width="3" stroke-dasharray="8 6"/>
      <circle cx="300" cy="170" r="60" fill="#134e4a"/>
      <text x="300" y="180" font-size="64" text-anchor="middle" dominant-baseline="central">📸</text>
      <text x="300" y="270" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="#2dd4bf" text-anchor="middle">照片編輯器調用測試圖</text>
      <text x="300" y="306" font-family="system-ui, sans-serif" font-size="13" fill="#94a3b8" text-anchor="middle">HomeOrganizer Photo Editor Test Sample</text>
    </svg>
  `)}`;

  const handleCancelEditorBinding = () => {
    clearPhotoEditorPreference();
    const updated = loadPhotoEditorPreference();
    setEditorPref(updated);
    setEditorNotice('✅ 已成功解除照片編輯器綁定！下次修圖時將由您自由選擇，避免 App 被移除後無法連結。');
    setTimeout(() => setEditorNotice(null), 4000);
  };

  const handlePerformUpdate = async () => {
    setIsUpdating(true);
    await performSmoothUpdate(nodes);
  };

  const currentHouseholdData: HouseholdData = {
    version: APP_VERSION,
    householdName,
    exportedAt: new Date().toISOString(),
    nodes,
    memos,
    members,
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 pb-36">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileImport}
      />

      {/* SUB-TAB NAVIGATOR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold shadow-md">
        <button
          type="button"
          onClick={() => setSubTab('destination')}
          className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition text-[11px] sm:text-xs ${
            subTab === 'destination'
              ? 'bg-teal-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>資料庫目的地</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('backup')}
          className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition text-[11px] sm:text-xs ${
            subTab === 'backup'
              ? 'bg-teal-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>快照與匯出</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('editor')}
          className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition text-[11px] sm:text-xs ${
            subTab === 'editor'
              ? 'bg-teal-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>修圖綁定與帳號</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('system')}
          className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition text-[11px] sm:text-xs ${
            subTab === 'system'
              ? 'bg-teal-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>離線與更新</span>
        </button>
      </div>

      {/* TAB 1: 資料庫目的地與雲端/NAS搬遷 */}
      {subTab === 'destination' && (
        <div className="space-y-4 animate-fade-in">
          <DatabaseDestinationManager
            householdData={currentHouseholdData}
            activeUserEmail={activeUserEmail}
            onSnapshotCreated={() => setSnapshots(loadSnapshots())}
            onRefreshData={(updatedData) => onRestoreData(updatedData.nodes, updatedData.memos)}
          />
        </div>
      )}

      {/* TAB 3: 離線獨立運作與版本線上更新 */}
      {subTab === 'system' && (
        <div className="space-y-4 animate-fade-in">
          {/* SECTION: SELF-CONTAINED STANDALONE APP & INTEGRATED VERSION UPDATE (備份同步整合線上更新) */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm">自成一體・離線獨立運作與版本狀態</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                目前版本: v{APP_VERSION}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              透過分享連結開啟或安裝至桌面後，<strong>本應用即自成一體</strong>：所有收納資料、照片、條碼與到期排程均完全保存在您的設備本機（雙向 LocalStorage 與 IndexedDB 鏡像，重開機永不丟失）。
            </p>

            <div className="pt-0.5">
              <PWAInstallButton variant="card" />
            </div>

        </div>

        {/* 整合版：線上更新狀態與檢查卡片 */}
        <div className="p-3.5 rounded-2xl bg-slate-950/75 border border-slate-800 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">目前執行版本：</span>
            <span className="font-mono text-teal-400 font-bold">
              v{APP_VERSION} (測試版號 · 正式發布時重置為 v1.0.0)
            </span>
          </div>

          {updateStatus === 'available' ? (
            <div className="p-3 rounded-xl bg-teal-950/60 border border-teal-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ✨ 發現新版本程式可供更新
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  建議升級
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                包含至少 3 步歷史重作 (Redo)、重開持久化照片保護、拍照名稱快捷刪除 (x) 與備份同步整合。
              </p>
              <button
                type="button"
                onClick={handlePerformUpdate}
                disabled={isUpdating}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs shadow transition flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isUpdating ? '正在備份並載入新版...' : '🚀 立即無縫更新（保證 100% 保留現有所有物件與照片）'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {updateStatus === 'latest'
                    ? (updateMsg || `已連線檢查：目前為最新版本 v${APP_VERSION}`)
                    : '已是最新版本，平時離線獨立運作無擾'}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                運行良好
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-400 truncate">
              {isCheckingUpdate ? '正在連線伺服器檢查新版程式碼...' : '點擊右側按鈕連線檢查是否有程式更新'}
            </span>
            <button
              onClick={handleCheckForUpdates}
              disabled={isCheckingUpdate || isUpdating}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-1.5 transition shrink-0 active:scale-95 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? '檢查中...' : '檢查線上更新'}</span>
            </button>
          </div>
        </div>
      </div>
    )}

      {/* TAB 4: 照片編輯器調用綁定管理與帳號登出 */}
      {subTab === 'editor' && (
        <div className="space-y-4 animate-fade-in">
          {/* Notification banner if any */}
          {editorNotice && (
            <div className="p-3.5 rounded-2xl bg-teal-950/90 border border-teal-500/50 text-xs text-teal-200 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{editorNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditorNotice(null)}
                className="text-teal-400 hover:text-white px-2 py-0.5 rounded text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* SECTION 1: PHOTO EDITOR APP BINDING */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-teal-500/40 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">照片編輯器調用與綁定設定</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    拍照收納或物件修圖時調用慣用 App，支援隨時更換或取消
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.8 rounded-full text-[10px] font-bold border ${
                  editorPref.type !== 'ask_every_time'
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {editorPref.type !== 'ask_every_time' ? '🟢 已綁定' : '⚪ 每次詢問'}
              </span>
            </div>

            {/* Current Binding Card */}
            <div className="p-3.5 rounded-2xl bg-slate-850/80 border border-slate-750 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">目前偏好調用方式：</span>
                {editorPref.boundAt && (
                  <span className="text-[10px] text-slate-500">
                    設定於: {new Date(editorPref.boundAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-teal-400 shrink-0">
                  {editorPref.type === 'system_share' && <Smartphone className="w-5 h-5" />}
                  {editorPref.type === 'builtin_canvas' && <Sliders className="w-5 h-5" />}
                  {editorPref.type === 'photopea' && <Sparkles className="w-5 h-5" />}
                  {editorPref.type === 'custom_scheme' && <ExternalLink className="w-5 h-5" />}
                  {editorPref.type === 'ask_every_time' && <Palette className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">
                    {getPhotoEditorDisplayName(editorPref.type, editorPref.customName)}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {editorPref.type === 'system_share' &&
                      '點擊修圖將開啟手機系統原生分享選單，直接發送至 Snapseed、美圖秀秀、Lightroom、iOS照片標註 等。'}
                    {editorPref.type === 'builtin_canvas' &&
                      '點擊修圖直接在應用內開啟畫布，支援旋轉 90°、水平鏡像、調節明暗對比與重點塗鴉。'}
                    {editorPref.type === 'photopea' &&
                      '開啟 Photopea 線上強大修圖網頁，修圖儲存後回傳替換。'}
                    {editorPref.type === 'custom_scheme' &&
                      `調用協議：${editorPref.customScheme || '未填寫'}`}
                    {editorPref.type === 'ask_every_time' &&
                      '每次點擊照片「修圖」時，彈出選單由您自由選擇適合的修圖工具。'}
                  </p>
                </div>
              </div>
            </div>

            {/* Safety Guidance: 防止 App 移除後失效 */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>防失效與更換保障機制</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                若您手機上安裝的修圖 App 曾被移除、更新或想要切換為其他工具，請點擊下方<strong>「更換編輯器」</strong>或<strong>「取消綁定」</strong>。取消綁定後將恢復為「每次詢問」，以確保修圖功能 100% 正常連結不中斷！
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => setIsEditorSelectorOpen(true)}
                className="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>更換照片編輯器</span>
              </button>

              {editorPref.type !== 'ask_every_time' && (
                <button
                  type="button"
                  onClick={handleCancelEditorBinding}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 hover:text-white border border-amber-500/30 font-semibold text-xs transition active:scale-95 flex items-center justify-center gap-1.5"
                  title="解除固定綁定，恢復每次詢問"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>取消綁定 (恢復每次詢問)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsEditorSelectorOpen(true)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-semibold text-xs transition active:scale-95 flex items-center justify-center gap-1.5"
                title="以測試範例照片體驗調用流程"
              >
                <span>測試調用</span>
              </button>
            </div>
          </div>

          {/* SECTION 2: USER ACCOUNT & LOGOUT (增加 logout 的機制) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-850 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">帳戶登出與安全鎖定 (Logout)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    登出後安全鎖定收納庫，防止共用裝置隱私外洩
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.8 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                已登入運行中
              </span>
            </div>

            {/* User Account Info */}
            <div className="p-3.5 rounded-2xl bg-slate-850/80 border border-slate-750 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeUser?.avatar || '👤'}</span>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{activeUser?.name || '收納使用者'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-mono">
                      {activeUserEmail || '已綁定帳號'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    支援生物辨識 (Touch ID / Face ID) 快速解鎖登入
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-400 leading-relaxed">
              💡 <strong>登出說明</strong>：按下「登出帳號」後，目前會話將安全鎖定。下次進入需再次輸入密碼或通過指紋/人臉辨識驗證，並可在登入頁隨時切換登入其他 Email 信箱帳號。
            </div>

            {/* Logout Action Button */}
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `確定要登出目前帳號「${activeUser?.name || activeUserEmail || '使用者'}」嗎？\n登出後資料庫將安全鎖定，需重新驗證身分登入。`
                  )
                ) {
                  onLogout?.();
                }
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
            >
              <LogOut className="w-4 h-4 stroke-[2.5]" />
              <span>🚪 登出當前帳戶 (Logout)</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: 備份匯出與版本快照庫 */}
      {subTab === 'backup' && (
        <div className="space-y-4 animate-fade-in">

          {/* SECTION: DEFAULT STORAGE DESTINATION (用戶要求：匯出匯入 default 要同一地方，或可選定存檔目的地) */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-teal-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-teal-400" />
                <span>預設存檔目的地 (Default Destination)</span>
              </h3>

          <span className="text-[11px] text-teal-300 font-semibold">自訂匯出/匯入偏好</span>
        </div>
        <p className="text-xs text-slate-400">
          設定您預設習慣的備份與還原方式，匯出與匯入將自動導向同一目標：
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
          <button
            onClick={() => handleDestinationChange('local_snapshot')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
              exportDest === 'local_snapshot'
                ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-bold'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Bookmark className="w-4 h-4 text-teal-400" />
              <span>本機快照庫存檔</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">
              推薦首選：免下載檔案，一鍵隨時存檔與秒還原
            </span>
          </button>

          <button
            onClick={() => handleDestinationChange('download_json')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
              exportDest === 'download_json'
                ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-bold'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Download className="w-4 h-4 text-sky-400" />
              <span>實體 JSON 檔案</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">
              下載檔案至手機或電腦儲存空間，適合跨裝置備份
            </span>
          </button>

          <button
            onClick={() => handleDestinationChange('clipboard_code')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
              exportDest === 'clipboard_code'
                ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-bold'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Copy className="w-4 h-4 text-purple-400" />
              <span>複製文字代碼</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">
              直接將資料複製至剪貼簿，LINE/訊息快速轉移
            </span>
          </button>
        </div>
      </div>

      {/* SECTION: LOCAL SNAPSHOTS REPOSITORY */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-teal-400" />
              <span>本機版本快照存檔庫 ({snapshots.length} 份存檔)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              大掃除前、換季或借還物品前存檔，可隨時一鍵秒還原
            </p>
          </div>
          <button
            onClick={() => setIsCreatingSnapshot(true)}
            className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>建立新快照</span>
          </button>
        </div>

        {isCreatingSnapshot && (
          <form onSubmit={handleCreateSnapshot} className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 space-y-2.5">
            <label className="text-xs font-bold text-slate-300">快照備忘名稱</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSnapshotName}
                onChange={(e) => setNewSnapshotName(e.target.value)}
                placeholder="例如: 2026 年底大掃除前、搬新辦公室前存檔..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
              >
                保存存檔
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingSnapshot(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-700 text-slate-300 text-xs"
              >
                取消
              </button>
            </div>
          </form>
        )}

        {snapshots.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4 bg-slate-950/40 rounded-xl">
            目前尚無本機快照。點選上方「建立新快照」可立即保存目前全部資料。
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/70 flex items-center justify-between text-xs"
              >
                <div>
                  <h4 className="font-bold text-slate-200">{snap.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(snap.createdAt).toLocaleString('zh-TW')} • 共 {snap.nodeCount} 個物件 / {snap.memoCount} 則備忘
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestoreSnapshot(snap)}
                    className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 font-bold hover:bg-teal-500/30 border border-teal-500/30 transition"
                  >
                    一鍵還原
                  </button>
                  <button
                    onClick={() => handleDeleteSnapshot(snap.id, snap.name)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: FULL FILE BACKUP & IMPORT */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <Download className="w-4 h-4 text-teal-400" />
          <span>完整家庭檔案管理 (JSON 檔案 / 文字代碼)</span>
        </h3>
        <p className="text-xs text-slate-400">
          包含全部收納空間、子容器、物件、照片、保固、過期日與家庭備忘錄。
        </p>

        {importStatus && (
          <div className="p-3 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleExportFull}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>下載完整備份 JSON</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>從檔案匯入 JSON</span>
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopyDataBundle}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center justify-center gap-1.5 transition"
          >
            {dataCopied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{dataCopied ? '已將完整資料複製！' : '複製文字備份碼'}</span>
          </button>

          <button
            onClick={() => setIsPasteOpen((prev) => !prev)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold border border-slate-700 flex items-center gap-1"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>貼上代碼還原</span>
          </button>
        </div>

        {isPasteOpen && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="text-xs text-slate-300 font-semibold">貼上完整備份 JSON 代碼：</label>
            <textarea
              rows={4}
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              placeholder='在此貼上 {"version":"2.0", "householdName": ...} 代碼...'
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsPasteOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-400"
              >
                取消
              </button>
              <button
                disabled={!pastedJson.trim()}
                onClick={handleRestoreFromPasted}
                className="px-4 py-1.5 rounded-lg bg-teal-500 disabled:opacity-40 text-slate-950 font-bold text-xs"
              >
                解析並還原
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION: SINGLE CONTAINER EXPORT */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <FolderDown className="w-4 h-4 text-indigo-400" />
          <span>個別收納容器導出 (單獨分享某個箱子/房間)</span>
        </h3>
        <p className="text-xs text-slate-400">
          可單獨挑選客廳、工具箱或某個置物盒，導出成獨立的 JSON 文件傳給特定家人。
        </p>

        <div className="space-y-2">
          <select
            value={selectedExportContainerId}
            onChange={(e) => setSelectedExportContainerId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none"
          >
            <option value="">-- 請選取要個別導出的容器 --</option>
            {containerNodes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportSingleContainer}
            disabled={!selectedExportContainerId}
            className="w-full py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 disabled:bg-slate-800 disabled:text-slate-600 text-indigo-200 border border-indigo-500/40 text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>導出選取之個別容器文件</span>
          </button>
        </div>
      </div>
    </div>
  )}

      {/* SECTION: SHARE APP LINK (Always accessible or in backup/system) */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">

          <Share2 className="w-4 h-4 text-emerald-400" />
          <span>分享應用程式連結給家人</span>
        </h3>
        <p className="text-xs text-slate-400">
          傳送此連結給家人，家人在手機點開即可直接成為其專屬管家，支援離線與更新。
        </p>

        <button
          onClick={handleShareApp}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
        >
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? '已複製應用連結到剪貼簿！' : '分享此專屬網頁版 APP 連結'}</span>
        </button>
      </div>

      {/* SECTION: RESET DEMO DATA */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
        <div>
          <span className="font-bold text-slate-300 text-xs block">範例資料重置</span>
          <span className="text-[11px] text-slate-500">重新載入豐富的預設家庭物品與容器清單</span>
        </div>
        <button
          onClick={() => {
            if (confirm('確定要重新載入系統預設示範資料嗎？')) {
              onRestoreData(INITIAL_SAMPLE_NODES, INITIAL_SAMPLE_MEMOS);
              setImportStatus('已還原為示範資料！');
            }
          }}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>重置範例</span>
        </button>
      </div>

      {/* Photo Editor Selector Modal for Settings */}
      {isEditorSelectorOpen && (
        <PhotoEditorSelectorModal
          isOpen={isEditorSelectorOpen}
          photoUrl={SAMPLE_TEST_PHOTO}
          onPhotoUpdated={(updated) => {
            const fresh = loadPhotoEditorPreference();
            setEditorPref(fresh);
            setEditorNotice('✅ 照片編輯器偏好設定已更新！');
            setTimeout(() => setEditorNotice(null), 3500);
            setIsEditorSelectorOpen(false);
          }}
          onClose={() => {
            const fresh = loadPhotoEditorPreference();
            setEditorPref(fresh);
            setIsEditorSelectorOpen(false);
          }}
        />
      )}
    </div>
  );
};
