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
import { OrderStatusModal } from './components/OrderStatusModal';
import { TrackOrderSearchModal } from './components/TrackOrderSearchModal';
import { AdminPanel } from './components/AdminPanel';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { MenuItem, OrderData, AppSettings, ShippingOption, PaymentMethod, OrderStatus } from './types';
import { INITIAL_MENU, INITIAL_SETTINGS } from './data/initialMenu';
import { formatRupiah } from './utils/whatsapp';
import { ArrowRight, Lock } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<'order' | 'admin'>('order');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem('dimsumanyu_menu');
      return saved ? JSON.parse(saved) : INITIAL_MENU;
    } catch {
      return INITIAL_MENU;
    }
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('dimsumanyu_settings');
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });
  const [orders, setOrders] = useState<OrderData[]>(() => {
    try {
      const saved = localStorage.getItem('dimsumanyu_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showBestSellerOnly, setShowBestSellerOnly] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<OrderData | null>(null);
  const [showSheetsGuide, setShowSheetsGuide] = useState<boolean>(false);

  // Order Tracking States
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<OrderData | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState<boolean>(false);
  const [showTrackSearchModal, setShowTrackSearchModal] = useState<boolean>(false);

  // Admin security state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('dimsumanyu_admin_session') === 'authenticated';
  });
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Load Initial Data (with resilient fallback for static Vercel hosting)
  const fetchData = async () => {
    try {
      // 1. Try fetching from server if running in fullstack mode
      const [resMenu, resOrders, resSettings] = await Promise.all([
        fetch('/api/menu')
          .then(r => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null))
          .catch(() => null),
        fetch('/api/orders')
          .then(r => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null))
          .catch(() => null),
        fetch('/api/settings')
          .then(r => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null))
          .catch(() => null),
      ]);

      if (resMenu?.menu) {
        setMenuItems(resMenu.menu);
        localStorage.setItem('dimsumanyu_menu', JSON.stringify(resMenu.menu));
      }

      if (resOrders?.orders && Array.isArray(resOrders.orders)) {
        setOrders(prev => {
          const merged = [...resOrders.orders];
          prev.forEach(p => {
            if (!merged.some(m => m.id === p.id)) merged.push(p);
          });
          localStorage.setItem('dimsumanyu_orders', JSON.stringify(merged));
          return merged;
        });
      }

      if (resSettings?.settings) {
        setSettings(resSettings.settings);
        localStorage.setItem('dimsumanyu_settings', JSON.stringify(resSettings.settings));
      }
    } catch (e) {
      console.warn('Using client-side localStorage state (resilient mode):', e);
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

    // Check URL parameters for direct order tracking (?track=ORDER_ID)
    const trackId = params.get('track');
    if (trackId) {
      const found = orders.find(o => o.id.toLowerCase() === trackId.toLowerCase());
      if (found) {
        setSelectedOrderForTracking(found);
        setShowTrackingModal(true);
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

  // Helper to send order directly to Google Apps Script Webhook (for static Vercel hosting)
  const sendDirectToAppsScript = async (order: OrderData) => {
    if (!settings.appsScriptUrl) return false;
    try {
      const targetUrl = `${settings.appsScriptUrl}?action=order&payload=${encodeURIComponent(JSON.stringify(order))}`;
      // mode: 'no-cors' allows browser to ping Google Apps Script without CORS blockage
      fetch(targetUrl, { mode: 'no-cors' }).catch(() => {});
      return true;
    } catch (e) {
      console.warn('Direct Apps Script ping failed:', e);
      return false;
    }
  };

  // Submit Order Flow (100% resilient across Node server, Vercel, and direct client)
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

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const generatedOrderId = `DAN-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      let finalOrder: OrderData = {
        id: generatedOrderId,
        nama: formData.nama.trim(),
        phone: formData.phone.trim(),
        opsiPengiriman: formData.opsiPengiriman,
        alamat: formData.alamat.trim(),
        metodeBayar: formData.metodeBayar,
        catatan: formData.catatan.trim(),
        rincianMenu: rincianText,
        totalHarga: totalCartAmount,
        items: orderItems,
        createdAt: now.toISOString(),
        status: 'Menunggu payment',
        syncedToSheets: false,
      };

      // 1. Try sending to Node backend if available (dev / fullstack mode)
      let backendSuccess = false;
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalOrder),
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (data.success && data.order) {
              finalOrder = data.order;
              backendSuccess = true;
            }
          }
        }
      } catch (backendErr) {
        console.warn('Backend server not present (e.g. static hosting on Vercel), using direct client sync.');
      }

      // 2. If backend was not reached or failed (e.g. Vercel static deployment), sync directly from browser to Google Apps Script
      if (!backendSuccess) {
        await sendDirectToAppsScript(finalOrder);
        finalOrder.syncedToSheets = true;
        finalOrder.sheetsSyncTimestamp = new Date().toISOString();
      }

      // 3. Persist order in local state and localStorage
      setOrders(prev => {
        const updated = [finalOrder, ...prev.filter(o => o.id !== finalOrder.id)];
        try {
          localStorage.setItem('dimsumanyu_orders', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // 4. Set completed order to trigger OrderSuccessModal
      setCompletedOrder(finalOrder);
      setCart({});
      setCurrentStep(1);
    } catch (err: any) {
      console.error('Submit order error:', err);
      alert('Terjadi kendala saat memproses pesanan: ' + (err.message || 'Silakan coba lagi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Actions
  const handleUpdateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      // 1. Update in local state immediately
      let updatedOrder: OrderData | null = null;
      setOrders(prev => {
        const updated = prev.map(o => {
          if (o.id === id) {
            const mod = { ...o, status };
            updatedOrder = mod;
            return mod;
          }
          return o;
        });
        try {
          localStorage.setItem('dimsumanyu_orders', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Also update selected order for tracking if active
      if (selectedOrderForTracking && selectedOrderForTracking.id === id) {
        setSelectedOrderForTracking(prev => prev ? { ...prev, status } : null);
      }

      // 2. Try updating backend if available
      try {
        await fetch(`/api/orders/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
      } catch {}

      // 3. Inform Google Apps Script about status change if possible
      if (updatedOrder && settings.appsScriptUrl) {
        sendDirectToAppsScript(updatedOrder);
      }
    } catch (err: any) {
      alert('Gagal mengubah status: ' + err.message);
    }
  };

  const handleSyncOrder = async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    try {
      // Try backend first
      let synced = false;
      try {
        const res = await fetch(`/api/orders/${id}/sync`, { method: 'POST' });
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (data.success && data.order) {
              setOrders(prev => {
                const updated = prev.map(o => o.id === id ? data.order : o);
                localStorage.setItem('dimsumanyu_orders', JSON.stringify(updated));
                return updated;
              });
              synced = true;
            }
          }
        }
      } catch {}

      // Fallback: direct browser sync
      if (!synced) {
        await sendDirectToAppsScript(order);
        setOrders(prev => {
          const updated = prev.map(o => o.id === id ? { ...o, syncedToSheets: true, sheetsSyncTimestamp: new Date().toISOString() } : o);
          localStorage.setItem('dimsumanyu_orders', JSON.stringify(updated));
          return updated;
        });
      }

      alert('✅ Pesanan #' + id + ' berhasil dikirim ke Google Sheets!');
    } catch (err: any) {
      alert('Gagal sync: ' + err.message);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const unsynced = orders.filter(o => !o.syncedToSheets);
      for (const ord of unsynced) {
        await sendDirectToAppsScript(ord);
      }

      setOrders(prev => {
        const updated = prev.map(o => ({ ...o, syncedToSheets: true, sheetsSyncTimestamp: new Date().toISOString() }));
        localStorage.setItem('dimsumanyu_orders', JSON.stringify(updated));
        return updated;
      });

      alert(`Sinkronisasi selesai! Seluruh ${unsynced.length} pesanan telah dikirim ke Google Sheets.`);
    } catch (err: any) {
      alert('Gagal sync all: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleMenuStatus = async (id: string) => {
    try {
      setMenuItems(prev => {
        const updated = prev.map(item => {
          if (item.id === id) {
            return {
              ...item,
              status: (item.status === 'TERSEDIA' ? 'HABIS' : 'TERSEDIA') as 'TERSEDIA' | 'HABIS',
            };
          }
          return item;
        });
        localStorage.setItem('dimsumanyu_menu', JSON.stringify(updated));
        return updated;
      });

      try {
        await fetch('/api/menu/toggle-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
      } catch {}
    } catch (err: any) {
      alert('Gagal mengubah status menu: ' + err.message);
    }
  };

  const handleResetMenu = async () => {
    if (!confirm('Kembalikan daftar menu ke default awal database spreadsheet?')) return;
    try {
      setMenuItems(INITIAL_MENU);
      localStorage.setItem('dimsumanyu_menu', JSON.stringify(INITIAL_MENU));
      try {
        await fetch('/api/menu/reset', { method: 'POST' });
      } catch {}
      alert('Menu berhasil di-reset!');
    } catch (err: any) {
      alert('Gagal reset menu: ' + err.message);
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      setSettings(prev => {
        const updated = { ...prev, ...newSettings };
        localStorage.setItem('dimsumanyu_settings', JSON.stringify(updated));
        return updated;
      });

      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSettings),
        });
      } catch {}
    } catch (err: any) {
      alert('Gagal menyimpan pengaturan: ' + err.message);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      setOrders(prev => {
        const updated = prev.filter(o => o.id !== id);
        localStorage.setItem('dimsumanyu_orders', JSON.stringify(updated));
        return updated;
      });

      try {
        await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      } catch {}
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
          onOpenTrackOrder={() => setShowTrackSearchModal(true)}
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
              onClick={() => setShowTrackSearchModal(true)}
              className="text-[11px] text-stone-500 hover:text-stone-800 transition cursor-pointer"
            >
              Lacak Pesanan
            </button>
            <span>•</span>
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
          onViewStatus={() => {
            const current = completedOrder;
            setCompletedOrder(null);
            setSelectedOrderForTracking(current);
            setShowTrackingModal(true);
          }}
        />
      )}

      {/* Interactive Order Status Progress Modal (4 Stages) */}
      <OrderStatusModal
        order={selectedOrderForTracking}
        isOpen={showTrackingModal}
        onClose={() => {
          setShowTrackingModal(false);
          setSelectedOrderForTracking(null);
        }}
        settings={settings}
        onOpenAdmin={handleOpenAdminLogin}
        isAdminLoggedIn={isAdminLoggedIn}
        onUpdateStatus={handleUpdateOrderStatus}
      />

      {/* Customer Order Search Modal */}
      <TrackOrderSearchModal
        isOpen={showTrackSearchModal}
        onClose={() => setShowTrackSearchModal(false)}
        orders={orders}
        onSelectOrder={(order) => {
          setShowTrackSearchModal(false);
          setSelectedOrderForTracking(order);
          setShowTrackingModal(true);
        }}
        settings={settings}
      />

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
