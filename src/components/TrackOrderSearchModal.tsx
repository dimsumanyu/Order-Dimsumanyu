import React, { useState } from 'react';
import { Search, X, Clock, ArrowRight, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { OrderData, AppSettings } from '../types';
import { formatRupiah, createWhatsAppUrl } from '../utils/whatsapp';

interface TrackOrderSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderData[];
  onSelectOrder: (order: OrderData) => void;
  settings: AppSettings;
}

export const TrackOrderSearchModal: React.FC<TrackOrderSearchModalProps> = ({
  isOpen,
  onClose,
  orders,
  onSelectOrder,
  settings,
}) => {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const cleanQuery = query.trim().toLowerCase();

  // Find matching orders from orders list
  const matchedOrders = orders.filter(o => {
    if (!cleanQuery) return false;
    const matchId = o.id.toLowerCase().includes(cleanQuery);
    const matchPhone = o.phone.replace(/[^0-9]/g, '').includes(cleanQuery.replace(/[^0-9]/g, ''));
    const matchNama = o.nama.toLowerCase().includes(cleanQuery);
    return matchId || matchPhone || matchNama;
  });

  // Recent orders (latest 3)
  const recentOrders = orders.slice(0, 3);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    if (matchedOrders.length === 1) {
      onSelectOrder(matchedOrders[0]);
    }
  };

  const waAskAdminUrl = createWhatsAppUrl(
    settings.adminWaNumber,
    `Halo Admin DIMSUMANYU, saya mau cek status pesanan saya: ${query ? `"${query}"` : ''}`
  );

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 relative my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1 rounded-full cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-stone-900 text-base">
              Lacak Status Pesanan
            </h3>
            <p className="text-[11px] text-stone-500">
              Cek perkembangan pembuatan &amp; pengiriman pesanan Anda
            </p>
          </div>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHasSearched(false);
              }}
              placeholder="Masukkan ID Pesanan atau No. WhatsApp..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 outline-none text-xs text-stone-900 font-medium"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!query.trim()}
            className="w-full bg-red-600 hover:bg-red-700 active:scale-98 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Cari Pesanan</span>
          </button>
        </form>

        {/* Search Results */}
        {cleanQuery && (
          <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Hasil Pencarian ({matchedOrders.length}):
            </p>

            {matchedOrders.length === 0 ? (
              <div className="bg-stone-50 rounded-2xl p-4 text-center border border-stone-200 space-y-2 text-xs">
                <AlertCircle className="w-6 h-6 text-stone-400 mx-auto" />
                <p className="text-stone-600 font-medium text-[11px]">
                  Pesanan tidak ditemukan di perangkat ini.
                </p>
                <p className="text-stone-400 text-[10px]">
                  Jika memesan dari perangkat lain, Anda dapat menanyakan langsung ke WhatsApp admin.
                </p>
                <a
                  href={waAskAdminUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-xl text-[11px] transition mt-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>Tanyakan ke WhatsApp Admin</span>
                </a>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {matchedOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className="p-3 bg-stone-50 hover:bg-orange-50 border border-stone-200 hover:border-orange-200 rounded-xl cursor-pointer transition flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[11px] text-stone-900">
                          #{order.id}
                        </span>
                        <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.2 rounded">
                          {order.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 font-medium mt-0.5">
                        {order.nama} • {formatRupiah(order.totalHarga)}
                      </p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-orange-600 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Orders on this device */}
        {!cleanQuery && recentOrders.length > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Pesanan Terakhir di Perangkat Ini:
            </p>

            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className="p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl cursor-pointer transition flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[11px] text-stone-900">
                        #{order.id}
                      </span>
                      <span className="text-[10px] font-bold text-stone-700 bg-stone-200 px-1.5 py-0.2 rounded">
                        {order.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 font-medium mt-0.5">
                      {order.nama} • {formatRupiah(order.totalHarga)}
                    </p>
                  </div>

                  <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                    <span>Lacak</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
          <span>DIMSUMANYU #SensasiNgedaging</span>
          <button
            onClick={onClose}
            className="text-stone-600 hover:text-stone-900 font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
