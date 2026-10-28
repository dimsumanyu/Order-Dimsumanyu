import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Bluetooth,
  Wifi,
  Usb,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Play,
  RotateCw,
  ExternalLink,
  Check,
  Radio
} from 'lucide-react';
import {
  PrinterConfig,
  loadPrinterConfig,
  savePrinterConfig,
  scanAndConnectBluetooth,
  sendBluetoothEscPos,
  createEscPosBuffer,
  generateTestReceiptLines,
  createRawBtUrl,
} from '../utils/printer';

interface PrinterSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrinterUpdated?: (config: PrinterConfig) => void;
}

export const PrinterSetupModal: React.FC<PrinterSetupModalProps> = ({
  isOpen,
  onClose,
  onPrinterUpdated,
}) => {
  const [config, setConfig] = useState<PrinterConfig>(loadPrinterConfig());
  const [activeTab, setActiveTab] = useState<'bluetooth' | 'wifi' | 'rawbt' | 'usb' | 'system'>('bluetooth');
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [wifiIp, setWifiIp] = useState(config.ipAddress || '192.168.1.100');
  const [wifiPort, setWifiPort] = useState(config.port ? String(config.port) : '9100');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = loadPrinterConfig();
      setConfig(current);
      setActiveTab(current.type);
      if (current.ipAddress) setWifiIp(current.ipAddress);
      if (current.port) setWifiPort(String(current.port));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. BLUETOOTH SCANNING (IN-APP BLE DIRECT DISCOVERY)
  const handleScanBluetooth = async () => {
    setIsScanning(true);
    setStatusMessage({
      type: 'info',
      text: 'Membuka jendela pencarian Bluetooth... Silakan pilih printer thermal Anda dari daftar perangkat.',
    });

    const res = await scanAndConnectBluetooth();
    setIsScanning(false);

    if (res.success) {
      const newCfg: PrinterConfig = {
        type: 'bluetooth',
        name: res.deviceName || 'Thermal POS Printer',
        paperWidth: config.paperWidth || 58,
      };
      setConfig(newCfg);
      savePrinterConfig(newCfg);
      onPrinterUpdated?.(newCfg);
      setStatusMessage({
        type: 'success',
        text: `Berhasil terhubung ke "${res.deviceName}"! Printer siap digunakan untuk cetak struk kasir.`,
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'Gagal menyambungkan ke printer bluetooth.',
      });
    }
  };

  // 2. WIFI / NETWORK SAVE
  const handleSaveWifi = () => {
    if (!wifiIp.trim()) {
      setStatusMessage({ type: 'error', text: 'Masukkan alamat IP printer terlebih dahulu.' });
      return;
    }
    const newCfg: PrinterConfig = {
      type: 'wifi',
      name: `Printer WiFi (${wifiIp.trim()})`,
      ipAddress: wifiIp.trim(),
      port: parseInt(wifiPort.trim(), 10) || 9100,
      paperWidth: config.paperWidth || 58,
    };
    setConfig(newCfg);
    savePrinterConfig(newCfg);
    onPrinterUpdated?.(newCfg);
    setStatusMessage({
      type: 'success',
      text: `Pengaturan printer WiFi tersimpan (${wifiIp}:${wifiPort || 9100}).`,
    });
  };

  // 3. SET RAWBT MODE (ANDROID)
  const handleSelectRawBt = () => {
    const newCfg: PrinterConfig = {
      type: 'rawbt',
      name: 'Driver Kasir RawBT (Android)',
      paperWidth: config.paperWidth || 58,
    };
    setConfig(newCfg);
    savePrinterConfig(newCfg);
    onPrinterUpdated?.(newCfg);
    setStatusMessage({
      type: 'success',
      text: 'Mode RawBT Driver aktif! Saat klik cetak, pesanan langsung dikirim ke printer lewat aplikasi RawBT.',
    });
  };

  // 4. SET SYSTEM PRINT MODE
  const handleSelectSystem = () => {
    const newCfg: PrinterConfig = {
      type: 'system',
      name: 'Printer Bawaan (Browser)',
      paperWidth: config.paperWidth || 58,
    };
    setConfig(newCfg);
    savePrinterConfig(newCfg);
    onPrinterUpdated?.(newCfg);
    setStatusMessage({
      type: 'success',
      text: 'Mode Cetak Browser aktif (format kertas 58mm).',
    });
  };

  // 5. TEST PRINT
  const handleTestPrint = async () => {
    setIsTesting(true);
    setStatusMessage(null);

    try {
      const lines = generateTestReceiptLines(config.name, config.type);

      if (config.type === 'bluetooth') {
        const buffer = createEscPosBuffer(lines);
        const sent = await sendBluetoothEscPos(buffer);
        if (sent) {
          setStatusMessage({ type: 'success', text: 'Perintah tes cetak berhasil dikirim ke printer bluetooth!' });
        } else {
          setStatusMessage({
            type: 'error',
            text: 'Printer bluetooth terputus. Silakan klik tombol "Cari & Sambungkan Printer Bluetooth" kembali.',
          });
        }
      } else if (config.type === 'rawbt') {
        const rawText = lines
          .filter((l) => !l.startsWith('CMD_'))
          .join('\n');
        const url = createRawBtUrl(rawText);
        window.location.href = url;
        setStatusMessage({ type: 'success', text: 'Perintah tes cetak dikirim ke aplikasi RawBT.' });
      } else {
        // Fallback browser window print
        window.print();
        setStatusMessage({ type: 'info', text: 'Dialog cetak terbuka. Pilih printer 58mm Anda lalu klik Cetak.' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: 'Gagal menjalankan tes cetak: ' + (e?.message || 'Error') });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-auto animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Printer className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-stone-900 leading-tight">
                Hubungkan Printer Kasir
              </h3>
              <p className="text-[11px] text-stone-500">
                Pencarian printer thermal ala Kasir Mini (Bluetooth, WiFi, USB, RawBT)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Printer Status Card */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-3 h-3 rounded-full shrink-0 ${
              config.type !== 'system' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`} />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Printer Kasir Terpilih:
              </span>
              <p className="text-xs font-black text-stone-900 truncate">
                {config.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestPrint}
            disabled={isTesting}
            className="shrink-0 bg-stone-900 hover:bg-stone-800 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            title="Kirim struk pengujian untuk memastikan printer menyala & mencetak"
          >
            <Play className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>{isTesting ? 'Mencetak...' : 'Tes Cetak'}</span>
          </button>
        </div>

        {/* Status Message Alert */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-start gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <RotateCw className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />
            )}
            <p className="leading-relaxed font-medium">{statusMessage.text}</p>
          </div>
        )}

        {/* Tab Selection (Connection Types ala Kasir Mini) */}
        <div>
          <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
            Pilih Jalur Koneksi Printer:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('bluetooth')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition cursor-pointer ${
                activeTab === 'bluetooth'
                  ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Bluetooth className="w-4 h-4" />
              <span>Bluetooth</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wifi')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition cursor-pointer ${
                activeTab === 'wifi'
                  ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span>WiFi / LAN</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rawbt')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition cursor-pointer ${
                activeTab === 'rawbt'
                  ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>RawBT (HP)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('system')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition cursor-pointer ${
                activeTab === 'system'
                  ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Bawaan</span>
            </button>
          </div>
        </div>

        {/* Tab Content 1: Bluetooth Direct In-App Discovery */}
        {activeTab === 'bluetooth' && (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Bluetooth className="w-4 h-4" />
              </div>
              <div className="text-xs text-stone-600 space-y-1">
                <p className="font-extrabold text-stone-900">
                  Pencarian Bluetooth Langsung di Aplikasi
                </p>
                <p className="leading-relaxed">
                  Printer thermal mini (POS-58, PT-210, Panda, Goojprt) <b>tidak akan muncul</b> di menu Bluetooth bawaan HP karena menggunakan sinyal BLE/SPP khusus kasir.
                </p>
                <p className="leading-relaxed text-stone-500 text-[11px]">
                  Nyalakan printer Anda, lalu klik tombol di bawah untuk mendeteksi printer langsung dari aplikasi.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleScanBluetooth}
              disabled={isScanning}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50"
            >
              <Bluetooth className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Sedang Memindai Printer...' : '🔍 Cari & Sambungkan Printer Bluetooth'}</span>
            </button>
          </div>
        )}

        {/* Tab Content 2: WiFi / Network IP */}
        {activeTab === 'wifi' && (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Wifi className="w-4 h-4" />
              </div>
              <div className="text-xs text-stone-600 space-y-1">
                <p className="font-extrabold text-stone-900">
                  Printer WiFi / Jaringan LAN
                </p>
                <p className="leading-relaxed">
                  Untuk printer kasir yang tersambung ke jaringan WiFi outlet yang sama. Masukkan alamat IP printer thermal Anda:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                  Alamat IP Printer:
                </label>
                <input
                  type="text"
                  value={wifiIp}
                  onChange={(e) => setWifiIp(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-mono outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                  Port:
                </label>
                <input
                  type="text"
                  value={wifiPort}
                  onChange={(e) => setWifiPort(e.target.value)}
                  placeholder="9100"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-mono outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveWifi}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Simpan &amp; Terapkan Printer WiFi</span>
            </button>
          </div>
        )}

        {/* Tab Content 3: RawBT Driver (Android Standard for Kasir Mini) */}
        {activeTab === 'rawbt' && (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="text-xs text-stone-600 space-y-1">
                <p className="font-extrabold text-stone-900">
                  Aplikasi RawBT (Solusi Terpopuler di HP Android)
                </p>
                <p className="leading-relaxed">
                  Sama persis seperti aplikasi Kasir Mini di Android: RawBT adalah driver cetak yang dapat mengenali <b>SEMUA jenis printer thermal</b> (Bluetooth, WiFi, USB) tanpa kendala pairing.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSelectRawBt}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-purple-600/20 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Pilih Mode RawBT untuk Cetak Struk</span>
              </button>

              <a
                href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-white hover:bg-stone-100 text-stone-800 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-stone-300 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                <span>Download Aplikasi RawBT di Google Play Store (Gratis)</span>
              </a>
            </div>
          </div>
        )}

        {/* Tab Content 4: System Print */}
        {activeTab === 'system' && (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-stone-200 text-stone-800 flex items-center justify-center shrink-0 mt-0.5">
                <Printer className="w-4 h-4" />
              </div>
              <div className="text-xs text-stone-600 space-y-1">
                <p className="font-extrabold text-stone-900">
                  Dialog Cetak Bawaan (Browser / OS)
                </p>
                <p className="leading-relaxed">
                  Membuka kotak dialog cetak browser (format resi kertas gulung 58mm). Cocok jika printer sudah diinstal drivernya di komputer/laptop Windows/Mac.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSelectSystem}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 text-amber-400" />
              <span>Gunakan Dialog Cetak Browser</span>
            </button>
          </div>
        )}

        {/* Footer / Close */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <p className="text-[11px] text-stone-400">
            Format: Kertas Struk 58mm Thermal
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
