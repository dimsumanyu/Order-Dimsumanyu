// Utility for Thermal Printer Management (Kasir Mini Style)
// Supports:
// 1. Direct Web Bluetooth (scans BLE thermal printers that don't show up in OS phone settings)
// 2. Direct Web USB / OTG Cable
// 3. WiFi / Network LAN (IP Printer port 9100)
// 4. RawBT Android Driver App Intent (zero-setup for any Chinese/local thermal mini printer)
// 5. System Browser 58mm Print

export type PrinterConnectionType = 'bluetooth' | 'wifi' | 'usb' | 'rawbt' | 'system';

export interface PrinterConfig {
  type: PrinterConnectionType;
  name: string;
  ipAddress?: string;
  port?: number;
  paperWidth: 58 | 80;
  autoPrint?: boolean;
}

const STORAGE_KEY = 'dimsumanyu_printer_config';

// Active Web Bluetooth GATT connection instance in memory
let activeBluetoothDevice: any = null;
let activeBluetoothCharacteristic: any = null;

export function loadPrinterConfig(): PrinterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return {
    type: 'system',
    name: 'Printer Bawaan (Browser)',
    paperWidth: 58,
  };
}

export function savePrinterConfig(cfg: PrinterConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

// Convert string to ESC/POS bytes with simple encoding
export function createEscPosBuffer(lines: string[]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  // ESC @ (Initialize printer)
  chunks.push(new Uint8Array([0x1b, 0x40]));

  for (const line of lines) {
    if (line === 'CMD_CENTER') {
      // ESC a 1 (Center)
      chunks.push(new Uint8Array([0x1b, 0x61, 0x01]));
    } else if (line === 'CMD_LEFT') {
      // ESC a 0 (Left)
      chunks.push(new Uint8Array([0x1b, 0x61, 0x00]));
    } else if (line === 'CMD_RIGHT') {
      // ESC a 2 (Right)
      chunks.push(new Uint8Array([0x1b, 0x61, 0x02]));
    } else if (line === 'CMD_BOLD_ON') {
      // ESC E 1 (Bold On)
      chunks.push(new Uint8Array([0x1b, 0x45, 0x01]));
    } else if (line === 'CMD_BOLD_OFF') {
      // ESC E 0 (Bold Off)
      chunks.push(new Uint8Array([0x1b, 0x45, 0x00]));
    } else if (line === 'CMD_DOUBLE_HEIGHT_ON') {
      // GS ! 0x01
      chunks.push(new Uint8Array([0x1d, 0x21, 0x01]));
    } else if (line === 'CMD_DOUBLE_HEIGHT_OFF') {
      // GS ! 0x00
      chunks.push(new Uint8Array([0x1d, 0x21, 0x00]));
    } else {
      chunks.push(encoder.encode(line + '\n'));
    }
  }

  // Feed 3 lines & Cut (GS V 66 0)
  chunks.push(new Uint8Array([0x1b, 0x64, 0x03]));
  // Feed additional lines
  chunks.push(new Uint8Array([0x0a, 0x0a, 0x0a]));

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

// Common Bluetooth Low Energy Service UUIDs used by 58mm / 80mm thermal mini printers
// (RPP02N / Iware X-58BT II, PT-210, POS-58, GOOJPRT, Panda, Zjiang, Eppos, Xprinter, etc.)
const THERMAL_BLE_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb', // RPP02N / HM-10 transparent UART
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART
  '0000ff00-0000-1000-8000-00805f9b34fb', // POS standard
  '0000e0ff-3c17-d293-8e48-14fe2e4da212',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '00001800-0000-1000-8000-00805f9b34fb',
  '00001801-0000-1000-8000-00805f9b34fb',
  '0000180a-0000-1000-8000-00805f9b34fb',
];

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

export async function scanAndConnectBluetooth(): Promise<{ success: boolean; deviceName: string; error?: string }> {
  if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
    if (isIosDevice()) {
      return {
        success: false,
        deviceName: '',
        error:
          'Di iPhone, Apple memblokir akses Bluetooth pada browser Safari & Chrome. Agar bisa connect langsung di iPhone, buka link admin ini menggunakan browser gratis "Bluefy" dari App Store.',
      };
    }
    return {
      success: false,
      deviceName: '',
      error:
        'Browser ini belum mendukung Web Bluetooth. Gunakan Google Chrome di Laptop / HP Android, atau buka di browser "Bluefy" jika memakai iPhone.',
    };
  }

  try {
    const nav = navigator as any;
    // Request device directly from inside the app!
    // This detects devices even if they are NOT paired in phone settings
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: THERMAL_BLE_SERVICES,
    });

    if (!device) {
      return { success: false, deviceName: '', error: 'Tidak ada printer yang dipilih.' };
    }

    const deviceName = device.name || 'Thermal POS Printer';

    // Connect to GATT
    const server = await device.gatt.connect();

    // Search for writable characteristic across available services
    let writableChar: any = null;

    for (const serviceUuid of THERMAL_BLE_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writableChar = char;
            break;
          }
        }
        if (writableChar) break;
      } catch {
        // service not present on this device, check next
      }
    }

    // If not found in known services, inspect all services
    if (!writableChar) {
      try {
        const services = await server.getPrimaryServices();
        for (const s of services) {
          const chars = await s.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              writableChar = c;
              break;
            }
          }
          if (writableChar) break;
        }
      } catch {
        // ignore
      }
    }

    activeBluetoothDevice = device;
    activeBluetoothCharacteristic = writableChar;

    // Save config
    const cfg: PrinterConfig = {
      type: 'bluetooth',
      name: deviceName,
      paperWidth: 58,
    };
    savePrinterConfig(cfg);

    return {
      success: true,
      deviceName,
    };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { success: false, deviceName: '', error: 'Pencarian dibatalkan oleh pengguna.' };
    }
    return {
      success: false,
      deviceName: '',
      error: err.message || 'Gagal menghubungkan printer bluetooth.',
    };
  }
}

