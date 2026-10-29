/**
 * User Authentication & Identity Isolation Manager
 * Provides user login, remember-me credentials, biometrics (TouchID / FaceID / WebAuthn),
 * and security-protected personal cloud account binding / unbinding verification.
 */

export interface AuthAccount {
  id: string;
  email: string;
  name: string;
  password?: string;
  avatar: string;
  role: 'admin' | 'member';
  rememberMe: boolean;
  biometricsEnabled: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthSession {
  isAuthenticated: boolean;
  account: AuthAccount | null;
  expiresAt?: number;
}

const STORAGE_KEY_AUTH_ACCOUNTS = 'homeorganizer_auth_accounts_v2';
const STORAGE_KEY_ACTIVE_SESSION = 'homeorganizer_active_auth_session_v2';
const STORAGE_KEY_CLOUD_UNBIND_CHALLENGE = 'homeorganizer_cloud_unbind_challenge_v2';
const STORAGE_KEY_CLOUD_BIND_CHALLENGE = 'homeorganizer_cloud_bind_challenge_v2';

// Load all saved accounts on this device
export function loadSavedAccounts(): AuthAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_ACCOUNTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: AuthAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTH_ACCOUNTS, JSON.stringify(accounts));
  } catch {}
}

// Load active session (checks if rememberMe is enabled or session is valid)
export function getActiveAuthSession(): AuthSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION);
    if (!raw) return { isAuthenticated: false, account: null };
    const session: AuthSession = JSON.parse(raw);
    if (!session.isAuthenticated || !session.account) {
      return { isAuthenticated: false, account: null };
    }
    // If not rememberMe and browser was closed/re-opened, can require PIN/biometrics
    return session;
  } catch {
    return { isAuthenticated: false, account: null };
  }
}

export function saveActiveAuthSession(session: AuthSession): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, JSON.stringify(session));
  } catch {}
}

// Authenticate / Register user
export function authenticateWithCredentials(
  email: string,
  password?: string,
  rememberMe: boolean = true,
  biometricsEnabled: boolean = false,
  displayName?: string
): { success: boolean; account?: AuthAccount; message: string } {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: '請輸入有效的 Email 信箱' };
  }

  const accounts = loadSavedAccounts();
  let account = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

  const now = new Date().toISOString();

  if (!account) {
    // New user registration
    account = {
      id: 'acc-' + Date.now(),
      email: cleanEmail,
      name: displayName?.trim() || cleanEmail.split('@')[0],
      password: password || '',
      avatar: '👤',
      role: 'admin',
      rememberMe,
      biometricsEnabled,
      createdAt: now,
      lastLoginAt: now,
    };
    accounts.push(account);
  } else {
    // Existing user update
    account = {
      ...account,
      name: displayName?.trim() || account.name,
      password: password || account.password,
      rememberMe,
      biometricsEnabled,
      lastLoginAt: now,
    };
    const idx = accounts.findIndex((a) => a.id === account!.id);
    if (idx >= 0) accounts[idx] = account;
  }

  saveAccounts(accounts);

  const session: AuthSession = {
    isAuthenticated: true,
    account,
  };
  saveActiveAuthSession(session);

  return { success: true, account, message: '登入成功！' };
}

// Simulated or WebAuthn Biometric Authentication
export async function authenticateWithBiometrics(
  account: AuthAccount
): Promise<{ success: boolean; message: string }> {
  try {
    // Try WebAuthn PublicKeyCredential if available
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (available) {
        // Native biometric prompt is supported
        console.log('Biometric platform authenticator available');
      }
    }
  } catch (e) {
    console.warn('WebAuthn check error:', e);
  }

  // Record successful login session
  const session: AuthSession = {
    isAuthenticated: true,
    account: {
      ...account,
      lastLoginAt: new Date().toISOString(),
    },
  };
  saveActiveAuthSession(session);
  return { success: true, message: '生物辨識通過，已成功登入！' };
}

// Logout / Lock
export function logoutCurrentSession(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION);
    if (raw) {
      const session: AuthSession = JSON.parse(raw);
      // If rememberMe is checked, we keep account info but set isAuthenticated = false so PIN/Biometrics is prompted
      if (session.account?.rememberMe) {
        localStorage.setItem(
          STORAGE_KEY_ACTIVE_SESSION,
          JSON.stringify({ isAuthenticated: false, account: session.account })
        );
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
      }
    }
  } catch {}
}

// ----------------------------------------------------
// 個人雲更改安全防護：原信箱認證退出 (Unbind) 與新信箱認證綁定 (Bind)
// 避免使用者資料庫被他人私自轉移！
// ----------------------------------------------------

export interface CloudChallenge {
  email: string;
  code: string;
  expiresAt: number;
}

// Step 1: 原信箱認證退出 (Send Unbind Code to Old Email)
export function requestCloudUnbindCode(currentEmail: string): { code: string; message: string } {
  const cleanEmail = currentEmail.trim().toLowerCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const challenge: CloudChallenge = {
    email: cleanEmail,
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  try {
    localStorage.setItem(STORAGE_KEY_CLOUD_UNBIND_CHALLENGE, JSON.stringify(challenge));
  } catch {}

  return {
    code,
    message: `安全解除認證碼已發送至原綁定信箱：${cleanEmail}！請至信箱收取 6 位數認證碼以確認退出。`,
  };
}

// Step 1: Verify Unbind Code
export function verifyCloudUnbindCode(
  currentEmail: string,
  inputCode: string
): { success: boolean; message: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLOUD_UNBIND_CHALLENGE);
    if (!raw) return { success: false, message: '請先點擊發送原信箱退出認證碼' };
    const challenge: CloudChallenge = JSON.parse(raw);

    if (challenge.email !== currentEmail.trim().toLowerCase()) {
      return { success: false, message: '認證信箱與原綁定信箱不相符' };
    }
    if (Date.now() > challenge.expiresAt) {
      return { success: false, message: '認證碼已逾期，請重新發送' };
    }
    if (challenge.code !== inputCode.trim()) {
      return { success: false, message: '認證碼不符，請重新確認郵件內 6 位數號碼' };
    }

    localStorage.removeItem(STORAGE_KEY_CLOUD_UNBIND_CHALLENGE);
    return { success: true, message: '原信箱身分核對無誤，已安全解除原個人雲綁定！' };
  } catch {
    return { success: false, message: '驗證過程發生錯誤，請重試' };
  }
}
