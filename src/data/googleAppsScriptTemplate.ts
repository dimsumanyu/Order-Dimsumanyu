/**
 * ==============================================================
 * DIMSUMANYU - INTEGRASI GOOGLE SHEETS & APPS SCRIPT RESMI
 * Script ID: 1nx_JWMQKLVEyXO6ZbXdPQcZEtU8xvOBiSkmW9HSwNLKZsiv22oCldOlU
 * ==============================================================
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ==============================================================
 * DIMSUMANYU - INTEGRASI GOOGLE SHEETS & APPS SCRIPT RESMI
 * Script ID: 1nx_JWMQKLVEyXO6ZbXdPQcZEtU8xvOBiSkmW9HSwNLKZsiv22oCldOlU
 * ==============================================================
 * 
 * FITUR TERLENGKAP:
 * 1. PENCATATAN PESANAN OTOMATIS: Sheet "Pesanan"
 * 2. MANAJEMEN USER & PASSWORD ADMIN: Sheet "admin user" / "AdminUsers" / "Akun Admin"
 *    - Setiap baris di sheet admin user dapat langsung digunakan untuk login admin
 *    - Mendukung login dengan Username & Password ATAU PIN Cepat (4-6 digit)
 *    - Mendukung format angka otomatis dari spreadsheet (misal PIN 290501 / 123456)
 * 3. BACA DATA MENU: Sheet "Menu" / "DB_DIMSUMANYU"
 * 
 * ==============================================================
 * ⚠️ CARA UPDATE AGAR AKUN SPREADSHEET LANGSUNG AKTIF:
 * 1. Buka spreadsheet Google Sheets Anda
 * 2. Klik menu 'Ekstensi' (Extensions) -> 'Apps Script'
 * 3. Hapus SEMUA isi Code.gs lama, lalu TEMPELKAN (PASTE) seluruh kode ini
 * 4. Klik ikon 'Simpan' (Disket)
 * 5. SANGAT PENTING (DEPLOYMENT BARU):
 *    - Klik tombol biru 'Terapkan' (Deploy) di kanan atas
 *    - Pilih 'Kelola penerapan' (Manage deployments)
 *    - Klik ikon Pensil (Edit) pada penerapan Web App Anda
 *    - Pada opsi 'Versi' (Version): WAJIB PILIH 'Versi baru' (New version)
 *    - Pada opsi 'Akses' (Who has access): Pastikan 'Siapa saja' (Anyone)
 *    - Klik tombol 'Terapkan' (Deploy)
 * ==============================================================
 */

// KOSONGKAN jika script ini dibuka dari menu Ekstensi > Apps Script di Google Sheets Anda.
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
 * Mencari sheet Admin Users secara fleksibel:
 * Mengenali tab: "admin user", "admin users", "Admin User", "AdminUsers", "Akun Admin", "Admin", "Users", dll.
 */
function findAdminUsersSheet(ss) {
  var sheets = ss.getSheets();
  
  // 1. Cek nama exact & variasi umum
  for (var i = 0; i < sheets.length; i++) {
    var rawName = sheets[i].getName().trim();
    var nameLower = rawName.toLowerCase();
    
    // Jangan pilih sheet pesanan atau menu
    if (nameLower.indexOf("pesanan") !== -1 || nameLower.indexOf("order") !== -1 || nameLower.indexOf("menu") !== -1) {
      continue;
    }
    
    if (
      nameLower === "admin user" ||
      nameLower === "admin users" ||
      nameLower === "adminuser" ||
      nameLower === "adminusers" ||
      nameLower === "akun admin" ||
      nameLower === "user admin" ||
      nameLower === "admin" ||
      nameLower === "users" ||
      nameLower === "user" ||
      nameLower === "pengelola" ||
      nameLower.indexOf("admin") !== -1 ||
      nameLower.indexOf("user") !== -1
    ) {
      return sheets[i];
    }
  }
  
  return null;
}

/**
 * Mengambil atau membuat sheet Admin Users jika belum ada sama sekali
 */
