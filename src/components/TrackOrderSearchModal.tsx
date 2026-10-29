import React, { useState } from 'react';
import {
  Search,
  X,
  Clock,
  ArrowRight,
  MessageCircle,
  AlertCircle,
  ShoppingBag,
  ShieldCheck,
  Trash2,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { OrderData, AppSettings } from '../types';
import { formatRupiah, createWhatsAppUrl } from '../utils/whatsapp';

interface TrackOrderSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderData[];
  myOrderIds: string[];
  onAddMyOrderId?: (orderId: string) => void;
  onClearMyOrders?: () => void;
  onSelectOrder: (order: OrderData) => void;
  settings: AppSettings;
}

export const TrackOrderSearchModal: React.FC<TrackOrderSearchModalProps> = ({
  isOpen,
  onClose,
  orders,
  myOrderIds,
  onAddMyOrderId,
  onClearMyOrders,
  onSelectOrder,
  settings,
}) => {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const cleanQuery = query.trim().toLowerCase();
  const cleanDigits = query.replace(/[^0-9]/g, '');

  // Filter orders that belong ONLY to this customer/device
  const myOrders = orders
    .filter((o) => myOrderIds.includes(o.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Privacy-safe search: Require at least 4 chars for Order ID or 5 digits for phone number
  // Never expose stranger orders via single-character or generic name guessing
  const isQueryLongEnough = cleanQuery.length >= 3 || cleanDigits.length >= 5;

  const matchedOrders = isQueryLongEnough
    ? orders.filter((o) => {
        const matchId = cleanQuery.length >= 3 && o.id.toLowerCase().includes(cleanQuery);
        const matchPhone = cleanDigits.length >= 5 && o.phone.replace(/[^0-9]/g, '').includes(cleanDigits);
        return matchId || matchPhone;
      })
    : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    if (matchedOrders.length === 1) {
      if (onAddMyOrderId) onAddMyOrderId(matchedOrders[0].id);
      onSelectOrder(matchedOrders[0]);
    }
  };

  const handleOrderClick = (order: OrderData) => {
    if (onAddMyOrderId) {
      onAddMyOrderId(order.id);
    }
    onSelectOrder(order);
  };

  const waAskAdminUrl = createWhatsAppUrl(
    settings.adminWaNumber,
    `Halo Admin DIMSUMANYU, saya mau cek status pesanan saya: ${query ? `"${query}"` : ''}`
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pesanan selesai':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Pesanan siap':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pesanan sedang dimasak':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Dibatalkan':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 relative my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3 mb-4 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-stone-900 text-base">
                Lacak Status Pesanan
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                <span>Pesanan Anda</span>
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Hanya menampilkan riwayat pesanan Anda di perangkat ini untuk menjaga privasi
            </p>
          </div>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearch} className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHasSearched(false);
              }}
              placeholder="Cari ID Pesanan (DAN-...) atau No. WhatsApp..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white outline-none text-xs text-stone-900 font-medium transition"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-400 px-1">
            <span>Contoh: <strong className="text-stone-600 font-mono">DAN-20261029-...</strong> atau <strong className="text-stone-600 font-mono">0812...</strong></span>
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setHasSearched(false);
                }}
                className="text-stone-500 hover:text-stone-800 font-bold cursor-pointer underline text-[10px]"
              >
                Reset Cari
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!query.trim()}
            className="w-full bg-red-600 hover:bg-red-700 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Cari Pesanan Saya</span>
          </button>
        </form>

        {/* Search Results Mode */}
        {cleanQuery ? (
          <div className="mt-4 pt-4 border-t border-stone-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                Hasil Pencarian ({matchedOrders.length}):
              </p>
            </div>

            {!isQueryLongEnough ? (
              <div className="bg-stone-50 rounded-2xl p-4 text-center border border-stone-200 text-xs text-stone-500">
                Ketik minimal 3 karakter ID Pesanan atau 5 digit No. WhatsApp untuk mencari.
              </div>
            ) : matchedOrders.length === 0 ? (
              <div className="bg-stone-50 rounded-2xl p-5 text-center border border-stone-200 space-y-2 text-xs">
                <AlertCircle className="w-7 h-7 text-amber-500 mx-auto" />
                <p className="text-stone-800 font-bold text-xs">
                  Pesanan tidak ditemukan
                </p>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  Pastikan ID Pesanan (contoh: <code>DAN-...</code>) atau nomor WhatsApp sesuai dengan data yang didaftarkan saat pemesanan.
                </p>
                <a
                  href={waAskAdminUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl text-[11px] transition mt-2 shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Tanyakan Status ke WhatsApp Admin</span>
                </a>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {matchedOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => handleOrderClick(order)}
                    className="p-3 bg-white hover:bg-orange-50/60 border border-stone-200 hover:border-orange-300 rounded-2xl cursor-pointer transition flex flex-col gap-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-xs text-stone-900">
                        #{order.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-600">
                      <span>{order.nama} • {formatRupiah(order.totalHarga)}</span>
                      <span className="text-red-600 font-bold flex items-center gap-1">
                        <span>Lacak</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Default Mode: Pesanan Saya di Perangkat Ini */
          <div className="mt-4 pt-4 border-t border-stone-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>Pesanan Saya di Perangkat Ini</span>
                <span className="text-stone-400 font-medium">({myOrders.length})</span>
              </p>

              {myOrders.length > 0 && onClearMyOrders && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Hapus riwayat pesanan lokal dari perangkat ini? (Data di database admin tetap aman)')) {
                      onClearMyOrders();
                    }
                  }}
                  className="text-[10px] text-stone-400 hover:text-red-600 flex items-center gap-1 transition cursor-pointer"
                  title="Hapus riwayat dari perangkat ini"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Bersihkan</span>
                </button>
              )}
            </div>

            {myOrders.length === 0 ? (
              <div className="bg-stone-50 rounded-2xl p-6 text-center border border-stone-200/80 space-y-2">
                <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-stone-800 font-bold text-xs">
                  Belum Ada Pesanan di Perangkat Ini
                </p>
                <p className="text-stone-500 text-[11px] leading-relaxed max-w-xs mx-auto">
                  Setiap pesanan yang Anda buat di website ini akan otomatis tersimpan di sini. Jika Anda memesan dari perangkat lain, Anda dapat mencarinya dengan ID Pesanan atau No. WhatsApp di atas.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {myOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => handleOrderClick(order)}
                    className="p-3 bg-stone-50 hover:bg-orange-50/50 border border-stone-200 hover:border-orange-300 rounded-2xl cursor-pointer transition flex flex-col gap-1.5 shadow-2xs group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-stone-900 group-hover:text-red-700 transition">
                          #{order.id}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span>{formatDate(order.createdAt)}</span>
                      </span>
                      <span className="font-bold text-stone-800">
                        {formatRupiah(order.totalHarga)}
                      </span>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="text-[10px] text-stone-500 truncate border-t border-stone-200/60 pt-1 mt-0.5">
                        {order.items.map(it => `${it.qty}x ${it.nama}`).join(', ')}
                      </div>
                    )}

                    <div className="flex items-center justify-end text-red-600 font-bold text-xs pt-0.5">
                      <span className="flex items-center gap-1 group-hover:underline">
                        <span>Lacak Progres</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
