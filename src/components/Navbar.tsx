import React, { useState } from 'react';
import {
  Search,
  Barcode as BarcodeIcon,
  Lock,
  Unlock,
  Lightbulb,
  Layers,
  LayoutDashboard,
  FolderTree,
  Calendar,
  CheckCircle2,
  Cloud,
  PanelBottomOpen,
  ChevronDown,
  Menu,
  X,
  ChevronLeft,
  Sparkles,
  RotateCcw,
  Image as ImageIcon,
  Users,
  Eye,
  EyeOff,
  Inbox,
} from 'lucide-react';
import { ViewTab, UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  householdName: string;
  activeTab: ViewTab;
  onChangeTab: (tab: ViewTab) => void;
  showPrivate: boolean;
  onToggleShowPrivate: () => void;
  showBottomDesk?: boolean;
  onToggleBottomDesk?: () => void;
  onOpenSearch: () => void;
  onOpenScanner: () => void;
  onOpenSuggestions: () => void;
  onOpenGemini: () => void;
  expiringAlertCount: number;
  memoCount?: number;
  currentContainerName?: string;
  currentContainerId?: string | null;
  onBackContainer?: () => void;
  // New features
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
  onChangeTab,
  showPrivate,
  onToggleShowPrivate,
  onOpenSearch,
  onOpenScanner,
  onOpenSuggestions,
  onOpenGemini,
  expiringAlertCount,
  memoCount = 0,
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
  unfiledCount = 0,
  onOpenUnfiled,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs: { id: ViewTab; label: string; icon: any }[] = [
    { id: 'containers', label: '空間收納', icon: Layers },
    { id: 'tree', label: '樹狀階層', icon: FolderTree },
    { id: 'dashboard', label: '儀表板', icon: LayoutDashboard },
    { id: 'calendar', label: '行事曆', icon: Calendar },
    { id: 'memos', label: '家庭備忘', icon: CheckCircle2 },
    { id: 'settings', label: '備份同步', icon: Cloud },
  ];

  const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];

  const handleSelectTab = (tab: ViewTab) => {
    onChangeTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex flex-col transition-all">
      {/* 頂部主要控制列 */}
      <div className="px-3 py-2 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* 左側：當前功能標題與切換按鈕 / 容器返回鈕 */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {activeTab === 'containers' && currentContainerId && onBackContainer ? (
            <button
              onClick={onBackContainer}
              className="p-1.5 -ml-1 rounded-xl bg-slate-800 text-teal-400 hover:text-white flex items-center gap-1 text-xs shrink-0 font-medium active:scale-95 transition border border-slate-700/60"
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

          {/* 當前功能標題卡片 (清晰可點擊，帶切換標籤) */}
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 text-left px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 transition min-w-0 shadow-xs active:scale-98"
            title="點擊展開功能選單"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-100 truncate">
                  {activeTab === 'containers' && currentContainerId
                    ? currentContainerName
                    : currentTabObj.label}
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-teal-500/20 text-teal-300 text-[10px] font-bold flex items-center gap-0.5 shrink-0 border border-teal-500/30">
                  <span>切換</span>
                  <ChevronDown
                    className={`w-3 h-3 transition duration-200 ${
                      isMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </span>
              </div>
              <p className="text-[10px] text-teal-400/90 font-medium truncate max-w-[130px]">
                {activeSpaceName || householdName}
              </p>
            </div>
          </button>
        </div>

        {/* 右側快捷工具 */}
        <div className="flex items-center gap-1 shrink-0">
          {/* 1. 復原按鈕 */}
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
              className="p-1.5 rounded-xl bg-slate-800 text-teal-300 hover:text-white border border-slate-700/60 transition"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 3. 身分空間切換 */}
          {onOpenAccountSpace && (
            <button
              onClick={onOpenAccountSpace}
              title={`目前身分：${activeUser?.name || '家庭使用者'}`}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-teal-300 border border-slate-700/60 flex items-center gap-1 text-xs font-semibold transition"
            >
              <span className="text-xs">{activeUser?.avatar || '👤'}</span>
              <span className="hidden md:inline max-w-[60px] truncate text-[11px]">
                {activeUser?.name || '身分'}
              </span>
            </button>
          )}

          {/* 4. 純淨檢視模式開關 */}
          {onTogglePureViewMode && (
            <button
              onClick={onTogglePureViewMode}
              title={pureViewMode ? '退出純淨檢視模式' : '開啟純淨全螢幕檢視'}
              className={`p-1.5 rounded-xl text-xs font-semibold transition ${
                pureViewMode
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              {pureViewMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* 5. Gemini AI */}
          <button
            onClick={onOpenGemini}
            title="Gemini 智慧收納小幫手"
            className="p-1.5 rounded-xl bg-gradient-to-tr from-teal-500/20 to-sky-500/20 text-teal-300 hover:text-white border border-teal-500/40 flex items-center gap-1 text-xs font-bold transition shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">AI問答</span>
          </button>

          {/* 6. 私人開關 */}
          <button
            onClick={onToggleShowPrivate}
            title={showPrivate ? '顯示全部（含私人空間）' : '僅顯示家庭共有空間'}
            className={`p-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
              showPrivate
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {showPrivate ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </button>

          {/* 7. 搜尋 */}
          <button
            onClick={onOpenSearch}
            title="視覺化搜尋 (帶出父子照片鏈)"
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-teal-400 border border-slate-700/60 transition"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 手機與電腦皆清楚可見的水平快捷功能切換分頁列 (Horizontal Quick Tabs Bar) */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/90 border-t border-slate-850 overflow-x-auto no-scrollbar scroll-smooth">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-slate-100 bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950 stroke-[2.4]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.id === 'calendar' && expiringAlertCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />
              )}
              {tab.id === 'memos' && memoCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ml-0.5 ${
                    isActive ? 'bg-slate-950 text-teal-300' : 'bg-rose-500 text-white'
                  }`}
                >
                  {memoCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 標題點擊展開的功能大選單 */}
      {isMenuOpen && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="text-[11px] font-bold text-slate-400 px-1 mb-2 flex items-center justify-between">
            <span>切換主要功能模組</span>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-slate-500 hover:text-slate-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`py-2.5 px-2.5 rounded-xl flex items-center gap-2 font-medium transition ${
                    isActive
                      ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <TabIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                  {tab.id === 'calendar' && expiringAlertCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-auto shrink-0" />
                  )}
                  {tab.id === 'memos' && memoCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-black ml-auto shrink-0">
                      {memoCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2.5 mt-2.5 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onOpenGallery && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenGallery();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-teal-300 text-xs font-semibold flex items-center gap-1 hover:bg-slate-700"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>照片圖庫</span>
                </button>
              )}
              {onOpenAccountSpace && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenAccountSpace();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 hover:bg-slate-700"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>身分與空間</span>
                </button>
              )}
            </div>
            <PWAInstallButton variant="navbar" />
          </div>
        </div>
      )}
    </header>
  );
};
