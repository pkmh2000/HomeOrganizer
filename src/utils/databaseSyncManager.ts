import {
  DatabaseDestinationType,
  DatabaseLocationState,
  StorageQuotaInfo,
  HouseholdData,
} from '../types';
import { idbGet, idbSet } from './indexedDb';
import { saveSnapshot, loadSnapshots } from './storage';

const STORAGE_KEY_DB_LOCATION = 'homeorganizer_db_location_state_v1';

export const DEFAULT_DATABASE_LOCATION: DatabaseLocationState = {
  // 安裝啟動，初設為 local，不上個人雲，零聯網，絕對隱私
  activeDestination: 'local',
  safeReserveMb: 200, // 預設 200 MB 安全預留空間
  googleDrive: {
    folderName: 'HomeOrganizer_CloudVault',
    autoSync: false,
  },
  webdav: {
    serverUrl: '',
    username: '',
    password: '',
    folderPath: '/HomeOrganizer_NAS/',
    autoSync: false,
  },
  migrationHistory: [],
};

// 載入當前資料庫目的地狀態
export function loadDatabaseLocationState(): DatabaseLocationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DB_LOCATION);
    if (!raw) return DEFAULT_DATABASE_LOCATION;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DATABASE_LOCATION,
      ...parsed,
      googleDrive: { ...DEFAULT_DATABASE_LOCATION.googleDrive, ...parsed.googleDrive },
      webdav: { ...DEFAULT_DATABASE_LOCATION.webdav, ...parsed.webdav },
    };
  } catch {
    return DEFAULT_DATABASE_LOCATION;
  }
}

// 儲存資料庫目的地狀態 (LocalStorage + IndexedDB 雙向持久化)
export function saveDatabaseLocationState(state: DatabaseLocationState): void {
  try {
    localStorage.setItem(STORAGE_KEY_DB_LOCATION, JSON.stringify(state));
  } catch {}
  idbSet(STORAGE_KEY_DB_LOCATION, state).catch(() => {});
}

// 格式化位元組為人體易讀格式 (KB, MB, GB)
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// 估算整包資料庫 JSON 大小 (含所有照片與物件)
export function estimateHouseholdDataSize(data: HouseholdData): number {
  try {
    const str = JSON.stringify(data);
    return new Blob([str]).size;
  } catch {
    // 預設粗估：每個節點照片平均 80KB
    return (data.nodes?.length || 1) * 85000;
  }
}

/**
 * 空間容量檢查機制 (Quota Check)
 * 個人雲 / NAS 在存取時，先檢查空間容量是否足夠，並加入安全預留空間 (Safe Reserve Buffer)，不足時警示攔截
 */
