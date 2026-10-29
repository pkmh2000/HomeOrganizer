import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  Cloud,
  Server,
  ShieldCheck,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Trash2,
  Bookmark,
  RefreshCw,
  Sliders,
  FolderOpen,
  Info,
  Clock,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Mail,
  KeyRound,
  GitCompare,
  Layers,
  FileCheck,
  ArrowDownCircle,
  Check,
  X,
  HelpCircle,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  DatabaseDestinationType,
  DatabaseLocationState,
  StorageQuotaInfo,
  HouseholdData,
  CloudDiffResult,
  CloudDiffItem,
} from '../types';
import {
  loadDatabaseLocationState,
  saveDatabaseLocationState,
  checkStorageQuota,
  executeDatabaseMigration,
  deleteOriginalDatabase,
  getDestinationDisplayName,
  formatBytes,
  estimateHouseholdDataSize,
  createSafetyBackupSnapshot,
  DEFAULT_DATABASE_LOCATION,
  requestEmailVerificationCode,
  verifyEmailCode,
  detectCloudVaultStatus,
  computeCloudDiff,
  applyCloudMerge,
} from '../utils/databaseSyncManager';
import { requestCloudUnbindCode, verifyCloudUnbindCode } from '../utils/authManager';
import { idbSet } from '../utils/indexedDb';

interface DatabaseDestinationManagerProps {
  householdData: HouseholdData;
  activeUserEmail?: string;
  onRefreshData?: (updatedData: HouseholdData) => void;
  onSnapshotCreated?: () => void;
}

