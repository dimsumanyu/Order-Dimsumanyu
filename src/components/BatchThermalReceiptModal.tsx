import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Bluetooth,
  FileText,
  Layers,
  Settings
} from 'lucide-react';
import { OrderData, AppSettings, MenuItem } from '../types';
import { formatRupiah } from '../utils/whatsapp';
import {
  PrinterConfig,
  loadPrinterConfig,
  createEscPosBuffer,
  sendBluetoothEscPos,
  createRawBtUrl,
  getLogoEscPosRaster
} from '../utils/printer';
import { PrinterSetupModal } from './PrinterSetupModal';
import { ReceiptMarkerStyle } from './ThermalReceiptModal';

interface BatchThermalReceiptModalProps {
  orders: OrderData[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsPrinted: (orderId: string) => Promise<void>;
  settings?: AppSettings;
  menuItems?: MenuItem[];
  title?: string;
}

export const BatchThermalReceiptModal: React.FC<BatchThermalReceiptModalProps> = ({
  orders = [],
  isOpen,
  onClose,
  onMarkAsPrinted,
  settings,
  menuItems = [],
  title = 'Cetak Semua Resi Sekaligus'
}) => {
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(loadPrinterConfig());
  const [showPrinterSetup, setShowPrinterSetup] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printFeedback, setPrintFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [includeLogo, setIncludeLogo] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('dimsumanyu_print_logo');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [markerStyle, setMarkerStyle] = useState<ReceiptMarkerStyle>(() => {
    try {
      return (localStorage.getItem('dimsumanyu_receipt_marker') as ReceiptMarkerStyle) || 'box';
    } catch {
      return 'box';
    }
  });

  useEffect(() => {
    if (isOpen) {
      setPrinterConfig(loadPrinterConfig());
      setPrintFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen || orders.length === 0) return null;

  const getItemPricing = (item: { id: string; nama: string; qty: number; harga?: number; subtotal?: number }) => {
    let harga = Number(item.harga) || 0;
    if (harga <= 0 && menuItems.length > 0) {
      const match = menuItems.find(
        (m) =>
          m.id === item.id ||
          m.nama.trim().toLowerCase() === item.nama.trim().toLowerCase()
      );
      if (match) harga = Number(match.harga) || 0;
    }
    const qty = Number(item.qty) || 1;
    const subtotal = harga * qty;
    return { harga, subtotal };
  };

  const generateSingleRawText = (order: OrderData) => {
    const divider = '--------------------------------';
    const doubleDivider = '================================';
    const lines: string[] = [];

    const orderDate = new Date(order.createdAt).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    lines.push('          DIMSUMANYU          ');
    lines.push('       #SensasiNgedaging      ');
    lines.push('       WA: 6285754623156      ');
    lines.push('       IG: @dimsumanyu        ');
    lines.push(divider);
    lines.push(`NO RESI : #${order.id}`);
    lines.push(`WAKTU   : ${orderDate}`);
    lines.push(`NAMA    : ${order.nama.toUpperCase()}`);
    lines.push(`HP      : ${order.phone || '-'}`);
    lines.push(divider);
    lines.push('ITEM PESANAN:');

    const marker = markerStyle === 'bullet' ? '• ' : markerStyle === 'dash' ? '- ' : markerStyle === 'box' ? '☐ ' : '';

    if (order.items && order.items.length > 0) {
      order.items.forEach((it) => {
        const { harga, subtotal } = getItemPricing(it);
        lines.push(`${marker}${it.qty}X ${it.nama.toUpperCase()}`);
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

    lines.push(divider);
    const rawItemsSubtotal = order.items && order.items.length > 0
      ? order.items.reduce((sum, it) => sum + getItemPricing(it).subtotal, 0)
      : order.totalHarga;

    let ongkirVal = Number(order.ongkir) || 0;
    if (ongkirVal === 0 && order.totalHarga > rawItemsSubtotal && rawItemsSubtotal > 0) {
      ongkirVal = Math.max(0, order.totalHarga - rawItemsSubtotal);
    }
    const hasOngkir = ongkirVal > 0 || (order.totalHarga > rawItemsSubtotal && rawItemsSubtotal > 0);
    const displaySubtotal = hasOngkir ? (order.totalHarga - ongkirVal) : rawItemsSubtotal;

    if (hasOngkir) {
      lines.push(`SUBTOTAL: ${formatRupiah(displaySubtotal)}`);
      lines.push(`ONGKIR: ${formatRupiah(ongkirVal)}`);
      lines.push(divider);
    }

    lines.push(`TOTAL: ${formatRupiah(order.totalHarga)}`);

    if (order.catatan) {
      lines.push(divider);
      lines.push(`CATATAN: ${order.catatan}`);
    }

    lines.push(doubleDivider);
    lines.push('       *** TERIMA KASIH ***     ');
    lines.push('         Selamat Menikmati      ');
    lines.push('         #SensasiNgedaging      ');
    lines.push('       Instagram: @dimsumanyu   ');
    lines.push(doubleDivider);
    return lines.join('\n');
  };

  const generateAllRawText = () => {
    return orders
      .map((o, idx) => {
        const single = generateSingleRawText(o);
        return `[STRUK ${idx + 1} DARI ${orders.length}]\n` + single;
      })
      .join('\n\n\n--------------------------------\n✂️ POTONG KERTAS DISINI\n--------------------------------\n\n\n');
  };

  const handleCopyAll = async () => {
    try {
      const text = generateAllRawText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Gagal menyalin struk.');
    }
  };

  const handleTriggerPrint = async () => {
    setIsPrinting(true);
    setPrintFeedback(null);

    try {
      // 1. Mark all orders as printed
      for (const o of orders) {
        await onMarkAsPrinted(o.id);
      }

      // 2. Dispatch according to printer mode
      if (printerConfig.type === 'bluetooth') {
        let logoRaster: Uint8Array | null = null;
        if (includeLogo) {
          try {
            logoRaster = await getLogoEscPosRaster();
          } catch (e) {
            console.warn('Could not load logo raster:', e);
          }
        }

        let printedCount = 0;
        for (const order of orders) {
          const lines: string[] = [];
          const orderDate = new Date(order.createdAt).toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          lines.push('CMD_CENTER');
          lines.push('CMD_BOLD_ON');
          lines.push('DIMSUMANYU');
          lines.push('#SensasiNgedaging');
          lines.push('CMD_BOLD_OFF');
          lines.push('WA: 6285754623156');
          lines.push('IG: @dimsumanyu');
          lines.push('--------------------------------');
          lines.push('CMD_LEFT');
          lines.push(`No. Resi : #${order.id}`);
          lines.push(`Tanggal  : ${orderDate}`);
          lines.push(`Nama     : ${order.nama}`);
          lines.push(`No. HP   : ${order.phone || '-'}`);
          lines.push('--------------------------------');
          lines.push('RINCIAN PESANAN:');

          const marker = markerStyle === 'bullet' ? '• ' : markerStyle === 'dash' ? '- ' : markerStyle === 'box' ? '☐ ' : '';

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
          lines.push('Selamat Menikmati');
          lines.push('#SensasiNgedaging');
          lines.push('IG: @dimsumanyu');
          lines.push('================================');

          const buffer = createEscPosBuffer(lines, logoRaster, 1);
          await sendBluetoothEscPos(buffer);
          printedCount++;
          // Wait 400ms between tickets to prevent buffer overrun on thermal chip
          await new Promise((r) => setTimeout(r, 450));
        }

        setPrintFeedback({
          type: 'success',
          text: `Berhasil mencetak ${printedCount} resi ke printer bluetooth "${printerConfig.name}"!`,
        });
      } else if (printerConfig.type === 'rawbt') {
        const raw = generateAllRawText();
        const url = createRawBtUrl(raw);
        window.location.href = url;
        setPrintFeedback({
          type: 'success',
          text: `Mengirim ${orders.length} resi ke RawBT Android...`,
        });
      } else {
        // System / Browser print
        window.print();
        setPrintFeedback({
          type: 'success',
          text: `Dialog cetak browser dibuka untuk ${orders.length} resi.`,
        });
      }
    } catch (err: any) {
      setPrintFeedback({
        type: 'error',
        text: `Gagal mencetak: ${err?.message || 'Error'}`,
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintViaRawBt = () => {
    const raw = generateAllRawText();
    const url = createRawBtUrl(raw);
    window.location.href = url;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-red-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 no-print">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Printer className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base sm:text-lg">
                    {title}
                  </h3>
                  <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {orders.length} RESI
                  </span>
                </div>
                <p className="text-stone-300 text-xs">
                  Cetak {orders.length} lembar struk thermal 58mm sekaligus tanpa jeda kosong
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Options Bar (no-print) */}
          <div className="bg-stone-50 border-b border-stone-200 p-3 sm:p-3.5 space-y-2 shrink-0 no-print">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-stone-600">
                  Target Printer:
                </span>
                <span className="bg-white px-2.5 py-1 rounded-xl text-xs font-black text-stone-800 border border-stone-200 shadow-2xs flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5 text-red-600" />
                  <span>{printerConfig.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPrinterSetup(true)}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
                >
                  Ubah Printer
                </button>
              </div>

              {/* Marker selector */}
              <div className="flex items-center gap-1 text-[11px]">
                <span className="font-bold text-stone-500 mr-1">Penanda:</span>
                <button
                  type="button"
                  onClick={() => setMarkerStyle('box')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    markerStyle === 'box'
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-600 border border-stone-200'
                  }`}
                >
                  [✓] Kotak
                </button>
                <button
                  type="button"
                  onClick={() => setMarkerStyle('bullet')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    markerStyle === 'bullet'
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-600 border border-stone-200'
                  }`}
                >
                  • Titik
                </button>
                <button
                  type="button"
                  onClick={() => setMarkerStyle('dash')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    markerStyle === 'dash'
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-600 border border-stone-200'
                  }`}
                >
                  - Garis
                </button>
              </div>
            </div>

            {/* Print feedback banner */}
            {printFeedback && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                  printFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                    : 'bg-red-50 text-red-900 border border-red-300'
                }`}
              >
                {printFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{printFeedback.text}</span>
              </div>
            )}
          </div>

          {/* Scrollable Printable Container */}
          <div className="p-3 sm:p-5 overflow-y-auto space-y-4 print:p-0 print:overflow-visible bg-stone-100 print:bg-white flex-1">
            <div className="text-center no-print">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                ● PREVIEW {orders.length} STRUK RESI THERMAL 58MM
              </span>
            </div>

            {/* List of 58mm Receipts */}
            <div className="space-y-4 flex flex-col items-center">
              {orders.map((order, orderIdx) => {
                const orderDate = new Date(order.createdAt).toLocaleString('id-ID', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={order.id}
                    className="w-full max-w-[340px] bg-white text-black p-3.5 rounded-xl shadow-xs border border-stone-200 text-[11px] font-mono leading-tight print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none break-after-page page-break"
                    style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                  >
                    {/* Header */}
                    <div className="text-center space-y-1 mb-2">
                      {includeLogo && (
                        <div className="flex justify-center mb-1">
                          <img
                            src="/assets/aistudio/WhatsApp_Image_2026-10-09_at_14.12.38_aa6284a2.jpeg"
                            alt="Logo Dimsum Anyu"
                            className="w-16 h-16 mx-auto object-contain object-top mb-1 thermal-receipt-logo"
                            onError={(e) => {
                              // Fallback logo
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <h3 className="font-extrabold text-[13px] tracking-tight whitespace-nowrap">
                        DIMSUMANYU
                      </h3>
                      <p className="text-[10px] font-bold text-stone-800 whitespace-nowrap">
                        #SensasiNgedaging
                      </p>
                      <div className="text-[9px] text-stone-600 space-y-0.2 whitespace-nowrap">
                        <p>WA: 6285754623156</p>
                        <p>IG: @dimsumanyu</p>
                      </div>
                    </div>

                    {/* Dotted separator */}
                    <div className="border-b border-dashed border-black my-1.5" />

                    {/* Meta info */}
                    <div className="space-y-0.5 text-[10px]">
                      <div className="flex justify-between">
                        <span className="font-bold">NO RESI:</span>
                        <span className="font-bold">#{order.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-700">WAKTU :</span>
                        <span>{orderDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-700">NAMA :</span>
                        <span className="font-bold uppercase">{order.nama}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-700">HP :</span>
                        <span>{order.phone || '-'}</span>
                      </div>
                    </div>

                    {/* Dotted separator */}
                    <div className="border-b border-dashed border-black my-1.5" />

                    {/* Item list */}
                    <div className="space-y-1 my-1.5">
                      <div className="font-bold text-[10px] text-stone-800">
                        ITEM PESANAN:
                      </div>

                      {order.items && order.items.length > 0 ? (
                        order.items.map((it, idx) => {
                          const { harga, subtotal } = getItemPricing(it);
                          return (
                            <div key={idx} className="space-y-0.2">
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex items-start gap-1 font-bold">
                                  {markerStyle === 'bullet' && <span className="text-[11px] shrink-0">•</span>}
                                  {markerStyle === 'dash' && <span className="text-[11px] shrink-0">-</span>}
                                  {markerStyle === 'box' && (
                                    <span className="inline-block w-2.5 h-2.5 border border-black rounded-[1px] shrink-0 mt-0.5" />
                                  )}
                                  <span>{it.qty}X {it.nama.toUpperCase()}</span>
                                </div>
                                <span className="font-bold shrink-0">
                                  {formatRupiah(subtotal)}
                                </span>
                              </div>
                              {it.qty > 1 && (
                                <div className="text-[9px] text-stone-600 pl-3.5">
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

                    {/* Total / Breakdown */}
                    {(() => {
                      const rawSubtotal = order.items && order.items.length > 0
                        ? order.items.reduce((sum, it) => sum + getItemPricing(it).subtotal, 0)
                        : order.totalHarga;
                      let ongkirVal = Number(order.ongkir) || 0;
                      if (ongkirVal === 0 && order.totalHarga > rawSubtotal && rawSubtotal > 0) {
                        ongkirVal = Math.max(0, order.totalHarga - rawSubtotal);
                      }
                      const hasOngkir = ongkirVal > 0 || (order.totalHarga > rawSubtotal && rawSubtotal > 0);
                      const displaySubtotal = hasOngkir ? (order.totalHarga - ongkirVal) : rawSubtotal;

                      if (hasOngkir) {
                        return (
                          <div className="space-y-0.5 text-[10.5px]">
                            <div className="flex justify-between text-stone-700">
                              <span>SUBTOTAL:</span>
                              <span>{formatRupiah(displaySubtotal)}</span>
                            </div>
                            <div className="flex justify-between text-stone-700">
                              <span>ONGKIR:</span>
                              <span>{formatRupiah(ongkirVal)}</span>
                            </div>
                            <div className="border-b border-dashed border-black my-1" />
                            <div className="flex justify-between font-black text-[12px] pt-0.5">
                              <span>TOTAL:</span>
                              <span>{formatRupiah(order.totalHarga)}</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="flex justify-between font-black text-[12px] pt-0.5">
                          <span>TOTAL:</span>
                          <span>{formatRupiah(order.totalHarga)}</span>
                        </div>
                      );
                    })()}

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

                    {/* Divider */}
                    <div className="border-b-2 border-dashed border-black my-1.5" />

                    {/* Footer strictly on single lines without wrapping */}
                    <div className="text-center text-[9.5px] space-y-0.5 pt-0.5 pb-0">
                      <p className="font-bold whitespace-nowrap">*** TERIMA KASIH ***</p>
                      <p className="whitespace-nowrap">Selamat Menikmati</p>
                      <p className="font-bold whitespace-nowrap">#SensasiNgedaging</p>
                      <p className="font-semibold whitespace-nowrap">Instagram: @dimsumanyu</p>
                      <p className="text-[8px] text-stone-500 pt-0.5 whitespace-nowrap">
                        Struk {orderIdx + 1} dari {orders.length}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons Bar (no-print) */}
          <div className="p-3 sm:p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0 no-print">
            <div className="text-xs text-stone-600 font-bold">
              Total <span className="text-stone-900">{orders.length}</span> Resi Siap Cetak
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Copy all text */}
              <button
                type="button"
                onClick={handleCopyAll}
                className="bg-white hover:bg-stone-100 text-stone-800 font-bold text-xs px-3.5 py-2 rounded-xl border border-stone-300 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Salin seluruh teks struk untuk disimpan / RawBT"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Semua Teks'}</span>
              </button>

              {/* RawBT HP button */}
              <button
                type="button"
                onClick={handlePrintViaRawBt}
                className="bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs px-3.5 py-2 rounded-xl border border-purple-200 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Cetak via aplikasi RawBT di HP Android"
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                <span>RawBT (HP)</span>
              </button>

              {/* Primary Print Button */}
              <button
                type="button"
                onClick={handleTriggerPrint}
                disabled={isPrinting}
                className="bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-50"
                title="Cetak semua resi sekarang"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {isPrinting
                    ? 'Sedang Mencetak...'
                    : `Cetak Semua (${orders.length} Resi)`}
                </span>
              </button>

              {/* Close */}
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

      {/* Printer Setup Modal for changing printer */}
      <PrinterSetupModal
        isOpen={showPrinterSetup}
        onClose={() => {
          setShowPrinterSetup(false);
          setPrinterConfig(loadPrinterConfig());
        }}
        onPrinterUpdated={(cfg: PrinterConfig) => setPrinterConfig(cfg)}
      />
    </>
  );
};
