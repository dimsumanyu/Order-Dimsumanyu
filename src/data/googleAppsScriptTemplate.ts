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
 * Mengambil atau membuat sheet Menu jika belum ada (Sinkronisasi Menu 2 Arah)
 */
function getOrCreateMenuSheet(ss) {
  var sheet = ss.getSheetByName("Menu") || ss.getSheetByName("Daftar Menu") || ss.getSheetByName("DB_DIMSUMANYU") || ss.getSheetByName("Produk");
  
  if (!sheet) {
    sheet = ss.insertSheet("Menu");
    var headers = [
      "ID Menu",
      "Nama Menu",
      "Kategori",
      "Harga (Rp)",
      "Status (TERSEDIA/HABIS)",
      "Keterangan",
      "Best Seller (YA/TIDAK)",
      "URL Gambar",
      "Terakhir Diupdate"
    ];
    sheet.appendRow(headers);
    
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#DC2626"); // Merah DIMSUMANYU
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);

    // Isi Otomatis Menu Default DIMSUMANYU
    var defaultItems = [
      ["menu-1", "KUKUS ORIGINAL ISI 6 PCS", "DIMSUM KUKUS", 25000, "TERSEDIA", "", "TIDAK", ""],
      ["menu-2", "KUKUS MENTAI ISI 6 PCS", "DIMSUM KUKUS", 32000, "TERSEDIA", "BEST SELLER", "YA", ""],
      ["menu-3", "KUKUS ORIGINAL ISI 8 PCS", "DIMSUM KUKUS", 33000, "TERSEDIA", "", "TIDAK", ""],
      ["menu-4", "KUKUS MENTAI ISI 8 PCS", "DIMSUM KUKUS", 43000, "TERSEDIA", "BEST SELLER", "YA", ""],
      ["menu-5", "GORENG ORIGINAL ISI 5 PCS", "DIMSUM GORENG", 25000, "TERSEDIA", "", "TIDAK", ""],
      ["menu-6", "GORENG MENTAI ISI 5 PCS", "DIMSUM GORENG", 35000, "TERSEDIA", "BEST SELLER", "YA", ""],
      ["menu-7", "MIX ORIGINAL ISI 6 PCS (3 Pcs Kukus Ori + 3 Pcs Goreng Ori)", "DIMSUM MIX", 28000, "TERSEDIA", "", "TIDAK", ""],
      ["menu-8", "MIX MENTAI ISI 6 PCS (3 Pcs Kukus Mentai + 3 Pcs Goreng Mentai)", "DIMSUM MIX", 34000, "TERSEDIA", "BEST SELLER", "YA", ""],
      ["menu-9", "MIX ORIGINAL ISI 8 PCS (4 Pcs Kukus Ori + 4 Pcs Goreng Ori)", "DIMSUM MIX", 36000, "TERSEDIA", "", "TIDAK", ""],
      ["menu-10", "MIX MENTAI ISI 8 PCS (4 Pcs Kukus Mentai + 4 Pcs Goreng Mentai)", "DIMSUM MIX", 47000, "TERSEDIA", "BEST SELLER", "YA", ""],
      ["menu-11", "NORI ORIGINAL ISI 6 PCS", "DIMSUM NORI", 33000, "TERSEDIA", "", "TIDAK", ""],
      ["menu-12", "NORI MENTAI ISI 6 PCS", "DIMSUM NORI", 40000, "TERSEDIA", "BEST SELLER", "YA", ""],
      ["menu-13", "NORI ORIGINAL ISI 8 PCS", "DIMSUM NORI", 43000, "TERSEDIA", "", "TIDAK", ""],
      ["menu-14", "NORI MENTAI ISI 8 PCS", "DIMSUM NORI", 52000, "TERSEDIA", "BEST SELLER", "YA", ""],
      ["menu-15", "CHILI OIL SPESIAL (CUP)", "EXTRA SAUS", 5000, "TERSEDIA", "Pedas Gurih", "TIDAK", ""],
      ["menu-16", "SAUS MENTAI BAKAR (CUP)", "EXTRA SAUS", 10000, "TERSEDIA", "Creamy Smoky", "TIDAK", ""],
      ["menu-17", "MAYONAISE SAUS (CUP)", "EXTRA SAUS", 4000, "TERSEDIA", "Manis Gurih", "TIDAK", ""]
    ];
    for (var m = 0; m < defaultItems.length; m++) {
      var row = defaultItems[m];
      row.push(Utilities.formatDate(new Date(), "Asia/Makassar", "yyyy-MM-dd HH:mm:ss"));
      sheet.appendRow(row);
    }
  }
  return sheet;
}

