import React from 'react';
import { Utensils, Table, ShoppingBag, LogOut, Clock } from 'lucide-react';

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
  onAdminLogout,
  onOpenTrackOrder,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand identity */}
        <div 
          onClick={() => setActiveView('order')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center font-black text-lg shadow-sm shadow-red-700/20 group-hover:scale-105 transition">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black tracking-tight text-stone-900 leading-none">
                DIMSUMANYU
              </h1>
              <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold px-1.5 py-0.2 rounded">
                OFFICIAL
              </span>
            </div>
            <p className="text-[11px] font-bold text-red-600 tracking-wider mt-0.5">
              #SensasiNgedaging
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Track order button for everyone */}
          <button
            onClick={onOpenTrackOrder}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl border border-stone-200 transition cursor-pointer shadow-xs active:scale-95"
            title="Lacak status pesanan Anda"
          >
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            <span className="hidden sm:inline">Lacak Pesanan</span>
            <span className="sm:hidden">Lacak</span>
          </button>

          {/* Normal Customer View */}
          {!isAdminLoggedIn ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold bg-stone-100 text-stone-700 px-3 py-1.5 rounded-full border border-stone-200">
                <ShoppingBag className="w-3.5 h-3.5 text-red-600" />
                <span className="hidden sm:inline">
                  {currentStep === 1 ? '1/2: Menu' : '2/2: Checkout'}
                </span>
                <span className="sm:hidden">
                  {currentStep === 1 ? 'Menu' : 'Bayar'}
                </span>
                {cartCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
                    {cartCount}
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Logged-In Admin View Controls */
            <div className="flex items-center gap-1.5">
              {activeView === 'order' ? (
                <button
                  onClick={() => setActiveView('admin')}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer relative"
                  title="Buka Panel Admin & Google Sheets"
                >
                  <Table className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Panel Admin</span>
                  <span className="sm:hidden">Admin</span>
                  {pendingSyncCount > 0 && (
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setActiveView('order')}
                  className="flex items-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-xl transition shadow-sm cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Lihat Toko</span>
                </button>
              )}

              <button
                onClick={onAdminLogout}
                className="p-1.5 rounded-xl bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-700 transition cursor-pointer border border-stone-200"
                title="Keluar dari Akun Admin"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
