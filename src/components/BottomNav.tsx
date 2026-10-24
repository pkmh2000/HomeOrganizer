import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Camera,
  FolderTree,
  Calendar,
  Cloud,
  ChevronDown,
  X,
} from 'lucide-react';
import { ViewTab } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface BottomNavProps {
  activeTab: ViewTab;
  onChangeTab: (tab: ViewTab) => void;
  onOpenBatchIntake: () => void;
  onCloseDesk?: () => void;
  expiringAlertCount: number;
  memoCount: number;
  stagingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenBatchIntake,
  onCloseDesk,
  expiringAlertCount,
  memoCount,
  stagingCount = 0,
}) => {
  const handleTabClick = (tab: ViewTab) => {
    onChangeTab(tab);
    // User requirement: "進入每一個功能 無用的 desk 可以收起 盡量可以操作當下功能"
    // Auto-collapse desk once function is chosen so current screen is 100% focused!
    if (onCloseDesk) {
      onCloseDesk();
    }
  };

  return (
    <>
      {/* Invisible backdrop to dismiss desk when tapping content area */}
      <div
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-2xs transition-opacity"
        onClick={onCloseDesk}
      />

      {/* Slide-up Bottom Desk Panel */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/98 border-t border-slate-700/80 px-3 pt-2 pb-3 safe-bottom shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Desk Header Handle */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
          <span className="text-[11px] font-bold text-slate-400">功能導航盤 (選取後自動收起)</span>
          <div className="flex items-center gap-2">
            <PWAInstallButton variant="navbar" />
            <button
              onClick={onCloseDesk}
              className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-semibold px-2 py-0.5 rounded-lg bg-slate-800"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>收起導航盤</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-around">
          {/* 1. Dashboard */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition ${
              activeTab === 'dashboard'
                ? 'text-teal-400 font-bold bg-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">儀表板</span>
          </button>

          {/* 2. Containers / Spaces */}
          <button
            onClick={() => handleTabClick('containers')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition ${
              activeTab === 'containers'
                ? 'text-teal-400 font-bold bg-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">空間收納</span>
          </button>

          {/* 3. CENTER CAMERA ACTION */}
          <div className="relative">
            <button
              onClick={() => {
                onOpenBatchIntake();
                if (onCloseDesk) onCloseDesk();
              }}
              title="拍照 / 拍照暫存區"
              className="-mt-3 w-12 h-12 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 flex flex-col items-center justify-center shadow-[0_6px_18px_rgba(20,184,166,0.4)] active:scale-90 transition border border-slate-900"
            >
              <Camera className="w-5 h-5 stroke-[2.2]" />
            </button>
            {stagingCount > 0 && (
              <span className="absolute -top-3.5 -right-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-black shadow-md border border-slate-950 animate-pulse">
                {stagingCount}
              </span>
            )}
          </div>

          {/* 4. Tree Hierarchy */}
          <button
            onClick={() => handleTabClick('tree')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition ${
              activeTab === 'tree'
                ? 'text-teal-400 font-bold bg-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">樹狀層級</span>
          </button>

          {/* 5. Calendar / Expiry */}
          <button
            onClick={() => handleTabClick('calendar')}
            className={`relative flex flex-col items-center py-1.5 px-2 rounded-xl transition ${
              activeTab === 'calendar'
                ? 'text-teal-400 font-bold bg-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">行事曆</span>
            {expiringAlertCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          {/* 6. Settings / Backup */}
          <button
            onClick={() => handleTabClick('settings')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-xl transition ${
              activeTab === 'settings'
                ? 'text-teal-400 font-bold bg-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">備份同步</span>
          </button>
        </div>
      </div>
    </>
  );
};
