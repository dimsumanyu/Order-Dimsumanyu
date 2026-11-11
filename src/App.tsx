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
import { PWAInstallModal } from './components/PWAInstallModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MenuItem, OrderData, AppSettings, ShippingOption, PaymentMethod, OrderStatus } from './types';
import { INITIAL_MENU, INITIAL_SETTINGS } from './data/initialMenu';
import { formatRupiah } from './utils/whatsapp';
import { ArrowRight, Lock, Instagram, Download } from 'lucide-react';

export function isCorruptedMenuList(list: MenuItem[]): boolean {
  if (!Array.isArray(list) || list.length === 0) return true;
  const countGeneric = list.filter(m => m && (m.nama === 'DIMSUM KUKUS' || m.nama === 'DIMSUM GORENG')).length;
  if (countGeneric >= 2) return true;

  const frozenCount = list.filter(m => m && m.kategori === 'DIMSUM FROZEN').length;
  if (list.length >= 10 && frozenCount > list.length / 2) return true;

  return false;
}

export function cleanAndSanitizeMenuItem(item: MenuItem): MenuItem {
  if (!item) return item;
  let nama = String(item.nama || '').trim();
  let kategori = String(item.kategori || 'DIMSUM').trim().toUpperCase();
  let harga = Number(item.harga) || 0;

  // 1. Only fix if nama is literally a generated technical ID (e.g. "menu-1794023945925-ldzx")
  if (/^menu-\d{10,}-[a-z0-9]+/i.test(nama)) {
    if (kategori && !kategori.startsWith('menu-')) {
      nama = kategori;
      kategori = 'DIMSUM FROZEN';
      if (harga <= 0 || harga < 1000) {
        if (nama.includes('6 PCS')) harga = 25000;
        else if (nama.includes('8 PCS')) harga = 33000;
        else if (nama.includes('5 PCS')) harga = 25000;
        else if (nama.includes('7 PCS')) harga = 35000;
        else if (nama.includes('16 PCS')) harga = 72000;
        else harga = 25000;
      }
    }
  }

  // 2. If nama was previously corrupted into generic names, restore proper food names
  if (nama === 'DIMSUM KUKUS') {
    if (harga === 25000) nama = 'KUKUS ORIGINAL ISI 6 PCS';
    else if (harga === 32000) nama = 'KUKUS MENTAI ISI 6 PCS';
    else if (harga === 33000) nama = 'KUKUS ORIGINAL ISI 8 PCS';
    else if (harga === 43000) nama = 'KUKUS MENTAI ISI 8 PCS';
    else nama = 'KUKUS ORIGINAL ISI 6 PCS';
    kategori = 'DIMSUM KUKUS';
  } else if (nama === 'DIMSUM GORENG') {
    if (harga === 25000) nama = 'GORENG ORIGINAL ISI 5 PCS';
    else if (harga === 35000) nama = 'GORENG MENTAI ISI 5 PCS';
    else if (harga === 45000) nama = 'GORENG MENTAI ISI 7 PCS';
    else nama = 'GORENG ORIGINAL ISI 5 PCS';
    kategori = 'DIMSUM GORENG';
  }

  // 3. Ensure accurate categories based on actual food name
  if (nama.startsWith('KUKUS ORIGINAL') || nama.startsWith('KUKUS MENTAI')) {
    kategori = nama.includes('16 PCS') ? 'PAKET FAMILY' : 'DIMSUM KUKUS';
  } else if (nama.startsWith('GORENG ORIGINAL') || nama.startsWith('GORENG MENTAI')) {
    kategori = nama.includes('16 PCS') ? 'PAKET FAMILY' : 'DIMSUM GORENG';
  } else if (nama.startsWith('MIX') || nama.startsWith('MINI MIX') || nama.startsWith('FAMILY MIX')) {
    if (nama.includes('FAMILY')) kategori = 'PAKET FAMILY MIX';
    else if (nama.includes('ISI 6')) kategori = 'PAKET MIX ISI 6';
    else if (nama.includes('ISI 8')) kategori = 'PAKET MIX ISI 8';
    else kategori = 'PAKET MIX';
  } else if (nama.includes('FROZEN')) {
    kategori = 'DIMSUM FROZEN';
  } else if (nama.includes('TEA')) {
    kategori = 'DRINK';
  } else if (nama.includes('BIRTHDAY')) {
    kategori = 'PAKET BIRTHDAY';
  } else if (nama.includes('SAUS') || nama.includes('CHILI') || nama.includes('MAYO')) {
    kategori = 'EXTRA SAUS';
  }

  // 4. Prevent item names like "ISI ... PCS" from becoming category pills
  if (/\bISI\s+\d+\s+PCS\b/i.test(kategori)) {
    if (kategori.includes('FROZEN')) kategori = 'DIMSUM FROZEN';
    else if (kategori.includes('KUKUS')) kategori = 'DIMSUM KUKUS';
    else if (kategori.includes('GORENG')) kategori = 'DIMSUM GORENG';
    else if (kategori.includes('MIX')) kategori = 'PAKET MIX';
    else kategori = 'DIMSUM';
  }

  // 5. Fix price typo if 7 instead of 35000
  if (harga === 7 && nama.includes('7 PCS')) {
    harga = 35000;
  }

  // 6. Pastikan kolom keterangan TIDAK PERNAH terisi teks "BEST SELLER"
  let keterangan = String(item.keterangan || '').trim();
  if (keterangan.toUpperCase() === 'BEST SELLER') {
    keterangan = '';
  }

  // 7. Normalisasi status Best Seller ke boolean murni
  const isBestSeller = Boolean(item.isBestSeller);

  return {
    ...item,
    nama,
    kategori,
    harga,
    keterangan,
    isBestSeller,
  };
}

