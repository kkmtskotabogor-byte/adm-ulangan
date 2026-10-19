import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  Smartphone, 
  Download, 
  X, 
  Share2, 
  PlusSquare, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  QrCode,
  Copy,
  Check
} from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'portal' | 'banner' | 'compact';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, isMobile, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // If already running standalone inside the installed app, show subtle status or hide
  if (isInstalled) {
    if (variant === 'header' || variant === 'portal') {
      return (
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Aplikasi Terpasang</span>
        </span>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  return (
    <>
      {/* 1. Variant Header (In Top Navigation Bar) */}
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleClick}
          title="Instal Aplikasi SIM Ujian & Raport di HP Android / iPhone"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 active:from-emerald-500 active:to-teal-500 rounded-lg shadow-sm border border-emerald-500/30 transition-all cursor-pointer transform hover:scale-[1.02] ${className}`}
        >
          <Smartphone className="w-4 h-4 text-emerald-950 animate-pulse shrink-0" />
          <span className="whitespace-nowrap">Instal di HP</span>
        </button>
      )}

      {/* 2. Variant Portal (In Main Login Portal) */}
      {variant === 'portal' && (
        <button
          type="button"
          onClick={handleClick}
          title="Pasang aplikasi SIM Ujian di Layar Utama HP"
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-emerald-900 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-xl shadow-md border border-emerald-300/60 transition-all cursor-pointer transform hover:scale-[1.02] ${className}`}
        >
          <Smartphone className="w-4 h-4 text-emerald-950 animate-pulse shrink-0" />
          <span>Instal di HP</span>
        </button>
      )}

      {/* 3. Variant Banner / Card */}
      {variant === 'banner' && (
        <div className={`p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl shadow-lg border border-emerald-400/30 flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 text-white shadow-inner">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base leading-tight">
                Gunakan SIM Ujian Lebih Cepat di HP
              </h4>
              <p className="text-xs text-emerald-100 mt-0.5">
                Pasang langsung di layar utama HP tanpa perlu unduh dari PlayStore. Buka cepat, praktis &amp; responsif!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="w-full sm:w-auto px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 active:bg-emerald-100 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Instal Aplikasi Sekarang</span>
          </button>
        </div>
      )}

      {/* 4. Variant Compact (Small icon with text) */}
      {variant === 'compact' && (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Instal di HP</span>
        </button>
      )}

      {/* =========================================================================
          GUIDED INSTALL MODAL (iOS Safari, Android Chrome, and Desktop guide)
          ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    Instal Aplikasi di HP
                  </h3>
                  <p className="text-[11px] text-emerald-100">
                    Akses Cepat di Layar Utama HP Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Native Prompt Available (Instant Install) */}
              {isInstallable && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <p className="text-emerald-900 font-bold">
                    Perangkat Anda mendukung instalasi langsung 1-klik!
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await install();
                      if (res) setShowModal(false);
                    }}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pasang Sekarang (Otomatis)</span>
                  </button>
                </div>
              )}

              {/* Instructions for Android Chrome */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px]">
                    🤖
                  </span>
                  <span>Cara Pasang di HP Android (Google Chrome):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11.5px] pl-1 font-medium">
                  <li>
                    Buka link ini di browser <strong>Google Chrome</strong> di HP Anda.
                  </li>
                  <li>
                    Ketuk ikon <strong>Titik Tiga (⋮)</strong> di sudut kanan atas layar Chrome.
                  </li>
                  <li>
                    Pilih menu <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama" (Add to Home screen)</strong>.
                  </li>
                  <li>
                    Ketuk <strong>"Instal"</strong>. Ikon aplikasi SIM Ujian akan langsung muncul di layar HP Anda!
                  </li>
                </ol>
              </div>

              {/* Instructions for iPhone / iPad (iOS Safari) */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-[11px]">
                    🍎
                  </span>
                  <span>Cara Pasang di iPhone / iPad (Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11.5px] pl-1 font-medium">
                  <li>
                    Buka link ini di browser <strong>Safari</strong> pada iPhone.
                  </li>
                  <li>
                    Ketuk tombol <strong>Bagikan / Share</strong> (ikon kotak dengan panah ke atas <Share2 className="inline w-3.5 h-3.5 text-indigo-600 mb-0.5" /> di bilah bawah).
                  </li>
                  <li>
                    Gulir ke bawah dan ketuk <strong>"Tambah ke Layar Utama"</strong> (Add to Home Screen <PlusSquare className="inline w-3.5 h-3.5 text-indigo-600 mb-0.5" />).
                  </li>
                  <li>
                    Ketuk <strong>"Tambah"</strong> di pojok kanan atas. Selesai!
                  </li>
                </ol>
              </div>

              {/* Share link to open on phone */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="block text-[11px] font-bold text-slate-600">
                  Salin tautan untuk dibuka di WhatsApp / Browser HP:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? window.location.href : ''}
                    className="flex-1 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-xs font-mono truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      copied 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Keunggulan PWA di HP */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center gap-2.5 text-indigo-950">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <p className="text-[11px] leading-snug">
                  Setelah dipasang, aplikasi dapat dibuka langsung seperti aplikasi asli tanpa bilah browser, lebih hemat kuota, dan sangat responsif.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
