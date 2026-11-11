import React, { useState, useEffect } from 'react';
import { Flame, ShieldCheck, Instagram } from 'lucide-react';
import heroDimsumImg from '../assets/images/dimsum_steamer_hero_1794359689282.jpg';

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

      {/* Hero Showcase Banner dengan Siluet / Gambar Dimsum Hangat & Klakat Bambu (Sesuai Contoh Gambar 1) */}
      <div className="relative overflow-hidden rounded-3xl shadow-md border border-stone-800/40 bg-stone-950 min-h-[175px] sm:min-h-[220px] md:min-h-[240px] flex items-end">
        {/* Background Image: Dimsum Hangat Berasap dalam Klakat Bambu tanpa tulisan apapun */}
        <img
          src={heroDimsumImg}
          alt="Dimsum Kukus Anyu"
          className="absolute inset-0 w-full h-full object-cover object-center sm:object-right md:object-center brightness-[0.88] contrast-105"
        />

        {/* Ambient Dark Gradient Overlays agar teks dan badge tetap kontras & terbaca jelas */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/50 to-stone-950/25 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/40 to-transparent pointer-events-none" />

        {/* Content Overlay */}
        <div className="relative z-10 p-4 sm:p-5 md:p-6 w-full flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-red-600/90 backdrop-blur-md text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
              <span>DIMSUMANYU</span>
              <span>•</span>
              <span>BUKA SETIAP HARI</span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2 drop-shadow-md">
              <span>#SensasiNgedaging</span>
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 fill-amber-400 inline shrink-0" />
            </h2>
            
            {/* Informasi Instagram Resmi */}
            <div>
              <a
                href="https://www.instagram.com/dimsumanyu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-md text-rose-200 hover:text-white border border-white/20 px-3 py-1 rounded-full text-xs font-bold transition shadow-xs cursor-pointer group active:scale-95"
              >
                <Instagram className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition" />
                <span>IG: @dimsumanyu</span>
              </a>
            </div>
          </div>

          <div className="flex items-center">
            <span className="inline-flex items-center gap-1.5 bg-emerald-950/80 backdrop-blur-md text-emerald-200 border border-emerald-500/40 text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> 
              <span>100% Daging Pilihan & Halal</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
