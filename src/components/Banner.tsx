import React, { useState, useEffect } from 'react';
import { Flame, ShieldCheck, Instagram } from 'lucide-react';

export const Banner: React.FC = () => {
  const [showIgBanner, setShowIgBanner] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    if (ua.indexOf('Instagram') > -1 || ua.indexOf('FBAN') > -1 || ua.indexOf('FBAV') > -1) {
      setShowIgBanner(true);
    }
  }, []);

  return (
    <div className="space-y-3">
      {/* Instagram in-app browser alert */}
      {showIgBanner && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3.5 py-2 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span>💡</span>
            <span>
              Jika tampilan lambat di Instagram, ketuk <b>•••</b> di pojok atas & pilih <b>"Buka di Browser"</b> (Chrome/Safari).
            </span>
          </div>
          <button 
            onClick={() => setShowIgBanner(false)}
            className="text-amber-700 hover:text-amber-900 font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-700 via-red-800 to-stone-900 text-white p-4 sm:p-5 shadow-md border border-red-900">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 -mb-6 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              #SensasiNgedaging
              <Flame className="w-5 h-5 text-amber-400 fill-amber-400 inline" />
            </h2>
            
            {/* Informasi Instagram Resmi */}
            <div>
              <a
                href="https://www.instagram.com/dimsumanyu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-black/25 hover:bg-black/40 text-rose-200 hover:text-white border border-white/15 px-3 py-1 rounded-full text-xs font-bold transition shadow-xs cursor-pointer group"
              >
                <Instagram className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition" />
                <span>IG: @dimsumanyu</span>
              </a>
            </div>
          </div>

          <div className="flex items-center">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-bold px-3 py-1 rounded-full shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> 100% Daging Pilihan & Halal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
