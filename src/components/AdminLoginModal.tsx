import React, { useState } from 'react';
import { Lock, Shield, KeyRound, AlertCircle, X, Eye, EyeOff, Loader2 } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [usePinMode, setUsePinMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const payload = usePinMode
        ? { pin: pin.trim() }
        : { username: username.trim(), password: password.trim() };

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('dimsumanyu_admin_session', 'authenticated');
        onLoginSuccess();
        onClose();
      } else {
        setErrorMsg(data.error || 'Username atau password salah.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1 rounded-full cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="text-center space-y-1.5 mb-5">
          <div className="w-12 h-12 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-red-100 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-stone-900">
            Portal Khusus Pengelola
          </h3>
          <p className="text-xs text-stone-500">
            Masukkan akun admin atau PIN untuk mengakses rekap pesanan & integrasi Google Sheets.
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {!usePinMode ? (
            <>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Username Admin
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password admin"
                    className="w-full px-3 py-2 pr-9 rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1 text-center">
                PIN Cepat 6-Digit
              </label>
              <input
                type="password"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                className="w-full px-3 py-2.5 text-center text-lg font-mono tracking-widest rounded-xl bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white outline-none transition"
              />
            </div>
          )}

          {/* Toggle between Password and PIN */}
          <div className="flex justify-between items-center text-[11px] pt-1">
            <button
              type="button"
              onClick={() => {
                setUsePinMode(!usePinMode);
                setErrorMsg('');
              }}
              className="text-stone-500 hover:text-red-600 underline cursor-pointer"
            >
              {usePinMode ? 'Masuk dengan Username & Password' : 'Gunakan PIN Cepat'}
            </button>
            <span className="text-[10px] text-stone-400">Default: admin / dimsumanyu123</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-stone-900 hover:bg-stone-800 text-white font-black py-2.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer disabled:opacity-50 text-xs"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            <span>Masuk ke Dashboard Admin</span>
          </button>
        </form>
      </div>
    </div>
  );
};
