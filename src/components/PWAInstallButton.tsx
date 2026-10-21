import React, { useState } from 'react';
import { Download, Smartphone, X, Check, HelpCircle } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running standalone as PWA, no need to show main button, or show subtle badge
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable ? (
        <button
          onClick={install}
          title="將 HomeOrganizer 安裝至 Android 桌面"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-sm active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>安裝到手機桌面</span>
        </button>
      ) : (
        <button
          onClick={() => setShowGuide(true)}
          title="安裝說明"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-teal-400" />
          <span>加到桌面</span>
        </button>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-100">安裝為手機桌面專用 App</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <p className="font-semibold text-teal-400 mb-1">🤖 Android Chrome 安裝步驟：</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>點擊 Chrome 瀏覽器右上角的「⋮」(三點選單)。</li>
                  <li>選擇「<strong>安裝應用程式</strong>」或「<strong>新增至主螢幕</strong>」。</li>
                  <li>完成後即可像原生 App 一樣從手機桌面全螢幕開啟！</li>
                </ol>
              </div>

              {isIOS && (
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <p className="font-semibold text-sky-400 mb-1">🍎 iPhone / Safari 安裝步驟：</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                    <li>點擊 Safari 底部的「分享 (Share)」按鈕。</li>
                    <li>往下滑動並點擊「<strong>加入主畫面</strong>」。</li>
                    <li>點擊右上角「新增」即完成。</li>
                  </ol>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>支援完全離線使用、快速啟動、支援拍照與條碼掃描</span>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
};
