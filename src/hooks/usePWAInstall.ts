import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAInstallState {
  isInstallable: boolean; // Native beforeinstallprompt is ready
  isInstalled: boolean;   // App is running in standalone mode
  isIOS: boolean;         // iPhone, iPad, iPod
  isAndroid: boolean;     // Android device
  isInAppBrowser: boolean;// LINE, Facebook, WeChat, Instagram, etc.
  isLine: boolean;        // Specifically LINE
  isMobile: boolean;      // Any mobile device
  openInExternalBrowserUrl: string; // URL with openExternalBrowser=1 for LINE breakout
  install: () => Promise<'accepted' | 'dismissed' | 'manual_guide'>;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isLine, setIsLine] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 1. Detect standalone mode (already installed & running full screen)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // 2. User Agent environment checks
    const ua = (window.navigator.userAgent || '').toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    const isMobileDevice = isIOSDevice || isAndroidDevice || /mobile|tablet/.test(ua);
    const isLineApp = /line\//.test(ua);
    const inApp = isLineApp || /fban|fbav|messenger|instagram|micromessenger|wechat/.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsMobile(isMobileDevice);
    setIsInAppBrowser(inApp);
    setIsLine(isLineApp);

    // 3. Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'manual_guide'> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          return 'accepted';
        }
        return 'dismissed';
      } catch (err) {
        console.warn('Native install prompt error:', err);
        return 'manual_guide';
      }
    }
    // No native prompt available (iOS Safari, in-app browser, or Android fallback)
    return 'manual_guide';
  }, [deferredPrompt]);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const openInExternalBrowserUrl = currentUrl.includes('openExternalBrowser=1')
    ? currentUrl
    : currentUrl + (currentUrl.includes('?') ? '&' : '?') + 'openExternalBrowser=1';

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isInAppBrowser,
    isLine,
    isMobile,
    openInExternalBrowserUrl,
    install,
  };
}
