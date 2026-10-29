import {
  Search,
  Lock,
  Unlock,
  Layers,
  ChevronLeft,
  Sparkles,
  RotateCcw,
  RotateCw,
  Image as ImageIcon,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ViewTab, UserProfile } from '../types';

interface NavbarProps {
  householdName: string;
  activeTab: ViewTab;
  onChangeTab?: (tab: ViewTab) => void;
  showPrivate: boolean;
  onToggleShowPrivate: () => void;
  onOpenSearch: () => void;
  onOpenScanner?: () => void;
  onOpenSuggestions?: () => void;
  onOpenGemini: () => void;
  expiringAlertCount?: number;
  memoCount?: number;
  currentContainerName?: string;
  currentContainerId?: string | null;
  onBackContainer?: () => void;
  // Undo & Redo tools (至少3次，最高20步)
  onUndo?: () => void;
  canUndo?: boolean;
  undoCount?: number;
  onRedo?: () => void;
  canRedo?: boolean;
  redoCount?: number;
  hasUpdateAvailable?: boolean;
  onOpenGallery?: () => void;
  onOpenAccountSpace?: () => void;
  activeUser?: UserProfile;
  activeSpaceName?: string;
  pureViewMode?: boolean;
  onTogglePureViewMode?: () => void;
  unfiledCount?: number;
  onOpenUnfiled?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  householdName,
  activeTab,
  showPrivate,
  onToggleShowPrivate,
  onOpenSearch,
  onOpenGemini,
  currentContainerName,
  currentContainerId,
  onBackContainer,
  onUndo,
  canUndo = false,
  undoCount = 0,
  onRedo,
  canRedo = false,
  redoCount = 0,
  hasUpdateAvailable = false,
  onOpenGallery,
  onOpenAccountSpace,
  activeUser,
  activeSpaceName,
  pureViewMode = false,
  onTogglePureViewMode,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex flex-col transition-all select-none">
      {/* 頂部第一排：iOS 狀態與標題顯示列 (專門顯示用，遠離邊角死區與瀏海干擾) */}
      <div className="pt-[max(env(safe-area-inset-top),6px)] px-3.5 py-1.5 flex items-center justify-between gap-2 border-b border-slate-800/40 text-xs">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-xs flex items-center justify-center shrink-0">
            <Layers className="w-3.5 h-3.5 text-slate-950 font-black" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="font-bold text-slate-100 text-xs truncate">
              {activeSpaceName || householdName}
            </span>
            {activeTab === 'containers' && currentContainerId && (
              <>
                <span className="text-slate-600">/</span>
                <span className="text-teal-400 font-semibold truncate text-[11px]">
                  {currentContainerName}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 右側：純顯示狀態標籤 (身分與更新標記，非邊角點擊區) */}
        <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 font-medium flex items-center gap-1">
            <span>{activeUser?.avatar || '👤'}</span>
            <span className="max-w-[70px] truncate">{activeUser?.name || '身分'}</span>
          </span>
          {hasUpdateAvailable && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="有新版本程式" />
          )}
        </div>
      </div>

      {/* 第二排：人體工學舒適可點擊操作列 (單一退回/返回專用，大觸控半徑，避開邊角死區) */}
      <div className="px-3.5 py-1.5 flex items-center justify-between gap-2 bg-slate-950/40">
        {/* 左側：單一退回 / 返回空間按鈕 (專為 iOS 手機調適，位於手指最易點擊範圍) */}
        <div className="flex items-center gap-1.5">
          {activeTab === 'containers' && currentContainerId && onBackContainer ? (
            <button
              onClick={onBackContainer}
              className="px-3.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 flex items-center gap-1.5 text-xs font-bold shadow-sm active:scale-95 transition"
              title="退回上一層空間"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              <span>退回上一層</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* 1. 復原 (Undo with count) */}
              <button
                disabled={!canUndo}
                onClick={onUndo}
                title={canUndo ? `復原上一步操作 (剩餘 ${undoCount} 步可復原)` : '目前無可退回動作'}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                  canUndo
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 active:scale-90 animate-pulse'
                    : 'text-slate-600 opacity-40 cursor-not-allowed border border-transparent'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>復原</span>
                {canUndo && <span className="text-[10px] font-bold">({undoCount})</span>}
              </button>

              {/* 1.5. 重做 (Redo with count) */}
              <button
                disabled={!canRedo}
                onClick={onRedo}
                title={canRedo ? `重做下一步操作 (可重做 ${redoCount} 步)` : '目前無可重做動作'}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                  canRedo
                    ? 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/40 active:scale-90 animate-pulse'
                    : 'text-slate-600 opacity-40 cursor-not-allowed border border-transparent'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>重做</span>
                {canRedo && <span className="text-[10px] font-bold">({redoCount})</span>}
              </button>
            </div>
          )}
        </div>

        {/* 右側功能按鈕：內縮留白，避免貼近螢幕最右側邊緣 */}
        <div className="flex items-center gap-1.5">
          {/* 照片圖庫 */}
          {onOpenGallery && (
            <button
              onClick={onOpenGallery}
              title="專屬家庭圖庫 (照片庫存)"
              className="p-1.5 rounded-xl bg-slate-800 text-teal-300 hover:text-white border border-slate-700/60 transition active:scale-95"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 身分與空間 */}
          {onOpenAccountSpace && (
            <button
              onClick={onOpenAccountSpace}
              title="切換帳號身分與多空間設定"
              className="p-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-teal-300 border border-slate-700/60 transition active:scale-95"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          )}

          {/* 純淨全螢幕檢視開關 */}
          {onTogglePureViewMode && (
            <button
              onClick={onTogglePureViewMode}
              title={pureViewMode ? '退出純淨檢視模式 (顯示底欄導航)' : '開啟純淨全螢幕檢視 (隱藏底欄導航)'}
              className={`p-1.5 rounded-xl text-xs font-semibold transition active:scale-95 ${
                pureViewMode
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              {pureViewMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Gemini AI 智慧收納小幫手 */}
          <button
            onClick={onOpenGemini}
            title="Gemini 智慧收納小幫手"
            className="p-1.5 rounded-xl bg-gradient-to-tr from-teal-500/20 to-sky-500/20 text-teal-300 hover:text-white border border-teal-500/40 flex items-center gap-1 text-xs font-bold transition shadow-xs active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">AI問答</span>
          </button>

          {/* 私人空間開關 */}
          <button
            onClick={onToggleShowPrivate}
            title={showPrivate ? '顯示全部（含私人空間）' : '僅顯示家庭共有空間'}
            className={`p-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 active:scale-95 ${
              showPrivate
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {showPrivate ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </button>

          {/* 視覺搜尋 */}
          <button
            onClick={onOpenSearch}
            title="視覺化搜尋 (帶出父子照片鏈)"
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-teal-400 border border-slate-700/60 transition active:scale-95"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

