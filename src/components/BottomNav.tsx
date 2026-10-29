import React, { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  Camera,
  FolderTree,
  Calendar,
  Cloud,
  CheckCircle2,
  MoreHorizontal,
  Image as ImageIcon,
  Users,
  Eye,
  EyeOff,
  Sparkles,
  Search,
  X,
  ChevronUp,
} from 'lucide-react';
import { ViewTab } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { APP_VERSION } from '../version';

interface BottomNavProps {
  activeTab: ViewTab;
  onChangeTab: (tab: ViewTab) => void;
  onOpenBatchIntake: () => void;
  expiringAlertCount: number;
  memoCount: number;
  stagingCount?: number;
  onOpenGallery?: () => void;
  onOpenAccountSpace?: () => void;
  onOpenSearch?: () => void;
  onOpenGemini?: () => void;
  pureViewMode?: boolean;
  onTogglePureViewMode?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenBatchIntake,
  expiringAlertCount,
  memoCount,
  stagingCount = 0,
  onOpenGallery,
  onOpenAccountSpace,
  onOpenSearch,
  onOpenGemini,
  pureViewMode = false,
  onTogglePureViewMode,
}) => {
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  const handleTabClick = (tab: ViewTab) => {
    onChangeTab(tab);
    setIsMoreSheetOpen(false);
  };

  return (
    <>
      {/* "更多功能" 展開抽屜 (當點擊右下角「更多」時開啟) */}
      {isMoreSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* 半透明遮罩 (點擊關閉) */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setIsMoreSheetOpen(false)}
          />

          {/* 抽屜內容 */}
          <div className="relative z-10 bg-slate-900 border-t border-slate-700/80 rounded-t-3xl p-4 shadow-2xl safe-bottom animate-in slide-in-from-bottom duration-200">
            {/* 抽屜頂部手柄與標題 */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-400" />
                <span className="text-xs font-bold text-slate-200">更多收納與家庭功能</span>
              </div>
              <button
                onClick={() => setIsMoreSheetOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="關閉選單"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 功能方塊網格 */}
            <div className="grid grid-cols-3 gap-2.5 text-xs pb-2">
              {/* 家庭備忘 */}
              <button
                onClick={() => handleTabClick('memos')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition ${
                  activeTab === 'memos'
                    ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 font-bold'
                    : 'bg-slate-800/80 border-slate-750 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="relative mb-1.5">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                  {memoCount > 0 && (
                    <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-black">
                      {memoCount}
                    </span>
                  )}
                </div>
                <span>家庭備忘</span>
              </button>

              {/* 備份同步 */}
              <button
                onClick={() => handleTabClick('settings')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition ${
                  activeTab === 'settings'
                    ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 font-bold'
                    : 'bg-slate-800/80 border-slate-750 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Cloud className="w-5 h-5 mb-1.5 text-sky-400" />
                <span>備份同步</span>
              </button>

              {/* 照片圖庫 */}
              {onOpenGallery && (
                <button
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    onOpenGallery();
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border bg-slate-800/80 border-slate-750 text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  <ImageIcon className="w-5 h-5 mb-1.5 text-amber-400" />
                  <span>照片圖庫</span>
                </button>
              )}

              {/* 身分與空間 */}
              {onOpenAccountSpace && (
                <button
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    onOpenAccountSpace();
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border bg-slate-800/80 border-slate-750 text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  <Users className="w-5 h-5 mb-1.5 text-indigo-400" />
                  <span>身分與空間</span>
                </button>
              )}

              {/* 視覺化搜尋 */}
              {onOpenSearch && (
                <button
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    onOpenSearch();
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border bg-slate-800/80 border-slate-750 text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  <Search className="w-5 h-5 mb-1.5 text-emerald-400" />
                  <span>視覺搜尋</span>
                </button>
              )}

              {/* Gemini AI 助手 */}
              {onOpenGemini && (
                <button
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    onOpenGemini();
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border bg-slate-800/80 border-slate-750 text-teal-300 hover:bg-slate-800 hover:text-teal-200 transition"
                >
                  <Sparkles className="w-5 h-5 mb-1.5 text-amber-300" />
                  <span>AI 助手</span>
                </button>
              )}
            </div>

            {/* 底部附加工具 (PWA 下載 / 純淨模式切換 / 版本號) */}
            <div className="pt-2.5 mt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {onTogglePureViewMode && (
                  <button
                    onClick={() => {
                      setIsMoreSheetOpen(false);
                      onTogglePureViewMode();
                    }}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-teal-300 py-1 px-2.5 rounded-lg bg-slate-800/60"
                  >
                    {pureViewMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{pureViewMode ? '顯示完整工具' : '純淨全螢幕'}</span>
                  </button>
                )}
                <span className="text-[10px] text-teal-400 font-mono font-bold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                  v{APP_VERSION}
                </span>
              </div>
              <PWAInstallButton variant="navbar" />
            </div>
          </div>
        </div>
      )}

      {/* 常駐手機與平板底部導航列 (Fixed Mobile Bottom Navigation Bar) */}
      <nav
        aria-label="主要底部功能導航"
        className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-1 safe-bottom shadow-[0_-4px_25px_rgba(0,0,0,0.4)] flex items-center justify-around select-none"
      >
        {/* 1. 空間收納 (預設首頁，最核心功能) */}
        <button
          onClick={() => handleTabClick('containers')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition duration-150 relative min-w-[54px] active:scale-95 ${
            activeTab === 'containers'
              ? 'text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activeTab === 'containers' ? 'bg-teal-500/15 text-teal-300' : ''}`}>
            <Layers className={`w-5 h-5 ${activeTab === 'containers' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">空間收納</span>
          {activeTab === 'containers' && (
            <span className="absolute -bottom-0.5 w-5 h-0.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
          )}
        </button>

        {/* 2. 樹狀階層 */}
        <button
          onClick={() => handleTabClick('tree')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition duration-150 relative min-w-[54px] active:scale-95 ${
            activeTab === 'tree'
              ? 'text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activeTab === 'tree' ? 'bg-teal-500/15 text-teal-300' : ''}`}>
            <FolderTree className={`w-5 h-5 ${activeTab === 'tree' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">樹狀層級</span>
          {activeTab === 'tree' && (
            <span className="absolute -bottom-0.5 w-5 h-0.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
          )}
        </button>

        {/* 3. 置中核心拍照快捷鈕 (拍照收納 & 暫存區) */}
        <div className="flex flex-col items-center justify-center px-1 shrink-0 relative -top-2.5">
          <button
            onClick={onOpenBatchIntake}
            title="拍照 / 拍照暫存區"
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-teal-500 via-teal-400 to-emerald-400 text-slate-950 flex flex-col items-center justify-center shadow-[0_6px_20px_rgba(20,184,166,0.45)] border-2 border-slate-950 active:scale-90 transition duration-150 hover:brightness-110"
          >
            <Camera className="w-6 h-6 stroke-[2.3]" />
          </button>
          <span className="text-[10px] font-bold text-teal-300 mt-0.5 tracking-tight">拍照收納</span>
          {stagingCount > 0 && (
            <span className="absolute -top-1 right-0 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-black shadow-md border-2 border-slate-950 animate-pulse">
              {stagingCount}
            </span>
          )}
        </div>

        {/* 4. 儀表板 */}
        <button
          onClick={() => handleTabClick('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition duration-150 relative min-w-[54px] active:scale-95 ${
            activeTab === 'dashboard'
              ? 'text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-teal-500/15 text-teal-300' : ''}`}>
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">儀表板</span>
          {activeTab === 'dashboard' && (
            <span className="absolute -bottom-0.5 w-5 h-0.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
          )}
        </button>

        {/* 5. 行事曆 */}
        <button
          onClick={() => handleTabClick('calendar')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition duration-150 relative min-w-[54px] active:scale-95 ${
            activeTab === 'calendar'
              ? 'text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition relative ${activeTab === 'calendar' ? 'bg-teal-500/15 text-teal-300' : ''}`}>
            <Calendar className={`w-5 h-5 ${activeTab === 'calendar' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            {expiringAlertCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">行事曆</span>
          {activeTab === 'calendar' && (
            <span className="absolute -bottom-0.5 w-5 h-0.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
          )}
        </button>

        {/* 6. 更多功能選單 */}
        <button
          onClick={() => setIsMoreSheetOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition duration-150 relative min-w-[54px] active:scale-95 ${
            activeTab === 'memos' || activeTab === 'settings'
              ? 'text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition relative ${activeTab === 'memos' || activeTab === 'settings' ? 'bg-teal-500/15 text-teal-300' : ''}`}>
            <MoreHorizontal className="w-5 h-5 stroke-[1.8]" />
            {memoCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-teal-400 ring-2 ring-slate-900" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">更多</span>
          {(activeTab === 'memos' || activeTab === 'settings') && (
            <span className="absolute -bottom-0.5 w-5 h-0.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
          )}
        </button>
      </nav>
    </>
  );
};