export function cleanAndSanitizeMenuList(list: MenuItem[]): MenuItem[] {
  if (!Array.isArray(list) || list.length === 0) return INITIAL_MENU;
  if (isCorruptedMenuList(list)) {
    return INITIAL_MENU;
  }
  
  const seen = new Set<string>();
  const sanitized: MenuItem[] = [];
  for (const raw of list) {
    if (!raw) continue;
    const clean = cleanAndSanitizeMenuItem(raw);
    const key = clean.nama.toLowerCase();
    if (clean.nama === 'DIMSUM FROZEN' && list.length > 5) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    sanitized.push(clean);
  }

  return sanitized.length > 0 ? sanitized : INITIAL_MENU;
}

export default function App() {
  // Persisted Active View ('order' | 'admin') across page reloads and browser refreshes
  const [activeView, setActiveView] = useState<'order' | 'admin'>(() => {
    try {
      const hash = typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';
      if (hash === '#admin') {
        const isAuth = localStorage.getItem('dimsumanyu_admin_session') === 'authenticated';
        return isAuth ? 'admin' : 'order';
      }
      if (hash === '#order' || hash === '#menu') return 'order';

      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      if (searchParams && (searchParams.get('admin') === 'true' || searchParams.get('view') === 'admin' || searchParams.get('mode') === 'admin')) {
        const isAuth = localStorage.getItem('dimsumanyu_admin_session') === 'authenticated';
        return isAuth ? 'admin' : 'order';
      }

      const saved = localStorage.getItem('dimsumanyu_active_view');
      if (saved === 'admin') {
        const isAuth = localStorage.getItem('dimsumanyu_admin_session') === 'authenticated';
        return isAuth ? 'admin' : 'order';
      }
      return 'order';
    } catch {
      return 'order';
    }
  });

  // Persisted cart state across reloads
  const [cart, setCart] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('dimsumanyu_cart');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persisted checkout step (1 = Katalog Menu, 2 = Form Checkout)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    try {
      const savedStep = localStorage.getItem('dimsumanyu_current_step');
      const step = savedStep ? parseInt(savedStep, 10) : 1;
      if (step === 2) {
        const savedCart = localStorage.getItem('dimsumanyu_cart');
        const parsed = savedCart ? JSON.parse(savedCart) : {};
        const hasItems = Object.values(parsed).some((q: any) => Number(q) > 0);
        return hasItems ? 2 : 1;
      }
      return 1;
    } catch {
      return 1;
    }
  });
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem('dimsumanyu_menu');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !isCorruptedMenuList(parsed)) {
          return cleanAndSanitizeMenuList(parsed);
        }
      }
      try {
        localStorage.removeItem('dimsumanyu_menu');
      } catch {}
      return INITIAL_MENU;
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
  // Deleted Order IDs Tombstone (Prevents deleted orders from re-appearing when Google Sheets syncs/polls)
  const [deletedOrderIds, setDeletedOrderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dimsumanyu_deleted_order_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

// Helper strictly ensures only real customer orders (DAN- or DSM-) are treated as orders
const isRealCustomerOrder = (o: any): boolean => {
  if (!o || !o.id) return false;
  const idStr = String(o.id).trim();
  if (idStr.startsWith('menu-') || idStr.toLowerCase().startsWith('#menu-')) return false;
  return idStr.startsWith('DAN-') || idStr.startsWith('DSM-');
};

  const [orders, setOrders] = useState<OrderData[]>(() => {
    try {
      const savedDeleted = localStorage.getItem('dimsumanyu_deleted_order_ids');
      const deletedSet = new Set(savedDeleted ? JSON.parse(savedDeleted) : []);
      const saved = localStorage.getItem('dimsumanyu_orders');
      if (saved) {
        const parsed: OrderData[] = JSON.parse(saved);
        const filtered = parsed.filter(o => isRealCustomerOrder(o) && !deletedSet.has(o.id));
        try {
          localStorage.setItem('dimsumanyu_orders', JSON.stringify(filtered));
        } catch {}
        return filtered;
      }
      return [];
    } catch {
      return [];
    }
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showBestSellerOnly, setShowBestSellerOnly] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<OrderData | null>(null);
  const [showSheetsGuide, setShowSheetsGuide] = useState<boolean>(false);

  // Order Tracking States (Customer device history separated from Admin all-orders)
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<OrderData | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState<boolean>(false);
  const [showTrackSearchModal, setShowTrackSearchModal] = useState<boolean>(false);
  const [showPWAInstallModal, setShowPWAInstallModal] = useState<boolean>(false);
  const [myOrderIds, setMyOrderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dimsumanyu_my_order_ids');
      if (saved) return JSON.parse(saved);
      return [];
    } catch {
      return [];
    }
  });

  const handleAddMyOrderId = (orderId: string) => {
    setMyOrderIds(prev => {
      if (prev.includes(orderId)) return prev;
      const next = [orderId, ...prev];
      try {
        localStorage.setItem('dimsumanyu_my_order_ids', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleClearMyOrders = () => {
    setMyOrderIds([]);
    try {
      localStorage.removeItem('dimsumanyu_my_order_ids');
    } catch {}
  };

  // Admin security state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('dimsumanyu_admin_session') === 'authenticated';
  });
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(new Date());
  const [isRefreshingOrders, setIsRefreshingOrders] = useState<boolean>(false);
  const [sheetsScriptNeedsUpdate, setSheetsScriptNeedsUpdate] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Helper to ensure all order items have accurate unit prices, normalized clean names & subtotals
  const enrichOrdersWithMenuPricing = (ordersList: OrderData[], currentMenu: MenuItem[]): OrderData[] => {
    if (!ordersList || !Array.isArray(ordersList)) return [];
    return ordersList.map((order) => {
      if (!order) return order;

      // 1. Parse raw lines from rincianMenu if items is empty or contains split description fragments
      let rawItems = order.items;
      if (order.rincianMenu) {
        const rawLines = order.rincianMenu.replace(/\r/g, '').split('\n').filter(Boolean);
        const mergedLines: string[] = [];
        for (const line of rawLines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          // Only lines with a leading quantity (e.g. "1x", "2 x") or bullet count as a new item
          const isNewItem = /^(\d+)\s*x\s+/i.test(trimmed) || /^[•\-\*]\s*(\d+)?/i.test(trimmed);
          if (!isNewItem && mergedLines.length > 0) {
            // Append continuation description line (e.g. "(3 Pcs Kukus Mentai + ...)") to the preceding item
            mergedLines[mergedLines.length - 1] += ' ' + trimmed;
          } else {
            mergedLines.push(trimmed);
          }
        }

        const hadSplitFragments = rawItems && rawItems.some(it => {
          const t = (it.nama || '').trim();
          return t.startsWith('(') && t.includes('Pcs') && !t.match(/^\d+\s*x/i);
        });

        if (!rawItems || rawItems.length === 0 || hadSplitFragments) {
          rawItems = mergedLines.map((l, lIdx) => {
            let lineQty = 1;
            let lineNama = l.trim();
            const qMatch = lineNama.match(/^(\d+)\s*x\s+(.+)$/i);
            if (qMatch) {
              lineQty = parseInt(qMatch[1], 10) || 1;
              lineNama = qMatch[2].trim();
            }
            let lineHarga = 0;
            const pMatch = lineNama.match(/\(?Rp\.?\s*([0-9.,]+)\)?/i);
            if (pMatch) {
              lineHarga = parseInt(pMatch[1].replace(/[^0-9]/g, ''), 10) || 0;
              lineNama = lineNama.replace(/\(?Rp\.?\s*[0-9.,]+\)?/gi, '').trim();
            }
            return {
              id: `item-${lIdx}`,
              nama: lineNama,
              qty: lineQty,
              harga: lineHarga,
              subtotal: lineHarga * lineQty,
            };
          });
        }
      }

      const updatedItems = (rawItems || []).map((it) => {
        let itNama = (it.nama || '').trim();
        let itQty = Number(it.qty) || 1;

        // Strip leading multiplier if present
        const leadingM = itNama.match(/^(\d+)\s*x\s+(.+)$/i);
        if (leadingM) {
          itQty = parseInt(leadingM[1], 10) || itQty;
          itNama = leadingM[2].trim();
        }

        // Strip trailing multiplier like (1x), (2x)
        const trailingM = itNama.match(/[\(\[]\s*(\d+)?\s*x\s*(\d+)?\s*[\)\]]$/i);
        if (trailingM) {
          const mult = parseInt(trailingM[1] || trailingM[2] || '1', 10);
          if (mult > 0 && it.qty === 1 && !leadingM) {
            itQty = mult;
          }
          itNama = itNama.replace(/[\(\[]\s*(\d+)?\s*x\s*(\d+)?\s*[\)\]]$/i, '').trim();
        }

        // Strip price annotations like (Rp 25.000)
        let harga = it.harga || 0;
        const pMatch = itNama.match(/\(?Rp\.?\s*([0-9.,]+)\)?/i);
        if (pMatch) {
          if (!harga) {
            harga = parseInt(pMatch[1].replace(/[^0-9]/g, ''), 10) || 0;
          }
          itNama = itNama.replace(/\(?Rp\.?\s*[0-9.,]+\)?/gi, '').trim();
        }

        itNama = itNama.replace(/^[•\-\*\.]\s*/, '').replace(/\s+/g, ' ').trim();

        // Match with currentMenu
        const cleanCompare = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetClean = cleanCompare(itNama);

        const match = currentMenu.find((m) => {
          const mClean = cleanCompare(m.nama);
          return (
            mClean === targetClean ||
            (targetClean.length > 8 && mClean.startsWith(targetClean)) ||
            (targetClean.length > 8 && targetClean.startsWith(mClean))
          );
        });

        if (match) {
          itNama = match.nama;
          if (harga === 0) harga = match.harga;
        }

        let subtotal = it.subtotal || 0;
        if (subtotal === 0 || harga === 0) {
          if (harga > 0) {
            subtotal = harga * itQty;
          } else if (rawItems && rawItems.length === 1 && order.totalHarga > 0) {
            subtotal = order.totalHarga;
            harga = Math.round(order.totalHarga / itQty);
          }
        }

        return {
          ...it,
          nama: itNama,
          qty: itQty,
          harga,
          subtotal: subtotal || (harga * itQty),
        };
      });

      // DEDUPLICATION: Detect ghost twin duplicates from split description lines
      const deduplicatedItems: typeof updatedItems = [];
      const seenItems = new Map<string, number>();

      for (const it of updatedItems) {
        const normName = it.nama.trim().toLowerCase();
        // Skip orphaned parentheses line e.g. "(3 Pcs Kukus Mentai ...)"
        if (normName.startsWith('(') && normName.endsWith(')')) {
          continue;
        }

        if (seenItems.has(normName)) {
          const existingIdx = seenItems.get(normName)!;
          const currentSum = deduplicatedItems.reduce((acc, curr) => acc + curr.subtotal, 0);
          // If adding another copy exceeds totalHarga, it's definitely a ghost duplicate caused by newline split!
          if (order.totalHarga > 0 && (currentSum + it.subtotal > order.totalHarga)) {
            continue; // Skip the ghost twin!
          }
          deduplicatedItems[existingIdx].qty += it.qty;
          deduplicatedItems[existingIdx].subtotal += it.subtotal;
        } else {
          seenItems.set(normName, deduplicatedItems.length);
          deduplicatedItems.push({ ...it });
        }
      }

      const finalItems = deduplicatedItems.length > 0 ? deduplicatedItems : updatedItems;

      // Sanitize corrupted alamat that was mistakenly filled with menu items
      let cleanAlamat = order.alamat || '';
      if (
        cleanAlamat.match(/^\d+x\s+/i) ||
        cleanAlamat.includes('(Rp ') ||
        cleanAlamat === order.rincianMenu
      ) {
        cleanAlamat = order.opsiPengiriman === 'Ambil di Outlet' ? 'Ambil langsung di Outlet DIMSUMANYU' : '';
      }

      // If opsiPengiriman is actually an address string, normalize it
      let cleanOpsi: ShippingOption = (order.opsiPengiriman || 'Diantar ke Alamat') as ShippingOption;
      if (cleanOpsi !== 'Ambil di Outlet' && cleanOpsi !== 'Diantar ke Alamat') {
        if (!cleanAlamat || cleanAlamat === cleanOpsi || cleanAlamat === '-') {
          cleanAlamat = String(cleanOpsi);
        }
        cleanOpsi = 'Diantar ke Alamat';
      }

      // Ensure ongkir is accurately set by calculating difference between totalHarga and itemsSubtotal
      const itemsSubtotal = finalItems.reduce((sum, it) => sum + (it.subtotal || (it.harga * it.qty)), 0);
      let cleanOngkir = Number(order.ongkir) || 0;
      if (order.totalHarga > itemsSubtotal && itemsSubtotal > 0) {
        cleanOngkir = Math.max(cleanOngkir, order.totalHarga - itemsSubtotal);
      }
      if (cleanOngkir > 0 && cleanOpsi !== 'Diantar ke Alamat') {
        cleanOpsi = 'Diantar ke Alamat';
      }

      return {
        ...order,
        opsiPengiriman: cleanOpsi,
        alamat: cleanAlamat,
        items: finalItems,
        ongkir: cleanOngkir,
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

  // Helper to fetch menu directly from Google Sheets (Central Source of Truth across all devices)
  const fetchDirectMenuFromGoogleSheets = async (): Promise<MenuItem[] | null> => {
    const targetUrl = settings.appsScriptUrl || INITIAL_SETTINGS.appsScriptUrl;
    if (!targetUrl) return null;
    try {
      const url = `${targetUrl}?action=getMenu&_t=${Date.now()}`;
      const res = await fetch(url, { redirect: 'follow' });
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {}

      if (data && (Array.isArray(data.menu) || Array.isArray(data))) {
        const list: MenuItem[] = Array.isArray(data.menu) ? data.menu : data;
        if (list.length > 0) {
          return cleanAndSanitizeMenuList(list);
        }
      }
    } catch (e) {
      console.warn('Direct fetch menu from Google Sheets failed:', e);
    }
    return null;
  };

  // Dedicated real-time order refresher across all devices (iPhone 13, iPhone 15, desktop, etc.)
  const fetchOrdersOnly = async () => {
    try {
      const currentDeletedList: string[] = (() => {
        try {
          return JSON.parse(localStorage.getItem('dimsumanyu_deleted_order_ids') || '[]');
        } catch {
          return [];
        }
      })();
      const deletedSet = new Set(currentDeletedList);

      // 1. ALWAYS prioritize direct live fetch from Google Sheets (Central Source of Truth across all devices)
      const sheetOrders = await fetchDirectFromGoogleSheets();
      if (sheetOrders && Array.isArray(sheetOrders)) {
        const validSheetOrders = sheetOrders.filter((o: OrderData) => isRealCustomerOrder(o) && !deletedSet.has(o.id));
        setOrders(prev => {
          const remoteIds = new Set(validSheetOrders.map((o: OrderData) => o.id));
          const localOnly = prev.filter(p => isRealCustomerOrder(p) && !remoteIds.has(p.id) && !deletedSet.has(p.id));
          const merged = enrichOrdersWithMenuPricing([...validSheetOrders, ...localOnly], menuItems);
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
        const validBackendOrders = resOrders.orders.filter((o: OrderData) => isRealCustomerOrder(o) && !deletedSet.has(o.id));
        setOrders(prev => {
          const remoteIds = new Set(validBackendOrders.map((o: OrderData) => o.id));
          const localOnly = prev.filter(p => isRealCustomerOrder(p) && !remoteIds.has(p.id) && !deletedSet.has(p.id));
          const merged = enrichOrdersWithMenuPricing([...validBackendOrders, ...localOnly], menuItems);
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
      const currentDeletedList: string[] = (() => {
        try {
          return JSON.parse(localStorage.getItem('dimsumanyu_deleted_order_ids') || '[]');
        } catch {
          return [];
        }
      })();
      const deletedSet = new Set(currentDeletedList);

      // 1. First pull on server if running in fullstack mode
      await fetch('/api/orders/pull-sheets').catch(() => null);

      // 2. Pull directly from Google Sheets
      const sheetOrders = await fetchDirectFromGoogleSheets();
      if (sheetOrders && Array.isArray(sheetOrders)) {
        const validSheetOrders = sheetOrders.filter((o: OrderData) => isRealCustomerOrder(o) && !deletedSet.has(o.id));
        setOrders(prev => {
          const remoteIds = new Set(validSheetOrders.map((o: OrderData) => o.id));
          const localOnly = prev.filter(p => isRealCustomerOrder(p) && !remoteIds.has(p.id) && !deletedSet.has(p.id));
          const merged = enrichOrdersWithMenuPricing([...validSheetOrders, ...localOnly], menuItems);
          try {
            localStorage.setItem('dimsumanyu_orders', JSON.stringify(merged));
          } catch {}
          return merged;
        });
        setLastSyncedTime(new Date());
        setSyncFeedback(`✅ Berhasil menyinkronkan ${validSheetOrders.length} pesanan dari Google Sheets!`);
      } else {
        await fetchOrdersOnly();
        if (sheetsScriptNeedsUpdate) {
          setSyncFeedback('⚠️ Google Apps Script perlu di-deploy Versi Baru agar pesanan dari semua HP masuk.');
        } else {
          setSyncFeedback('Pesanan berhasil disegarkan.');
        }
      }

      // Also refresh menu from Google Sheets
      const sheetMenu = await fetchDirectMenuFromGoogleSheets();
      if (sheetMenu && Array.isArray(sheetMenu) && sheetMenu.length > 0) {
        setMenuItems(sheetMenu);
        try {
          localStorage.setItem('dimsumanyu_menu', JSON.stringify(sheetMenu));
        } catch {}
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

      // 2. Fetch menu from Google Sheets (Central Source of Truth)
      const sheetMenu = await fetchDirectMenuFromGoogleSheets();
      if (sheetMenu && Array.isArray(sheetMenu) && sheetMenu.length > 0) {
        setMenuItems(sheetMenu);
        try {
          localStorage.setItem('dimsumanyu_menu', JSON.stringify(sheetMenu));
        } catch {}
      } else if (resMenu?.menu) {
        setMenuItems(resMenu.menu);
        localStorage.setItem('dimsumanyu_menu', JSON.stringify(resMenu.menu));
      }

      // 2. Primary: Fetch directly from Google Sheets
      const directOrders = await fetchDirectFromGoogleSheets();
      if (directOrders && Array.isArray(directOrders)) {
        const validDirectOrders = directOrders.filter((o: OrderData) => isRealCustomerOrder(o));
        setOrders(prev => {
          const serverIds = new Set(validDirectOrders.map((o: OrderData) => o.id));
          const localOnly = prev.filter(p => isRealCustomerOrder(p) && !serverIds.has(p.id));
          const merged = enrichOrdersWithMenuPricing([...validDirectOrders, ...localOnly], menuItems);
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
          const validBackend = resOrders.orders.filter((o: OrderData) => isRealCustomerOrder(o));
          setOrders(prev => {
            const serverIds = new Set(validBackend.map((o: OrderData) => o.id));
            const localOnly = prev.filter(p => isRealCustomerOrder(p) && !serverIds.has(p.id));
            const merged = enrichOrdersWithMenuPricing([...validBackend, ...localOnly], menuItems);
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

  // Synchronize activeView with localStorage & URL hash so refresh always preserves current view
  useEffect(() => {
    try {
      localStorage.setItem('dimsumanyu_active_view', activeView);
      const targetHash = activeView === 'admin' ? '#admin' : '#order';
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    } catch {}
  }, [activeView]);

  // Synchronize cart with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dimsumanyu_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Synchronize checkout step (1 = Menu, 2 = Checkout) with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dimsumanyu_current_step', currentStep.toString());
    } catch {}
  }, [currentStep]);

  // Listen to browser Back/Forward navigation hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin') {
        const isAuth = localStorage.getItem('dimsumanyu_admin_session') === 'authenticated';
        if (isAuth) {
          setIsAdminLoggedIn(true);
          setActiveView('admin');
        } else {
          setShowLoginModal(true);
        }
      } else if (hash === '#order' || hash === '#menu' || hash === '') {
        setActiveView('order');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
    localStorage.setItem('dimsumanyu_active_view', 'admin');
    setActiveView('admin');
    try {
      window.history.replaceState(null, '', '#admin');
    } catch {}
    fetchOrdersOnly();
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('dimsumanyu_admin_session');
    localStorage.setItem('dimsumanyu_active_view', 'order');
    setIsAdminLoggedIn(false);
    setActiveView('order');
    try {
      window.history.replaceState(null, '', '#order');
    } catch {}
  };

  // Extract Categories (Ensuring single product names never spill into category pills)
  const categories = useMemo(() => {
    const rawList = menuItems.map(m => m.kategori.trim().toUpperCase());
    const valid = rawList.filter(cat => cat && !/\bISI\s+\d+\s+PCS\b/i.test(cat) && cat.length < 25);
    const unique = Array.from(new Set(valid));
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

  // Helper to send order directly to Google Apps Script Webhook (Single clean request, deduplicated)
  const sendDirectToAppsScript = async (order: OrderData): Promise<boolean> => {
    const targetScriptUrl = settings.appsScriptUrl || INITIAL_SETTINGS.appsScriptUrl;
    if (!targetScriptUrl) return false;
    try {
      const targetUrl = `${targetScriptUrl}?action=order&payload=${encodeURIComponent(JSON.stringify(order))}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(targetUrl, { method: 'GET', redirect: 'follow', signal: controller.signal });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      // Fallback single no-cors request if redirect/CORS blocked standard fetch
      try {
        await fetch(`${targetScriptUrl}?action=order&payload=${encodeURIComponent(JSON.stringify(order))}`, {
          method: 'GET',
          mode: 'no-cors',
        });
        return true;
      } catch (fallbackErr) {
        console.warn('Direct Apps Script ping failed:', fallbackErr);
        return false;
      }
    }
  };

  // Submit Order Flow (100% resilient across Node server, Vercel, and direct client)
  const handleSubmitOrder = async (formData: {
    nama: string;
    phone: string;
    opsiPengiriman: ShippingOption;
    alamat: string;
    locationLat?: number;
    locationLng?: number;
    mapsUrl?: string;
    ongkir?: number;
    metodeBayar: PaymentMethod;
    catatan: string;
  }) => {
    if (isSubmitting) return; // Guard: prevent duplicate clicks
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

      const rincianText = orderItems.map(it => `${it.qty}x ${it.nama.replace(/\r?\n/g, ' ')} (${formatRupiah(it.subtotal)})`).join('\n');

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const generatedOrderId = `DAN-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      const deliveryOngkir = formData.opsiPengiriman === 'Diantar ke Alamat' ? Math.max(0, formData.ongkir || 0) : 0;
      const combinedTotal = totalCartAmount + deliveryOngkir;

      let finalOrder: OrderData = {
        id: generatedOrderId,
        nama: formData.nama.trim(),
        phone: formData.phone.trim(),
        opsiPengiriman: formData.opsiPengiriman,
        alamat: formData.alamat.trim(),
        locationLat: formData.locationLat,
        locationLng: formData.locationLng,
        mapsUrl: formData.mapsUrl,
        ongkir: deliveryOngkir,
        metodeBayar: formData.metodeBayar,
        catatan: formData.catatan.trim(),
        rincianMenu: rincianText,
        totalHarga: combinedTotal,
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

      // 4. Save to device's "Pesanan Saya" (history for this customer/browser)
      setMyOrderIds(prev => {
        const updated = [finalOrder.id, ...prev.filter(id => id !== finalOrder.id)];
        try {
          localStorage.setItem('dimsumanyu_my_order_ids', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // 5. Set completed order to trigger OrderSuccessModal
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

  const handleUpdateOrder = async (updatedOrder: OrderData) => {
    try {
      // 1. Update local state
      setOrders(prev => {
        const next = prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o));
        try {
          localStorage.setItem('dimsumanyu_orders', JSON.stringify(next));
        } catch {}
        return next;
      });

      // 2. Update tracking modal if active
      if (selectedOrderForTracking && selectedOrderForTracking.id === updatedOrder.id) {
        setSelectedOrderForTracking(updatedOrder);
      }

      // 3. Update backend server
      try {
        await fetch(`/api/orders/${encodeURIComponent(updatedOrder.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedOrder),
        });
      } catch {}

      // 4. Update Google Sheets
      if (settings.appsScriptUrl) {
        sendDirectToAppsScript(updatedOrder);
      }
    } catch (err: any) {
      alert('Gagal memperbarui pesanan: ' + err.message);
    }
  };

  const handleBatchUpdateStatus = async (ids: string[], newStatus: OrderStatus) => {
    const idSet = new Set(ids);
    const updatedList: OrderData[] = [];
    try {
      // 1. Update local state
      setOrders(prev => {
        const next = prev.map(o => {
          if (idSet.has(o.id)) {
            const mod = { ...o, status: newStatus };
            updatedList.push(mod);
            return mod;
          }
          return o;
        });
        try {
          localStorage.setItem('dimsumanyu_orders', JSON.stringify(next));
        } catch {}
        return next;
      });

      // 2. Update tracking if active
      if (selectedOrderForTracking && idSet.has(selectedOrderForTracking.id)) {
        setSelectedOrderForTracking(prev => (prev ? { ...prev, status: newStatus } : null));
      }

      // 3. Update backend server in batch
      try {
        await fetch('/api/orders/batch/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, status: newStatus }),
        });
      } catch {}

      // 4. Update Google Sheets in background
      if (settings.appsScriptUrl) {
        for (const ord of updatedList) {
          const updateUrl = `${settings.appsScriptUrl}?action=updateStatus&id=${encodeURIComponent(ord.id)}&status=${encodeURIComponent(newStatus)}&_t=${Date.now()}`;
          fetch(updateUrl, { redirect: 'follow' }).catch(() => {});
        }
      }
    } catch (err: any) {
      alert('Gagal mengubah status massal: ' + err.message);
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
      let targetStatus: 'TERSEDIA' | 'HABIS' = 'TERSEDIA';
      let targetItem: MenuItem | undefined;
      setMenuItems(prev => {
        const updated = prev.map(item => {
          if (item.id === id) {
            targetStatus = item.status === 'TERSEDIA' ? 'HABIS' : 'TERSEDIA';
            targetItem = {
              ...item,
              status: targetStatus,
            };
            return targetItem;
          }
          return item;
        });
        localStorage.setItem('dimsumanyu_menu', JSON.stringify(updated));
        return updated;
      });

      const targetNama = targetItem ? targetItem.nama : '';

      // 1. Fullstack server dispatch
      try {
        await fetch('/api/menu/toggle-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, nama: targetNama }),
        });
      } catch {}

      // 2. Google Sheets sync (kirim nama produk sebagai id & nama agar sheet lama maupun baru langsung cocok)
      const targetUrl = settings.appsScriptUrl || INITIAL_SETTINGS.appsScriptUrl;
      if (targetUrl) {
        try {
          fetch(`${targetUrl}?action=toggleMenuStatus&id=${encodeURIComponent(targetNama || id)}&nama=${encodeURIComponent(targetNama)}&status=${targetStatus}&_t=${Date.now()}`, { mode: 'no-cors' }).catch(() => {});
        } catch {}
      }
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

  const handleSaveMenuItem = async (rawItem: MenuItem & { originalNama?: string }) => {
    const item = cleanAndSanitizeMenuItem(rawItem);
    try {
      // 1. Optimistic local update
      setMenuItems(prev => {
        const index = prev.findIndex(m => m.id === item.id || (rawItem.originalNama && m.nama.toLowerCase() === rawItem.originalNama.toLowerCase()) || m.nama.toLowerCase() === item.nama.toLowerCase());
        let updated: MenuItem[];
        if (index >= 0) {
          updated = [...prev];
          updated[index] = item;
        } else {
          updated = [...prev, item];
        }
        localStorage.setItem('dimsumanyu_menu', JSON.stringify(updated));
        return updated;
      });

      // 2. Fullstack server dispatch (menyimpan foto ke disk publik & relay server-to-server ke Google Apps Script)
      let finalItem = item;
      try {
        const res = await fetch('/api/menu/save-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, originalNama: rawItem.originalNama }),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData && resData.item) {
            finalItem = resData.item;
            setMenuItems(prev => {
              const next = prev.map(m => m.id === finalItem.id ? finalItem : m);
              localStorage.setItem('dimsumanyu_menu', JSON.stringify(next));
              return next;
            });
          }
        }
      } catch {}

      // 3. Direct Google Sheets client ping fallback (dengan payload URL gambar lengkap, tanpa Base64 raksasa)
      const targetUrl = settings.appsScriptUrl || INITIAL_SETTINGS.appsScriptUrl;
      if (targetUrl) {
        try {
          const safeItemForSheets = { ...finalItem, originalNama: rawItem.originalNama || finalItem.nama };
          // Jika gambar masih berupa base64 murni di browser, hapus dari query URL agar tidak error URI length
          if (safeItemForSheets.imageUrl && safeItemForSheets.imageUrl.startsWith('data:')) {
            delete safeItemForSheets.imageUrl;
          }
          // PENTING: Jangan kirim POST langsung dari browser ke Apps Script karena script lama di sheet akan menangkap POST sebagai pesanan baru!
          // Kirim pembaruan menu via GET dengan parameter action=saveMenuItem:
          const getUrl = `${targetUrl}?action=saveMenuItem&payload=${encodeURIComponent(JSON.stringify(safeItemForSheets))}&_t=${Date.now()}`;
          fetch(getUrl, { mode: 'no-cors' }).catch(() => {});
        } catch (sheetsErr) {
          console.warn('Sync menu to Google Sheets failed:', sheetsErr);
        }
      }
    } catch (err: any) {
      alert('Gagal menyimpan menu: ' + err.message);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    try {
      const targetItem = menuItems.find(m => m.id === id);
      const targetNama = targetItem ? targetItem.nama : id;

      setMenuItems(prev => {
        const updated = prev.filter(m => m.id !== id);
        localStorage.setItem('dimsumanyu_menu', JSON.stringify(updated));
        return updated;
      });

      setCart(prev => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });

      // 1. Fullstack server dispatch (juga me-relay delete ke Google Sheets)
      try {
        await fetch(`/api/menu/item/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
      } catch {}

      // 2. Direct client fallback ping ke Google Sheets
      const targetUrl = settings.appsScriptUrl || INITIAL_SETTINGS.appsScriptUrl;
      if (targetUrl) {
        try {
          fetch(`${targetUrl}?action=deleteMenuItem&id=${encodeURIComponent(targetNama)}&nama=${encodeURIComponent(targetNama)}&menuId=${encodeURIComponent(id)}&_t=${Date.now()}`, { mode: 'no-cors' }).catch(() => {});
        } catch {}
      }
    } catch (err: any) {
      alert('Gagal menghapus menu: ' + err.message);
    }
  };

  const handleToggleBestSeller = async (id: string) => {
    try {
      let targetItem: MenuItem | undefined;
      setMenuItems(prev => {
        const updated = prev.map(item => {
          if (item.id === id) {
            targetItem = {
              ...item,
              keterangan: (item.keterangan && item.keterangan.trim().toUpperCase() === 'BEST SELLER') ? '' : item.keterangan,
              isBestSeller: !item.isBestSeller,
            };
            return targetItem;
          }
          return item;
        });
        localStorage.setItem('dimsumanyu_menu', JSON.stringify(updated));
        return updated;
      });

      const targetNama = targetItem ? targetItem.nama : '';
      const isBsParam = targetItem?.isBestSeller ? 'YA' : 'TIDAK';

      // 1. Fullstack server dispatch (update lokal & langsung relay server-to-server ke Google Apps Script)
      try {
        await fetch('/api/menu/toggle-bestseller', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, nama: targetNama, isBestSeller: targetItem?.isBestSeller }),
        });
      } catch {}

      // 2. Direct client fallback ke Google Apps Script:
      // PENTING: Gunakan targetNama sebagai 'id' dan 'nama' agar script di Google Sheets (yang kolomnya 'Nama Menu', tanpa kolom 'ID') langsung menemukan baris dan mengubah statusnya menjadi YA / TIDAK!
      const targetUrl = settings.appsScriptUrl || INITIAL_SETTINGS.appsScriptUrl;
      if (targetUrl && targetItem) {
        try {
          const getUrl = `${targetUrl}?action=toggleBestSeller&id=${encodeURIComponent(targetNama || targetItem.id)}&nama=${encodeURIComponent(targetNama)}&menuId=${encodeURIComponent(targetItem.id)}&isBestSeller=${isBsParam}&_t=${Date.now()}`;
          fetch(getUrl, { mode: 'no-cors' }).catch(() => {});
        } catch {}
      }
    } catch (err: any) {
      alert('Gagal mengubah status best seller: ' + err.message);
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

  // Helper to notify Google Apps Script to delete rows from sheet 'Pesanan'
  const notifyAppsScriptDelete = (orderIds: string[]) => {
    const targetScriptUrl = settings.appsScriptUrl || INITIAL_SETTINGS.appsScriptUrl;
    if (!targetScriptUrl || orderIds.length === 0) return;
    try {
      const url = `${targetScriptUrl}?action=deleteOrders&orderIds=${encodeURIComponent(JSON.stringify(orderIds))}&_t=${Date.now()}`;
      fetch(url, { method: 'GET', redirect: 'follow', mode: 'no-cors' }).catch(() => null);
    } catch (e) {
      console.warn('Apps Script delete ping error:', e);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      // 1. Add to tombstone deletedOrderIds list (permanently prevents Google Sheets re-polling from adding it back)
      setDeletedOrderIds(prev => {
        const next = Array.from(new Set([...prev, id]));
        try {
          localStorage.setItem('dimsumanyu_deleted_order_ids', JSON.stringify(next));
        } catch {}
        return next;
      });

      // 2. Remove from local orders state and localStorage
      setOrders(prev => {
        const updated = prev.filter(o => o.id !== id);
        try {
          localStorage.setItem('dimsumanyu_orders', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // 3. Clean up customer local tracking
      setMyOrderIds(prev => {
        const updated = prev.filter(orderId => orderId !== id);
        try {
          localStorage.setItem('dimsumanyu_my_order_ids', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // 4. Notify backend server
      try {
        await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      } catch {}

      // 5. Notify Google Apps Script
      notifyAppsScriptDelete([id]);
    } catch (err: any) {
      console.error('Gagal menghapus pesanan:', err);
    }
  };

  const handleDeleteMultipleOrders = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    try {
      const idSet = new Set(ids);

      // 1. Add all to tombstone deletedOrderIds list
      setDeletedOrderIds(prev => {
        const next = Array.from(new Set([...prev, ...ids]));
        try {
          localStorage.setItem('dimsumanyu_deleted_order_ids', JSON.stringify(next));
        } catch {}
        return next;
      });

      // 2. Remove from local orders state and localStorage
      setOrders(prev => {
        const updated = prev.filter(o => !idSet.has(o.id));
        try {
          localStorage.setItem('dimsumanyu_orders', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // 3. Clean up local customer tracking IDs if any
      setMyOrderIds(prev => {
        const updated = prev.filter(id => !idSet.has(id));
        try {
          localStorage.setItem('dimsumanyu_my_order_ids', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // 4. Notify backend server
      try {
        await fetch('/api/orders/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
      } catch {}

      // 5. Notify Google Apps Script
      notifyAppsScriptDelete(ids);
    } catch (err: any) {
      console.error('Gagal menghapus beberapa pesanan:', err);
      throw err;
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
          onOpenInstallModal={() => setShowPWAInstallModal(true)}
        />

        <main className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-5 space-y-4 sm:space-y-5 w-full max-w-full">
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
                    menuItems={menuItems}
                  />

                  {/* Menu Grid */}
                  {filteredMenuItems.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500 text-xs">
                      Tidak ada menu yang sesuai dengan pencarian Anda.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
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
              onSaveMenuItem={handleSaveMenuItem}
              onDeleteMenuItem={handleDeleteMenuItem}
              onToggleBestSeller={handleToggleBestSeller}
              onUpdateSettings={handleUpdateSettings}
              onDeleteOrder={handleDeleteOrder}
              onDeleteMultipleOrders={handleDeleteMultipleOrders}
              onOpenSheetsGuide={() => setShowSheetsGuide(true)}
              onLogout={handleAdminLogout}
              onViewStore={() => setActiveView('order')}
              onMarkAsPrinted={handleMarkOrderAsPrinted}
              onUpdateOrder={handleUpdateOrder}
              onBatchUpdateStatus={handleBatchUpdateStatus}
              isSyncing={isSyncing}
              onRefreshOrders={handleManualRefreshOrders}
              isRefreshing={isRefreshingOrders}
              lastSyncedTime={lastSyncedTime}
              sheetsScriptNeedsUpdate={sheetsScriptNeedsUpdate}
              syncFeedback={syncFeedback}
              onOpenInstallModal={() => setShowPWAInstallModal(true)}
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
              onClick={() => setShowPWAInstallModal(true)}
              className="text-[11px] text-stone-600 hover:text-red-600 flex items-center gap-1 font-semibold transition cursor-pointer"
              title="Install aplikasi ke HP atau Tablet"
            >
              <Download className="w-3 h-3 text-red-600" />
              <span>Install App</span>
            </button>
            <span>•</span>
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

      {/* Customer Order Search Modal (Only shows customer's own device orders; Admin retains all orders) */}
      <TrackOrderSearchModal
        isOpen={showTrackSearchModal}
        onClose={() => setShowTrackSearchModal(false)}
        orders={orders}
        myOrderIds={myOrderIds}
        onAddMyOrderId={handleAddMyOrderId}
        onClearMyOrders={handleClearMyOrders}
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

      {/* PWA Install Modal (Android 1-click & iOS Safari Guide) */}
      <PWAInstallModal
        isOpen={showPWAInstallModal}
        onClose={() => setShowPWAInstallModal(false)}
      />

      {/* Offline Status Alert Banner */}
      <OfflineIndicator />
    </div>
  );
}