/**
 * Jalankan fungsi ini dari Apps Script untuk membuat sheet 'admin user', 'Pesanan', dan 'Menu' otomatis!
 */
function setupSheets() {
  var ss = getTargetSpreadsheet();
  var adminSheet = getOrCreateAdminUsersSheet(ss);
  var pesananSheet = getOrCreatePesananSheet(ss);
  var menuSheet = getOrCreateMenuSheet(ss);
  
  var info = "✅ BERHASIL: Sheet '" + adminSheet.getName() + "', Sheet '" + pesananSheet.getName() + "', dan Sheet '" + menuSheet.getName() + "' telah siap di Google Sheets Anda!";
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

  // 5. Ambil data menu (Sinkronisasi Menu Real-Time ke Seluruh HP & Web)
  if (action === 'getMenu' || action === 'getMenuData' || action === 'fetchMenu') {
    var menuList = getMenuFromSheet();
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      menu: menuList,
      count: menuList.length,
      version: "2.4"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 5B. Simpan atau Update Menu via GET
  if (action === 'saveMenu' || action === 'saveMenuItem') {
    var rawItem = e.parameter.payload || e.parameter.data || e.parameter.item;
    var parsedItem = typeof rawItem === 'string' ? JSON.parse(rawItem) : (rawItem || e.parameter);
    var saveMenuRes = saveMenuItemToSheet(parsedItem);
    return ContentService.createTextOutput(JSON.stringify(saveMenuRes))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 5C. Hapus Menu via GET
  if (action === 'deleteMenu' || action === 'deleteMenuItem') {
    var delMenuId = e.parameter.id || e.parameter.menuId;
    var delMenuRes = deleteMenuItemFromSheet(delMenuId);
    return ContentService.createTextOutput(JSON.stringify(delMenuRes))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 5D. Ubah Status Ketersediaan Menu via GET
  if (action === 'toggleMenuStatus' || action === 'updateMenuStatus') {
    var tMenuId = e.parameter.id || e.parameter.menuId;
    var tStatus = e.parameter.status;
    var tRes = toggleMenuStatusInSheet(tMenuId, tStatus);
    return ContentService.createTextOutput(JSON.stringify(tRes))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 6. Ambil seluruh data pesanan dari sheet 'Pesanan' (Sinkronisasi Antar Device Real-time)
  if (action === 'getOrders' || action === 'getPesanan' || action === 'fetchOrders') {
    var pesananList = getPesananFromSheet();
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      orders: pesananList,
      count: pesananList.length,
      version: "2.4"
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

  // 8. Hapus pesanan dari sheet 'Pesanan' via GET/Webhook
  if (action === 'deleteOrder' || action === 'deleteOrders' || action === 'bulkDelete') {
    var rawIds = e.parameter.orderIds || e.parameter.id || e.parameter.orderId;
    var idsToDelete = [];
    if (rawIds) {
      try {
        var parsed = JSON.parse(rawIds);
        if (Array.isArray(parsed)) idsToDelete = parsed;
        else idsToDelete = [String(parsed)];
      } catch (parseE) {
        idsToDelete = String(rawIds).split(',').map(function(s) { return s.trim(); });
      }
    }
    var delCount = deleteOrdersFromSheet(idsToDelete);
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      deletedCount: delCount,
      message: "Berhasil menghapus " + delCount + " baris pesanan dari sheet Pesanan."
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 9. Status ping
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    app: "DIMSUMANYU",
    version: "2.4",
    message: "Google Apps Script aktif & terhubung dengan sheet Pesanan, Menu & Admin User!",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------------
// ENDPOINT POST (Pencatatan Pesanan, Menu, Setup & Login)
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

    // Simpan / Update Menu via POST
    if (data.action === 'saveMenu' || data.action === 'saveMenuItem') {
      var savePostRes = saveMenuItemToSheet(data.item || data);
      return ContentService.createTextOutput(JSON.stringify(savePostRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Hapus Menu via POST
    if (data.action === 'deleteMenu' || data.action === 'deleteMenuItem') {
      var delPostRes = deleteMenuItemFromSheet(data.id || data.menuId);
      return ContentService.createTextOutput(JSON.stringify(delPostRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Ubah status ketersediaan stok via POST
    if (data.action === 'toggleMenuStatus' || data.action === 'updateMenuStatus') {
      var togglePostRes = toggleMenuStatusInSheet(data.id || data.menuId, data.status);
      return ContentService.createTextOutput(JSON.stringify(togglePostRes))
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
// PENYIMPANAN PESANAN KE SHEET 'Pesanan' (DENGAN DEDUPLIKASI & AUTO-MAP KOLOM)
// -------------------------------------------------------------
function simpanPesanan(orderData) {
  var ss = getTargetSpreadsheet();
  
  getOrCreateAdminUsersSheet(ss);
  var sheet = getOrCreatePesananSheet(ss);

  var now = new Date();
  var timestampStr = Utilities.formatDate(now, "Asia/Makassar", "yyyy-MM-dd HH:mm:ss");
  var orderId = String(orderData.id || ("DAN-" + Utilities.formatDate(now, "Asia/Makassar", "yyyyMMdd-HHmmss"))).trim();
  
  var values = sheet.getDataRange().getValues();
  var headers = values.length > 0 ? values[0] : [];
  
  // 1. DEDUPLIKASI KETAT: Cek apakah ID Pesanan ini SUDAH TERCATAT di sheet!
  // Jika sudah ada, jangan tambahkan baris baru (cegah 1 klik jadi 3 baris)
  if (values.length > 1) {
    for (var i = 1; i < values.length; i++) {
      var rowCheck = values[i];
      for (var c = 0; c < rowCheck.length; c++) {
        if (String(rowCheck[c] || "").trim() === orderId) {
          return {
            success: true,
            duplicate: true,
            orderId: orderId,
            message: "Pesanan sudah ada di sheet (duplikat dicegah)."
          };
        }
      }
    }
  }

  // 2. AUTO-MAP KOLOM SESUAI HEADER SPREADSHEET PENGGUNA
  var colMap = {
    timestamp: 0,
    orderId: 1,
    nama: 2,
    phone: 3,
    opsi: 4,
    alamat: 5,
    metode: 6,
    catatan: 7,
    rincian: 8,
    total: 9,
    status: 10
  };

  if (headers.length > 0) {
    for (var h = 0; h < headers.length; h++) {
      var hText = String(headers[h] || '').trim().toLowerCase();
      if (!hText) continue;
      if (hText.indexOf('id') !== -1 && hText.indexOf('pesanan') !== -1) colMap.orderId = h;
      else if (hText.indexOf('id') !== -1 && colMap.orderId === 1) colMap.orderId = h;
      else if (hText.indexOf('waktu') !== -1 || hText.indexOf('tanggal') !== -1 || hText.indexOf('tgl') !== -1) colMap.timestamp = h;
      else if (hText.indexOf('nama') !== -1 || hText.indexOf('pemesan') !== -1 || hText.indexOf('pelanggan') !== -1) colMap.nama = h;
      else if (hText.indexOf('wa') !== -1 || hText.indexOf('whatsapp') !== -1 || hText.indexOf('telepon') !== -1 || hText.indexOf('hp') !== -1) colMap.phone = h;
      else if (hText.indexOf('alamat') !== -1 || hText.indexOf('tujuan') !== -1 || hText.indexOf('lokasi') !== -1) colMap.alamat = h;
      else if (hText.indexOf('opsi') !== -1 || hText.indexOf('pengiriman') !== -1 || hText.indexOf('ambil') !== -1) colMap.opsi = h;
      else if (hText.indexOf('metode') !== -1 || hText.indexOf('pembayaran') !== -1 || (hText.indexOf('bayar') !== -1 && hText.indexOf('total') === -1)) colMap.metode = h;
      else if (hText.indexOf('catatan') !== -1 || hText.indexOf('note') !== -1 || hText.indexOf('keterangan') !== -1) colMap.catatan = h;
      else if (hText.indexOf('rincian') !== -1 || hText.indexOf('menu') !== -1 || hText.indexOf('item') !== -1) colMap.rincian = h;
      else if (hText.indexOf('total') !== -1 || hText.indexOf('harga') !== -1 || hText.indexOf('rp') !== -1 || hText.indexOf('nominal') !== -1) colMap.total = h;
      else if (hText.indexOf('status') !== -1) colMap.status = h;
    }
  }

  // Siapkan baris data baru sesuai panjang kolom header
  var maxCol = Math.max(headers.length, 11);
  var rowData = new Array(maxCol).fill("-");

  rowData[colMap.timestamp] = timestampStr;
  rowData[colMap.orderId] = orderId;
  rowData[colMap.nama] = orderData.nama || "-";
  rowData[colMap.phone] = "'" + (orderData.phone || "-");
  rowData[colMap.opsi] = orderData.opsiPengiriman || "Diantar ke Alamat";
  rowData[colMap.alamat] = orderData.alamat || "-";
  rowData[colMap.metode] = orderData.metodeBayar || "QRIS";
  rowData[colMap.catatan] = orderData.catatan || "-";
  rowData[colMap.rincian] = orderData.rincianMenu || "-";
  rowData[colMap.total] = Number(orderData.totalHarga) || 0;
  rowData[colMap.status] = orderData.status || "Menunggu payment";

  sheet.appendRow(rowData);
  
  return {
    orderId: orderId,
    timestamp: timestampStr,
    nama: orderData.nama,
    total: orderData.totalHarga,
    sheetName: sheet.getName()
  };
}

function mapMenuHeaders(headers) {
  var map = {
    id: -1,
    nama: 0,
    kategori: 1,
    harga: 2,
    status: 3,
    keterangan: 4,
    bestSeller: -1,
    imageUrl: -1
  };
  
  if (!headers || headers.length === 0) return map;

  for (var h = 0; h < headers.length; h++) {
    var hText = String(headers[h] || '').trim().toLowerCase();
    if (!hText) continue;
    
    // Deteksi ID (hanya jika eksplisit ID, jangan campur dengan Nama Menu)
    if (hText === 'id' || hText === 'id menu' || hText === 'id_menu' || hText === 'kode' || hText === 'item id') {
      map.id = h;
    }
    // Deteksi Nama Menu
    else if (hText.indexOf('nama') !== -1 || hText.indexOf('menu') !== -1 || hText.indexOf('produk') !== -1 || hText.indexOf('item') !== -1) {
      map.nama = h;
    }
    // Deteksi Kategori
    else if (hText.indexOf('kategori') !== -1 || hText.indexOf('category') !== -1 || hText.indexOf('jenis') !== -1) {
      map.kategori = h;
    }
    // Deteksi Harga
    else if (hText.indexOf('harga') !== -1 || hText.indexOf('price') !== -1 || hText.indexOf('rp') !== -1 || hText.indexOf('tarif') !== -1) {
      map.harga = h;
    }
    // Deteksi Status / Stok
    else if (hText.indexOf('status') !== -1 || hText.indexOf('stok') !== -1 || hText.indexOf('tersedia') !== -1) {
      map.status = h;
    }
    // Deteksi Keterangan / Deskripsi
    else if (hText.indexOf('keterangan') !== -1 || hText.indexOf('desc') !== -1 || hText.indexOf('catatan') !== -1 || hText.indexOf('detail') !== -1) {
      map.keterangan = h;
    }
    // Deteksi Best Seller
    else if (hText.indexOf('best') !== -1 || hText.indexOf('seller') !== -1 || hText.indexOf('unggulan') !== -1) {
      map.bestSeller = h;
    }
    // Deteksi Gambar
    else if (hText.indexOf('gambar') !== -1 || hText.indexOf('image') !== -1 || hText.indexOf('foto') !== -1 || hText.indexOf('url') !== -1) {
      map.imageUrl = h;
    }
  }

  // Jika kolom id sama dengan kolom nama (misal header "ID Menu"), prioritaskan sebagai nama
  if (map.id === map.nama) {
    map.id = -1;
  }

  return map;
}

function getMenuFromSheet() {
  var ss = getTargetSpreadsheet();
  var sheet = getOrCreateMenuSheet(ss);
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var colMap = mapMenuHeaders(values[0]);
  var list = [];

  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var nama = String(r[colMap.nama] || '').trim();
    if (!nama) continue;
    
    var kategori = String(r[colMap.kategori] || 'DIMSUM').trim().toUpperCase();
    var rawHarga = r[colMap.harga];
    var harga = typeof rawHarga === 'number' ? rawHarga : (parseInt(String(rawHarga).replace(/[^0-9]/g, ''), 10) || 0);

    // AUTO-REPAIR SPREADSHEET CERDAS:
    // Hanya jika nama berupa ID teknis timestamp panjang (misal menu-179402...)
    if (nama.indexOf('menu-17') === 0 && nama.length > 15) {
      var realNama = kategori;
      var realKategori = "DIMSUM FROZEN";
      var realHarga = harga;
      if (realHarga <= 0) {
        if (realNama.indexOf('6 PCS') !== -1) realHarga = 25000;
        else if (realNama.indexOf('8 PCS') !== -1) realHarga = 33000;
        else if (realNama.indexOf('5 PCS') !== -1) realHarga = 25000;
        else if (realNama.indexOf('7 PCS') !== -1) realHarga = 35000;
        else if (realNama.indexOf('16 PCS') !== -1) realHarga = 72000;
        else realHarga = 25000;
      }

      nama = realNama;
      kategori = realKategori;
      harga = realHarga;

      // Perbaiki baris di Google Sheets secara permanen
      try {
        sheet.getRange(i + 1, colMap.nama + 1).setValue(realNama);
        sheet.getRange(i + 1, colMap.kategori + 1).setValue(realKategori);
        sheet.getRange(i + 1, colMap.harga + 1).setValue(realHarga);
      } catch (errRep) {}
    }

    // Cegah nama produk menjadi kategori
    if (kategori.indexOf('ISI') !== -1 && kategori.indexOf('PCS') !== -1) {
      if (kategori.indexOf('FROZEN') !== -1) kategori = 'DIMSUM FROZEN';
      else if (kategori.indexOf('KUKUS') !== -1) kategori = 'DIMSUM KUKUS';
      else if (kategori.indexOf('GORENG') !== -1) kategori = 'DIMSUM GORENG';
      else if (kategori.indexOf('MIX') !== -1) kategori = 'PAKET MIX';
      else kategori = 'DIMSUM';
    }

    var rawId = colMap.id !== -1 && r[colMap.id] ? String(r[colMap.id]).trim() : ('menu-' + i);
    var rawStatus = colMap.status !== -1 ? String(r[colMap.status] || 'TERSEDIA').trim().toUpperCase() : 'TERSEDIA';
    var isBest = colMap.bestSeller !== -1 ? (String(r[colMap.bestSeller] || '').trim().toUpperCase() === 'YA' || String(r[colMap.bestSeller] || '').trim().toUpperCase() === 'TRUE') : false;
    var img = colMap.imageUrl !== -1 && r[colMap.imageUrl] ? String(r[colMap.imageUrl]).trim() : '';
    
    list.push({
      id: rawId,
      nama: nama,
      kategori: kategori,
      harga: harga,
      status: (rawStatus === 'HABIS' || rawStatus === 'KOSONG' || rawStatus === 'OUT_OF_STOCK') ? 'HABIS' : 'TERSEDIA',
      keterangan: colMap.keterangan !== -1 ? String(r[colMap.keterangan] || '').trim() : '',
      isBestSeller: isBest,
      imageUrl: img || undefined
    });
  }
  return list;
}

// Kompatibilitas nama lama
function getMenuData() {
  return getMenuFromSheet();
}

function saveMenuItemToSheet(item) {
  if (!item) return { success: false, error: "Data menu kosong" };
  var ss = getTargetSpreadsheet();
  var sheet = getOrCreateMenuSheet(ss);
  var values = sheet.getDataRange().getValues();
  if (values.length === 0) return { success: false, error: "Sheet kosong" };

  var colMap = mapMenuHeaders(values[0]);

  var inputNama = String(item.nama || '').trim();
  var inputKategori = String(item.kategori || 'DIMSUM').trim().toUpperCase();

  // Pengamanan jika nama terisi ID otomatis
  if (inputNama.indexOf('menu-17') === 0 && inputNama.length > 15) {
    if (inputKategori && inputKategori.indexOf(' ') !== -1) {
      inputNama = inputKategori;
      inputKategori = 'DIMSUM FROZEN';
    }
  }

  // Pengamanan kategori agar tidak tertulis nama menu spesifik
  if (inputKategori.indexOf('ISI') !== -1 && inputKategori.indexOf('PCS') !== -1) {
    if (inputKategori.indexOf('FROZEN') !== -1) inputKategori = 'DIMSUM FROZEN';
    else if (inputKategori.indexOf('KUKUS') !== -1) inputKategori = 'DIMSUM KUKUS';
    else if (inputKategori.indexOf('GORENG') !== -1) inputKategori = 'DIMSUM GORENG';
    else if (inputKategori.indexOf('MIX') !== -1) inputKategori = 'PAKET MIX';
    else inputKategori = 'DIMSUM';
  }

  var inputHarga = typeof item.harga === 'number' ? item.harga : (parseInt(String(item.harga).replace(/[^0-9]/g, ''), 10) || 0);
  if (inputHarga <= 0) {
    if (inputNama.indexOf('6 PCS') !== -1) inputHarga = 25000;
    else if (inputNama.indexOf('8 PCS') !== -1) inputHarga = 33000;
    else if (inputNama.indexOf('5 PCS') !== -1) inputHarga = 25000;
    else if (inputNama.indexOf('7 PCS') !== -1) inputHarga = 35000;
    else if (inputNama.indexOf('16 PCS') !== -1) inputHarga = 72000;
    else inputHarga = 25000;
  }

  var targetId = String(item.id || '').trim();
  var targetNama = inputNama.toLowerCase();
  var rowIndex = -1;

  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var rId = colMap.id !== -1 ? String(r[colMap.id] || '').trim() : '';
    var rNama = String(r[colMap.nama] || '').trim().toLowerCase();
    if ((targetId && rId && rId === targetId) || (rNama && rNama === targetNama) || (targetId && rNama === targetId.toLowerCase())) {
      rowIndex = i + 1;
      break;
    }
  }

  var maxCol = values[0].length;
  var rowData = new Array(maxCol).fill("");
  if (colMap.id !== -1) rowData[colMap.id] = targetId || ("menu-" + Date.now());
  rowData[colMap.nama] = inputNama;
  rowData[colMap.kategori] = inputKategori;
  rowData[colMap.harga] = inputHarga;
  rowData[colMap.status] = String(item.status || "TERSEDIA").toUpperCase();
  if (colMap.keterangan !== -1) rowData[colMap.keterangan] = String(item.keterangan || "").trim();
  if (colMap.bestSeller !== -1) rowData[colMap.bestSeller] = item.isBestSeller ? "YA" : "TIDAK";
  if (colMap.imageUrl !== -1) rowData[colMap.imageUrl] = String(item.imageUrl || "").trim();

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return { success: true, message: "Menu '" + inputNama + "' berhasil disimpan!", item: item };
}

function deleteMenuItemFromSheet(id) {
  var ss = getTargetSpreadsheet();
  var sheet = getOrCreateMenuSheet(ss);
  var values = sheet.getDataRange().getValues();
  var targetId = String(id || '').trim();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === targetId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Menu berhasil dihapus dari spreadsheet" };
    }
  }
  return { success: false, message: "Menu ID tidak ditemukan di spreadsheet" };
}

function toggleMenuStatusInSheet(id, status) {
  var ss = getTargetSpreadsheet();
  var sheet = getOrCreateMenuSheet(ss);
  var values = sheet.getDataRange().getValues();
  var targetId = String(id || '').trim();
  var newStatus = String(status || '').toUpperCase();
  
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === targetId) {
      if (!newStatus) {
        var current = String(values[i][4] || 'TERSEDIA').toUpperCase();
        newStatus = current === 'TERSEDIA' ? 'HABIS' : 'TERSEDIA';
      }
      sheet.getRange(i + 1, 5).setValue(newStatus);
      return { success: true, id: targetId, status: newStatus };
    }
  }
  return { success: false, message: "Menu ID tidak ditemukan" };
}

function updateOrderStatusInSheet(orderId, newStatus) {
  var ss = getTargetSpreadsheet();
  var sheet = ss.getSheetByName("Pesanan") || ss.getSheetByName("Orders");
  if (!sheet) return false;
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return false;

  var headers = values[0];
  var colStatus = 10;
  for (var h = 0; h < headers.length; h++) {
    if (String(headers[h] || '').toLowerCase().indexOf('status') !== -1) {
      colStatus = h;
      break;
    }
  }

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var matched = false;
    for (var c = 0; c < row.length; c++) {
      if (String(row[c] || "").trim() === String(orderId).trim()) {
        matched = true;
        break;
      }
    }
    if (matched) {
      sheet.getRange(i + 1, colStatus + 1).setValue(newStatus);
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

  var headers = values[0];
  var colMap = {
    timestamp: 0,
    orderId: 1,
    nama: 2,
    phone: 3,
    opsi: 4,
    alamat: 5,
    metode: 6,
    catatan: 7,
    rincian: 8,
    total: 9,
    status: 10
  };

  for (var h = 0; h < headers.length; h++) {
    var hText = String(headers[h] || '').trim().toLowerCase();
    if (!hText) continue;
    if (hText.indexOf('id') !== -1 && hText.indexOf('pesanan') !== -1) colMap.orderId = h;
    else if (hText.indexOf('id') !== -1 && colMap.orderId === 1) colMap.orderId = h;
    else if (hText.indexOf('waktu') !== -1 || hText.indexOf('tanggal') !== -1 || hText.indexOf('tgl') !== -1) colMap.timestamp = h;
    else if (hText.indexOf('nama') !== -1 || hText.indexOf('pemesan') !== -1 || hText.indexOf('pelanggan') !== -1) colMap.nama = h;
    else if (hText.indexOf('wa') !== -1 || hText.indexOf('whatsapp') !== -1 || hText.indexOf('telepon') !== -1 || hText.indexOf('hp') !== -1) colMap.phone = h;
    else if (hText.indexOf('alamat') !== -1 || hText.indexOf('tujuan') !== -1 || hText.indexOf('lokasi') !== -1) colMap.alamat = h;
    else if (hText.indexOf('opsi') !== -1 || hText.indexOf('pengiriman') !== -1 || hText.indexOf('ambil') !== -1) colMap.opsi = h;
    else if (hText.indexOf('metode') !== -1 || hText.indexOf('pembayaran') !== -1 || (hText.indexOf('bayar') !== -1 && hText.indexOf('total') === -1)) colMap.metode = h;
    else if (hText.indexOf('catatan') !== -1 || hText.indexOf('note') !== -1 || hText.indexOf('keterangan') !== -1) colMap.catatan = h;
    else if (hText.indexOf('rincian') !== -1 || hText.indexOf('menu') !== -1 || hText.indexOf('item') !== -1) colMap.rincian = h;
    else if (hText.indexOf('total') !== -1 || hText.indexOf('harga') !== -1 || hText.indexOf('rp') !== -1 || hText.indexOf('nominal') !== -1) colMap.total = h;
    else if (hText.indexOf('status') !== -1) colMap.status = h;
  }

  var orders = [];
  var seenIds = {};

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    
    // Temukan Order ID (baik di colMap.orderId atau scan format DAN- / DSM- di baris ini)
    var orderId = String(row[colMap.orderId] || "").trim();
    if (!orderId || (!orderId.startsWith("DAN-") && !orderId.startsWith("DSM-"))) {
      for (var c = 0; c < row.length; c++) {
        var valStr = String(row[c] || "").trim();
        if (valStr.startsWith("DAN-") || valStr.startsWith("DSM-")) {
          orderId = valStr;
          break;
        }
      }
    }
    if (!orderId) continue;

    // Cegah duplikat ID pada daftar pesanan
    if (seenIds[orderId]) continue;
    seenIds[orderId] = true;

    var rawTotal = row[colMap.total];
    var totalHarga = typeof rawTotal === "number"
      ? rawTotal
      : parseInt(String(rawTotal).replace(/[^0-9]/g, ""), 10) || 0;

    var dateVal = row[colMap.timestamp];
    var createdAtStr = dateVal instanceof Date ? dateVal.toISOString() : String(dateVal || new Date().toISOString());
    var rincian = String(row[colMap.rincian] || "").trim();

    // Rekonstruksi items agar struk dan rincian menu tampil rapi
    var parsedItems = [];
    if (rincian) {
      var lines = rincian.replace(/\\r/g, "").split("\\n");
      for (var l = 0; l < lines.length; l++) {
        var line = lines[l].trim();
        if (!line) continue;
        var match = line.match(/^(\\d+)x\\s+(.+)$/i);
        if (match) {
          var qty = parseInt(match[1], 10) || 1;
          var itemNama = match[2].trim();
          var itemHarga = 0;
          var priceMatch = itemNama.match(/\\(?Rp\\.?\\s*([0-9.,]+)\\)?/i);
          if (priceMatch) {
            itemHarga = parseInt(priceMatch[1].replace(/[^0-9]/g, ""), 10) || 0;
            itemNama = itemNama.replace(/\\(?Rp\\.?\\s*[0-9.,]+\\)?/i, "").trim();
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

    var rawAlamat = String(row[colMap.alamat] || "").trim();
    if (rawAlamat.match(/^\\d+x\\s+/i) || rawAlamat.indexOf('(Rp ') !== -1 || rawAlamat === rincian) {
      rawAlamat = (String(row[colMap.opsi] || "").indexOf("Ambil") !== -1) ? "Ambil langsung di Outlet DIMSUMANYU" : "";
    }

    orders.push({
      id: orderId,
      createdAt: createdAtStr,
      nama: String(row[colMap.nama] || "Pelanggan").trim(),
      phone: String(row[colMap.phone] || "").replace(/^'/, "").trim(),
      opsiPengiriman: String(row[colMap.opsi] || "Diantar ke Alamat").trim(),
      alamat: rawAlamat,
      metodeBayar: String(row[colMap.metode] || "QRIS").trim(),
      catatan: String(row[colMap.catatan] || "").trim(),
      rincianMenu: rincian,
      items: parsedItems,
      totalHarga: totalHarga,
      status: String(row[colMap.status] || "Menunggu payment").trim(),
      syncedToSheets: true
    });
  }

  // Urutkan dari yang paling baru
  return orders.reverse();
}

/**
 * Menghapus baris pesanan dari sheet 'Pesanan' berdasarkan ID pesanan
 */
function deleteOrdersFromSheet(ids) {
  if (!ids || ids.length === 0) return 0;
  var ss = getTargetSpreadsheet();
  var sheet = ss.getSheetByName("Pesanan") || ss.getSheetByName("Orders");
  if (!sheet) return 0;
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 0;
  
  var idSet = {};
  for (var i = 0; i < ids.length; i++) {
    var raw = String(ids[i]).trim().toLowerCase();
    if (raw) idSet[raw] = true;
  }
  
  var deletedCount = 0;
  // Looping dari baris paling bawah ke atas agar nomor baris tidak bergeser saat dihapus
  for (var r = data.length - 1; r >= 1; r--) {
    var row = data[r];
    var matched = false;
    for (var c = 0; c < row.length; c++) {
      var cellVal = String(row[c] || "").trim().toLowerCase();
      if (cellVal && idSet[cellVal]) {
        matched = true;
        break;
      }
    }
    if (matched) {
      sheet.deleteRow(r + 1);
      deletedCount++;
    }
  }
  return deletedCount;
}
`;
