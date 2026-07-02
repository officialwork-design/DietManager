function appendLoginEvent_(profile, rawPayload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var sheet = getLogSheet_();
    var receivedAt = new Date();

    sheet.appendRow([
      receivedAt,
      profile.userId,
      profile.displayName,
      profile.pictureUrl,
      profile.statusMessage,
      profile.sourceUrl,
      profile.clientTimestamp,
      JSON.stringify(rawPayload)
    ]);

    return {
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      sheetName: CONFIG.SHEET_NAME,
      row: sheet.getLastRow()
    };
  } finally {
    lock.releaseLock();
  }
}

function getLogSheet_() {
  var spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
  }

  ensureHeaderRow_(sheet);
  return sheet;
}

function ensureHeaderRow_(sheet) {
  var headers = [
    'receivedAt',
    'userId',
    'displayName',
    'pictureUrl',
    'statusMessage',
    'sourceUrl',
    'clientTimestamp',
    'rawJson'
  ];

  var range = sheet.getRange(1, 1, 1, headers.length);
  var current = range.getValues()[0];

  if (current.join('') !== headers.join('')) {
    range.setValues([headers]);
    sheet.setFrozenRows(1);
  }
}
