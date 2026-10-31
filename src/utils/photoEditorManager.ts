/**
 * Photo Editor Binding & Invocation Manager (100% Local-First & Offline)
 * Supports Built-in Canvas Photo Editor (Offline Crop, Rotate, Light Adjust, Markup, and Smart Cutout/Background Removal),
 * System Gallery Save & Native Photo App Markup, or System Share Target.
 * Zero external internet dependency.
 */

export type PhotoEditorType =
  | 'builtin_canvas'
  | 'system_gallery'
  | 'system_share'
  | 'custom_scheme'
  | 'ask_every_time';

export interface PhotoEditorPreference {
  type: PhotoEditorType;
  customName?: string;
  customScheme?: string;
  boundAt?: string;
}

const STORAGE_KEY_PHOTO_EDITOR = 'homeorganizer_photo_editor_pref_v2';

export const DEFAULT_PHOTO_EDITOR_PREF: PhotoEditorPreference = {
  type: 'builtin_canvas', // 預設優先使用 100% 離線的強大內建修圖工具
};

export function loadPhotoEditorPreference(): PhotoEditorPreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PHOTO_EDITOR);
    if (!raw) return DEFAULT_PHOTO_EDITOR_PREF;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.type) return DEFAULT_PHOTO_EDITOR_PREF;
    // Disallow external internet tools if previously stored
    if ((parsed.type as string) === 'photopea') {
      return DEFAULT_PHOTO_EDITOR_PREF;
    }
    return parsed;
  } catch {
    return DEFAULT_PHOTO_EDITOR_PREF;
  }
}

export function savePhotoEditorPreference(pref: PhotoEditorPreference): void {
  try {
    const toSave: PhotoEditorPreference = {
      ...pref,
      boundAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_PHOTO_EDITOR, JSON.stringify(toSave));
  } catch {}
}

export function clearPhotoEditorPreference(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PHOTO_EDITOR);
  } catch {}
}

export function getPhotoEditorDisplayName(type: PhotoEditorType, customName?: string): string {
  switch (type) {
    case 'builtin_canvas':
      return '內建畫布修圖工具 (離線裁切、旋轉、調光、塗鴉與智慧去背)';
    case 'system_gallery':
      return '儲存至手機相簿 ➔ 使用手機自帶照片 App 編輯/標註';
    case 'system_share':
      return '調用手機已安裝第三方修圖 App (透過系統分享選單)';
    case 'custom_scheme':
      return customName ? `自訂 App (${customName})` : '自訂 App URL Scheme';
    case 'ask_every_time':
    default:
      return '每次開啟時詢問 (未綁定特定工具)';
  }
}

/**
 * Converts a base64 DataURL string into a standard File object
 */
export function base64ToFile(base64Data: string, filename: string = 'homeorganizer_photo.jpg'): File {
  const arr = base64Data.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1] || '');
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Downloads or saves photo to device photo gallery so user can open native iOS / Android Photos to edit/markup
 */
export function downloadPhotoToDevice(base64Data: string, filename: string = 'homeorganizer_item.jpg'): void {
  try {
    const a = document.createElement('a');
    a.href = base64Data;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('Failed to download photo to device:', err);
  }
}

/**
 * Triggers native system share to hand off photo to user's installed photo editing apps
 */
export async function invokeSystemShareForPhoto(
  base64Photo: string,
  title: string = '編輯物品收納照片'
): Promise<{ success: boolean; fallbackNeeded?: boolean; message: string }> {
  try {
    const file = base64ToFile(base64Photo, `photo_${Date.now()}.jpg`);

    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title,
        text: '請選擇您的修圖 App（如 Snapseed、美圖秀秀、Lightroom、照片編輯），修圖儲存後可回到收納管家更新照片。',
        files: [file],
      });
      return {
        success: true,
        message: '已將照片傳送至系統分享選單！修圖完成後，請點擊「選取已修好照片替換」。',
      };
    } else {
      return {
        success: false,
        fallbackNeeded: true,
        message: '目前瀏覽器環境不支援直接以系統選單分享檔案，已為您切換至內建修圖工具或相片替換流程。',
      };
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, message: '已取消分享修圖。' };
    }
    return {
      success: false,
      fallbackNeeded: true,
      message: err?.message || '調用系統分享失敗，請使用內建修圖工具。',
    };
  }
}
