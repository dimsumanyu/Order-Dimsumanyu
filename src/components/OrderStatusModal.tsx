import React from 'react';
import {
  Clock,
  Flame,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  X,
  MessageCircle,
  MapPin,
  CreditCard,
  Lock,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { OrderData, OrderStatus, AppSettings } from '../types';
import { formatRupiah, createWhatsAppUrl } from '../utils/whatsapp';

interface OrderStatusModalProps {
  order: OrderData | null;
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onOpenAdmin: () => void;
  isAdminLoggedIn: boolean;
  onUpdateStatus?: (id: string, newStatus: OrderStatus) => Promise<void>;
}

const STATUS_STEPS: {
  status: OrderStatus;
  title: string;
  desc: string;
  icon: typeof Clock;
  activeColor: string;
}[] = [
  {
    status: 'Menunggu payment',
    title: 'Menunggu Payment',
    desc: 'Pesanan diterima, menunggu verifikasi pembayaran / bukti transfer.',
    icon: Clock,
    activeColor: 'bg-amber-500 text-white border-amber-500',
  },
  {
    status: 'Pesanan sedang dimasak',
    title: 'Sedang Dimasak',
    desc: 'Dimsum Anyu sedang dikukus / digoreng hangat di dapur kami.',
    icon: Flame,
    activeColor: 'bg-orange-500 text-white border-orange-500',
  },
  {
    status: 'Pesanan siap',
    title: 'Pesanan Siap',
    desc: 'Pesanan sudah siap diambil di outlet atau siap diantar kurir.',
    icon: PackageCheck,
    activeColor: 'bg-blue-600 text-white border-blue-600',
  },
  {
    status: 'Pesanan selesai',
    title: 'Pesanan Selesai',
    desc: 'Pesanan telah diterima. Selamat menikmati #SensasiNgedaging!',
    icon: CheckCircle2,
    activeColor: 'bg-emerald-600 text-white border-emerald-600',
  },
];

export const OrderStatusModal: React.FC<OrderStatusModalProps> = ({
  order,
  isOpen,
  onClose,
  settings,
  onOpenAdmin,
  isAdminLoggedIn,
  onUpdateStatus,
}) => {
  if (!isOpen || !order) return null;

  const isCancelled = order.status === 'Dibatalkan';

  // Determine current active step index (0, 1, 2, 3)
  const getStepIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'Menunggu payment':
        return 0;
      case 'Pesanan sedang dimasak':
        return 1;
      case 'Pesanan siap':
        return 2;
      case 'Pesanan selesai':
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(order.status);

  const statusWaMsg = `Halo Admin DIMSUMANYU, saya mau cek pesanan #${order.id} atas nama ${order.nama}.`;
  const waHelpUrl = createWhatsAppUrl(settings.adminWaNumber, statusWaMsg);

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 relative my-6 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-xs bg-stone-100 px-2.5 py-0.5 rounded-lg border border-stone-200 text-stone-900">
                #{order.id}
              </span>
              <span className="text-[10px] font-bold text-stone-400">
                {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA
              </span>
            </div>
            <h3 className="font-extrabold text-stone-900 text-base mt-1">
              Status Pesanan Anda
            </h3>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="overflow-y-auto space-y-4 py-4 pr-1 text-xs">
          {isCancelled ? (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-extrabold">Pesanan Dibatalkan</p>
                <p className="text-[11px] text-red-600">
                  Pesanan ini telah dibatalkan oleh pihak toko. Hubungi admin via WhatsApp untuk informasi lebih lanjut.
                </p>
              </div>
            </div>
          ) : (
            /* Visual Progress Stepper */
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-4">
              <div className="relative">
                {/* Connecting Line */}
                <div className="absolute top-4 left-5 right-5 h-1 bg-stone-200 -z-0 hidden sm:block" />
                <div
                  className="absolute top-4 left-5 h-1 bg-emerald-500 transition-all duration-500 -z-0 hidden sm:block"
                  style={{
                    width: `${(currentStepIdx / (STATUS_STEPS.length - 1)) * 88}%`,
                  }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative z-10">
                  {STATUS_STEPS.map((step, idx) => {
                    const isPassed = idx <= currentStepIdx;
                    const isCurrent = idx === currentStepIdx;
                    const StepIcon = step.icon;

                    return (
                      <div
                        key={step.status}
                        className={`flex sm:flex-col items-center gap-2.5 sm:gap-1.5 text-left sm:text-center p-2 rounded-xl transition ${
                          isCurrent ? 'bg-white shadow-xs border border-stone-200' : ''
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition ${
                            isPassed
                              ? step.activeColor
                              : 'bg-stone-200 text-stone-500 border border-stone-300'
                          } ${isCurrent ? 'ring-4 ring-orange-100 scale-110' : ''}`}
                        >
                          <StepIcon className="w-4 h-4" />
                        </div>

                        <div>
                          <p
                            className={`text-xs font-bold leading-tight ${
                              isCurrent ? 'text-stone-900 font-extrabold' : isPassed ? 'text-stone-700' : 'text-stone-400'
                            }`}
                          >
                            {step.title}
                          </p>
                          {isCurrent && (
                            <span className="text-[9px] font-black uppercase text-amber-600 tracking-wider inline-block">
                              ● Sedang Berjalan
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Explanation Card */}
              <div className="p-3 bg-white rounded-xl border border-stone-200 text-xs">
                <p className="font-extrabold text-stone-900 flex items-center gap-1.5">
                  <span>Keterangan Status:</span>
                  <span className="text-red-700">{STATUS_STEPS[currentStepIdx]?.title}</span>
                </p>
                <p className="text-stone-600 text-[11px] mt-0.5 leading-relaxed">
                  {STATUS_STEPS[currentStepIdx]?.desc}
                </p>
              </div>
            </div>
          )}

          {/* Admin Control Bar (If logged in or link admin) */}
          {isAdminLoggedIn && onUpdateStatus && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-red-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Kontrol Admin (Ubah Status Langsung):</span>
                </span>
                <span className="text-[10px] text-red-700 font-semibold">Tersinkron Real-time</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                {STATUS_STEPS.map((s) => (
                  <button
                    key={s.status}
                    onClick={() => onUpdateStatus(order.id, s.status)}
                    className={`py-1.5 px-2 rounded-xl font-bold text-[10px] transition cursor-pointer border ${
                      order.status === s.status
                        ? 'bg-red-700 text-white border-red-800 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Order Details Brief */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-2 text-xs">
            <h4 className="font-bold text-stone-900 border-b border-stone-200 pb-1.5">
              Rincian Pesanan
            </h4>

            <div className="space-y-1 text-stone-600 text-[11px]">
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-bold text-stone-900">{order.nama} ({order.phone})</span>
              </div>
              <div className="flex justify-between">
                <span>Opsi Pengiriman:</span>
                <span className="font-bold text-stone-900">{order.opsiPengiriman}</span>
              </div>
              <div className="flex justify-between">
                <span>Lokasi / Keterangan:</span>
                <span className="font-bold text-stone-900 text-right max-w-[200px] truncate">{order.alamat}</span>
              </div>
              {order.mapsUrl && (
                <div className="flex justify-between items-center py-0.5">
                  <span>Titik Peta:</span>
                  <a
                    href={order.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-lg border border-red-200 transition"
                  >
                    <MapPin className="w-3 h-3 text-red-600" />
                    <span>Buka Google Maps ↗</span>
                  </a>
                </div>
              )}
              <div className="flex justify-between">
                <span>Metode Pembayaran:</span>
                <span className="font-bold text-stone-900">{order.metodeBayar}</span>
              </div>
              <div className="flex justify-between text-xs font-black text-stone-900 pt-1.5 border-t border-stone-200">
                <span>Total Tagihan:</span>
                <span className="text-red-600 text-sm">{formatRupiah(order.totalHarga)}</span>
              </div>
            </div>

            {/* Item list */}
            <div className="pt-1 text-[11px] text-stone-500 whitespace-pre-line border-t border-stone-200">
              {order.rincianMenu}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-100 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <a
            href={waHelpUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow-xs transition"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Chat Admin WhatsApp</span>
          </a>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!isAdminLoggedIn ? (
              <button
                onClick={onOpenAdmin}
                className="text-stone-400 hover:text-stone-700 text-[11px] flex items-center gap-1 cursor-pointer py-1 px-2"
              >
                <Lock className="w-3 h-3" />
                <span>Login Pengelola Toko</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdmin}
                className="bg-stone-900 hover:bg-stone-800 text-white font-bold py-2 px-3 rounded-xl transition text-xs flex items-center gap-1"
              >
                <span>Buka Panel Admin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2 px-4 rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
