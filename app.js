(function () {
  "use strict";

  var config = window.DIET_MANAGER_CONFIG || {};
  var elements = {
    status: document.getElementById("status"),
    helloText: document.getElementById("helloText"),
    lineStatus: document.getElementById("lineStatus"),
    gasStatus: document.getElementById("gasStatus"),
    saveStatus: document.getElementById("saveStatus"),
    errorBox: document.getElementById("errorBox"),
    errorMessage: document.getElementById("errorMessage"),
    dietPanel: document.getElementById("dietPanel"),
    picture: document.getElementById("picture"),
    displayName: document.getElementById("displayName"),
    userId: document.getElementById("userId"),
    gasResponse: document.getElementById("gasResponse"),
    debug: document.getElementById("debug")
  };

  var state = {
    userId: null,
    editing: { weight: null, meal: null, custom: null }
  };

  var LOG_FORMS = {
    weight: {
      formId: "weightForm",
      messageId: "weightMessage",
      submitId: "weightSubmit",
      cancelId: "weightCancel",
      saveAction: "saveWeight",
      updateAction: "updateWeight",
      saveLabel: "体重を保存",
      fields: { date: "weightDate", weight: "weightValue", memo: "weightMemo" }
    },
    meal: {
      formId: "mealForm",
      messageId: "mealMessage",
      submitId: "mealSubmit",
      cancelId: "mealCancel",
      saveAction: "saveMeal",
      updateAction: "updateMeal",
      saveLabel: "食事を保存",
      fields: {
        date: "mealDate",
        mealType: "mealType",
        foodName: "mealFoodName",
        calorie: "mealCalorie",
        memo: "mealMemo"
      }
    },
    custom: {
      formId: "customForm",
      messageId: "customMessage",
      submitId: "customSubmit",
      cancelId: "customCancel",
      saveAction: "saveCustomLog",
      updateAction: "updateCustomLog",
      saveLabel: "項目を保存",
      fields: {
        date: "customDate",
        itemName: "customItemName",
        itemValue: "customItemValue",
        memo: "customMemo"
      }
    }
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className = "status " + (type || "loading");
  }

  function setDebug(value) {
    elements.debug.textContent = JSON.stringify(value, null, 2);
  }

  function markDone(element, message) {
    element.textContent = message;
    element.classList.remove("pending");
  }

  function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorBox.classList.remove("hidden");
  }

  function setFormMessage(id, message, type) {
    var el = $(id);

    if (!message) {
      el.textContent = "";
      el.className = "form-message hidden";
      return;
    }

    el.textContent = message;
    el.className = "form-message " + (type || "loading");
  }

  function pad2(value) {
    return (value < 10 ? "0" : "") + value;
  }

  function todayString() {
    var now = new Date();
    return now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
  }

  function initDateInputs() {
    ["weightDate", "mealDate", "customDate"].forEach(function (id) {
      if (!$(id).value) {
        $(id).value = todayString();
      }
    });
  }

  function requireConfig() {
    if (!config.LIFF_ID) {
      throw new Error("LIFF_ID が config.js に設定されていません。");
    }

    if (!config.GAS_WEB_APP_URL) {
      throw new Error("GAS_WEB_APP_URL が config.js に設定されていません。");
    }
  }

  function updateProfile(profile) {
    var displayName = profile.displayName || "LINE User";

    elements.helloText.textContent = "Hello, " + displayName;
    elements.displayName.textContent = displayName;
    elements.userId.textContent = profile.userId || "未取得";
    markDone(elements.lineStatus, "LINEログイン成功");

    if (profile.pictureUrl) {
      elements.picture.src = profile.pictureUrl;
      elements.picture.classList.remove("hidden");
    }
  }

  function buildPayload(profile) {
    return {
      appName: config.APP_NAME || "DietManager",
      userId: profile.userId || "",
      displayName: profile.displayName || "",
      pictureUrl: profile.pictureUrl || "",
      statusMessage: profile.statusMessage || "",
      language: profile.language || "",
      sourceUrl: window.location.href,
      clientTimestamp: new Date().toISOString()
    };
  }

  async function postToGas(action, payload) {
    var body = Object.assign({ action: action, userId: state.userId }, payload || {});
    var response = await fetch(config.GAS_WEB_APP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(body),
      redirect: "follow"
    });

    var responseText = await response.text();
    var responseBody;

    try {
      responseBody = JSON.parse(responseText);
    } catch (error) {
      throw new Error("GASレスポンスを解析できませんでした: " + responseText.slice(0, 120));
    }

    if (!response.ok || responseBody.ok === false) {
      throw new Error(responseBody.message || "GAS への送信に失敗しました。");
    }

    return responseBody;
  }

  async function sendProfileToGas(profile) {
    var payload = buildPayload(profile);
    var response = await fetch(config.GAS_WEB_APP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    var responseText = await response.text();
    var responseBody;

    try {
      responseBody = JSON.parse(responseText);
    } catch (error) {
      responseBody = {
        ok: response.ok,
        raw: responseText
      };
    }

    if (!response.ok || responseBody.ok === false) {
      throw new Error(responseBody.message || "GAS への送信に失敗しました。");
    }

    return responseBody;
  }

  function readLogForm(def) {
    var payload = {};

    Object.keys(def.fields).forEach(function (key) {
      payload[key] = $(def.fields[key]).value.trim();
    });

    return payload;
  }

  function fillLogForm(def, record) {
    Object.keys(def.fields).forEach(function (key) {
      var value = record[key];
      $(def.fields[key]).value = value == null ? "" : String(value);
    });
  }

  function clearEditing(type) {
    var def = LOG_FORMS[type];

    state.editing[type] = null;
    $(def.formId).reset();
    $(def.submitId).textContent = def.saveLabel;
    $(def.cancelId).classList.add("hidden");
    setFormMessage(def.messageId, "");
    initDateInputs();
  }

  function startEditing(type, record) {
    var def = LOG_FORMS[type];

    state.editing[type] = record.id;
    fillLogForm(def, record);
    $(def.submitId).textContent = "更新する";
    $(def.cancelId).classList.remove("hidden");
    setFormMessage(def.messageId, "編集中: " + (record.date || "") + " の記録を上書きします", "editing");
    $(def.formId).scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindLogForm(type) {
    var def = LOG_FORMS[type];

    $(def.formId).addEventListener("submit", async function (event) {
      event.preventDefault();

      var editingId = state.editing[type];
      var payload = readLogForm(def);

      if (editingId) {
        payload.id = editingId;
      }

      try {
        setFormMessage(def.messageId, "保存中...", "loading");
        await postToGas(editingId ? def.updateAction : def.saveAction, payload);
        clearEditing(type);
        setFormMessage(def.messageId, editingId ? "更新しました" : "保存しました", "success");
        await loadDashboard();
      } catch (error) {
        setFormMessage(def.messageId, error.message, "error");
        showError(error.message);
      }
    });

    $(def.cancelId).addEventListener("click", function () {
      clearEditing(type);
    });
  }

  function bindGoalForm() {
    $("goalForm").addEventListener("submit", async function (event) {
      event.preventDefault();

      var payload = {
        targetWeight: $("goalTargetWeight").value.trim(),
        targetCalorie: $("goalTargetCalorie").value.trim(),
        goalType: $("goalGoalType").value,
        memo: $("goalMemo").value.trim()
      };

      if (!payload.targetWeight && !payload.targetCalorie) {
        setFormMessage("goalMessage", "目標体重か目標カロリーのどちらかを入力してください。", "error");
        return;
      }

      try {
        setFormMessage("goalMessage", "保存中...", "loading");
        await postToGas("saveGoal", payload);
        setFormMessage("goalMessage", "目標を保存しました", "success");
        await loadDashboard();
      } catch (error) {
        setFormMessage("goalMessage", error.message, "error");
        showError(error.message);
      }
    });
  }

  function bindForms() {
    bindGoalForm();
    Object.keys(LOG_FORMS).forEach(bindLogForm);
    $("reloadDashboard").addEventListener("click", function () {
      loadDashboard();
    });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);

    if (className) {
      node.className = className;
    }

    if (text != null) {
      node.textContent = text;
    }

    return node;
  }

  function logTitle(type, record) {
    if (type === "weight") {
      return record.date + "　" + record.weight + " kg";
    }

    if (type === "meal") {
      var title = record.date + "　" + (record.mealType || "") + "　" + record.foodName;

      if (record.calorie !== "" && record.calorie != null) {
        title += "　" + record.calorie + " kcal";
      }

      return title;
    }

    var custom = record.date + "　" + record.itemName;

    if (record.itemValue !== "" && record.itemValue != null) {
      custom += ": " + record.itemValue;
    }

    return custom;
  }

  function renderLogList(containerId, type, records) {
    var container = $(containerId);
    container.textContent = "";

    if (!records || records.length === 0) {
      container.appendChild(el("p", "empty", "記録がありません"));
      return;
    }

    records.forEach(function (record) {
      var card = el("article", "log-card");
      var main = el("div", "log-main");

      main.appendChild(el("p", "log-title", logTitle(type, record)));

      if (record.memo) {
        main.appendChild(el("p", "log-memo", record.memo));
      }

      card.appendChild(main);

      var editButton = el("button", "btn ghost small", "編集");
      editButton.type = "button";
      editButton.addEventListener("click", function () {
        startEditing(type, record);
      });
      card.appendChild(editButton);

      container.appendChild(card);
    });
  }

  function renderGoal(goal) {
    var summary = $("goalSummary");

    if (!goal) {
      summary.textContent = "目標は未設定です";
      return;
    }

    var parts = [];

    if (goal.targetWeight !== "" && goal.targetWeight != null) {
      parts.push("目標体重: " + goal.targetWeight + " kg");
    }

    if (goal.targetCalorie !== "" && goal.targetCalorie != null) {
      parts.push("目標カロリー: " + goal.targetCalorie + " kcal/日");
    }

    if (goal.goalType) {
      parts.push(goal.goalType);
    }

    summary.textContent = parts.length > 0 ? parts.join(" / ") : "目標は未設定です";

    $("goalTargetWeight").value = goal.targetWeight == null ? "" : String(goal.targetWeight);
    $("goalTargetCalorie").value = goal.targetCalorie == null ? "" : String(goal.targetCalorie);

    if (goal.goalType) {
      $("goalGoalType").value = goal.goalType;
    }

    $("goalMemo").value = goal.memo == null ? "" : String(goal.memo);
  }

  async function loadDashboard() {
    try {
      setFormMessage("dashboardStatus", "読み込み中...", "loading");
      var result = await postToGas("getDashboardData", {});
      var data = result.data || {};

      renderGoal(data.goal);
      renderLogList("weightList", "weight", data.weights);
      renderLogList("mealList", "meal", data.meals);
      renderLogList("customList", "custom", data.customLogs);
      setFormMessage("dashboardStatus", "");
    } catch (error) {
      setFormMessage("dashboardStatus", "読み込みに失敗しました: " + error.message, "error");
      showError(error.message);
    }
  }

  async function start() {
    try {
      requireConfig();
      bindForms();
      initDateInputs();

      if (!window.liff) {
        throw new Error("LIFF SDK を読み込めませんでした。");
      }

      setStatus("LIFF初期化中...", "loading");
      await liff.init({ liffId: config.LIFF_ID });

      if (!liff.isLoggedIn()) {
        setStatus("LINEログインへ移動します...", "loading");
        liff.login({
          redirectUri: config.GITHUB_PAGES_URL || window.location.href
        });
        return;
      }

      setStatus("LINEプロフィール取得中...", "loading");
      var profile = await liff.getProfile();
      profile.language = liff.getLanguage() || "";
      updateProfile(profile);

      setStatus("GASへ送信中...", "loading");
      elements.saveStatus.textContent = "ユーザー情報保存中...";
      var gasResult = await sendProfileToGas(profile);

      markDone(elements.gasStatus, "GAS Connected");
      markDone(elements.saveStatus, "ユーザー情報保存完了");
      elements.gasResponse.textContent = JSON.stringify(gasResult, null, 2);
      setStatus("ユーザー情報保存完了", "success");
      setDebug({
        liffId: config.LIFF_ID,
        os: liff.getOS(),
        language: profile.language,
        saveMode: gasResult.mode,
        sourceUrl: window.location.href
      });

      state.userId = profile.userId;
      elements.dietPanel.classList.remove("hidden");
      await loadDashboard();
    } catch (error) {
      elements.gasStatus.textContent = "GAS接続失敗";
      elements.saveStatus.textContent = "ユーザー情報保存失敗";
      elements.gasResponse.textContent = "未取得";
      setStatus(error.message, "error");
      showError(error.message);
      setDebug({
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  }

  start();
}());