function getOrCreateAdminUsersSheet(ss) {
  var existing = findAdminUsersSheet(ss);
  if (existing) return existing;
  
  var sheet = ss.insertSheet("admin user");
  var headers = [
    "Username",
    "Password",
    "PIN",
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

  // Akun Awal Default
  sheet.appendRow(["admin", "dimsumanyu123", "123456", "Owner / Admin Utama", "Aktif", "-"]);
  sheet.appendRow(["kasir", "dimsum123", "290501", "Kasir Toko", "Aktif", "-"]);
  sheet.appendRow(["dapur", "dapur123", "112233", "Staf Dapur", "Aktif", "-"]);
  
  return sheet;
}

/**
 * Mengambil atau membuat sheet Pesanan jika belum ada
 */
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

/**
 * Jalankan fungsi ini dari Apps Script untuk membuat sheet 'admin user' dan 'Pesanan' otomatis!
 */
function setupSheets() {
  var ss = getTargetSpreadsheet();
  var adminSheet = getOrCreateAdminUsersSheet(ss);
  var pesananSheet = getOrCreatePesananSheet(ss);
  
  var info = "✅ BERHASIL: Sheet '" + adminSheet.getName() + "' dan Sheet 'Pesanan' telah siap di Google Sheets Anda!";
  Logger.log(info);
  return info;
}

/**
 * Verifikasi login fleksibel (Username + Password ATAU PIN) dari spreadsheet
 */
function checkAdminLogin(username, password, pin) {
  var ss = getTargetSpreadsheet();
  var sheet = findAdminUsersSheet(ss);
  
  if (!sheet) {
    sheet = getOrCreateAdminUsersSheet(ss);
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      success: false,
      error: "Sheet '" + sheet.getName() + "' kosong atau belum ada akun admin yang ditulis."
    };
  }
  
  var cleanUser = username ? String(username).trim().toLowerCase() : '';
  var cleanPass = password ? String(password).trim() : '';
  var cleanPin = pin ? String(pin).trim() : '';
  
  // Deteksi kolom secara cerdas berdasarkan baris header
  var headerRow = data[0];
  var colUser = 0;
  var colPass = 1;
  var colPin = -1;
  var colRole = 2;
  var colStatus = 3;
  var colLastLogin = 4;
  
  for (var h = 0; h < headerRow.length; h++) {
    var hName = String(headerRow[h] || '').trim().toLowerCase();
    if (hName.indexOf('user') !== -1 || hName.indexOf('nama akun') !== -1) colUser = h;
    else if (hName.indexOf('pass') !== -1 || hName.indexOf('sandi') !== -1 || hName.indexOf('kata sandi') !== -1) colPass = h;
    else if (hName.indexOf('pin') !== -1) colPin = h;
    else if (hName.indexOf('role') !== -1 || hName.indexOf('peran') !== -1 || hName.indexOf('jabatan') !== -1) colRole = h;
    else if (hName.indexOf('status') !== -1) colStatus = h;
    else if (hName.indexOf('login') !== -1 || hName.indexOf('waktu') !== -1) colLastLogin = h;
  }
  
  // Jika kolom PIN belum ada, cek apakah password bisa dipakai sebagai PIN
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowUser = String(row[colUser] !== undefined ? row[colUser] : '').trim();
    var rowPass = String(row[colPass] !== undefined ? row[colPass] : '').trim();
    var rowPin = colPin !== -1 && row[colPin] !== undefined ? String(row[colPin]).trim() : '';
    var role = colRole !== -1 && row[colRole] ? String(row[colRole]).trim() : 'Admin';
    var status = colStatus !== -1 && row[colStatus] ? String(row[colStatus]).trim().toLowerCase() : 'aktif';
    
    // Baris kosong dilewati
    if (!rowUser && !rowPass && !rowPin) continue;
    
    // A. Login via PIN Cepat
    if (cleanPin) {
      var isPinMatch = (rowPin && rowPin === cleanPin) || (rowPass && rowPass === cleanPin);
      if (isPinMatch) {
        if (status === 'nonaktif' || status === 'disabled' || status === 'blokir' || status === 'tidak aktif') {
          return { success: false, error: "Akun ini berstatus Nonaktif di spreadsheet." };
        }
        
        // Catat waktu login jika kolom ada
        if (colLastLogin !== -1) {
          try {
            var nowStr = Utilities.formatDate(new Date(), "Asia/Makassar", "yyyy-MM-dd HH:mm:ss");
            sheet.getRange(i + 1, colLastLogin + 1).setValue(nowStr);
          } catch (e) {}
        }
        
        return {
          success: true,
          message: "Login PIN berhasil! Selamat datang, " + (rowUser || role) + ".",
          user: { username: rowUser || 'Admin', role: role }
        };
      }
    }
    
    // B. Login via Username & Password
    if (cleanUser && cleanPass) {
      if (rowUser.toLowerCase() === cleanUser) {
        if (status === 'nonaktif' || status === 'disabled' || status === 'blokir' || status === 'tidak aktif') {
          return { success: false, error: "Akun '" + username + "' berstatus Nonaktif di spreadsheet." };
        }
        
        var isPassMatch = (rowPass === cleanPass) || (rowPin && rowPin === cleanPass);
        if (isPassMatch) {
          if (colLastLogin !== -1) {
            try {
              var nowStr2 = Utilities.formatDate(new Date(), "Asia/Makassar", "yyyy-MM-dd HH:mm:ss");
              sheet.getRange(i + 1, colLastLogin + 1).setValue(nowStr2);
            } catch (e) {}
          }
          
          return {
            success: true,
            message: "Login berhasil! Selamat datang, " + (rowUser || role) + ".",
            user: { username: rowUser, role: role }
          };
        } else {
          return { success: false, error: "Password salah untuk username '" + username + "'." };
        }
      }
    }
  }
  
  if (cleanPin) {
    return { success: false, error: "PIN cepat '" + cleanPin + "' tidak cocok dengan akun manapun di sheet '" + sheet.getName() + "'." };
  }
  
  return { success: false, error: "Username '" + username + "' tidak ditemukan di sheet '" + sheet.getName() + "' spreadsheet." };
}

