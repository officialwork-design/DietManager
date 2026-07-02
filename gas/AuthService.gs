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
    sourceUrl: normalizeString_(payload.sourceUrl || ''),
    clientTimestamp: normalizeString_(payload.clientTimestamp || '')
  };
}

function normalizeString_(value) {
  return String(value).trim();
}

function buildSuccessResponse_(profile, sheetResult) {
  return {
    ok: true,
    message: 'GAS Connected',
    appName: CONFIG.APP_NAME,
    displayName: profile.displayName,
    userId: profile.userId,
    sheet: sheetResult,
    serverTimestamp: new Date().toISOString()
  };
}

function buildErrorResponse_(error) {
  return {
    ok: false,
    message: error.message || String(error),
    serverTimestamp: new Date().toISOString()
  };
}
