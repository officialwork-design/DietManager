var CONFIG = {
  APP_NAME: 'DietManager',
  SPREADSHEET_ID: '1mdnOvfyeTLrxpAvfcjAFDgnOspW9Pfkeon-QblDzO5Y',
  USER_SHEET_NAME: 'liff_users',
  USER_HEADERS: [
    'userId',
    'displayName',
    'pictureUrl',
    'statusMessage',
    'language',
    'lastLoginAt',
    'createdAt',
    'updatedAt'
  ],
  WEIGHT_SHEET_NAME: 'weight_logs',
  WEIGHT_HEADERS: [
    'id',
    'userId',
    'date',
    'weight',
    'memo',
    'createdAt',
    'updatedAt'
  ],
  MEAL_SHEET_NAME: 'meal_logs',
  MEAL_HEADERS: [
    'id',
    'userId',
    'date',
    'mealType',
    'foodName',
    'calorie',
    'memo',
    'createdAt',
    'updatedAt'
  ],
  GOAL_SHEET_NAME: 'user_goals',
  GOAL_HEADERS: [
    'userId',
    'targetWeight',
    'targetCalorie',
    'goalType',
    'memo',
    'createdAt',
    'updatedAt'
  ],
  CUSTOM_SHEET_NAME: 'custom_logs',
  CUSTOM_HEADERS: [
    'id',
    'userId',
    'date',
    'itemName',
    'itemValue',
    'memo',
    'createdAt',
    'updatedAt'
  ],
  GITHUB_PAGES_URL: 'https://officialwork-design.github.io/DietManager/'
};
