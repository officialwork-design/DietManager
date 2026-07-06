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
    picture: document.getElementById("picture"),
    displayName: document.getElementById("displayName"),
    userId: document.getElementById("userId"),
    gasResponse: document.getElementById("gasResponse"),
    debug: document.getElementById("debug")
  };

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

  async function start() {
    try {
      requireConfig();

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