export const DatabaseDestinationManager: React.FC<DatabaseDestinationManagerProps> = ({
  householdData,
  activeUserEmail,
  onRefreshData,
  onSnapshotCreated,
}) => {
  const [dbState, setDbState] = useState<DatabaseLocationState>(() => loadDatabaseLocationState());
  const [quotaInfo, setQuotaInfo] = useState<StorageQuotaInfo | null>(null);
  const [isCheckingQuota, setIsCheckingQuota] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<DatabaseDestinationType>(dbState.activeDestination);

  // Cloud/NAS Setup Forms toggle
  const [isEditingCloud, setIsEditingCloud] = useState(false);
  const [isEditingNas, setIsEditingNas] = useState(false);

  // Email Verification State (個人雲認證信流程，絕無硬編碼)
  const [emailInput, setEmailInput] = useState<string>(
    dbState.googleDrive.userEmail || activeUserEmail || ''
  );
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [codeSent, setCodeSent] = useState<boolean>(false);
  const [codeSentPreview, setCodeSentPreview] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // 更改個人雲綁定安全防護（原 mail 認證退出 + 再次綁定 mail 認證，避免 user 被他人私自轉移）
  const [isChangeCloudModalOpen, setIsChangeCloudModalOpen] = useState<boolean>(false);
  const [unbindStep, setUnbindStep] = useState<'verify_old' | 'bind_new'>('verify_old');
  const [oldEmailCode, setOldEmailCode] = useState<string>('');
  const [oldEmailCodeSent, setOldEmailCodeSent] = useState<boolean>(false);
  const [oldEmailCodePreview, setOldEmailCodePreview] = useState<string | null>(null);
  const [unbindError, setUnbindError] = useState<string | null>(null);

  const [newEmailInput, setNewEmailInput] = useState<string>('');
  const [newEmailCode, setNewEmailCode] = useState<string>('');
  const [newEmailCodeSent, setNewEmailCodeSent] = useState<boolean>(false);
  const [newEmailCodePreview, setNewEmailCodePreview] = useState<string | null>(null);
  const [bindNewError, setBindNewError] = useState<string | null>(null);

  // 解除綁定個人雲 (Unbind / Disconnect Cloud Vault)
  const [isUnbindModalOpen, setIsUnbindModalOpen] = useState<boolean>(false);
  const [localQuotaForUnbind, setLocalQuotaForUnbind] = useState<StorageQuotaInfo | null>(null);
  const [isCheckingLocalQuota, setIsCheckingLocalQuota] = useState<boolean>(false);
  const [isUnbindingAndMigrating, setIsUnbindingAndMigrating] = useState<boolean>(false);
  const [unbindProgress, setUnbindProgress] = useState<{ percent: number; message: string }>({
    percent: 0,
    message: '',
  });

  // Cloud Vault Status State (雲中搜尋 HomeOrganizer_CloudVault 路徑)
  const [vaultStatus, setVaultStatus] = useState<{
    checked: boolean;
    exists: boolean;
    folderPath: string;
    remoteData: HouseholdData | null;
    remoteNodeCount: number;
    lastRemoteUpdate?: string;
  } | null>(null);
  const [isCheckingVault, setIsCheckingVault] = useState<boolean>(false);

  // Diff & Decision Modal State (轉移/同步時保留不同清單讓 user 決定去留)
  const [diffModalOpen, setDiffModalOpen] = useState<boolean>(false);
  const [diffResult, setDiffResult] = useState<CloudDiffResult | null>(null);
  const [isApplyingMerge, setIsApplyingMerge] = useState<boolean>(false);

  // Migration Wizard State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<{
    percent: number;
    message: string;
  }>({ percent: 0, message: '' });

  // Post-migration dialog state (詢問是否刪除原 data base，待完全轉移後，要求刪除再刪除)
  const [postMigrationPrompt, setPostMigrationPrompt] = useState<{
    migrationId: string;
    from: DatabaseDestinationType;
    to: DatabaseDestinationType;
  } | null>(null);
  const [deleteConfirmationStep, setDeleteConfirmationStep] = useState(false);
  const [deleteStatusMessage, setDeleteStatusMessage] = useState<string | null>(null);

  // Safe Reserve Buffer setting
  const [safeReserveMb, setSafeReserveMb] = useState<number>(dbState.safeReserveMb || 200);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const estimatedSize = estimateHouseholdDataSize(householdData);

  // Automatically bring in activeUserEmail if no cloud email was set previously
  useEffect(() => {
    if (!dbState.googleDrive.userEmail && activeUserEmail) {
      setEmailInput(activeUserEmail);
    }
  }, [activeUserEmail, dbState.googleDrive.userEmail]);

  // Refresh quota when active destination or buffer changes
  useEffect(() => {
    let isMounted = true;
    setIsCheckingQuota(true);
    checkStorageQuota(dbState.activeDestination, estimatedSize, safeReserveMb)
      .then((info) => {
        if (isMounted) {
          setQuotaInfo(info);
          setIsCheckingQuota(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsCheckingQuota(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dbState.activeDestination, safeReserveMb, estimatedSize]);

  // Check cloud vault status whenever folderName or googleDrive config updates
  const refreshVaultStatus = useCallback(async () => {
    setIsCheckingVault(true);
    try {
      const status = await detectCloudVaultStatus(
        dbState.googleDrive.folderName || 'HomeOrganizer_CloudVault',
        dbState.googleDrive.userEmail
      );
      setVaultStatus({
        checked: true,
        ...status,
      });
    } catch {
      setVaultStatus({
        checked: true,
        exists: false,
        folderPath: `/${dbState.googleDrive.folderName || 'HomeOrganizer_CloudVault'}/`,
        remoteData: null,
        remoteNodeCount: 0,
      });
    } finally {
      setIsCheckingVault(false);
    }
  }, [dbState.googleDrive.folderName, dbState.googleDrive.userEmail]);

  useEffect(() => {
    refreshVaultStatus();
  }, [refreshVaultStatus]);

  // Handle changing safe reserve buffer
  const handleUpdateSafeReserve = (newMb: number) => {
    setSafeReserveMb(newMb);
    const updated = { ...dbState, safeReserveMb: newMb };
    setDbState(updated);
    saveDatabaseLocationState(updated);
    setFeedbackNotice(`安全預留緩衝空間已調整為 ${newMb} MB`);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  // Step 1: Send confirmation email with 6-digit code
  const handleSendVerificationCode = () => {
    if (!emailInput || !emailInput.includes('@')) {
      setVerifyError('請輸入有效的使用者個人雲 Email 信箱');
      return;
    }
    setVerifyError(null);
    const { code, message } = requestEmailVerificationCode(emailInput);
    setCodeSent(true);
    setCodeSentPreview(code); // For seamless user testing & verification
    setFeedbackNotice(message);
    setTimeout(() => setFeedbackNotice(null), 6000);
  };

  // Step 2: User enters 6-digit code to verify and bind
  const handleVerifyCodeSubmit = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setVerifyError('請輸入正確的 6 位數認證碼');
      return;
    }
    const res = verifyEmailCode(emailInput, verificationCode);
    if (res.success) {
      setVerifyError(null);
      const newState = loadDatabaseLocationState();
      setDbState(newState);
      setCodeSent(false);
      setVerificationCode('');
      setCodeSentPreview(null);
      setFeedbackNotice(res.message);
      refreshVaultStatus();
      setTimeout(() => setFeedbackNotice(null), 5000);
    } else {
      setVerifyError(res.message);
    }
  };

  // ----------------------------------------------------
  // 更改個人雲帳號流程 (原信箱認證退出 ➔ 新信箱認證綁定)
  // ----------------------------------------------------

  // Step A: 發送退出確認信至原綁定信箱
  const handleSendOldEmailUnbindCode = () => {
    const currentEmail = dbState.googleDrive.userEmail;
    if (!currentEmail) return;
    const res = requestCloudUnbindCode(currentEmail);
    setOldEmailCodeSent(true);
    setOldEmailCodePreview(res.code);
    setUnbindError(null);
    setFeedbackNotice(res.message);
    setTimeout(() => setFeedbackNotice(null), 6000);
  };

  // Step B: 輸入認證碼確認解除原綁定
  const handleVerifyOldEmailUnbind = () => {
    const currentEmail = dbState.googleDrive.userEmail;
    if (!currentEmail) return;
    const res = verifyCloudUnbindCode(currentEmail, oldEmailCode);
    if (res.success) {
      setUnbindStep('bind_new');
      setNewEmailInput(activeUserEmail || '');
      setUnbindError(null);
      setFeedbackNotice(res.message);
      setTimeout(() => setFeedbackNotice(null), 5000);
    } else {
      setUnbindError(res.message);
    }
  };

  // Step C: 發送確認信至新信箱
  const handleSendNewEmailBindCode = () => {
    if (!newEmailInput || !newEmailInput.includes('@')) {
      setBindNewError('請輸入有效的新個人雲 Email 信箱');
      return;
    }
    setBindNewError(null);
    const { code, message } = requestEmailVerificationCode(newEmailInput);
    setNewEmailCodeSent(true);
    setNewEmailCodePreview(code);
    setFeedbackNotice(message);
    setTimeout(() => setFeedbackNotice(null), 6000);
  };

  // Step D: 輸入新認證碼完成新信箱綁定
  const handleVerifyNewEmailBind = () => {
    if (!newEmailCode || newEmailCode.length !== 6) {
      setBindNewError('請輸入正確的 6 位數認證碼');
      return;
    }
    const res = verifyEmailCode(newEmailInput, newEmailCode);
    if (res.success) {
      setBindNewError(null);
      const newState = loadDatabaseLocationState();
      setDbState(newState);
      setEmailInput(newEmailInput);
      setIsChangeCloudModalOpen(false);
      setUnbindStep('verify_old');
      setOldEmailCode('');
      setOldEmailCodeSent(false);
      setNewEmailCode('');
      setNewEmailCodeSent(false);
      setFeedbackNotice(`🎉 個人雲已成功安全更換綁定至：${newEmailInput}！`);
      refreshVaultStatus();
      setTimeout(() => setFeedbackNotice(null), 5000);
    } else {
      setBindNewError(res.message);
    }
  };

  // 解除綁定個人雲流程初始化（若個人雲為主資料庫，先檢測 Local 空間是否足夠並要求轉移回 Local）
  const handleInitiateUnbind = async () => {
    setIsUnbindModalOpen(true);
    setUnbindProgress({ percent: 0, message: '' });

    if (dbState.activeDestination === 'google_drive') {
      setIsCheckingLocalQuota(true);
      try {
        const est = estimateHouseholdDataSize(householdData);
        const quota = await checkStorageQuota('local', est, safeReserveMb);
        setLocalQuotaForUnbind(quota);
      } catch (err) {
        console.error('Failed to check local quota for unbind:', err);
      } finally {
        setIsCheckingLocalQuota(false);
      }
    }
  };

  // 確定 local 空間足夠再轉移，並解除綁定
  const handleConfirmReturnToLocalAndUnbind = async () => {
    if (dbState.activeDestination === 'google_drive') {
      // 確定 local 空間容量是否足夠
      if (!localQuotaForUnbind?.isSufficient) {
        alert(
          `⚠️ 本機儲存空間不足，無法執行安全轉移！\n${
            localQuotaForUnbind?.warningMessage || '請先釋出本機空間或調整安全預留緩衝後再嘗試。'
          }\n資料庫仍完整保留於個人雲，未做任何變更。`
        );
        return;
      }

      setIsUnbindingAndMigrating(true);
      setUnbindProgress({ percent: 15, message: '正在建立本機安全防護快照...' });

      createSafetyBackupSnapshot(householdData, '個人雲解除綁定前安全轉移回本機');
      onSnapshotCreated?.();

      const result = await executeDatabaseMigration('google_drive', 'local', householdData, (prog) => {
        setUnbindProgress({
          percent: prog.progressPercent,
          message: prog.message,
        });
      });

      if (!result.success) {
        setIsUnbindingAndMigrating(false);
        alert(`轉移回本機失敗：${result.errorMessage || '未知錯誤'}\n個人雲原資料庫已完整保留，未做任何解除。`);
        return;
      }

      // 轉移成功，更新 activeDestination 為 local，並安全清除個人雲綁定憑證
      const updated: DatabaseLocationState = {
        ...dbState,
        activeDestination: 'local',
        googleDrive: {
          ...dbState.googleDrive,
          userEmail: '',
          isVerified: false,
          verifiedAt: undefined,
          autoSync: false,
        },
      };
      saveDatabaseLocationState(updated);
      setDbState(updated);
      setSelectedTarget('local');
      setEmailInput(activeUserEmail || '');
      setIsUnbindingAndMigrating(false);
      setIsUnbindModalOpen(false);
      refreshVaultStatus();
      onRefreshData?.(householdData);
      setFeedbackNotice('🎉 已成功將主資料庫安全轉移回本機 (Local)，並已解除個人雲綁定！');
      setTimeout(() => setFeedbackNotice(null), 5000);
    } else {
      // 個人雲非主資料庫（目前在 Local 或 NAS），直接解除綁定
      const updated: DatabaseLocationState = {
        ...dbState,
        googleDrive: {
          ...dbState.googleDrive,
          userEmail: '',
          isVerified: false,
          verifiedAt: undefined,
          autoSync: false,
        },
      };
      saveDatabaseLocationState(updated);
      setDbState(updated);
      setEmailInput(activeUserEmail || '');
      setIsUnbindModalOpen(false);
      refreshVaultStatus();
      setFeedbackNotice('已成功解除個人雲帳號綁定。');
      setTimeout(() => setFeedbackNotice(null), 4000);
    }
  };
  const handleSaveGoogleDrive = (e: React.FormEvent) => {
    e.preventDefault();
    createSafetyBackupSnapshot(householdData, '啟用個人雲 Google Drive 存檔配置');
    onSnapshotCreated?.();

    const updated: DatabaseLocationState = {
      ...dbState,
      googleDrive: {
        ...dbState.googleDrive,
        autoSync: true,
      },
    };
    setDbState(updated);
    saveDatabaseLocationState(updated);
    setIsEditingCloud(false);
    refreshVaultStatus();
    setFeedbackNotice('已啟用 Google Drive 配置！系統已自動為您建立防護備份快照。');
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  // Enable / Save NAS WebDAV config with auto-backup
  const handleSaveNasWebdav = (e: React.FormEvent) => {
    e.preventDefault();
    createSafetyBackupSnapshot(householdData, '啟用私有 NAS WebDAV 存檔配置');
    onSnapshotCreated?.();

    const updated: DatabaseLocationState = {
      ...dbState,
      webdav: {
        ...dbState.webdav,
        autoSync: true,
      },
    };
    setDbState(updated);
    saveDatabaseLocationState(updated);
    setIsEditingNas(false);
    setFeedbackNotice('已啟用 NAS WebDAV 配置！系統已自動為您建立防護備份快照。');
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  // Execute Database Migration (三階安全轉移流程)
  const handleStartMigration = async () => {
    if (selectedTarget === dbState.activeDestination) {
      alert(`目前資料庫已經位於 [${getDestinationDisplayName(selectedTarget)}]，無需重複轉移。`);
      return;
    }

    // 若目標是個人雲 Google Drive，且雲端已存在儲存庫且有資料：
    if (selectedTarget === 'google_drive' && vaultStatus?.exists && vaultStatus.remoteData) {
      const diff = computeCloudDiff(householdData, vaultStatus.remoteData);
      if (diff.hasDifferences) {
        setDiffResult(diff);
        setDiffModalOpen(true);
        return;
      }
    }

    await runMigrationCore(selectedTarget, householdData);
  };

  // Core Migration runner
  const runMigrationCore = async (to: DatabaseDestinationType, dataToMigrate: HouseholdData) => {
    const from = dbState.activeDestination;

    setIsMigrating(true);
    setMigrationProgress({ percent: 10, message: '正在初始化轉移任務...' });

    const result = await executeDatabaseMigration(from, to, dataToMigrate, (prog) => {
      setMigrationProgress({
        percent: prog.progressPercent,
        message: prog.message,
      });
    });

    setIsMigrating(false);

    if (result.success) {
      const newState = loadDatabaseLocationState();
      setDbState(newState);
      onSnapshotCreated?.();
      refreshVaultStatus();

      // 成功轉移後，彈窗詢問是否刪除原 data base
      setPostMigrationPrompt({
        migrationId: result.migrationId,
        from,
        to,
      });
      setDeleteConfirmationStep(false);
      setDeleteStatusMessage(null);
    } else {
      alert(`轉移失敗：${result.errorMessage || '未知錯誤'}\n原資料庫已完整保留，未受任何影響。`);
    }
  };

  // 跨裝置同步檢查 (同帳號在其他裝置連結時更新物件)
  const handleCheckMultiDeviceSync = async () => {
    setIsCheckingVault(true);
    const status = await detectCloudVaultStatus(
      dbState.googleDrive.folderName || 'HomeOrganizer_CloudVault',
      dbState.googleDrive.userEmail
    );
    setIsCheckingVault(false);
    setVaultStatus({ checked: true, ...status });

    if (!status.exists || !status.remoteData || status.remoteData.nodes.length === 0) {
      setFeedbackNotice('雲端目前尚未有其他裝置上傳的資料庫。');
      setTimeout(() => setFeedbackNotice(null), 3000);
      return;
    }

    const diff = computeCloudDiff(householdData, status.remoteData);
    if (!diff.hasDifferences) {
      setFeedbackNotice(`🟢 跨裝置已是最新同步狀態！本機與雲端共 ${status.remoteNodeCount} 項物件完全一致。`);
      setTimeout(() => setFeedbackNotice(null), 4000);
      return;
    }

    // 有差異，開啟審查清單讓使用者決定去留
    setDiffResult(diff);
    setDiffModalOpen(true);
  };

  // Apply User Diff Decisions and Complete Migration / Sync
  const handleConfirmDiffMerge = async () => {
    if (!diffResult) return;
    setIsApplyingMerge(true);

    try {
      createSafetyBackupSnapshot(householdData, '執行雙向雲端合併與去留決定前');
      onSnapshotCreated?.();

      const mergedData = applyCloudMerge(diffResult.items, householdData, diffResult.remoteData);

      const drivePayload = {
        updatedAt: new Date().toISOString(),
        vaultFolder: dbState.googleDrive.folderName || 'HomeOrganizer_CloudVault',
        payload: mergedData,
      };
      await idbSet('homeorganizer_gdrive_vault_mirror', drivePayload);

      if (selectedTarget === 'google_drive' && dbState.activeDestination !== 'google_drive') {
        setDiffModalOpen(false);
        setIsApplyingMerge(false);
        onRefreshData?.(mergedData);
        await runMigrationCore('google_drive', mergedData);
      } else {
        onRefreshData?.(mergedData);
        setDiffModalOpen(false);
        setIsApplyingMerge(false);
        refreshVaultStatus();
        setFeedbackNotice(`🎉 雙向同步合併完成！已保留所有決策物件（共 ${mergedData.nodes.length} 項），100% 零遺失。`);
        setTimeout(() => setFeedbackNotice(null), 5000);
      }
    } catch (e: any) {
      alert(`合併處理失敗: ${e?.message || '未知錯誤'}`);
      setIsApplyingMerge(false);
    }
  };

  // Change individual diff item action
  const handleItemActionChange = (
    itemId: string,
    action: 'keep_local' | 'keep_cloud' | 'keep_both' | 'discard'
  ) => {
    if (!diffResult) return;
    setDiffResult({
      ...diffResult,
      items: diffResult.items.map((item) =>
        item.id === itemId ? { ...item, selectedAction: action } : item
      ),
    });
  };

  // Bulk action presets for Diff Resolution
  const handleApplyPreset = (preset: 'smart_union' | 'local_master' | 'cloud_master') => {
    if (!diffResult) return;
    setDiffResult({
      ...diffResult,
      items: diffResult.items.map((item) => {
        if (preset === 'smart_union') {
          if (item.status === 'local_only') return { ...item, selectedAction: 'keep_local' };
          if (item.status === 'cloud_only') return { ...item, selectedAction: 'keep_cloud' };
          if (item.status === 'conflicted') return { ...item, selectedAction: 'keep_both' };
          return { ...item, selectedAction: 'keep_local' };
        } else if (preset === 'local_master') {
          if (item.status === 'local_only') return { ...item, selectedAction: 'keep_local' };
          if (item.status === 'cloud_only') return { ...item, selectedAction: 'discard' };
          if (item.status === 'conflicted') return { ...item, selectedAction: 'keep_local' };
          return { ...item, selectedAction: 'keep_local' };
        } else {
          if (item.status === 'local_only') return { ...item, selectedAction: 'discard' };
          if (item.status === 'cloud_only') return { ...item, selectedAction: 'keep_cloud' };
          if (item.status === 'conflicted') return { ...item, selectedAction: 'keep_cloud' };
          return { ...item, selectedAction: 'keep_cloud' };
        }
      }),
    });
  };

  // User decides to retain original database
  const handleRetainOriginal = () => {
    setPostMigrationPrompt(null);
    setFeedbackNotice('已將原資料庫保留於舊端作為安全歷史存檔。');
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  // User confirms deletion of original database
  const handleConfirmDeleteOriginal = async () => {
    if (!postMigrationPrompt) return;
    const { from, migrationId } = postMigrationPrompt;

    const res = await deleteOriginalDatabase(from, migrationId);
    if (res.success) {
      setDeleteStatusMessage(res.message);
      setDbState(loadDatabaseLocationState());
      setTimeout(() => {
        setPostMigrationPrompt(null);
        setDeleteConfirmationStep(false);
        setDeleteStatusMessage(null);
      }, 2500);
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Feedback Notice */}
      {feedbackNotice && (
        <div className="p-3.5 rounded-2xl bg-teal-500/20 border border-teal-400 text-teal-200 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xl backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
          <span className="flex-1 leading-snug">{feedbackNotice}</span>
        </div>
      )}

      {/* SECTION 1: 當前資料庫目的地狀態卡片 */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-teal-500/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              {dbState.activeDestination === 'local' && <HardDrive className="w-5 h-5" />}
              {dbState.activeDestination === 'google_drive' && <Cloud className="w-5 h-5 text-sky-400" />}
              {dbState.activeDestination === 'nas_webdav' && <Server className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">目前主要儲存目的地</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40">
                  {dbState.activeDestination === 'local' && '🟢 純本機 (Local)'}
                  {dbState.activeDestination === 'google_drive' && '☁️ 個人雲 (Google Drive)'}
                  {dbState.activeDestination === 'nas_webdav' && '🖧 私有 NAS (WebDAV)'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">
                {getDestinationDisplayName(dbState.activeDestination)}
              </h4>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">資料庫現行大小</span>
            <span className="text-xs font-mono font-bold text-teal-300">
              ~{formatBytes(estimatedSize)}
            </span>
          </div>
        </div>

        {/* 說明文字：預設純本機，不上個人雲 */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 text-teal-400 font-bold text-[11px]">
            <ShieldCheck className="w-4 h-4" />
            <span>本機優先 (Local-First) 與隨選上雲架構</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            安裝啟動時<strong>預設為 Local（純本機 IndexedDB）</strong>，零帳號綁定、不上個人雲，完全離線隱私。當需要家庭共享、跨裝置或備份至 NAS 時，才手動開啟設定。
          </p>
        </div>

        {/* 空間容量與安全預留空間檢測 (Quota Gauge) */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <HardDrive className="w-3.5 h-3.5 text-teal-400" />
              <span>空間容量即時監控與安全預留</span>
            </span>
            {isCheckingQuota ? (
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                檢測中...
              </span>
            ) : quotaInfo?.isSufficient ? (
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                空間充裕（高於安全預留）
              </span>
            ) : (
              <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                ⚠️ 空間不足提示
              </span>
            )}
          </div>

          {/* 容量進度條 */}
          {quotaInfo && (
            <div className="space-y-1.5">
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                <div
                  className="bg-teal-500 h-full"
                  style={{
                    width: `${Math.min(100, ((quotaInfo.usedBytes || 1) / (quotaInfo.totalBytes || 1)) * 100)}%`,
                  }}
                />
                <div
                  className="bg-amber-500/60 h-full"
                  style={{
                    width: `${Math.min(100, (quotaInfo.safeReserveBytes / (quotaInfo.totalBytes || 1)) * 100)}%`,
                  }}
                  title="安全預留緩衝空間"
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400">
                <span>已使用: {formatBytes(quotaInfo.usedBytes)}</span>
                <span>
                  剩餘可用: <strong className="text-slate-200">{formatBytes(quotaInfo.availableBytes)}</strong>
                </span>
                <span>總容量: {formatBytes(quotaInfo.totalBytes)}</span>
              </div>
            </div>
          )}

          {/* 空間不足警告 */}
          {quotaInfo && !quotaInfo.isSufficient && (
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{quotaInfo.warningMessage}</span>
            </div>
          )}

          {/* 安全預留緩衝微調 */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-teal-400" />
              <span>安全預留緩衝 (Buffer)：</span>
            </span>
            <div className="flex items-center gap-1.5">
              {[100, 200, 500].map((mb) => (
                <button
                  key={mb}
                  type="button"
                  onClick={() => handleUpdateSafeReserve(mb)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    safeReserveMb === mb
                      ? 'bg-teal-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {mb} MB
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: 個人雲端帳號連結與 HomeOrganizer_CloudVault 路徑探測 (方案核心) */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-sky-500/40 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-sky-400" />
            <h4 className="font-bold text-slate-100 text-sm">個人雲設定 (Google Drive / 自建雲端)</h4>
          </div>
          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
              dbState.googleDrive.isVerified && dbState.googleDrive.userEmail
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            {dbState.googleDrive.isVerified && dbState.googleDrive.userEmail
              ? '✅ 已安全綁定帳戶'
              : '尚未綁定個人雲'}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          登入個人帳號後直接帶入信箱進行確認驗證。為防止他人私自轉移或竄改路徑，<strong>個人雲與登入帳號完全綁定</strong>；如需更改，必須先通過原信箱驗證退出。
        </p>

        {/* 綁定狀態切換：若已綁定顯示安全鎖與更改按鈕；若未綁定顯示信箱輸入與驗證 */}
        {dbState.googleDrive.isVerified && dbState.googleDrive.userEmail ? (
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-white">
                    已綁定信箱：<code className="text-teal-300">{dbState.googleDrive.userEmail}</code>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  🛡️ 避免資料庫遭他人未經授權私自轉移，已啟用綁定防護鎖。
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangeCloudModalOpen(true);
                    setUnbindStep('verify_old');
                    setOldEmailCode('');
                    setOldEmailCodeSent(false);
                    setUnbindError(null);
                    setNewEmailInput(activeUserEmail || '');
                    setNewEmailCode('');
                    setNewEmailCodeSent(false);
                    setBindNewError(null);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition active:scale-95 shadow"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>更改個人雲帳號...</span>
                </button>

                <button
                  type="button"
                  onClick={handleInitiateUnbind}
                  className="py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition active:scale-95 shadow"
                  title="解除個人雲綁定；若為主資料庫將安全移回 Local"
                >
                  <Unlock className="w-3.5 h-3.5 text-rose-400" />
                  <span>解除綁定個人雲</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 初次綁定流程：輸入信箱並認證 */
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="輸入您的個人雲 Email (例: user@gmail.com)"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-400 transition"
                />
              </div>
              <button
                type="button"
                onClick={handleSendVerificationCode}
                className="py-2 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shrink-0 active:scale-95 shadow"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{codeSent ? '重新發送確認信' : '發送確認信'}</span>
              </button>
            </div>

            {/* 認證碼輸入區 (發送信件後展開) */}
            {codeSent && (
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-sky-300 font-semibold flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                    <span>已寄發認證碼至信箱，請查收並填入：</span>
                  </span>
                  {codeSentPreview && (
                    <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      快速測試驗證碼: {codeSentPreview}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="輸入 6 位數認證碼"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono tracking-widest text-white text-center focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCodeSubmit}
                    className="py-1.5 px-4 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-black text-xs transition active:scale-95 shadow"
                  >
                    確認驗證
                  </button>
                  {codeSentPreview && (
                    <button
                      type="button"
                      onClick={() => setVerificationCode(codeSentPreview)}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[11px]"
                    >
                      帶入
                    </button>
                  )}
                </div>
              </div>
            )}

            {verifyError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{verifyError}</span>
              </p>
            )}
          </div>
        )}

        {/* 雲端路徑 HomeOrganizer_CloudVault 探測狀態展示 */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>雲端目錄探測路徑：<code>/{dbState.googleDrive.folderName || 'HomeOrganizer_CloudVault'}/</code></span>
            </span>
            <button
              type="button"
              onClick={refreshVaultStatus}
              disabled={isCheckingVault}
              className="text-[10px] text-sky-300 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingVault ? 'animate-spin' : ''}`} />
              <span>重新偵測</span>
            </button>
          </div>

          {vaultStatus?.checked && (
            <div
              className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                vaultStatus.exists
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  {vaultStatus.exists ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>已在個人雲中搜尋到專屬儲存庫！</span>
                    </>
                  ) : (
                    <>
                      <Info className="w-4 h-4 text-slate-400" />
                      <span>雲端中目前無此目錄（將於初次轉移時自動建立）</span>
                    </>
                  )}
                </span>
                {vaultStatus.exists && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    雲端在庫: {vaultStatus.remoteNodeCount} 項物件
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {vaultStatus.exists
                  ? '雲中已有收納資料。在執行轉移或多裝置同步時，系統將保留不同清單讓您決定物件去留，確保完全不遺失！'
                  : '目前雲端無既有衝突。待轉移時系統將自動在個人雲端建立目錄並打包複製。'}
              </p>

              {vaultStatus.exists && (
                <div className="pt-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">
                    上次遠端更新: {vaultStatus.lastRemoteUpdate ? new Date(vaultStatus.lastRemoteUpdate).toLocaleString() : '最近'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCheckMultiDeviceSync}
                    className="py-1 px-2.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-[11px] border border-sky-500/40 flex items-center gap-1 transition active:scale-95"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>檢查跨裝置更新 (拉取/比對)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: 隨時指定資料庫目的地與搬遷 (Migration) */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-teal-400" />
            <span>轉移資料庫目的地 (Database Migration)</span>
          </h4>
          <span className="text-[11px] text-slate-400">可隨時自由遷移</span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          選擇您要將主要資料庫搬移至哪一個目的地。轉移前系統會自動<strong>檢測空間容量</strong>並<strong>建立防護備份</strong>，若目標已有舊資料庫將提供<strong>雙向去留決策清單</strong>，轉移完成後才會詢問是否刪除原資料庫。
        </p>

        {/* 目的地選擇按鈕 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Option 1: Local */}
          <button
            type="button"
            onClick={() => setSelectedTarget('local')}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition ${
              selectedTarget === 'local'
                ? 'bg-teal-500/15 border-teal-400 text-teal-300 ring-1 ring-teal-400'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-teal-400" />
                  <span className="font-bold text-xs text-white">純本機 Local</span>
                </div>
                {dbState.activeDestination === 'local' && (
                  <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded font-bold">
                    現行
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                本機 IndexedDB 沙盒，離線極速、零網路依賴
              </p>
            </div>
          </button>

          {/* Option 2: Google Drive */}
          <button
            type="button"
            onClick={() => setSelectedTarget('google_drive')}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition ${
              selectedTarget === 'google_drive'
                ? 'bg-teal-500/15 border-teal-400 text-teal-300 ring-1 ring-teal-400'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-xs text-white">個人雲 Google Drive</span>
                </div>
                {dbState.activeDestination === 'google_drive' && (
                  <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-bold">
                    現行
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                存於個人專屬資料夾，多裝置同步、跨手機電腦
              </p>
            </div>
          </button>

          {/* Option 3: NAS WebDAV */}
          <button
            type="button"
            onClick={() => setSelectedTarget('nas_webdav')}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition ${
              selectedTarget === 'nas_webdav'
                ? 'bg-teal-500/15 border-teal-400 text-teal-300 ring-1 ring-teal-400'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs text-white">私有 NAS (WebDAV)</span>
                </div>
                {dbState.activeDestination === 'nas_webdav' && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                    現行
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                群暉/威聯通/Nextcloud，數據全在自家內網
              </p>
            </div>
          </button>
        </div>

        {/* 觸發轉移按鈕 */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {selectedTarget === dbState.activeDestination ? (
              <span>當前已指向此目的地，無需操作。</span>
            ) : (
              <span>
                準備將資料庫從 <strong>[{getDestinationDisplayName(dbState.activeDestination)}]</strong> 轉移至{' '}
                <strong className="text-teal-300">[{getDestinationDisplayName(selectedTarget)}]</strong>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleStartMigration}
            disabled={isMigrating || selectedTarget === dbState.activeDestination}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg w-full sm:w-auto shrink-0 ${
              isMigrating || selectedTarget === dbState.activeDestination
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-teal-500 to-emerald-400 hover:brightness-110 text-slate-950 active:scale-95'
            }`}
          >
            {isMigrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>轉移中 ({migrationProgress.percent}%)...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4 stroke-[2.5]" />
                <span>執行資料庫安全轉移</span>
              </>
            )}
          </button>
        </div>

        {/* 轉移進行中進度展示 */}
        {isMigrating && (
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-teal-500/40 space-y-2 animate-fade-in">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-teal-300">{migrationProgress.message}</span>
              <span className="text-teal-400 font-mono font-bold">{migrationProgress.percent}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full transition-all duration-300"
                style={{ width: `${migrationProgress.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: 待完全轉移後「詢問是否刪除原 data base」確認框 (要求刪除再刪除) */}
      {postMigrationPrompt && (
        <div className="p-4 rounded-3xl bg-slate-900 border-2 border-emerald-500/60 shadow-2xl space-y-3.5 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                🎉 資料庫已 100% 成功轉移至 [{getDestinationDisplayName(postMigrationPrompt.to)}]！
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                完整性檢驗通過，雙向節點數量一致。請問是否要刪除原位置的舊資料庫以釋放空間？
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-slate-200">
              原位置：[{getDestinationDisplayName(postMigrationPrompt.from)}]
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              依據隱私安全原則，本系統<strong>絕不自動刪除任何原資料庫</strong>。您可以選擇保留作為備份，或確認清除以釋放舊端容量。
            </p>
          </div>

          {deleteStatusMessage ? (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
              {deleteStatusMessage}
            </div>
          ) : !deleteConfirmationStep ? (
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleRetainOriginal}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
              >
                <Bookmark className="w-4 h-4 text-teal-400" />
                <span>保留原資料庫作為歷史備份（推薦）</span>
              </button>

              <button
                type="button"
                onClick={() => setDeleteConfirmationStep(true)}
                className="py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-500/30 transition"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>要求刪除原資料庫...</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/60 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>二次確認：確定要清除原位置 [{getDestinationDisplayName(postMigrationPrompt.from)}] 的資料庫嗎？</span>
              </div>
              <p className="text-[11px] text-slate-300">
                新資料庫已在新端正常運作，此操作將刪除舊端的歷史副本以釋出儲存空間。
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmDeleteOriginal}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition shadow"
                >
                  確認刪除原資料庫 (釋放空間)
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmationStep(false)}
                  className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs transition hover:text-white"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: NAS WebDAV 詳細連線配置 */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-xs text-slate-200">私有 NAS (WebDAV)</span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
              dbState.webdav.autoSync
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {dbState.webdav.autoSync ? '已啟用' : '未啟用'}
          </span>
        </div>

        <p className="text-[11px] text-slate-400">
          支援群暉、威聯通、Nextcloud 等 WebDAV 伺服器，資料 100% 留在自家硬碟。
        </p>

        {!isEditingNas ? (
          <button
            type="button"
            onClick={() => setIsEditingNas(true)}
            className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-1.5"
          >
            <span>{dbState.webdav.autoSync ? '修改 NAS 設定' : '啟用 NAS 並自動防護備份'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <form onSubmit={handleSaveNasWebdav} className="space-y-2 pt-1 border-t border-slate-800">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">WebDAV 伺服器網址</label>
              <input
                type="text"
                value={dbState.webdav.serverUrl}
                onChange={(e) =>
                  setDbState({
                    ...dbState,
                    webdav: { ...dbState.webdav, serverUrl: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                placeholder="https://nas.myhome.tw:5006/dav"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">使用者帳號</label>
                <input
                  type="text"
                  value={dbState.webdav.username}
                  onChange={(e) =>
                    setDbState({
                      ...dbState,
                      webdav: { ...dbState.webdav, username: e.target.value },
                    })
                  }
                  className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">密碼</label>
                <input
                  type="password"
                  value={dbState.webdav.password || ''}
                  onChange={(e) =>
                    setDbState({
                      ...dbState,
                      webdav: { ...dbState.webdav, password: e.target.value },
                    })
                  }
                  className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                確認啟用並建立防護備份
              </button>
              <button
                type="button"
                onClick={() => setIsEditingNas(false)}
                className="py-1.5 px-2.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
              >
                取消
              </button>
            </div>
          </form>
        )}
      </div>

      {/* MODAL 1: 更改個人雲帳號安全驗證視窗 (原 mail 認證退出 + 新 mail 認證綁定) */}
      {isChangeCloudModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold text-white text-sm">
                  更改個人雲綁定帳號・安全雙重驗證
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeCloudModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              為確保您的收納資料庫<strong>絕不被他人私自轉移或竄改</strong>，更換個人雲帳號必須完成兩道安全程序：
            </p>

            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
              <div
                className={`flex-1 py-1.5 rounded-lg text-center ${
                  unbindStep === 'verify_old'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-emerald-400 flex items-center justify-center gap-1'
                }`}
              >
                {unbindStep === 'bind_new' && <Check className="w-3.5 h-3.5" />}
                <span>1. 原信箱認證退出</span>
              </div>
              <div
                className={`flex-1 py-1.5 rounded-lg text-center ${
                  unbindStep === 'bind_new'
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : 'text-slate-500'
                }`}
              >
                <span>2. 新信箱認證綁定</span>
              </div>
            </div>

            {/* STEP 1: 原信箱認證退出 */}
            {unbindStep === 'verify_old' && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">目前原綁定信箱：</span>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-amber-300 font-bold">
                    {dbState.googleDrive.userEmail}
                  </div>
                </div>

                {!oldEmailCodeSent ? (
                  <button
                    type="button"
                    onClick={handleSendOldEmailUnbindCode}
                    className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>發送原信箱退出認證信</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-amber-300">請填入原信箱收到的 6 位數解除認證碼：</span>
                      {oldEmailCodePreview && (
                        <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          測試碼: {oldEmailCodePreview}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={oldEmailCode}
                        onChange={(e) => setOldEmailCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="6 位數認證碼"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono tracking-widest text-white text-center"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOldEmailUnbind}
                        className="py-1.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition"
                      >
                        確認退出
                      </button>
                      {oldEmailCodePreview && (
                        <button
                          type="button"
                          onClick={() => setOldEmailCode(oldEmailCodePreview)}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                        >
                          帶入
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {unbindError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{unbindError}</span>
                  </p>
                )}
              </div>
            )}

            {/* STEP 2: 新信箱認證綁定 */}
            {unbindStep === 'bind_new' && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>原信箱認證已通過！請輸入欲綁定的全新個人雲信箱：</span>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">全新個人雲 Email 信箱</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      placeholder="例: new_user@gmail.com"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleSendNewEmailBindCode}
                      className="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shrink-0"
                    >
                      發送新信箱認證信
                    </button>
                  </div>
                </div>

                {newEmailCodeSent && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-sky-300">請填入新信箱收到的 6 位數認證碼：</span>
                      {newEmailCodePreview && (
                        <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          測試碼: {newEmailCodePreview}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={newEmailCode}
                        onChange={(e) => setNewEmailCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="6 位數認證碼"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono tracking-widest text-white text-center"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyNewEmailBind}
                        className="py-1.5 px-4 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-black text-xs transition shadow"
                      >
                        完成綁定
                      </button>
                      {newEmailCodePreview && (
                        <button
                          type="button"
                          onClick={() => setNewEmailCode(newEmailCodePreview)}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                        >
                          帶入
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {bindNewError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{bindNewError}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: 解除綁定個人雲 (若個人雲為主資料庫，提醒轉移回 Local，並確定 Local 空間足夠再轉移) */}
      {isUnbindModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Unlock className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-sm">
                  {dbState.activeDestination === 'google_drive'
                    ? '⚠️ 解除個人雲綁定（需先轉移回 Local）'
                    : '解除個人雲帳號綁定'}
                </h3>
              </div>
              {!isUnbindingAndMigrating && (
                <button
                  type="button"
                  onClick={() => setIsUnbindModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-4 space-y-3.5 text-xs text-slate-300 overflow-y-auto max-h-[75vh]">
              {dbState.activeDestination === 'google_drive' ? (
                <>
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>注意：您目前的主要資料庫正由個人雲託管</span>
                    </div>
                    <p className="text-[11px] text-amber-300/90">
                      為防止解除綁定後資料遺失，解除前系統會<strong>自動為您將所有收納物件、照片與清單安全轉移回純本機儲存 (Local)</strong>。
                    </p>
                  </div>

                  {/* Local 空間容量檢測 (確定 local 空間足夠, 再轉移!) */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                        <HardDrive className="w-4 h-4 text-teal-400" />
                        <span>本機儲存空間檢測 (Local Quota)</span>
                      </span>
                      {isCheckingLocalQuota ? (
                        <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                          <RefreshCw className="w-3 h-3 animate-spin text-teal-400" />
                          檢測中...
                        </span>
                      ) : localQuotaForUnbind?.isSufficient ? (
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] border border-emerald-500/20">
                          ✅ 空間充足
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded text-[11px] border border-rose-500/20">
                          ⚠️ 空間不足
                        </span>
                      )}
                    </div>

                    {localQuotaForUnbind && (
                      <div className="space-y-1.5 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex justify-between">
                          <span>轉移資料庫預估體積：</span>
                          <strong className="text-teal-300 font-mono">
                            {formatBytes(localQuotaForUnbind.requiredBytes || estimatedSize)}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>安全預留緩衝 (Buffer)：</span>
                          <strong className="text-amber-300 font-mono">{safeReserveMb} MB</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>本機剩餘可用容量：</span>
                          <strong className="text-slate-200 font-mono">
                            {formatBytes(localQuotaForUnbind.availableBytes)}
                          </strong>
                        </div>
                      </div>
                    )}

                    {!isCheckingLocalQuota && localQuotaForUnbind && !localQuotaForUnbind.isSufficient && (
                      <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] leading-relaxed">
                        <p className="font-bold">❌ 本機空間不足警告：</p>
                        <p>{localQuotaForUnbind.warningMessage}</p>
                        <p className="mt-1 text-slate-400">
                          為保護您的收納資料安全，未確保本機空間足夠前，禁止執行轉移與解除綁定！
                        </p>
                      </div>
                    )}

                    {!isCheckingLocalQuota && localQuotaForUnbind?.isSufficient && (
                      <p className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>本機容量充足，轉移過程將自動建立驗證快照與雙重校驗碼，100% 確保資料完整。</span>
                      </p>
                    )}
                  </div>

                  {/* 轉移進度條 */}
                  {isUnbindingAndMigrating && (
                    <div className="p-3 rounded-2xl bg-slate-950 border border-teal-500/40 space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-teal-300 flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{unbindProgress.message || '正在安全轉移資料庫回本機...'}</span>
                        </span>
                        <span className="text-teal-400 font-mono">{unbindProgress.percent}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full transition-all duration-300"
                          style={{ width: `${unbindProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2.5 leading-relaxed">
                  <p>
                    您確定要解除個人雲帳號：<code className="text-teal-300 font-bold">{dbState.googleDrive.userEmail}</code> 的綁定嗎？
                  </p>
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p>💡 目前主要資料庫為 <strong className="text-slate-200">[{getDestinationDisplayName(dbState.activeDestination)}]</strong>。</p>
                    <p>解除個人雲綁定僅會清除此裝置上的個人雲同步設定，<strong>不會影響任何本機收納資料</strong>。</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsUnbindModalOpen(false)}
                disabled={isUnbindingAndMigrating}
                className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                取消
              </button>

              <button
                type="button"
                onClick={handleConfirmReturnToLocalAndUnbind}
                disabled={
                  isUnbindingAndMigrating ||
                  isCheckingLocalQuota ||
                  (dbState.activeDestination === 'google_drive' && !localQuotaForUnbind?.isSufficient)
                }
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95"
              >
                {isUnbindingAndMigrating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>轉移中...</span>
                  </>
                ) : dbState.activeDestination === 'google_drive' ? (
                  <>
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>確認轉移回 Local 並解除個人雲</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>確認解除綁定</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: 雙向差異比對與物件去留決策清單 (User Diff Decision Modal) */}
      {diffModalOpen && diffResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-teal-500/40 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    雲端與本機差異比對・物件去留審查
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    偵測到個人雲已有資料庫，請指定不同物件的保留方式，確保 100% 零遺失！
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDiffModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Diff Stats Banner */}
            <div className="p-3 bg-slate-950/60 border-b border-slate-800/80 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-teal-400 block font-semibold">本機獨有</span>
                <span className="text-sm font-bold text-white">{diffResult.localOnlyCount} 項</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-sky-400 block font-semibold">雲端獨有</span>
                <span className="text-sm font-bold text-white">{diffResult.cloudOnlyCount} 項</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-amber-400 block font-semibold">修改衝突</span>
                <span className="text-sm font-bold text-white">{diffResult.conflictedCount} 項</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-emerald-400 block font-semibold">完全一致</span>
                <span className="text-sm font-bold text-white">{diffResult.identicalCount} 項</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-slate-400 shrink-0 font-semibold">快速預設套用：</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('smart_union')}
                className="py-1 px-2.5 rounded-lg bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40 hover:bg-teal-500/30 transition shrink-0"
              >
                ✨ 雙向全部保留（推薦，衝突保留副本，零遺失）
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('local_master')}
                className="py-1 px-2.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition shrink-0"
              >
                本機為準
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('cloud_master')}
                className="py-1 px-2.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition shrink-0"
              >
                雲端為準
              </button>
            </div>

            {/* Item Decision List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs">
              {diffResult.items.filter((i) => i.status !== 'identical').length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="font-bold text-slate-200">本機與個人雲端內容完全相同！</p>
                  <p className="text-xs">無需額外手動裁決，可直接點擊下方完成轉移。</p>
                </div>
              ) : (
                diffResult.items
                  .filter((i) => i.status !== 'identical')
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              item.type === 'container'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                            }`}
                          >
                            {item.type === 'container' ? '容器' : '物品'}
                          </span>
                          <span className="font-bold text-white text-xs">{item.name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded-full font-semibold ${
                              item.status === 'local_only'
                                ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                                : item.status === 'cloud_only'
                                ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {item.status === 'local_only' && '僅本機有'}
                            {item.status === 'cloud_only' && '僅雲端有'}
                            {item.status === 'conflicted' && '內容修改衝突'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          ID: {item.id}
                        </span>
                      </div>

                      {/* Action selector */}
                      <div className="flex items-center gap-1 self-end sm:self-center">
                        {item.status === 'local_only' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleItemActionChange(item.id, 'keep_local')}
                              className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition ${
                                item.selectedAction === 'keep_local'
                                  ? 'bg-teal-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              保留本機 (存入雲端)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleItemActionChange(item.id, 'discard')}
                              className={`py-1 px-2 rounded-lg text-[10px] font-bold transition ${
                                item.selectedAction === 'discard'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              捨棄
                            </button>
                          </>
                        )}

                        {item.status === 'cloud_only' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleItemActionChange(item.id, 'keep_cloud')}
                              className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition ${
                                item.selectedAction === 'keep_cloud'
                                  ? 'bg-sky-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              保留雲端 (同步至本機)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleItemActionChange(item.id, 'discard')}
                              className={`py-1 px-2 rounded-lg text-[10px] font-bold transition ${
                                item.selectedAction === 'discard'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              捨棄
                            </button>
                          </>
                        )}

                        {item.status === 'conflicted' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleItemActionChange(item.id, 'keep_both')}
                              className={`py-1 px-2 rounded-lg text-[10px] font-bold transition ${
                                item.selectedAction === 'keep_both'
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              兩者皆留 (雲端副本)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleItemActionChange(item.id, 'keep_local')}
                              className={`py-1 px-2 rounded-lg text-[10px] font-bold transition ${
                                item.selectedAction === 'keep_local'
                                  ? 'bg-teal-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              本機版
                            </button>
                            <button
                              type="button"
                              onClick={() => handleItemActionChange(item.id, 'keep_cloud')}
                              className={`py-1 px-2 rounded-lg text-[10px] font-bold transition ${
                                item.selectedAction === 'keep_cloud'
                                  ? 'bg-sky-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              雲端版
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setDiffModalOpen(false)}
                className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:text-white transition"
              >
                取消
              </button>

              <button
                type="button"
                onClick={handleConfirmDiffMerge}
                disabled={isApplyingMerge}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-lg"
              >
                {isApplyingMerge ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>正在執行安全合併與防護備份...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>確認套用決策並完成同步轉移</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
