/**
 * GOOGLE APPS SCRIPT - REAL-TIME BACKUP FROM TIDB (MULTI-LINE SUPPORT)
 * 
 * Fitur Utama:
 * 1. Real-Time Backup: Setiap kali data disimpan di TiDB (MySQL), API langsung mengalirkan data ke sini.
 * 2. Multi-Line Support: Otomatis mendeteksi Line 1, Line 2, Line 3, atau Line 4 berdasarkan user.line atau tableName.
 * 3. Smart Row Placement (Baris Paling Akhir dari Data Terakhir): Menggunakan getRealLastDataRow()
 *    agar data tidak melompat ke baris 1001 akibat sel format/border kosong di bagian bawah tabel.
 */

const ID_DB_LINE_1 = "1KeEqD_Ve9BF6EvYCytlmHZhkNqL3kt972PxE-QorW5I"; 
const ID_DB_LINE_2 = "1xMvhAOaz3hzL04Dtw5Yzb-g_6tONUe8bBBUJczbRtyY"; 
const ID_DB_LINE_3 = "1IyoWf1DD7Eq1IiMCYBPc8F0pf1WqthIlMPtDzxGeEWQ";
const ID_DB_LINE_4 = "11UwXe-3hIxWYY3FcZDmyPbSItsltlVT1hadyIzd4yZg";

const SHEET_DL_REJECT_C = "DL_REJECT_C";      
const SHEET_DL_REJECT_F = "DL_REJECT_F";
const SHEET_DL_DOWNTIME_C = "DL_DOWNTIME_C";  
const SHEET_DL_DOWNTIME_F = "DL_DOWNTIME_F";  

function getDbIdByLine(userLine) {
  const str = String(userLine || "2").toUpperCase().trim(); 
  if (str.includes("LINE 1") || str.includes("LINE1") || str === "1") return ID_DB_LINE_1;
  if (str.includes("LINE 3") || str.includes("LINE3") || str === "3") return ID_DB_LINE_3;
  if (str.includes("LINE 4") || str.includes("LINE4") || str === "4") return ID_DB_LINE_4;
  return ID_DB_LINE_2; 
}

/**
 * Mencari baris paling akhir yang berisi data nyata (menghindari lompat ke bawah akibat format/border kosong).
 */
function getRealLastDataRow(sheet, minRow) {
  if (!sheet) return minRow;
  var lastRow = sheet.getLastRow();
  if (lastRow < minRow) return minRow;
  
  // Ambil data dari kolom A hingga C untuk memeriksa baris yang benar-benar terisi
  var values = sheet.getRange(1, 1, lastRow, 3).getValues();
  for (var i = values.length - 1; i >= minRow - 1; i--) {
    var colA = String(values[i][0] || "").trim();
    var colB = String(values[i][1] || "").trim();
    var colC = String(values[i][2] || "").trim();
    if (colA !== "" || colB !== "" || colC !== "") {
      return i + 2; // i adalah indeks 0 (baris ke-(i+1)), baris kosong berikutnya adalah i + 2
    }
  }
  return minRow;
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || '';
    var data = payload.data || {};
    var user = payload.user || {};
    var tableName = payload.tableName || 'OEE_Backup';

    // 1. Deteksi Line ID (Uji Coba Line 3 & Support Line Lainnya)
    var userLine = (user && (user.line || user.plant)) || "2";
    var tblLower = String(tableName).toLowerCase();
    if (tblLower.indexOf('line1') !== -1) userLine = "1";
    else if (tblLower.indexOf('line2') !== -1) userLine = "2";
    else if (tblLower.indexOf('line3') !== -1) userLine = "3";
    else if (tblLower.indexOf('line4') !== -1) userLine = "4";

    var ss = SpreadsheetApp.openById(getDbIdByLine(userLine));

    // 2. Map nama tabel TiDB ke sheet standar Google Spreadsheet
    var targetSheetName = tableName;
    var actLower = String(action).toLowerCase();
    if (actLower.indexOf('reject_c') !== -1 || (tblLower.indexOf('oee') !== -1 && tblLower.indexOf('zonec') !== -1)) targetSheetName = SHEET_DL_REJECT_C;
    else if (actLower.indexOf('reject_f') !== -1 || (tblLower.indexOf('oee') !== -1 && tblLower.indexOf('zonef') !== -1)) targetSheetName = SHEET_DL_REJECT_F;
    else if (actLower.indexOf('downtime_c') !== -1 || (tblLower.indexOf('downtime') !== -1 && tblLower.indexOf('zonec') !== -1)) targetSheetName = SHEET_DL_DOWNTIME_C;
    else if (actLower.indexOf('downtime_f') !== -1 || (tblLower.indexOf('downtime') !== -1 && tblLower.indexOf('zonef') !== -1)) targetSheetName = SHEET_DL_DOWNTIME_F;

    var sheet = ss.getSheetByName(targetSheetName) || ss.getSheetByName(tableName);

    if (!sheet) {
      sheet = ss.insertSheet(tableName);
      var headers = ['original_id', 'last_updated', 'user_nama'];
      for (var key in data) {
        if (headers.indexOf(key) === -1) headers.push(key);
      }
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f5f9');
    }

    var originalId = data.original_id;
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var headerRow = values[0] || [];

    // Cari baris jika sudah ada sebelumnya (cek di kolom A atau kolom CV/100)
    var rowIndex = -1;
    if (originalId) {
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]) === String(originalId) || (values[i][99] && String(values[i][99]) === String(originalId))) {
          rowIndex = i + 1;
          break;
        }
      }
    }
    
    if (action.indexOf('delete_') === 0) {
      if (rowIndex !== -1) {
        sheet.deleteRow(rowIndex);
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Row deleted from GAS' }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ status: 'ignored', message: 'Row ID not found to delete' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    for (var key in data) {
      if (headerRow.indexOf(key) === -1) {
        headerRow.push(key);
        sheet.getRange(1, headerRow.length).setValue(key).setFontWeight('bold').setBackground('#f1f5f9');
      }
    }
    if (headerRow.indexOf('last_updated') === -1) {
      headerRow.push('last_updated');
      sheet.getRange(1, headerRow.length).setValue('last_updated').setFontWeight('bold').setBackground('#f1f5f9');
    }
    if (headerRow.indexOf('user_nama') === -1) {
      headerRow.push('user_nama');
      sheet.getRange(1, headerRow.length).setValue('user_nama').setFontWeight('bold').setBackground('#f1f5f9');
    }

    var rowToInsert = [];
    for (var j = 0; j < headerRow.length; j++) {
      var colName = headerRow[j];
      if (colName === 'last_updated') {
        rowToInsert.push(new Date().toLocaleString());
      } else if (colName === 'user_nama') {
        rowToInsert.push(user.nama || 'System');
      } else {
        rowToInsert.push(data[colName] !== undefined && data[colName] !== null ? data[colName] : '');
      }
    }

    // 3. Letakkan data di baris paling akhir dari data terakhir (tanpa lompat akibat format kosong)
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 1, 1, rowToInsert.length).setValues([rowToInsert]);
    } else {
      var targetRow = getRealLastDataRow(sheet, 2);
      sheet.getRange(targetRow, 1, 1, rowToInsert.length).setValues([rowToInsert]);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'GAS backup synced to line ' + userLine }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
