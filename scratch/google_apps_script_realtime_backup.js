function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || '';
    var data = payload.data || {};
    var user = payload.user || {};
    var tableName = payload.tableName || 'OEE_Backup';

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tableName);

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

    var rowIndex = -1;
    if (originalId) {
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]) === String(originalId)) {
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

    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 1, 1, rowToInsert.length).setValues([rowToInsert]);
    } else {
      sheet.appendRow(rowToInsert);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'GAS backup synced' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
