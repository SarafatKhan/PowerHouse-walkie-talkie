import React from 'react';
import { Download, Smartphone, Share2, X, Laptop } from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  onNativeInstall: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  onNativeInstall,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider text-white">
                Download Power House
              </h2>
              <p className="text-[11px] font-mono text-emerald-400">Install as Mobile / Desktop App</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Card */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20">
          <div className="flex items-start gap-3">
            <Smartphone className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white">App Experience without an APK</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Power House installs as a <strong>Progressive Web App (PWA)</strong> directly from your browser. It opens in its own window from your app drawer, with zero setup and full access to the live global channel.
              </p>
            </div>
          </div>

          {/* Direct 1-Click Install Button if supported */}
          {isInstallable && (
            <button
              onClick={() => {
                onNativeInstall();
                onClose();
              }}
              className="mt-4 w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-xs font-mono uppercase tracking-wider"
            >
              <Download className="w-4 h-4" />
              <span>Install to Home Screen Now</span>
            </button>
          )}
        </div>

        {/* Step-by-Step Installation Guides */}
        <div className="mt-5 space-y-4 text-xs">
          {/* Android Chrome */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 font-bold text-slate-200 mb-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Android (Chrome / Edge / Samsung Internet)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed font-sans">
              <li className="flex items-start gap-2">
                <span className="font-mono text-emerald-400">1.</span>
                <span>Tap the <strong className="text-slate-200">three dots menu (⋮)</strong> at the top right of your browser.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-emerald-400">2.</span>
                <span>Select <strong className="text-slate-200">"Install app"</strong> or <strong className="text-slate-200">"Add to Home screen"</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-emerald-400">3.</span>
                <span>Tap <strong className="text-slate-200">Install</strong>. Power House will appear in your app drawer!</span>
              </li>
            </ol>
          </div>

          {/* iPhone / iPad */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 font-bold text-slate-200 mb-2">
              <Share2 className="w-4 h-4 text-sky-400" />
              <span>iPhone & iPad (Safari)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed font-sans">
              <li className="flex items-start gap-2">
                <span className="font-mono text-sky-400">1.</span>
                <span>Tap the <strong className="text-slate-200">Share</strong> button (box with an arrow pointing up) in Safari.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-sky-400">2.</span>
                <span>Scroll down and tap <strong className="text-slate-200">"Add to Home Screen"</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-sky-400">3.</span>
                <span>Tap <strong className="text-slate-200">Add</strong> at the top right.</span>
              </li>
            </ol>
          </div>

          {/* Desktop Chrome / Edge */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 font-bold text-slate-200 mb-2">
              <Laptop className="w-4 h-4 text-purple-400" />
              <span>Windows, Mac & Chromebook</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Click the <strong className="text-slate-200">Install icon (computer/arrow)</strong> in your browser address bar, or open the browser menu and select <strong className="text-slate-200">"Install Power House"</strong>.
            </p>
          </div>
        </div>

        {/* Bottom Close Button */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition text-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
