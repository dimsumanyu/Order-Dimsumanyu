import React from 'react';
import { ShoppingBag, Trash2, ArrowRight, Plus, Minus } from 'lucide-react';
import { MenuItem } from '../types';
import { formatRupiah } from '../utils/whatsapp';

interface CartSummaryProps {
  cart: Record<string, number>;
  menuItems: MenuItem[];
  onUpdateQty: (id: string, delta: number) => void;
  onClearCart: () => void;
  onProceed: () => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  cart,
  menuItems,
  onUpdateQty,
  onClearCart,
  onProceed,
}) => {
  const cartEntries = Object.entries(cart).filter(([_, qty]) => qty > 0);

  const totalAmount = cartEntries.reduce((sum, [id, qty]) => {
    const item = menuItems.find(m => m.id === id);
    return sum + (item ? item.harga * qty : 0);
  }, 0);

  const totalItems = cartEntries.reduce((sum, [_, qty]) => sum + qty, 0);

  if (cartEntries.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-2">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-stone-800 text-sm">Keranjang Anda Masih Kosong</h4>
        <p className="text-xs text-stone-500 mt-1">
          Silakan pilih menu dimsum favorit di atas untuk memulai pemesanan.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-red-600" />
          <h3 className="font-extrabold text-stone-900 text-xs sm:text-sm">
            Ringkasan Keranjang Belanja
          </h3>
          <span className="bg-red-50 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-200">
            {totalItems} Porsi
          </span>
        </div>

        <button
          onClick={onClearCart}
          className="text-stone-400 hover:text-red-600 text-xs flex items-center gap-1 transition cursor-pointer"
          title="Kosongkan keranjang"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Kosongkan</span>
        </button>
      </div>

      {/* Cart Items List */}
      <div className="space-y-2.5 divide-y divide-stone-100 max-h-64 overflow-y-auto pr-1">
        {cartEntries.map(([id, qty]) => {
          const item = menuItems.find(m => m.id === id);
          if (!item) return null;
          const subtotal = item.harga * qty;

          return (
            <div key={id} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-900 truncate">
                  {item.nama}
                </p>
                <p className="text-[11px] text-stone-500">
                  {formatRupiah(item.harga)} × {qty}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-red-600 text-xs whitespace-nowrap">
                  {formatRupiah(subtotal)}
                </span>

                <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                  <button
                    onClick={() => onUpdateQty(id, -1)}
                    className="w-5 h-5 rounded bg-white text-stone-700 flex items-center justify-center font-bold text-xs hover:bg-stone-50 active:scale-90 transition cursor-pointer"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="text-xs font-bold px-1.5 text-stone-900 min-w-4 text-center">
                    {qty}
                  </span>
                  <button
                    onClick={() => onUpdateQty(id, 1)}
                    className="w-5 h-5 rounded bg-red-600 text-white flex items-center justify-center font-bold text-xs hover:bg-red-700 active:scale-90 transition cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total & Action */}
      <div className="border-t border-stone-200 pt-3 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-stone-700">Total Pembayaran:</span>
          <span className="font-black text-red-600 text-base">
            {formatRupiah(totalAmount)}
          </span>
        </div>

        <button
          onClick={onProceed}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-red-700/20 active:scale-98 transition cursor-pointer"
        >
          <span>Lanjut ke Data Pemesan & Pembayaran</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