// -------------------------------------------------------------
// ENDPOINT GET (Web App)
// -------------------------------------------------------------
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  
  // 1. Verifikasi Login Admin & PIN
  if (action === 'login' || action === 'checkLogin') {
    var u = (e && e.parameter && e.parameter.username) || '';
    var p = (e && e.parameter && e.parameter.password) || '';
    var pin = (e && e.parameter && e.parameter.pin) || '';
    var loginResult = checkAdminLogin(u, p, pin);
    return ContentService.createTextOutput(JSON.stringify(loginResult))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 2. Status Cek Sheet Admin Users
  if (action === 'checkAdminUsers' || action === 'testAdminUsers' || action === 'test_sheet') {
    try {
      var ssCheck = getTargetSpreadsheet();
      var adminSheetCheck = findAdminUsersSheet(ssCheck);
      if (!adminSheetCheck) {
        adminSheetCheck = getOrCreateAdminUsersSheet(ssCheck);
      }
      var rowsCheck = adminSheetCheck.getDataRange().getValues();
      var userCount = Math.max(0, rowsCheck.length - 1);
      
      var registeredUsers = [];
      for (var r = 1; r < rowsCheck.length; r++) {
        if (rowsCheck[r][0]) {
          registeredUsers.push(String(rowsCheck[r][0]).trim());
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        sheetExists: true,
        sheetName: adminSheetCheck.getName(),
        userCount: userCount,
        users: registeredUsers,
        message: "Sheet '" + adminSheetCheck.getName() + "' aktif terhubung dengan " + userCount + " akun pengguna."
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (errCheck) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Gagal membaca sheet admin user: " + errCheck.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 3. Inisialisasi Sheet Otomatis
  if (action === 'setup' || action === 'init' || action === 'createSheets') {
    var initMsg = setupSheets();
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: initMsg
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 4. Pencatatan Pesanan via GET
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

  // 5. Ambil data menu
  if (action === 'getMenuData') {
    var menuData = getMenuData();
    return ContentService.createTextOutput(JSON.stringify(menuData))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 6. Ambil seluruh data pesanan dari sheet 'Pesanan' (Sinkronisasi Antar Device Real-time)
  if (action === 'getOrders' || action === 'getPesanan' || action === 'fetchOrders') {
    var pesananList = getPesananFromSheet();
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      orders: pesananList,
      count: pesananList.length,
      version: "2.2"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 7. Update status pesanan via GET
  if (action === 'updateStatus' || action === 'updateOrderStatus') {
    var uOrderId = e.parameter.id || e.parameter.orderId;
    var uStatus = e.parameter.status;
    var uSuccess = updateOrderStatusInSheet(uOrderId, uStatus);
    return ContentService.createTextOutput(JSON.stringify({
      success: uSuccess,
      message: uSuccess ? "Status pesanan berhasil diupdate di Google Sheets!" : "Pesanan tidak ditemukan",
      orderId: uOrderId,
      status: uStatus
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 8. Status ping
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    app: "DIMSUMANYU",
    version: "2.2",
    message: "Google Apps Script aktif & terhubung dengan sheet Pesanan & Admin User!",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------------
// ENDPOINT POST (Pencatatan Pesanan, Setup & Login)
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
    
    // Inisialisasi sheet
    if (data.action === 'setup' || data.action === 'init') {
      var initMsgPost = setupSheets();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: initMsgPost
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Login admin
    if (data.action === 'login' || data.action === 'checkLogin') {
      var loginRes = checkAdminLogin(data.username, data.password, data.pin);
      return ContentService.createTextOutput(JSON.stringify(loginRes))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default aksi: simpan pesanan
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
// PENYIMPANAN PESANAN KE SHEET 'Pesanan'
// -------------------------------------------------------------
function simpanPesanan(orderData) {
  var ss = getTargetSpreadsheet();
  
  getOrCreateAdminUsersSheet(ss);
  var sheet = getOrCreatePesananSheet(ss);

  var now = new Date();
  var timestampStr = Utilities.formatDate(now, "Asia/Makassar", "yyyy-MM-dd HH:mm:ss");
  var orderId = orderData.id || ("DAN-" + Utilities.formatDate(now, "Asia/Makassar", "yyyyMMdd-HHmmss"));
  
  var rowData = [
    timestampStr,
    orderId,
    orderData.nama || "-",
    "'" + (orderData.phone || "-"),
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

function updateOrderStatusInSheet(orderId, newStatus) {
  var ss = getTargetSpreadsheet();
  var sheet = ss.getSheetByName("Pesanan") || ss.getSheetByName("Orders");
  if (!sheet) return false;
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][1]).trim() === String(orderId).trim()) {
      sheet.getRange(i + 1, 11).setValue(newStatus);
      return true;
    }
  }
  return false;
}

function getPesananFromSheet() {
  var ss = getTargetSpreadsheet();
  var sheet = ss.getSheetByName("Pesanan") || ss.getSheetByName("Orders");
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var orders = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var orderId = String(row[1] || "").trim();
    if (!orderId) continue;

    var rawTotal = row[9];
    var totalHarga = typeof rawTotal === "number"
      ? rawTotal
      : parseInt(String(rawTotal).replace(/[^0-9]/g, ""), 10) || 0;

    var dateVal = row[0];
    var createdAtStr = dateVal instanceof Date ? dateVal.toISOString() : String(dateVal || new Date().toISOString());
    var rincian = String(row[8] || "").trim();

    // Rekonstruksi items agar struk dan rincian menu tampil rapi
    var parsedItems = [];
    if (rincian) {
      var lines = rincian.split(/\r?\n/);
      for (var l = 0; l < lines.length; l++) {
        var line = lines[l].trim();
        if (!line) continue;
        var match = line.match(/^(\d+)x\s+(.+)$/i);
        if (match) {
          var qty = parseInt(match[1], 10) || 1;
          var itemNama = match[2].trim();
          var itemHarga = 0;
          var priceMatch = itemNama.match(/\(?Rp\.?\s*([0-9.,]+)\)?/i);
          if (priceMatch) {
            itemHarga = parseInt(priceMatch[1].replace(/[^0-9]/g, ""), 10) || 0;
            itemNama = itemNama.replace(/\(?Rp\.?\s*[0-9.,]+\)?/i, "").trim();
          }
          parsedItems.push({
            id: 'item-' + l,
            nama: itemNama,
            qty: qty,
            harga: itemHarga,
            subtotal: itemHarga * qty
          });
        } else {
          parsedItems.push({
            id: 'item-' + l,
            nama: line,
            qty: 1,
            harga: 0,
            subtotal: 0
          });
        }
      }
    }

    orders.push({
      id: orderId,
      createdAt: createdAtStr,
      nama: String(row[2] || "Pelanggan").trim(),
      phone: String(row[3] || "").replace(/^'/, "").trim(),
      opsiPengiriman: String(row[4] || "Diantar ke Alamat").trim(),
      alamat: String(row[5] || "").trim(),
      metodeBayar: String(row[6] || "QRIS").trim(),
      catatan: String(row[7] || "").trim(),
      rincianMenu: rincian,
      items: parsedItems,
      totalHarga: totalHarga,
      status: String(row[10] || "Menunggu payment").trim(),
      syncedToSheets: true
    });
  }

  // Urutkan dari yang paling baru
  return orders.reverse();
}
`;
