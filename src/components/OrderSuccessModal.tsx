import React from 'react';
import { CheckCircle2, MessageCircle, ArrowRight, X, Clock } from 'lucide-react';
import { OrderData, AppSettings } from '../types';
import { formatRupiah, generateWhatsAppMessage, createWhatsAppUrl } from '../utils/whatsapp';

interface OrderSuccessModalProps {
  order: OrderData;
  settings: AppSettings;
  onClose: () => void;
  onNewOrder: () => void;
  onViewStatus: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  settings,
  onClose,
  onNewOrder,
  onViewStatus,
}) => {
  const waMessage = generateWhatsAppMessage(order);
  const waUrl = createWhatsAppUrl(settings.adminWaNumber, waMessage);

  const handleOpenWhatsApp = () => {
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 relative my-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1 rounded-full cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-stone-900">
            Pesanan Berhasil Dibuat!
          </h3>
          <p className="text-xs text-stone-500">
            Terima kasih telah memesan di <b>DIMSUMANYU</b>. ID Pesanan Anda:
          </p>
          <div className="inline-block bg-stone-100 text-stone-900 font-mono font-black text-xs px-3 py-1 rounded-lg border border-stone-200">
            #{order.id}
          </div>
        </div>

        {/* Order Details Brief */}
        <div className="mt-5 space-y-2 text-xs border border-stone-200 rounded-2xl p-4 bg-stone-50/50">
          <div className="flex justify-between text-stone-600">
            <span>Pelanggan:</span>
            <span className="font-bold text-stone-900">{order.nama} ({order.phone})</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Metode Bayar:</span>
            <span className="font-bold text-stone-900">{order.metodeBayar}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Pengiriman:</span>
            <span className="font-bold text-stone-900">{order.opsiPengiriman}</span>
          </div>
          <div className="flex justify-between text-stone-900 pt-2 border-t border-stone-200 font-black text-sm">
            <span>Total Tagihan:</span>
            <span className="text-red-600">{formatRupiah(order.totalHarga)}</span>
          </div>
        </div>

        {/* WhatsApp & Navigation Buttons */}
        <div className="mt-5 space-y-2.5">
          <button
            onClick={handleOpenWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Kirim Pesanan ke WhatsApp Admin</span>
          </button>

          <button
            onClick={onViewStatus}
            className="w-full bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 font-bold py-2.5 px-4 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-4 h-4 text-orange-600" />
            <span>Lacak Status Pesanan Ini</span>
          </button>

          <button
            onClick={onNewOrder}
            className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2.5 px-4 rounded-xl transition text-xs flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Pesan Menu Lain</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
