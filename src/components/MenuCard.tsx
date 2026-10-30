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
  const [imgError, setImgError] = useState<boolean>(false);
  const isAvailable = item.status === 'TERSEDIA';
  const visual = getCategoryVisual(item.kategori, item.nama);
  const portionText = extractPortionText(item.nama);
  const hasValidImage = Boolean(item.imageUrl && item.imageUrl.trim() !== '' && !imgError);

  return (
    <>
      {/* 📦 CARD BLOCK MODEL BLOK2 SESUAI CONTOH GAMBAR */}
      <div
        className={`group bg-white rounded-xl sm:rounded-2xl border transition-all duration-200 flex flex-col justify-between relative overflow-hidden shadow-xs hover:shadow-md ${
          item.isBestSeller
            ? 'border-amber-300/80 hover:border-amber-400'
            : 'border-stone-200 hover:border-stone-300'
        } ${!isAvailable ? 'opacity-65 bg-stone-50' : ''}`}
      >
        {/* 1. KOTAK ILUSTRASI / FOTO MENU (Top Block: Lebih proporsional di mobile) */}
        <div className="relative bg-[#f8f6f2] aspect-16/11 sm:aspect-4/3 w-full rounded-t-xl sm:rounded-t-2xl flex flex-col items-center justify-center select-none border-b border-stone-100 overflow-hidden">
          {/* Badge Best Seller (Kiri Atas) */}
          {item.isBestSeller && (
            <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 bg-amber-500 text-white text-[8px] sm:text-[9.5px] font-black px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full shadow-xs flex items-center gap-1 z-10">
              <Flame className="w-2.5 h-2.5 fill-white text-white shrink-0" />
              <span>BEST SELLER</span>
            </div>
          )}

          {/* Foto Asli Menu ATAU Dumpling Icon & Subtitle di Tengah Kotak */}
          {hasValidImage ? (
            <img
              src={item.imageUrl}
              alt={item.nama}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-2 sm:p-3 transition-transform group-hover:scale-105 duration-200">
              <span className="text-2xl sm:text-4xl filter drop-shadow-xs select-none">
                {visual.emoji}
              </span>
              <span className="text-[8.5px] sm:text-[10px] font-extrabold uppercase tracking-widest text-stone-400 mt-1 sm:mt-1.5 text-center leading-none">
                {visual.subtitle}
              </span>
            </div>
          )}

          {/* Tombol Detail (Kanan Bawah Kotak Gambar) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetailModal(true);
            }}
            className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 bg-stone-800/70 hover:bg-stone-900 text-white text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md flex items-center gap-0.5 sm:gap-1 backdrop-blur-xs transition cursor-pointer shadow-xs active:scale-95 z-10"
            title="Lihat Detail Menu"
          >
            <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-stone-200" />
            <span>Detail</span>
          </button>
        </div>

        {/* 2. BODY KARTU (Bawah Kotak: padding proporsional tanpa titik-titik) */}
        <div className="p-2 sm:p-3 flex flex-col justify-between flex-1 gap-1.5 sm:gap-2">
          <div className="space-y-1">
            {/* Baris Kategori & Status Tersedia (Tampil penuh tanpa titik-titik) */}
            <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px]">
              <span className="font-extrabold text-stone-500 uppercase tracking-wider">
                {item.kategori}
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
            <h3 className="font-black text-stone-900 text-[11px] sm:text-[12.5px] leading-snug uppercase tracking-tight group-hover:text-red-700 transition line-clamp-2">
              {item.nama}
            </h3>
          </div>

          {/* 3. FOOTER: HARGA (TAMPIL PENUH SEBARIS TANPA TITIK-TITIK) & TOMBOL TAMBAH */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1 mt-auto">
            <div className="shrink-0">
              <span className="text-[7.5px] sm:text-[8px] font-extrabold uppercase tracking-wider text-stone-400 block leading-none">
                HARGA
              </span>
              <span className="text-red-600 font-black text-xs sm:text-sm tracking-tight whitespace-nowrap block mt-0.5">
                {formatRupiah(item.harga)}
              </span>
            </div>

            <div className="shrink-0">
              {!isAvailable ? (
                <span className="inline-block bg-stone-100 text-stone-400 text-[10px] sm:text-[10.5px] font-bold px-2 py-1 rounded-lg border border-stone-200 whitespace-nowrap">
                  Habis
                </span>
              ) : quantity === 0 ? (
                <button
                  type="button"
                  onClick={() => onUpdateQty(1)}
                  className="bg-red-700 hover:bg-red-800 active:scale-95 text-white font-black text-[11px] sm:text-xs px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl transition flex items-center gap-1 shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Tambah</span>
                </button>
              ) : (
                <div className="flex items-center gap-0.5 bg-stone-100 border border-stone-200 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(-1)}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-white text-stone-800 hover:bg-stone-50 shadow-xs flex items-center justify-center font-bold text-xs transition active:scale-90 cursor-pointer"
                    title="Kurang 1"
                  >
                    <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                  <span className="font-black text-[11px] sm:text-xs px-1 text-stone-900 min-w-[14px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(1)}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-red-600 text-white hover:bg-red-700 shadow-xs flex items-center justify-center font-bold text-xs transition active:scale-90 cursor-pointer"
                    title="Tambah 1"
                  >
                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
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
            <div className="relative bg-[#f8f6f2] aspect-16/9 w-full flex flex-col items-center justify-center text-center border-b border-stone-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center shadow-xs transition cursor-pointer z-20"
              >
                <X className="w-4 h-4" />
              </button>

              {item.isBestSeller && (
                <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1 z-20">
                  <Flame className="w-3 h-3 fill-white text-white" />
                  <span>BEST SELLER</span>
                </span>
              )}

              {hasValidImage ? (
                <img
                  src={item.imageUrl}
                  alt={item.nama}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6">
                  <span className="text-5xl my-2 filter drop-shadow-sm select-none">
                    {visual.emoji}
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-stone-400">
                    {item.kategori}
                  </span>
                </div>
              )}
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
