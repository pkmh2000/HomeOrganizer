import React from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // User requirement: "加到桌面 說明 icon 不要!"
  // Only show the direct install button when the browser supports one-click PWA install.
  // Never show the unwanted desktop guide/instructions icon or modal.
  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <button
      onClick={install}
      title="安裝 HomeOrganizer 至手機桌面"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold text-xs transition shadow-sm active:scale-95 shrink-0"
    >
      <Download className="w-3.5 h-3.5 stroke-[2.5]" />
      <span>安裝 App</span>
    </button>
  );
};
