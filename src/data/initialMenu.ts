import { MenuItem, AppSettings } from '../types';

export const INITIAL_SETTINGS: AppSettings = {
  adminWaNumber: '6285754623156',
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbwkawcrRY_1vZKKlWMMm5kAP5lO7BTosAh0Khv5_G1b3DUVS7vnHNo57DJuHnIopDilww/exec',
  scriptId: '1nx_JWMQKLVEyXO6ZbXdPQcZEtU8xvOBiSkmW9HSwNLKZsiv22oCldOlU',
  bankName: 'Allo Bank',
  bankAccount: '082254421916',
  bankHolder: 'Nadia Rizka Kurnaini',
  qrisImageUrl: 'https://lh3.googleusercontent.com/d/1gYXHwwITOwt08okLCZChfGB0n5ibc98J',
  storeName: 'DIMSUMANYU',
  storeTagline: '#SensasiNgedaging',
  adminUsername: 'admin',
  adminPassword: 'dimsumanyu123',
  adminPin: '123456'
};

export const INITIAL_MENU: MenuItem[] = [
  {
    id: 'menu-1',
    nama: 'KUKUS ORIGINAL ISI 6 PCS',
    kategori: 'DIMSUM KUKUS',
    harga: 25000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-2',
    nama: 'KUKUS MENTAI ISI 6 PCS',
    kategori: 'DIMSUM KUKUS',
    harga: 32000,
    status: 'TERSEDIA',
    keterangan: 'BEST SELLER',
    isBestSeller: true
  },
  {
    id: 'menu-3',
    nama: 'KUKUS ORIGINAL ISI 8 PCS',
    kategori: 'DIMSUM KUKUS',
    harga: 33000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-4',
    nama: 'KUKUS MENTAI ISI 8 PCS',
    kategori: 'DIMSUM KUKUS',
    harga: 43000,
    status: 'TERSEDIA',
    keterangan: 'BEST SELLER',
    isBestSeller: true
  },
  {
    id: 'menu-5',
    nama: 'GORENG ORIGINAL ISI 5 PCS',
    kategori: 'DIMSUM GORENG',
    harga: 25000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-6',
    nama: 'GORENG MENTAI ISI 5 PCS',
    kategori: 'DIMSUM GORENG',
    harga: 35000,
    status: 'TERSEDIA',
    keterangan: 'BEST SELLER',
    isBestSeller: true
  },
  {
    id: 'menu-7',
    nama: 'GORENG ORIGINAL ISI 7 PCS',
    kategori: 'DIMSUM GORENG',
    harga: 35000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-8',
    nama: 'GORENG MENTAI ISI 7 PCS',
    kategori: 'DIMSUM GORENG',
    harga: 45000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-9',
    nama: 'MIX ORIGINAL ISI 6 PCS (3 Pcs Kukus Ori + 3 Pcs Goreng Ori)',
    kategori: 'PAKET MIX ISI 6',
    harga: 28000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-10',
    nama: 'MIX MENTAI ISI 6 PCS (3 Pcs Kukus Mentai + 3 Pcs Goreng Mentai)',
    kategori: 'PAKET MIX ISI 6',
    harga: 34000,
    status: 'TERSEDIA',
    keterangan: 'BEST SELLER',
    isBestSeller: true
  },
  {
    id: 'menu-11',
    nama: 'MIX KUKUS ISI 6 PCS (3 Pcs Kukus Ori + 3 Pcs Kukus Mentai)',
    kategori: 'PAKET MIX ISI 6',
    harga: 29000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-12',
    nama: 'MIX GORENG ISI 6 PCS (3 Pcs Goreng Ori + 3 Pcs Goreng Mentai)',
    kategori: 'PAKET MIX ISI 6',
    harga: 34000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-13',
    nama: 'MIX ORIGINAL ISI 8 PCS (4 Pcs Kukus Ori + 4 Pcs Goreng Ori)',
    kategori: 'PAKET MIX ISI 8',
    harga: 37000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-14',
    nama: 'MIX MENTAI ISI 8 PCS (4 Pcs Kukus Mentai + 4 Pcs Goreng Mentai)',
    kategori: 'PAKET MIX ISI 8',
    harga: 47000,
    status: 'TERSEDIA',
    keterangan: 'BEST SELLER',
    isBestSeller: true
  },
  {
    id: 'menu-15',
    nama: 'MIX KUKUS ISI 8 PCS (4 Pcs Kukus Ori + 4 Pcs Kukus Mentai)',
    kategori: 'PAKET MIX ISI 8',
    harga: 38000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-16',
    nama: 'MIX GORENG ISI 8 PCS (4 Pcs Goreng Ori + 4 Pcs Goreng Mentai)',
    kategori: 'PAKET MIX ISI 8',
    harga: 46000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-17',
    nama: 'KUKUS ORIGINAL ISI 16 PCS',
    kategori: 'PAKET FAMILY',
    harga: 72000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-18',
    nama: 'KUKUS MENTAI ISI 16 PCS',
    kategori: 'PAKET FAMILY',
    harga: 90000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-19',
    nama: 'GORENG ORIGINAL ISI 16 PCS',
    kategori: 'PAKET FAMILY',
    harga: 86000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-20',
    nama: 'GORENG MENTAI ISI 16 PCS',
    kategori: 'PAKET FAMILY',
    harga: 111000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-21',
    nama: 'KUKUS ORIGINAL PREMIUM ISI 16 PCS',
    kategori: 'PAKET FAMILY',
    harga: 108000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-22',
    nama: 'KUKUS MENTAI PREMIUM ISI 16 PCS',
    kategori: 'PAKET FAMILY',
    harga: 134000,
    status: 'TERSEDIA',
    keterangan: 'BEST SELLER',
    isBestSeller: true
  },
  {
    id: 'menu-23',
    nama: 'MIX ORIGINAL FAMILY ISI 16 PCS (8 Pcs Kukus Ori + 8 Pcs Goreng Ori)',
    kategori: 'PAKET FAMILY MIX',
    harga: 82000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-24',
    nama: 'MIX MENTAI FAMILY ISI 16 PCS (8 Pcs Kukus Mentai + 8 Pcs Goreng Mentai)',
    kategori: 'PAKET FAMILY MIX',
    harga: 100000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-25',
    nama: 'MIX KUKUS FAMILY ISI 16 PCS (8 Pcs Kukus Ori + 8 Pcs Kukus Mentai)',
    kategori: 'PAKET FAMILY MIX',
    harga: 82000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-26',
    nama: 'MIX GORENG FAMILY ISI 16 PCS (8 Pcs Goreng Ori + 8 Pcs Goreng Mentai)',
    kategori: 'PAKET FAMILY MIX',
    harga: 100000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-27',
    nama: 'MINI MIX PLATTER ISI 8 PCS (2 Kukus Ori + 2 Kukus Mentai + 2 Pcs Goreng Ori + 2 Pcs Goreng Mentai)',
    kategori: 'PAKET FAMILY MIX',
    harga: 42000,
    status: 'TERSEDIA',
    keterangan: 'BEST SELLER',
    isBestSeller: true
  },
  {
    id: 'menu-28',
    nama: 'FAMILY MIX PLATTER ISI 16 PCS (4 Kukus Ori + 4 Kukus Mentai + 4 Pcs Goreng Ori + 4 Pcs Goreng Mentai)',
    kategori: 'PAKET FAMILY MIX',
    harga: 88000,
    status: 'TERSEDIA',
    keterangan: 'BEST SELLER',
    isBestSeller: true
  },
  {
    id: 'menu-29',
    nama: 'THAI TEA SEGAR',
    kategori: 'DRINK',
    harga: 15000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  },
  {
    id: 'menu-30',
    nama: 'GREEN TEA MILK',
    kategori: 'DRINK',
    harga: 15000,
    status: 'TERSEDIA',
    keterangan: '',
    isBestSeller: false
  }
];
