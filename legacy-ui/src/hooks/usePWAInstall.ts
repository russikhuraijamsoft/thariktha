import { useState, useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  platformName: string;
  install: () => Promise<boolean>;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [platformName, setPlatformName] = useState('Web');

  useEffect(() => {
    // 1. Detect standalone mode (already running as installed app on Web / Android / iOS)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      const standalone = Boolean(isStandaloneMedia || isIOSStandalone || isAndroidApp);
      setIsInstalled(standalone);
      return standalone;
    };

    checkStandalone();

    // 2. Detect platform & OS
    const ua = (typeof window !== 'undefined' ? window.navigator.userAgent : '').toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    if (isIOSDevice) {
      setPlatformName('iOS (iPhone/iPad)');
    } else if (isAndroidDevice) {
      setPlatformName('Android');
    } else if (/macintosh|mac os x/.test(ua)) {
      setPlatformName('macOS Desktop');
    } else if (/windows/.test(ua)) {
      setPlatformName('Windows PC');
    } else {
      setPlatformName('Web Browser');
    }

    // 3. Listen to beforeinstallprompt (Chromium, Chrome on Android, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Listen to appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    // 5. Network status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Media query listener for standalone changes
    let mql: MediaQueryList | null = null;
    if (window.matchMedia) {
      mql = window.matchMedia('(display-mode: standalone)');
      const handleMediaChange = (e: MediaQueryListEvent) => {
        setIsInstalled(e.matches);
      };
      mql.addEventListener('change', handleMediaChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (mql) {
        mql.removeEventListener('change', () => {});
      }
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[PWA] Error launching install prompt:', err);
      return false;
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isStandalone: isInstalled,
    isOnline,
    platformName,
    install,
  };
}
