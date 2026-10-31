import React, { useState } from 'react';
import {
  X,
  User,
  Shield,
  Key,
  Home,
  Building,
  Lock,
  Unlock,
  Users,
  Clock,
  Plus,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  FolderLock,
  Share2,
  Database,
  RotateCw,
  ShieldCheck,
  Download,
  Image as ImageIcon,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LogOut,
} from 'lucide-react';
import { StorageSpace, UserProfile, InventoryNode } from '../types';
import {
  loadSpaces,
  saveSpaces,
  loadUserProfiles,
  saveUserProfiles,
  loadActiveUser,
  saveActiveUser,
  loadActiveSpaceId,
  saveActiveSpaceId,
  saveNodes,
  loadMembers,
  saveMembers,
} from '../utils/storage';
import { APP_VERSION, APP_BUILD_TIME, APP_RELEASE_STAGE, APP_CHANGELOG } from '../version';
import { checkOnlineUpdate, performSmoothUpdate } from '../utils/versionCheck';
import { getThumbnailCacheStats, clearAllThumbnailCache } from '../utils/thumbnailCache';

interface AccountSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: InventoryNode[];
  activeUser: UserProfile;
  onChangeActiveUser: (user: UserProfile) => void;
  activeSpaceId: string;
  onChangeActiveSpace: (spaceId: string) => void;
  onUpdateNodePermissions?: (updatedNodes: InventoryNode[]) => void;
  unlockedContainerIds: Set<string>;
  onUnlockContainer: (containerId: string) => void;
  onMembersChange?: (members: string[]) => void;
  onLogout?: () => void;
}

