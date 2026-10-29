import { APP_VERSION, APP_BUILD_TIME, APP_RELEASE_STAGE, saveNodes } from './storage';
import { InventoryNode } from '../types';
import { APP_CHANGELOG } from '../version';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  remoteVersion?: string;
  checkedAt: number;
  message: string;
  changelog?: string[];
}

/**
 * Checks for ServiceWorker updates or remote build changes without spamming the user.
 * Combines HTTP API check (/api/version with Cache-Buster) and ServiceWorker update.
 */
export async function checkOnlineUpdate(): Promise<UpdateCheckResult> {
  let hasUpdate = false;
  let remoteVersion = APP_VERSION;
  let message = `連線檢查完成：目前手機運行的版本已是最新版 v${APP_VERSION}，無須更新。`;
  let changelog: string[] = [];

  // 1. Direct Server Version API Query with Cache-Buster
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`/api/version?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.version) {
        remoteVersion = data.version;
        // Compare versions or build timestamps
        const isNewerVersion = data.version !== APP_VERSION;
        const isNewerBuild = data.buildTime && data.buildTime > APP_BUILD_TIME;

        if (isNewerVersion || isNewerBuild) {
          hasUpdate = true;
          message = `發現最新版本程式 v${data.version}！點擊下方按鈕即可立即無縫升級。`;
          if (Array.isArray(data.changelog) && data.changelog.length > 0) {
            const targetLog = data.changelog.find((c: any) => c.version === data.version);
            if (targetLog && targetLog.changes) {
              changelog = targetLog.changes;
            }
          }
        }
      }
    }
  } catch (err) {
    // In pure offline / PWA standalone mode
  }

  // 2. Service Worker Registration check
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        if (reg.waiting || reg.installing) {
          hasUpdate = true;
          message = `發現新版本程式就緒！點擊即可立即無縫升級。`;
        }
      }
    }
  } catch (e) {
    if (!hasUpdate) {
      message = `離線自成一體運行中，所有資料完整儲存於本機。`;
    }
  }

  return {
    hasUpdate,
    currentVersion: APP_VERSION,
    remoteVersion,
    checkedAt: Date.now(),
    message,
    changelog: changelog.length > 0 ? changelog : APP_CHANGELOG[0]?.changes,
  };
}

/**
 * Safely writes all in-memory nodes & drafts to IndexedDB/LocalStorage, clears stale caches, and hot-reloads.
 * Does NOT require user to restart mobile app or lose any state.
 */
export async function performSmoothUpdate(nodes: InventoryNode[]): Promise<void> {
  try {
    // 1. Synchronously persist all in-memory data first
    if (nodes && nodes.length > 0) {
      saveNodes(nodes);
    }

    // 2. Clear stale cache storage to guarantee latest JS & CSS bundles
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // 3. Update service workers and skip waiting
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        await reg.update();
      }
    }
  } catch (err) {
    console.warn('performSmoothUpdate error:', err);
  }

  // 4. Reload page with a cache-busting timestamp query parameter
  // This bypasses mobile Safari & Android Chrome's aggressive PWA disk cache!
  setTimeout(() => {
    const cleanUrl = window.location.pathname + window.location.hash;
    const separator = cleanUrl.includes('?') ? '&' : '?';
    window.location.replace(`${cleanUrl}${separator}updated_at=${Date.now()}`);
  }, 350);
}
