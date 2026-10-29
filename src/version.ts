/**
 * Single source of truth for HomeOrganizer application version & release metadata.
 * Can be automatically bumped during GitHub Sync / CI-CD or via `npm run bump`.
 */

export const APP_VERSION = '1.00.05'; // 遞增版號
export const APP_BUILD_TIME = '2026-10-29T10:43:24.710Z'; // 建置發布時間戳
export const APP_RELEASE_STAGE = 'beta_iteration'; // 測試迭代版 (正式上線將重置為 v1.0.0)

export interface VersionChangeLog {
  version: string;
  date: string;
  changes: string[];
}

export const APP_CHANGELOG: VersionChangeLog[] = [
  {
    version: '1.00.05',
    date: '2026-10-29',
    changes: [
      '修復拍照暫存區轉移歸檔問題：修復未歸檔收件匣與正規容器視角衝突，存入後直接切換目的地並即刻呈現物件。',
      '拍照暫存區增強：新增每張照片「單張存入」獨立快捷鍵，底部提供「保留暫存並離開」、「存入繼續編輯剩餘」與「確定存入並關閉」。',
      '個人雲安全解除綁定：個人雲卡片新增「解除綁定個人雲」按鈕。',
      '轉移回 Local 容量安全檢測：若個人雲為主資料庫，解除前強制先移回 Local，並於轉移前即時檢測本機儲存配額與安全緩衝，空間不足自動鎖定轉移防止資料遺失。',
    ],
  },
  {
    version: '1.00.04',
    date: '2026-10-28',
    changes: [
      '本機優先 (Local-First)：安裝啟動初設為 Local，零帳號綁定、不上個人雲，純離線沙盒保護隱私。',
      '隨需啟用與自動備份：啟用 Google Drive 或私有 NAS (WebDAV) 前，自動觸發資料庫防護快照備份。',
      '隨時指定資料庫目的地：可隨時在 Local、Google Drive、私有 NAS 之間自由指定主要存儲位置。',
      '無損三階安全搬遷嚮導：傳輸完整性雙向校驗，待轉移 100% 成功後彈窗詢問是否刪除原庫，要求刪除再刪除。',
      '容量檢測與安全預留緩衝：存取前自動檢測雲端/NAS容量，設置 200MB 緩衝空間，容量不足時主動警示攔截。',
    ],
  },
  {
    version: '1.00.03',
    date: '2026-10-27',
    changes: [
      '修復手機版物件名稱過長自適應與動作按鈕常駐。',
      '新增成員即時連動借還與物件歸屬清單。',
    ],
  },

  {
    version: '1.00.02',
    date: '2026-10-27',
    changes: [
      '物件完整縮圖呈現：支援全圖無裁切完整顯示 (Contain) 與填滿模式切換，不再被裁切邊緣。',
      '高效能縮圖暫存快取機制：採用非同步快取與 LRU 淘汰機制，減少行動裝置資源消耗與卡頓，支援逾期自動清除。',
      '手機線上即時更新檢驗修復：增加伺服器版本檢測與快取穿透 (Cache-Busting)，解決手機無法檢測到最新版的問題。',
      '免重啟 App 平滑熱更新：更新無需關閉或重啟 App，一鍵熱載入並 100% 守護所有照片與資料。',
      'GitHub Sync 自動遞增版本規格就緒：提供版本遞增指令與 GitHub Action 流程。',
    ],
  },
  {
    version: '1.00.01',
    date: '2026-10-26',
    changes: [
      '修復手機版物件名稱過長時，編輯等動作按鈕被擠出畫面的問題。',
      '修正新增成員後物件歸屬人 (Owner) 未即時列出的問題，並連動借出追蹤與移轉。',
      '加入至少 3 步（至多 20 步）操作重做 (Redo) 功能。',
      '拍照後名稱欄位提供 (x) 一鍵清除按鈕。',
    ],
  },
];
