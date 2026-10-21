import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'desk' | 'card' | 'floating';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running as an installed PWA on home screen, hide the install button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    // If native prompt is available, try it
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        return;
      }
    }
    // For iOS, Android without prompt ready, or in-app browser, show the guide modal
    setShowGuideModal(true);
  };

  return (
    <>
      {variant === 'navbar' && (
        <button
          onClick={handleClick}
          title="加到手機桌面 / 安裝 App"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold text-xs transition shadow-sm active:scale-95 shrink-0 ${className}`}
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>安裝 App</span>
        </button>
      )}

      {variant === 'desk' && (
        <button
          onClick={handleClick}
          title="安裝至手機桌面"
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl text-teal-400 hover:text-teal-300 hover:bg-slate-800 transition ${className}`}
        >
          <Smartphone className="w-5 h-5 mb-0.5 text-teal-400" />
          <span className="text-[10px] font-bold">安裝 App</span>
        </button>
      )}

      {variant === 'card' && (
        <button
          onClick={handleClick}
          className={`w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold text-xs transition shadow-md flex items-center justify-center gap-2 active:scale-98 ${className}`}
        >
          <Smartphone className="w-4 h-4 stroke-[2.5]" />
          <span>安裝至手機桌面（離線自成一體）</span>
        </button>
      )}

      {variant === 'floating' && (
        <button
          onClick={handleClick}
          title="安裝至手機主畫面"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold text-xs shadow-lg active:scale-95 transition ${className}`}
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>安裝 App</span>
        </button>
      )}

      {/* Guide Modal for iOS Safari, Android, or in-app browsers */}
      <PWAInstallModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </>
  );
};
