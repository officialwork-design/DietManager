# DietManager

GitHub Pagesで開いたLIFFアプリからLINEプロフィールを取得し、Google Apps Script経由でGoogleスプレッドシートへ送信する最小版です。

## 構成

- Frontend: `index.html`, `config.js`, `style.css`, `app.js`
- GAS: `gas/Code.gs`, `gas/Config.gs`, `gas/SheetService.gs`, `gas/AuthService.gs`
- GitHub Pages: https://officialwork-design.github.io/DietManager/
- LIFF ID: `2010567674-H2iadpu4`
- Spreadsheet ID: `1mdnOvfyeTLrxpAvfcjAFDgnOspW9Pfkeon-QblDzO5Y`

## 表示内容

ログインとGAS送信に成功すると、画面に次のような内容を表示します。

```text
Hello, Andre
LINEログイン成功
GAS Connected
```

表示名は実際のLINEプロフィール名に置き換わります。

## フロント設定

`config.js` にLIFF IDとGAS Web App URLを設定しています。

```js
window.DIET_MANAGER_CONFIG = {
  APP_NAME: "DietManager",
  LIFF_ID: "2010567674-H2iadpu4",
  GAS_WEB_APP_URL: "https://script.google.com/macros/s/AKfycby6v4qJsgjf8gSrjQGabbhA56Uk4CU8QX59LZBjphlkCZVmE7TUiobBL4pyw83HgjTk/exec",
  GITHUB_PAGES_URL: "https://officialwork-design.github.io/DietManager/"
};
```

## GAS設定

Apps Scriptに `gas/` 配下の4ファイルを配置して、Webアプリとしてデプロイします。

推奨設定:

- Execute as: Me
- Who has access: Anyone

`doPost` はLIFFアプリから送られたプロフィールを受け取り、`liff_users` シートへ追記します。`doGet` は接続確認用に `GAS Connected` を返します。

## GitHub Pages

GitHubのRepository settingsからPagesを有効化します。

- Source: Deploy from a branch
- Branch: `main`
- Folder: `/root`

公開URLをLINE DevelopersのLIFF Endpoint URLにも設定してください。
