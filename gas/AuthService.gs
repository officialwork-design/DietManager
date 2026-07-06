function validateProfilePayload_(payload) {
  if (!payload) {
    throw new Error('Request payload is empty.');
  }

  if (!payload.userId) {
    throw new Error('LINE userId is required.');
  }

  return {
    userId: normalizeString_(payload.userId),
    displayName: normalizeString_(payload.displayName || 'LINE User'),
    pictureUrl: normalizeString_(payload.pictureUrl || ''),
    statusMessage: normalizeString_(payload.statusMessage || ''),
    language: normalizeString_(payload.language || '')
  };
}

function normalizeString_(value) {
  return String(value).trim();
}

function upsertLiffUser(profile) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var sheet = getOrCreateSheet_(CONFIG.USER_SHEET_NAME, CONFIG.USER_HEADERS);
    var columns = getHeaderColumnMap_(sheet);
    var now = new Date().toISOString();
    var row = findRowByColumnValue_(sheet, columns.userId, profile.userId);
    var mode = row === -1 ? 'created' : 'updated';

    var values = {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
      language: profile.language,
      lastLoginAt: now,
      updatedAt: now
    };

    if (mode === 'created') {
      values.createdAt = now;
      row = sheet.getLastRow() + 1;
    }

    Object.keys(values).forEach(function (key) {
      if (columns[key]) {
        sheet.getRange(row, columns[key]).setValue(values[key]);
      }
    });

    return {
      mode: mode,
      row: row,
      userId: profile.userId
    };
  } finally {
    lock.releaseLock();
  }
}
