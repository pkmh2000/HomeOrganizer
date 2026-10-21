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
} from 'lucide-react';
import { ViewTab } from '../types';

interface NavbarProps {
  householdName: string;
  activeTab: ViewTab;
  onChangeTab: (tab: ViewTab) => void;
  showPrivate: boolean;
  onToggleShowPrivate: () => void;
  showBottomDesk: boolean;
  onToggleBottomDesk: () => void;
  onOpenSearch: () => void;
  onOpenScanner: () => void;
  onOpenSuggestions: () => void;
  onOpenGemini: () => void;
  expiringAlertCount: number;
  currentContainerName?: string;
  currentContainerId?: string | null;
  onBackContainer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  householdName,
  activeTab,
  onChangeTab,
  showPrivate,
  onToggleShowPrivate,
  showBottomDesk,
  onToggleBottomDesk,
  onOpenSearch,
  onOpenScanner,
  onOpenSuggestions,
  onOpenGemini,
  expiringAlertCount,
  currentContainerName,
  currentContainerId,
  onBackContainer,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs: { id: ViewTab; label: string; icon: any }[] = [
    { id: 'dashboard', label: '儀表板', icon: LayoutDashboard },
    { id: 'containers', label: '空間收納', icon: Layers },
    { id: 'tree', label: '樹狀階層', icon: FolderTree },
    { id: 'calendar', label: '行事曆', icon: Calendar },
    { id: 'memos', label: '家庭備忘', icon: CheckCircle2 },
    { id: 'settings', label: '備份同步', icon: Cloud },
  ];

  const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];
  const IconComponent = currentTabObj.icon;

  const handleSelectTab = (tab: ViewTab) => {
    onChangeTab(tab);
    setIsMenuOpen(false); // auto-collapse menu on entry!
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex flex-col transition-all">
      {/* Main Single Row: Ultra-compact and focused on current task */}
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        {/* Left: Current Function Badge or Container Back Button */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {activeTab === 'containers' && currentContainerId && onBackContainer ? (
            <button
              onClick={onBackContainer}
              className="p-1.5 -ml-1 rounded-xl bg-slate-800 text-teal-400 hover:text-white flex items-center gap-1 text-xs shrink-0 font-medium active:scale-95 transition"
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

          {/* Current Function Title with Dropdown trigger */}
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 text-left px-2 py-1 rounded-xl hover:bg-slate-800/80 transition min-w-0"
            title="點擊切換功能"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-100 truncate">
                  {activeTab === 'containers' && currentContainerId
                    ? currentContainerName
                    : currentTabObj.label}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition duration-200 ${isMenuOpen ? 'rotate-180 text-teal-400' : ''}`} />
              </div>
              <p className="text-[10px] text-teal-400/90 font-medium truncate max-w-[120px]">
                {householdName}
              </p>
            </div>
          </button>
        </div>

        {/* Right Tools: Direct action shortcuts */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Gemini AI Assistant Button */}
          <button
            onClick={onOpenGemini}
            title="Gemini 智慧收納小幫手"
            className="p-1.5 rounded-xl bg-gradient-to-tr from-teal-500/20 to-sky-500/20 text-teal-300 hover:text-white border border-teal-500/40 flex items-center gap-1 text-xs font-bold transition shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI問答</span>
          </button>

          {/* Quick toggle bottom desk if desired */}
          <button
            onClick={onToggleBottomDesk}
            title={showBottomDesk ? '收起底欄 (全螢幕操作當下功能)' : '展開底欄'}
            className={`p-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
              showBottomDesk
                ? 'bg-teal-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-teal-300'
            }`}
          >
            <PanelBottomOpen className="w-4 h-4" />
          </button>

          {/* Private Mode Toggle */}
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

          {/* Barcode Scanner */}
          <button
            onClick={onOpenScanner}
            title="掃描條碼"
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-teal-400 border border-slate-700/60"
          >
            <BarcodeIcon className="w-4 h-4" />
          </button>

          {/* Visual Search */}
          <button
            onClick={onOpenSearch}
            title="視覺化搜尋 (帶出父子照片鏈)"
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-teal-400 border border-slate-700/60"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Suggestions Bulb */}
          <button
            onClick={onOpenSuggestions}
            title="功能提示與建議"
            className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
          >
            <Lightbulb className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dropdown Menu when user taps function title (Auto-closes on select) */}
      {isMenuOpen && (
        <div className="p-2.5 bg-slate-900 border-t border-slate-800 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="text-[11px] font-bold text-slate-400 px-1 mb-1.5 flex items-center justify-between">
            <span>切換功能 (進入後自動收起選單)</span>
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
                  className={`py-2 px-2.5 rounded-xl flex items-center gap-1.5 font-medium transition ${
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
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
