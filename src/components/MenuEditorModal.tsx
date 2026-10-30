import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Star,
  Search,
  Check,
  AlertTriangle,
  RotateCcw,
  UtensilsCrossed,
  Sparkles,
  Tag
} from 'lucide-react';
import { MenuItem } from '../types';
import { formatRupiah } from '../utils/whatsapp';

interface MenuEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  onSaveMenuItem: (item: MenuItem) => Promise<void>;
  onDeleteMenuItem: (id: string) => Promise<void>;
  onToggleStatus: (id: string) => Promise<void>;
  onToggleBestSeller: (id: string) => Promise<void>;
  onResetMenu: () => Promise<void>;
}

const CATEGORY_PRESETS = [
  'KUKUS',
  'GORENG',
  'MENTAI',
  'FROZEN',
  'MINUMAN',
  'PAKET',
  'TOPPING',
];

export const MenuEditorModal: React.FC<MenuEditorModalProps> = ({
  isOpen,
  onClose,
  menuItems,
  onSaveMenuItem,
  onDeleteMenuItem,
  onToggleStatus,
  onToggleBestSeller,
  onResetMenu,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Form edit / add state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [formNama, setFormNama] = useState('');
  const [formKategori, setFormKategori] = useState('KUKUS');
  const [customKategori, setCustomKategori] = useState('');
  const [formHarga, setFormHarga] = useState<number>(25000);
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formStatus, setFormStatus] = useState<'TERSEDIA' | 'HABIS'>('TERSEDIA');
  const [formIsBestSeller, setFormIsBestSeller] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation modal state
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Available unique categories
  const categories = useMemo(() => {
    const fromItems = menuItems.map((m) => m.kategori.trim().toUpperCase());
    const set = new Set(['ALL', ...CATEGORY_PRESETS, ...fromItems]);
    return Array.from(set);
  }, [menuItems]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((m) => {
      const matchCat =
        selectedCategory === 'ALL' ||
        m.kategori.toUpperCase() === selectedCategory.toUpperCase();
      const q = searchQuery.trim().toLowerCase();
      const matchQ =
        !q ||
        m.nama.toLowerCase().includes(q) ||
        m.kategori.toLowerCase().includes(q) ||
        (m.keterangan && m.keterangan.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleOpenAddForm = () => {
    setFormId(null);
    setFormNama('');
    setFormKategori('KUKUS');
    setCustomKategori('');
    setFormHarga(25000);
    setFormKeterangan('');
    setFormStatus('TERSEDIA');
    setFormIsBestSeller(false);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: MenuItem) => {
    setFormId(item.id);
    setFormNama(item.nama);
    if (CATEGORY_PRESETS.includes(item.kategori.toUpperCase())) {
      setFormKategori(item.kategori.toUpperCase());
      setCustomKategori('');
    } else {
      setFormKategori('CUSTOM');
      setCustomKategori(item.kategori);
    }
    setFormHarga(item.harga);
    setFormKeterangan(item.keterangan || '');
    setFormStatus(item.status);
    setFormIsBestSeller(!!item.isBestSeller);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      alert('Nama menu wajib diisi.');
      return;
    }
    if (formHarga <= 0) {
      alert('Harga menu harus lebih besar dari Rp 0.');
      return;
    }

    const finalKategori =
      formKategori === 'CUSTOM'
        ? customKategori.trim().toUpperCase() || 'LAINNYA'
        : formKategori;

    const id =
      formId ||
      `menu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newItem: MenuItem = {
      id,
      nama: formNama.trim(),
      kategori: finalKategori,
      harga: Number(formHarga),
      status: formStatus,
      keterangan: formKeterangan.trim(),
      isBestSeller: formIsBestSeller,
    };

    setIsSaving(true);
    try {
      await onSaveMenuItem(newItem);
      setIsFormOpen(false);
    } catch (err: any) {
      alert('Gagal menyimpan menu: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteMenuItem(itemToDelete.id);
      setItemToDelete(null);
    } catch (err: any) {
      alert('Gagal menghapus menu: ' + (err.message || 'Error'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-stone-200 relative my-auto animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900 leading-tight">
                  Kelola &amp; Edit Menu DIMSUMANYU
                </h3>
                <span className="bg-red-50 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-200 hidden sm:inline-block">
                  {menuItems.length} Produk
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Tambah menu baru, sesuaikan harga, atur best seller, atau kelola ketersediaan stok
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Search Header */}
        <div className="py-3 border-b border-stone-100 space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama menu, rasa, kategori..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white outline-none text-xs text-stone-900 transition"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenAddForm}
              className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-700/20 active:scale-95 transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Menu Baru</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex space-x-1.5 overflow-x-auto no-scrollbar text-xs pt-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition cursor-pointer text-[11px] ${
                  selectedCategory === cat
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat === 'ALL' ? 'Semua Kategori' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items List */}
        <div className="overflow-y-auto flex-1 divide-y divide-stone-100 pr-1 py-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs space-y-2">
              <UtensilsCrossed className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="font-semibold text-stone-600">Tidak ada menu yang sesuai.</p>
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="text-red-600 font-bold hover:underline"
              >
                + Tambah Menu Baru Sekarang
              </button>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="py-3 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-stone-50/80 rounded-xl transition"
              >
                {/* Left: Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md uppercase">
                      {item.kategori}
                    </span>

                    {/* Best Seller Pill / Button */}
                    <button
                      type="button"
                      onClick={() => onToggleBestSeller(item.id)}
                      className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                        item.isBestSeller
                          ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                          : 'bg-stone-100 text-stone-400 border-stone-200 hover:text-amber-700 hover:border-amber-200'
                      }`}
                      title={
                        item.isBestSeller
                          ? 'Klik untuk batalkan status Best Seller'
                          : 'Klik untuk jadikan produk Best Seller'
                      }
                    >
                      <Star
                        className={`w-3 h-3 ${
                          item.isBestSeller
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-stone-400'
                        }`}
                      />
                      <span>{item.isBestSeller ? 'BEST SELLER' : 'Set Best Seller'}</span>
                    </button>
                  </div>

                  <p className="font-extrabold text-stone-900 text-xs sm:text-sm">
                    {item.nama}
                  </p>

                  {item.keterangan && (
                    <p className="text-[11px] text-stone-500 line-clamp-1">
                      {item.keterangan}
                    </p>
                  )}

                  <p className="text-red-600 font-black text-xs sm:text-sm">
                    {formatRupiah(item.harga)}
                  </p>
                </div>

                {/* Right: Quick Toggles & Edit/Delete */}
                <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  {/* Stock Toggle Button */}
                  <button
                    type="button"
                    onClick={() => onToggleStatus(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      item.status === 'TERSEDIA'
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200'
                        : 'bg-stone-200 text-stone-600 hover:bg-stone-300 border border-stone-300'
                    }`}
                    title="Klik untuk ubah status Tersedia / Habis"
                  >
                    <span>{item.status === 'TERSEDIA' ? '● Tersedia' : '✕ Habis'}</span>
                  </button>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditForm(item)}
                    className="p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-200 transition cursor-pointer border border-stone-200"
                    title="Edit detail menu"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setItemToDelete(item)}
                    className="p-2 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 transition cursor-pointer border border-red-200"
                    title="Hapus menu ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  'Kembalikan daftar menu ke default awal spreadsheet? Perubahan menu lokal Anda akan diganti.'
                )
              ) {
                onResetMenu();
              }
            }}
            className="text-stone-500 hover:text-stone-800 flex items-center gap-1 font-semibold transition cursor-pointer text-[11px]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset ke Menu Awal</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-stone-900 hover:bg-stone-800 text-white font-black px-4 py-2 rounded-xl transition cursor-pointer text-xs"
          >
            Selesai
          </button>
        </div>
      </div>

      {/* 📝 FORM MODAL: TAMBAH ATAU EDIT MENU */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h4 className="font-black text-stone-900 text-sm sm:text-base flex items-center gap-1.5">
                <UtensilsCrossed className="w-4 h-4 text-red-600" />
                <span>{formId ? 'Edit Data Menu' : 'Tambah Menu Baru'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              {/* Nama Menu */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nama Menu <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: KUKUS ORIGINAL ISI 6 PCS"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white outline-none font-semibold text-stone-900 uppercase"
                  required
                />
              </div>

              {/* Kategori & Custom Category */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Kategori <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 outline-none font-bold text-stone-800 cursor-pointer"
                  >
                    {CATEGORY_PRESETS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="CUSTOM">+ Kategori Lainnya...</option>
                  </select>
                </div>

                {/* Harga */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Harga (Rp) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={formHarga}
                    onChange={(e) => setFormHarga(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white outline-none font-black text-stone-900"
                    required
                  />
                  <p className="text-[10px] text-red-600 font-bold mt-0.5">
                    {formatRupiah(formHarga)}
                  </p>
                </div>
              </div>

              {formKategori === 'CUSTOM' && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Nama Kategori Baru
                  </label>
                  <input
                    type="text"
                    value={customKategori}
                    onChange={(e) => setCustomKategori(e.target.value)}
                    placeholder="Contoh: SNACK, DIMSUM JUMBO, SAUS..."
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white outline-none font-bold text-stone-900 uppercase"
                    required
                  />
                </div>
              )}

              {/* Keterangan */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Keterangan / Komposisi Menu
                </label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Contoh: Dimsum kukus isi daging ayam murni, lembut & gurih, disajikan dengan saus chili oil."
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white outline-none text-stone-800"
                />
              </div>

              {/* Status Stok & Best Seller */}
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800">Status Stok:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormStatus('TERSEDIA')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        formStatus === 'TERSEDIA'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      ● Tersedia
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus('HABIS')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        formStatus === 'HABIS'
                          ? 'bg-stone-800 text-white shadow-xs'
                          : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      ✕ Habis
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-stone-800 block">
                      Tandai Best Seller:
                    </span>
                    <span className="text-[10px] text-stone-500">
                      Akan tampil di tab Best Seller teratas
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormIsBestSeller(!formIsBestSeller)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      formIsBestSeller
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        formIsBestSeller ? 'fill-white' : ''
                      }`}
                    />
                    <span>{formIsBestSeller ? 'Ya, Best Seller' : 'Biasa'}</span>
                  </button>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-700/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Menu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🗑️ MODAL KONFIRMASI HAPUS MENU */}
      {itemToDelete && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="font-black text-stone-900 text-base">
                Hapus Menu Ini?
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus <b className="text-stone-900">{itemToDelete.nama}</b> ({formatRupiah(itemToDelete.harga)}) dari daftar menu toko?
              </p>
              <p className="text-[11px] text-amber-800 bg-amber-50 rounded-xl p-2.5 border border-amber-200 text-left font-medium">
                ⚠️ Menu ini tidak akan lagi muncul di katalog pembeli.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-700/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
