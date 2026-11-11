import React, { useState, useEffect } from 'react';
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
  X,
  Printer,
  BarChart3,
  TrendingUp,
  DollarSign,
  FileText,
  Calendar,
  Layers,
  Smartphone,
  Edit3,
  CheckSquare
} from 'lucide-react';
import { OrderData, MenuItem, AppSettings, OrderStatus } from '../types';
import { formatRupiah, createWhatsAppUrl } from '../utils/whatsapp';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { FinancialReportModal } from './FinancialReportModal';
import { PrinterSetupModal } from './PrinterSetupModal';
import { MenuEditorModal } from './MenuEditorModal';
import { OrderSummaryModal } from './OrderSummaryModal';
import { BatchThermalReceiptModal } from './BatchThermalReceiptModal';
import { EditOrderModal } from './EditOrderModal';
import { ErrorBoundary } from './ErrorBoundary';

function parseDateSafe(val: any, fallbackId?: string): Date | null {
  if (!val && !fallbackId) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // 1. Indonesian DD/MM/YYYY or DD-MM-YYYY format
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
      const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
      const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
      const parsed = new Date(year, month, day, hours, minutes, seconds);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    // 2. Standard ISO string
    const cleaned = trimmed.replace(' ', 'T');
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
    const d2 = new Date(val);
    if (!isNaN(d2.getTime())) return d2;
  }
  // 3. Fallback to order ID if format DAN-YYYYMMDD-HHMMSS
  if (fallbackId && typeof fallbackId === 'string') {
    const idMatch = fallbackId.match(/(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
    if (idMatch) {
      const parsed = new Date(
        parseInt(idMatch[1], 10),
        parseInt(idMatch[2], 10) - 1,
        parseInt(idMatch[3], 10),
        parseInt(idMatch[4], 10),
        parseInt(idMatch[5], 10),
        parseInt(idMatch[6], 10)
      );
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const idDayMatch = fallbackId.match(/(\d{4})(\d{2})(\d{2})/);
    if (idDayMatch) {
      const parsed = new Date(
        parseInt(idDayMatch[1], 10),
        parseInt(idDayMatch[2], 10) - 1,
        parseInt(idDayMatch[3], 10)
      );
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

interface AdminPanelProps {
  orders: OrderData[];
  menuItems: MenuItem[];
  settings: AppSettings;
  onUpdateStatus: (id: string, status: OrderStatus) => Promise<void>;
  onSyncOrder: (id: string) => Promise<void>;
  onSyncAll: () => Promise<void>;
  onToggleMenuStatus: (id: string) => Promise<void>;
  onResetMenu: () => Promise<void>;
  onSaveMenuItem?: (item: MenuItem & { originalNama?: string }) => Promise<void>;
  onDeleteMenuItem?: (id: string) => Promise<void>;
  onToggleBestSeller?: (id: string) => Promise<void>;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
  onDeleteMultipleOrders?: (ids: string[]) => Promise<void>;
  onOpenSheetsGuide: () => void;
  onLogout: () => void;
  onViewStore?: () => void;
  onMarkAsPrinted: (id: string) => Promise<void>;
  onUpdateOrder?: (updatedOrder: OrderData) => Promise<void>;
  onBatchUpdateStatus?: (ids: string[], newStatus: OrderStatus) => Promise<void>;
  isSyncing: boolean;
  onRefreshOrders?: () => Promise<void>;
  isRefreshing?: boolean;
  lastSyncedTime?: Date | null;
  sheetsScriptNeedsUpdate?: boolean;
  syncFeedback?: string | null;
  onOpenInstallModal?: () => void;
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
  onSaveMenuItem,
  onDeleteMenuItem,
  onToggleBestSeller,
  onUpdateSettings,
  onDeleteOrder,
  onDeleteMultipleOrders,
  onUpdateOrder,
  onBatchUpdateStatus,
  onOpenSheetsGuide,
  onLogout,
  onViewStore,
  onMarkAsPrinted,
  isSyncing,
  onRefreshOrders,
  isRefreshing,
  lastSyncedTime,
  sheetsScriptNeedsUpdate,
  syncFeedback,
  onOpenInstallModal,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'stock' | 'settings'>(() => {
    try {
      const savedTab = localStorage.getItem('dimsumanyu_admin_tab');
      if (savedTab === 'stock' || savedTab === 'settings' || savedTab === 'orders') {
        return savedTab;
      }
      return 'orders';
    } catch {
      return 'orders';
    }
  });

  // Synchronize activeTab with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dimsumanyu_admin_tab', activeTab);
    } catch {}
  }, [activeTab]);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);

  // Date Filter State: Default to 'TODAY' (Pesanan Hari Ini) as requested by user
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'ALL' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('TODAY');

  // Synchronize dateFilter with localStorage for session persistence
  useEffect(() => {
    try {
      localStorage.setItem('dimsumanyu_admin_date_filter', dateFilter);
    } catch {}
  }, [dateFilter]);
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    try {
      return new Date().toISOString().split('T')[0];
    } catch {
      return '2026-11-03';
    }
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    try {
      return new Date().toISOString().split('T')[0];
    } catch {
      return '2026-11-03';
    }
  });

  // Human-readable active filter label used for OrderSummaryModal sync
  const activeFilterLabel = React.useMemo(() => {
    const parts: string[] = [];
    if (dateFilter === 'TODAY') parts.push('Hari Ini');
    else if (dateFilter === 'ALL') parts.push('Semua Tanggal');
    else if (dateFilter === 'YESTERDAY') parts.push('Kemarin');
    else if (dateFilter === 'LAST_7_DAYS') parts.push('7 Hari Terakhir');
    else if (dateFilter === 'THIS_MONTH') parts.push('Bulan Ini');
    else if (dateFilter === 'CUSTOM') parts.push(`${customStartDate} s/d ${customEndDate}`);

    if (statusFilter !== 'ALL') parts.push(`Status: ${statusFilter}`);
    if (searchQuery.trim()) parts.push(`Cari: "${searchQuery.trim()}"`);

    return parts.join(' • ');
  }, [dateFilter, customStartDate, customEndDate, statusFilter, searchQuery]);

  // Summary Seluruh Pesanan Modal State
  const [showOrderSummaryModal, setShowOrderSummaryModal] = useState<boolean>(false);

  // Batch Thermal Receipt Modal State (Cetak Semua Resi)
  const [showBatchReceiptModal, setShowBatchReceiptModal] = useState<boolean>(false);
  const [batchReceiptOrders, setBatchReceiptOrders] = useState<OrderData[]>([]);

  // Menu Editor Modal State (Tambah, Kurangi/Hapus, Best Seller, Stok)
  const [showMenuEditorModal, setShowMenuEditorModal] = useState<boolean>(false);

  // Multi-Select Orders State (Bulk Delete & Bulk Print & Bulk Status)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [isBatchUpdatingStatus, setIsBatchUpdatingStatus] = useState<boolean>(false);

  // Edit Order Modal State
  const [orderToEdit, setOrderToEdit] = useState<OrderData | null>(null);

  // Thermal Receipt Modal State (58mm printer single)
  const [orderForReceipt, setOrderForReceipt] = useState<OrderData | null>(null);

  // Financial Report Modal State (Laporan Keuangan & Best Seller)
  const [showFinanceModal, setShowFinanceModal] = useState<boolean>(false);

  // Printer Setup Modal State (Kasir Mini style printer discovery)
  const [showPrinterSetupModal, setShowPrinterSetupModal] = useState<boolean>(false);

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
  const totalRevenue = orders
    .filter(o => o && o.status !== 'Dibatalkan')
    .reduce((sum, o) => sum + (Number(o.totalHarga) || 0), 0);

  const today = new Date();
  const todayRevenue = orders
    .filter(o => {
      if (!o) return false;
      if (o.status === 'Dibatalkan') return false;
      const d = parseDateSafe(o.createdAt, o.id);
      if (!d || isNaN(d.getTime())) return false;
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, o) => sum + (Number(o.totalHarga) || 0), 0);

  const syncedCount = orders.filter(o => o.syncedToSheets).length;
  const unsyncedCount = orders.length - syncedCount;

  // Filter orders by Status, Search query, and Date Filter
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phone.includes(searchQuery);

    let matchesDate = true;
    if (dateFilter !== 'ALL') {
      const d = parseDateSafe(order.createdAt, order.id);
      if (!d) {
        matchesDate = true;
      } else {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        const endOfYesterday = new Date(startOfToday.getTime() - 1);

        const sevenDaysAgo = new Date(startOfToday);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        if (dateFilter === 'TODAY') {
          matchesDate = (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        } else if (dateFilter === 'YESTERDAY') {
          matchesDate = (
            d.getFullYear() === startOfYesterday.getFullYear() &&
            d.getMonth() === startOfYesterday.getMonth() &&
            d.getDate() === startOfYesterday.getDate()
          );
        } else if (dateFilter === 'LAST_7_DAYS') {
          matchesDate = d >= sevenDaysAgo;
        } else if (dateFilter === 'THIS_MONTH') {
          matchesDate = d >= firstDayThisMonth;
        } else if (dateFilter === 'CUSTOM') {
          const start = customStartDate ? new Date(`${customStartDate}T00:00:00`) : new Date(0);
          const end = customEndDate ? new Date(`${customEndDate}T23:59:59.999`) : new Date();
          matchesDate = d >= start && d <= end;
        }
      }
    }

    return matchesStatus && matchesSearch && matchesDate;
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

  // Multi-Select Orders Handlers (Pilih Banyak Pesanan)
  const areAllFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedOrderIds.includes(o.id));

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (areAllFilteredSelected) {
      const filteredSet = new Set(filteredOrders.map((o) => o.id));
      setSelectedOrderIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const allIds = Array.from(
        new Set([...selectedOrderIds, ...filteredOrders.map((o) => o.id)])
      );
      setSelectedOrderIds(allIds);
    }
  };

  const handleClearSelection = () => {
    setSelectedOrderIds([]);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsBulkDeleting(true);
    const count = selectedOrderIds.length;
    try {
      if (onDeleteMultipleOrders) {
        await onDeleteMultipleOrders(selectedOrderIds);
      } else {
        for (const id of selectedOrderIds) {
          await onDeleteOrder(id);
        }
      }
      setSelectedOrderIds([]);
      setShowBulkDeleteModal(false);
      setActionNotice(`✅ Berhasil menghapus ${count} pesanan terpilih.`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      setActionNotice(`❌ Gagal menghapus pesanan: ${err.message || 'Error'}`);
      setTimeout(() => setActionNotice(null), 3500);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Bulk Status Update Handler (Ubah Status Bersamaan untuk Banyak Pesanan)
  const handleBatchUpdateStatus = async (newStatus: OrderStatus) => {
    if (selectedOrderIds.length === 0) return;
    setIsBatchUpdatingStatus(true);
    const count = selectedOrderIds.length;
    try {
      if (onBatchUpdateStatus) {
        await onBatchUpdateStatus(selectedOrderIds, newStatus);
      } else {
        for (const id of selectedOrderIds) {
          await onUpdateStatus(id, newStatus);
        }
      }
      setSelectedOrderIds([]);
      setActionNotice(`✅ Berhasil mengubah status ${count} transaksi sekaligus ke "${newStatus}".`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice(`❌ Gagal mengubah status massal: ${err.message || 'Error'}`);
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setIsBatchUpdatingStatus(false);
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
          const foundSheet = data.sheetName || 'admin user';
          setSheetTestResult({
            success: true,
            message: `✅ SINKRONISASI BERHASIL! Sheet '${foundSheet}' di spreadsheet Anda aktif & terhubung (${data.userCount !== undefined ? data.userCount : 1} akun).`
          });
        } else if (data && data.status === 'ok') {
          setSheetTestResult({
            success: false,
            message: '⚠️ Apps Script masih menjalankan deployment versi lama. Silakan buka Apps Script, klik "Terapkan (Deploy) > Kelola Penerapan > Edit (Pensil) > Versi: VERSI BARU > Terapkan" agar sheet "admin user" Anda terbaca.'
          });
        } else {
          setSheetTestResult({
            success: true,
            message: `✅ KONEKSI BERHASIL (HTTP ${res.status})! Webhook Google Apps Script aktif.`
          });
        }
      }
    } catch {
      setSheetTestResult({
        success: false,
        message: 'Koneksi ke Apps Script gagal. Pastikan deployment disetel ke "Siapa Saja (Anyone)" dan kode Code.gs sudah diperbarui ke Versi Baru.'
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
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 flex-wrap">
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
      {/* Overview Stat Cards: Total Pesanan & Omset Hari Ini */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-stone-400">Total Pesanan</p>
            <p className="text-2xl font-black text-stone-900 mt-0.5">{orders.length}</p>
          </div>
          <p className="text-[11px] text-stone-500 mt-1 font-medium">Semua transaksi masuk ke dalam sistem</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase font-bold text-red-600">Omset Hari Ini</p>
              <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                Harian
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-red-600 mt-1 truncate">
              {formatRupiah(todayRevenue)}
            </p>
            <p className="text-[11px] text-stone-500 font-medium mt-0.5">
              Reset otomatis setiap pergantian hari
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowFinanceModal(true)}
            className="mt-2.5 w-full bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-black text-[11px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            title="Buka Dashboard Laporan Keuangan (Filter Hari, Minggu, Bulan, Best Seller)"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Semua Laporan</span>
          </button>
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
            <span>Kelola Pesanan ({filteredOrders.length}{dateFilter !== 'ALL' ? ` • ${dateFilter === 'TODAY' ? 'Hari Ini' : 'Filter'}` : ''})</span>
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

          {/* 📋 BUTTON SUMMARY SELURUH PESANAN */}
          <button
            type="button"
            onClick={() => setShowOrderSummaryModal(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs active:scale-95"
            title="Buka Rekap/Summary Seluruh Pesanan (Filter Tanggal, Nama, Pesanan, Total Jumlah)"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            <span>Summary Pesanan 📋</span>
          </button>

          {/* 🖨️ BUTTON PENGATURAN PRINTER KASIR (ALA KASIR MINI) */}
          <button
            type="button"
            onClick={() => setShowPrinterSetupModal(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-amber-50 hover:bg-amber-100 text-stone-900 border border-amber-300 shadow-xs active:scale-95"
            title="Hubungkan & Atur Printer Thermal Kasir (Bluetooth BLE, WiFi, RawBT)"
          >
            <Printer className="w-3.5 h-3.5 text-amber-600" />
            <span>Printer Kasir (58mm) 🖨️</span>
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
          {/* 🔴 SINKRONISASI SEMUA HP (IPHONE & ANDROID) BANNER JIKA SCRIPT BUTUH DEPLOYMENT BARU */}
          {sheetsScriptNeedsUpdate && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 text-stone-900 p-4 rounded-2xl shadow-sm space-y-2 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shrink-0 mt-0.5 shadow-xs">
                  !
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-extrabold text-amber-950 text-sm">
                      Sinkronisasi Pesanan Antar HP (iPhone 13 &amp; Semua Perangkat)
                    </h4>
                    <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Perlu Deploy Versi Baru
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed text-stone-700">
                    Orderan yang masuk dari iPhone 13 atau HP pelanggan sudah tersimpan di Google Sheets Anda. Namun, <b>Google Apps Script di akun Google Anda masih menjalankan versi lama</b> (belum memiliki fungsi penarikan data <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono font-bold">getOrders</code>).
                  </p>
                  <p className="mt-1 font-semibold text-stone-900">
                    👉 Buka spreadsheet Google Anda, tempel Code.gs baru (Versi 2.2), lalu klik <b>Terapkan &gt; Kelola Penerapan &gt; Edit &gt; Versi Baru &gt; Terapkan</b>. Setelah itu semua pesanan dari iPhone 13 &amp; HP manapun akan langsung masuk otomatis!
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onOpenSheetsGuide}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>📋 Buka Panduan &amp; Salin Code.gs (Versi 2.2)</span>
                    </button>
                    {onRefreshOrders && (
                      <button
                        type="button"
                        onClick={onRefreshOrders}
                        disabled={isRefreshing}
                        className="bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Coba Tarik Ulang dari Sheets</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sync Success Feedback */}
          {syncFeedback && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

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

              <div className="flex items-center gap-2 flex-wrap">
                {onRefreshOrders && (
                  <button
                    type="button"
                    onClick={onRefreshOrders}
                    disabled={isRefreshing}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                    title="Tarik pesanan terbaru dari server dan sinkronkan dengan Google Sheets"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-red-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'Menyinkronkan...' : 'Segarkan Pesanan'}</span>
                  </button>
                )}

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

            {/* Live Sync Status Banner */}
            <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5 px-0.5">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                <span>Sinkronisasi Otomatis Antar Device Aktif</span>
              </span>
              {lastSyncedTime && (
                <span className="text-[10px] text-stone-400">
                  Update: {lastSyncedTime.toLocaleTimeString('id-ID')}
                </span>
              )}
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

            {/* 📅 FILTER TANGGAL PESANAN: HARI INI SEBAGAI PILIHAN UTAMA */}
            <div className="pt-2 border-t border-stone-100 space-y-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                <span className="text-[11px] font-bold text-stone-500 mr-1 flex items-center gap-1 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>Filter Tanggal:</span>
                </span>
                {[
                  { id: 'TODAY', label: 'Hari Ini' },
                  { id: 'ALL', label: 'Semua Tanggal' },
                  { id: 'YESTERDAY', label: 'Kemarin' },
                  { id: 'LAST_7_DAYS', label: '7 Hari Terakhir' },
                  { id: 'THIS_MONTH', label: 'Bulan Ini' },
                  { id: 'CUSTOM', label: 'Pilih Tanggal' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDateFilter(d.id as any)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition cursor-pointer text-[11px] ${
                      dateFilter === d.id
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Filter Status Badge */}
              <div className="flex items-center justify-between text-[11px] text-stone-600 bg-stone-50 border border-stone-200/80 rounded-xl px-3 py-1.5 flex-wrap gap-2">
                <span className="flex items-center gap-1.5 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>Filter Aktif:</span>
                  <span className="text-red-700 font-extrabold bg-red-100/80 px-2 py-0.5 rounded-md">
                    {dateFilter === 'TODAY'
                      ? 'Hari Ini'
                      : dateFilter === 'ALL'
                      ? 'Semua Tanggal'
                      : dateFilter === 'YESTERDAY'
                      ? 'Kemarin'
                      : dateFilter === 'LAST_7_DAYS'
                      ? '7 Hari Terakhir'
                      : dateFilter === 'THIS_MONTH'
                      ? 'Bulan Ini'
                      : `${customStartDate} s/d ${customEndDate}`}
                  </span>
                  {statusFilter !== 'ALL' && (
                    <span className="text-stone-700 font-extrabold bg-stone-200 px-2 py-0.5 rounded-md">
                      Status: {statusFilter}
                    </span>
                  )}
                  <span>({filteredOrders.length} transaksi)</span>
                </span>

                {dateFilter === 'TODAY' ? (
                  <span className="text-[10.5px] text-stone-400">
                    Halaman awal memuat pesanan hari ini. Klik "Semua Tanggal" atau "Kemarin" jika perlu mengecek riwayat.
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDateFilter('TODAY')}
                    className="text-[11px] text-red-600 font-extrabold hover:underline cursor-pointer"
                  >
                    ↺ Kembali ke Pesanan Hari Ini
                  </button>
                )}
              </div>

              {dateFilter === 'CUSTOM' && (
                <div className="flex items-center gap-2 flex-wrap bg-stone-50 p-2 rounded-xl border border-stone-200 text-xs">
                  <span className="text-stone-500 font-bold">Dari:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2 py-0.5 rounded-lg border border-stone-300 bg-white"
                  />
                  <span className="text-stone-500 font-bold">Sampai:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2 py-0.5 rounded-lg border border-stone-300 bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 🔘 TOOLBAR AKSI CEPAT & PILIH BANYAK (MULTI-SELECT BAR & BATCH ACTIONS) */}
          {filteredOrders.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2.5">
                <label className="flex items-center gap-2 font-bold text-stone-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={areAllFilteredSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer accent-red-600"
                  />
                  <span>Pilih Semua ({filteredOrders.length})</span>
                </label>

                {selectedOrderIds.length > 0 && (
                  <span className="bg-red-100 text-red-800 font-extrabold px-2.5 py-0.5 rounded-full text-[11px] border border-red-200 animate-in fade-in">
                    {selectedOrderIds.length} terpilih
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* 🖨️ BUTTON PRINT ALL RESI (Filter Tanggal atau Transaksi Terpilih) */}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedOrderIds.length > 0) {
                      const selected = filteredOrders.filter((o) => selectedOrderIds.includes(o.id));
                      setBatchReceiptOrders(selected);
                    } else {
                      setBatchReceiptOrders(filteredOrders);
                    }
                    setShowBatchReceiptModal(true);
                  }}
                  className="bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  title={
                    selectedOrderIds.length > 0
                      ? `Cetak ${selectedOrderIds.length} resi yang sedang dicentang`
                      : `Cetak semua (${filteredOrders.length}) resi pada filter saat ini`
                  }
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {selectedOrderIds.length > 0
                      ? `Cetak (${selectedOrderIds.length}) Resi Terpilih`
                      : `Cetak Semua Resi (${filteredOrders.length})`}
                  </span>
                </button>

                {/* 📋 BUTTON SUMMARY SELURUH PESANAN */}
                <button
                  type="button"
                  onClick={() => setShowOrderSummaryModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  title="Buka summary daftar pesanan (Nama, Pesanan, Total Jumlah)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Summary Pesanan</span>
                </button>

                {selectedOrderIds.length > 0 && (
                  <>
                    {/* ⚡ BATCH STATUS UPDATE DROPDOWN */}
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-xl px-2.5 py-1 text-xs shadow-xs">
                      <CheckSquare className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="font-extrabold text-amber-950 text-[11px] whitespace-nowrap">
                        Ubah Status ({selectedOrderIds.length}):
                      </span>
                      <select
                        disabled={isBatchUpdatingStatus}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleBatchUpdateStatus(e.target.value as OrderStatus);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="bg-white text-stone-900 font-black text-xs px-2 py-0.5 rounded-lg border border-amber-300 outline-none cursor-pointer hover:border-amber-500 transition disabled:opacity-50"
                      >
                        <option value="" disabled>Pilih Status Baru...</option>
                        <option value="Menunggu payment">Menunggu payment</option>
                        <option value="Pesanan sedang dimasak">Pesanan sedang dimasak</option>
                        <option value="Pesanan siap">Pesanan siap</option>
                        <option value="Pesanan selesai">Pesanan selesai</option>
                        <option value="Dibatalkan">Dibatalkan</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowBulkDeleteModal(true)}
                      className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                      title="Hapus semua transaksi yang sedang dicentang"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus ({selectedOrderIds.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold px-2.5 py-1.5 rounded-xl text-xs border border-stone-200 transition cursor-pointer"
                    >
                      Batal
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500 text-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto text-xl">
                ☕
              </div>
              <div>
                <p className="font-extrabold text-stone-800 text-sm">
                  {dateFilter === 'TODAY'
                    ? 'Belum ada pesanan masuk untuk Hari Ini'
                    : 'Tidak ada pesanan yang sesuai dengan filter'}
                </p>
                <p className="text-stone-400 text-[11px] mt-1 max-w-md mx-auto">
                  {dateFilter === 'TODAY'
                    ? 'Pesanan baru hari ini akan muncul di sini secara otomatis. Jika ingin melihat pesanan sebelumnya, Anda dapat memilih "Semua Tanggal" atau "Kemarin".'
                    : 'Coba sesuaikan kata kunci pencarian, filter status, atau filter tanggal.'}
                </p>
              </div>
              {dateFilter === 'TODAY' && orders.length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setDateFilter('ALL')}
                    className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lihat Semua Tanggal ({orders.length} Pesanan)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const customerWaUrl = createWhatsAppUrl(order.phone, `Halo kak ${order.nama}, terima kasih telah memesan di DIMSUMANYU! Mengenai pesanan #${order.id}...`);
                const isSelected = selectedOrderIds.includes(order.id);

                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border p-4 shadow-xs space-y-3 transition ${
                      isSelected
                        ? 'bg-red-50/40 border-red-400 ring-2 ring-red-500/20'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          aria-label={`Pilih pesanan #${order.id}`}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer accent-red-600 shrink-0"
                        />

                        <span className="font-mono font-black text-xs text-stone-900 bg-stone-100 px-2.5 py-0.5 rounded-lg border border-stone-200">
                          #{order.id}
                        </span>
                        <span className="text-[11px] text-stone-500">
                          {new Date(order.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>

                      {/* Google Sheets Sync Status Tag & Print Status Badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Print History Badge */}
                        {order.printCount && order.printCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setOrderForReceipt(order)}
                            className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200 transition cursor-pointer"
                            title={`Telah dicetak ${order.printCount}x. Terakhir: ${order.lastPrintedAt ? new Date(order.lastPrintedAt).toLocaleString('id-ID') : '-'}`}
                          >
                            <Printer className="w-3 h-3 text-blue-600" />
                            <span>Tercetak ({order.printCount}x)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setOrderForReceipt(order)}
                            className="inline-flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-stone-200 transition cursor-pointer"
                            title="Belum pernah dicetak ke struk thermal"
                          >
                            <Printer className="w-3 h-3 text-stone-400" />
                            <span>Belum Dicetak</span>
                          </button>
                        )}

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

                        {/* ✏️ EDIT PESANAN */}
                        <button
                          type="button"
                          onClick={() => setOrderToEdit(order)}
                          className="text-stone-700 hover:text-amber-800 bg-stone-100 hover:bg-amber-50 px-2.5 py-1 rounded-lg border border-stone-200 hover:border-amber-300 text-xs font-bold transition cursor-pointer active:scale-95 flex items-center gap-1 shrink-0"
                          title={`Edit menu & data pesanan #${order.id}`}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Edit</span>
                        </button>

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
                        {order.mapsUrl && (
                          <div className="mt-1">
                            <a
                              href={order.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-[10.5px] px-2 py-0.5 rounded-lg border border-red-200 transition"
                              title="Buka titik lokasi pengantaran di Google Maps"
                            >
                              <ExternalLink className="w-3 h-3 text-red-600" />
                              <span>📍 Buka Titik di Google Maps ↗</span>
                            </a>
                          </div>
                        )}
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
                        <div className="flex flex-col sm:items-end">
                          <p className="text-red-600 font-black text-sm">
                            {formatRupiah(order.totalHarga)}
                          </p>
                          {(() => {
                            const rawSub = order.items && order.items.length > 0
                              ? order.items.reduce((s, it) => s + (it.subtotal || (it.harga * it.qty)), 0)
                              : 0;
                            let oVal = Number(order.ongkir) || 0;
                            if (oVal === 0 && order.totalHarga > rawSub && rawSub > 0) {
                              oVal = order.totalHarga - rawSub;
                            }
                            if (oVal > 0) {
                              return (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5">
                                  + Ongkir {formatRupiah(oVal)}
                                </span>
                              );
                            }
                            return (
                              <span className="text-[10px] text-stone-400 font-normal">
                                (Tanpa Ongkir)
                              </span>
                            );
                          })()}
                        </div>

                        {/* Status selector, WA broadcast & CETAK RESI */}
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

                          <div className="flex flex-wrap items-center gap-1.5 justify-end pt-0.5">
                            {/* ✏️ TOMBOL EDIT PESANAN */}
                            <button
                              type="button"
                              onClick={() => setOrderToEdit(order)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 active:scale-95 border border-stone-300 px-3 py-1.5 rounded-xl transition shadow-2xs cursor-pointer"
                              title="Edit menu pesanan, tambah/kurang item, atau ubah info pelanggan"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              <span>Edit Pesanan</span>
                            </button>

                            {/* 🖨️ TOMBOL CETAK RESI 58MM */}
                            <button
                              type="button"
                              onClick={() => setOrderForReceipt(order)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-black text-stone-900 bg-amber-400 hover:bg-amber-500 active:scale-95 border border-amber-500/50 px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
                              title="Cetak resi ukuran 58mm untuk printer thermal bluetooth"
                            >
                              <Printer className="w-3.5 h-3.5 text-stone-900" />
                              <span>Cetak Resi (58mm)</span>
                            </button>

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
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                              title="Kirim pesan status ke WA pelanggan"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>Kirim Update Status ke WA</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Items Breakdown */}
                    <div className="bg-stone-50 rounded-xl p-2.5 text-xs text-stone-700 divide-y divide-stone-100">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((it, idx) => {
                          let itemSubtotal = it.subtotal || 0;
                          let itemPrice = it.harga || 0;
                          if (itemSubtotal === 0 || itemPrice === 0) {
                            const match = menuItems.find(
                              (m) =>
                                m.nama.toLowerCase().trim() === it.nama.toLowerCase().trim() ||
                                it.nama.toLowerCase().includes(m.nama.toLowerCase()) ||
                                m.nama.toLowerCase().includes(it.nama.toLowerCase())
                            );
                            if (match) {
                              itemPrice = match.harga;
                              itemSubtotal = match.harga * (it.qty || 1);
                            } else if (order.items && order.items.length === 1 && order.totalHarga > 0) {
                              itemSubtotal = order.totalHarga;
                              itemPrice = Math.round(order.totalHarga / (it.qty || 1));
                            }
                          }
                          return (
                            <div key={idx} className="py-1 first:pt-0 last:pb-0 flex justify-between items-center">
                              <span className="font-medium text-stone-800 flex items-center gap-1.5">
                                <span className="text-stone-400 font-bold select-none">•</span>
                                <span><b className="font-extrabold text-stone-900">{it.qty}x</b> {it.nama}</span>
                                {it.qty > 1 && itemPrice > 0 && (
                                  <span className="text-[10px] text-stone-500 font-normal">
                                    (@ {formatRupiah(itemPrice)})
                                  </span>
                                )}
                              </span>
                              <span className="font-semibold text-stone-900">{formatRupiah(itemSubtotal)}</span>
                            </div>
                          );
                        })
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
                Kelola Menu &amp; Ketersediaan Stok (Total: {menuItems.length} Produk)
              </h3>
              <p className="text-[11px] text-stone-500">
                Tambah menu baru, kurangi/hapus, atur Best Seller, dan status ketersediaan stok.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowMenuEditorModal(true)}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 text-xs font-black px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs border border-amber-600/30"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>+ Edit / Kelola Menu</span>
              </button>
              {onRefreshOrders && (
                <button
                  type="button"
                  onClick={onRefreshOrders}
                  disabled={isRefreshing}
                  className="bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 text-xs font-bold border border-emerald-300 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  title="Tarik menu dan pesanan terbaru dari Google Sheets"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{isRefreshing ? 'Menyinkronkan...' : 'Sinkron dari Sheets'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onResetMenu}
                className="text-stone-500 hover:text-stone-800 text-xs font-bold border border-stone-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                Reset ke Menu Awal
              </button>
            </div>
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
                      <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                        ⭐ BEST SELLER
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-stone-900 mt-0.5 truncate">{item.nama}</p>
                  <p className="text-red-600 font-black text-xs">{formatRupiah(item.harga)}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Quick Best Seller Toggle */}
                  {onToggleBestSeller && (
                    <button
                      type="button"
                      onClick={() => onToggleBestSeller(item.id)}
                      title={item.isBestSeller ? 'Hapus status Best Seller' : 'Jadikan Best Seller'}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
                        item.isBestSeller
                          ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                          : 'bg-stone-50 border-stone-200 text-stone-400 hover:text-amber-600 hover:border-amber-300'
                      }`}
                    >
                      {item.isBestSeller ? '⭐ Best Seller' : '☆ Non-Best'}
                    </button>
                  )}

                  {/* Stock Availability Toggle */}
                  <button
                    type="button"
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
          {/* PWA Kasir Mobile Quick Card */}
          {onOpenInstallModal && (
            <div className="p-4 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-2xl border border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white flex items-center gap-1.5">
                    <span>Aplikasi Kasir DIMSUMANYU (PWA)</span>
                    <span className="text-[9.5px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                      Mobile &amp; Tablet
                    </span>
                  </h4>
                  <p className="text-[11px] text-stone-300">
                    Pasang aplikasi langsung di layar utama HP/tablet kasir outlet untuk tampilan fullscreen bebas hambatan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenInstallModal}
                className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pasang Aplikasi di HP</span>
              </button>
            </div>
          )}

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

                {/* Petunjuk Daftar Akun Spreadsheet */}
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1.5 mt-2">
                  <p className="font-extrabold text-[11px] flex items-center gap-1.5 text-amber-950">
                    <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                    <span>Daftar Akun di Google Spreadsheet (Sheet 'admin user' / 'AdminUsers')</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Sistem fleksibel mengenali berbagai nama tab sheet: <b>admin user</b>, <b>Admin User</b>, <b>admin users</b>, <b>AdminUsers</b>, atau <b>Akun Admin</b>. Setiap baris akun dengan status <i>Aktif</i> dapat langsung digunakan untuk login di aplikasi menggunakan Username &amp; Password atau PIN Cepat.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-stone-900 text-xs mb-1">
                  🔒 Kredensial Toko &amp; PIN Pengelola
                </h4>
                <p className="text-[11px] text-stone-500 mb-3">
                  Kredensial langsung untuk login cepat ke panel admin (dapat digunakan kapan saja):
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
                    PIN Cepat Pengelola
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="290501"
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

      {/* 🔴 MODAL KONFIRMASI HAPUS BANYAK PESANAN SEKALIGUS */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-black text-stone-900 text-base">
                Hapus {selectedOrderIds.length} Pesanan Terpilih?
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus <b className="text-red-600">{selectedOrderIds.length} pesanan</b> yang dipilih sekaligus dari daftar kelola pesanan?
              </p>
              <p className="text-[11px] text-amber-800 bg-amber-50 rounded-xl p-2.5 border border-amber-200 text-left font-medium">
                ⚠️ Pesanan yang dihapus akan segera dibersihkan dari daftar aktif di aplikasi.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleConfirmBulkDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-700/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBulkDeleting ? 'Menghapus...' : `Ya, Hapus (${selectedOrderIds.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📌 FLOATING STICKY SELECTION BAR (Muncul saat ada transaksi dicentang) */}
      {selectedOrderIds.length > 0 && activeTab === 'orders' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-stone-900/95 backdrop-blur-md text-white rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 shadow-2xl border border-stone-800 flex items-center justify-between gap-3 sm:gap-5 animate-in slide-in-from-bottom-3 duration-200 max-w-[92vw]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-black truncate">
              {selectedOrderIds.length} Pesanan Dipilih
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const selected = filteredOrders.filter((o) => selectedOrderIds.includes(o.id));
                setBatchReceiptOrders(selected);
                setShowBatchReceiptModal(true);
              }}
              className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-900 font-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              title="Cetak resi transaksi yang dipilih"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak ({selectedOrderIds.length}) Resi</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-red-700/30 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih</span>
            </button>

            <button
              type="button"
              onClick={handleClearSelection}
              className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs transition cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* 🖨️ MODAL CETAK RESI THERMAL TUNGGAL (58MM) */}
      <ThermalReceiptModal
        isOpen={!!orderForReceipt}
        order={orderForReceipt}
        onClose={() => setOrderForReceipt(null)}
        onMarkAsPrinted={async (orderId) => {
          await onMarkAsPrinted(orderId);
          // Keep local state in modal updated immediately with print count & timestamp
          if (orderForReceipt && orderForReceipt.id === orderId) {
            setOrderForReceipt({
              ...orderForReceipt,
              printCount: (orderForReceipt.printCount || 0) + 1,
              lastPrintedAt: new Date().toISOString(),
            });
          }
        }}
        settings={settings}
        menuItems={menuItems}
      />

      {/* 🖨️ MODAL CETAK SEMUA / BANYAK RESI SEKALIGUS (BATCH PRINT 58MM) */}
      <BatchThermalReceiptModal
        isOpen={showBatchReceiptModal}
        orders={batchReceiptOrders}
        onClose={() => setShowBatchReceiptModal(false)}
        onMarkAsPrinted={async (orderId) => {
          await onMarkAsPrinted(orderId);
        }}
        settings={settings}
        menuItems={menuItems}
        title={
          selectedOrderIds.length > 0
            ? `Cetak ${batchReceiptOrders.length} Resi Terpilih`
            : `Cetak Semua (${batchReceiptOrders.length}) Resi`
        }
      />

      {/* 📋 MODAL SUMMARY / REKAP SELURUH PESANAN OTOMATIS MENGIKUTI FILTER KELOLA PESANAN */}
      <OrderSummaryModal
        isOpen={showOrderSummaryModal}
        onClose={() => setShowOrderSummaryModal(false)}
        orders={orders}
        filteredOrders={filteredOrders}
        filterLabel={activeFilterLabel}
        menuItems={menuItems}
        settings={settings}
      />

      {/* 📊 MODAL DASHBOARD LAPORAN KEUANGAN & BEST SELLER */}
      {showFinanceModal && (
        <ErrorBoundary fallbackTitle="Laporan Keuangan Sementara Tidak Dapat Dimuat">
          <FinancialReportModal
            isOpen={showFinanceModal}
            onClose={() => setShowFinanceModal(false)}
            orders={orders}
            menuItems={menuItems}
            settings={settings}
          />
        </ErrorBoundary>
      )}

      {/* 🖨️ MODAL PENGATURAN PRINTER KASIR (KASIR MINI) */}
      <PrinterSetupModal
        isOpen={showPrinterSetupModal}
        onClose={() => setShowPrinterSetupModal(false)}
      />

      {/* ✏️ MODAL EDIT PESANAN PELANGGAN */}
      {orderToEdit && (
        <EditOrderModal
          isOpen={Boolean(orderToEdit)}
          order={orderToEdit}
          menuItems={menuItems}
          onClose={() => setOrderToEdit(null)}
          onSaveOrder={async (updatedOrder) => {
            if (onUpdateOrder) {
              await onUpdateOrder(updatedOrder);
            }
            setOrderToEdit(null);
            setActionNotice(`✅ Pesanan #${updatedOrder.id} berhasil diperbarui!`);
            setTimeout(() => setActionNotice(null), 3500);
          }}
        />
      )}

      {/* 🍽️ MODAL EDIT MENU (Tambah, Kurangi/Hapus, Best Seller, Stok) */}
      {showMenuEditorModal && (
        <MenuEditorModal
          isOpen={showMenuEditorModal}
          onClose={() => setShowMenuEditorModal(false)}
          menuItems={menuItems}
          onSaveMenuItem={async (item: MenuItem & { originalNama?: string }) => {
            if (onSaveMenuItem) await onSaveMenuItem(item);
          }}
          onDeleteMenuItem={async (id: string) => {
            if (onDeleteMenuItem) await onDeleteMenuItem(id);
          }}
          onToggleBestSeller={async (id: string) => {
            if (onToggleBestSeller) await onToggleBestSeller(id);
          }}
          onToggleStatus={async (id: string) => {
            await onToggleMenuStatus(id);
          }}
          onResetMenu={onResetMenu}
        />
      )}
    </div>
  );
};
