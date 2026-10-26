export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ==============================================================
 * DIMSUMANYU - INTEGRASI GOOGLE SHEETS & APPS SCRIPT RESMI
 * Script ID: 1nx_JWMQKLVEyXO6ZbXdPQcZEtU8xvOBiSkmW9HSwNLKZsiv22oCldOlU
 * ==============================================================
 * 
 * FITUR TERBARU:
 * 1. PENCATATAN PESANAN OTOMATIS: Sheet "Pesanan"
 * 2. MANAJEMEN USER & PASSWORD ADMIN: Sheet "AdminUsers"
 *    - Setiap baris di sheet 'AdminUsers' dapat digunakan untuk login admin
 *    - Anda bisa menambah kasir, staf dapur, atau admin baru langsung dari spreadsheet!
 * 
 * PANDUAN PEMASANGAN (HANYA 1 MENIT):
 * 1. Buka spreadsheet Google Sheets Anda tempat rekap pesanan
 * 2. Klik menu 'Ekstensi' (Extensions) -> 'Apps Script'
 * 3. Hapus seluruh isi file 'Code.gs' lama dan TEMPELKAN (PASTE) kode ini
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

/**
 * =============================================================
 * ⚡ FUNGSI UTAMA: JALANKAN INI UNTUK BUAT SHEET OTOMATIS!
 * =============================================================
 * Cara Pakai:
 * 1. Di bilah menu atas Google Apps Script, pilih fungsi "setupSheets"
 * 2. Klik tombol "▷ Jalankan" (Run)
 * 3. Buka tab Google Sheets Anda, sheet "AdminUsers" & "Pesanan"
 *    akan langsung muncul otomatis beserta header & akun admin!
 */
function setupSheets() {
  var ss = getTargetSpreadsheet();
  var adminSheet = getOrCreateAdminUsersSheet(ss);
  var pesananSheet = getOrCreatePesananSheet(ss);
  
  var info = "✅ BERHASIL: Sheet 'AdminUsers' (Akun Admin) dan Sheet 'Pesanan' telah siap di Google Sheets Anda!";
  Logger.log(info);
  return info;
}

// -------------------------------------------------------------
// 1. MANAJEMEN PENGGUNA & PASSWORD ADMIN (SHEET: AdminUsers)
// -------------------------------------------------------------
function getOrCreateAdminUsersSheet(ss) {
  var sheet = ss.getSheetByName("AdminUsers") || ss.getSheetByName("Users") || ss.getSheetByName("Admin");
  
  if (!sheet) {
    sheet = ss.insertSheet("AdminUsers");
    var headers = [
      "Username",
      "Password",
      "Nama / Peran",
      "Status",
      "Terakhir Login"
    ];
    sheet.appendRow(headers);
    
    // Format Header Baris 1
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1E293B"); // Slate dark
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 32);

    // Tambahkan pengguna default awal (Bisa diedit/ditambah langsung di Google Sheets)
    sheet.appendRow(["admin", "dimsumanyu123", "Owner / Admin Utama", "Aktif", "-"]);
    sheet.appendRow(["kasir", "dimsum123", "Kasir Toko", "Aktif", "-"]);
    sheet.appendRow(["dapur", "dapur123", "Staf Dapur", "Aktif", "-"]);
  }
  return sheet;
}

// -------------------------------------------------------------
// 2. STRUKTUR SHEET PESANAN (SHEET: Pesanan)
// -------------------------------------------------------------
function getOrCreatePesananSheet(ss) {
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
    headerRange.setBackground("#B80C1D"); // Merah DIMSUMANYU
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);
  }
  return sheet;
}

function checkAdminLogin(username, password) {
  if (!username || !password) {
    return { success: false, error: "Username dan password wajib diisi." };
  }
  
  var ss = getTargetSpreadsheet();
  var sheet = getOrCreateAdminUsersSheet(ss);
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { success: false, error: "Daftar pengguna kosong di sheet AdminUsers." };
  }
  
  var cleanUser = String(username).trim().toLowerCase();
  var cleanPass = String(password).trim();
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowUser = String(row[0] || '').trim().toLowerCase();
    var rowPass = String(row[1] || '').trim();
    var role = String(row[2] || 'Admin').trim();
    var status = String(row[3] || 'Aktif').trim().toLowerCase();
    
    if (rowUser === cleanUser) {
      if (status === 'nonaktif' || status === 'disabled' || status === 'blokir' || status === 'tidak aktif') {
        return { success: false, error: "Akun '" + username + "' berstatus Nonaktif di spreadsheet." };
      }
      
      if (rowPass === cleanPass) {
        // Catat waktu login ke kolom 5 (Terakhir Login)
        try {
          var nowStr = Utilities.formatDate(new Date(), "Asia/Makassar", "yyyy-MM-dd HH:mm:ss");
          sheet.getRange(i + 1, 5).setValue(nowStr);
        } catch (e) {}
        
        return {
          success: true,
          message: "Login berhasil! Selamat datang, " + role + ".",
          user: {
            username: String(row[0]),
            role: role
          }
        };
      } else {
        return { success: false, error: "Password salah untuk username '" + username + "'." };
      }
    }
  }
  
  return { success: false, error: "Username '" + username + "' tidak terdaftar di sheet AdminUsers Google Sheets." };
}