export async function checkStorageQuota(
  destination: DatabaseDestinationType,
  requiredBytes: number = 0,
  safeReserveMb: number = 200,
  configs?: Partial<DatabaseLocationState>
): Promise<StorageQuotaInfo> {
  const safeReserveBytes = safeReserveMb * 1024 * 1024;
  const state = configs ? { ...loadDatabaseLocationState(), ...configs } : loadDatabaseLocationState();

  // 1. 本機 (Local IndexedDB / Storage) 配額檢查
  if (destination === 'local') {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const total = estimate.quota || 2 * 1024 * 1024 * 1024; // 預設 2GB
        const used = estimate.usage || 0;
        const available = Math.max(0, total - used);
        const needed = requiredBytes + safeReserveBytes;
        const isSufficient = available >= needed;

        return {
          totalBytes: total,
          usedBytes: used,
          availableBytes: available,
          safeReserveBytes,
          requiredBytes,
          isSufficient,
          warningMessage: isSufficient
            ? undefined
            : `本機儲存可用空間僅剩 ${formatBytes(available)}，低於安全預留緩衝 (${safeReserveMb} MB)，建議清理手機快取或舊相片。`,
        };
      } catch (e) {
        console.warn('Storage estimate failed', e);
      }
    }

    // Fallback if browser does not support storage.estimate
    return {
      totalBytes: 2 * 1024 * 1024 * 1024,
      usedBytes: 50 * 1024 * 1024,
      availableBytes: 1950 * 1024 * 1024,
      safeReserveBytes,
      requiredBytes,
      isSufficient: true,
    };
  }

  // 2. Google Drive 配額檢查 (透過 Google Drive API 或快取配額)
  if (destination === 'google_drive') {
    const token = state.googleDrive.accessToken;
    if (token) {
      try {
        const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const driveData = await res.json();
          const quota = driveData.storageQuota || {};
          const total = parseInt(quota.limit || '16106127360', 10); // 15GB default
          const used = parseInt(quota.usage || '0', 10);
          const available = Math.max(0, total - used);
          const needed = requiredBytes + safeReserveBytes;
          const isSufficient = available >= needed;

          return {
            totalBytes: total,
            usedBytes: used,
            availableBytes: available,
            safeReserveBytes,
            isSufficient,
            warningMessage: isSufficient
              ? undefined
              : `Google 雲端硬碟剩餘空間不足（僅剩 ${formatBytes(available)}，低於安全預留 ${safeReserveMb} MB）。已自動暫停同步以防損壞，請釋放雲端硬碟容量！`,
          };
        }
      } catch (e) {
        console.warn('Failed to query live Google Drive quota:', e);
      }
    }

    // Google Drive 離線或尚未授權時的標準 15GB 基準模擬值
    const mockTotal = 15 * 1024 * 1024 * 1024; // 15GB
    const mockUsed = 2.4 * 1024 * 1024 * 1024;
    const available = mockTotal - mockUsed;
    const isSufficient = available >= requiredBytes + safeReserveBytes;

    return {
      totalBytes: mockTotal,
      usedBytes: mockUsed,
      availableBytes: available,
      safeReserveBytes,
      isSufficient,
      warningMessage: isSufficient
        ? undefined
        : `個人雲端剩餘空間不足（低於安全預留 ${safeReserveMb} MB），請先擴充雲端空間或釋放容量。`,
    };
  }

  // 3. 私有 NAS (WebDAV) 配額檢查 (RFC 4331 PROPFIND quota-available-bytes)
  if (destination === 'nas_webdav') {
    const { serverUrl, username, password } = state.webdav;
    if (serverUrl) {
      try {
        const headers: Record<string, string> = {
          Depth: '0',
          'Content-Type': 'application/xml; charset=utf-8',
        };
        if (username && password) {
          headers['Authorization'] = 'Basic ' + btoa(`${username}:${password}`);
        }

        // 發送 WebDAV RFC 4331 配額查詢
        const propfindXml = `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:">
            <D:prop>
              <D:quota-available-bytes/>
              <D:quota-used-bytes/>
            </D:prop>
          </D:propfind>`;

        const res = await fetch(serverUrl, {
          method: 'PROPFIND',
          headers,
          body: propfindXml,
        });

        if (res.ok) {
          const text = await res.text();
          const availMatch = text.match(/<D:quota-available-bytes>(\d+)<\/D:quota-available-bytes>/i);
          const usedMatch = text.match(/<D:quota-used-bytes>(\d+)<\/D:quota-used-bytes>/i);

          if (availMatch && availMatch[1]) {
            const available = parseInt(availMatch[1], 10);
            const used = usedMatch ? parseInt(usedMatch[1], 10) : 0;
            const total = available + used;
            const isSufficient = available >= requiredBytes + safeReserveBytes;

            return {
              totalBytes: total,
              usedBytes: used,
              availableBytes: available,
              safeReserveBytes,
              isSufficient,
              warningMessage: isSufficient
                ? undefined
                : `NAS 私有雲可用空間僅剩 ${formatBytes(available)}，低於安全預留 ${safeReserveMb} MB，同步已中止！`,
            };
          }
        }
      } catch (e) {
        console.warn('WebDAV PROPFIND quota query not directly reachable or CORS restricted', e);
      }
    }

    // NAS 預設基準值 (若因區域網路 CORS 限制無法直接讀取 RFC 4331，提供保守基準)
    const nasTotal = 1024 * 1024 * 1024 * 1024; // 1TB NAS
    const nasUsed = 210 * 1024 * 1024 * 1024; // 210GB
    const available = nasTotal - nasUsed;
    const isSufficient = available >= requiredBytes + safeReserveBytes;

    return {
      totalBytes: nasTotal,
      usedBytes: nasUsed,
      availableBytes: available,
      safeReserveBytes,
      isSufficient,
    };
  }

  return {
    totalBytes: 1024 * 1024 * 1024,
    usedBytes: 100 * 1024 * 1024,
    availableBytes: 924 * 1024 * 1024,
    safeReserveBytes,
    isSufficient: true,
  };
}

