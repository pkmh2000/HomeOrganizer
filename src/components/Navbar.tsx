import React from 'react';
import {
  Search,
  Lock,
  Unlock,
  Layers,
  ChevronLeft,
  Sparkles,
  RotateCcw,
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
  // Tool icons
  onUndo?: () => void;
  canUndo?: boolean;
  undoCount?: number;
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
  onOpenGallery,
  onOpenAccountSpace,
  activeUser,
  activeSpaceName,
  pureViewMode = false,
  onTogglePureViewMode,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex flex-col transition-all">
      {/* 頂部導航列：移除頂部功能切換與滑動列，聚焦空間標題並完整保留右側功能 Icon */}
      <div className="px-3 py-2 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* 左側：空間/容器標題 (若在子容器中則顯示「返回」按鈕) */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {activeTab === 'containers' && currentContainerId && onBackContainer ? (
            <button
              onClick={onBackContainer}
              className="p-1.5 -ml-1 rounded-xl bg-slate-800 text-teal-400 hover:text-white flex items-center gap-1 text-xs shrink-0 font-bold active:scale-95 transition border border-slate-700/60 shadow-xs"
              title="返回上一層收納空間"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>返回</span>
            </button>
          ) : (
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-xs flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-slate-950 font-black" />
            </div>
          )}

          {/* 空間/容器名稱 */}
          <div className="min-w-0 px-1">
            <h1 className="text-xs font-bold text-slate-100 truncate">
              {activeTab === 'containers' && currentContainerId
                ? currentContainerName
                : activeSpaceName || householdName}
            </h1>
            <p className="text-[10px] text-teal-400/90 font-medium truncate max-w-[140px]">
              {activeTab === 'containers' && currentContainerId
                ? activeSpaceName || householdName
                : '空間分層收納'}
            </p>
          </div>
        </div>

        {/* 右側完整保留功能 Icon (保留 icorn) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* 1. 復原 (Undo with count) */}
          <button
            disabled={!canUndo}
            onClick={onUndo}
            title={canUndo ? `復原上一步操作 (剩餘 ${undoCount} 步可復原)` : '目前無可退回動作'}
            className={`p-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
              canUndo
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 active:scale-90 animate-pulse'
                : 'text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {canUndo && <span className="text-[10px] font-bold">{undoCount}</span>}
          </button>

          {/* 2. 照片圖庫 */}
          {onOpenGallery && (
            <button
              onClick={onOpenGallery}
              title="專屬家庭圖庫 (照片庫存)"
              className="p-1.5 rounded-xl bg-slate-800 text-teal-300 hover:text-white border border-slate-700/60 transition active:scale-95"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 3. 身分與空間 */}
          {onOpenAccountSpace && (
            <button
              onClick={onOpenAccountSpace}
              title={`目前身分：${activeUser?.name || '家庭使用者'}`}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-teal-300 border border-slate-700/60 flex items-center gap-1 text-xs font-semibold transition active:scale-95"
            >
              <span className="text-xs">{activeUser?.avatar || '👤'}</span>
              <span className="hidden md:inline max-w-[60px] truncate text-[11px]">
                {activeUser?.name || '身分'}
              </span>
            </button>
          )}

          {/* 4. 純淨全螢幕檢視開關 */}
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

          {/* 5. Gemini AI 智慧收納小幫手 */}
          <button
            onClick={onOpenGemini}
            title="Gemini 智慧收納小幫手"
            className="p-1.5 rounded-xl bg-gradient-to-tr from-teal-500/20 to-sky-500/20 text-teal-300 hover:text-white border border-teal-500/40 flex items-center gap-1 text-xs font-bold transition shadow-xs active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">AI問答</span>
          </button>

          {/* 6. 私人空間開關 */}
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

          {/* 7. 視覺搜尋 */}
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
