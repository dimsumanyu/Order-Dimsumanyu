export interface MenuItem {
  id: string;
  nama: string;
  kategori: string;
  harga: number;
  hargaDisplay?: string;
  status: 'TERSEDIA' | 'HABIS';
  keterangan: string;
  isBestSeller?: boolean;
  imageUrl?: string;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export type ShippingOption = 'Diantar ke Alamat' | 'Ambil di Outlet';
export type PaymentMethod = 'QRIS' | 'Transfer Bank' | 'Tunai (COD / Ambil di Tempat)';
export type OrderStatus = 
  | 'Menunggu payment'
  | 'Pesanan sedang dimasak'
  | 'Pesanan siap'
  | 'Pesanan selesai'
  | 'Dibatalkan';

export interface OrderData {
  id: string;
  nama: string;
  phone: string;
  opsiPengiriman: ShippingOption;
  alamat: string;
  metodeBayar: PaymentMethod;
  catatan?: string;
  rincianMenu: string;
  totalHarga: number;
  items: {
    id: string;
    nama: string;
    harga: number;
    qty: number;
    subtotal: number;
  }[];
  createdAt: string;
  status: OrderStatus;
  syncedToSheets?: boolean;
  sheetsSyncError?: string;
  sheetsSyncTimestamp?: string;
  printCount?: number;
  lastPrintedAt?: string;
}

export interface AppSettings {
  adminWaNumber: string;
  appsScriptUrl: string;
  scriptId: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  qrisImageUrl: string;
  storeName: string;
  storeTagline: string;
  adminUsername?: string;
  adminPassword?: string;
  adminPin?: string;
}