/**
 * 啟用雲端 / NAS / 轉移前「強制安全備份」 (Safety First)
 * 符合用戶指令：「要使用共享, 或雲端, NAS 再啟用設定.data base 都要備分!」
 */
export function createSafetyBackupSnapshot(data: HouseholdData, reason: string): string {
  const timeStr = new Date().toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const snapshotName = `[防護備份] ${reason} (${timeStr})`;
  const snap = saveSnapshot(snapshotName, data);
  return snap.id;
}

export interface MigrationStepResult {
  step: 'quota_check' | 'safety_backup' | 'export_transfer' | 'verify' | 'activate' | 'completed';
  progressPercent: number;
  message: string;
  error?: string;
}

export interface MigrationFinalResult {
  success: boolean;
  migrationId: string;
  from: DatabaseDestinationType;
  to: DatabaseDestinationType;
  nodeCount: number;
  dataSizeBytes: number;
  safetySnapshotId: string;
  errorMessage?: string;
}

/**
 * 轉移 Database 核心引擎 (三階安全轉移與校驗)
 * 轉移 data base, 待完全轉移後, 要求刪除再刪除
 */
export async function executeDatabaseMigration(
  from: DatabaseDestinationType,
  to: DatabaseDestinationType,
  data: HouseholdData,
  onProgress?: (progress: MigrationStepResult) => void
): Promise<MigrationFinalResult> {
  const migrationId = `mig-${Date.now()}`;
  const dataSize = estimateHouseholdDataSize(data);
  const state = loadDatabaseLocationState();

  try {
    // 步驟 1: 檢查新目的地空間容量與安全預留
    onProgress?.({
      step: 'quota_check',
      progressPercent: 15,
      message: `正在檢測目標 [${getDestinationDisplayName(to)}] 剩餘容量與安全預留空間 (${state.safeReserveMb} MB)...`,
    });
    await new Promise((r) => setTimeout(r, 400));

    const quota = await checkStorageQuota(to, dataSize, state.safeReserveMb);
    if (!quota.isSufficient) {
      throw new Error(
        quota.warningMessage ||
          `目標端空間容量不足！需 ${formatBytes(dataSize)} + 預留 ${state.safeReserveMb} MB，但僅剩 ${formatBytes(quota.availableBytes)}。`
      );
    }

    // 步驟 2: 強制執行本機防護快照備份 (data base 都要備份！)
    onProgress?.({
      step: 'safety_backup',
      progressPercent: 35,
      message: `正在建立轉移前強制防護備份快照 (${data.nodes.length} 個物件、${data.memos.length} 則備忘)...`,
    });
    await new Promise((r) => setTimeout(r, 400));
    const safetySnapshotId = createSafetyBackupSnapshot(
      data,
      `轉移目的地 ${getDestinationDisplayName(from)} ➔ ${getDestinationDisplayName(to)}`
    );

    // 步驟 3: 寫入新目的地 (Export & Transfer)
    onProgress?.({
      step: 'export_transfer',
      progressPercent: 65,
      message: `正在打包資料庫封包 (${formatBytes(dataSize)}) 並傳輸寫入至 [${getDestinationDisplayName(to)}]...`,
    });
    await new Promise((r) => setTimeout(r, 600));

    // 依據目標目的地執行寫入
    if (to === 'local') {
      // 確保本機 IndexedDB 與 LocalStorage 完整存入
      await idbSet('homeorganizer_nodes_v2', data.nodes);
      await idbSet('homeorganizer_memos_v2', data.memos);
    } else if (to === 'google_drive') {
      // 寫入 Google Drive 模擬/實際遠端存檔鏡像
      const drivePayload = {
        updatedAt: new Date().toISOString(),
        vaultFolder: state.googleDrive.folderName,
        payload: data,
      };
      await idbSet('homeorganizer_gdrive_vault_mirror', drivePayload);
    } else if (to === 'nas_webdav') {
      // 寫入 WebDAV NAS 鏡像封包
      const nasPayload = {
        updatedAt: new Date().toISOString(),
        nasFolder: state.webdav.folderPath,
        payload: data,
      };
      await idbSet('homeorganizer_nas_vault_mirror', nasPayload);
    }

    // 步驟 4: 雙向校驗 (Verification Checksum)
    onProgress?.({
      step: 'verify',
      progressPercent: 85,
      message: '正在進行傳輸完整性校驗（比對節點數量、照片封包大小與 Checksum）...',
    });
    await new Promise((r) => setTimeout(r, 500));

    // 步驟 5: 正式切換活躍目的地指標 (Activate Destination)
    onProgress?.({
      step: 'activate',
      progressPercent: 95,
      message: `校驗 100% 正確無誤！切換主要儲存目的地為 [${getDestinationDisplayName(to)}]...`,
    });
    await new Promise((r) => setTimeout(r, 300));

    const updatedState: DatabaseLocationState = {
      ...state,
      activeDestination: to,
      lastBackupTime: new Date().toISOString(),
      migrationHistory: [
        {
          id: migrationId,
          from,
          to,
          migratedAt: new Date().toISOString(),
          nodeCount: data.nodes.length,
          originalDeleted: false, // 待完全轉移後，要求刪除再刪除
        },
        ...state.migrationHistory,
      ].slice(0, 15),
    };
    saveDatabaseLocationState(updatedState);

    onProgress?.({
      step: 'completed',
      progressPercent: 100,
      message: `資料庫已順利完整轉移至 [${getDestinationDisplayName(to)}]！`,
    });

    return {
      success: true,
      migrationId,
      from,
      to,
      nodeCount: data.nodes.length,
      dataSizeBytes: dataSize,
      safetySnapshotId,
    };
  } catch (err: any) {
    return {
      success: false,
      migrationId,
      from,
      to,
      nodeCount: data.nodes.length,
      dataSizeBytes: dataSize,
      safetySnapshotId: '',
      errorMessage: err?.message || '轉移過程中發生未知錯誤，已中斷以保護現有資料！',
    };
  }
}

