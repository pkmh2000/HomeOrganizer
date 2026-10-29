import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  KeyRound,
  Fingerprint,
  UserCheck,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  UserPlus,
  LogIn,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  AuthAccount,
  getActiveAuthSession,
  loadSavedAccounts,
  authenticateWithCredentials,
  authenticateWithBiometrics,
} from '../utils/authManager';

interface UserLoginModalProps {
  onLoginSuccess: (account: AuthAccount) => void;
}

export const UserLoginModal: React.FC<UserLoginModalProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<AuthAccount[]>(() => loadSavedAccounts());

  const activeSession = getActiveAuthSession();
  const initialEmail = activeSession.account?.email || (savedAccounts[0]?.email ?? '');
  const initialRememberMe = activeSession.account?.rememberMe ?? true;
  const initialBiometrics = activeSession.account?.biometricsEnabled ?? false;

  const [email, setEmail] = useState<string>(initialEmail);
  const [name, setName] = useState<string>(activeSession.account?.name || '');
  const [password, setPassword] = useState<string>(activeSession.account?.password || '');
  const [rememberMe, setRememberMe] = useState<boolean>(initialRememberMe);
  const [biometricsEnabled, setBiometricsEnabled] = useState<boolean>(initialBiometrics);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBiometricPrompting, setIsBiometricPrompting] = useState<boolean>(false);
  const [biometricFeedback, setBiometricFeedback] = useState<string | null>(null);

  // If user previously enabled biometrics and rememberMe, offer fast biometric sign-in
  const rememberedAccount = savedAccounts.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase()
  );

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('請輸入有效的使用者 Email 信箱！');
      return;
    }

    const res = authenticateWithCredentials(
      email,
      password,
      rememberMe,
      biometricsEnabled,
      name
    );

    if (res.success && res.account) {
      setErrorMessage(null);
      onLoginSuccess(res.account);
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleBiometricLogin = async () => {
    if (!rememberedAccount) {
      setErrorMessage('請先輸入信箱登入過一次以啟用生物辨識綁定。');
      return;
    }

    setIsBiometricPrompting(true);
    setBiometricFeedback('正在感應設備指紋 / Face ID...');

    // Small delay for natural UI feel
    await new Promise((r) => setTimeout(r, 600));

    const res = await authenticateWithBiometrics(rememberedAccount);
    setIsBiometricPrompting(false);

    if (res.success) {
      setBiometricFeedback('✅ 生物辨識成功，歡迎回來！');
      setTimeout(() => {
        onLoginSuccess(rememberedAccount);
      }, 400);
    } else {
      setErrorMessage('生物辨識未通過，請使用密碼登入。');
      setBiometricFeedback(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-teal-500/40 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5">
        {/* Header & Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 border border-teal-500/30 text-teal-400 mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              家庭智慧生活收納管家
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              多裝置與多使用者身分隔離安全登入
            </p>
          </div>
        </div>

        {/* Tab switch between Login and Create Account */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              !isRegister
                ? 'bg-teal-500 text-slate-950 shadow font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>帳號登入</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              isRegister
                ? 'bg-teal-500 text-slate-950 shadow font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>初次註冊 / 新增帳號</span>
          </button>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Biometric Feedback */}
        {biometricFeedback && (
          <div className="p-3 rounded-xl bg-teal-950/60 border border-teal-500/40 text-teal-300 text-xs flex items-center gap-2 animate-fade-in">
            <Fingerprint className="w-4 h-4 text-teal-400 shrink-0 animate-pulse" />
            <span>{biometricFeedback}</span>
          </div>
        )}

        {/* Login / Register Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-3.5">
          {/* Display Name (if registering) */}
          {isRegister && (
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">使用者稱呼 (例: 爸爸、媽媽、Alice)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="我的家庭暱稱"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-400"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              個人帳號 Email <span className="text-teal-400 font-normal">（後續將直接帶入設定個人雲）</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="請輸入您的 Email (例: user@gmail.com)"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          {/* Password / PIN */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">密碼 / 安全 PIN 碼</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          {/* Checkboxes: Remember Me & Biometrics */}
          <div className="space-y-2 pt-1 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 bg-slate-950 border-slate-700 focus:ring-0"
              />
              <span>記住帳號密碼（下次啟動自動登入）</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={biometricsEnabled}
                onChange={(e) => setBiometricsEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 bg-slate-950 border-slate-700 focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5 text-teal-400" />
                <span>綁定指紋 / Face ID 生物辨識快速解鎖</span>
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
          >
            <span>{isRegister ? '建立帳號並登入' : '登入進入收納庫'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        {/* Quick Biometrics Button if previously enabled */}
        {rememberedAccount && rememberedAccount.biometricsEnabled && !isRegister && (
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={isBiometricPrompting}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-teal-300 font-bold text-xs flex items-center justify-center gap-2 border border-teal-500/30 transition active:scale-95"
            >
              <Fingerprint className="w-4 h-4 text-teal-400" />
              <span>使用設備指紋 / Face ID 快速辨識登入</span>
            </button>
          </div>
        )}

        {/* Security Note */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            本機採用隱私隔離沙盒，您的 Email 與密碼僅加密保存在當前設備，絕不上傳第三方伺服器。
          </p>
        </div>
      </div>
    </div>
  );
};
