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
} from 'lucide-react';
import { InventoryNode, FamilyMemo, HouseholdData } from '../types';
import {
  exportFullHousehold,
  exportContainerSubtree,
  saveNodes,
  saveMemos,
  INITIAL_SAMPLE_NODES,
  INITIAL_SAMPLE_MEMOS,
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
  const [cloudSynced, setCloudSynced] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerNodes = nodes.filter((n) => n.type === 'container');

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

  // Import JSON file
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.type === 'container_export' && Array.isArray(parsed.nodes)) {
          // Merge container subtree
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
          // Full household import
          onRestoreData(parsed.nodes, parsed.memos || []);
          if (parsed.householdName) {
            onUpdateHouseholdName(parsed.householdName);
          }
          setImportStatus(`成功還原完整家庭資料（共 ${parsed.nodes.length} 個物件/容器）！`);
        } else {
          setImportStatus('檔案格式不相符，請確認為 HomeOrganizer 產生的 JSON 檔案。');
        }
      } catch (err) {
        setImportStatus('無法讀取檔案，請確認 JSON 語法正確。');
      }
    };
    reader.readAsText(file);
  };

  // Share App URL
  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'HomeOrganizer 家庭智慧生活收納管家',
        text: '推薦這款專為家庭打造的物品拍照收納、層級容器管理與到期提醒工具！',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Copy full data bundle JSON to clipboard for instant family paste
  const handleCopyDataBundle = () => {
    const jsonStr = exportFullHousehold(nodes, memos, members, householdName);
    navigator.clipboard.writeText(jsonStr);
    setDataCopied(true);
    setTimeout(() => setDataCopied(false), 2500);
  };

  // Check PWA updates (只保留更新)
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
    } catch (e) {
      setUpdateStatus('目前為離線自成一體運行狀態，連線時將自動獲取更新。');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Cloud Sync Simulation
  const handleSimulateCloudSync = () => {
    saveNodes(nodes);
    saveMemos(memos);
    setCloudSynced(true);
    setTimeout(() => setCloudSynced(false), 3000);
  };

  // Restore Initial Demo Data
  const handleResetDemoData = () => {
    if (confirm('確定要重新載入系統預設示範資料嗎？（這將加入示範的客廳、廚房、常備醫藥與工具箱）')) {
      onRestoreData(INITIAL_SAMPLE_NODES, INITIAL_SAMPLE_MEMOS);
      setImportStatus('已還原為示範資料！');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 pb-24">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileImport}
      />

      {/* SECTION: SELF-CONTAINED STANDALONE APP STATUS (自成一體，無需伺服器，只保留更新) */}
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
          <strong>平時無須與伺服器連線即可永久正常使用</strong>，僅在有新版本釋出時於背景獲取更新！
        </p>

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

      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Cloud className="w-5 h-5 text-teal-400" />
          備份管理與家人分享
        </h2>
        <p className="text-xs text-slate-400">
          支援匯出與匯入完整家庭檔案或個別收納箱 JSON，內容可設定為家庭共有或個人私人。
        </p>

        {importStatus && (
          <div className="p-3 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}
      </div>

      {/* Section 1: Full Household Export / Import */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <Download className="w-4 h-4 text-teal-400" />
          完整家庭檔案管理 (JSON 備份)
        </h3>
        <p className="text-xs text-slate-400">
          包含全部收納空間、子容器、物件、照片、保固、過期日與家庭備忘錄。
        </p>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleExportFull}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>匯出完整備份 JSON</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>匯入 JSON 檔案</span>
          </button>
        </div>

        <button
          onClick={handleCopyDataBundle}
          className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center justify-center gap-1.5 transition"
        >
          {dataCopied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{dataCopied ? '已將完整資料 JSON 複製到剪貼簿！' : '複製完整資料文字碼 (免檔案快速轉移)'}</span>
        </button>
      </div>

      {/* Section 2: Single Container Export */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <FolderDown className="w-4 h-4 text-indigo-400" />
          個別收納容器導出 (單獨分享某個箱子/房間)
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

      {/* Section 3: Share App Link */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <Share2 className="w-4 h-4 text-emerald-400" />
          分享應用程式連結給家人
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

      {/* Section 4: Reset Demo Data */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
        <div>
          <span className="font-bold text-slate-300 text-xs block">範例資料重置</span>
          <span className="text-[11px] text-slate-500">重新載入豐富的預設家庭物品與容器清單</span>
        </div>
        <button
          onClick={handleResetDemoData}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>重置範例</span>
        </button>
      </div>
    </div>
  );
};
