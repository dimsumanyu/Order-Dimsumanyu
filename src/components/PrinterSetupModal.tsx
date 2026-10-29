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
  Radio,
  Copy,
  Info
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
  isIosDevice,
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
  const [activeTab, setActiveTab] = useState<'bluetooth' | 'iphone' | 'wifi' | 'rawbt' | 'system'>('bluetooth');
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [wifiIp, setWifiIp] = useState(config.ipAddress || '192.168.123.100');
  const [wifiPort, setWifiPort] = useState(config.port ? String(config.port) : '9100');
  const [isTesting, setIsTesting] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = loadPrinterConfig();
      setConfig(current);
      const iosDetected = isIosDevice();
      setIsIos(iosDetected);
      if (iosDetected && current.type === 'system') {
        setActiveTab('iphone');
      } else {
        setActiveTab(current.type === 'wifi' ? 'wifi' : current.type === 'rawbt' ? 'rawbt' : 'bluetooth');
      }
      if (current.ipAddress) setWifiIp(current.ipAddress);
      if (current.port) setWifiPort(String(current.port));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const adminUrl = typeof window !== 'undefined' ? `${window.location.origin}/?admin=true` : 'https://order-dimsumanyu.vercel.app/?admin=true';

  const handleCopyAdminLink = async () => {
    try {
      await navigator.clipboard.writeText(adminUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  // 1. BLUETOOTH SCANNING (IN-APP BLE DIRECT DISCOVERY)
  const handleScanBluetooth = async () => {
    setIsScanning(true);
    setStatusMessage({
      type: 'info',
      text: 'Membuka jendela pencarian Bluetooth... Nyalakan printer Iware X-58BT II Anda.',
    });

    const res = await scanAndConnectBluetooth();
    setIsScanning(false);

    if (res.success) {
      const newCfg: PrinterConfig = {
        type: 'bluetooth',
        name: res.deviceName || 'Iware X-58BT II',
        paperWidth: 58,
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
          setStatusMessage({ type: 'success', text: 'Perintah tes cetak berhasil dikirim ke printer bluetooth Iware!' });
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
                Hubungkan Printer Iware X-58BT II
              </h3>
              <p className="text-[11px] text-stone-500">
                Spesifikasi terkonfirmasi: Thermal USB + Bluetooth (58mm)
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

        {/* Special iPhone Alert Banner (Shown if iOS device detected) */}
        {isIos && (
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-[11px] mt-0.5">
                iOS
              </div>
              <div className="text-xs text-blue-950 space-y-0.5">
                <p className="font-extrabold text-blue-950">
                  📱 Terdeteksi: Anda Menggunakan iPhone (iOS)
                </p>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  Apple <b>memblokir akses Bluetooth</b> di Safari &amp; Chrome iOS. Agar bisa langsung connect ke Iware X-58BT II di iPhone, gunakan browser gratis <b>Bluefy</b> dari App Store!
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-center text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Download Bluefy di App Store (Gratis)</span>
              </a>

              <button
                type="button"
                onClick={handleCopyAdminLink}
                className="bg-white hover:bg-blue-50 text-blue-800 font-bold py-2 px-3 rounded-xl border border-blue-300 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link Admin'}</span>
              </button>
            </div>
          </div>
        )}

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

        {/* Tab Selection */}
        <div>
          <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
            Pilih Solusi Koneksi:
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
              <span>Bluetooth Iware</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('iphone')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition cursor-pointer ${
                activeTab === 'iphone'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Panduan iPhone</span>
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
              <span>Android (RawBT)</span>
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
              <span>Cetak Biasa</span>
            </button>
          </div>
        </div>

        {/* Tab Content: Bluetooth Direct In-App Discovery */}
        {activeTab === 'bluetooth' && (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Bluetooth className="w-4 h-4" />
              </div>
              <div className="text-xs text-stone-600 space-y-1">
                <p className="font-extrabold text-stone-900">
                  Scan Bluetooth Iware X-58BT II (Nama: RPP02N)
                </p>
                <p className="leading-relaxed">
                  Printer thermal <b>Iware X-58BT II</b> Anda di layar pemindaian Bluetooth akan muncul dengan nama <b>RPP02N</b>.
                </p>
                <p className="leading-relaxed text-stone-500 text-[11px]">
                  Nyalakan printer, lalu klik tombol di bawah dan pilih perangkat bernama <b>"RPP02N"</b>.
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
              <span>{isScanning ? 'Sedang Memindai Iware X-58BT II...' : '🔍 Cari & Sambungkan Printer Iware'}</span>
            </button>

            <div className="bg-stone-100 rounded-xl p-2.5 text-[11px] text-stone-600 space-y-1">
              <p className="font-bold text-stone-800">📌 Catatan Perangkat:</p>
              <p>• Jika pakai <b>Laptop / PC Windows / MacBook</b>: Buka lewat Google Chrome, Bluetooth langsung connect 100%.</p>
              <p>• Jika pakai <b>HP Android</b>: Buka lewat Chrome, Bluetooth langsung connect.</p>
              <p>• Jika pakai <b>iPhone</b>: Gunakan tab "Panduan iPhone" karena Apple memblokir Bluetooth di Safari/Chrome.</p>
            </div>
          </div>
        )}

        {/* Tab Content: Khusus Pengguna iPhone (iOS) */}
        {activeTab === 'iphone' && (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                iOS
              </div>
              <div className="text-xs text-stone-700 space-y-1">
                <p className="font-extrabold text-stone-900">
                  Mengapa di iPhone Muncul "Tidak Didukung Browser"?
                </p>
                <p className="leading-relaxed text-[11.5px]">
                  Kebijakan keamanan <b>Apple</b> melarang Safari dan Chrome di iPhone untuk mengakses Bluetooth perangkat kasir dari web. Bahkan menginstall Chrome di iPhone tetap tidak bisa karena diatur oleh iOS WebKit Apple.
                </p>
              </div>
            </div>

            {/* Solusi 1: Bluefy Browser */}
            <div className="bg-white rounded-xl p-3 border border-blue-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-blue-900 font-extrabold">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">1</span>
                <span>Solusi Utama: Pakai Browser "Bluefy" (Gratis di App Store)</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed pl-6.5">
                Bluefy adalah browser resmi di App Store yang dibuat khusus agar iPhone bisa memakai Web Bluetooth. Langkahnya sangat gampang:
              </p>
              <ol className="text-[11px] text-stone-700 space-y-1 list-decimal pl-10">
                <li>Download aplikasi <b>Bluefy - Web BLE Browser</b> di App Store.</li>
                <li>Salin link admin Dimsum Anyu: <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-[10px] select-all">{adminUrl}</code></li>
                <li>Buka aplikasi Bluefy, paste link tersebut di address bar.</li>
                <li>Klik tombol <b>"Cetak Resi"</b> → <b>"Cari Printer"</b>, printer Iware X-58BT II langsung muncul dan connect!</li>
              </ol>

              <div className="flex gap-2 pt-1 pl-6.5">
                <a
                  href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-center text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Download Bluefy di App Store</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyAdminLink}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Tersalin!' : 'Salin Link'}</span>
                </button>
              </div>
            </div>

            {/* Solusi 2: Laptop / HP Android */}
            <div className="bg-white rounded-xl p-3 border border-stone-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-stone-900 font-extrabold">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px]">2</span>
                <span>Solusi Alternatif: Buka di Laptop atau HP Android</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed pl-6.5">
                Jika di outlet ada Laptop (Windows / MacBook) atau HP Android, buka link admin di Google Chrome biasa. Iware X-58BT II langsung terdeteksi 1-klik tanpa perlu install browser lain!
              </p>
            </div>
          </div>
        )}

        {/* Tab Content: Android RawBT */}
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
                  Jika admin atau kasir menggunakan HP Android, aplikasi RawBT adalah driver paling handal untuk Iware X-58BT II tanpa kendala pairing.
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

        {/* Tab Content: System Print */}
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
                  Membuka kotak dialog cetak browser (format resi kertas gulung 58mm). Cocok jika printer Iware X-58BT II tersambung lewat kabel USB di Laptop Windows / Mac.
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
            Printer: Iware X-58BT II • Kertas: 58mm
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