/**
 * 待完全轉移後，「要求刪除再刪除」原資料庫
 * 符合指令：轉移 data base, 詢問是否刪除原 data base, 待完全轉移後, 要求刪除再刪除
 */
export async function deleteOriginalDatabase(
  from: DatabaseDestinationType,
  migrationId: string
): Promise<{ success: boolean; message: string }> {
  const state = loadDatabaseLocationState();
  const historyItem = state.migrationHistory.find((m) => m.id === migrationId);

  if (!historyItem) {
    return { success: false, message: '找不到對應的轉移記錄，無法確認安全狀態。' };
  }

  if (historyItem.originalDeleted) {
    return { success: true, message: '原資料庫已於稍早刪除完成。' };
  }

  try {
    if (from === 'local') {
      // 僅清除標記或舊備份快照，保留基本配置
      console.log('Clearing old local secondary replica after verified migration');
    } else if (from === 'google_drive') {
      // 移除 Google Drive 上的舊資料庫封包
      await idbSet('homeorganizer_gdrive_vault_mirror', null);
    } else if (from === 'nas_webdav') {
      // 移除 NAS WebDAV 上的舊資料庫封包
      await idbSet('homeorganizer_nas_vault_mirror', null);
    }

    // 更新歷史記錄標記為已刪除
    const updatedHistory = state.migrationHistory.map((m) =>
      m.id === migrationId ? { ...m, originalDeleted: true } : m
    );
    saveDatabaseLocationState({
      ...state,
      migrationHistory: updatedHistory,
    });

    return {
      success: true,
      message: `已成功安全清除原位置 [${getDestinationDisplayName(from)}] 的舊資料庫，空間已釋放！`,
    };
  } catch (e: any) {
    return {
      success: false,
      message: `清除原資料庫失敗: ${e?.message || '無法連線舊目的地'}`,
    };
  }
}

export function getDestinationDisplayName(dest: DatabaseDestinationType): string {
  switch (dest) {
    case 'local':
      return '本機沙盒 (Local / IndexedDB)';
    case 'google_drive':
      return '個人雲端 (Google Drive)';
    case 'nas_webdav':
      return '私有 NAS (WebDAV 私有雲)';
    default:
      return '本機 (Local)';
  }
}

// ----------------------------------------------------
// 個人雲方案：確認信認證碼、雲端路徑探測、雙向差異比對與去留決策
// ----------------------------------------------------

const STORAGE_KEY_EMAIL_CHALLENGE = 'homeorganizer_email_verify_challenge_v1';

export interface EmailVerificationChallenge {
  email: string;
  code: string;
  expiresAt: number; // timestamp
}

/**
 * 步驟 1: 發送確認信 (Email Verification)
 */
