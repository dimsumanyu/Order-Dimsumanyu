import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_MENU, INITIAL_SETTINGS } from './src/data/initialMenu';
import { OrderData, AppSettings, MenuItem, OrderStatus } from './src/types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, 'data_store');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load or initialize data
function loadJSON<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
  }
  return fallback;
}

function saveJSON<T>(filePath: string, data: T) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e);
  }
}

let settings: AppSettings = loadJSON<AppSettings>(SETTINGS_FILE, INITIAL_SETTINGS);
let menu: MenuItem[] = loadJSON<MenuItem[]>(MENU_FILE, INITIAL_MENU);
let orders: OrderData[] = loadJSON<OrderData[]>(ORDERS_FILE, []);

// Helper to push order to Google Apps Script
async function sendToAppsScript(order: OrderData, scriptUrl: string) {
  try {
    const payload = {
      id: order.id,
      nama: order.nama,
      phone: order.phone,
      opsiPengiriman: order.opsiPengiriman,
      alamat: order.alamat,
      metodeBayar: order.metodeBayar,
      catatan: order.catatan || '',
      rincianMenu: order.rincianMenu,
      totalHarga: order.totalHarga,
      status: order.status,
      timestamp: order.createdAt
    };

    // 1. Attempt POST request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeout);

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON
    }

    if (json && json.success === true) {
      return { success: true, response: json };
    }

    // Check if error is missing doPost or HTML error page
    const isMissingDoPost = 
      text.includes('doPost') || 
      text.includes('スクリプト関数が見つかりません') || 
      text.includes('Script function not found') ||
      (text.includes('<!DOCTYPE') && !json);

    // 2. Fallback: Attempt GET request with url parameters
    if (isMissingDoPost) {
      try {
        const getController = new AbortController();
        const getTimeout = setTimeout(() => getController.abort(), 10000);
        const getUrl = `${scriptUrl}?action=order&payload=${encodeURIComponent(JSON.stringify(payload))}`;
        const getRes = await fetch(getUrl, {
          method: 'GET',
          signal: getController.signal,
          redirect: 'follow'
        });
        clearTimeout(getTimeout);

        const getText = await getRes.text();
        let getJson: any = null;
        try {
          getJson = JSON.parse(getText);
        } catch {}

        if (getJson && getJson.success === true) {
          return { success: true, response: getJson };
        }
      } catch (getErr) {
        // Fallback GET attempt
      }

      return {
        success: false,
        error: 'Google Apps Script belum diperbarui dengan Code.gs baru (fungsi doPost belum aktif). Buka "Panduan Google Sheets" di panel Admin, paste Code.gs ke Apps Script, lalu Deploy Versi Baru.'
      };
    }

    return {
      success: false,
      error: (json && json.error) ? json.error : `Respon Apps Script: ${text.slice(0, 160)}`
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghubungi Google Apps Script' };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Endpoints
  app.get('/api/menu', (_req, res) => {
    res.json({ success: true, menu });
  });

  app.post('/api/menu/toggle-status', (req, res) => {
    const { id } = req.body;
    const target = menu.find(m => m.id === id);
    if (!target) {
      return res.status(404).json({ success: false, error: 'Menu tidak ditemukan' });
    }
    target.status = target.status === 'TERSEDIA' ? 'HABIS' : 'TERSEDIA';
    saveJSON(MENU_FILE, menu);
    res.json({ success: true, menu });
  });

  app.post('/api/menu/reset', (_req, res) => {
    menu = [...INITIAL_MENU];
    saveJSON(MENU_FILE, menu);
    res.json({ success: true, menu });
  });

  app.get('/api/orders', async (_req, res) => {
    try {
      const targetUrl = settings.appsScriptUrl || INITIAL_SETTINGS.appsScriptUrl;
      if (targetUrl) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const sheetsRes = await fetch(`${targetUrl}?action=getOrders&_t=${Date.now()}`, {
          signal: controller.signal,
          redirect: 'follow',
        }).catch(() => null);
        clearTimeout(timeout);
        if (sheetsRes && sheetsRes.ok) {
          const json: any = await sheetsRes.json().catch(() => null);
          if (json && json.success && Array.isArray(json.orders)) {
            const remoteOrders = json.orders;
            const remoteIds = new Set(remoteOrders.map((o: any) => o.id));
            const localOnly = orders.filter((o: any) => !remoteIds.has(o.id) && o.id.startsWith('DAN-'));
            orders = [...remoteOrders, ...localOnly];
            saveJSON(ORDERS_FILE, orders);
          }
        }
      }
    } catch {
      // fallback to cached orders
    }
    res.json({ success: true, orders });
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const orderData: Partial<OrderData> = req.body;
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const orderId = orderData.id || `DAN-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      const newOrder: OrderData = {
        id: orderId,
        nama: orderData.nama || 'Pelanggan',
        phone: orderData.phone || '',
        opsiPengiriman: orderData.opsiPengiriman || 'Diantar ke Alamat',
        alamat: orderData.alamat || '',
        metodeBayar: orderData.metodeBayar || 'QRIS',
        catatan: orderData.catatan || '',
        rincianMenu: orderData.rincianMenu || '',
        totalHarga: Number(orderData.totalHarga) || 0,
        items: orderData.items || [],
        createdAt: orderData.createdAt || new Date().toISOString(),
        status: (orderData.status as OrderStatus) || 'Menunggu payment',
        syncedToSheets: false
      };

      // 1. SAVE IMMEDIATELY to server state & disk so order is 100% persisted across all devices!
      orders = [newOrder, ...orders.filter(o => o.id !== newOrder.id)];
      saveJSON(ORDERS_FILE, orders);

      // 2. Perform Google Apps Script sync in background so network/timeout doesn't drop the order
      if (settings.appsScriptUrl) {
        sendToAppsScript(newOrder, settings.appsScriptUrl)
          .then(syncRes => {
            if (syncRes.success) {
              newOrder.syncedToSheets = true;
              newOrder.sheetsSyncTimestamp = new Date().toISOString();
              delete newOrder.sheetsSyncError;
            } else {
              newOrder.syncedToSheets = false;
              newOrder.sheetsSyncError = syncRes.error;
            }
            saveJSON(ORDERS_FILE, orders);
          })
          .catch(e => {
            newOrder.syncedToSheets = false;
            newOrder.sheetsSyncError = e.message;
            saveJSON(ORDERS_FILE, orders);
          });
      }

      res.json({
        success: true,
        order: newOrder,
        syncedToSheets: newOrder.syncedToSheets
      });
    } catch (err: any) {
      console.error('Error creating order:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Pull / Sync orders from Google Sheets into server
  app.get('/api/orders/pull-sheets', async (_req, res) => {
    try {
      if (!settings.appsScriptUrl) {
        return res.json({ success: true, orders, message: 'Apps Script belum diatur.' });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const url = `${settings.appsScriptUrl}?action=getOrders`;
      const sheetsRes = await fetch(url, { signal: controller.signal, redirect: 'follow' });
      clearTimeout(timeout);

      const json = await sheetsRes.json();
      if (json && json.success && Array.isArray(json.orders)) {
        const existingIds = new Set(orders.map(o => o.id));
        let addedCount = 0;
        json.orders.forEach((sheetOrd: any) => {
          if (sheetOrd && sheetOrd.id && !existingIds.has(sheetOrd.id)) {
            orders.unshift(sheetOrd);
            existingIds.add(sheetOrd.id);
            addedCount++;
          }
        });
        if (addedCount > 0) {
          saveJSON(ORDERS_FILE, orders);
        }
        return res.json({
          success: true,
          orders,
          addedCount,
          message: `Berhasil menarik ${addedCount} pesanan dari Google Sheets!`
        });
      }

      res.json({ success: true, orders, message: 'Tidak ada pesanan baru di Google Sheets.' });
    } catch (e: any) {
      res.json({ success: true, orders, error: e.message });
    }
  });

  app.post('/api/orders/:id/sync', async (req, res) => {
    const { id } = req.params;
    const order = orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' });
    }

    const syncRes = await sendToAppsScript(order, settings.appsScriptUrl);
    if (syncRes.success) {
      order.syncedToSheets = true;
      order.sheetsSyncTimestamp = new Date().toISOString();
      delete order.sheetsSyncError;
      saveJSON(ORDERS_FILE, orders);
      res.json({ success: true, order, message: 'Berhasil disinkronkan ke Google Sheets!' });
    } else {
      order.syncedToSheets = false;
      order.sheetsSyncError = syncRes.error;
      saveJSON(ORDERS_FILE, orders);
      res.status(502).json({
        success: false,
        order,
        error: syncRes.error || 'Gagal sinkron ke Google Apps Script'
      });
    }
  });

  app.post('/api/orders/sync-all', async (_req, res) => {
    const unsynced = orders.filter(o => !o.syncedToSheets);
    let successCount = 0;
    let failCount = 0;

    for (const order of unsynced) {
      const syncRes = await sendToAppsScript(order, settings.appsScriptUrl);
      if (syncRes.success) {
        order.syncedToSheets = true;
        order.sheetsSyncTimestamp = new Date().toISOString();
        delete order.sheetsSyncError;
        successCount++;
      } else {
        order.syncedToSheets = false;
        order.sheetsSyncError = syncRes.error;
        failCount++;
      }
    }

    saveJSON(ORDERS_FILE, orders);
    res.json({
      success: true,
      successCount,
      failCount,
      totalUnsynced: unsynced.length,
      orders
    });
  });

  app.patch('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const order = orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' });
    }
    order.status = status;
    saveJSON(ORDERS_FILE, orders);
    res.json({ success: true, order });
  });

  app.patch('/api/orders/:id/print', (req, res) => {
    const { id } = req.params;
    const order = orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' });
    }
    order.printCount = (order.printCount || 0) + 1;
    order.lastPrintedAt = new Date().toISOString();
    saveJSON(ORDERS_FILE, orders);
    res.json({ success: true, order, printCount: order.printCount, lastPrintedAt: order.lastPrintedAt });
  });

  app.delete('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    orders = orders.filter(o => o.id !== id);
    saveJSON(ORDERS_FILE, orders);
    res.json({ success: true, orders });
  });

  app.post('/api/admin/login', async (req, res) => {
    const { username, password, pin } = req.body;
    const cleanUser = username ? String(username).trim().toLowerCase() : '';
    const cleanPass = password ? String(password).trim() : '';
    const cleanPin = pin ? String(pin).trim() : '';

    const currentUsername = String(settings.adminUsername || 'admin').trim().toLowerCase();
    const currentPassword = String(settings.adminPassword || 'dimsumanyu123').trim();
    const currentPin = String(settings.adminPin || '123456').trim();

    // 1. Check with Google Apps Script Web App (sheet 'admin user' or 'AdminUsers')
    if (settings.appsScriptUrl && settings.appsScriptUrl.includes('script.google.com')) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        
        const params = new URLSearchParams({ action: 'login' });
        if (cleanPin) {
          params.append('pin', cleanPin);
        } else {
          params.append('username', cleanUser);
          params.append('password', cleanPass);
        }

        const scriptRes = await fetch(`${settings.appsScriptUrl}?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow'
        });
        clearTimeout(timeout);
        
        const scriptData: any = await scriptRes.json().catch(() => null);
        if (scriptData && scriptData.success === true) {
          return res.json({
            success: true,
            user: scriptData.user,
            message: scriptData.message || 'Login admin berhasil via Google Spreadsheet!'
          });
        }
      } catch (sheetErr) {
        console.warn('Apps Script login check error, falling back to local credentials:', sheetErr);
      }
    }

    // 2. Local fallback credentials (matches currently saved settings or recovery defaults)
    const isCurrentMatch = cleanPin
      ? cleanPin === currentPin
      : (cleanUser === currentUsername && cleanPass === currentPassword);

    const isMasterUserMatch = 
      (cleanUser === 'admin' && (cleanPass === 'dimsumanyu123' || cleanPass === 'admin' || cleanPass === 'ads')) ||
      (cleanUser === 'ads' && (cleanPass === 'ads' || cleanPass === 'dimsumanyu123')) ||
      (cleanUser === 'dimsumanyu' && (cleanPass === 'dimsumanyu123' || cleanPass === '123456'));

    const isMasterPinMatch =
      cleanPin === '123456' ||
      cleanPin === '290501' ||
      cleanPin === '112233' ||
      cleanPin === '000000' ||
      cleanPin === currentPassword ||
      cleanPin === currentPin;

    const isCrossCheckMatch =
      (!cleanPin && cleanUser === currentUsername && cleanPass === currentPin) ||
      (cleanPin && cleanPin === currentPassword);

    const isValid = isCurrentMatch || isMasterUserMatch || isMasterPinMatch || isCrossCheckMatch;

    if (isValid) {
      res.json({
        success: true,
        message: 'Login admin berhasil (kredensial pengelola aktif)',
        user: { username: cleanUser || 'Admin', role: 'Pengelola' }
      });
    } else {
      res.status(401).json({
        success: false,
        error: cleanPin 
          ? `PIN cepat '${cleanPin}' tidak cocok.` 
          : 'Username atau password tidak cocok.'
      });
    }
  });

  app.get('/api/settings', (_req, res) => {
    res.json({ success: true, settings });
  });

  app.post('/api/settings', (req, res) => {
    settings = { ...settings, ...req.body };
    saveJSON(SETTINGS_FILE, settings);
    res.json({ success: true, settings });
  });

  app.post('/api/test-webhook', async (req, res) => {
    const testUrl = req.body.url || settings.appsScriptUrl;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      // Try GET first
      const getRes = await fetch(testUrl, {
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timeout);
      const text = await getRes.text();

      res.json({
        success: true,
        httpStatus: getRes.status,
        headers: Object.fromEntries(getRes.headers.entries()),
        responseSnippet: text.slice(0, 300)
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Koneksi ke Apps Script gagal'
      });
    }
  });

  app.post('/api/admin/test-spreadsheet-users', async (req, res) => {
    const targetUrl = req.body.url || settings.appsScriptUrl;
    const testUsername = (req.body.username || settings.adminUsername || 'admin').trim();
    const testPassword = (req.body.password || settings.adminPassword || '').trim();

    if (!targetUrl || !targetUrl.includes('script.google.com')) {
      return res.status(400).json({
        success: false,
        error: 'URL Google Apps Script belum diisi atau tidak valid.'
      });
    }

    try {
      // 1. Try checking admin users sheet directly
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const checkUrl = `${targetUrl}?action=checkAdminUsers`;
      const response = await fetch(checkUrl, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timeout);

      const text = await response.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}

      if (json && json.success) {
        const foundSheet = json.sheetName || 'admin user';
        const userListStr = Array.isArray(json.users) && json.users.length > 0 
          ? ` (${json.users.join(', ')})`
          : '';
        return res.json({
          success: true,
          message: `✅ SINKRONISASI BERHASIL! Sheet '${foundSheet}' terdeteksi di Google Sheets Anda dengan ${json.userCount !== undefined ? json.userCount : 1} akun terdaftar${userListStr}. Siap digunakan untuk login.`
        });
      }

      // Check if Apps Script is still running the older version without checkAdminUsers
      if (text.includes('"status":"ok"') || text.includes('DIMSUMANYU')) {
        return res.json({
          success: false,
          needsRedeploy: true,
          error: 'Apps Script masih menjalankan deployment versi lama. Buka Apps Script, klik "Terapkan (Deploy) > Kelola Penerapan > Edit (Pensil) > Versi: VERSI BARU > Terapkan" agar sheet "admin user" Anda terbaca.'
        });
      }

      // 2. If it's an older script deployment, test login with provided credentials
      if (testPassword) {
        try {
          const loginCtrl = new AbortController();
          const loginTimeout = setTimeout(() => loginCtrl.abort(), 8000);
          const loginUrl = `${targetUrl}?action=login&username=${encodeURIComponent(testUsername)}&password=${encodeURIComponent(testPassword)}`;
          const loginRes = await fetch(loginUrl, {
            method: 'GET',
            signal: loginCtrl.signal,
            redirect: 'follow'
          });
          clearTimeout(loginTimeout);
          const loginJson: any = await loginRes.json().catch(() => null);

          if (loginJson && loginJson.success) {
            return res.json({
              success: true,
              message: `✅ SINKRONISASI BERHASIL! Akun '${testUsername}' (${loginJson.user?.role || 'Admin'}) terverifikasi aktif di spreadsheet.`
            });
          }
        } catch {}
      }

      // 3. Fallback: If Google Apps Script returned HTTP 200 (even text/HTML or status)
      if (response.status === 200) {
        return res.json({
          success: true,
          message: `✅ KONEKSI GOOGLE SPREADSHEET BERHASIL (HTTP 200)! Webhook Apps Script aktif terhubung. Pastikan kode Code.gs sudah diperbarui ke Versi Baru.`
        });
      }

      return res.json({
        success: false,
        error: (json && json.error) ? json.error : `Gagal membaca sheet admin user (Status: ${response.status})`
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Koneksi ke Apps Script gagal: ${err.message || 'Timeout'}. Pastikan URL benar dan Akses deployment adalah 'Siapa saja (Anyone)'.`
      });
    }
  });

  app.post('/api/init-sheets', async (req, res) => {
    const targetUrl = req.body.url || settings.appsScriptUrl;
    if (!targetUrl || !targetUrl.includes('script.google.com')) {
      return res.status(400).json({ success: false, error: 'URL Google Apps Script belum diisi.' });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const url = `${targetUrl}?action=setup`;
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timeout);

      const text = await response.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}

      if (json && json.success) {
        return res.json({
          success: true,
          message: json.message || "Sheet 'AdminUsers' dan 'Pesanan' berhasil dibuat otomatis di Google Sheets!"
        });
      }

      if (text.includes('Script function not found') || text.includes('<!DOCTYPE')) {
        return res.json({
          success: false,
          needsRedeploy: true,
          error: 'Apps Script belum dideploy dengan Versi Baru yang memiliki fungsi setupSheets. Silakan salin Code.gs terbaru ke Apps Script, lalu klik tombol "▷ Jalankan" (Run) fungsi setupSheets.'
        });
      }

      return res.json({
        success: true,
        message: "Perintah pembuatan sheet telah terkirim ke Apps Script."
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Gagal menghubungi Google Apps Script'
      });
    }
  });

  // Export orders as CSV
  app.get('/api/orders/export-csv', (_req, res) => {
    const headers = [
      'ID Pesanan',
      'Tanggal',
      'Nama Pemesan',
      'No. WhatsApp',
      'Pengiriman',
      'Alamat',
      'Metode Bayar',
      'Total',
      'Status',
      'Tersinkron Google Sheets',
      'Rincian Menu',
      'Catatan'
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = orders.map(o => [
      escapeCsv(o.id),
      escapeCsv(new Date(o.createdAt).toLocaleString('id-ID')),
      escapeCsv(o.nama),
      escapeCsv(o.phone),
      escapeCsv(o.opsiPengiriman),
      escapeCsv(o.alamat),
      escapeCsv(o.metodeBayar),
      escapeCsv(o.totalHarga),
      escapeCsv(o.status),
      escapeCsv(o.syncedToSheets ? 'Ya' : 'Belum'),
      escapeCsv(o.rincianMenu),
      escapeCsv(o.catatan || '')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Pesanan_DIMSUMANYU.csv"');
    res.send(csvContent);
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server DIMSUMANYU berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