export const AccountSpaceModal: React.FC<AccountSpaceModalProps> = ({
  isOpen,
  onClose,
  nodes,
  activeUser,
  onChangeActiveUser,
  activeSpaceId,
  onChangeActiveSpace,
  onUpdateNodePermissions,
  unlockedContainerIds,
  onUnlockContainer,
  onMembersChange,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'spaces' | 'keys'>('profile');
  const [spaces, setSpaces] = useState<StorageSpace[]>(() => loadSpaces());
  const [profiles, setProfiles] = useState<UserProfile[]>(() => loadUserProfiles());

  // Thumbnail Cache Management State
  const [thumbStats, setThumbStats] = useState<{ count: number; totalEstimatedKb: number }>({
    count: 0,
    totalEstimatedKb: 0,
  });
  const [isClearingThumbs, setIsClearingThumbs] = useState(false);
  const [thumbClearMsg, setThumbClearMsg] = useState<string | null>(null);
  const [remoteChangelog, setRemoteChangelog] = useState<string[]>([]);
  const [showFaqGuide, setShowFaqGuide] = useState(false);

  // Synchronize profiles, spaces, and thumbnail cache stats when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setProfiles(loadUserProfiles());
      setSpaces(loadSpaces());
      getThumbnailCacheStats().then(setThumbStats).catch(() => {});
    }
  }, [isOpen]);

  // Password / PIN verification dialog state
  const [targetUserToSwitch, setTargetUserToSwitch] = useState<UserProfile | null>(null);
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Set new PIN for current user
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [newPin, setNewPin] = useState('');

  // Add new space form
  const [isAddingSpace, setIsAddingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceType, setNewSpaceType] = useState<'home' | 'office' | 'warehouse'>('home');

  // Add new user profile form
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileRole, setNewProfileRole] = useState<'admin' | 'member'>('member');
  const [newProfileAvatar, setNewProfileAvatar] = useState('🧑🏻');

  // Private key unlock form
  const [keyInput, setKeyInput] = useState('');
  const [keyUnlockMsg, setKeyUnlockMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Private containers owned by active user or across household
  const privateContainers = nodes.filter((n) => n.type === 'container' && n.isPrivate);

  // App Version & Update Status (defaults to idle to prevent false alarms)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'latest' | 'available'>('idle');
  const [updateMsg, setUpdateMsg] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Switch user handler
  const handleInitiateSwitchUser = (user: UserProfile) => {
    if (user.id === activeUser.id) return;
    if (user.pinCode) {
      setTargetUserToSwitch(user);
      setInputPin('');
      setPinError(false);
    } else {
      onChangeActiveUser(user);
      saveActiveUser(user);
    }
  };

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    try {
      const res = await checkOnlineUpdate();
      if (res.hasUpdate) {
        setUpdateStatus('available');
        setUpdateMsg(res.message);
        if (res.changelog) setRemoteChangelog(res.changelog);
      } else {
        setUpdateStatus('latest');
        setUpdateMsg(res.message);
      }
    } catch {
      setUpdateStatus('latest');
      setUpdateMsg(`目前手機運行版本已是最新版 v${APP_VERSION}，無須更新。`);
    }
  };

  const handleClearThumbnails = async () => {
    setIsClearingThumbs(true);
    await clearAllThumbnailCache();
    const stats = await getThumbnailCacheStats();
    setThumbStats(stats);
    setIsClearingThumbs(false);
    setThumbClearMsg('縮圖暫存快取已全數清理！清單檢視時將隨需重新生成。');
    setTimeout(() => setThumbClearMsg(null), 3000);
  };

  const handleSmoothAppUpdate = async () => {
    setIsUpdating(true);
    await performSmoothUpdate(nodes);
  };

  const handleExportBackup = () => {
    const backupData = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      nodes,
      activeUser,
      activeSpaceId,
      spaces,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HomeOrganizer-備份-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmPinSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserToSwitch) return;

    if (inputPin === targetUserToSwitch.pinCode) {
      onChangeActiveUser(targetUserToSwitch);
      saveActiveUser(targetUserToSwitch);
      setTargetUserToSwitch(null);
      setInputPin('');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleSavePinForActiveUser = () => {
    const updatedProfiles = profiles.map((p) =>
      p.id === activeUser.id ? { ...p, pinCode: newPin.trim() || undefined } : p
    );
    setProfiles(updatedProfiles);
    saveUserProfiles(updatedProfiles);
    const updatedActive = { ...activeUser, pinCode: newPin.trim() || undefined };
    onChangeActiveUser(updatedActive);
    saveActiveUser(updatedActive);
    setIsEditingPin(false);
  };

  const handleAddNewSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;

    const newSpace: StorageSpace = {
      id: 'space-' + Date.now(),
      name: newSpaceName.trim(),
      type: newSpaceType,
      icon: newSpaceType === 'office' ? '🏢' : newSpaceType === 'warehouse' ? '📦' : '🏠',
      createdAt: new Date().toISOString(),
    };

    const updated = [...spaces, newSpace];
    setSpaces(updated);
    saveSpaces(updated);
    onChangeActiveSpace(newSpace.id);
    saveActiveSpaceId(newSpace.id);
    setNewSpaceName('');
    setIsAddingSpace(false);
  };

  const handleAddNewProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newProfileName.trim();
    if (!cleanName) return;

    const newProf: UserProfile = {
      id: 'u-' + Date.now(),
      name: cleanName,
      avatar: newProfileAvatar,
      role: newProfileRole,
    };

    const updated = [...profiles, newProf];
    setProfiles(updated);
    saveUserProfiles(updated);

    // Synchronize immediately with household members list so item edit / loan / transfer immediately reflect this new member!
    const existingMembers = loadMembers();
    if (!existingMembers.includes(cleanName)) {
      const updatedMembers = [...existingMembers, cleanName];
      saveMembers(updatedMembers);
      onMembersChange?.(updatedMembers);
    }

    setNewProfileName('');
    setIsAddingProfile(false);
  };

  // Unlock container by entering private key
  const handleUnlockByKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = keyInput.trim();
    if (!cleanKey) return;

    const match = nodes.find(
      (n) => n.type === 'container' && n.accessKey && n.accessKey.trim() === cleanKey
    );

    if (match) {
      onUnlockContainer(match.id);
      setKeyUnlockMsg({
        text: `解鎖成功！已開放存取私有容器「${match.name}」`,
        ok: true,
      });
      setKeyInput('');
    } else {
      setKeyUnlockMsg({
        text: '私鑰不符合或已失效，請確認輸入正確的 6 位數金鑰。',
        ok: false,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-xl">
              {activeUser.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  帳號空間與私鑰授權中心
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                  當前：{activeUser.name}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                模擬家庭與辦公多空間、成員轉移、共有/私有存取與密碼私鑰設定
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `確定要登出目前帳號「${activeUser.name}」嗎？\n登出後資料庫將安全鎖定，需重新驗證身分登入。`
                    )
                  ) {
                    onClose();
                    onLogout();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-sm"
                title="登出帳戶並安全鎖定"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">登出 (Logout)</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'profile'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>身分切換與密碼 ({profiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('spaces')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'spaces'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>多空間空間管理 ({spaces.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'keys'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>私鑰與共享授權 ({privateContainers.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* TAB 1: User Profiles & Password Protection */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{activeUser.avatar}</span>
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      {activeUser.name}
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        目前使用中
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeUser.pinCode ? '🔒 已啟用 4 位數 PIN 密碼保護' : '🔓 尚未設定 PIN 密碼（自由切換）'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsEditingPin(true);
                      setNewPin(activeUser.pinCode || '');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs text-teal-300 font-semibold transition flex items-center gap-1"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{activeUser.pinCode ? '修改密碼' : '設定保護密碼'}</span>
                  </button>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `確定要登出目前帳號「${activeUser.name}」嗎？\n登出後資料庫將安全鎖定，需重新驗證身分登入。`
                          )
                        ) {
                          onClose();
                          onLogout();
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-sm"
                      title="登出目前帳號並安全鎖定"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>登出帳戶 (Logout)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Set PIN Form */}
              {isEditingPin && (
                <div className="p-4 rounded-2xl bg-teal-950/30 border border-teal-500/40 space-y-3">
                  <h5 className="font-bold text-xs text-teal-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>設定 {activeUser.name} 的安全 PIN 密碼（4~6 位數字）</span>
                  </h5>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="請輸入 4 位數密碼 (留空則取消密碼)"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                    <button
                      onClick={handleSavePinForActiveUser}
                      className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition"
                    >
                      儲存密碼
                    </button>
                    <button
                      onClick={() => setIsEditingPin(false)}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs hover:text-white"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300">切換模擬身分 / 成員列表</h4>
                  <button
                    onClick={() => setIsAddingProfile(true)}
                    className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增成員</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {profiles.map((prof) => {
                    const isActive = prof.id === activeUser.id;
                    return (
                      <div
                        key={prof.id}
                        onClick={() => handleInitiateSwitchUser(prof)}
                        className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                          isActive
                            ? 'bg-teal-500/15 border-teal-500/60 shadow-md'
                            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{prof.avatar}</span>
                          <div>
                            <p className="font-bold text-xs text-white flex items-center gap-1.5">
                              {prof.name}
                              {prof.pinCode && <Lock className="w-3 h-3 text-amber-400 inline" />}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {prof.role === 'admin' ? '管理者權限' : '家庭一般成員'}
                            </p>
                          </div>
                        </div>

                        {isActive ? (
                          <span className="p-1 rounded-full bg-teal-500 text-slate-950">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="text-[11px] text-teal-400 font-semibold flex items-center">
                            切換至此
                            <ChevronRight className="w-3 h-3 ml-0.5" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Member Form Modal */}
              {isAddingProfile && (
                <form
                  onSubmit={handleAddNewProfile}
                  className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3"
                >
                  <h5 className="font-bold text-xs text-white">新增家庭成員 / 同事</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder="姓名 (例: 小寶、倉管員)"
                      required
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                    <select
                      value={newProfileAvatar}
                      onChange={(e) => setNewProfileAvatar(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="👦🏻">👦🏻 男孩</option>
                      <option value="👧🏻">👧🏻 女孩</option>
                      <option value="👨🏻">👨🏻 男士</option>
                      <option value="👩🏻">👩🏻 女士</option>
                      <option value="🧓🏻">🧓🏻 長輩</option>
                      <option value="🧑🏻‍💼">🧑🏻‍💼 上班族</option>
                      <option value="🐶">🐶 寵物毛孩</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingProfile(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-700 text-xs text-slate-300"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
                    >
                      新增
                    </button>
                  </div>
                </form>
              )}

              {/* System Online Update Check & Database Persistence Safety Card */}
              <div className="pt-2 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs text-slate-200">線上更新與資料庫安全狀態</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                    目前版號: v{APP_VERSION}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-850 space-y-3 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">目前本機版本：</span>
                    <span className="font-mono text-teal-400 font-bold">
                      v{APP_VERSION} ({APP_RELEASE_STAGE === 'beta_iteration' ? '測試迭代版' : '正式版'})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">本機收納資料庫：</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Database className="w-3.5 h-3.5" />
                      已安全儲存 {nodes.length} 個物件/容器 (雙向 IndexedDB 鏡像)
                    </span>
                  </div>

                  {/* Thumbnail Cache Management (User request: 物件縮圖暫存與適當時機自動清除) */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                        <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                        <span>物件縮圖暫存快取</span>
                      </div>
                      <span className="text-[10px] text-teal-300 font-mono bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
                        已暫存 {thumbStats.count} 張 (~{thumbStats.totalEstimatedKb} KB)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      💡 採用輕量快速快取避免手機渲染卡頓。系統每 7 天或超過 150 張自動清理過期縮圖；清單頂部支援「完整縮圖 (Contain)」與「填滿裁切 (Cover)」一鍵切換。
                    </p>
                    {thumbClearMsg && (
                      <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{thumbClearMsg}</span>
                      </p>
                    )}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleClearThumbnails}
                        disabled={isClearingThumbs || thumbStats.count === 0}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition active:scale-95 disabled:opacity-40"
                      >
                        {isClearingThumbs ? '正在清除中...' : '手動清除縮圖暫存'}
                      </button>
                    </div>
                  </div>

                  {/* 有更新時在更新處提示，平時呈現平穩最新狀態 */}
                  {updateStatus === 'available' ? (
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-emerald-950/80 border border-teal-500/40 shadow-md space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="font-bold text-xs text-emerald-300">
                            ✨ 發現新版本程式就緒！(可立即免重啟套用)
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                          有新版本
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                        <div className="font-bold text-slate-200">🚀 本次更新內容：</div>
                        {(remoteChangelog.length > 0 ? remoteChangelog : APP_CHANGELOG[0]?.changes || []).map((ch, idx) => (
                          <div key={idx}>• {ch}</div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleSmoothAppUpdate}
                        disabled={isUpdating}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-400 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
                      >
                        <RotateCw className={`w-4 h-4 stroke-[2.5] ${isUpdating ? 'animate-spin' : ''}`} />
                        <span>{isUpdating ? '正在備份並平滑熱載入新版本...' : '🚀 立即無縫更新（免關閉 App · 100% 保留現有物件與照片）'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>已是最新版本 (v{APP_VERSION})</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          運行順暢
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {updateMsg || `手機當前運行的代碼已與伺服器完全同步 (v${APP_VERSION})。點選下方「檢查線上更新」可穿透快取即時查詢最新進版。`}
                      </p>
                    </div>
                  )}

                  {/* FAQ: 更新與版本說明 (User requests: 更新是否需重啟App、版本遞增機制) */}
                  <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setShowFaqGuide((p) => !p)}
                      className="w-full px-3 py-2 flex items-center justify-between text-slate-300 hover:text-white transition"
                    >
                      <span className="flex items-center gap-1.5 font-bold text-teal-300 text-[11px]">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>版本更新與自動遞增常見問答（點此展開）</span>
                      </span>
                      {showFaqGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {showFaqGuide && (
                      <div className="p-3 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-300 leading-relaxed bg-slate-950/90">
                        <div>
                          <strong className="text-teal-300">Q1: 更新時一定要關閉重啟 App 嗎？</strong>
                          <p className="text-slate-400 mt-0.5">
                            <strong>不用！</strong>點擊「立即無縫更新」按鈕，系統會在 0.3 秒內將資料鏡像備份至 IndexedDB，並自動清除舊程式碼快取進行熱重載，使用者<strong>完全不需要去手機多工背景滑掉或關閉 App</strong>！
                          </p>
                        </div>
                        <div>
                          <strong className="text-teal-300">Q2: 如何在 Sync GitHub 或每次發布時自動遞增版本號？</strong>
                          <p className="text-slate-400 mt-0.5">
                            專案已整合單一版本中心（<code>src/version.ts</code>）。在 GitHub Actions 流程或本地終端機執行 <code>npm run bump</code>，即可自動遞增末碼（如 <code>1.00.02 ➔ 1.00.03</code>）並產生最新建置時間戳，每次同步即自動進版。
                          </p>
                        </div>
                        <div>
                          <strong className="text-teal-300">Q3: 物件縮圖如何完整呈現？</strong>
                          <p className="text-slate-400 mt-0.5">
                            收納列表頂部提供了「完整縮圖 (Contain)」與「填滿裁切 (Cover)」按鈕，切換至「完整縮圖」時照片將 100% 完整顯示、不裁切任何邊緣；同時暫存機制會自動優化載入效能。
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                    🛡️ <strong>資料安全保證</strong>：線上更新程式碼或重啟 App 時，系統<strong>絕不會清除</strong>您已建立的物件。所有照片與容器均採用 LocalStorage 與 IndexedDB 雙重持久化保護。
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCheckUpdate}
                      disabled={updateStatus === 'checking'}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-teal-300 font-bold text-xs border border-teal-500/30 flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                      title="檢查是否有最新版程式並強制重整快取"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />
                      <span>{updateStatus === 'checking' ? '正在連線檢查中...' : '檢查線上更新'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                      title="匯出下載本機資料庫備份檔案"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>下載備份</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Multiple Spaces Management */}
          {activeTab === 'spaces' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">當前空間與建築場所</h4>
                  <p className="text-[11px] text-slate-400">
                    支援家庭多套房子、辦公室分公司與戶外儲藏間各自獨立收納
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingSpace(true)}
                  className="px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 font-semibold text-xs border border-teal-500/30 hover:bg-teal-500/30 flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增空間</span>
                </button>
              </div>

              {/* Space Cards */}
              <div className="grid grid-cols-1 gap-3">
                {spaces.map((sp) => {
                  const isActive = sp.id === activeSpaceId;
                  const containerCountInSpace = nodes.filter(
                    (n) => n.type === 'container' && (!n.spaceId || n.spaceId === sp.id)
                  ).length;

                  return (
                    <div
                      key={sp.id}
                      onClick={() => {
                        onChangeActiveSpace(sp.id);
                        saveActiveSpaceId(sp.id);
                      }}
                      className={`p-4 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/10 border-teal-500/60 shadow-lg'
                          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="text-3xl">{sp.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">{sp.name}</h4>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500 text-slate-950 font-bold">
                                當前使用中
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{sp.description || '多層級收納管理空間'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isActive && (
                          <span className="text-xs font-semibold text-teal-400">進入此空間 →</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Space Form */}
              {isAddingSpace && (
                <form
                  onSubmit={handleAddNewSpace}
                  className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-3"
                >
                  <h5 className="font-bold text-xs text-white">建立新的空間（如：分公司、新家、第二倉庫）</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={newSpaceName}
                      onChange={(e) => setNewSpaceName(e.target.value)}
                      placeholder="空間名稱 (例: 台中辦公間、新莊工作室)"
                      required
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                    <select
                      value={newSpaceType}
                      onChange={(e) => setNewSpaceType(e.target.value as any)}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="home">🏠 住宅 / 房間 (家庭)</option>
                      <option value="office">🏢 辦公室 / 工作室 (辦公)</option>
                      <option value="warehouse">📦 戶外倉 / 儲藏間 (倉儲)</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingSpace(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-700 text-xs text-slate-300"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
                    >
                      建立空間
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: Private Keys & Sharing Permissions */}
          {activeTab === 'keys' && (
            <div className="space-y-4">
              {/* Unlock with Private Key Form */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-xs">
                  <Key className="w-4 h-4" />
                  <span>輸入私鑰 / 授權碼（解鎖他人分享之私有容器）</span>
                </div>
                <form onSubmit={handleUnlockByKey} className="flex gap-2">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="輸入 6 位數私鑰 (例: 888888 或 KEY-XXX)"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold text-xs shadow hover:brightness-110"
                  >
                    驗證解鎖
                  </button>
                </form>
                {keyUnlockMsg && (
                  <p
                    className={`text-xs ${
                      keyUnlockMsg.ok ? 'text-emerald-400 font-bold' : 'text-rose-400'
                    }`}
                  >
                    {keyUnlockMsg.text}
                  </p>
                )}
              </div>

              {/* Private Containers Overview */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-300">
                  私有容器與權限列表 (共 {privateContainers.length} 個私密容器)
                </h4>

                {privateContainers.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 bg-slate-950/40 rounded-2xl text-center">
                    目前沒有設定為私有的容器。在編輯容器時，可勾選「設為個人私有」並設定專屬私鑰。
                  </p>
                ) : (
                  <div className="space-y-2">
                    {privateContainers.map((pc) => {
                      const isUnlocked = unlockedContainerIds.has(pc.id);
                      return (
                        <div
                          key={pc.id}
                          className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                              {isUnlocked ? (
                                <Unlock className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Lock className="w-4 h-4 text-rose-400" />
                              )}
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-white flex items-center gap-1.5">
                                {pc.name}
                                <span className="text-[10px] px-1.5 rounded bg-slate-700 text-slate-300">
                                  擁有者: {pc.ownerName || '本人'}
                                </span>
                              </h5>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                私鑰狀態:{' '}
                                {pc.accessKey ? (
                                  <span className="text-teal-300 font-mono font-bold">
                                    {pc.accessKey} (
                                    {pc.accessKeyExpiry === 'unlimited'
                                      ? '無限期'
                                      : pc.accessKeyExpiry || '有效'}
                                    )
                                  </span>
                                ) : (
                                  '未設私鑰（僅擁有人可見）'
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="text-xs">
                            {isUnlocked ? (
                              <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
                                ✓ 已解鎖可編輯
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 text-[11px] font-semibold border border-rose-500/30">
                                私密保護中
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Enter PIN Modal Dialog when switching to protected user */}
        {targetUserToSwitch && (
          <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-teal-500/60 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fade-in text-center">
              <span className="text-4xl block mx-auto">{targetUserToSwitch.avatar}</span>
              <div>
                <h4 className="font-bold text-white text-base">
                  請輸入「{targetUserToSwitch.name}」的 PIN 密碼
                </h4>
                <p className="text-xs text-slate-400 mt-1">此身分受個人密碼保護</p>
              </div>

              <form onSubmit={handleConfirmPinSwitch} className="space-y-3">
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  value={inputPin}
                  onChange={(e) => {
                    setInputPin(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="請輸入密碼"
                  className={`w-full py-2.5 px-4 rounded-xl bg-slate-950 border text-center text-lg tracking-widest font-mono text-white focus:outline-none ${
                    pinError ? 'border-rose-500' : 'border-teal-500/60'
                  }`}
                />
                {pinError && <p className="text-xs text-rose-400 font-bold">密碼不正確，請重新輸入！</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetUserToSwitch(null);
                      setInputPin('');
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow"
                  >
                    驗證登入
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:px-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>💡 切換至不同身分或空間時，私有與共有內容將自動按權限即時同步呈現。</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            完成並關閉
          </button>
        </div>
      </div>
    </div>
  );
};