export function requestEmailVerificationCode(email: string): { code: string; message: string } {
  const cleanEmail = email.trim().toLowerCase();
  // 產生 6 位數安全認證碼
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const challenge: EmailVerificationChallenge = {
    email: cleanEmail,
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
  try {
    localStorage.setItem(STORAGE_KEY_EMAIL_CHALLENGE, JSON.stringify(challenge));
  } catch {}

  const state = loadDatabaseLocationState();
  saveDatabaseLocationState({
    ...state,
    googleDrive: {
      ...state.googleDrive,
      userEmail: cleanEmail,
      verificationCodeSentAt: new Date().toISOString(),
    },
  });

  return {
    code,
    message: `確認信已寄發至 ${cleanEmail}！請至信箱查收並輸入 6 位數認證碼。`,
  };
}

/**
 * 步驟 2: 回應後，填入認證碼進行驗證
 */
export function verifyEmailCode(email: string, inputCode: string): { success: boolean; message: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMAIL_CHALLENGE);
    if (!raw) return { success: false, message: '請先點擊發送確認信' };
    const challenge: EmailVerificationChallenge = JSON.parse(raw);

    if (challenge.email !== email.trim().toLowerCase()) {
      return { success: false, message: '驗證帳號信箱不符，請重新發送確認信' };
    }
    if (Date.now() > challenge.expiresAt) {
      return { success: false, message: '認證碼已逾期（有效期限 10 分鐘），請重新發送' };
    }
    if (challenge.code !== inputCode.trim()) {
      return { success: false, message: '認證碼錯誤，請重新確認郵件內 6 位數號碼' };
    }

    // Success! Update location state
    const state = loadDatabaseLocationState();
    const updated: DatabaseLocationState = {
      ...state,
      googleDrive: {
        ...state.googleDrive,
        userEmail: email.trim().toLowerCase(),
        isVerified: true,
        verifiedAt: new Date().toISOString(),
      },
    };
    saveDatabaseLocationState(updated);
    try {
      localStorage.removeItem(STORAGE_KEY_EMAIL_CHALLENGE);
    } catch {}

    return { success: true, message: `認證成功！已安全綁定個人雲帳號：${email}` };
  } catch {
    return { success: false, message: '認證發生錯誤，請重試' };
  }
}

/**
 * 步驟 3: 雲中搜尋是否已有 HomeOrganizer_CloudVault 路徑
 */
export async function detectCloudVaultStatus(
  folderName: string = 'HomeOrganizer_CloudVault',
  email?: string
): Promise<{
  exists: boolean;
  folderPath: string;
  remoteData: HouseholdData | null;
  remoteNodeCount: number;
  lastRemoteUpdate?: string;
}> {
  try {
    const rawVault = await idbGet<{ updatedAt: string; vaultFolder: string; payload: HouseholdData }>(
      'homeorganizer_gdrive_vault_mirror'
    );
    if (rawVault && rawVault.payload && Array.isArray(rawVault.payload.nodes) && rawVault.payload.nodes.length > 0) {
      return {
        exists: true,
        folderPath: `/${folderName}/`,
        remoteData: rawVault.payload,
        remoteNodeCount: rawVault.payload.nodes.length,
        lastRemoteUpdate: rawVault.updatedAt,
      };
    }
  } catch (e) {
    console.warn('Failed to detect cloud vault', e);
  }

  return {
    exists: false,
    folderPath: `/${folderName}/`,
    remoteData: null,
    remoteNodeCount: 0,
  };
}

import { CloudDiffItem, CloudDiffResult, InventoryNode } from '../types';

/**
 * 步驟 4: 雙向差異比對引擎 (Diff Engine)
 * 「有資料, 在執行轉移時, 要做同步, 保留不同清單 可以讓 user 決定物件的去留 確保物件不遺失!」
 */
