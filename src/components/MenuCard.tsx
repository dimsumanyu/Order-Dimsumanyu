import React from 'react';
import { Plus, Minus, Flame } from 'lucide-react';
import { MenuItem } from '../types';
import { formatRupiah } from '../utils/whatsapp';

interface MenuCardProps {
  item: MenuItem;
  quantity: number;
  onUpdateQty: (delta: number) => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, quantity, onUpdateQty }) => {
  const isAvailable = item.status === 'TERSEDIA';

  // Check if there is description in parentheses
  const parenMatch = item.nama.match(/\((.*?)\)/);
  const titleWithoutParen = parenMatch ? item.nama.replace(/\(.*?\)/, '').trim() : item.nama;
  const subText = parenMatch ? `(${parenMatch[1]})` : item.keterangan !== 'BEST SELLER' ? item.keterangan : '';

  return (
    <div
      className={`group bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between relative overflow-hidden p-3.5 ${
        item.isBestSeller
          ? 'border-amber-300 shadow-xs hover:border-amber-400 hover:shadow-md'
          : 'border-stone-200 shadow-xs hover:border-stone-300 hover:shadow-sm'
      } ${!isAvailable ? 'opacity-60 bg-stone-50' : ''}`}
    >
      {/* Best Seller Ribbon */}
      {item.isBestSeller && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg shadow-xs flex items-center gap-1 z-10">
          <Flame className="w-2.5 h-2.5 fill-white" />
          <span>BEST SELLER</span>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded uppercase tracking-wider border border-red-100">
            {item.kategori}
          </span>
          <span
            className={`text-[9px] font-bold ${
              isAvailable ? 'text-emerald-700' : 'text-stone-400'
            } ${item.isBestSeller ? 'mr-16' : ''}`}
          >
            {isAvailable ? '● Tersedia' : '✕ Habis'}
          </span>
        </div>

        <div>
          <h3 className="font-extrabold text-stone-900 text-xs sm:text-sm leading-snug group-hover:text-red-700 transition">
            {titleWithoutParen}
          </h3>
          {subText && (
            <p className="text-[10px] text-stone-500 mt-0.5 leading-tight italic">
              {subText}
            </p>
          )}
        </div>

        <div className="pt-1">
          <span className="text-red-600 font-black text-sm tracking-tight">
            {formatRupiah(item.harga)}
          </span>
        </div>
      </div>

      {/* Action / Counter */}
      <div className="pt-3 mt-2 border-t border-stone-100 flex items-center justify-between">
        {!isAvailable ? (
          <span className="text-[11px] font-bold text-stone-400 italic py-1 block w-full text-center">
            Stok Habis
          </span>
        ) : quantity === 0 ? (
          <button
            onClick={() => onUpdateQty(1)}
            className="w-full bg-red-600 hover:bg-red-700 active:scale-98 text-white py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah</span>
          </button>
        ) : (
          <div className="flex items-center justify-between w-full bg-stone-100 rounded-xl p-1 border border-stone-200">
            <button
              onClick={() => onUpdateQty(-1)}
              className="w-7 h-7 rounded-lg bg-white hover:bg-stone-50 text-stone-800 shadow-xs flex items-center justify-center font-bold text-xs transition active:scale-90 cursor-pointer"
              title="Kurang 1"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-black text-xs px-2 text-stone-900">
              {quantity}
            </span>
            <button
              onClick={() => onUpdateQty(1)}
              className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-xs flex items-center justify-center font-bold text-xs transition active:scale-90 cursor-pointer"
              title="Tambah 1"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
