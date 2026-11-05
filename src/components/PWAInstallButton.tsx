import React, { useState } from 'react';
import { Smartphone, Download, Share, PlusSquare, X, CheckCircle2, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'card' | 'badge';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showGeneralGuide, setShowGeneralGuide] = useState(false);

  // If already installed or running as standalone native PWA, hide install trigger
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowGeneralGuide(true);
    }
  };

  return (
    <>
      {variant === 'navbar' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-black text-xs px-2.5 py-1.5 rounded-xl shadow-sm transition active:scale-95 ${className}`}
          title="Install SmartCart on your phone or desktop home screen"
        >
          <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">App</span>
        </button>
      )}

      {variant === 'card' && (
        <div className={`p-4 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 rounded-3xl border border-emerald-700/60 text-white shadow-xl relative overflow-hidden ${className}`}>
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-emerald-950 flex items-center justify-center font-black shadow-lg shrink-0">
                <Smartphone className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold bg-amber-400 text-emerald-950 px-2 py-0.2 rounded-full uppercase tracking-wider">
                    Mobile Application
                  </span>
                  <span className="text-[10px] text-emerald-300 font-mono">PWA Ready</span>
                </div>
                <h3 className="font-black text-base tracking-tight mt-0.5">
                  Get the SmartCart Mobile App
                </h3>
                <p className="text-xs text-emerald-200/90 mt-0.5 leading-relaxed">
                  Fast camera barcode scanning, offline mode &amp; home screen access.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-emerald-800/80 flex items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-1 text-[11px] text-emerald-300 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Zero App Store downloads needed</span>
            </div>
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Install to Phone</span>
            </button>
          </div>
        </div>
      )}

      {variant === 'badge' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install Mobile App</span>
        </button>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-900 text-amber-300 flex items-center justify-center font-black shadow-sm">
                  <Smartphone className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Install on iPhone / iPad</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Add to your Home Screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Tap the Safari</span>
                    <Share className="w-4 h-4 text-blue-600 inline stroke-[2]" />
                    <span>Share button</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Found at the bottom bar of Safari on iPhone, or top bar on iPad.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Select</span>
                    <PlusSquare className="w-4 h-4 text-emerald-700 inline" />
                    <strong>&apos;Add to Home Screen&apos;</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Scroll down through the share sheet options and tap Add.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-bold text-slate-900">Tap &apos;Add&apos; in top right</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    SmartCart will appear as a standalone app on your iPhone home screen!
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* General / Chrome Desktop Guide Modal */}
      {showGeneralGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-sm">
                  <Download className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Install SmartCart App</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Standalone Application</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGeneralGuide(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              To install SmartCart as a mobile app on Android or desktop:
            </p>

            <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>On Chrome (Android / Desktop):</span>
              </div>
              <p className="text-[11px] text-slate-600 pl-6">
                Tap the three dots menu (&vellip;) in the top right, then select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
              </p>

              <div className="flex items-center gap-2 font-bold text-slate-900 pt-2 border-t border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>On Microsoft Edge / Brave:</span>
              </div>
              <p className="text-[11px] text-slate-600 pl-6">
                Click the App Available icon in the browser address bar or select <strong>Apps &rarr; Install this site as an app</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowGeneralGuide(false)}
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
