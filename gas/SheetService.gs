function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getOrCreateSheet_(sheetName, headers) {
  var spreadsheet = getSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  ensureHeaders_(sheet, headers);
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  var lastColumn = sheet.getLastColumn();
  var current = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String)
    : [];

  if (current.join('') === '') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  var missing = headers.filter(function (header) {
    return current.indexOf(header) === -1;
  });

  if (missing.length > 0) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }

  sheet.setFrozenRows(1);
}

function getHeaderColumnMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};

  headers.forEach(function (header, index) {
    map[String(header)] = index + 1;
  });

  return map;
}

function findRowByColumnValue_(sheet, column, value) {
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return -1;
  }

  var values = sheet.getRange(2, column, lastRow - 1, 1).getValues();

  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(value)) {
      return i + 2;
    }
  }

  return -1;
}
