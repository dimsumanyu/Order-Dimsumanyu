/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { Banner } from './components/Banner';
import { CategoryFilter } from './components/CategoryFilter';
import { MenuCard } from './components/MenuCard';
import { CartSummary } from './components/CartSummary';
import { CheckoutForm } from './components/CheckoutForm';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { AdminPanel } from './components/AdminPanel';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { MenuItem, OrderData, AppSettings, ShippingOption, PaymentMethod, OrderStatus } from './types';
import { INITIAL_MENU, INITIAL_SETTINGS } from './data/initialMenu';
import { formatRupiah } from './utils/whatsapp';
import { ArrowRight, ShoppingBag, Utensils, MessageCircle, FileSpreadsheet, Lock } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<'order' | 'admin'>('order');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showBestSellerOnly, setShowBestSellerOnly] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<OrderData | null>(null);
  const [showSheetsGuide, setShowSheetsGuide] = useState<boolean>(false);

  // Admin security state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('dimsumanyu_admin_session') === 'authenticated';
  });
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Load Initial Data
  const fetchData = async () => {
    try {
      const [resMenu, resOrders, resSettings] = await Promise.all([
        fetch('/api/menu').then(r => r.json()).catch(() => ({ menu: INITIAL_MENU })),
        fetch('/api/orders').then(r => r.json()).catch(() => ({ orders: [] })),
        fetch('/api/settings').then(r => r.json()).catch(() => ({ settings: INITIAL_SETTINGS })),
      ]);

      if (resMenu?.menu) setMenuItems(resMenu.menu);
      if (resOrders?.orders) setOrders(resOrders.orders);
      if (resSettings?.settings) setSettings(resSettings.settings);
    } catch (e) {
      console.warn('Using local fallback initial state:', e);
    }
  };

  useEffect(() => {
    fetchData();

    // Check URL parameters for admin shortcut (?admin=true or ?mode=admin)
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true' || params.get('mode') === 'admin') {
      const isAuth = localStorage.getItem('dimsumanyu_admin_session') === 'authenticated';
      if (isAuth) {
        setIsAdminLoggedIn(true);
        setActiveView('admin');
      } else {
        setShowLoginModal(true);
      }
    }
  }, []);

  // Admin Auth Handlers
  const handleOpenAdminLogin = () => {
    if (isAdminLoggedIn) {
      setActiveView(activeView === 'admin' ? 'order' : 'admin');
    } else {
      setShowLoginModal(true);
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setActiveView('admin');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('dimsumanyu_admin_session');
    setIsAdminLoggedIn(false);
    setActiveView('order');
  };

  // Extract Categories
  const categories = useMemo(() => {
    const unique = Array.from(new Set(menuItems.map(m => m.kategori)));
    return ['ALL', ...unique];
  }, [menuItems]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchCategory = selectedCategory === 'ALL' || item.kategori === selectedCategory;
      const matchSearch = searchQuery === '' || 
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kategori.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBestSeller = !showBestSellerOnly || item.isBestSeller;
      return matchCategory && matchSearch && matchBestSeller;
    });
  }, [menuItems, selectedCategory, searchQuery, showBestSellerOnly]);

  // Cart Calculations
  const cartEntries = Object.entries(cart).filter(([_, qty]) => qty > 0);
  const cartItemCount = cartEntries.reduce((sum, [_, qty]) => sum + qty, 0);
  const totalCartAmount = cartEntries.reduce((sum, [id, qty]) => {
    const item = menuItems.find(m => m.id === id);
    return sum + (item ? item.harga * qty : 0);
  }, 0);

  const pendingSyncCount = orders.filter(o => !o.syncedToSheets).length;

  // Cart Actions
  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleClearCart = () => {
    setCart({});
  };

  const handleProceedToStep2 = () => {
    if (cartItemCount === 0) {
      alert('Silakan pilih minimal 1 menu sebelum melanjutkan!');
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToMenu = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Order Flow
  const handleSubmitOrder = async (formData: {
    nama: string;
    phone: string;
    opsiPengiriman: ShippingOption;
    alamat: string;
    metodeBayar: PaymentMethod;
    catatan: string;
  }) => {
    setIsSubmitting(true);
    try {
      const orderItems = cartEntries.map(([id, qty]) => {
        const item = menuItems.find(m => m.id === id)!;
        return {
          id,
          nama: item.nama,
          harga: item.harga,
          qty,
          subtotal: item.harga * qty,
        };
      });

      const rincianText = orderItems.map(it => `${it.nama} (${it.qty}x)`).join('\n');

      const payload = {
        nama: formData.nama,
        phone: formData.phone,
        opsiPengiriman: formData.opsiPengiriman,
        alamat: formData.alamat,
        metodeBayar: formData.metodeBayar,
        catatan: formData.catatan,
        rincianMenu: rincianText,
        totalHarga: totalCartAmount,
        items: orderItems,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setCompletedOrder(data.order);
        setOrders(prev => [data.order, ...prev]);
        setCart({});
        setCurrentStep(1);
      } else {
        alert('Gagal menyimpan pesanan: ' + (data.error || 'Terjadi kesalahan sistem'));
      }
    } catch (err: any) {
      alert('Gagal mengirim pesanan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Actions
  const handleUpdateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders(prev => prev.map(o => o.id === id ? data.order : o));
      }
    } catch (err: any) {
      alert('Gagal mengubah status: ' + err.message);
    }
  };

  const handleSyncOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders(prev => prev.map(o => o.id === id ? data.order : o));
        alert('✅ Pesanan #' + id + ' berhasil disinkronkan ke Google Sheets!');
      } else {
        alert('⚠️ Sinkronisasi gagal: ' + (data.error || 'Periksa status Google Apps Script'));
      }
    } catch (err: any) {
      alert('Gagal sync: ' + err.message);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/orders/sync-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        alert(`Sinkronisasi selesai! Berhasil: ${data.successCount}, Gagal: ${data.failCount}`);
      }
    } catch (err: any) {
      alert('Gagal sync all: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleMenuStatus = async (id: string) => {
    try {
      const res = await fetch('/api/menu/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success && data.menu) {
        setMenuItems(data.menu);
      }
    } catch (err: any) {
      alert('Gagal mengubah status menu: ' + err.message);
    }
  };

  const handleResetMenu = async () => {
    if (!confirm('Kembalikan daftar menu ke default awal database spreadsheet?')) return;
    try {
      const res = await fetch('/api/menu/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.menu) {
        setMenuItems(data.menu);
        alert('Menu berhasil di-reset!');
      }
    } catch (err: any) {
      alert('Gagal reset menu: ' + err.message);
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err: any) {
      alert('Gagal menyimpan pengaturan: ' + err.message);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.filter(o => o.id !== id));
      }
    } catch (err: any) {
      alert('Gagal menghapus pesanan: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20 text-stone-800 flex flex-col justify-between">
      <div>
        {/* Top Navbar */}
        <Navbar
          currentStep={currentStep}
          cartCount={cartItemCount}
          activeView={activeView}
          setActiveView={setActiveView}
          pendingSyncCount={pendingSyncCount}
          isAdminLoggedIn={isAdminLoggedIn}
          onOpenAdminLogin={handleOpenAdminLogin}
          onAdminLogout={handleAdminLogout}
        />

        <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
          {activeView === 'order' || !isAdminLoggedIn ? (
            <>
              {currentStep === 1 ? (
                /* Step 1: Catalog & Menu Selection */
                <div className="space-y-5">
                  <Banner />

                  <CategoryFilter
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    showBestSellerOnly={showBestSellerOnly}
                    onToggleBestSeller={() => setShowBestSellerOnly(prev => !prev)}
                  />

                  {/* Menu Grid */}
                  {filteredMenuItems.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500 text-xs">
                      Tidak ada menu yang sesuai dengan pencarian Anda.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {filteredMenuItems.map(item => (
                        <MenuCard
                          key={item.id}
                          item={item}
                          quantity={cart[item.id] || 0}
                          onUpdateQty={delta => handleUpdateQty(item.id, delta)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Cart Summary Section */}
                  <CartSummary
                    cart={cart}
                    menuItems={menuItems}
                    onUpdateQty={handleUpdateQty}
                    onClearCart={handleClearCart}
                    onProceed={handleProceedToStep2}
                  />
                </div>
              ) : (
                /* Step 2: Checkout, Payment, and Shipping */
                <CheckoutForm
                  cart={cart}
                  menuItems={menuItems}
                  settings={settings}
                  onBackToMenu={handleBackToMenu}
                  onSubmitOrder={handleSubmitOrder}
                  isSubmitting={isSubmitting}
                />
              )}
            </>
          ) : (
            /* Merchant Admin & Sheets Integration Panel */
            <AdminPanel
              orders={orders}
              menuItems={menuItems}
              settings={settings}
              onUpdateStatus={handleUpdateOrderStatus}
              onSyncOrder={handleSyncOrder}
              onSyncAll={handleSyncAll}
              onToggleMenuStatus={handleToggleMenuStatus}
              onResetMenu={handleResetMenu}
              onUpdateSettings={handleUpdateSettings}
              onDeleteOrder={handleDeleteOrder}
              onOpenSheetsGuide={() => setShowSheetsGuide(true)}
              isSyncing={isSyncing}
            />
          )}
        </main>
      </div>

      {/* Footer with Discreet Admin Portal Link */}
      <footer className="mt-12 border-t border-stone-200/80 bg-white py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-stone-900">DIMSUMANYU</span>
            <span>•</span>
            <span className="text-red-600 font-bold">#SensasiNgedaging</span>
            <span>•</span>
            <span>Pemesanan Online Resmi</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAdminLogin}
              className="text-[11px] text-stone-400 hover:text-stone-700 flex items-center gap-1 transition cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              <span>{isAdminLoggedIn ? 'Masuk Panel Admin (Aktif)' : 'Portal Pengelola'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Sticky Bottom Bar for Mobile Shopping (Only in Step 1) */}
      {activeView === 'order' && currentStep === 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 z-30 px-4 py-3 shadow-2xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">
                Total ({cartItemCount} Porsi):
              </p>
              <p className="font-black text-red-600 text-base sm:text-lg leading-tight">
                {formatRupiah(totalCartAmount)}
              </p>
            </div>

            <button
              onClick={handleProceedToStep2}
              disabled={cartItemCount === 0}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-2 transition ${
                cartItemCount > 0
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-700/30 cursor-pointer active:scale-95'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              <span>PESAN SEKARANG</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {completedOrder && (
        <OrderSuccessModal
          order={completedOrder}
          settings={settings}
          onClose={() => setCompletedOrder(null)}
          onNewOrder={() => {
            setCompletedOrder(null);
            setCurrentStep(1);
          }}
        />
      )}

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Google Sheets Integration Guide Modal */}
      <GoogleSheetsModal
        settings={settings}
        isOpen={showSheetsGuide}
        onClose={() => setShowSheetsGuide(false)}
        onUpdateSettings={handleUpdateSettings}
        onSyncAll={handleSyncAll}
        isSyncing={isSyncing}
      />
    </div>
  );
}
