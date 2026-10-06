import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'nav' | 'banner' | 'settings' | 'compact';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'nav', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  // If running already installed and it's just the quick nav button, we can show a subtle standalone indicator or hide it
  if (isInstalled && variant === 'nav') {
    return (
      <button
        onClick={() => setModalOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-lg hover:bg-emerald-900/40 transition-colors ${className}`}
        title="Running as Standalone App"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="hidden sm:inline">Standalone App</span>
      </button>
    );
  }

  if (isInstalled && variant === 'settings') {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Standalone App Active</h4>
            <p className="text-xs text-neutral-400">Installed on device with offline caching and native window controls</p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-medium transition"
        >
          App Info
        </button>
      </div>
    );
  }

  // Variant: Settings Card
  if (variant === 'settings') {
    return (
      <>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-950/30 via-neutral-900 to-amber-950/20 border border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Install Standalone App</h4>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Web • Android • iOS
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Run without browser URL bars, launch from home screen, and operate offline
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isInstallable) {
                install();
              } else {
                setModalOpen(true);
              }
            }}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isInstallable ? 'Install App' : 'Get Standalone App'}
          </button>
        </div>

        <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  // Variant: Top Banner
  if (variant === 'banner') {
    return (
      <>
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-amber-900/60 via-neutral-900 to-neutral-900 border-b border-amber-500/30 text-xs">
          <div className="flex items-center gap-2.5 text-neutral-200">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>
              Install <strong>Cricket Closet ERP</strong> as a standalone app for fast offline access on Web, Android, and iOS.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isInstallable) {
                  install();
                } else {
                  setModalOpen(true);
                }
              }}
              className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
          </div>
        </div>

        <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  // Variant: Nav / Header Button
  return (
    <>
      <button
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setModalOpen(true);
          }
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm shadow-amber-500/20 transition cursor-pointer ${className}`}
        title="Install Standalone App for Web, Android, iOS"
      >
        <Download className="w-3.5 h-3.5 text-neutral-950" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
