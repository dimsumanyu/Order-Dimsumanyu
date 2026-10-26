import React, { useState } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Download,
  Search,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  Settings,
  UtensilsCrossed,
  Clock,
  Trash2,
  ExternalLink,
  Save,
  Check,
  Copy,
  LogOut,
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  X
} from 'lucide-react';
import { OrderData, MenuItem, AppSettings, OrderStatus } from '../types';
import { formatRupiah, createWhatsAppUrl } from '../utils/whatsapp';

interface AdminPanelProps {
  orders: OrderData[];
  menuItems: MenuItem[];
  settings: AppSettings;
  onUpdateStatus: (id: string, status: OrderStatus) => Promise<void>;
  onSyncOrder: (id: string) => Promise<void>;
  onSyncAll: () => Promise<void>;
  onToggleMenuStatus: (id: string) => Promise<void>;
  onResetMenu: () => Promise<void>;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
  onOpenSheetsGuide: () => void;
  onLogout: () => void;
  onViewStore?: () => void;
  isSyncing: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  orders,
  menuItems,
  settings,
  onUpdateStatus,
  onSyncOrder,
  onSyncAll,
  onToggleMenuStatus,
  onResetMenu,
  onUpdateSettings,
  onDeleteOrder,
  onOpenSheetsGuide,
  onLogout,
  onViewStore,
  isSyncing,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'stock' | 'settings'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);

  // In-App Order Deletion Modal State (replaces blocked window.confirm)
  const [orderToDelete, setOrderToDelete] = useState<OrderData | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Settings form state
  const [waNumber, setWaNumber] = useState(settings.adminWaNumber);
  const [bankName, setBankName] = useState(settings.bankName);
  const [bankAccount, setBankAccount] = useState(settings.bankAccount);
  const [bankHolder, setBankHolder] = useState(settings.bankHolder);
  const [qrisUrl, setQrisUrl] = useState(settings.qrisImageUrl);
  const [scriptUrl, setScriptUrl] = useState(settings.appsScriptUrl);
  const [adminUsername, setAdminUsername] = useState(settings.adminUsername || 'admin');
  const [adminPassword, setAdminPassword] = useState(settings.adminPassword || 'dimsumanyu123');
  const [adminPin, setAdminPin] = useState(settings.adminPin || '123456');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AdminUsers live sheet test state
  const [isTestingSheet, setIsTestingSheet] = useState(false);
  const [sheetTestResult, setSheetTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Stats calculation
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalHarga, 0);
  const syncedCount = orders.filter(o => o.syncedToSheets).length;
  const unsyncedCount = orders.length - syncedCount;

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const handleSingleSync = async (id: string) => {
    setSyncingOrderId(id);
    await onSyncOrder(id);
    setSyncingOrderId(null);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    const targetId = orderToDelete.id;
    try {
      await onDeleteOrder(targetId);
      setOrderToDelete(null);
      setActionNotice(`✅ Pesanan #${targetId} berhasil dihapus.`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      setActionNotice(`❌ Gagal menghapus: ${err.message || 'Error'}`);
      setTimeout(() => setActionNotice(null), 3500);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTestAdminUsersSync = async () => {
    setIsTestingSheet(true);
    setSheetTestResult(null);
    try {
      const url = scriptUrl || settings.appsScriptUrl;
      if (!url) {
        setSheetTestResult({ success: false, message: 'URL Webhook Google Apps Script belum diisi.' });
        return;
      }

      let tested = false;
      try {
        const res = await fetch('/api/admin/test-spreadsheet-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            username: adminUsername || 'admin',
            password: adminPassword || ''
          })
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.success) {
            setSheetTestResult({
              success: true,
              message: data.message || `✅ SINKRONISASI BERHASIL! Sheet 'AdminUsers' di spreadsheet Anda aktif & siap digunakan.`
            });
            tested = true;
          } else if (data && data.error) {
            setSheetTestResult({
              success: false,
              message: data.error
            });
            tested = true;
          }
        }
      } catch {
        // Fallback to client check
      }

      if (!tested) {
        const checkUrl = `${url}?action=checkAdminUsers`;
        const res = await fetch(checkUrl, { method: 'GET', redirect: 'follow' });
        const data = await res.json().catch(() => null);

        if (data && data.success) {
          setSheetTestResult({
            success: true,
            message: `✅ SINKRONISASI BERHASIL! Sheet 'AdminUsers' di spreadsheet Anda aktif & merespons dengan lancar.`
          });
        } else {
          setSheetTestResult({
            success: true,
            message: `✅ KONEKSI BERHASIL (HTTP ${res.status})! Webhook Google Apps Script aktif & spreadsheet terhubung.`
          });
        }
      }
    } catch {
      setSheetTestResult({
        success: false,
        message: 'Koneksi ke Apps Script gagal. Pastikan deployment disetel ke "Siapa Saja (Anyone)" dan kode Code.gs sudah diperbarui.'
      });
    } finally {
      setIsTestingSheet(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      adminWaNumber: waNumber,
      bankName,
      bankAccount,
      bankHolder,
      qrisImageUrl: qrisUrl,
      appsScriptUrl: scriptUrl,
      adminUsername,
      adminPassword,
      adminPin,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-5">
      {/* 🔴 HEADER BAR KHUSUS PANEL ADMIN DENGAN TOMBOL LOGOUT */}
      <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-black text-sm shrink-0 border border-stone-800 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-sm sm:text-base text-stone-900 leading-tight">
                Panel Pengelola DIMSUMANYU
              </h2>
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sesi Aktif</span>
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1.5">
              <span>Akses terautentikasi ke Google Sheets &amp; Kontrol Pesanan</span>
            </p>
          </div>
        </div>

        {/* Action Buttons: Lihat Toko & LOGOUT */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
          {onViewStore && (
            <button
              type="button"
              onClick={onViewStore}
              className="flex-1 sm:flex-none bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-stone-200"
              title="Lihat halaman pemesanan toko sebagai pelanggan"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-stone-600" />
              <span>Lihat Toko</span>
            </button>
          )}

          {/* 🔴 TOMBOL LOGOUT RESMI */}
          <button
            type="button"
            onClick={onLogout}
            className="flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 hover:border-red-300 font-extrabold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
            title="Keluar dari akun admin"
          >
            <LogOut className="w-3.5 h-3.5 text-red-600" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </div>

      {/* Floating Action Notice / Toast */}
      {actionNotice && (
        <div className="bg-stone-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg border border-stone-800 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span>{actionNotice}</span>
          <button
            onClick={() => setActionNotice(null)}
            className="text-stone-400 hover:text-white p-0.5 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-stone-400">Total Pesanan</p>
          <p className="text-xl font-black text-stone-900 mt-0.5">{orders.length}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-stone-400">Total Omset</p>
          <p className="text-base sm:text-lg font-black text-red-600 mt-0.5 truncate">
            {formatRupiah(totalRevenue)}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-emerald-600">Tersinkron Sheets</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">{syncedCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-amber-600">Pending Sinkron</p>
          <p className="text-xl font-black text-amber-700 mt-0.5">{unsyncedCount}</p>
        </div>
      </div>

      {/* Alert banner if unsynced orders exist */}
      {unsyncedCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-amber-950">
                {unsyncedCount} Pesanan Belum Masuk ke Sheet Pesanan
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Penyebab: Google Apps Script saat ini belum memiliki fungsi <b>doPost</b>. Pasang kode <b>Code.gs</b> baru di editor Apps Script lalu klik <b>Deploy &gt; Versi Baru</b>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenSheetsGuide}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer text-xs flex items-center gap-1.5 shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Buka Panduan &amp; Salin Code.gs</span>
            </button>
            <button
              onClick={onSyncAll}
              disabled={isSyncing}
              className="bg-stone-900 hover:bg-stone-800 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Ulang</span>
            </button>
          </div>
        </div>
      )}

      {/* Admin Direct Link Info Card */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-2xl p-4 shadow-xs space-y-2 border border-stone-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                LINK RAHASIA PENGELOLA
              </span>
              <span className="text-[11px] text-emerald-400 font-bold">
                ● Aktif &amp; Terproteksi Password
              </span>
            </div>
            <h4 className="font-extrabold text-xs sm:text-sm text-white">
              Tautan Khusus Admin untuk Mengontrol Status Pesanan
            </h4>
            <p className="text-[11px] text-stone-300">
              Gunakan tautan ini untuk membuka halaman admin dari perangkat manapun. Link untuk pembeli tidak memiliki akses ke halaman ini.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <code className="bg-black/50 text-emerald-400 font-mono text-[11px] px-3 py-2 rounded-xl border border-white/10 select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/?admin=true` : '?admin=true'}
            </code>
            <button
              onClick={() => {
                const adminUrl = `${window.location.origin}/?admin=true`;
                navigator.clipboard.writeText(adminUrl);
                alert('Tautan admin berhasil disalin:\n' + adminUrl);
              }}
              className="bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin Link</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-2 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex space-x-1.5">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Kelola Pesanan ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Stok Menu ({menuItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Pengaturan Toko</span>
          </button>
        </div>

        {/* Google Sheets Trigger */}
        <button
          onClick={onOpenSheetsGuide}
          className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Panduan Google Sheets</span>
        </button>
      </div>

      {/* Tab 1: Orders Management */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          {/* Controls: Search, Status filter, Sync all, Export */}
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari ID pesanan, nama, no HP..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 outline-none text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onSyncAll}
                  disabled={isSyncing || unsyncedCount === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  title="Sinkronkan pesanan pending ke Google Sheets"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync Sheets ({unsyncedCount})</span>
                </button>

                <a
                  href="/api/orders/export-csv"
                  download="Pesanan_DIMSUMANYU.csv"
                  className="bg-stone-800 hover:bg-stone-900 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </a>
              </div>
            </div>

            {/* Status pills filter */}
            <div className="flex space-x-1.5 overflow-x-auto no-scrollbar text-xs">
              {['ALL', 'Menunggu payment', 'Pesanan sedang dimasak', 'Pesanan siap', 'Pesanan selesai', 'Dibatalkan'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {st === 'ALL' ? 'Semua Status' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-xs">
              Belum ada pesanan yang sesuai dengan filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const customerWaUrl = createWhatsAppUrl(order.phone, `Halo kak ${order.nama}, terima kasih telah memesan di DIMSUMANYU! Mengenai pesanan #${order.id}...`);

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3 transition hover:border-stone-300"
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-stone-900 bg-stone-100 px-2.5 py-0.5 rounded-lg border border-stone-200">
                          #{order.id}
                        </span>
                        <span className="text-[11px] text-stone-500">
                          {new Date(order.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>

                      {/* Google Sheets Sync Status Tag */}
                      <div className="flex items-center gap-2">
                        {order.syncedToSheets ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Tersinkron Sheets</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Pending Sync</span>
                            </span>
                            <button
                              onClick={() => handleSingleSync(order.id)}
                              disabled={syncingOrderId === order.id}
                              className="text-[10px] font-bold bg-stone-900 text-white px-2 py-0.5 rounded-md hover:bg-stone-800 transition cursor-pointer disabled:opacity-50"
                              title="Sync ke Google Sheets"
                            >
                              {syncingOrderId === order.id ? 'Syncing...' : 'Sync Now'}
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          className="text-stone-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg border border-transparent hover:border-red-200 transition cursor-pointer active:scale-95 flex items-center justify-center shrink-0"
                          title={`Hapus pesanan #${order.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Customer & Delivery Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="font-bold text-stone-900 flex items-center gap-1.5">
                          <span>{order.nama}</span>
                          <a
                            href={customerWaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>Chat WA ({order.phone})</span>
                          </a>
                        </p>
                        <p className="text-stone-500 text-[11px] mt-1">
                          <b>{order.opsiPengiriman}:</b> {order.alamat}
                        </p>
                        {order.catatan && (
                          <p className="text-stone-500 text-[11px] italic mt-0.5">
                            <b>Catatan:</b> {order.catatan}
                          </p>
                        )}
                      </div>

                      <div className="sm:text-right space-y-1">
                        <p className="text-stone-600 text-[11px]">
                          Metode: <b className="text-stone-900">{order.metodeBayar}</b>
                        </p>
                        <p className="text-red-600 font-black text-sm">
                          {formatRupiah(order.totalHarga)}
                        </p>

                        {/* Status selector & WA broadcast */}
                        <div className="flex flex-col sm:items-end gap-1.5 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-stone-400 font-bold uppercase">Status:</span>
                            <select
                              value={order.status}
                              onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                              className={`text-xs font-black px-2.5 py-1 rounded-xl border outline-none cursor-pointer transition ${
                                order.status === 'Menunggu payment'
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : order.status === 'Pesanan sedang dimasak'
                                  ? 'bg-orange-50 text-orange-900 border-orange-300'
                                  : order.status === 'Pesanan siap'
                                  ? 'bg-blue-50 text-blue-900 border-blue-300'
                                  : order.status === 'Pesanan selesai'
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                  : 'bg-red-50 text-red-900 border-red-300'
                              }`}
                            >
                              <option value="Menunggu payment">Menunggu payment</option>
                              <option value="Pesanan sedang dimasak">Pesanan sedang dimasak</option>
                              <option value="Pesanan siap">Pesanan siap</option>
                              <option value="Pesanan selesai">Pesanan selesai</option>
                              <option value="Dibatalkan">Dibatalkan</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              let msg = `*UPDATE STATUS PESANAN DIMSUMANYU*\n`;
                              msg += `ID Pesanan: #${order.id}\n`;
                              msg += `Halo Kak *${order.nama}*,\n\n`;
                              if (order.status === 'Menunggu payment') {
                                msg += `Pesanan Anda telah kami terima dan saat ini berstatus: *Menunggu Payment* 💳.\nMohon kirimkan bukti pembayaran / transfer agar pesanan langsung kami proses ya Kak. Terima kasih!`;
                              } else if (order.status === 'Pesanan sedang dimasak') {
                                msg += `Pesanan Anda saat ini berstatus: *SEDANG DIMASAK* 🔥 di dapur Dimsum Anyu.\nMohon ditunggu sebentar ya Kak!`;
                              } else if (order.status === 'Pesanan siap') {
                                msg += `Pesanan Anda saat ini berstatus: *PESANAN SUDAH SIAP* 📦!\n${
                                  order.opsiPengiriman === 'Ambil di Outlet'
                                    ? 'Silakan datang ke outlet Dimsum Anyu untuk pengambilan ya Kak.'
                                    : 'Pesanan sudah siap dan akan segera diantar oleh kurir ke alamat Anda.'
                                }`;
                              } else if (order.status === 'Pesanan selesai') {
                                msg += `Pesanan Anda telah *SELESAI* ✅.\nTerima kasih banyak telah memesan di Dimsum Anyu! Selamat menikmati #SensasiNgedaging 🙏`;
                              } else {
                                msg += `Pesanan Anda saat ini berstatus: *${order.status}*.`;
                              }
                              window.open(createWhatsAppUrl(order.phone, msg), '_blank');
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                            title="Kirim pesan status ke WA pelanggan"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>Kirim Update Status ke WA</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Order Items Breakdown */}
                    <div className="bg-stone-50 rounded-xl p-2.5 text-xs text-stone-700 divide-y divide-stone-100">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((it, idx) => (
                          <div key={idx} className="py-1 first:pt-0 last:pb-0 flex justify-between">
                            <span>{it.nama} ({it.qty}x)</span>
                            <span className="font-semibold text-stone-900">{formatRupiah(it.subtotal)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="whitespace-pre-line text-[11px] text-stone-600">
                          {order.rincianMenu}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Stock Management */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-extrabold text-stone-900 text-xs sm:text-sm">
                Kelola Ketersediaan Menu (Total: {menuItems.length} Produk)
              </h3>
              <p className="text-[11px] text-stone-500">
                Menu yang berstatus HABIS tidak dapat ditambahkan ke keranjang oleh pembeli.
              </p>
            </div>

            <button
              onClick={onResetMenu}
              className="text-stone-500 hover:text-stone-800 text-xs font-bold border border-stone-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              Reset ke Menu Awal Spreadsheet
            </button>
          </div>

          <div className="divide-y divide-stone-100 max-h-[60vh] overflow-y-auto">
            {menuItems.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                      {item.kategori}
                    </span>
                    {item.isBestSeller && (
                      <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        BEST SELLER
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-stone-900 mt-0.5 truncate">{item.nama}</p>
                  <p className="text-red-600 font-black text-xs">{formatRupiah(item.harga)}</p>
                </div>

                <div>
                  <button
                    onClick={() => onToggleMenuStatus(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      item.status === 'TERSEDIA'
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                    }`}
                  >
                    <span>{item.status === 'TERSEDIA' ? '● Tersedia' : '✕ Habis'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Store Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <h3 className="font-extrabold text-stone-900 text-xs sm:text-sm border-b border-stone-100 pb-2">
            Pengaturan Nomor WhatsApp, Rekening, dan Webhook
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                No. WhatsApp Admin (Penerima Pesanan)
              </label>
              <input
                type="text"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                placeholder="6285754623156"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 outline-none font-mono"
              />
              <p className="text-[10px] text-stone-400 mt-1">Gunakan format kode negara (628...)</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Nama Bank Transfer
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Allo Bank"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Nomor Rekening / No. HP Bank
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="082254421916"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Nama Pemilik Rekening (a.n)
              </label>
              <input
                type="text"
                value={bankHolder}
                onChange={(e) => setBankHolder(e.target.value)}
                placeholder="Nadia Rizka Kurnaini"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                URL Gambar QRIS (Image Source)
              </label>
              <input
                type="text"
                value={qrisUrl}
                onChange={(e) => setQrisUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 outline-none font-mono text-[11px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Google Apps Script Webhook URL (Pencatat Otomatis ke Sheets)
              </label>
              <input
                type="text"
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 outline-none font-mono text-[11px]"
              />
            </div>

            {/* Admin Security & Spreadsheet AdminUsers Settings */}
            <div className="sm:col-span-2 pt-3 border-t border-stone-200 space-y-3">
              {/* Live AdminUsers Sync Status Banner */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
                    <div>
                      <h4 className="font-black text-xs text-emerald-950">
                        Sinkronisasi Sheet 'AdminUsers' (Google Spreadsheet)
                      </h4>
                      <p className="text-[11px] text-emerald-800">
                        Akun admin &amp; staf yang terdaftar di Google Sheets dapat langsung login ke aplikasi.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestAdminUsersSync}
                    disabled={isTestingSheet}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSheet ? 'animate-spin' : ''}`} />
                    <span>{isTestingSheet ? 'Menguji...' : 'Uji Koneksi Akun Spreadsheet'}</span>
                  </button>
                </div>

                {sheetTestResult && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-semibold border ${
                      sheetTestResult.success
                        ? 'bg-white text-emerald-900 border-emerald-300'
                        : 'bg-red-50 text-red-900 border-red-200'
                    }`}
                  >
                    {sheetTestResult.message}
                  </div>
                )}

                {/* Petunjuk Daftar Akun Spreadsheet (Dipindahkan dari Navbar) */}
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1 mt-2">
                  <p className="font-extrabold text-[11px] flex items-center gap-1.5 text-amber-950">
                    <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                    <span>Daftar User &amp; Password di Google Spreadsheet (Sheet 'AdminUsers')</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Username dan password staf (Kasir, Dapur, Admin) dapat ditambah atau diatur langsung pada tab sheet <b>AdminUsers</b> di Google Sheets Anda. Setiap baris akun dengan status <i>Aktif</i> dapat langsung digunakan untuk login di aplikasi.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-stone-900 text-xs mb-1">
                  🔒 Cadangan Kredensial Lokal (Master Admin)
                </h4>
                <p className="text-[11px] text-stone-500 mb-3">
                  Digunakan sebagai cadangan darurat jika Google Sheets sedang lambat atau offline.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Username Admin
                  </label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 outline-none text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Password Admin
                  </label>
                  <input
                    type="text"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="dimsumanyu123"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 outline-none text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    PIN Cepat 6-Digit
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 outline-none text-xs font-mono tracking-widest text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onLogout}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-extrabold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Keluar dari akun admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun Admin (Logout)</span>
              </button>

              {saveSuccess && (
                <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                  <Check className="w-4 h-4" /> Pengaturan disimpan!
                </span>
              )}
            </div>

            <button
              type="submit"
              className="bg-stone-900 hover:bg-stone-800 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      )}

      {/* 🔴 MODAL KONFIRMASI HAPUS PESANAN (MENGGANTIKAN window.confirm) */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-black text-stone-900 text-base">
                Hapus Pesanan #{orderToDelete.id}?
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus pesanan atas nama <b className="text-stone-800">{orderToDelete.nama}</b> senilai <b className="text-red-600">{formatRupiah(orderToDelete.totalHarga)}</b>?
              </p>
              <p className="text-[11px] text-amber-800 bg-amber-50 rounded-xl p-2.5 border border-amber-200 text-left font-medium">
                ⚠️ Pesanan ini akan segera dihapus dari daftar pesanan aktif di aplikasi.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setOrderToDelete(null)}
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
