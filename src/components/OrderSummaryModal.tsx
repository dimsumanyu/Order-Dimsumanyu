import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  FileText,
  Printer,
  Copy,
  Check,
  TrendingUp,
  ShoppingBag,
  UtensilsCrossed,
  Filter,
  DollarSign,
  Download,
  Clock,
  User,
  Phone
} from 'lucide-react';
import { OrderData, MenuItem, AppSettings } from '../types';
import { formatRupiah } from '../utils/whatsapp';

export type SummaryDatePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';
export type SummaryPeriodSelection = 'current_filter' | 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

export interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderData[];
  filteredOrders?: OrderData[];
  menuItems?: MenuItem[];
  settings?: AppSettings;
  initialPeriod?: SummaryDatePeriod;
  filterLabel?: string;
}

function parseDate(val: any, fallbackId?: string): Date | null {
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

export interface NormalizedOrderItem {
  nama: string;
  qty: number;
  harga: number;
  subtotal: number;
}

/**
 * Normalizes and extracts items from order.items or order.rincianMenu.
 * Strips trailing multipliers like (1x)/(2x), price tags like (Rp 25.000),
 * and matches against canonical menu items for consistent grouping.
 */
export function extractNormalizedItems(order: OrderData, menuItems: MenuItem[] = []): NormalizedOrderItem[] {
  const result: NormalizedOrderItem[] = [];
  if (!order) return result;

  const normalizeItem = (rawNama: string, rawQty: number = 1, rawHarga: number = 0): NormalizedOrderItem | null => {
    if (!rawNama || !rawNama.trim()) return null;
    let nama = rawNama.trim();
    let qty = Number(rawQty) || 1;

    // 1. Remove leading quantity prefix if present (e.g., "1x KUKUS MENTAI...")
    const leadingQtyMatch = nama.match(/^(\d+)\s*x\s+(.+)$/i);
    if (leadingQtyMatch) {
      qty = parseInt(leadingQtyMatch[1], 10) || qty;
      nama = leadingQtyMatch[2].trim();
    }

    // 2. Extract and remove trailing multiplier like "(1x)", "(2x)", "[2x]", "(x2)"
    const trailingMultMatch = nama.match(/[\(\[]\s*(\d+)?\s*x\s*(\d+)?\s*[\)\]]$/i);
    if (trailingMultMatch) {
      const mult = parseInt(trailingMultMatch[1] || trailingMultMatch[2] || '1', 10);
      if (mult > 0) {
        qty = (rawQty === 1 && !leadingQtyMatch) ? mult : qty;
      }
      nama = nama.replace(/[\(\[]\s*(\d+)?\s*x\s*(\d+)?\s*[\)\]]$/i, '').trim();
    }

    // 3. Remove price annotations like "(Rp 25.000)", "Rp 25.000", "Rp. 25000", etc.
    let itemHarga = rawHarga;
    const priceMatch = nama.match(/\(?Rp\.?\s*([0-9.,]+)\)?/i);
    if (priceMatch) {
      if (!itemHarga) {
        itemHarga = parseInt(priceMatch[1].replace(/[^0-9]/g, ''), 10) || 0;
      }
      nama = nama.replace(/\(?Rp\.?\s*[0-9.,]+\)?/gi, '').trim();
    }

    // 4. Clean extra punctuation, leading bullets/dashes, extra spaces
    nama = nama.replace(/^[•\-\*\.]\s*/, '').replace(/\s+/g, ' ').trim();
    if (!nama) return null;

    // 5. Match against known menuItems to ensure canonical casing and naming
    if (menuItems && menuItems.length > 0) {
      const upper = nama.toUpperCase();
      const compactUpper = upper.replace(/[^A-Z0-9]/g, '');
      const match = menuItems.find((m) => {
        const mUpper = m.nama.toUpperCase();
        const mCompact = mUpper.replace(/[^A-Z0-9]/g, '');
        return (
          mUpper === upper ||
          mCompact === compactUpper ||
          upper.includes(mUpper) ||
          mUpper.includes(upper)
        );
      });
      if (match) {
        nama = match.nama;
        if (!itemHarga) itemHarga = match.harga;
      } else {
        nama = upper;
      }
    } else {
      nama = nama.toUpperCase();
    }

    const subtotal = itemHarga > 0 ? itemHarga * qty : 0;
    return {
      nama,
      qty,
      harga: itemHarga,
      subtotal,
    };
  };

  if (Array.isArray(order.items) && order.items.length > 0) {
    order.items.forEach((it) => {
      const parsed = normalizeItem(it.nama, it.qty, it.harga);
      if (parsed) result.push(parsed);
    });
  } else if (order.rincianMenu) {
    // Split by newline or comma followed by item pattern
    const lines = order.rincianMenu.split(/\r?\n|,\s*(?=\d+x|\b[A-Za-z])/i).filter(Boolean);
    lines.forEach((l) => {
      const parsed = normalizeItem(l.trim(), 1, 0);
      if (parsed) result.push(parsed);
    });
  }

  return result;
}

export const OrderSummaryModal: React.FC<OrderSummaryModalProps> = ({
  isOpen,
  onClose,
  orders = [],
  filteredOrders: filteredOrdersProp,
  menuItems = [],
  settings,
  initialPeriod = 'today',
  filterLabel,
}) => {
  const [period, setPeriod] = useState<SummaryPeriodSelection>(() => {
    return filteredOrdersProp ? 'current_filter' : initialPeriod;
  });
  const [excludeCancelled, setExcludeCancelled] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Auto-sync with Kelola Pesanan filter whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (filteredOrdersProp) {
        setPeriod('current_filter');
      } else {
        setPeriod(initialPeriod);
      }
    }
  }, [isOpen, filteredOrdersProp, initialPeriod]);

  // Custom date range state (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    try {
      return new Date().toISOString().split('T')[0];
    } catch {
      return '2026-11-03';
    }
  }, []);

  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  const safeOrders = useMemo(() => {
    return Array.isArray(orders) ? orders.filter(Boolean) : [];
  }, [orders]);

  // Filter orders according to date and cancellation status
  const filteredOrders = useMemo(() => {
    // If set to 'current_filter', directly use the filteredOrders from Kelola Pesanan!
    if (period === 'current_filter' && filteredOrdersProp) {
      if (!excludeCancelled) return filteredOrdersProp.filter(Boolean);
      return filteredOrdersProp.filter((o) => o && o.status !== 'Dibatalkan');
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return safeOrders.filter((order) => {
      if (!order) return false;
      if (excludeCancelled && order.status === 'Dibatalkan') {
        return false;
      }

      const orderDate = parseDate(order.createdAt, order.id);
      if (!orderDate) return true; // fallback keep

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

      if (period === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(`${customStartDate}T00:00:00`) : new Date(0);
        const end = customEndDate ? new Date(`${customEndDate}T23:59:59.999`) : new Date();
        return orderDate >= start && orderDate <= end;
      }

      return true; // 'all'
    });
  }, [safeOrders, filteredOrdersProp, period, excludeCancelled, customStartDate, customEndDate]);

  // Calculations: Total omset, total porsi, rekap menu (Akumulasi pesanan identik)
  const summaryMetrics = useMemo(() => {
    let totalOmset = 0;
    let totalPortions = 0;
    const menuPortionsMap: Record<string, { nama: string; qty: number; revenue: number }> = {};

    filteredOrders.forEach((o) => {
      totalOmset += Number(o.totalHarga) || 0;
      const orderItems = extractNormalizedItems(o, menuItems);

      orderItems.forEach((it) => {
        totalPortions += it.qty;
        const key = it.nama.trim().toUpperCase();
        if (!menuPortionsMap[key]) {
          menuPortionsMap[key] = { nama: it.nama, qty: 0, revenue: 0 };
        }
        menuPortionsMap[key].qty += it.qty;
        menuPortionsMap[key].revenue += it.subtotal;
      });
    });

    // Urutkan dari porsi terbanyak (akumulasi transaksi yang difilter)
    const menuBreakdown = Object.values(menuPortionsMap)
      .filter((m) => m.qty > 0)
      .sort((a, b) => b.qty - a.qty);
    const avgOrderValue = filteredOrders.length > 0 ? Math.round(totalOmset / filteredOrders.length) : 0;

    return {
      totalOmset,
      totalPortions,
      totalOrders: filteredOrders.length,
      avgOrderValue,
      menuBreakdown,
    };
  }, [filteredOrders, menuItems]);

  const periodLabel = useMemo(() => {
    if (period === 'current_filter') return `Sesuai Kelola Pesanan (${filterLabel || 'Filter Aktif'})`;
    if (period === 'today') return 'Hari Ini';
    if (period === 'yesterday') return 'Kemarin';
    if (period === 'week') return '7 Hari Terakhir';
    if (period === 'month') return 'Bulan Ini';
    if (period === 'custom') return `${customStartDate} s/d ${customEndDate}`;
    return 'Semua Periode';
  }, [period, filterLabel, customStartDate, customEndDate]);

  // Formatter for clipboard WhatsApp text
  const generateSummaryText = () => {
    const divider = '----------------------------------------';
    const doubleDivider = '========================================';
    const lines: string[] = [];

    lines.push('📋 REKAP SUMMARY PESANAN DIMSUMANYU');
    lines.push(`Periode: ${periodLabel}`);
    lines.push(`Waktu Dibuat: ${new Date().toLocaleString('id-ID')}`);
    lines.push(doubleDivider);

    // Rekap Porsi Terjual (Akumulasi pesanan yang sama dalam transaksi yang difilter)
    if (summaryMetrics.menuBreakdown.length > 0) {
      lines.push('REKAP PORSI MENU (UNTUK DAPUR):');
      summaryMetrics.menuBreakdown.forEach((m, idx) => {
        lines.push(`${idx + 1}. ${m.qty}x ${m.nama}`);
      });
      lines.push(divider);
    }

    lines.push('DAFTAR PESANAN LENGKAP:');
    if (filteredOrders.length === 0) {
      lines.push('(Tidak ada pesanan pada periode ini)');
    } else {
      filteredOrders.forEach((o, idx) => {
        // 1. Nama pelanggan saja (tanpa ID & tanpa jam pemesanan)
        lines.push(`${idx + 1}. ${o.nama.toUpperCase()}`);
        if (o.phone) lines.push(`   HP: ${o.phone}`);

        // 2. Pesanan dibuat list poin ke bawah (tidak memanjang ke samping, bersih dari multiplier ganda)
        lines.push('   Pesanan:');
        const orderItems = extractNormalizedItems(o, menuItems);
        if (orderItems.length > 0) {
          orderItems.forEach((it) => {
            lines.push(`   • ${it.qty}x ${it.nama.toUpperCase()}`);
          });
        } else if (o.rincianMenu) {
          const menuLines = o.rincianMenu.split(/\r?\n|,\s*(?=\d+x|\b[A-Za-z])/i).filter(Boolean);
          menuLines.forEach((ml) => {
            lines.push(`   • ${ml.trim()}`);
          });
        }

        // 3. Total hanya nominal rupiah saja (tanpa status bayar)
        lines.push(`   Total: ${formatRupiah(o.totalHarga)}`);

        // 4. Catatan dicetak tebal (*...* di WhatsApp) jika ada
        const rawNote = (o.catatan || '').trim();
        if (rawNote && rawNote !== '-') {
          lines.push(`   *Catatan: ${rawNote}*`);
        }

        lines.push('');
      });
    }

    lines.push(doubleDivider);
    lines.push('DIMSUMANYU #SensasiNgedaging');
    return lines.join('\n');
  };

  const handleCopySummary = async () => {
    try {
      const text = generateSummaryText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Gagal menyalin ringkasan.');
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:w-full">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 print:bg-none print:text-black print:border-b-2 print:border-stone-900 print:p-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 print:hidden">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg tracking-tight">
                  Summary Seluruh Pesanan
                </h3>
                <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider print:hidden">
                  {periodLabel}
                </span>
              </div>
              <p className="text-white/80 text-xs">
                Rekap daftar pesanan lengkap: nama, pesanan, dan total jumlah pesanan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls (Hidden in Print) */}
        <div className="p-3 sm:p-4 bg-stone-50 border-b border-stone-200 space-y-3 shrink-0 print:hidden">
          {/* Active Filter Synchronization Notice */}
          {period === 'current_filter' && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-xs text-emerald-950 font-bold flex items-center justify-between gap-2 shadow-2xs">
              <span className="flex items-center gap-1.5 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>
                  Summary otomatis mengikuti filter Kelola Pesanan: <span className="text-emerald-700 underline underline-offset-2">{filterLabel || 'Filter Aktif'}</span> ({filteredOrders.length} Pesanan).
                </span>
              </span>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-black shrink-0">
                Otomatis Sinkron
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Period Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-stone-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-stone-400" />
                <span>Filter:</span>
              </span>

              {(
                [
                  ...(filteredOrdersProp
                    ? [
                        {
                          id: 'current_filter' as SummaryPeriodSelection,
                          label: `⚡ Sesuai Kelola Pesanan (${filterLabel || 'Filter Aktif'})`,
                        },
                      ]
                    : []),
                  { id: 'today' as SummaryPeriodSelection, label: 'Hari Ini' },
                  { id: 'yesterday' as SummaryPeriodSelection, label: 'Kemarin' },
                  { id: 'week' as SummaryPeriodSelection, label: '7 Hari Terakhir' },
                  { id: 'month' as SummaryPeriodSelection, label: 'Bulan Ini' },
                  { id: 'all' as SummaryPeriodSelection, label: 'Semua Waktu' },
                  { id: 'custom' as SummaryPeriodSelection, label: 'Pilih Tanggal' },
                ]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPeriod(item.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    period === item.id
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Exclude Cancelled Checkbox */}
            <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={excludeCancelled}
                onChange={(e) => setExcludeCancelled(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 accent-red-600 cursor-pointer"
              />
              <span>Abaikan Status Batal</span>
            </label>
          </div>

          {/* Custom Date Range Picker */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap pt-1 bg-white p-2.5 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-500 font-bold">Dari:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-stone-300 font-medium"
              />
              <span className="text-stone-500 font-bold">Sampai:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-stone-300 font-medium"
              />
            </div>
          )}
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 print:p-2 print:overflow-visible">
          {/* Print-Only Header */}
          <div className="hidden print:block text-center border-b border-stone-300 pb-2 mb-3">
            <h2 className="text-xl font-black">DIMSUMANYU - SUMMARY PESANAN</h2>
            <p className="text-xs text-stone-600 font-bold">
              Periode: {periodLabel} | Dicetak: {new Date().toLocaleString('id-ID')}
            </p>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">
                  Total Pesanan
                </span>
                <span className="text-lg font-black text-stone-900 leading-tight">
                  {summaryMetrics.totalOrders}
                </span>
                <span className="text-[10px] text-stone-400 block">transaksi</span>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">
                  Total Omset
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-700 leading-tight block">
                  {formatRupiah(summaryMetrics.totalOmset)}
                </span>
                <span className="text-[10px] text-stone-400 block">penerimaan kotor</span>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">
                  Total Porsi
                </span>
                <span className="text-lg font-black text-amber-800 leading-tight">
                  {summaryMetrics.totalPortions}
                </span>
                <span className="text-[10px] text-stone-400 block">porsi terjual</span>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">
                  Rata-rata/Order
                </span>
                <span className="text-base sm:text-lg font-black text-blue-800 leading-tight block">
                  {formatRupiah(summaryMetrics.avgOrderValue)}
                </span>
                <span className="text-[10px] text-stone-400 block">nilai keranjang</span>
              </div>
            </div>
          </div>

          {/* Rekap Porsi Menu Terjual (Kitchen Preparation / Breakdown Dapur) */}
          {summaryMetrics.menuBreakdown.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
                  <span>Rekap Porsi Terjual (Kebutuhan Dapur)</span>
                </h4>
                <span className="text-[11px] font-bold text-amber-800">
                  {summaryMetrics.menuBreakdown.length} varian menu
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {summaryMetrics.menuBreakdown.map((m, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-amber-300/80 rounded-xl px-2.5 py-1 text-xs shadow-2xs flex items-center gap-1.5"
                  >
                    <span className="font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
                      {m.qty}x
                    </span>
                    <span className="font-bold text-stone-800">{m.nama}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabel / List Pesanan Lengkap: Nama, Pesanan, Total Jumlah Pesanan */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-stone-800 flex items-center gap-1.5 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-stone-500" />
                <span>Daftar Pesanan Pelanggan ({filteredOrders.length})</span>
              </h4>
              <span className="text-[11px] text-stone-500 font-semibold">
                Periode: {periodLabel}
              </span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-stone-50 rounded-2xl p-8 text-center text-stone-400 text-xs border border-stone-200">
                Tidak ada data pesanan pada filter tanggal yang dipilih.
              </div>
            ) : (
              <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-100 text-stone-700 font-black border-b border-stone-200 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3 w-36">Waktu &amp; ID</th>
                        <th className="py-2.5 px-3 w-48">Nama Pelanggan</th>
                        <th className="py-2.5 px-3">Rincian Pesanan</th>
                        <th className="py-2.5 px-3 text-right w-32">Total Jumlah</th>
                        <th className="py-2.5 px-3 text-center w-28 print:hidden">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredOrders.map((order, idx) => {
                        const orderDate = parseDate(order.createdAt);
                        const dateFormatted = orderDate
                          ? orderDate.toLocaleString('id-ID', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-';

                        return (
                          <tr key={order.id} className="hover:bg-stone-50/80 transition">
                            {/* No */}
                            <td className="py-2.5 px-3 text-center font-bold text-stone-400">
                              {idx + 1}
                            </td>

                            {/* Waktu & ID */}
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-black text-stone-900 block text-[11px]">
                                #{order.id}
                              </span>
                              <span className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-stone-400" />
                                {dateFormatted}
                              </span>
                            </td>

                            {/* Nama Pelanggan */}
                            <td className="py-2.5 px-3">
                              <span className="font-black text-stone-900 block uppercase">
                                {order.nama}
                              </span>
                              {order.phone && (
                                <span className="text-[10px] text-stone-500 font-mono flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3 text-stone-400" />
                                  {order.phone}
                                </span>
                              )}
                            </td>

                            {/* Rincian Pesanan */}
                            <td className="py-2.5 px-3">
                              {(() => {
                                const normItems = extractNormalizedItems(order, menuItems);
                                if (normItems.length > 0) {
                                  return (
                                    <div className="space-y-0.5">
                                      {normItems.map((it, itemIdx) => (
                                        <div key={itemIdx} className="flex items-baseline gap-1 text-[11px]">
                                          <span className="font-black text-red-700 shrink-0">
                                            {it.qty}x
                                          </span>
                                          <span className="text-stone-800 font-medium">
                                            {it.nama}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return (
                                  <p className="text-[11px] text-stone-800 whitespace-pre-line leading-relaxed">
                                    {order.rincianMenu}
                                  </p>
                                );
                              })()}
                              {order.catatan && order.catatan.trim() !== '-' && (
                                <p className="text-[10px] text-amber-950 font-black mt-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-300 inline-block">
                                  Catatan: {order.catatan}
                                </p>
                              )}
                            </td>

                            {/* Total Jumlah Pesanan */}
                            <td className="py-2.5 px-3 text-right">
                              <span className="font-black text-stone-900 text-xs block">
                                {formatRupiah(order.totalHarga)}
                              </span>
                              <span className="text-[9.5px] text-stone-400 uppercase font-semibold">
                                {order.metodeBayar || 'Bayar'}
                              </span>
                            </td>

                            {/* Status (Hidden in print) */}
                            <td className="py-2.5 px-3 text-center print:hidden">
                              <span
                                className={`inline-block text-[9.5px] font-extrabold px-2 py-0.5 rounded-full ${
                                  order.status === 'Pesanan selesai'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : order.status === 'Pesanan siap'
                                    ? 'bg-blue-100 text-blue-800'
                                    : order.status === 'Pesanan sedang dimasak'
                                    ? 'bg-amber-100 text-amber-800'
                                    : order.status === 'Dibatalkan'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-stone-100 text-stone-800'
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-stone-100/90 font-black border-t-2 border-stone-300 text-stone-900">
                        <td colSpan={3} className="py-3 px-3 text-right uppercase text-[11px]">
                          Grand Total ({filteredOrders.length} Pesanan):
                        </td>
                        <td className="py-3 px-3 text-stone-600 font-bold text-xs">
                          {summaryMetrics.totalPortions} Porsi Dimsum
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-700 font-black text-sm">
                          {formatRupiah(summaryMetrics.totalOmset)}
                        </td>
                        <td className="print:hidden"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions (Hidden in Print) */}
        <div className="p-3 sm:p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
          <div className="text-xs text-stone-500 font-semibold">
            Menampilkan <span className="font-bold text-stone-900">{filteredOrders.length}</span> pesanan ({periodLabel})
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Copy Summary Text Button */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="bg-white hover:bg-stone-100 active:scale-95 text-stone-800 font-bold text-xs px-3.5 py-2 rounded-xl border border-stone-300 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Salin rekap teks rapi untuk dikirim ke WhatsApp dapur / grup pengelola"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin Teks Rekap (WA)'}</span>
            </button>

            {/* Print Summary Button */}
            <button
              type="button"
              onClick={handlePrintSummary}
              className="bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Cetak summary daftar pesanan ke printer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Cetak Summary</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
