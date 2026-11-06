import React from 'react';
import { Download, X, Smartphone, Sparkles, Check, Share, PlusSquare, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header with App Logo */}
        <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white p-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-16 h-16 mx-auto rounded-2xl bg-white p-1.5 shadow-lg shadow-red-950/30 mb-2.5">
            <img
              src="/pwa-192x192.png"
              alt="DIMSUMANYU"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>

          <h3 className="text-base sm:text-lg font-black tracking-tight">
            Install Aplikasi DIMSUMANYU
          </h3>
          <p className="text-xs text-red-100 font-medium mt-0.5">
            #SensasiNgedaging • Akses Cepat di Layar Utama HP
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Benefit List */}
          <div className="space-y-2 bg-stone-50 rounded-2xl p-3.5 border border-stone-200/80">
            <div className="flex items-start gap-2.5 text-stone-800">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                ✓
              </div>
              <div>
                <p className="font-extrabold text-stone-900">Buka Langsung dari Layar Utama</p>
                <p className="text-[11px] text-stone-500">Ikon resmi Dimsumanyu muncul di HP layaknya aplikasi Play Store.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-stone-800">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                ✓
              </div>
              <div>
                <p className="font-extrabold text-stone-900">Layar Fullscreen Bersih</p>
                <p className="text-[11px] text-stone-500">Tanpa bilah alamat browser, nyaman untuk kasir outlet maupun pembeli.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-stone-800">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                ✓
              </div>
              <div>
                <p className="font-extrabold text-stone-900">Super Ringan &amp; Hemat Kuota</p>
                <p className="text-[11px] text-stone-500">Ukuran sangat kecil (&lt;1MB) dan memuat menu dengan sekejap.</p>
              </div>
            </div>
          </div>

          {/* Action Area based on Platform */}
          {isInstalled ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-center space-y-1">
              <p className="font-extrabold text-emerald-800 text-sm flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Aplikasi Sudah Terpasang!</span>
              </p>
              <p className="text-[11px] text-emerald-700">
                DIMSUMANYU sudah terinstal di perangkat ini dan siap digunakan dari layar utama.
              </p>
            </div>
          ) : isInstallable ? (
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full bg-red-600 hover:bg-red-700 active:scale-98 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Pasang Aplikasi Sekarang</span>
              </button>
              <p className="text-[10px] text-stone-400 text-center">
                Kompatibel untuk HP Android, Tablet, dan Komputer Desktop (Chrome / Edge).
              </p>
            </div>
          ) : isIOS ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold">
                <Smartphone className="w-4 h-4 text-amber-700" />
                <span>Petunjuk Pasang di iPhone / iPad (Safari):</span>
              </div>
              <ol className="space-y-2 text-[11.5px] text-stone-700 pl-1">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Tekan tombol <b>Bagikan (Share)</b> <Share className="w-3.5 h-3.5 inline mx-0.5 text-sky-600" /> di bilah bawah browser Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Gulir sedikit ke bawah, lalu ketuk menu <b>"Tambah ke Layar Utama"</b> (<i>Add to Home Screen</i>) <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-stone-700" />.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Ketuk <b>"Tambah"</b> di pojok kanan atas. Ikon DIMSUMANYU akan langsung muncul di menu HP Anda!
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-center space-y-1">
              <p className="font-bold text-stone-800">
                Cara Pasang di Browser:
              </p>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Buka menu browser Anda (titik 3 di kanan atas), lalu pilih <b>"Install Aplikasi"</b> atau <b>"Tambahkan ke Layar Utama"</b>.
              </p>
            </div>
          )}

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-bold text-stone-400 hover:text-stone-700 transition cursor-pointer"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
