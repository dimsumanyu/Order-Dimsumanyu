import React, { useState } from 'react';
import { Plus, Minus, Flame, Eye, X, Check } from 'lucide-react';
import { MenuItem } from '../types';
import { formatRupiah } from '../utils/whatsapp';

interface MenuCardProps {
  item: MenuItem;
  quantity: number;
  onUpdateQty: (delta: number) => void;
}

// Helper to determine appropriate dimsum visual icon
function getCategoryVisual(kategori: string, nama: string) {
  const text = `${kategori} ${nama}`.toLowerCase();
  if (text.includes('mentai')) return { emoji: '🥟', subtitle: 'DIMSUM MENTAI', badge: '🔥' };
  if (text.includes('goreng')) return { emoji: '🥟', subtitle: 'DIMSUM GORENG', badge: 'Crispy' };
  if (text.includes('frozen')) return { emoji: '🥟', subtitle: 'FROZEN PACK', badge: '❄️' };
  if (text.includes('minum') || text.includes('tea') || text.includes('es')) return { emoji: '🥤', subtitle: 'MINUMAN', badge: 'Segar' };
  if (text.includes('paket')) return { emoji: '🍱', subtitle: 'PAKET HEMAT', badge: 'Combo' };
  return { emoji: '🥟', subtitle: kategori.toUpperCase() || 'DIMSUM KUKUS', badge: '' };
}

