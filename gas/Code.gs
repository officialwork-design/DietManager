function doGet() {
  return createJsonOutput_({
    ok: true,
    message: 'GAS Connected',
    appName: CONFIG.APP_NAME,
    serverTimestamp: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    var payload = parseRequestBody_(e);
    var profile = validateProfilePayload_(payload);
    var result = upsertLiffUser(profile);

    return createJsonOutput_({
      ok: true,
      message: 'User saved',
      mode: result.mode,
      userId: result.userId
    });
  } catch (error) {
    return createJsonOutput_({
      ok: false,
      message: error.message || String(error)
    });
  }
}

function parseRequestBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  var body = e.postData.contents;

  if (body.charAt(0) === '{') {
    return JSON.parse(body);
  }

  if (e.parameter && Object.keys(e.parameter).length > 0) {
    return e.parameter;
  }

  return JSON.parse(body);
}

function createJsonOutput_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
