import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

export const MobileInstallBanner: React.FC = () => {
  const { isInstalled, isMobile, isInstallable, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(true);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // Only show on mobile when not running in standalone mode
    if (!isMobile || isInstalled) {
      setDismissed(true);
      return;
    }
    const isDismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
    if (!isDismissed) {
      // Delay display slightly to not conflict with initial render
      const timer = setTimeout(() => {
        setDismissed(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isMobile, isInstalled]);

  if (dismissed || isInstalled || !isMobile) {
    return (
      <PWAInstallModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    );
  }

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
    setDismissed(true);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (res === 'accepted') {
        handleDismiss();
        return;
      }
    }
    setShowGuideModal(true);
  };

  return (
    <>
      <div className="fixed top-12 inset-x-2 z-35 sm:hidden animate-in slide-in-from-top-4 duration-300">
        <div className="p-2.5 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950/90 to-slate-900 border border-teal-500/50 shadow-2xl flex items-center justify-between gap-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 flex items-center justify-center shrink-0 shadow-sm">
              <Smartphone className="w-4 h-4 text-slate-950 font-bold" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">安裝至手機主畫面</p>
              <p className="text-[10px] text-teal-300/90 truncate">自成一體・離線查閱更流暢</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="py-1 px-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-black text-xs shadow flex items-center gap-1 active:scale-95 transition"
            >
              <Download className="w-3 h-3 stroke-[2.5]" />
              <span>安裝</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              title="關閉提示"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <PWAInstallModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </>
  );
};