// Extract portion info (e.g. "ISI 6 PCS" -> "Isi 6 pcs")
function extractPortionText(nama: string): string {
  const match = nama.match(/ISI\s+(\d+\s*(?:PCS|BIJI|POTONG)?)/i);
  if (match) {
    const val = match[1].toLowerCase().replace('pcs', 'pcs').trim();
    return `Isi ${val}`;
  }
  const match2 = nama.match(/\((\d+\s*pcs)\)/i);
  if (match2) {
    return `Isi ${match2[1].toLowerCase()}`;
  }
  return '';
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, quantity, onUpdateQty }) => {
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const isAvailable = item.status === 'TERSEDIA';
  const visual = getCategoryVisual(item.kategori, item.nama);
  const portionText = extractPortionText(item.nama);

  return (
    <>
      {/* 📦 CARD BLOCK MODEL BLOK2 SESUAI CONTOH GAMBAR */}
      <div
        className={`group bg-white rounded-2xl sm:rounded-3xl border transition-all duration-200 flex flex-col justify-between relative overflow-hidden shadow-xs hover:shadow-md ${
          item.isBestSeller
            ? 'border-amber-300/80 hover:border-amber-400'
            : 'border-stone-200 hover:border-stone-300'
        } ${!isAvailable ? 'opacity-65 bg-stone-50' : ''}`}
      >
        {/* 1. KOTAK ILUSTRASI MENU (Top Block) */}
        <div className="relative bg-[#f8f6f2] aspect-4/3 w-full rounded-t-2xl sm:rounded-t-3xl flex flex-col items-center justify-center p-3 select-none border-b border-stone-100 overflow-hidden">
          {/* Badge Best Seller (Kiri Atas) */}
          {item.isBestSeller && (
            <div className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 z-10">
              <Flame className="w-2.5 h-2.5 fill-white text-white shrink-0" />
              <span>BEST SELLER</span>
            </div>
          )}

          {/* Dumpling Icon & Subtitle di Tengah Kotak */}
          <div className="flex flex-col items-center justify-center transition-transform group-hover:scale-105 duration-200">
            <span className="text-3xl sm:text-4xl filter drop-shadow-xs select-none">
              {visual.emoji}
            </span>
            <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-widest text-stone-400 mt-2 text-center">
              {visual.subtitle}
            </span>
          </div>

          {/* Tombol Detail (Kanan Bawah Kotak Gambar) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetailModal(true);
            }}
            className="absolute bottom-2 right-2 bg-stone-800/70 hover:bg-stone-900 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-xs transition cursor-pointer shadow-xs active:scale-95"
            title="Lihat Detail Menu"
          >
            <Eye className="w-3 h-3 text-stone-200" />
            <span>Detail</span>
          </button>
        </div>

        {/* 2. BODY KARTU (Bawah Kotak) */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 gap-2">
          <div className="space-y-1">
            {/* Baris Kategori / Isi Porsi & Status Tersedia */}
            <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[10.5px]">
              <span className="font-bold text-stone-500 uppercase tracking-tight truncate">
                {item.kategori} {portionText ? `· ${portionText}` : ''}
              </span>
              <span
                className={`font-bold shrink-0 ${
                  isAvailable ? 'text-teal-600' : 'text-stone-400'
                }`}
              >
                {isAvailable ? 'Tersedia' : 'Habis'}
              </span>
            </div>

            {/* Nama Menu Utama (Huruf Tebal) */}
            <h3 className="font-black text-stone-900 text-xs sm:text-[13px] leading-snug uppercase tracking-tight group-hover:text-red-700 transition line-clamp-2">
              {item.nama}
            </h3>

            {/* Catatan: Keterangan deskripsi panjang ditiadakan sesuai permintaan user:
                "gk usah pake keterangan dimsum padat dll model blok2 nya" */}
          </div>

          {/* 3. FOOTER: HARGA & TOMBOL TAMBAH */}
          <div className="pt-2 border-t border-stone-100 flex items-end justify-between gap-2 mt-auto">
            <div>
              <p className="text-[8.5px] font-extrabold uppercase tracking-wider text-stone-400">
                HARGA
              </p>
              <p className="text-red-600 font-black text-xs sm:text-sm tracking-tight">
                {formatRupiah(item.harga)}
              </p>
            </div>

            <div className="shrink-0">
              {!isAvailable ? (
                <span className="inline-block bg-stone-100 text-stone-400 text-[10.5px] font-bold px-3 py-1.5 rounded-xl border border-stone-200">
                  Habis
                </span>
              ) : quantity === 0 ? (
                <button
                  type="button"
                  onClick={() => onUpdateQty(1)}
                  className="bg-red-700 hover:bg-red-800 active:scale-95 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(-1)}
                    className="w-6 h-6 rounded-lg bg-white text-stone-800 hover:bg-stone-50 shadow-xs flex items-center justify-center font-bold text-xs transition active:scale-90 cursor-pointer"
                    title="Kurang 1"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-black text-xs px-1.5 text-stone-900 min-w-[18px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(1)}
                    className="w-6 h-6 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-xs flex items-center justify-center font-bold text-xs transition active:scale-90 cursor-pointer"
                    title="Tambah 1"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🔍 MODAL DETAIL MENU (Ketika tombol Detail diklik) */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            {/* Header Box Gambar */}
            <div className="relative bg-[#f8f6f2] p-6 flex flex-col items-center justify-center text-center border-b border-stone-100">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-stone-500 hover:text-stone-900 flex items-center justify-center shadow-xs transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {item.isBestSeller && (
                <span className="bg-amber-500 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1 mb-2">
                  <Flame className="w-3 h-3 fill-white text-white" />
                  <span>BEST SELLER DIMSUMANYU</span>
                </span>
              )}

              <span className="text-5xl my-2 filter drop-shadow-sm select-none">
                {visual.emoji}
              </span>
              <span className="text-xs font-extrabold uppercase tracking-widest text-stone-400">
                {item.kategori}
              </span>
            </div>

            {/* Konten Detail */}
            <div className="p-5 space-y-4">
              <div>
                <h4 className="font-black text-stone-900 text-base leading-snug">
                  {item.nama}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs font-bold ${
                      isAvailable ? 'text-teal-600' : 'text-stone-400'
                    }`}
                  >
                    ● {isAvailable ? 'Stok Tersedia' : 'Stok Habis'}
                  </span>
                  {portionText && (
                    <span className="text-xs text-stone-400 font-medium">
                      • {portionText}
                    </span>
                  )}
                </div>
              </div>

              {item.keterangan && item.keterangan !== 'BEST SELLER' && (
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 text-xs text-stone-600 leading-relaxed">
                  <p className="font-bold text-stone-800 text-[11px] mb-0.5">Catatan Menu:</p>
                  <p>{item.keterangan}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-stone-400">Harga</p>
                  <p className="text-lg font-black text-red-600 tracking-tight">
                    {formatRupiah(item.harga)}
                  </p>
                </div>

                <div>
                  {!isAvailable ? (
                    <span className="bg-stone-100 text-stone-400 text-xs font-bold px-4 py-2 rounded-xl">
                      Stok Habis
                    </span>
                  ) : quantity === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateQty(1);
                        setShowDetailModal(false);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah ke Keranjang</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(-1)}
                          className="w-7 h-7 rounded-lg bg-white text-stone-800 hover:bg-stone-50 shadow-xs flex items-center justify-center font-bold text-xs"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black text-xs px-2 text-stone-900">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(1)}
                          className="w-7 h-7 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-xs flex items-center justify-center font-bold text-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDetailModal(false)}
                        className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-3 py-2 rounded-xl"
                      >
                        Selesai
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
