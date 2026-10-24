import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_MENU, INITIAL_SETTINGS } from './src/data/initialMenu';
import { OrderData, AppSettings, MenuItem } from './src/types/index';

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

  app.get('/api/orders', (_req, res) => {
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
        totalHarga: orderData.totalHarga || 0,
        items: orderData.items || [],
        createdAt: new Date().toISOString(),
        status: 'Baru',
        syncedToSheets: false
      };

      // Attempt immediate sync to Google Apps Script / Google Sheets
      if (settings.appsScriptUrl) {
        const syncRes = await sendToAppsScript(newOrder, settings.appsScriptUrl);
        if (syncRes.success) {
          newOrder.syncedToSheets = true;
          newOrder.sheetsSyncTimestamp = new Date().toISOString();
        } else {
          newOrder.syncedToSheets = false;
          newOrder.sheetsSyncError = syncRes.error;
        }
      }

      orders.unshift(newOrder);
      saveJSON(ORDERS_FILE, orders);

      res.json({
        success: true,
        order: newOrder,
        syncedToSheets: newOrder.syncedToSheets,
        sheetsSyncError: newOrder.sheetsSyncError
      });
    } catch (err: any) {
      console.error('Error creating order:', err);
      res.status(500).json({ success: false, error: err.message });
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

  app.delete('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    orders = orders.filter(o => o.id !== id);
    saveJSON(ORDERS_FILE, orders);
    res.json({ success: true, orders });
  });

  app.post('/api/admin/login', (req, res) => {
    const { username, password, pin } = req.body;
    const currentUsername = settings.adminUsername || 'admin';
    const currentPassword = settings.adminPassword || 'dimsumanyu123';
    const currentPin = settings.adminPin || '123456';

    const isValid = 
      (username === currentUsername && password === currentPassword) ||
      (pin && pin === currentPin) ||
      (password === currentPassword);

    if (isValid) {
      res.json({ success: true, message: 'Login admin berhasil' });
    } else {
      res.status(401).json({ success: false, error: 'Username, password, atau PIN salah' });
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
