import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Save,
  ShoppingBag,
  User,
  MapPin,
  FileText,
  DollarSign,
  AlertCircle,
  Truck,
  Store
} from 'lucide-react';
import { OrderData, MenuItem, OrderStatus, ShippingOption, PaymentMethod } from '../types';
import { formatRupiah } from '../utils/whatsapp';

interface EditOrderModalProps {
  order: OrderData | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveOrder: (updatedOrder: OrderData) => Promise<void>;
  menuItems: MenuItem[];
}

interface EditableOrderItem {
  id: string;
  nama: string;
  harga: number;
  qty: number;
  subtotal: number;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onSaveOrder,
  menuItems = [],
}) => {
  const [items, setItems] = useState<EditableOrderItem[]>([]);
  const [nama, setNama] = useState('');
  const [phone, setPhone] = useState('');
  const [opsiPengiriman, setOpsiPengiriman] = useState<ShippingOption>('Diantar ke Alamat');
  const [alamat, setAlamat] = useState('');
  const [ongkir, setOngkir] = useState<number>(0);
  const [metodeBayar, setMetodeBayar] = useState<PaymentMethod>('QRIS');
  const [catatan, setCatatan] = useState('');
  const [status, setStatus] = useState<OrderStatus>('Menunggu payment');
  
  // Selector for adding menu items
  const [selectedMenuId, setSelectedMenuId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form when order changes or modal opens
  useEffect(() => {
    if (order && isOpen) {
      setNama(order.nama || '');
      setPhone(order.phone || '');
      setOpsiPengiriman(order.opsiPengiriman || 'Diantar ke Alamat');
      setAlamat(order.alamat || '');
      setOngkir(Number(order.ongkir) || 0);
      setMetodeBayar(order.metodeBayar || 'QRIS');
      setCatatan(order.catatan || '');
      setStatus(order.status || 'Menunggu payment');
      setErrorMessage(null);

      // Initialize items from order.items or resolve from rincianMenu
      if (order.items && order.items.length > 0) {
        setItems(
          order.items.map((it, idx) => ({
            id: it.id || `item-${idx}`,
            nama: it.nama,
            harga: Number(it.harga) || 0,
            qty: Number(it.qty) || 1,
            subtotal: (Number(it.harga) || 0) * (Number(it.qty) || 1),
          }))
        );
      } else {
        // Fallback parse lines
        const lines = (order.rincianMenu || '').split('\n').filter(Boolean);
        const parsed: EditableOrderItem[] = [];
        lines.forEach((line, lIdx) => {
          let qty = 1;
          let itemNama = line.trim();
          const qMatch = itemNama.match(/^(\d+)\s*x\s+(.+)$/i);
          if (qMatch) {
            qty = parseInt(qMatch[1], 10) || 1;
            itemNama = qMatch[2].trim();
          }
          let harga = 0;
          const pMatch = itemNama.match(/\(?Rp\.?\s*([0-9.,]+)\)?/i);
          if (pMatch) {
            harga = parseInt(pMatch[1].replace(/[^0-9]/g, ''), 10) || 0;
            itemNama = itemNama.replace(/\(?Rp\.?\s*[0-9.,]+\)?/gi, '').trim();
          }
          parsed.push({
            id: `item-${lIdx}`,
            nama: itemNama,
            harga,
            qty,
            subtotal: harga * qty,
          });
        });
        setItems(parsed);
      }
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  // Calculated values
  const itemsSubtotal = items.reduce((sum, it) => sum + (it.harga * it.qty), 0);
  const effectiveOngkir = opsiPengiriman === 'Ambil di Outlet' ? 0 : Math.max(0, ongkir);
  const totalHarga = itemsSubtotal + effectiveOngkir;

  // Handlers for modifying items
  const handleUpdateQty = (index: number, delta: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = copy[index];
      const newQty = Math.max(1, target.qty + delta);
      copy[index] = {
        ...target,
        qty: newQty,
        subtotal: target.harga * newQty,
      };
      return copy;
    });
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = copy[index];
      const price = Math.max(0, newPrice);
      copy[index] = {
        ...target,
        harga: price,
        subtotal: price * target.qty,
      };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddMenuItem = () => {
    if (!selectedMenuId) return;
    const menuItem = menuItems.find((m) => m.id === selectedMenuId);
    if (!menuItem) return;

    setItems((prev) => {
      // If item already in list, increment qty
      const existingIdx = prev.findIndex(
        (it) => it.nama.trim().toLowerCase() === menuItem.nama.trim().toLowerCase()
      );
      if (existingIdx !== -1) {
        const copy = [...prev];
        const existing = copy[existingIdx];
        const newQty = existing.qty + 1;
        copy[existingIdx] = {
          ...existing,
          qty: newQty,
          subtotal: existing.harga * newQty,
        };
        return copy;
      }

      // Otherwise, add new row
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          nama: menuItem.nama.replace(/\r?\n/g, ' '),
          harga: menuItem.harga,
          qty: 1,
          subtotal: menuItem.harga,
        },
      ];
    });

    setSelectedMenuId('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMessage('Pesanan harus memiliki minimal 1 menu item.');
      return;
    }
    if (!nama.trim()) {
      setErrorMessage('Nama pemesan tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Re-generate formatted clean rincianMenu string
      const rincianMenu = items
        .map((it) => `${it.qty}x ${it.nama.replace(/\r?\n/g, ' ')} (${formatRupiah(it.subtotal)})`)
        .join('\n');

      const updatedOrder: OrderData = {
        ...order,
        nama: nama.trim(),
        phone: phone.trim(),
        opsiPengiriman,
        alamat: opsiPengiriman === 'Ambil di Outlet' ? 'Ambil di Outlet DIMSUMANYU' : alamat.trim(),
        ongkir: effectiveOngkir,
        metodeBayar,
        catatan: catatan.trim(),
        status,
        items: items.map((it) => ({
          id: it.id,
          nama: it.nama,
          harga: it.harga,
          qty: it.qty,
          subtotal: it.subtotal,
        })),
        rincianMenu,
        totalHarga,
      };

      await onSaveOrder(updatedOrder);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan perubahan pesanan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-auto animate-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900 leading-tight">
                  Edit Pesanan Pelanggan
                </h3>
                <span className="font-mono text-xs font-black bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md border border-stone-200">
                  #{order.id}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Ubah daftar menu, jumlah, informasi pengiriman, atau ongkir pesanan ini.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 flex items-center gap-2 font-bold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* SECTION 1: ITEMS ORDERED */}
          <div className="bg-stone-50 rounded-2xl p-3.5 sm:p-4 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-red-600" />
                <span>Daftar Menu Pesanan ({items.length} Item)</span>
              </h4>
              <span className="text-xs font-bold text-stone-500">
                Subtotal: <b className="text-stone-900">{formatRupiah(itemsSubtotal)}</b>
              </span>
            </div>

            {/* Item Rows */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="text-center py-4 text-xs text-stone-400 bg-white rounded-xl border border-dashed border-stone-300">
                  Belum ada menu di pesanan ini. Silakan tambahkan menu di bawah.
                </div>
              ) : (
                items.map((it, idx) => (
                  <div
                    key={it.id || idx}
                    className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-stone-900 truncate">
                        {it.nama}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-stone-500">Harga Satuan:</span>
                        <input
                          type="number"
                          value={it.harga}
                          onChange={(e) => handleUpdateItemPrice(idx, parseInt(e.target.value, 10) || 0)}
                          className="w-20 px-1.5 py-0.5 text-xs font-bold bg-stone-50 border border-stone-300 rounded text-stone-800 focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Qty Counter */}
                      <div className="flex items-center border border-stone-300 rounded-lg bg-stone-50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, -1)}
                          className="px-2 py-1 hover:bg-stone-200 text-stone-600 font-bold transition cursor-pointer"
                          title="Kurangi jumlah"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-black text-stone-900 min-w-[24px] text-center">
                          {it.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, 1)}
                          className="px-2 py-1 hover:bg-stone-200 text-stone-600 font-bold transition cursor-pointer"
                          title="Tambah jumlah"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <span className="text-xs font-black text-stone-900 min-w-[70px] text-right">
                        {formatRupiah(it.subtotal)}
                      </span>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Hapus menu ini dari pesanan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Menu Row */}
            <div className="pt-2 border-t border-stone-200 flex flex-wrap sm:flex-nowrap items-center gap-2">
              <select
                value={selectedMenuId}
                onChange={(e) => setSelectedMenuId(e.target.value)}
                className="flex-1 bg-white border border-stone-300 text-xs rounded-xl px-3 py-2 text-stone-800 outline-none focus:border-red-500 font-medium"
              >
                <option value="">-- Pilih menu untuk ditambahkan ke pesanan --</option>
                {menuItems.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nama} — {formatRupiah(m.harga)} ({m.status})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAddMenuItem}
                disabled={!selectedMenuId}
                className="shrink-0 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Menu</span>
              </button>
            </div>
          </div>

          {/* SECTION 2: CUSTOMER & DELIVERY INFO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nama */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-stone-400" />
                <span>Nama Pelanggan</span>
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama pemesan"
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-medium outline-none focus:bg-white focus:border-red-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                No. WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08123456789"
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-medium outline-none focus:bg-white focus:border-red-500"
              />
            </div>

            {/* Opsi Pengiriman */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Truck className="w-3 h-3 text-stone-400" />
                <span>Opsi Pengiriman</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setOpsiPengiriman('Diantar ke Alamat')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    opsiPengiriman === 'Diantar ke Alamat'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Diantar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpsiPengiriman('Ambil di Outlet');
                    setOngkir(0);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    opsiPengiriman === 'Ambil di Outlet'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Ambil Sendiri</span>
                </button>
              </div>
            </div>

            {/* Ongkir */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center justify-between">
                <span>Biaya Ongkir (Rp)</span>
                {opsiPengiriman === 'Ambil di Outlet' && (
                  <span className="text-[10px] text-stone-400">Rp 0 (Ambil Outlet)</span>
                )}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  disabled={opsiPengiriman === 'Ambil di Outlet'}
                  value={effectiveOngkir}
                  onChange={(e) => setOngkir(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-bold outline-none focus:bg-white focus:border-red-500 disabled:opacity-50"
                />
                {opsiPengiriman === 'Diantar ke Alamat' && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setOngkir(10000)}
                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold rounded-lg border border-stone-200 cursor-pointer"
                    >
                      10rb
                    </button>
                    <button
                      type="button"
                      onClick={() => setOngkir(15000)}
                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold rounded-lg border border-stone-200 cursor-pointer"
                    >
                      15rb
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Alamat Pengantaran */}
            {opsiPengiriman === 'Diantar ke Alamat' && (
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-stone-400" />
                  <span>Alamat Pengantaran</span>
                </label>
                <textarea
                  rows={2}
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Nama jalan, nomor rumah, patokan..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-medium outline-none focus:bg-white focus:border-red-500 resize-none"
                />
              </div>
            )}

            {/* Metode Pembayaran */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-stone-400" />
                <span>Metode Pembayaran</span>
              </label>
              <select
                value={metodeBayar}
                onChange={(e) => setMetodeBayar(e.target.value as PaymentMethod)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-bold outline-none focus:bg-white focus:border-red-500 cursor-pointer"
              >
                <option value="QRIS">QRIS</option>
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="Tunai (COD / Ambil di Tempat)">Tunai (COD / Ambil di Tempat)</option>
              </select>
            </div>

            {/* Status Pesanan */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Status Pesanan
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-black outline-none focus:bg-white focus:border-red-500 cursor-pointer"
              >
                <option value="Menunggu payment">Menunggu payment</option>
                <option value="Pesanan sedang dimasak">Pesanan sedang dimasak</option>
                <option value="Pesanan siap">Pesanan siap</option>
                <option value="Pesanan selesai">Pesanan selesai</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>

            {/* Catatan Tambahan */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-stone-400" />
                <span>Catatan Pesanan</span>
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Sambal dipisah, mentai bakar agak gosong sedikit..."
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-medium outline-none focus:bg-white focus:border-red-500"
              />
            </div>
          </div>

          {/* SECTION 3: TOTAL FOOTER RECAP */}
          <div className="bg-stone-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="space-y-0.5">
              <div className="text-[11px] text-stone-400 flex items-center gap-2">
                <span>Subtotal: {formatRupiah(itemsSubtotal)}</span>
                <span>•</span>
                <span>Ongkir: {formatRupiah(effectiveOngkir)}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-stone-300">TOTAL BAYAR:</span>
                <span className="text-lg font-black text-amber-400">
                  {formatRupiah(totalHarga)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-300 hover:text-white hover:bg-stone-800 transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSaving || items.length === 0}
                className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
