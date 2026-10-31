import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Smartphone,
  Settings,
  Bluetooth,
  Wifi,
  Radio,
  ExternalLink
} from 'lucide-react';
import { OrderData, AppSettings, MenuItem } from '../types';
import { formatRupiah } from '../utils/whatsapp';
import {
  PrinterConfig,
  loadPrinterConfig,
  createEscPosBuffer,
  sendBluetoothEscPos,
  createRawBtUrl,
  isIosDevice,
  getLogoEscPosRaster
} from '../utils/printer';
import { PrinterSetupModal } from './PrinterSetupModal';

interface ThermalReceiptModalProps {
  order: OrderData | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsPrinted: (orderId: string) => Promise<void>;
  settings?: AppSettings;
  menuItems?: MenuItem[];
}

export type ReceiptMarkerStyle = 'bullet' | 'dash' | 'box' | 'none';

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
  onMarkAsPrinted,
  settings,
  menuItems,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPrinterSetup, setShowPrinterSetup] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(() => loadPrinterConfig());
  const [printFeedback, setPrintFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [includeLogo, setIncludeLogo] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('dimsumanyu_print_logo');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [markerStyle, setMarkerStyle] = useState<ReceiptMarkerStyle>(() => {
    try {
      return (localStorage.getItem('dimsumanyu_receipt_marker') as ReceiptMarkerStyle) || 'bullet';
    } catch {
      return 'bullet';
    }
  });

  const handleToggleLogo = (val: boolean) => {
    setIncludeLogo(val);
    try {
      localStorage.setItem('dimsumanyu_print_logo', String(val));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPrinterConfig(loadPrinterConfig());
      setPrintFeedback(null);
    }
  }, [isOpen]);

  const handleMarkerChange = (style: ReceiptMarkerStyle) => {
    setMarkerStyle(style);
    try {
      localStorage.setItem('dimsumanyu_receipt_marker', style);
    } catch {
      // ignore
    }
  };

  if (!isOpen || !order) return null;

  const orderDate = new Date(order.createdAt).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lastPrintedDate = order.lastPrintedAt
    ? new Date(order.lastPrintedAt).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  // Helper to resolve accurate unit price & subtotal even if parsed from sheet with 0
  const getItemPricing = (it: { id?: string; nama: string; qty: number; harga?: number; subtotal?: number }) => {
    let harga = it.harga || 0;
    let subtotal = it.subtotal || 0;
    if (harga === 0 || subtotal === 0) {
      if (menuItems && menuItems.length > 0) {
        const match = menuItems.find(
          (m) =>
            m.nama.toLowerCase().trim() === it.nama.toLowerCase().trim() ||
            it.nama.toLowerCase().includes(m.nama.toLowerCase()) ||
            m.nama.toLowerCase().includes(it.nama.toLowerCase())
        );
        if (match) {
          harga = match.harga;
          subtotal = match.harga * (it.qty || 1);
        }
      }
      if ((subtotal === 0 || harga === 0) && order?.items && order.items.length === 1 && order.totalHarga > 0) {
        subtotal = order.totalHarga;
        harga = Math.round(order.totalHarga / (it.qty || 1));
      }
    }
    return { harga, subtotal: subtotal || (harga * (it.qty || 1)) };
  };

  // Generate plain text receipt for mobile Bluetooth printing apps (RawBT, Bluetooth POS, etc.)
  const generateRawReceiptText = (): string => {
    const divider = '--------------------------------\n';
    const doubleDivider = '================================\n';
    let text = '';
    text += '          DIMSUMANYU            \n';
    text += '       #SensasiNgedaging        \n';
    text += `   WA: ${settings?.adminWaNumber || '085754623156'}   \n`;
    text += '       IG: @dimsumanyu          \n';
    text += divider;
    text += `No. Resi : #${order.id}\n`;
    text += `Tanggal  : ${orderDate}\n`;
    text += `Nama     : ${order.nama}\n`;
    text += `No. HP   : ${order.phone}\n`;
    if (order.opsiPengiriman === 'Diantar ke Alamat' && order.alamat) {
      text += `Alamat   : ${order.alamat}\n`;
    }
    text += `Bayar    : ${order.metodeBayar}\n`;
    text += `Status   : ${order.status}\n`;
    text += divider;
    text += 'RINCIAN PESANAN:\n';

    const getMarkerText = () => {
      if (markerStyle === 'bullet') return '• ';
      if (markerStyle === 'dash') return '- ';
      if (markerStyle === 'box') return '[ ] ';
      return '';
    };
    const marker = getMarkerText();

    if (order.items && order.items.length > 0) {
      order.items.forEach((it) => {
        const { harga, subtotal } = getItemPricing(it);
        const title = `${marker}${it.qty}x ${it.nama.toUpperCase()}`;
        const subtotalStr = formatRupiah(subtotal);

        if (it.qty > 1) {
          text += `${title}\n`;
          const unit = `   @ ${formatRupiah(harga)}`;
          const spaces = Math.max(1, 32 - unit.length - subtotalStr.length);
          text += `${unit}${' '.repeat(spaces)}${subtotalStr}\n`;
        } else {
          if (title.length + 1 + subtotalStr.length <= 32) {
            const spaces = 32 - title.length - subtotalStr.length;
            text += `${title}${' '.repeat(spaces)}${subtotalStr}\n`;
          } else {
            text += `${title}\n`;
            const spaces = Math.max(1, 32 - subtotalStr.length);
            text += `${' '.repeat(spaces)}${subtotalStr}\n`;
          }
        }
      });
    } else {
      const lines = order.rincianMenu.split('\n');
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) {
          text += `${marker}${trimmed}\n`;
        }
      });
    }

    text += divider;
    const totalLabel = 'TOTAL:';
    const totalVal = formatRupiah(order.totalHarga);
    const totalSpaces = Math.max(1, 32 - totalLabel.length - totalVal.length);
    text += `${totalLabel}${' '.repeat(totalSpaces)}${totalVal}\n`;

    if (order.catatan) {
      text += divider;
      text += `Catatan: ${order.catatan}\n`;
    }

    text += doubleDivider;
    text += '       *** TERIMA KASIH ***     \n';
    text += ' Selamat Menikmati #SensasiNgedaging\n';
    text += '        IG: @dimsumanyu         \n';
    text += '\n\n';
    return text;
  };

  // Generate ESC/POS commands for direct Web Bluetooth printing
  const generateEscPosLines = (): string[] => {
    const lines: string[] = [];
    lines.push('CMD_CENTER');
    lines.push('CMD_BOLD_ON');
    lines.push('DIMSUMANYU');
    lines.push('#SensasiNgedaging');
    lines.push('CMD_BOLD_OFF');
    lines.push(`WA: ${settings?.adminWaNumber || '085754623156'}`);
    lines.push('IG: @dimsumanyu');
    lines.push('--------------------------------');
    lines.push('CMD_LEFT');
    lines.push(`No. Resi : #${order.id}`);
    lines.push(`Tanggal  : ${orderDate}`);
    lines.push(`Nama     : ${order.nama}`);
    lines.push(`No. HP   : ${order.phone}`);
    if (order.opsiPengiriman === 'Diantar ke Alamat' && order.alamat) {
      lines.push(`Alamat   : ${order.alamat}`);
    }
    lines.push(`Bayar    : ${order.metodeBayar}`);
    lines.push(`Status   : ${order.status}`);
    lines.push('--------------------------------');
    lines.push('RINCIAN PESANAN:');

    const marker = markerStyle === 'bullet' ? '• ' : markerStyle === 'dash' ? '- ' : markerStyle === 'box' ? '[ ] ' : '';

    if (order.items && order.items.length > 0) {
      order.items.forEach((it) => {
        const { harga, subtotal } = getItemPricing(it);
        lines.push(`${marker}${it.qty}x ${it.nama.toUpperCase()}`);
        if (it.qty > 1) {
          lines.push(`   @ ${formatRupiah(harga)} = ${formatRupiah(subtotal)}`);
        } else {
          lines.push(`   ${formatRupiah(subtotal)}`);
        }
      });
    } else {
      order.rincianMenu.split('\n').filter(Boolean).forEach((line) => {
        lines.push(`${marker}${line.trim()}`);
      });
    }

    lines.push('--------------------------------');
    lines.push('CMD_BOLD_ON');
    lines.push(`TOTAL: ${formatRupiah(order.totalHarga)}`);
    lines.push('CMD_BOLD_OFF');

    if (order.catatan) {
      lines.push('--------------------------------');
      lines.push(`Catatan: ${order.catatan}`);
    }

    lines.push('================================');
    lines.push('CMD_CENTER');
    lines.push('*** TERIMA KASIH ***');
    lines.push('Selamat Menikmati #SensasiNgedaging');
    lines.push('IG: @dimsumanyu');
    lines.push('================================');
    return lines;
  };

  const handleCopyText = async () => {
    try {
      const raw = generateRawReceiptText();
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Gagal menyalin teks struk.');
    }
  };

  // Primary Print Action: Executes according to active printer mode
  const handleTriggerPrint = async () => {
    setIsPrinting(true);
    setPrintFeedback(null);

    try {
      // 1. Mark as printed in database / state
      await onMarkAsPrinted(order.id);

      // 2. Dispatch according to selected printer mode
      if (printerConfig.type === 'bluetooth') {
        const lines = generateEscPosLines();
        let logoRaster: Uint8Array | null = null;
        if (includeLogo) {
          try {
            logoRaster = await getLogoEscPosRaster();
          } catch (e) {
            console.warn('Could not load logo raster for bluetooth:', e);
          }
        }
        const buffer = createEscPosBuffer(lines, logoRaster);
        const sent = await sendBluetoothEscPos(buffer);

        if (sent) {
          setPrintFeedback({
            type: 'success',
            text: `Resi berhasil dicetak ke "${printerConfig.name}"!`,
          });
        } else {
          setPrintFeedback({
            type: 'error',
            text: 'Printer bluetooth terputus. Silakan klik "Hubungkan Printer" untuk menyambungkan kembali, atau gunakan dialog browser.',
          });
          // Fallback to browser print so user is never blocked
          setTimeout(() => window.print(), 300);
        }
      } else if (printerConfig.type === 'rawbt') {
        const raw = generateRawReceiptText();
        const url = createRawBtUrl(raw);
        window.location.href = url;
        setPrintFeedback({
          type: 'success',
          text: 'Perintah cetak dikirim ke aplikasi RawBT (Android).',
        });
      } else {
        // System default / WiFi fallback
        setTimeout(() => {
          window.print();
        }, 150);
      }
    } catch (e: any) {
      console.error('Print trigger error:', e);
      setPrintFeedback({
        type: 'error',
        text: 'Membuka dialog cetak browser sebagai alternatif...',
      });
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  // Direct trigger for RawBT
  const handlePrintViaRawBt = async () => {
    try {
      await onMarkAsPrinted(order.id);
      const raw = generateRawReceiptText();
      window.location.href = createRawBtUrl(raw);
    } catch (e) {
      console.error('RawBT trigger error:', e);
    }
  };

  return (
    <>
      <div
        id="thermal-receipt-modal"
        className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      >
        <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-auto animate-in zoom-in-95 duration-150">
          
          {/* Modal Top Bar (Hidden on print) */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 no-print">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Printer className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-stone-900 leading-tight">
                  Cetak Resi Thermal (Kertas 58mm)
                </h3>
                <p className="text-[11px] text-stone-500">
                  Format struk kasir &amp; dapur (Kasir Mini, Bluetooth, WiFi, RawBT)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* KASIR MINI STYLE: Printer Connection Status & Hubungkan Button (Hidden on print) */}
          <div className="bg-stone-900 text-white rounded-2xl p-3 flex items-center justify-between gap-2 no-print shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-stone-800 text-amber-400 flex items-center justify-center shrink-0">
                {printerConfig.type === 'bluetooth' ? (
                  <Bluetooth className="w-4 h-4 text-blue-400" />
                ) : printerConfig.type === 'wifi' ? (
                  <Wifi className="w-4 h-4 text-emerald-400" />
                ) : printerConfig.type === 'rawbt' ? (
                  <Smartphone className="w-4 h-4 text-purple-400" />
                ) : (
                  <Printer className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    printerConfig.type !== 'system' ? 'bg-emerald-400 animate-pulse' : 'bg-stone-400'
                  }`} />
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    Target Printer Kasir:
                  </span>
                </div>
                <p className="text-xs font-black text-white truncate">
                  {printerConfig.name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPrinterSetup(true)}
              className="shrink-0 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Buka menu hubungkan printer bluetooth/WiFi/RawBT ala Kasir Mini"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Hubungkan Printer</span>
            </button>
          </div>

          {/* iPhone Bluefy Tip (Shown on iOS if not connected via Bluetooth yet) */}
          {isIosDevice() && printerConfig.type !== 'bluetooth' && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-2.5 text-xs text-blue-950 flex items-center justify-between gap-2 no-print">
              <span className="text-[11px] leading-snug">
                📱 <b>Pengguna iPhone:</b> Buka link web ini di browser gratis <b>Bluefy</b> (App Store) agar Bluetooth Iware X-58BT II langsung terdeteksi.
              </span>
              <button
                type="button"
                onClick={() => setShowPrinterSetup(true)}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition"
              >
                Panduan iPhone
              </button>
            </div>
          )}

          {/* Print Feedback Alert (Hidden on print) */}
          {printFeedback && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2 border no-print ${
                printFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-red-50 text-red-900 border-red-200'
              }`}
            >
              {printFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <p className="font-medium">{printFeedback.text}</p>
            </div>
          )}

          {/* Print History Status Banner (Hidden on print) */}
          <div className="no-print">
            {order.printCount && order.printCount > 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-2.5 flex items-start gap-2 text-blue-900 text-xs">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold text-blue-950 flex items-center gap-1.5">
                    <span>Sudah Dicetak: {order.printCount}x</span>
                    <span className="bg-blue-200 text-blue-800 text-[9px] px-1.5 py-0.2 rounded font-black">
                      TERCATAT
                    </span>
                  </p>
                  <p className="text-[11px] text-blue-800">
                    Terakhir dicetak pada: <b>{lastPrintedDate}</b>
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-start gap-2 text-amber-900 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold text-amber-950">
                    Belum Pernah Dicetak
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Pesanan ini baru dan belum memiliki riwayat cetak struk.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Penanda Item Selector (Hidden on print) */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 no-print">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-stone-700">Penanda Menu di Resi:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleMarkerChange('bullet')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                  markerStyle === 'bullet'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
                title="Gunakan titik hitam bulat (•) di samping setiap menu"
              >
                <span className="text-base leading-none">•</span>
                <span>Titik (•)</span>
              </button>
              <button
                type="button"
                onClick={() => handleMarkerChange('dash')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                  markerStyle === 'dash'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
                title="Gunakan garis strip (-) di samping setiap menu"
              >
                <span className="font-bold leading-none">-</span>
                <span>Garis (-)</span>
              </button>
              <button
                type="button"
                onClick={() => handleMarkerChange('box')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                  markerStyle === 'box'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
                title="Gunakan kotak checklist untuk centang pulpen saat packing/dapur"
              >
                <span className="w-2.5 h-2.5 border border-current inline-block rounded-[1px]" />
                <span>Kotak Ceklis</span>
              </button>
            </div>

            {/* Logo Toggle */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-600">Logo Dimsum Anyu di Resi:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleToggleLogo(true)}
                  className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold transition cursor-pointer ${
                    includeLogo
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  ✓ Cetak Logo
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLogo(false)}
                  className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold transition cursor-pointer ${
                    !includeLogo
                      ? 'bg-stone-800 text-white shadow-xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Hanya Teks
                </button>
              </div>
            </div>
          </div>

          {/* 58mm Thermal Receipt Preview & Printable Target */}
          <div className="bg-stone-100 rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center border border-stone-200">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2 no-print flex items-center gap-1">
              <span>● Preview Struk Kertas 58mm</span>
            </p>

            {/* This element is what prints and matches 58mm format */}
            <div
              id="thermal-receipt-print-wrapper"
              className="thermal-receipt-printable bg-white text-black p-3 rounded-md shadow-sm border border-stone-200 text-[11px] font-mono leading-tight"
              style={{ width: '228px', maxWidth: '228px' }}
            >
              {/* Header Logo */}
              <div className="text-center pb-2">
                {includeLogo && (
                  <img
                    src="/assets/aistudio/WhatsApp_Image_2026-10-09_at_14.12.38_aa6284a2.jpeg"
                    alt="Logo Chef Dimsum Dimsumanyu"
                    className="w-16 h-16 mx-auto object-contain object-top mb-1 thermal-receipt-logo"
                  />
                )}
                <h1 className="text-base font-black tracking-wider text-black uppercase">
                  DIMSUMANYU
                </h1>
                <p className="text-[10px] font-bold text-black">
                  #SensasiNgedaging
                </p>
                <p className="text-[9px] text-black mt-0.5">
                  WA: {settings?.adminWaNumber || '0857-5462-3156'}
                </p>
                <p className="text-[9px] text-black">
                  IG: @dimsumanyu
                </p>
              </div>

              {/* Dotted separator */}
              <div className="border-b border-dashed border-black my-1.5" />

              {/* Order Meta */}
              <div className="text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>NO RESI:</span>
                  <span className="font-bold">#{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>WAKTU :</span>
                  <span>{orderDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>NAMA  :</span>
                  <span className="font-bold uppercase truncate max-w-[130px]">{order.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span>HP    :</span>
                  <span>{order.phone}</span>
                </div>
                {order.opsiPengiriman === 'Diantar ke Alamat' && order.alamat && (
                  <div className="pt-0.5">
                    <span className="block text-[9px]">ALAMAT PENGIRIMAN:</span>
                    <span className="font-medium text-[9px] break-words">{order.alamat}</span>
                  </div>
                )}
                <div className="flex justify-between pt-0.5">
                  <span>BAYAR :</span>
                  <span className="font-bold">{order.metodeBayar}</span>
                </div>
                <div className="flex justify-between">
                  <span>STATUS:</span>
                  <span className="font-bold uppercase">{order.status}</span>
                </div>
              </div>

              {/* Dotted separator */}
              <div className="border-b border-dashed border-black my-1.5" />

              {/* Menu Items List */}
              <div className="space-y-1.5 py-0.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-black">
                  ITEM PESANAN:
                </p>
                {order.items && order.items.length > 0 ? (
                  order.items.map((it, idx) => {
                    const { harga, subtotal } = getItemPricing(it);
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-start gap-1 flex-1 min-w-0">
                            {markerStyle === 'bullet' && (
                              <span className="font-black text-black select-none text-[11px] leading-tight shrink-0">•</span>
                            )}
                            {markerStyle === 'dash' && (
                              <span className="font-black text-black select-none text-[11px] leading-tight shrink-0">-</span>
                            )}
                            {markerStyle === 'box' && (
                              <span className="inline-block w-2.5 h-2.5 border border-black rounded-[1px] shrink-0 mt-0.5" />
                            )}
                            <span className="font-bold text-[10.5px] uppercase leading-tight">
                              {it.qty}x {it.nama}
                            </span>
                          </div>
                          <span className="font-bold text-[10.5px] shrink-0 text-right">
                            {formatRupiah(subtotal)}
                          </span>
                        </div>
                        {it.qty > 1 && (
                          <div className={`text-[9px] text-stone-600 ${markerStyle === 'none' ? 'pl-2' : 'pl-3.5'}`}>
                            @ {formatRupiah(harga)}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[10px] space-y-1">
                    {order.rincianMenu.split('\n').filter(Boolean).map((line, lIdx) => (
                      <div key={lIdx} className="flex items-start gap-1.5">
                        {markerStyle === 'bullet' && <span className="font-bold text-[11px] shrink-0">•</span>}
                        {markerStyle === 'dash' && <span className="font-bold text-[11px] shrink-0">-</span>}
                        {markerStyle === 'box' && <span className="inline-block w-2.5 h-2.5 border border-black rounded-[1px] shrink-0 mt-0.5" />}
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dotted separator */}
              <div className="border-b border-dashed border-black my-1.5" />

              {/* Totals */}
              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between font-black text-[12px] pt-0.5">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(order.totalHarga)}</span>
                </div>
              </div>

              {/* Notes if any */}
              {order.catatan && (
                <>
                  <div className="border-b border-dashed border-black my-1.5" />
                  <div className="text-[10px]">
                    <span className="font-bold">CATATAN:</span>
                    <p className="italic text-[9px] break-words mt-0.5">
                      {order.catatan}
                    </p>
                  </div>
                </>
              )}

              {/* Double divider for footer */}
              <div className="border-b-2 border-dashed border-black my-2" />

              {/* Footer */}
              <div className="text-center text-[9px] space-y-0.5 pt-0.5 pb-1">
                <p className="font-bold">*** TERIMA KASIH ***</p>
                <p>Selamat Menikmati #SensasiNgedaging</p>
                <p className="font-semibold">Instagram: @dimsumanyu</p>
                {order.printCount && order.printCount > 0 ? (
                  <p className="text-[8px] text-stone-600 pt-1">
                    [Cetak Ulang #{order.printCount + 1}]
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Action Buttons (Hidden on print) */}
          <div className="space-y-2 pt-1 no-print">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Primary Direct Print Button */}
              <button
                type="button"
                onClick={handleTriggerPrint}
                disabled={isPrinting}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                title={`Kirim perintah cetak langsung (${printerConfig.name})`}
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>
                  {isPrinting
                    ? 'Mencetak...'
                    : printerConfig.type === 'bluetooth'
                    ? `Cetak ke ${printerConfig.name}`
                    : printerConfig.type === 'rawbt'
                    ? 'Cetak via RawBT'
                    : 'Cetak Resi (58mm)'}
                </span>
              </button>

              {/* Mobile RawBT / Helper shortcut */}
              <button
                type="button"
                onClick={handlePrintViaRawBt}
                className="w-full bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-purple-200 active:scale-95"
                title="Cetak langsung ke aplikasi RawBT di HP Android tanpa setting bluetooth"
              >
                <Smartphone className="w-4 h-4 text-purple-600" />
                <span>Cetak via RawBT (HP)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Copy Plain Text */}
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-stone-200 active:scale-95"
                title="Salin teks struk"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                    <span>Salin Teks Struk</span>
                  </>
                )}
              </button>

              {/* Hubungkan Printer Kasir */}
              <button
                type="button"
                onClick={() => setShowPrinterSetup(true)}
                className="w-full bg-amber-50 hover:bg-amber-100 text-stone-900 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-amber-300 active:scale-95"
                title="Atur koneksi printer bluetooth, WiFi atau RawBT"
              >
                <Settings className="w-3.5 h-3.5 text-amber-600" />
                <span>Kelola Printer</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-stone-400 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-stone-400" />
                <span>Mode: {printerConfig.type.toUpperCase()} ({printerConfig.name})</span>
              </span>

              <button
                type="button"
                onClick={onClose}
                className="text-stone-500 hover:text-stone-800 font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PENGATURAN PRINTER KASIR (KASIR MINI) */}
      <PrinterSetupModal
        isOpen={showPrinterSetup}
        onClose={() => {
          setShowPrinterSetup(false);
          setPrinterConfig(loadPrinterConfig());
        }}
        onPrinterUpdated={(newCfg) => {
          setPrinterConfig(newCfg);
        }}
      />
    </>
  );
};
