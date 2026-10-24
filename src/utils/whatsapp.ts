import { OrderData } from '../types';

export function formatRupiah(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

export function generateWhatsAppMessage(order: OrderData): string {
  let message = `*HALO DIMSUMANYU, SAYA MAU PESAN*\n`;
  message += `_#SensasiNgedaging_\n`;
  message += `-------------------------------------------\n`;
  message += `*ID PESANAN:* #${order.id}\n`;
  message += `*DATA PEMESAN:*\n`;
  message += `• *Nama:* ${order.nama}\n`;
  message += `• *No. WA:* ${order.phone}\n`;
  message += `• *Opsi Pengiriman:* ${order.opsiPengiriman}\n`;
  
  const addressLabel = order.opsiPengiriman === 'Ambil di Outlet' ? 'Keterangan Ambil' : 'Alamat';
  message += `• *${addressLabel}:* ${order.alamat}\n`;
  message += `• *Metode Bayar:* ${order.metodeBayar}\n`;
  if (order.catatan) {
    message += `• *Catatan:* ${order.catatan}\n`;
  }
  message += `-------------------------------------------\n`;
  message += `*RINCIAN PESANAN:*\n`;

  order.items.forEach(item => {
    message += `• ${item.nama} (${item.qty}x) = ${formatRupiah(item.subtotal)}\n`;
  });

  message += `-------------------------------------------\n`;
  message += `*TOTAL PEMBAYARAN: ${formatRupiah(order.totalHarga)}*\n`;
  message += `-------------------------------------------\n`;
  
  if (order.metodeBayar === 'QRIS') {
    message += `_Status: QRIS (Sudah / Akan Discan)_\n`;
  } else if (order.metodeBayar === 'Transfer Bank') {
    message += `_Status: Transfer Bank (Allo Bank 082254421916 a.n Nadia Rizka Kurnaini)_\n`;
  } else {
    message += `_Status: Tunai / COD_\n`;
  }
  
  message += `Mohon segera diproses ya, terima kasih!`;
  return message;
}

export function createWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
