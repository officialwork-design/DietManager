function dietLogType_(type) {
  var types = {
    weight: {
      sheetName: CONFIG.WEIGHT_SHEET_NAME,
      headers: CONFIG.WEIGHT_HEADERS,
      prefix: 'wt',
      fields: ['date', 'weight', 'memo'],
      required: ['weight']
    },
    meal: {
      sheetName: CONFIG.MEAL_SHEET_NAME,
      headers: CONFIG.MEAL_HEADERS,
      prefix: 'ml',
      fields: ['date', 'mealType', 'foodName', 'calorie', 'memo'],
      required: ['foodName']
    },
    custom: {
      sheetName: CONFIG.CUSTOM_SHEET_NAME,
      headers: CONFIG.CUSTOM_HEADERS,
      prefix: 'cs',
      fields: ['date', 'itemName', 'itemValue', 'memo'],
      required: ['itemName']
    }
  };

  return types[type];
}

function requireUserId_(payload) {
  if (!payload || !payload.userId) {
    throw new Error('LINE userId is required.');
  }
}

function requireFields_(payload, fields) {
  fields.forEach(function (field) {
    if (payload[field] == null || normalizeString_(payload[field]) === '') {
      throw new Error(field + ' is required.');
    }
  });
}

function saveWeight_(payload) {
  return appendDietLog_('weight', payload);
}

function saveMeal_(payload) {
  return appendDietLog_('meal', payload);
}

function saveCustomLog_(payload) {
  return appendDietLog_('custom', payload);
}

function updateWeight_(payload) {
  return updateDietLog_('weight', payload);
}

function updateMeal_(payload) {
  return updateDietLog_('meal', payload);
}

function updateCustomLog_(payload) {
  return updateDietLog_('custom', payload);
}

function appendDietLog_(type, payload) {
  var def = dietLogType_(type);
  requireUserId_(payload);
  requireFields_(payload, def.required);

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var sheet = getOrCreateSheet_(def.sheetName, def.headers);
    var columns = getHeaderColumnMap_(sheet);
    var now = new Date().toISOString();
    var values = {
      id: generateId_(def.prefix),
      userId: normalizeString_(payload.userId),
      createdAt: now,
      updatedAt: now
    };

    def.fields.forEach(function (field) {
      values[field] = payload[field] == null ? '' : normalizeString_(payload[field]);
    });

    if (!values.date) {
      values.date = now.slice(0, 10);
    }

    writeRowValues_(sheet, sheet.getLastRow() + 1, columns, values);

    return { mode: 'created', id: values.id };
  } finally {
    lock.releaseLock();
  }
}

function updateDietLog_(type, payload) {
  var def = dietLogType_(type);
  requireUserId_(payload);

  if (!payload.id) {
    throw new Error('id is required.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var sheet = getOrCreateSheet_(def.sheetName, def.headers);
    var columns = getHeaderColumnMap_(sheet);
    var row = findRowByColumnValue_(sheet, columns.id, payload.id);

    if (row === -1) {
      throw new Error('Record not found: ' + payload.id);
    }

    var owner = String(sheet.getRange(row, columns.userId).getValue());

    if (owner !== normalizeString_(payload.userId)) {
      throw new Error('この記録は編集できません。');
    }

    var values = { updatedAt: new Date().toISOString() };

    def.fields.forEach(function (field) {
      if (payload[field] != null) {
        values[field] = normalizeString_(payload[field]);
      }
    });

    writeRowValues_(sheet, row, columns, values);

    return { mode: 'updated', id: payload.id };
  } finally {
    lock.releaseLock();
  }
}

function saveGoal_(payload) {
  requireUserId_(payload);

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var sheet = getOrCreateSheet_(CONFIG.GOAL_SHEET_NAME, CONFIG.GOAL_HEADERS);
    var columns = getHeaderColumnMap_(sheet);
    var now = new Date().toISOString();
    var row = findRowByColumnValue_(sheet, columns.userId, payload.userId);
    var mode = row === -1 ? 'created' : 'updated';

    var values = {
      userId: normalizeString_(payload.userId),
      targetWeight: payload.targetWeight == null ? '' : normalizeString_(payload.targetWeight),
      targetCalorie: payload.targetCalorie == null ? '' : normalizeString_(payload.targetCalorie),
      goalType: payload.goalType == null ? '' : normalizeString_(payload.goalType),
      memo: payload.memo == null ? '' : normalizeString_(payload.memo),
      updatedAt: now
    };

    if (mode === 'created') {
      values.createdAt = now;
      row = sheet.getLastRow() + 1;
    }

    writeRowValues_(sheet, row, columns, values);

    return { mode: mode };
  } finally {
    lock.releaseLock();
  }
}

function updateGoal_(payload) {
  return saveGoal_(payload);
}

function getDashboardData_(userId) {
  if (!userId) {
    throw new Error('LINE userId is required.');
  }

  var uid = normalizeString_(userId);
  var goalSheet = getOrCreateSheet_(CONFIG.GOAL_SHEET_NAME, CONFIG.GOAL_HEADERS);
  var goal = getRowsAsObjects_(goalSheet).filter(function (record) {
    return String(record.userId) === uid;
  })[0] || null;

  return {
    goal: goal,
    weights: collectDietLogs_('weight', uid),
    meals: collectDietLogs_('meal', uid),
    customLogs: collectDietLogs_('custom', uid)
  };
}

function collectDietLogs_(type, uid) {
  var def = dietLogType_(type);
  var sheet = getOrCreateSheet_(def.sheetName, def.headers);

  return getRowsAsObjects_(sheet)
    .filter(function (record) {
      return String(record.userId) === uid;
    })
    .sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date)) ||
        String(b.createdAt).localeCompare(String(a.createdAt));
    })
    .slice(0, 50);
}
