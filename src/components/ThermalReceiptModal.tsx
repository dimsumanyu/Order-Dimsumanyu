import React, { useState } from 'react';
import {
  Printer,
  X,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Smartphone
} from 'lucide-react';
import { OrderData, AppSettings } from '../types';
import { formatRupiah } from '../utils/whatsapp';

interface ThermalReceiptModalProps {
  order: OrderData | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsPrinted: (orderId: string) => Promise<void>;
  settings?: AppSettings;
}

export type ReceiptMarkerStyle = 'bullet' | 'dash' | 'box' | 'none';

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
  onMarkAsPrinted,
  settings,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [markerStyle, setMarkerStyle] = useState<ReceiptMarkerStyle>(() => {
    try {
      return (localStorage.getItem('dimsumanyu_receipt_marker') as ReceiptMarkerStyle) || 'bullet';
    } catch {
      return 'bullet';
    }
  });

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
    text += `Layanan  : ${order.opsiPengiriman}\n`;
    if (order.opsiPengiriman === 'Diantar ke Alamat') {
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
        const title = `${marker}${it.qty}x ${it.nama.toUpperCase()}`;
        const subtotal = formatRupiah(it.subtotal);

        if (it.qty > 1) {
          text += `${title}\n`;
          const unit = `   @ ${formatRupiah(it.harga)}`;
          const spaces = Math.max(1, 32 - unit.length - subtotal.length);
          text += `${unit}${' '.repeat(spaces)}${subtotal}\n`;
        } else {
          if (title.length + 1 + subtotal.length <= 32) {
            const spaces = 32 - title.length - subtotal.length;
            text += `${title}${' '.repeat(spaces)}${subtotal}\n`;
          } else {
            text += `${title}\n`;
            const spaces = Math.max(1, 32 - subtotal.length);
            text += `${' '.repeat(spaces)}${subtotal}\n`;
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

  const handleTriggerPrint = async () => {
    setIsPrinting(true);
    try {
      // Record print history count & timestamp
      await onMarkAsPrinted(order.id);
      
      // Brief timeout to ensure DOM update, then launch browser print
      setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 150);
    } catch (e) {
      console.error('Print trigger error:', e);
      setIsPrinting(false);
      window.print();
    }
  };

  return (
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
                Format struk kasir &amp; dapur khusus printer bluetooth
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

        {/* Print History Status Banner (Hidden on print) */}
        <div className="no-print">
          {order.printCount && order.printCount > 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-start gap-2.5 text-blue-900 text-xs">
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
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-amber-900 text-xs">
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
              <span>Titik Hitam (•)</span>
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
            {/* Header Logo as requested by user */}
            <div className="text-center pb-2">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-10-09_at_14.12.38_aa6284a2.jpeg"
                alt="Logo Chef Dimsum Dimsumanyu"
                className="w-20 h-20 mx-auto object-contain object-top mb-1"
              />
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
              <div className="flex justify-between">
                <span>OPSI  :</span>
                <span className="font-bold uppercase">{order.opsiPengiriman}</span>
              </div>
              {order.opsiPengiriman === 'Diantar ke Alamat' && (
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
                order.items.map((it, idx) => (
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
                        {formatRupiah(it.subtotal)}
                      </span>
                    </div>
                    {it.qty > 1 && (
                      <div className={`text-[9px] text-stone-600 ${markerStyle === 'none' ? 'pl-2' : 'pl-3.5'}`}>
                        @ {formatRupiah(it.harga)}
                      </div>
                    )}
                  </div>
                ))
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
            {/* Direct Print Button */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              disabled={isPrinting}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
              title="Kirim perintah cetak langsung ke printer Bluetooth / USB"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{isPrinting ? 'Menyiapkan...' : 'Cetak ke Printer (58mm)'}</span>
            </button>

            {/* Copy Plain Text for mobile bluetooth apps */}
            <button
              type="button"
              onClick={handleCopyText}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-stone-200 active:scale-95"
              title="Salin teks struk jika memakai aplikasi Bluetooth Print / RawBT di HP"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Teks Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-500" />
                  <span>Salin Teks Struk</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-stone-400 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-stone-400" />
              <span>Kompatibel: Bluetooth POS, RawBT, USB Thermal</span>
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
  );
};
