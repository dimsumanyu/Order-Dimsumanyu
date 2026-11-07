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
  if (order.mapsUrl) {
    message += `• *📍 Titik Peta Google Maps:* ${order.mapsUrl}\n`;
  }
  message += `• *Metode Bayar:* ${order.metodeBayar}\n`;
  if (order.catatan) {
    message += `• *Catatan:* ${order.catatan}\n`;
  }
  message += `-------------------------------------------\n`;
  message += `*RINCIAN PESANAN:*\n`;

  order.items.forEach(item => {
    message += `• *${item.qty}x* ${item.nama} = ${formatRupiah(item.subtotal)}\n`;
  });

  message += `-------------------------------------------\n`;
  const itemsSubtotal = order.items && order.items.length > 0
    ? order.items.reduce((sum, it) => sum + (it.subtotal || 0), 0)
    : (order.totalHarga - (order.ongkir || 0));
  let ongkirVal = Number(order.ongkir) || 0;
  if (ongkirVal === 0 && order.totalHarga > itemsSubtotal && itemsSubtotal > 0) {
    ongkirVal = order.totalHarga - itemsSubtotal;
  }
  const isDelivery = order.opsiPengiriman !== 'Ambil di Outlet' || ongkirVal > 0;

  if (isDelivery) {
    message += `• *Subtotal Menu:* ${formatRupiah(order.totalHarga - ongkirVal)}\n`;
    if (ongkirVal > 0) {
      message += `• *Ongkos Kirim:* ${formatRupiah(ongkirVal)}\n`;
    } else {
      message += `• *Ongkos Kirim:* Rp 0 (Bayar ke Driver saat sampai / COD)\n`;
    }
    message += `-------------------------------------------\n`;
  }
  message += `*TOTAL PEMBAYARAN: ${formatRupiah(order.totalHarga)}*\n`;
  message += `-------------------------------------------\n`;
  
  if (order.metodeBayar === 'QRIS') {
    message += `_Status: QRIS (Sudah / Akan Discan)_\n`;
  } else if (order.metodeBayar === 'Transfer Bank') {
    message += `_Status: Transfer Bank (${order.totalHarga ? formatRupiah(order.totalHarga) : ''})_\n`;
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
