import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Layers, 
  Monitor, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isOnline, platformName, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'auto' | 'ios' | 'android' | 'desktop'>(
    isIOS ? 'ios' : isAndroid ? 'android' : 'auto'
  );
  const [installing, setInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    setInstalling(true);
    try {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-neutral-900 border border-amber-500/30 shadow-2xl shadow-amber-500/10 text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md flex items-center justify-center">
              <img src="/icon.svg" alt="Cricket ERP" className="w-8 h-8 rounded-lg" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Standalone App Setup
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Web • Android • iOS
                </span>
              </h3>
              <p className="text-xs text-neutral-400">Install to your home screen or desktop dock</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="grid grid-cols-4 bg-neutral-950/60 p-1.5 border-b border-neutral-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('auto')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'auto'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>1-Click</span>
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ios'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iOS Safari</span>
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'android'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'desktop'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {isInstalled ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="font-bold text-white text-base">App Already Running in Standalone Mode</h4>
              <p className="text-xs text-neutral-300">
                Talk of the Town Cricket Closet ERP is running as an installed standalone web app with full offline cache, device hardware access, and zero browser chrome.
              </p>
            </div>
          ) : null}

          {/* AUTO / 1-CLICK TAB */}
          {activeTab === 'auto' && (
            <div className="space-y-4">
              <div className="bg-neutral-950/80 rounded-xl p-4 border border-neutral-800 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Browser One-Click Installation</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Detected System: <span className="text-amber-400 font-medium">{platformName}</span>
                    </p>
                  </div>
                  {isInstallable ? (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium border border-emerald-500/30">
                      Ready to Install
                    </span>
                  ) : (
                    <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full font-medium">
                      Standard PWA
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  Installing as a standalone application gives you instant launches from your home screen or app dock, full offline caching, smoother touch gestures, and eliminates browser address bars.
                </p>

                {isInstallable ? (
                  <button
                    onClick={handleNativeInstall}
                    disabled={installing || installSuccess}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    {installSuccess ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-neutral-950" />
                        Successfully Installed!
                      </>
                    ) : installing ? (
                      'Prompting Installation...'
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Install App Now
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2 pt-2">
                    <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 text-xs text-neutral-300">
                      <span className="font-medium text-amber-300">Platform Note:</span> If your browser hasn't shown the 1-click prompt, use the dedicated tabs above for step-by-step instructions:
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveTab('ios')}
                        className="flex-1 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 flex items-center justify-center gap-1.5 transition"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                        iPhone / iPad Guide
                      </button>
                      <button
                        onClick={() => setActiveTab('android')}
                        className="flex-1 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 flex items-center justify-center gap-1.5 transition"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                        Android Guide
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* iOS SAFARI TAB */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Apple iOS requires installing through the Safari browser share menu.</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                      Tap the Safari Share Button <Share className="w-3.5 h-3.5 text-blue-400 inline" />
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Located in the Safari bottom toolbar on iPhone or top right on iPad.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                      Select "Add to Home Screen" <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" />
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Scroll down in the action sheet list and tap the "Add to Home Screen" option.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white">
                      Confirm and Tap "Add"
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Tap "Add" in the top-right corner. The Cricket ERP icon will appear on your home screen and run standalone with custom status bars.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ANDROID TAB */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>On Android (Chrome, Samsung Internet, Edge), installation takes 2 taps.</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center font-bold text-emerald-400 text-xs shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white">
                      Tap the Browser Menu (⋮ Three Dots)
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      In Google Chrome or Edge on Android, tap the three dots in the top right corner.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center font-bold text-emerald-400 text-xs shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white">
                      Tap "Install app" or "Add to Home screen"
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Android will generate a WebAPK and place the Cricket ERP badge in your App Drawer and Home Screen.
                    </p>
                  </div>
                </div>
              </div>

              {isInstallable && (
                <button
                  onClick={handleNativeInstall}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  Trigger Android Install Prompt Now
                </button>
              )}
            </div>
          )}

          {/* DESKTOP TAB */}
          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <div className="p-3 bg-neutral-800/60 border border-neutral-700 rounded-xl text-xs text-neutral-200 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Run Cricket ERP as a standalone desktop window on macOS or Windows.</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white">
                      Look for the Install Icon in the URL bar
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      In Chrome, Brave, or Edge, click the small computer/download icon on the right side of the URL bar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white">
                      Click "Install"
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      The application launches in its own high-performance window without browser toolbars and adds to your Dock or Taskbar.
                    </p>
                  </div>
                </div>
              </div>

              {isInstallable && (
                <button
                  onClick={handleNativeInstall}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  Install Standalone Desktop Window
                </button>
              )}
            </div>
          )}

          {/* Standalone Features Overview Grid */}
          <div className="pt-2 border-t border-neutral-800">
            <h5 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
              Standalone Capabilities
            </h5>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-neutral-950/40 border border-neutral-800/80 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-neutral-300">Offline Cache Enabled</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-950/40 border border-neutral-800/80 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-neutral-300">No Browser URL Bars</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-950/40 border border-neutral-800/80 flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-neutral-300">Home Screen Launcher</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-950/40 border border-neutral-800/80 flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="text-neutral-300">{isOnline ? 'Online Synced' : 'Offline Mode'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-950/80 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <span>Talk of the Town • Cricket Closet ERP v2.4</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
