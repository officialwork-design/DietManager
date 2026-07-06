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
    var action = payload.action || 'saveUser';

    if (action === 'saveUser') {
      var profile = validateProfilePayload_(payload);
      var result = upsertLiffUser(profile);

      return createJsonOutput_({
        ok: true,
        message: 'User saved',
        mode: result.mode,
        userId: result.userId
      });
    }

    if (action === 'getDashboardData') {
      return createJsonOutput_({
        ok: true,
        message: 'OK',
        data: getDashboardData_(payload.userId)
      });
    }

    var handlers = {
      saveWeight: saveWeight_,
      saveMeal: saveMeal_,
      saveGoal: saveGoal_,
      saveCustomLog: saveCustomLog_,
      updateWeight: updateWeight_,
      updateMeal: updateMeal_,
      updateGoal: updateGoal_,
      updateCustomLog: updateCustomLog_
    };

    var handler = handlers[action];

    if (!handler) {
      throw new Error('Unknown action: ' + action);
    }

    var saved = handler(payload);

    return createJsonOutput_(Object.assign({ ok: true, message: 'Saved' }, saved));
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
