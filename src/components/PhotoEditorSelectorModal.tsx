import React, { useState, useRef } from 'react';
import {
  Share2,
  Sliders,
  Sparkles,
  Link,
  Check,
  X,
  ExternalLink,
  Upload,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Smartphone,
  Palette,
  Camera,
  Crop,
  Download,
} from 'lucide-react';
import {
  PhotoEditorType,
  PhotoEditorPreference,
  loadPhotoEditorPreference,
  savePhotoEditorPreference,
  clearPhotoEditorPreference,
  getPhotoEditorDisplayName,
  invokeSystemShareForPhoto,
  downloadPhotoToDevice,
  isFirstTimePhotoEditor,
  hasBoundPhotoEditor,
} from '../utils/photoEditorManager';
import { BuiltinPhotoEditorModal } from './BuiltinPhotoEditorModal';

interface PhotoEditorSelectorModalProps {
  isOpen: boolean;
  photoUrl: string;
  onPhotoUpdated: (updatedBase64: string) => void;
  onClose: () => void;
  forceShowSelector?: boolean;
}

export const PhotoEditorSelectorModal: React.FC<PhotoEditorSelectorModalProps> = ({
  isOpen,
  photoUrl,
  onPhotoUpdated,
  onClose,
  forceShowSelector = false,
}) => {
  const currentPref = loadPhotoEditorPreference();
  const isFirstTime = isFirstTimePhotoEditor();
  const shouldAutoDirectLaunch = !forceShowSelector && !isFirstTime && currentPref.type !== 'ask_every_time';

  const [selectedType, setSelectedType] = useState<PhotoEditorType>(
    currentPref.type === 'ask_every_time' ? 'builtin_canvas' : currentPref.type
  );
  // 初次使用時預設勾選「記住此選擇」，讓下次直接套用
  const [rememberBinding, setRememberBinding] = useState<boolean>(true);
  const [customScheme, setCustomScheme] = useState<string>(currentPref.customScheme || '');
  const [customName, setCustomName] = useState<string>(currentPref.customName || '');

  // Modal sub-states
  const [isBuiltinOpen, setIsBuiltinOpen] = useState<boolean>(() => {
    return shouldAutoDirectLaunch && currentPref.type === 'builtin_canvas';
  });
  const [isAwaitingExternalReturn, setIsAwaitingExternalReturn] = useState<boolean>(() => {
    return shouldAutoDirectLaunch && currentPref.type !== 'builtin_canvas';
  });
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasAutoLaunchedRef = useRef<boolean>(false);

  // If already bound, auto-launch external or gallery tools on mount
  React.useEffect(() => {
    if (!isOpen || !shouldAutoDirectLaunch || hasAutoLaunchedRef.current) return;
    hasAutoLaunchedRef.current = true;

    if (currentPref.type === 'system_gallery') {
      downloadPhotoToDevice(photoUrl, `item_${Date.now()}.jpg`);
      setShareNotice('已自動儲存照片至裝置相簿！請於手機自帶「照片」App 編輯標註後，點擊下方選取替換。');
    } else if (currentPref.type === 'system_share') {
      invokeSystemShareForPhoto(photoUrl, '編輯收納物品照片').then((res) => {
        setShareNotice(res.message);
        if (res.fallbackNeeded) {
          setIsBuiltinOpen(true);
        }
      });
    } else if (currentPref.type === 'custom_scheme') {
      if (currentPref.customScheme?.trim()) {
        try {
          window.location.href = currentPref.customScheme.trim();
        } catch {
          window.open(currentPref.customScheme.trim(), '_blank');
        }
      }
      setShareNotice('已嘗試自動調用自訂修圖應用！修圖完成後請點擊下方選取替換。');
    }
  }, [isOpen, shouldAutoDirectLaunch, currentPref, photoUrl]);

  if (!isOpen) return null;

  // Execute the selected photo editor
  const handleLaunchEditor = async () => {
    // 1. Save or clear preference if requested
    if (rememberBinding) {
      savePhotoEditorPreference({
        type: selectedType,
        customName: selectedType === 'custom_scheme' ? customName : undefined,
        customScheme: selectedType === 'custom_scheme' ? customScheme : undefined,
      });
    } else {
      clearPhotoEditorPreference();
    }

    // 2. Dispatch to the target editor
    if (selectedType === 'builtin_canvas') {
      setIsBuiltinOpen(true);
    } else if (selectedType === 'system_gallery') {
      downloadPhotoToDevice(photoUrl, `item_${Date.now()}.jpg`);
      setIsAwaitingExternalReturn(true);
      setShareNotice('已將照片儲存/下載至您的相簿！請開啟手機自帶「照片」App 點選「編輯」或「標註」，完成後點擊下方按鈕選取替換。');
    } else if (selectedType === 'system_share') {
      setIsAwaitingExternalReturn(true);
      const res = await invokeSystemShareForPhoto(photoUrl, '編輯收納物品照片');
      setShareNotice(res.message);
      if (res.fallbackNeeded) {
        // Fallback to built-in if system share is unavailable
        setTimeout(() => {
          setIsBuiltinOpen(true);
        }, 1200);
      }
    } else if (selectedType === 'custom_scheme') {
      setIsAwaitingExternalReturn(true);
      if (customScheme.trim()) {
        try {
          window.location.href = customScheme.trim();
        } catch {
          window.open(customScheme.trim(), '_blank');
        }
      }
      setShareNotice('已嘗試調用自訂修圖應用！修圖完成後，請點擊下方「選取已修好照片替換」。');
    }
  };

  // User uploads the edited photo back from external editor
  const handleExternalPhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onPhotoUpdated(result);
        setIsAwaitingExternalReturn(false);
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset binding right here if user wants to change
  const handleCancelBindingNow = () => {
    clearPhotoEditorPreference();
    setRememberBinding(false);
    setSelectedType('ask_every_time');
    setShareNotice('已取消固定綁定！下次將重新由您選擇。');
    setTimeout(() => setShareNotice(null), 3000);
  };

  // When directly launching the builtin canvas editor, don't show the background dialog
  const showBackgroundDialog = !shouldAutoDirectLaunch || isAwaitingExternalReturn;

  return (
    <>
      {/* Built-in Canvas Editor Modal */}
      <BuiltinPhotoEditorModal
        isOpen={isBuiltinOpen}
        photoUrl={photoUrl}
        onSave={(editedBase64) => {
          onPhotoUpdated(editedBase64);
          setIsBuiltinOpen(false);
          onClose();
        }}
        onClose={() => {
          setIsBuiltinOpen(false);
          onClose();
        }}
      />

      {/* Hidden file input for receiving edited photos back */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleExternalPhotoSelected}
      />

      {/* Selector & Awaiting Return Dialog */}
      {showBackgroundDialog && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-teal-500/40 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAwaitingExternalReturn
                      ? '外部修圖後回傳'
                      : isFirstTime
                      ? '初次使用：設定修圖方式'
                      : forceShowSelector
                      ? '更換修圖方式'
                      : '選擇照片編輯方式 (100% 離線)'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAwaitingExternalReturn
                      ? '修圖完成後將最新照片更新至收納卡片'
                      : isFirstTime
                      ? '選定綁定後，以後點「修圖」直接套用進編輯（可在「設置」更換）'
                      : '離線修圖 · 自由裁切 · 智慧去背 · 系統相簿標註'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          {/* Body A: Awaiting external photo return */}
          {isAwaitingExternalReturn ? (
            <div className="space-y-4 py-1">
              <div className="p-3.5 rounded-2xl bg-teal-950/40 border border-teal-500/30 text-xs text-teal-200 space-y-2">
                <div className="flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{shareNotice || '已為您準備好修圖檔案！'}</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      💡 <strong>手機系統自帶編輯指引</strong>：手機相簿（iOS 照片或 Android 相簿）因安全沙箱限制無法由網頁直接喚醒編輯面板。請在手機相簿中開啟該圖片點擊<strong>「編輯 / 標記 / 裁剪」</strong>，完成後回到這裡點擊下方<strong>「選取已修好照片替換」</strong>即可！
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>選取已修好的照片 (替換原圖)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => downloadPhotoToDevice(photoUrl, `item_${Date.now()}.jpg`)}
                    className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-400" />
                    <span>再次儲存至相簿</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBuiltinOpen(true)}
                    className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-teal-300 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>改用內建畫布修圖</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCancelBindingNow}
                    className="text-amber-400 hover:text-amber-300 underline text-[11px]"
                  >
                    取消綁定此 App
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-slate-400 hover:text-white text-[11px]"
                  >
                    保留原圖離開
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Body B: Choosing Editor & Binding */
            <div className="space-y-3.5">
              <div className="space-y-2.5">
                {/* Option 1: Built-in Canvas Editor (FEATURED & EXPANDED) */}
                <label
                  onClick={() => setSelectedType('builtin_canvas')}
                  className={`p-3 rounded-2xl border cursor-pointer flex items-start gap-3 transition ${
                    selectedType === 'builtin_canvas'
                      ? 'bg-teal-950/40 border-teal-500/70 ring-1 ring-teal-500/50'
                      : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Crop className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>內建畫布修圖工具</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/25 text-teal-300 font-semibold border border-teal-500/40">
                          推薦首選 · 100% 離線免連網
                        </span>
                      </h4>
                      <input
                        type="radio"
                        name="editor_type"
                        checked={selectedType === 'builtin_canvas'}
                        onChange={() => setSelectedType('builtin_canvas')}
                        className="accent-teal-400"
                      />
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      免安裝任何 App，直接在應用程式內完成：
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-teal-200">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900/80 border border-teal-500/30">
                        ✂️ 自由與多比例裁切 (1:1, 4:3, 16:9)
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900/80 border border-teal-500/30">
                        🪄 智慧一鍵去背與魔術吸管
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900/80 border border-teal-500/30">
                        🔄 旋轉90°/水平翻轉
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900/80 border border-teal-500/30">
                        ☀️ 亮度對比調節 & ✏️ 重點塗鴉
                      </span>
                    </div>
                  </div>
                </label>

                {/* Option 2: Save to System Gallery & Use Native Photos App */}
                <label
                  onClick={() => setSelectedType('system_gallery')}
                  className={`p-3 rounded-2xl border cursor-pointer flex items-start gap-3 transition ${
                    selectedType === 'system_gallery'
                      ? 'bg-teal-950/40 border-teal-500/70 ring-1 ring-teal-500/50'
                      : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>儲存至相簿 ➔ 手機自帶「照片」App 編輯</span>
                      </h4>
                      <input
                        type="radio"
                        name="editor_type"
                        checked={selectedType === 'system_gallery'}
                        onChange={() => setSelectedType('system_gallery')}
                        className="accent-teal-400"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      一鍵將照片存入手機相簿，在 iOS 照片或 Android 相簿中點選「編輯」或「標記」進行原生修圖，修畢後一鍵回傳替換。
                    </p>
                  </div>
                </label>

                {/* Option 3: System Share (Calls installed apps: Snapseed, Lightroom, Meitu) */}
                <label
                  onClick={() => setSelectedType('system_share')}
                  className={`p-3 rounded-2xl border cursor-pointer flex items-start gap-3 transition ${
                    selectedType === 'system_share'
                      ? 'bg-teal-950/40 border-teal-500/70 ring-1 ring-teal-500/50'
                      : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>調用已安裝第三方修圖 App</span>
                      </h4>
                      <input
                        type="radio"
                        name="editor_type"
                        checked={selectedType === 'system_share'}
                        onChange={() => setSelectedType('system_share')}
                        className="accent-teal-400"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      透過手機原生分享面板傳送至您已安裝的 <strong>Snapseed、美圖秀秀、Lightroom</strong> 等修圖 App。
                    </p>
                  </div>
                </label>

                {/* Option 4: Custom Scheme */}
                <label
                  onClick={() => setSelectedType('custom_scheme')}
                  className={`p-3 rounded-2xl border cursor-pointer flex items-start gap-3 transition ${
                    selectedType === 'custom_scheme'
                      ? 'bg-teal-950/40 border-teal-500/70 ring-1 ring-teal-500/50'
                      : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Link className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white">自訂 App Scheme 協議</h4>
                      <input
                        type="radio"
                        name="editor_type"
                        checked={selectedType === 'custom_scheme'}
                        onChange={() => setSelectedType('custom_scheme')}
                        className="accent-teal-400"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      填入特定修圖 App 的 URL Scheme（如 snapseed://）直接啟動。
                    </p>
                    {selectedType === 'custom_scheme' && (
                      <div className="space-y-1 pt-1">
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="App 名稱 (例: Snapseed)"
                          className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={customScheme}
                          onChange={(e) => setCustomScheme(e.target.value)}
                          placeholder="Scheme 連結 (例: snapseed://)"
                          className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Binding / Remember Checkbox */}
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                  <input
                    type="checkbox"
                    checked={rememberBinding}
                    onChange={(e) => setRememberBinding(e.target.checked)}
                    className="rounded border-slate-600 text-teal-500 focus:ring-0"
                  />
                  <span>記住此選擇（暫時綁定為慣用編輯器）</span>
                </label>
                <p className="text-[10px] text-amber-300/90 pl-6 leading-relaxed">
                  💡 <strong>更換或取消說明</strong>：可隨時在「設置 ➔ 修圖綁定與帳號」內點擊「更換」或「取消綁定」，避免因 App 被移除後無法連結！
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleLaunchEditor}
                  className="flex-1 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span>開啟修圖</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </>
);
};
