import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  BarChart3,
  Calendar,
  Award,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Truck,
  Copy,
  Check,
  Printer,
  MessageCircle,
  Clock,
  Sparkles,
  ChevronDown,
  Percent,
  Layers,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { OrderData, MenuItem, AppSettings } from '../types';
import { formatRupiah, createWhatsAppUrl } from '../utils/whatsapp';

export type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'all' | 'custom';
export type BestSellerSort = 'qty' | 'revenue';

interface FinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderData[];
  menuItems: MenuItem[];
  settings?: AppSettings;
  onSelectOrder?: (order: OrderData) => void;
}

export const FinancialReportModal: React.FC<FinancialReportModalProps> = ({
  isOpen,
  onClose,
  orders,
  menuItems,
  settings,
  onSelectOrder
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [excludeCancelled, setExcludeCancelled] = useState<boolean>(true);
  const [bestSellerSort, setBestSellerSort] = useState<BestSellerSort>('qty');
  const [copiedWA, setCopiedWA] = useState(false);

  // Custom date range state (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  if (!isOpen) return null;

  // Filter orders by date & status
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    return orders.filter((order) => {
      // Status filter
      if (excludeCancelled && order.status === 'Dibatalkan') {
        return false;
      }

      const orderDate = new Date(order.createdAt);
      if (isNaN(orderDate.getTime())) return true; // fallback if date parse fails

      if (period === 'today') {
        return (
          orderDate.getFullYear() === today.getFullYear() &&
          orderDate.getMonth() === today.getMonth() &&
          orderDate.getDate() === today.getDate()
        );
      }

      if (period === 'yesterday') {
        return (
          orderDate.getFullYear() === yesterday.getFullYear() &&
          orderDate.getMonth() === yesterday.getMonth() &&
          orderDate.getDate() === yesterday.getDate()
        );
      }

      if (period === 'week') {
        return orderDate >= sevenDaysAgo && orderDate <= now;
      }

      if (period === 'month') {
        return orderDate >= firstDayThisMonth && orderDate <= now;
      }

      if (period === 'last_month') {
        return orderDate >= firstDayLastMonth && orderDate <= lastDayLastMonth;
      }

      if (period === 'custom') {
        const start = new Date(`${customStartDate}T00:00:00`);
        const end = new Date(`${customEndDate}T23:59:59.999`);
        return orderDate >= start && orderDate <= end;
      }

      return true; // 'all'
    });
  }, [orders, period, excludeCancelled, customStartDate, customEndDate]);

  // Aggregate Financial KPI Metrics
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.totalHarga || 0), 0);
  }, [filteredOrders]);

  const totalOrdersCount = filteredOrders.length;
  const averageOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

  // Aggregate Best Seller Menus
  const bestSellerList = useMemo(() => {
    const itemMap = new Map<
      string,
      {
        id: string;
        nama: string;
        kategori: string;
        qty: number;
        revenue: number;
      }
    >();

    filteredOrders.forEach((order) => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((it) => {
          const key = it.nama.trim().toUpperCase();
          const existing = itemMap.get(key);

          // Find category if possible
          const matchedMenu = menuItems.find(
            (m) => m.nama.trim().toUpperCase() === key || m.id === it.id
          );
          const kategori = matchedMenu ? matchedMenu.kategori : 'DIMSUM';

          if (existing) {
            existing.qty += it.qty;
            existing.revenue += it.subtotal || it.harga * it.qty;
          } else {
            itemMap.set(key, {
              id: it.id || key,
              nama: it.nama,
              kategori,
              qty: it.qty,
              revenue: it.subtotal || it.harga * it.qty
            });
          }
        });
      }
    });

    const list = Array.from(itemMap.values());
    if (bestSellerSort === 'qty') {
      list.sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
    } else {
      list.sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);
    }
    return list;
  }, [filteredOrders, menuItems, bestSellerSort]);

  const totalPortionsSold = useMemo(() => {
    return bestSellerList.reduce((sum, i) => sum + i.qty, 0);
  }, [bestSellerList]);

  // Daily Sales Breakdown (for visual chart)
  const dailySalesData = useMemo(() => {
    const map = new Map<string, { dateLabel: string; revenue: number; orderCount: number; timestamp: number }>();

    filteredOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

      const curr = map.get(key);
      if (curr) {
        curr.revenue += o.totalHarga;
        curr.orderCount += 1;
      } else {
        map.set(key, {
          dateLabel: label,
          revenue: o.totalHarga,
          orderCount: 1,
          timestamp: new Date(key).getTime()
        });
      }
    });

    const sorted = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
    const maxRev = Math.max(...sorted.map((s) => s.revenue), 1);

    return sorted.map((s) => ({
      ...s,
      percentage: Math.round((s.revenue / maxRev) * 100)
    }));
  }, [filteredOrders]);

  // Payment Method Breakdown
  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {
      QRIS: { count: 0, total: 0 },
      'Transfer Bank': { count: 0, total: 0 },
      'Tunai (COD / Ambil di Tempat)': { count: 0, total: 0 }
    };

    filteredOrders.forEach((o) => {
      const method = o.metodeBayar || 'Tunai (COD / Ambil di Tempat)';
      if (!counts[method]) {
        counts[method] = { count: 0, total: 0 };
      }
      counts[method].count += 1;
      counts[method].total += o.totalHarga;
    });

    return counts;
  }, [filteredOrders]);

  // Delivery Method Breakdown
  const deliveryBreakdown = useMemo(() => {
    let deliveryCount = 0;
    let pickupCount = 0;

    filteredOrders.forEach((o) => {
      if (o.opsiPengiriman === 'Diantar ke Alamat') {
        deliveryCount++;
      } else {
        pickupCount++;
      }
    });

    return { deliveryCount, pickupCount };
  }, [filteredOrders]);

  // Get active period human readable label
  const getPeriodLabel = (): string => {
    if (period === 'today') return 'Hari Ini';
    if (period === 'yesterday') return 'Kemarin';
    if (period === 'week') return '7 Hari Terakhir';
    if (period === 'month') return 'Bulan Ini';
    if (period === 'last_month') return 'Bulan Lalu';
    if (period === 'custom') return `${customStartDate} s/d ${customEndDate}`;
    return 'Semua Waktu';
  };

  // Generate WhatsApp summary text
  const generateWhatsAppSummary = (): string => {
    const periodLabel = getPeriodLabel();
    let text = `*📊 REKAP LAPORAN KEUANGAN & PENJUALAN*\n`;
    text += `*DIMSUMANYU #SensasiNgedaging*\n`;
    text += `📅 Periode: *${periodLabel}*\n`;
    text += `-------------------------------------------\n`;
    text += `💰 *Total Omset:* ${formatRupiah(totalRevenue)}\n`;
    text += `📦 *Total Pesanan:* ${totalOrdersCount} Transaksi\n`;
    text += `🥟 *Total Porsi Terjual:* ${totalPortionsSold} Porsi\n`;
    text += `🎯 *Rata-rata / Order (AOV):* ${formatRupiah(averageOrderValue)}\n`;
    text += `-------------------------------------------\n`;

    text += `*🏆 TOP 5 MENU PALING LARIS:*\n`;
    if (bestSellerList.length > 0) {
      bestSellerList.slice(0, 5).forEach((item, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        text += `${medal} *${item.nama}*\n`;
        text += `   ↳ Terjual: ${item.qty} porsi (${formatRupiah(item.revenue)})\n`;
      });
    } else {
      text += `(Belum ada data menu terjual pada periode ini)\n`;
    }
    text += `-------------------------------------------\n`;

    text += `*💳 METODE PEMBAYARAN:*\n`;
    Object.entries(paymentBreakdown).forEach(([method, data]) => {
      if (data.count > 0) {
        text += `• ${method}: ${formatRupiah(data.total)} (${data.count} trx)\n`;
      }
    });

    text += `-------------------------------------------\n`;
    text += `*🚚 PENGIRIMAN:*\n`;
    text += `• Diantar ke Alamat: ${deliveryBreakdown.deliveryCount} pesanan\n`;
    text += `• Ambil di Outlet: ${deliveryBreakdown.pickupCount} pesanan\n`;
    text += `-------------------------------------------\n`;
    text += `_Laporan otomatis dibuat dari Panel Admin DIMSUMANYU_`;

    return text;
  };

  const handleCopyWA = async () => {
    try {
      const summary = generateWhatsAppSummary();
      await navigator.clipboard.writeText(summary);
      setCopiedWA(true);
      setTimeout(() => setCopiedWA(false), 2500);
    } catch {
      alert('Gagal menyalin ringkasan ke clipboard.');
    }
  };

  const handleSendWA = () => {
    const summary = generateWhatsAppSummary();
    const adminPhone = settings?.adminWaNumber || '085754623156';
    const url = createWhatsAppUrl(adminPhone, summary);
    window.open(url, '_blank');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-stone-200 space-y-5 my-auto animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        
        {/* Top Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-100 no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-900 leading-tight">
                  Laporan Keuangan &amp; Penjualan
                </h2>
                <span className="bg-red-50 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-200">
                  DIMSUMANYU
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Dashboard omset, analisis menu best seller, dan performa transaksi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrintReport}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition cursor-pointer"
              title="Cetak Laporan / Simpan PDF"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition cursor-pointer"
              title="Tutup Dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="space-y-4 overflow-y-auto pr-1">

          {/* Filter Bar (Period buttons, status toggle, custom range) */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 space-y-2.5 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-stone-600" />
                <span className="text-xs font-bold text-stone-800">Filter Periode:</span>
              </div>

              {/* Toggle Exclude Cancelled */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-stone-600">
                <input
                  type="checkbox"
                  checked={excludeCancelled}
                  onChange={(e) => setExcludeCancelled(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Kecualikan Pesanan Dibatalkan</span>
              </label>
            </div>

            {/* Quick Period Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'today', label: 'Hari Ini' },
                { id: 'yesterday', label: 'Kemarin' },
                { id: 'week', label: '7 Hari Terakhir' },
                { id: 'month', label: 'Bulan Ini' },
                { id: 'last_month', label: 'Bulan Lalu' },
                { id: 'all', label: 'Semua Waktu' },
                { id: 'custom', label: 'Rentang Kustom...' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setPeriod(btn.id as PeriodFilter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    period === btn.id
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers (visible only when 'custom' is selected) */}
            {period === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-200/60 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-stone-600">Dari:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-medium outline-none focus:border-red-600"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-stone-600">Sampai:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-medium outline-none focus:border-red-600"
                  />
                </div>
                <span className="text-[11px] text-stone-500 italic">
                  (Filter berlaku inklusif dari 00:00 s/d 23:59)
                </span>
              </div>
            )}
          </div>

          {/* Active Period Indicator Badge */}
          <div className="flex items-center justify-between text-xs px-1">
            <p className="text-stone-500 font-medium">
              Menampilkan data transaksi: <b className="text-stone-900 font-bold">{getPeriodLabel()}</b>
            </p>
            <span className="bg-stone-100 text-stone-700 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
              {totalOrdersCount} Transaksi Ditemukan
            </span>
          </div>

          {/* Key KPI Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Total Omset */}
            <div className="bg-red-50/70 border border-red-200 p-3.5 rounded-2xl space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-700">
                  Total Omset
                </span>
                <DollarSign className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-base sm:text-xl font-black text-red-600 truncate">
                {formatRupiah(totalRevenue)}
              </p>
              <p className="text-[10px] text-red-700/80 font-medium">
                Omset bersih periode {getPeriodLabel().toLowerCase()}
              </p>
            </div>

            {/* 2. Total Pesanan */}
            <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-2xl space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                  Total Pesanan
                </span>
                <ShoppingBag className="w-4 h-4 text-stone-600" />
              </div>
              <p className="text-base sm:text-xl font-black text-stone-900">
                {totalOrdersCount} <span className="text-xs font-semibold text-stone-500">trx</span>
              </p>
              <p className="text-[10px] text-stone-500 font-medium">
                Jumlah transaksi masuk
              </p>
            </div>

            {/* 3. Total Porsi Terjual */}
            <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-2xl space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                  Porsi Terjual
                </span>
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-base sm:text-xl font-black text-stone-900">
                {totalPortionsSold} <span className="text-xs font-semibold text-stone-500">porsi</span>
              </p>
              <p className="text-[10px] text-stone-500 font-medium">
                Total item dimsum terdistribusi
              </p>
            </div>

            {/* 4. Rata-Rata per Order (AOV) */}
            <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-2xl space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                  Rata-rata Order
                </span>
                <Percent className="w-4 h-4 text-stone-600" />
              </div>
              <p className="text-base sm:text-lg font-black text-stone-900 truncate">
                {formatRupiah(averageOrderValue)}
              </p>
              <p className="text-[10px] text-stone-500 font-medium">
                AOV (Average Order Value)
              </p>
            </div>
          </div>

          {/* Daily Sales Trend Chart (Only if > 1 day or has data) */}
          {dailySalesData.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-red-600" />
                  <h3 className="font-extrabold text-xs sm:text-sm text-stone-900">
                    Tren Penjualan Harian
                  </h3>
                </div>
                <span className="text-[11px] text-stone-400">
                  {dailySalesData.length} hari dengan transaksi
                </span>
              </div>

              {/* Bar Chart Visual */}
              <div className="pt-2 pb-1">
                <div className="h-32 flex items-end gap-2 sm:gap-3 overflow-x-auto pb-2 border-b border-stone-100">
                  {dailySalesData.map((d, i) => (
                    <div key={i} className="flex-1 min-w-[48px] flex flex-col items-center gap-1.5 group">
                      <span className="text-[10px] font-bold text-stone-700 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                        {formatRupiah(d.revenue)}
                      </span>
                      <div
                        className="w-full bg-red-100 hover:bg-red-500 rounded-t-lg transition relative cursor-pointer"
                        style={{ height: `${Math.max(12, d.percentage)}%` }}
                        title={`${d.dateLabel}: ${formatRupiah(d.revenue)} (${d.orderCount} pesanan)`}
                      >
                        <div
                          className="w-full h-full bg-red-600 rounded-t-lg"
                          style={{ opacity: 0.85 }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-stone-500 truncate w-full text-center">
                        {d.dateLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section: Menu Best Seller (Paling Laris) */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs sm:text-sm text-stone-900">
                    Menu Paling Laris (Best Seller)
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Diurutkan berdasarkan performa periode {getPeriodLabel().toLowerCase()}
                  </p>
                </div>
              </div>

              {/* Sort selector for best seller */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[11px] text-stone-500 font-medium">Urutkan:</span>
                <button
                  type="button"
                  onClick={() => setBestSellerSort('qty')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    bestSellerSort === 'qty'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  Porsi Terbanyak
                </button>
                <button
                  type="button"
                  onClick={() => setBestSellerSort('revenue')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    bestSellerSort === 'revenue'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  Omset Tertinggi
                </button>
              </div>
            </div>

            {/* Best Seller List */}
            {bestSellerList.length > 0 ? (
              <div className="space-y-2">
                {bestSellerList.map((item, idx) => {
                  const contributionPct = totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0;
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isTop1
                          ? 'bg-amber-50/60 border-amber-300/80 shadow-xs'
                          : isTop2
                          ? 'bg-stone-50 border-stone-200'
                          : isTop3
                          ? 'bg-orange-50/40 border-orange-200'
                          : 'bg-white border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {/* Left: Medal rank, title, category */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isTop1
                              ? 'bg-amber-500 text-white shadow-xs'
                              : isTop2
                              ? 'bg-stone-400 text-white'
                              : isTop3
                              ? 'bg-amber-700 text-white'
                              : 'bg-stone-100 text-stone-600 border border-stone-200'
                          }`}
                        >
                          {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${idx + 1}`}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">
                              {item.nama}
                            </span>
                            <span className="text-[9px] font-bold bg-stone-200/70 text-stone-700 px-1.5 py-0.2 rounded uppercase">
                              {item.kategori}
                            </span>
                            {isTop1 && (
                              <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.2 rounded-full uppercase">
                                Terlaris #1
                              </span>
                            )}
                          </div>

                          {/* Progress bar contribution */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="w-24 sm:w-36 bg-stone-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-red-600 h-full rounded-full"
                                style={{ width: `${Math.min(100, Math.max(5, contributionPct))}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-stone-500 font-semibold">
                              {contributionPct}% dari total omset
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantity & Revenue */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-stone-400">Porsi Terjual</p>
                          <p className="text-xs sm:text-sm font-black text-stone-900">
                            {item.qty} Porsi
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-stone-400">Total Omset</p>
                          <p className="text-xs sm:text-sm font-black text-red-600">
                            {formatRupiah(item.revenue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-stone-500 text-xs space-y-2.5 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
                <p className="italic text-stone-400">
                  Belum ada data pesanan pada periode <b>{getPeriodLabel()}</b>.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPeriod('week')}
                    className="px-3 py-1 bg-white hover:bg-stone-100 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer border border-stone-200"
                  >
                    Lihat 7 Hari Terakhir
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('month')}
                    className="px-3 py-1 bg-white hover:bg-stone-100 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer border border-stone-200"
                  >
                    Lihat Bulan Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('all')}
                    className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-xs transition cursor-pointer border border-red-200"
                  >
                    Lihat Semua Transaksi ({orders.length})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Breakdown Grid: Metode Pembayaran & Pengiriman */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payment Method Breakdown */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                <CreditCard className="w-4 h-4 text-stone-700" />
                <h4 className="font-extrabold text-xs text-stone-900">
                  Distribusi Metode Pembayaran
                </h4>
              </div>

              <div className="space-y-2 text-xs">
                {Object.entries(paymentBreakdown).map(([method, data]) => {
                  const pct = totalRevenue > 0 ? Math.round((data.total / totalRevenue) * 100) : 0;
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-stone-800">{method}</span>
                        <span className="font-extrabold text-stone-900">
                          {formatRupiah(data.total)}{' '}
                          <span className="text-[10px] font-normal text-stone-500">
                            ({data.count} trx - {pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-stone-800 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery Option Breakdown */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                <Truck className="w-4 h-4 text-stone-700" />
                <h4 className="font-extrabold text-xs text-stone-900">
                  Distribusi Opsi Pengiriman
                </h4>
              </div>

              <div className="space-y-2.5 text-xs pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-stone-800">Diantar ke Alamat (Delivery)</span>
                    <span className="font-black text-stone-900">
                      {deliveryBreakdown.deliveryCount} Pesanan
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-red-600 h-full rounded-full"
                      style={{
                        width: `${
                          totalOrdersCount > 0
                            ? Math.round((deliveryBreakdown.deliveryCount / totalOrdersCount) * 100)
                            : 0
                        }%`
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-stone-800">Ambil di Outlet (Pickup)</span>
                    <span className="font-black text-stone-900">
                      {deliveryBreakdown.pickupCount} Pesanan
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{
                        width: `${
                          totalOrdersCount > 0
                            ? Math.round((deliveryBreakdown.pickupCount / totalOrdersCount) * 100)
                            : 0
                        }%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Transaction List in this period */}
          {filteredOrders.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-stone-700" />
                  <h4 className="font-extrabold text-xs text-stone-900">
                    Daftar Transaksi Periode Ini ({filteredOrders.length})
                  </h4>
                </div>
                <span className="text-[10px] text-stone-400">
                  Urutan terbaru ke terlama
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-stone-100 text-xs">
                {filteredOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="py-2 flex items-center justify-between gap-2 hover:bg-stone-50 rounded-lg px-1 transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-stone-900 text-[11px]">
                          #{ord.id}
                        </span>
                        <span className="text-stone-400">•</span>
                        <span className="font-bold text-stone-800 truncate max-w-[120px] sm:max-w-[200px]">
                          {ord.nama}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500">
                        {new Date(ord.createdAt).toLocaleString('id-ID')} ({ord.metodeBayar})
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-red-600 text-xs">
                        {formatRupiah(ord.totalHarga)}
                      </p>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-block ${
                          ord.status === 'Pesanan selesai'
                            ? 'bg-emerald-50 text-emerald-700'
                            : ord.status === 'Dibatalkan'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Actions (Hidden on Print) */}
        <div className="border-t border-stone-100 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 no-print shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* WhatsApp Rekap Action */}
            <button
              type="button"
              onClick={handleSendWA}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="Kirim ringkasan laporan keuangan via WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Kirim Rekap WA</span>
            </button>

            {/* Copy Rekap Action */}
            <button
              type="button"
              onClick={handleCopyWA}
              className="flex-1 sm:flex-none bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-stone-200 active:scale-95"
              title="Salin ringkasan teks untuk catatan kasir"
            >
              {copiedWA ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-600" />
                  <span>Salin Teks Rekap</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrintReport}
              className="flex-1 sm:flex-none bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Cetak / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-stone-500 hover:text-stone-800 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
