import React, { useState } from 'react';
import {
  Utensils,
  Table,
  ShoppingBag,
  LogOut,
  Clock,
  Menu,
  X,
  Lock,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface NavbarProps {
  currentStep: number;
  cartCount: number;
  activeView: 'order' | 'admin';
  setActiveView: (view: 'order' | 'admin') => void;
  pendingSyncCount: number;
  isAdminLoggedIn: boolean;
  onOpenAdminLogin: () => void;
  onAdminLogout: () => void;
  onOpenTrackOrder: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStep,
  cartCount,
  activeView,
  setActiveView,
  pendingSyncCount,
  isAdminLoggedIn,
  onOpenAdminLogin,
  onAdminLogout,
  onOpenTrackOrder,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleOpenLogin = () => {
    setIsMobileMenuOpen(false);
    onOpenAdminLogin();
  };

  const handleOpenTracking = () => {
    setIsMobileMenuOpen(false);
    onOpenTrackOrder();
  };

  const handleSwitchView = (view: 'order' | 'admin') => {
    setIsMobileMenuOpen(false);
    setActiveView(view);
  };

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    onAdminLogout();
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs w-full max-w-full overflow-hidden">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
          {/* Brand Identity - Compact on Mobile */}
          <div
            onClick={() => handleSwitchView('order')}
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group shrink min-w-0"
          >
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-09_at_14.12.38_aa6284a2.jpeg"
              alt="Logo DIMSUMANYU"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover object-top border border-stone-200 shadow-sm shadow-red-700/10 group-hover:scale-105 transition shrink-0 bg-white"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-stone-900 leading-none truncate">
                  DIMSUMANYU
                </h1>
                <span className="hidden sm:inline-block bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold px-1.5 py-0.5 rounded shrink-0">
                  OFFICIAL
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls: Lacak, Cart (if items), & Hamburger Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Track Order Button */}
            <button
              onClick={onOpenTrackOrder}
              className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 px-2 sm:px-3 py-1.5 rounded-xl border border-stone-200 transition cursor-pointer shadow-xs active:scale-95"
              title="Lacak status pesanan Anda"
            >
              <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span className="text-xs">Lacak</span>
            </button>

            {/* Cart count pill if in shopping mode */}
            {activeView === 'order' && cartCount > 0 && (
              <div className="flex items-center gap-1 text-xs font-extrabold bg-red-50 text-red-700 border border-red-200 px-2 py-1.5 rounded-xl shadow-xs">
                <ShoppingBag className="w-3.5 h-3.5 text-red-600" />
                <span>{cartCount}</span>
              </div>
            )}

            {/* Desktop Quick Admin View Switcher (if logged in) */}
            {isAdminLoggedIn && (
              <div className="hidden sm:flex items-center gap-1.5">
                {activeView === 'order' ? (
                  <button
                    onClick={() => setActiveView('admin')}
                    className="flex items-center gap-1.5 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    <Table className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Panel Admin</span>
                    {pendingSyncCount > 0 && (
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveView('order')}
                    className="flex items-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Lihat Toko</span>
                  </button>
                )}
              </div>
            )}

            {/* Hamburger Button (Garis 3) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 sm:p-2 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 border border-stone-200 transition cursor-pointer shadow-xs flex items-center justify-center"
              aria-label="Menu navigasi dan login admin"
              title="Menu utama & Login Admin"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-stone-800" />
              ) : (
                <Menu className="w-5 h-5 text-stone-800" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hamburger Menu Dropdown / Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xs h-full shadow-2xl border-l border-stone-200 flex flex-col justify-between p-5 animate-in slide-in-from-right duration-200 overflow-y-auto">
            {/* Drawer Top */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/assets/aistudio/WhatsApp_Image_2026-10-09_at_14.12.38_aa6284a2.jpeg"
                    alt="Logo DIMSUMANYU"
                    className="w-9 h-9 rounded-xl object-cover object-top border border-stone-200 bg-white shadow-2xs"
                  />
                  <div>
                    <h2 className="text-base font-black text-stone-900 leading-tight">
                      DIMSUMANYU
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sesi Pengelola (Hanya muncul jika admin sudah login) */}
              {isAdminLoggedIn ? (
                <div className="bg-stone-900 text-white rounded-2xl p-3 border border-stone-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Sesi Pengelola Toko Aktif</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleSwitchView('admin')}
                      className={`py-2 px-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        activeView === 'admin'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>Panel Admin</span>
                    </button>
                    <button
                      onClick={() => handleSwitchView('order')}
                      className={`py-2 px-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        activeView === 'order'
                          ? 'bg-red-600 text-white'
                          : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Lihat Toko</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Menu Navigasi Pelanggan (Bersih & Ramah Customer) */}
              <div className="space-y-2 pt-1">
                {/* 1. Katalog Menu Toko */}
                <button
                  onClick={() => handleSwitchView('order')}
                  className={`w-full p-3 rounded-2xl border font-bold text-xs flex items-center justify-between transition cursor-pointer text-left ${
                    activeView === 'order'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-stone-900">
                        Katalog Menu Dimsum
                      </p>
                      <p className="text-[10px] text-stone-500 font-normal">
                        Lihat aneka menu &amp; pesan
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                {/* 2. Lacak Pesanan */}
                <button
                  onClick={handleOpenTracking}
                  className="w-full bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-bold p-3 rounded-2xl transition flex items-center justify-between cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-stone-900">
                        Lacak Pesanan
                      </p>
                      <p className="text-[10px] text-stone-500 font-normal">
                        Cek status masak &amp; pengantaran
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>
              </div>
            </div>

            {/* Drawer Bottom */}
            <div className="pt-4 border-t border-stone-200 space-y-2">
              {isAdminLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2.5 px-3 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar Akun Admin (Logout)</span>
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Subtle Admin Login Entry for Merchant Only */}
                  <button
                    onClick={handleOpenLogin}
                    className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 border border-stone-200 font-bold py-2.5 px-3 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Lock className="w-3.5 h-3.5 text-stone-500" />
                    <span>Login Pengelola Toko</span>
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-stone-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                    <span>DIMSUMANYU Official 2026</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
