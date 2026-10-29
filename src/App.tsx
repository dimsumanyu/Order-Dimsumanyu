/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { Banner } from './components/Banner';
import { CategoryFilter } from './components/CategoryFilter';
import { MenuCard } from './components/MenuCard';
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
import { ArrowRight, Lock, Instagram } from 'lucide-react';

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
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          appsScriptUrl:
            parsed.appsScriptUrl && parsed.appsScriptUrl.trim() !== ''
              ? parsed.appsScriptUrl
              : INITIAL_SETTINGS.appsScriptUrl,
        };
      }
      return INITIAL_SETTINGS;
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
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(new Date());
  const [isRefreshingOrders, setIsRefreshingOrders] = useState<boolean>(false);
  const [sheetsScriptNeedsUpdate, setSheetsScriptNeedsUpdate] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Helper to ensure all order items have accurate unit prices & subtotals (fixes item price 0 from sheet rows)
  const enrichOrdersWithMenuPricing = (ordersList: OrderData[], currentMenu: MenuItem[]): OrderData[] => {
    if (!ordersList || !Array.isArray(ordersList)) return [];
    return ordersList.map((order) => {
      if (!order || !order.items || order.items.length === 0) return order;
      const updatedItems = order.items.map((it) => {
        let harga = it.harga || 0;
        let subtotal = it.subtotal || 0;
        if (harga === 0 || subtotal === 0) {
          const match = currentMenu.find(
            (m) =>
              m.nama.toLowerCase().trim() === it.nama.toLowerCase().trim() ||
              it.nama.toLowerCase().includes(m.nama.toLowerCase()) ||
              m.nama.toLowerCase().includes(it.nama.toLowerCase())
          );
          if (match) {
            harga = match.harga;
            subtotal = match.harga * (it.qty || 1);
          } else if (order.items && order.items.length === 1 && order.totalHarga > 0) {
            subtotal = order.totalHarga;
            harga = Math.round(order.totalHarga / (it.qty || 1));
          }
        }
        return {
          ...it,
          harga,
          subtotal: subtotal || (harga * (it.qty || 1)),
        };
      });
      return {
        ...order,
        items: updatedItems,
      };
    });
  };

  // Auto-repair & enrich existing orders whenever menuItems are loaded or updated
  useEffect(() => {
    if (menuItems.length > 0) {
      setOrders((prev) => {
        const enriched = enrichOrdersWithMenuPricing(prev, menuItems);
        try {
          localStorage.setItem('dimsumanyu_orders', JSON.stringify(enriched));
        } catch {}
        return enriched;
      });
    }
  }, [menuItems]);

  // Helper to fetch directly from Google Apps Script if server endpoint fails or runs on static Vercel
  const fetchDirectFromGoogleSheets = async (): Promise<OrderData[] | null> => {
    const targetUrl = settings.appsScriptUrl || INITIAL_SETTINGS.appsScriptUrl;
    if (!targetUrl) return null;
    try {
      const url = `${targetUrl}?action=getOrders&_t=${Date.now()}`;
      const res = await fetch(url, { redirect: 'follow' });
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {}

      if (data && data.success && Array.isArray(data.orders)) {
        setSheetsScriptNeedsUpdate(false);
        return data.orders;
      }

      // If response is {"status":"ok", ...} but without orders, the script is running old Code.gs
      if (data && data.status === 'ok' && !data.orders) {
        setSheetsScriptNeedsUpdate(true);
      }
    } catch (e) {
      console.warn('Direct fetch from Google Sheets failed:', e);
    }
    return null;
  };

  // Dedicated real-time order refresher across all devices (iPhone 13, iPhone 15, desktop, etc.)
  const fetchOrdersOnly = async () => {
    try {
      // 1. ALWAYS prioritize direct live fetch from Google Sheets (Central Source of Truth across all devices)
      const sheetOrders = await fetchDirectFromGoogleSheets();
      if (sheetOrders && Array.isArray(sheetOrders)) {
        setOrders(prev => {
          const remoteIds = new Set(sheetOrders.map((o: OrderData) => o.id));
          const localOnly = prev.filter(p => p && !remoteIds.has(p.id));
          const merged = enrichOrdersWithMenuPricing([...sheetOrders, ...localOnly], menuItems);
          try {
            localStorage.setItem('dimsumanyu_orders', JSON.stringify(merged));
          } catch {}
          return merged;
        });
        setLastSyncedTime(new Date());
        return;
      }

      // 2. Fallback only if Google Sheets direct was unreachable (e.g. offline)
      const resOrders = await fetch('/api/orders')
        .then(r => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null))
        .catch(() => null);

      if (resOrders?.orders && Array.isArray(resOrders.orders) && resOrders.orders.length > 0) {
        setOrders(prev => {
          const remoteIds = new Set(resOrders.orders.map((o: OrderData) => o.id));
          const localOnly = prev.filter(p => p && !remoteIds.has(p.id));
          const merged = enrichOrdersWithMenuPricing([...resOrders.orders, ...localOnly], menuItems);
          try {
            localStorage.setItem('dimsumanyu_orders', JSON.stringify(merged));
          } catch {}
          return merged;
        });
        setLastSyncedTime(new Date());
      }
    } catch (e) {
      console.warn('Error refreshing orders:', e);
    }
  };

  const handleManualRefreshOrders = async () => {
    setIsRefreshingOrders(true);
    setSyncFeedback(null);
    try {
      // 1. First pull on server if running in fullstack mode
      await fetch('/api/orders/pull-sheets').catch(() => null);

      // 2. Pull directly from Google Sheets
      const sheetOrders = await fetchDirectFromGoogleSheets();
      if (sheetOrders && Array.isArray(sheetOrders)) {
        setOrders(prev => {
          const remoteIds = new Set(sheetOrders.map((o: OrderData) => o.id));
          const localOnly = prev.filter(p => p && !remoteIds.has(p.id));
          const merged = enrichOrdersWithMenuPricing([...sheetOrders, ...localOnly], menuItems);
          try {
            localStorage.setItem('dimsumanyu_orders', JSON.stringify(merged));
          } catch {}
          return merged;
        });
        setLastSyncedTime(new Date());
        setSyncFeedback(`✅ Berhasil menyinkronkan ${sheetOrders.length} pesanan dari Google Sheets!`);
      } else {
        await fetchOrdersOnly();
        if (sheetsScriptNeedsUpdate) {
          setSyncFeedback('⚠️ Google Apps Script perlu di-deploy Versi Baru agar pesanan dari semua HP masuk.');
        } else {
          setSyncFeedback('Pesanan berhasil disegarkan.');
        }
      }
    } finally {
      setIsRefreshingOrders(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  // Load Initial Data (with resilient fallback for static Vercel hosting)
  const fetchData = async () => {
    try {
      // 1. Try fetching from server if running in fullstack mode
      const [resMenu, resSettings] = await Promise.all([
        fetch('/api/menu')
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

      // 2. Primary: Fetch directly from Google Sheets
      const directOrders = await fetchDirectFromGoogleSheets();
      if (directOrders && Array.isArray(directOrders)) {
        setOrders(prev => {
          const serverIds = new Set(directOrders.map((o: OrderData) => o.id));
          const localOnly = prev.filter(p => p && !serverIds.has(p.id));
          const merged = enrichOrdersWithMenuPricing([...directOrders, ...localOnly], menuItems);
          try {
            localStorage.setItem('dimsumanyu_orders', JSON.stringify(merged));
          } catch {}
          return merged;
        });
        setLastSyncedTime(new Date());
      } else {
        // Fallback: query /api/orders
        const resOrders = await fetch('/api/orders')
          .then(r => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null))
          .catch(() => null);
        if (resOrders?.orders && Array.isArray(resOrders.orders) && resOrders.orders.length > 0) {
          setOrders(prev => {
            const serverIds = new Set(resOrders.orders.map((o: OrderData) => o.id));
            const localOnly = prev.filter(p => p && !serverIds.has(p.id));
            const merged = enrichOrdersWithMenuPricing([...resOrders.orders, ...localOnly], menuItems);
            try {
              localStorage.setItem('dimsumanyu_orders', JSON.stringify(merged));
            } catch {}
            return merged;
          });
          setLastSyncedTime(new Date());
        }
      }

      if (resSettings?.settings) {
        setSettings(resSettings.settings);
        localStorage.setItem('dimsumanyu_settings', JSON.stringify(resSettings.settings));
      }
    } catch (e) {
      console.warn('Using client-side localStorage state (resilient mode):', e);
    }
  };

  // Real-time synchronization across all devices (iPhone 13, iPhone 15, desktop, etc.)
  useEffect(() => {
    fetchData();

    // Auto-poll orders: every 7 seconds when Admin view is active, every 30 seconds when in customer view
    const intervalTime = activeView === 'admin' ? 7000 : 30000;
    const interval = setInterval(() => {
      fetchOrdersOnly();
    }, intervalTime);

    // Refresh immediately when tab gains focus or mobile device is unlocked
    const handleFocus = () => {
      fetchOrdersOnly();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Check URL parameters for admin shortcut (?admin=true or ?mode=admin)
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true' || params.get('mode') === 'admin') {
      const isAuth = localStorage.getItem('dimsumanyu_admin_session') === 'authenticated';
      if (isAuth) {
        setIsAdminLoggedIn(true);
        setActiveView('admin');
        fetchOrdersOnly();
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

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [activeView]);

  // Admin Auth Handlers
  const handleOpenAdminLogin = () => {
    if (isAdminLoggedIn) {
      const nextView = activeView === 'admin' ? 'order' : 'admin';
      setActiveView(nextView);
      if (nextView === 'admin') {
        fetchOrdersOnly();
      }
    } else {
      setShowLoginModal(true);
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setActiveView('admin');
    fetchOrdersOnly();
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
      // 1. Send with standard fetch (follow redirect to allow Google Apps Script to finish)
      fetch(targetUrl, { method: 'GET', redirect: 'follow' }).catch(() => {});
      // 2. Fallback mode: 'no-cors'
      fetch(targetUrl, { mode: 'no-cors' }).catch(() => {});
      // 3. Fallback Image beacon to guarantee delivery on iOS Safari / iPhone 13 even on tab switch
      if (typeof Image !== 'undefined') {
        const beacon = new Image();
        beacon.src = targetUrl;
      }
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

      const rincianText = orderItems.map(it => `${it.qty}x ${it.nama} (${formatRupiah(it.subtotal)})`).join('\n');

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

      // 1. ALWAYS dispatch order directly to Google Apps Script (Single Cloud Source of Truth)
      await sendDirectToAppsScript(finalOrder);
      finalOrder.syncedToSheets = true;
      finalOrder.sheetsSyncTimestamp = new Date().toISOString();

      // 2. Also notify Node backend if running in fullstack mode
      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalOrder),
        });
      } catch (backendErr) {
        // static hosting fallback
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
      if (settings.appsScriptUrl) {
        const updateUrl = `${settings.appsScriptUrl}?action=updateStatus&id=${encodeURIComponent(id)}&status=${encodeURIComponent(status)}&_t=${Date.now()}`;
        fetch(updateUrl, { redirect: 'follow' }).catch(() => {});
        if (updatedOrder) {
          sendDirectToAppsScript(updatedOrder);
        }
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
      console.error('Gagal menghapus pesanan:', err);
    }
  };

  const handleMarkOrderAsPrinted = async (id: string) => {
    try {
      const now = new Date().toISOString();
      setOrders(prev => {
        const updated = prev.map(o => {
          if (o.id === id) {
            return {
              ...o,
              printCount: (o.printCount || 0) + 1,
              lastPrintedAt: now,
            };
          }
          return o;
        });
        try {
          localStorage.setItem('dimsumanyu_orders', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      try {
        await fetch(`/api/orders/${id}/print`, { method: 'PATCH' });
      } catch {}
    } catch (err: any) {
      console.error('Gagal memperbarui status cetak:', err);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20 text-stone-800 flex flex-col justify-between w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-full">
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

        <main className="max-w-4xl mx-auto px-3 sm:px-4 py-3.5 sm:py-5 space-y-4 sm:space-y-5 w-full max-w-full">
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
              onLogout={handleAdminLogout}
              onViewStore={() => setActiveView('order')}
              onMarkAsPrinted={handleMarkOrderAsPrinted}
              isSyncing={isSyncing}
              onRefreshOrders={handleManualRefreshOrders}
              isRefreshing={isRefreshingOrders}
              lastSyncedTime={lastSyncedTime}
              sheetsScriptNeedsUpdate={sheetsScriptNeedsUpdate}
              syncFeedback={syncFeedback}
            />
          )}
        </main>
      </div>

      {/* Footer with Discreet Admin Portal Link */}
      <footer className="mt-12 border-t border-stone-200/80 bg-white py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center flex-wrap gap-2">
            <span className="font-extrabold text-stone-900">DIMSUMANYU</span>
            <span>•</span>
            <span className="text-red-600 font-bold">#SensasiNgedaging</span>
            <span>•</span>
            <a
              href="https://www.instagram.com/dimsumanyu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-stone-700 hover:text-pink-600 transition"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-600" />
              <span>IG: @dimsumanyu</span>
            </a>
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
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 z-30 px-3 sm:px-4 py-2.5 sm:py-3 shadow-2xl w-full max-w-full">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
            <div>
              <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">
                Total ({cartItemCount} Porsi):
              </p>
              <p className="font-black text-red-600 text-sm sm:text-lg leading-tight">
                {formatRupiah(totalCartAmount)}
              </p>
            </div>

            <button
              onClick={handleProceedToStep2}
              disabled={cartItemCount === 0}
              className={`px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-1.5 sm:gap-2 transition shrink-0 ${
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
        settings={settings}
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
