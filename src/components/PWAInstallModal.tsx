import React, { useState } from 'react';
import {
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  ExternalLink,
  Copy,
  Check,
  X,
  Compass,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isIOS, isInAppBrowser, isAndroid, isInstallable, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = window.location.href;

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const input = document.createElement('input');
        input.value = currentUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleTryNativeInstall = async () => {
    const res = await install();
    if (res === 'accepted') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-250 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-md">
              <img
                src="./pwa-192x192.png"
                alt="App Icon"
                className="w-full h-full object-cover rounded-[14px]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <Smartphone className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">安裝至手機主畫面</h3>
              <p className="text-xs text-teal-400 font-medium">HomeOrganizer 離線家庭收納管家</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Benefits */}
        <div className="grid grid-cols-3 gap-2 py-1 text-center">
          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50">
            <span className="text-[11px] font-bold text-teal-300 block">⚡ 全螢幕體驗</span>
            <span className="text-[10px] text-slate-400">像原生 App 無網址列</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50">
            <span className="text-[11px] font-bold text-emerald-300 block">📶 離線可用</span>
            <span className="text-[10px] text-slate-400">無網路也能查清單</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50">
            <span className="text-[11px] font-bold text-sky-300 block">🔒 本機安全</span>
            <span className="text-[10px] text-slate-400">自成一體・隱私保密</span>
          </div>
        </div>

        {/* If Native One-Click Install is ready (e.g. Chrome on Android / Desktop) */}
        {isInstallable && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-500/20 to-emerald-500/20 border border-teal-500/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-300">您的瀏覽器支援單鍵原生安裝：</span>
            </div>
            <button
              onClick={handleTryNativeInstall}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-98 transition"
            >
              <Smartphone className="w-4 h-4" />
              <span>立即加到手機桌面</span>
            </button>
          </div>
        )}

        {/* CASE 1: In-App Browser (LINE, Facebook, WeChat, Instagram) */}
        {isInAppBrowser && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>偵測到您在社群 App 內建瀏覽器 (如 LINE / FB)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              社群 App 限制了桌面安裝功能。請點擊右上角<strong>「…」</strong>或分享按鈕，選擇<strong>「在系統預設瀏覽器中開啟」</strong>（Chrome 或 Safari）即可順利安裝！
            </p>
            <button
              onClick={handleCopyUrl}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs border border-teal-500/40 flex items-center justify-center gap-1.5 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '網址已複製！請貼到 Chrome/Safari 開啟' : '複製網址貼到 Safari / Chrome 開啟'}</span>
            </button>
          </div>
        )}

        {/* CASE 2: iPhone / iPad (iOS Safari) */}
        {isIOS && (
          <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
              <Compass className="w-4 h-4" />
              <span>iPhone / iPad (Safari) 3 步驟安裝方式：</span>
            </div>
            <ol className="text-xs text-slate-200 space-y-2.5 list-none pl-1">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                  1
                </span>
                <div>
                  點擊 Safari 底部工具列中央的<strong>「分享」按鈕</strong>
                  <div className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-slate-700 text-sky-300 font-medium">
                    <Share className="w-3 h-3" />
                    <span>方框向上箭頭</span>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                  2
                </span>
                <div>
                  在滑出的選單中向下滑動，點選<strong>「加入主畫面」</strong>
                  <div className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-slate-700 text-teal-300 font-medium">
                    <PlusSquare className="w-3 h-3" />
                    <span>加入主畫面 ⊞</span>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                  3
                </span>
                <div>
                  點選右上角的<strong>「新增」</strong>，桌面即會出現「居家收納管家」App！
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* CASE 3: Android (Chrome / Edge / Samsung Internet) */}
        {!isIOS && !isInstallable && (
          <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-xs">
              <MoreVertical className="w-4 h-4" />
              <span>Android (Chrome / 瀏覽器) 安裝步驟：</span>
            </div>
            <ol className="text-xs text-slate-200 space-y-2.5 list-none pl-1">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                  1
                </span>
                <div>
                  點選 Chrome 右上角的<strong>「三個點選單（⋮）」</strong>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                  2
                </span>
                <div>
                  在選單中點選<strong>「加到主畫面」</strong>或<strong>「安裝應用程式」</strong>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                  3
                </span>
                <div>
                  確認名稱後點選<strong>「安裝」</strong>，App 即永久加到手機桌面！
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-2 flex items-center justify-between gap-2">
          <button
            onClick={handleCopyUrl}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '已複製連結' : '複製 App 連結'}</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
