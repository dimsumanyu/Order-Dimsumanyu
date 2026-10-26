import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Terminal,
  Download,
  Zap,
  Play
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../data/googleAppsScriptTemplate';
import { AppSettings } from '../types';

interface GoogleSheetsModalProps {
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onSyncAll: () => Promise<void>;
  isSyncing: boolean;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onUpdateSettings,
  onSyncAll,
  isSyncing,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);
  const [initStatus, setInitStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);
  const [editableUrl, setEditableUrl] = useState(settings.appsScriptUrl);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(settings.appsScriptUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    try {
      const res = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: editableUrl })
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus({
          loading: false,
          success: true,
          message: `Koneksi berhasil! Status: HTTP ${data.httpStatus}`
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          message: `Koneksi gagal: ${data.error}`
        });
      }
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: err.message || 'Gagal menghubungi Apps Script'
      });
    }
  };

  const handleInitSheets = async () => {
    setInitStatus({ loading: true });
    try {
      const res = await fetch('/api/init-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: editableUrl })
      });
      const data = await res.json();
      if (data.success) {
        setInitStatus({
          loading: false,
          success: true,
          message: data.message || 'Sheet AdminUsers & Pesanan berhasil disiapkan di Google Sheets!'
        });
      } else {
        setInitStatus({
          loading: false,
          success: false,
          message: data.error || 'Gagal inisialisasi sheet otomatis.'
        });
      }
    } catch (err: any) {
      setInitStatus({
        loading: false,
        success: false,
        message: err.message || 'Gagal inisialisasi sheet'
      });
    }
  };

  const handleSaveUrl = () => {
    onUpdateSettings({ appsScriptUrl: editableUrl });
    alert('URL Apps Script berhasil disimpan!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 relative my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">
                Integrasi Google Sheets & Apps Script
              </h3>
              <p className="text-[11px] text-stone-500">
                Pencatatan pesanan otomatis ke spreadsheet Anda
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto space-y-4 py-4 pr-1 text-xs">
          {/* Target App Script Info */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Script ID Terhubung
                </p>
                <p className="font-mono font-bold text-stone-900 text-xs">
                  {settings.scriptId}
                </p>
              </div>

              <a
                href={`https://script.google.com/home/projects/${settings.scriptId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-white border border-stone-200 hover:border-emerald-500 text-stone-700 hover:text-emerald-700 px-3 py-1.5 rounded-xl font-bold transition shadow-xs w-fit"
              >
                <span>Buka Google Apps Script</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                URL Webhook Apps Script (Exec)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editableUrl}
                  onChange={(e) => setEditableUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-stone-200 focus:border-emerald-600 outline-none font-mono text-[11px]"
                />
                <button
                  onClick={handleSaveUrl}
                  className="bg-stone-800 hover:bg-stone-900 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  onClick={handleCopyUrl}
                  className="bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                  title="Salin URL"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Test Connection and Init Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleTestConnection}
                disabled={testStatus?.loading}
                className="bg-stone-800 hover:bg-stone-900 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testStatus?.loading ? 'animate-spin' : ''}`} />
                <span>Test Ping Koneksi</span>
              </button>

              <button
                onClick={handleInitSheets}
                disabled={initStatus?.loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${initStatus?.loading ? 'animate-spin' : ''}`} />
                <span>⚡ Buat Sheet Admin & Pesanan Otomatis</span>
              </button>

              {testStatus && !testStatus.loading && (
                <span className={`text-[11px] font-semibold flex items-center gap-1 ${testStatus.success ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {testStatus.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {testStatus.message}
                </span>
              )}

              {initStatus && !initStatus.loading && (
                <div className={`w-full mt-1.5 p-2 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 ${initStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                  {initStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />}
                  <span>{initStatus.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Critical: How to make AdminUsers sheet appear */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs">!</div>
              <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm">
                Belum Muncul Sheet "AdminUsers" di Google Sheets Anda?
              </h4>
            </div>

            <p className="text-[11px] text-amber-900 leading-relaxed">
              Google Apps Script <b>tidak otomatis mengubah spreadsheet</b> hanya dengan menyalin kode. Skrip harus dijalankan sekali (klik Run) agar membuat sheet <b>AdminUsers</b> dan <b>Pesanan</b>.
            </p>

            <div className="space-y-2.5 pt-1">
              <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-1.5 shadow-xs">
                <p className="font-extrabold text-stone-900 text-[11px] flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                  <span>CARA 1 (Paling Cepat - 5 Detik di Apps Script):</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-700">
                  <li>Buka tab editor Apps Script Anda (klik tombol <b>"Buka Google Apps Script"</b> di atas).</li>
                  <li>Di bilah toolbar atas (sebelah tombol Debug), <b>klik menu pilihan fungsi</b> dan pilih <b>setupSheets</b>.</li>
                  <li>Klik tombol <b>▷ Jalankan (Run)</b>.</li>
                  <li>Buka spreadsheet Anda — tab <b>AdminUsers</b> & <b>Pesanan</b> langsung terbuat otomatis!</li>
                </ol>
              </div>

              <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-1.5 shadow-xs">
                <p className="font-extrabold text-stone-900 text-[11px] flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  <span>CARA 2 (Buat Manual di Google Sheets):</span>
                </p>
                <p className="text-[11px] text-stone-700">
                  Di Google Sheets, klik tanda <b>+</b> (Tambah sheet) di pojok kiri bawah, ganti nama sheet menjadi: <b className="font-mono text-emerald-800">AdminUsers</b>.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 text-[10px] font-mono bg-stone-50 p-2 rounded-lg border border-stone-200">
                  <div><b>A:</b> Username</div>
                  <div><b>B:</b> Password</div>
                  <div><b>C:</b> Nama / Peran</div>
                  <div><b>D:</b> Status</div>
                  <div><b>E:</b> Terakhir Login</div>
                </div>
                <p className="text-[10px] text-stone-600 font-mono bg-emerald-50/70 p-1.5 rounded border border-emerald-200">
                  Isi Baris 2: admin | dimsumanyu123 | Owner / Admin Utama | Aktif | -
                </p>
              </div>
            </div>
          </div>

          {/* Step by Step Setup Guide */}
          <div className="border border-stone-200 rounded-2xl p-4 space-y-3 bg-white">
            <h4 className="font-extrabold text-stone-900 text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span>Langkah Lengkap Pasang / Perbarui Code.gs</span>
            </h4>

            <ol className="space-y-2 text-[11px] text-stone-700 list-decimal list-inside pl-1">
              <li className="leading-relaxed">
                Salin seluruh kode di bawah ini menggunakan tombol <b>"Salin Kode Code.gs"</b>.
              </li>
              <li className="leading-relaxed">
                Di editor Google Apps Script, buka file <b>Code.gs</b>, hapus isinya, dan <b>Paste (Tempelkan)</b> kode baru ini. Lalu klik ikon <b>Simpan</b>.
              </li>
              <li className="leading-relaxed">
                Pilih fungsi <b>setupSheets</b> di bilah atas lalu klik <b>▷ Jalankan (Run)</b> untuk membuat sheet.
              </li>
              <li className="leading-relaxed">
                Klik tombol <b>Terapkan (Deploy)</b> &rarr; <b>Kelola penerapan (Manage deployments)</b> &rarr; ikon <b>Pensil (Edit)</b> &rarr; Versi: <b>"Versi baru" (New version)</b> &rarr; Akses: <b>"Siapa saja" (Anyone)</b> &rarr; <b>Terapkan</b>.
              </li>
            </ol>

            {/* Admin Users Sheet Info Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Sheet Baru: "AdminUsers" (Daftar Akun & Password)</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Skrip ini otomatis menyiapkan sheet <b>AdminUsers</b> di spreadsheet Anda. Anda bisa mendaftarkan staf/kasir baru cukup dengan menambahkan baris baru di sheet tersebut:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono bg-white p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">Kolom A:</span>
                  <span className="text-slate-600">Username (misal: kasir)</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Kolom B:</span>
                  <span className="text-slate-600">Password</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Kolom C:</span>
                  <span className="text-slate-600">Nama / Peran</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Kolom D:</span>
                  <span className="text-emerald-700 font-bold">Status (Aktif)</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic">
                * Default awal: <b>admin / dimsumanyu123</b> dan <b>kasir / dimsum123</b>. Anda dapat mengubah atau menambahkan user tanpa batas!
              </p>
            </div>

            {/* Ready to Copy Code Snippet Box */}
            <div className="pt-2">
              <div className="flex items-center justify-between bg-stone-900 text-stone-200 px-3.5 py-2 rounded-t-xl text-[11px] font-mono">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  Code.gs (Apps Script Otomatis)
                </span>
                <button
                  onClick={handleCopyCode}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Kode Tersalin!' : 'Salin Kode Code.gs'}</span>
                </button>
              </div>
              <pre className="bg-stone-950 text-stone-300 p-3 rounded-b-xl text-[10px] font-mono overflow-x-auto max-h-40 border border-t-0 border-stone-800">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            </div>
          </div>

          {/* Manual sync / Export CSV */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-200">
            <span className="text-stone-600 text-[11px]">
              Ingin mengekspor seluruh rekapan pesanan langsung ke spreadsheet?
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onSyncAll}
                disabled={isSyncing}
                className="bg-stone-800 hover:bg-stone-900 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-[11px]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sinkronkan Semua Sekarang</span>
              </button>

              <a
                href="/api/orders/export-csv"
                download="Pesanan_DIMSUMANYU.csv"
                className="bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 text-[11px]"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Unduh CSV Rekap</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="bg-stone-900 hover:bg-stone-800 text-white font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
