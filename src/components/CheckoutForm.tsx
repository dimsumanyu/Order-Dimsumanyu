import React, { useState } from 'react';
import {
  ArrowLeft,
  Receipt,
  User,
  Phone,
  Truck,
  MapPin,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Download,
  Send,
  Loader2
} from 'lucide-react';
import { MenuItem, ShippingOption, PaymentMethod, OrderData, AppSettings } from '../types';
import { formatRupiah } from '../utils/whatsapp';

interface CheckoutFormProps {
  cart: Record<string, number>;
  menuItems: MenuItem[];
  settings: AppSettings;
  onBackToMenu: () => void;
  onSubmitOrder: (orderPayload: {
    nama: string;
    phone: string;
    opsiPengiriman: ShippingOption;
    alamat: string;
    metodeBayar: PaymentMethod;
    catatan: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({
  cart,
  menuItems,
  settings,
  onBackToMenu,
  onSubmitOrder,
  isSubmitting,
}) => {
  const [nama, setNama] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingOption, setShippingOption] = useState<ShippingOption>('Diantar ke Alamat');
  const [alamat, setAlamat] = useState('');
  const [metodeBayar, setMetodeBayar] = useState<PaymentMethod>('QRIS');
  const [catatan, setCatatan] = useState('');
  const [copiedBank, setCopiedBank] = useState(false);

  const cartEntries = Object.entries(cart).filter(([_, qty]) => qty > 0);
  const totalAmount = cartEntries.reduce((sum, [id, qty]) => {
    const item = menuItems.find(m => m.id === id);
    return sum + (item ? item.harga * qty : 0);
  }, 0);
  const totalItems = cartEntries.reduce((sum, [_, qty]) => sum + qty, 0);

  const handleCopyBank = () => {
    navigator.clipboard.writeText(settings.bankAccount);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  const handleDownloadQris = async () => {
    try {
      const response = await fetch(settings.qrisImageUrl, { mode: 'cors' });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'QRIS_DIMSUMANYU.jpg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open(settings.qrisImageUrl, '_blank');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !phone.trim() || !alamat.trim()) {
      return;
    }
    await onSubmitOrder({
      nama: nama.trim(),
      phone: phone.trim(),
      opsiPengiriman: shippingOption,
      alamat: alamat.trim(),
      metodeBayar,
      catatan: catatan.trim(),
    });
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={onBackToMenu}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-red-700 bg-white border border-stone-200 px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Kembali Pilih Menu</span>
      </button>

      {/* Order Summary Box */}
      <section className="bg-red-50/60 rounded-2xl border border-red-200 p-4 space-y-3">
        <div className="flex justify-between items-center border-b border-red-200/80 pb-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-red-600" />
            <h3 className="font-extrabold text-stone-900 text-xs sm:text-sm">
              Ringkasan Pesanan Anda
            </h3>
          </div>
          <span className="text-[10px] font-extrabold bg-red-600 text-white px-2 py-0.5 rounded-full">
            {totalItems} Porsi
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-stone-700 divide-y divide-red-100">
          {cartEntries.map(([id, qty]) => {
            const item = menuItems.find(m => m.id === id);
            if (!item) return null;
            return (
              <div key={id} className="pt-1.5 first:pt-0 flex justify-between items-center">
                <span>
                  • {item.nama} <b className="text-red-700 font-extrabold">({qty}x)</b>
                </span>
                <span className="font-bold text-stone-900">
                  {formatRupiah(item.harga * qty)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-red-200 pt-2.5 flex justify-between items-center font-black text-stone-900 text-sm">
          <span>Total Pembayaran:</span>
          <span className="text-red-600 text-base">{formatRupiah(totalAmount)}</span>
        </div>
      </section>

      {/* Customer Form */}
      <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 border-b border-stone-100 pb-3 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <User className="w-4 h-4 text-red-600" />
            <span>Data Pemesan & Pengiriman</span>
          </span>
          <span className="text-[10px] text-stone-400 font-medium">Tanda (*) wajib diisi</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
              Nama Lengkap *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Masukkan nama lengkap Anda"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-100 outline-none text-xs text-stone-900 transition"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
              No. WhatsApp Aktif *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 08123456789 atau 628123456789"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-100 outline-none text-xs text-stone-900 transition font-mono"
              />
            </div>
          </div>

          {/* Shipping Option */}
          <div>
            <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
              Opsi Pengiriman *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShippingOption('Diantar ke Alamat');
                  if (alamat.includes('Ambil di Outlet')) setAlamat('');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  shippingOption === 'Diantar ke Alamat'
                    ? 'bg-red-600 text-white border-red-700 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>🚗 Diantar ke Alamat</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShippingOption('Ambil di Outlet');
                  if (!alamat || alamat === '') setAlamat('Ambil langsung di Outlet DIMSUMANYU');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  shippingOption === 'Ambil di Outlet'
                    ? 'bg-red-600 text-white border-red-700 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>🛍️ Ambil di Outlet</span>
              </button>
            </div>
          </div>

          {/* Address / Pickup Notes */}
          <div>
            <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
              {shippingOption === 'Ambil di Outlet' ? 'Keterangan / Jam Pengambilan *' : 'Alamat Pengiriman Lengkap *'}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <textarea
                rows={2}
                required
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder={
                  shippingOption === 'Ambil di Outlet'
                    ? 'Contoh: Diambil sekitar jam 16:30 sore'
                    : 'Contoh: Jl. Ahmad Yani No. 12, RT 03/RW 02 (Pagar hitam samping minimarket)'
                }
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-100 outline-none text-xs text-stone-900 transition resize-none"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
              Metode Pembayaran *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMetodeBayar('QRIS')}
                className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  metodeBayar === 'QRIS'
                    ? 'bg-red-50 text-red-700 border-red-400 ring-2 ring-red-100 font-extrabold'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <QrCode className="w-4 h-4 text-red-600" />
                <span>QRIS (All Bank)</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodeBayar('Transfer Bank')}
                className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  metodeBayar === 'Transfer Bank'
                    ? 'bg-red-50 text-red-700 border-red-400 ring-2 ring-red-100 font-extrabold'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-red-600" />
                <span>Transfer Bank</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodeBayar('Tunai (COD / Ambil di Tempat)')}
                className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  metodeBayar === 'Tunai (COD / Ambil di Tempat)'
                    ? 'bg-red-50 text-red-700 border-red-400 ring-2 ring-red-100 font-extrabold'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>💵</span>
                <span>Tunai / COD</span>
              </button>
            </div>
          </div>

          {/* Payment Specific Box */}
          {metodeBayar === 'QRIS' && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
              <div className="text-center">
                <span className="bg-red-100 text-red-700 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider inline-block mb-1 border border-red-200">
                  Scan QRIS DIMSUMANYU
                </span>
                <p className="text-xs text-stone-600">
                  Total Tagihan: <b className="text-red-600 text-sm font-black">{formatRupiah(totalAmount)}</b>
                </p>
                <p className="text-[11px] text-stone-500 mt-1 max-w-sm mx-auto">
                  Dapat di-scan menggunakan seluruh m-banking (BCA, BRI, Mandiri, BNI, BSI) & e-wallet (GoPay, OVO, ShopeePay, Dana).
                </p>
              </div>

              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-2 bg-white rounded-xl border border-stone-200 shadow-sm">
                  <img
                    src={settings.qrisImageUrl}
                    alt="QRIS DIMSUMANYU"
                    className="w-44 h-44 object-contain rounded-lg"
                    crossOrigin="anonymous"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDownloadQris}
                  className="bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Simpan Gambar QRIS ke Galeri</span>
                </button>
              </div>
            </div>
          )}

          {metodeBayar === 'Transfer Bank' && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <p className="font-extrabold text-stone-900 text-sm">{settings.bankName}</p>
                  <p className="text-xs text-stone-600">
                    Atas Nama: <b className="text-stone-900">{settings.bankHolder}</b>
                  </p>
                  <p className="text-sm font-mono font-black text-red-600 tracking-wider mt-1">
                    {settings.bankAccount}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyBank}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  {copiedBank ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBank ? 'Tersalin!' : 'Salin Rekening'}</span>
                </button>
              </div>

              {copiedBank && (
                <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Nomor rekening berhasil disalin ke papan klip!
                </p>
              )}
            </div>
          )}

          {metodeBayar === 'Tunai (COD / Ambil di Tempat)' && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-xs text-stone-700">
              <p className="font-bold text-stone-900">💵 Pembayaran Tunai</p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Silakan siapkan uang pas sebesar <b className="text-red-700">{formatRupiah(totalAmount)}</b> saat pesanan diantar kurir atau diambil di outlet.
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
              Catatan Pesanan (Opsional)
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Saus mentai dipisah, sambal diperbanyak"
              className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-100 outline-none text-xs text-stone-900 transition"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black py-3.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses Pesanan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Buat Pesanan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