// -------------------------------------------------------------
// 3. ENDPOINT GET (Web App)
// -------------------------------------------------------------
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  
  // A. Inisialisasi Sheet Otomatis via GET (?action=setup atau ?action=init)
  if (action === 'setup' || action === 'init' || action === 'createSheets') {
    var initMsg = setupSheets();
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: initMsg
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // B. Cek Status Sheet AdminUsers & Koneksi Spreadsheet
  if (action === 'checkAdminUsers' || action === 'testAdminUsers' || action === 'test_sheet') {
    try {
      var ssCheck = getTargetSpreadsheet();
      var adminSheetCheck = ssCheck.getSheetByName("AdminUsers") || ssCheck.getSheetByName("Users") || ssCheck.getSheetByName("Admin");
      if (!adminSheetCheck) {
        adminSheetCheck = getOrCreateAdminUsersSheet(ssCheck);
      }
      var rowsCheck = adminSheetCheck.getDataRange().getValues();
      var userCountCheck = Math.max(0, rowsCheck.length - 1);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        sheetExists: true,
        userCount: userCountCheck,
        message: "Sheet 'AdminUsers' aktif terhubung di Google Sheets dengan " + userCountCheck + " akun pengguna."
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (errCheck) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Gagal membaca sheet AdminUsers: " + errCheck.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // C. Verifikasi Login Admin via GET
  if (action === 'login' || action === 'checkLogin') {
    var u = (e && e.parameter && e.parameter.username) || '';
    var p = (e && e.parameter && e.parameter.password) || '';
    var loginResult = checkAdminLogin(u, p);
    return ContentService.createTextOutput(JSON.stringify(loginResult))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // C. Simpan Pesanan via GET (Fallback URL params)
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

  // D. Ambil data menu dari sheet Menu
  if (action === 'getMenuData') {
    var menuData = getMenuData();
    return ContentService.createTextOutput(JSON.stringify(menuData))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // E. Status JSON ping jika diminta
  if (action === 'status') {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      app: "DIMSUMANYU",
      message: "Google Apps Script aktif & terhubung dengan sheet Pesanan & AdminUsers!",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // F. Tampilkan HTML jika diakses langsung di browser
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

// -------------------------------------------------------------
// 4. ENDPOINT POST (Pencatatan Pesanan, Setup & Login)
// -------------------------------------------------------------
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);
  
  try {
    var contents = null;
    if (e && e.postData && e.postData.contents) {
      contents = e.postData.contents;
    } else if (e && e.parameter && e.parameter.payload) {
      contents = e.parameter.payload;
    }
    
    if (!contents) {
      throw new Error("Payload kosong");
    }
    
    var data = typeof contents === 'string' ? JSON.parse(contents) : contents;
    
    // Inisialisasi sheet via POST
    if (data.action === 'setup' || data.action === 'init') {
      var initMsgPost = setupSheets();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: initMsgPost
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Jika aksi adalah login admin
    if (data.action === 'login' || data.action === 'checkLogin') {
      var loginRes = checkAdminLogin(data.username, data.password);
      return ContentService.createTextOutput(JSON.stringify(loginRes))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default aksi: simpan pesanan ke sheet 'Pesanan'
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

// -------------------------------------------------------------
// 5. PENYIMPANAN PESANAN KE SHEET 'Pesanan'
// -------------------------------------------------------------
function simpanPesanan(orderData) {
  var ss = getTargetSpreadsheet();
  
  // Pastikan sheet AdminUsers dan Pesanan sudah ada
  getOrCreateAdminUsersSheet(ss);
  var sheet = getOrCreatePesananSheet(ss);

  var now = new Date();
  var timestampStr = Utilities.formatDate(now, "Asia/Makassar", "yyyy-MM-dd HH:mm:ss");
  var orderId = orderData.id || ("DAN-" + Utilities.formatDate(now, "Asia/Makassar", "yyyyMMdd-HHmmss"));
  
  var rowData = [
    timestampStr,
    orderId,
    orderData.nama || "-",
    "'" + (orderData.phone || "-"), // Beri tanda petik agar digit 0 / 62 tidak terpotong
    orderData.opsiPengiriman || "Diantar ke Alamat",
    orderData.alamat || "-",
    orderData.metodeBayar || "QRIS",
    orderData.catatan || "-",
    orderData.rincianMenu || "-",
    orderData.totalHarga || 0,
    orderData.status || "Menunggu payment"
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
