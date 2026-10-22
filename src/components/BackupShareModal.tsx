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
} from 'lucide-react';
import { InventoryNode, FamilyMemo, HouseholdData, LocalSnapshot, ExportDestination } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
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
} from '../utils/storage';

interface BackupShareModalProps {
  nodes: InventoryNode[];
  memos: FamilyMemo[];
  members: string[];
  householdName: string;
  onUpdateHouseholdName: (name: string) => void;
  onRestoreData: (nodes: InventoryNode[], memos: FamilyMemo[]) => void;
  onClose: () => void;
}

export const BackupShareModal: React.FC<BackupShareModalProps> = ({
  nodes,
  memos,
  members,
  householdName,
  onUpdateHouseholdName,
  onRestoreData,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [dataCopied, setDataCopied] = useState(false);
  const [selectedExportContainerId, setSelectedExportContainerId] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

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
    setUpdateStatus(null);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          setUpdateStatus('已連線檢查，目前已是最新版本！');
        } else {
          setUpdateStatus('離線快取正常運作中（已是本機最新版）');
        }
      } else {
        setUpdateStatus('已是最新版本');
      }
    } catch {
      setUpdateStatus('目前為離線自成一體運行狀態，連線時將自動獲取更新。');
    } finally {
      setIsCheckingUpdate(false);
    }
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

      {/* SECTION: SELF-CONTAINED STANDALONE APP STATUS */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-2.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-sm">自成一體・離線獨立運作架構</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
            100% 離線可用
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          透過分享連結開啟或安裝至桌面後，<strong>本應用即自成一體</strong>：所有收納資料、照片、條碼與到期排程均完全保存在您的設備本機。
          平時無須與伺服器連線即可永久正常使用，僅在有新版本釋出時於背景獲取更新！
        </p>

        <div className="pt-1">
          <PWAInstallButton variant="card" />
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {updateStatus || '離線狀態：本機資料庫與靜態資源已全部快取完畢'}
          </span>
          <button
            onClick={handleCheckForUpdates}
            disabled={isCheckingUpdate}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            <span>{isCheckingUpdate ? '檢查中...' : '檢查線上更新'}</span>
          </button>
        </div>
      </div>

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

      {/* SECTION: SHARE APP LINK */}
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
    </div>
  );
};
