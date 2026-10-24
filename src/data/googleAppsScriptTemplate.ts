export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ==============================================================
 * DIMSUMANYU - INTEGRASI GOOGLE SHEETS & APPS SCRIPT RESMI
 * Script ID: 1nx_JWMQKLVEyXO6ZbXdPQcZEtU8xvOBiSkmW9HSwNLKZsiv22oCldOlU
 * ==============================================================
 * 
 * PANDUAN PEMASANGAN (HANYA 1 MENIT):
 * 1. Buka spreadsheet Google Sheets Anda tempat rekap pesanan
 * 2. Klik menu 'Ekstensi' (Extensions) -> 'Apps Script'
 * 3. Hapus seluruh isi file 'Code.gs' lama dan TEMPELKAN (PASTE) kode di bawah ini
 * 4. Klik ikon 'Simpan' (Disket)
 * 5. SANGAT PENTING (DEPLOYMENT BARU):
 *    - Klik tombol 'Terapkan' (Deploy) di kanan atas
 *    - Pilih 'Kelola penerapan' (Manage deployments)
 *    - Klik ikon Pensil (Edit) di samping penerapan Web App aktif Anda
 *    - Pada bagian Versi (Version), WAJIB pilih: 'Versi baru' (New version)
 *    - Pastikan 'Akses' (Who has access): 'Siapa saja' (Anyone)
 *    - Klik tombol 'Terapkan' (Deploy)
 * ==============================================================
 */

// KOSONGKAN jika script ini dibuka dari Ekstensi > Apps Script di Google Sheets Anda.
// Atau ISI dengan ID Spreadsheet jika Anda menggunakan skrip mandiri (standalone).
var SPREADSHEET_ID = "";

function getTargetSpreadsheet() {
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}

  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }

  throw new Error("Spreadsheet tidak ditemukan. Pastikan Anda membuka Apps Script langsung dari Google Sheets (menu Ekstensi > Apps Script) atau isi variabel SPREADSHEET_ID di baris paling atas Code.gs.");
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  
  // 1. Dukungan Simpan Pesanan via GET (Fallback)
  if (action === 'order' || (e && e.parameter && e.parameter.payload)) {
    try {
      var rawPayload = e.parameter.payload || e.parameter.data;
      var orderObj = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
      var res = simpanPesanan(orderObj);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        method: "GET",
        message: "Pesanan berhasil dicatat ke Google Sheets!",
        result: res
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: err.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 2. Ambil data menu
  if (action === 'getMenuData') {
    var menuData = getMenuData();
    return ContentService.createTextOutput(JSON.stringify(menuData))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // 3. Status JSON ping jika diminta
  if (action === 'status') {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      app: "DIMSUMANYU",
      message: "Google Apps Script aktif & siap mencatat pesanan ke Google Sheets!",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 4. Jika dibuka langsung di browser, tampilkan file Index.html (jika ada di Apps Script)
  try {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('DIMSUMANYU - #SensasiNgedaging')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      app: "DIMSUMANYU",
      message: "Google Apps Script aktif & siap mencatat pesanan ke Google Sheets!",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Kunci script hingga 15 detik agar antrean baris tidak saling tindih
  lock.tryLock(15000);
  
  try {
    var contents = null;
    if (e && e.postData && e.postData.contents) {
      contents = e.postData.contents;
    } else if (e && e.parameter && e.parameter.payload) {
      contents = e.parameter.payload;
    }
    
    if (!contents) {
      throw new Error("Tidak ada data pesanan (payload kosong)");
    }
    
    var data = typeof contents === 'string' ? JSON.parse(contents) : contents;
    var saveResult = simpanPesanan(data);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Pesanan berhasil dicatat ke Google Sheets!",
      result: saveResult
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function simpanPesanan(orderData) {
  var ss = getTargetSpreadsheet();
  
  // Cari sheet bernama "Pesanan", jika tidak ada gunakan sheet pertama atau buat baru
  var sheet = ss.getSheetByName("Pesanan") || ss.getSheetByName("Orders");
  
  if (!sheet) {
    sheet = ss.insertSheet("Pesanan");
    var headers = [
      "Waktu Pemesanan",
      "ID Pesanan",
      "Nama Pelanggan",
      "No. WhatsApp",
      "Opsi Pengiriman",
      "Alamat / Keterangan Ambil",
      "Metode Pembayaran",
      "Catatan Tambahan",
      "Rincian Menu",
      "Total Bayar (Rp)",
      "Status Pesanan"
    ];
    sheet.appendRow(headers);
    
    // Format Header Baris 1
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#B80C1D");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);
  }

  var now = new Date();
  var timestampStr = Utilities.formatDate(now, "Asia/Makassar", "yyyy-MM-dd HH:mm:ss");
  var orderId = orderData.id || ("DAN-" + Utilities.formatDate(now, "Asia/Makassar", "yyyyMMdd-HHmmss"));
  
  var rowData = [
    timestampStr,
    orderId,
    orderData.nama || "-",
    "'" + (orderData.phone || "-"), // Beri petik agar awalan 0 / 62 tidak terpotong
    orderData.opsiPengiriman || "Diantar ke Alamat",
    orderData.alamat || "-",
    orderData.metodeBayar || "QRIS",
    orderData.catatan || "-",
    orderData.rincianMenu || "-",
    orderData.totalHarga || 0,
    orderData.status || "Baru"
  ];

  sheet.appendRow(rowData);
  
  return {
    orderId: orderId,
    timestamp: timestampStr,
    nama: orderData.nama,
    total: orderData.totalHarga,
    sheetName: sheet.getName()
  };
}

function getMenuData() {
  var ss = getTargetSpreadsheet();
  var sheet = ss.getSheetByName("Menu") || ss.getSheetByName("DB_DIMSUMANYU") || ss.getSheets()[0];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var menu = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[0]) continue;
    
    var rawHarga = row[2];
    var harga = typeof rawHarga === "number" 
      ? rawHarga 
      : parseInt(String(rawHarga).replace(/[^0-9]/g, ""), 10) || 0;
      
    menu.push({
      id: "dimsum-" + i,
      nama: String(row[0]).trim(),
      kategori: String(row[1] || "DIMSUM").trim(),
      harga: harga,
      status: String(row[3] || "TERSEDIA").toUpperCase().trim(),
      keterangan: String(row[4] || "").trim()
    });
  }
  return menu;
}
`;