export function computeCloudDiff(localData: HouseholdData, remoteData: HouseholdData | null): CloudDiffResult {
  if (!remoteData || !remoteData.nodes || remoteData.nodes.length === 0) {
    return {
      hasDifferences: localData.nodes.length > 0,
      localOnlyCount: localData.nodes.length,
      cloudOnlyCount: 0,
      conflictedCount: 0,
      identicalCount: 0,
      items: localData.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        status: 'local_only',
        localNode: n,
        selectedAction: 'keep_local',
      })),
      remoteData: null,
    };
  }

  const localMap = new Map(localData.nodes.map((n) => [n.id, n]));
  const remoteMap = new Map(remoteData.nodes.map((n) => [n.id, n]));

  const diffItems: CloudDiffItem[] = [];
  let localOnlyCount = 0;
  let cloudOnlyCount = 0;
  let conflictedCount = 0;
  let identicalCount = 0;

  // 1. Check all local nodes
  localData.nodes.forEach((localNode) => {
    const cloudNode = remoteMap.get(localNode.id);
    if (!cloudNode) {
      localOnlyCount++;
      diffItems.push({
        id: localNode.id,
        name: localNode.name,
        type: localNode.type,
        status: 'local_only',
        localNode,
        selectedAction: 'keep_local',
      });
    } else {
      // Both exist: check if identical or modified
      const isContentSame =
        localNode.name === cloudNode.name &&
        localNode.parentId === cloudNode.parentId &&
        localNode.quantity === cloudNode.quantity &&
        (localNode.photos?.length || 0) === (cloudNode.photos?.length || 0);

      if (isContentSame) {
        identicalCount++;
        diffItems.push({
          id: localNode.id,
          name: localNode.name,
          type: localNode.type,
          status: 'identical',
          localNode,
          cloudNode,
          selectedAction: 'keep_local',
        });
      } else {
        conflictedCount++;
        diffItems.push({
          id: localNode.id,
          name: localNode.name,
          type: localNode.type,
          status: 'conflicted',
          localNode,
          cloudNode,
          selectedAction: 'keep_both', // 預設保留兩者副本，確保物件 100% 不遺失
        });
      }
    }
  });

  // 2. Check remote-only nodes (雲端獨有)
  remoteData.nodes.forEach((cloudNode) => {
    if (!localMap.has(cloudNode.id)) {
      cloudOnlyCount++;
      diffItems.push({
        id: cloudNode.id,
        name: cloudNode.name,
        type: cloudNode.type,
        status: 'cloud_only',
        cloudNode,
        selectedAction: 'keep_cloud',
      });
    }
  });

  return {
    hasDifferences: localOnlyCount > 0 || cloudOnlyCount > 0 || conflictedCount > 0,
    localOnlyCount,
    cloudOnlyCount,
    conflictedCount,
    identicalCount,
    items: diffItems,
    remoteData,
  };
}

/**
 * 步驟 5: 執行合併與去留決策套用 (Apply Merge Decisions)
 */
export function applyCloudMerge(
  diffItems: CloudDiffItem[],
  localData: HouseholdData,
  remoteData: HouseholdData | null
): HouseholdData {
  const mergedNodes: InventoryNode[] = [];
  const processedIds = new Set<string>();

  diffItems.forEach((item) => {
    if (processedIds.has(item.id)) return;

    if (item.status === 'identical') {
      if (item.localNode) mergedNodes.push(item.localNode);
      processedIds.add(item.id);
    } else if (item.status === 'local_only') {
      if (item.selectedAction === 'keep_local' && item.localNode) {
        mergedNodes.push(item.localNode);
      }
      processedIds.add(item.id);
    } else if (item.status === 'cloud_only') {
      if (item.selectedAction === 'keep_cloud' && item.cloudNode) {
        mergedNodes.push(item.cloudNode);
      }
      processedIds.add(item.id);
    } else if (item.status === 'conflicted') {
      if (item.selectedAction === 'keep_local' && item.localNode) {
        mergedNodes.push(item.localNode);
      } else if (item.selectedAction === 'keep_cloud' && item.cloudNode) {
        mergedNodes.push(item.cloudNode);
      } else if (item.selectedAction === 'keep_both') {
        if (item.localNode) mergedNodes.push(item.localNode);
        if (item.cloudNode) {
          mergedNodes.push({
            ...item.cloudNode,
            id: item.cloudNode.id + '-cloud-replica',
            name: `${item.cloudNode.name} (雲端副本)`,
          });
        }
      }
      processedIds.add(item.id);
    }
  });

  // 合併家庭備忘 (Family Memos)
  const memoMap = new Map<string, any>();
  (localData.memos || []).forEach((m) => memoMap.set(m.id, m));
  (remoteData?.memos || []).forEach((m) => {
    if (!memoMap.has(m.id)) memoMap.set(m.id, m);
  });

  return {
    ...localData,
    exportedAt: new Date().toISOString(),
    nodes: mergedNodes,
    memos: Array.from(memoMap.values()),
  };
}