// Send ESC/POS data chunk by chunk to avoid BLE packet dropping (typically 50-100 bytes max per packet)
export async function sendBluetoothEscPos(data: Uint8Array): Promise<boolean> {
  if (!activeBluetoothCharacteristic) {
    return false;
  }

  const CHUNK_SIZE = 64;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    if (activeBluetoothCharacteristic.writeValueWithoutResponse) {
      await activeBluetoothCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await activeBluetoothCharacteristic.writeValue(chunk);
    }
    // tiny delay for printer queue
    await new Promise((r) => setTimeout(r, 20));
  }
  return true;
}

// Generate RawBT URL Scheme for Android devices
// RawBT can connect to any Bluetooth, USB, or WiFi thermal printer in Indonesia without OS pairing!
export function createRawBtUrl(rawText: string): string {
  try {
    // UTF-8 base64 encoding
    const encoded = btoa(unescape(encodeURIComponent(rawText)));
    return `intent:base64,${encoded}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;S.browser_fallback_url=https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter;end;`;
  } catch {
    return `rawbt:${encodeURIComponent(rawText)}`;
  }
}

// Generate simple test receipt lines
export function generateTestReceiptLines(printerName: string, connectionType: string): string[] {
  const now = new Date().toLocaleString('id-ID');
  return [
    'CMD_CENTER',
    'CMD_BOLD_ON',
    '================================',
    'DIMSUMANYU',
    '#SensasiNgedaging',
    '================================',
    'CMD_BOLD_OFF',
    'CMD_CENTER',
    'TES KONEKSI PRINTER THERMAL',
    `Waktu : ${now}`,
    `Device: ${printerName}`,
    `Koneksi: ${connectionType.toUpperCase()}`,
    '--------------------------------',
    'CMD_LEFT',
    'STATUS: PRINTER KASIR TERHUBUNG!',
    '• Kertas 58mm OK',
    '• Cetak Resi Pesanan SIAP',
    '• Font & Pemotong Kertas OK',
    '--------------------------------',
    'CMD_CENTER',
    '*** TES BERHASIL ***',
    'Dimsum Anyu POS System',
    '================================',
  ];
}
