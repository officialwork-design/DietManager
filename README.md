# DietManager

GitHub Pagesで開いたLIFFアプリからLINEプロフィールを取得し、Google Apps Script(GAS)経由でGoogleスプレッドシートへ保存する最小構成です。

現段階の目的はユーザー基盤の安定化です。LIFFログインしたLINEユーザーを `liff_users` シートに **1ユーザー1行** で保存し、再ログイン時は同じ行を更新します(重複登録なし)。

## 構成

- Frontend: `index.html`, `config.js`, `style.css`, `app.js`
- GAS: `gas/Code.gs`, `gas/Config.gs`, `gas/SheetService.gs`, `gas/AuthService.gs`

## 環境値

| 名前 | 値 | 使用場所 |
| --- | --- | --- |
| `LIFF_ID` | `2010567674-H2iadpu4` | `config.js`(フロントのLIFF初期化) |
| `GAS_WEB_APP_URL` | `https://script.google.com/macros/s/AKfycby6v4qJsgjf8gSrjQGabbhA56Uk4CU8QX59LZBjphlkCZVmE7TUiobBL4pyw83HgjTk/exec` | `config.js`(プロフィール送信先) |
| `GITHUB_PAGES_URL` | `https://officialwork-design.github.io/DietManager/` | `config.js` / LIFF Endpoint URL |
| `SPREADSHEET_ID` | `1mdnOvfyeTLrxpAvfcjAFDgnOspW9Pfkeon-QblDzO5Y` | `gas/Config.gs`(保存先スプレッドシート) |
| `USER_SHEET_NAME` | `liff_users` | `gas/Config.gs`(保存先シート名) |

## スプレッドシート

- シート名: `liff_users`(存在しない場合は初回アクセス時に自動作成)
- ヘッダー行(不足列は自動補完):

| 列 | 内容 |
| --- | --- |
| `userId` | LINEユーザーID(主キー。重複行は作らない) |
| `displayName` | LINE表示名 |
| `pictureUrl` | プロフィール画像URL |
| `statusMessage` | ステータスメッセージ |
| `language` | LIFFの言語設定 |
| `lastLoginAt` | 最終ログイン日時(ログインごとに更新) |
| `createdAt` | 初回登録日時(以後変更しない) |
| `updatedAt` | 最終更新日時(ログインごとに更新) |

## 動作仕様

1. LIFF初期化 → 未ログインならLINEログインへリダイレクト
2. `liff.getProfile()` でプロフィール取得(`language` は `liff.getLanguage()` から付与)
3. GAS Web Appへ `POST`(JSON)
4. GASが `userId` で既存行を検索
   - 見つからない → 新規行を追加(`createdAt` / `updatedAt` / `lastLoginAt` を設定)
   - 見つかった → 既存行を更新(`createdAt` は維持、`displayName` / `pictureUrl` / `statusMessage` / `language` / `lastLoginAt` / `updatedAt` を更新)
5. 画面に結果を表示

成功時の画面表示:

```text
Hello, {displayName}
LINEログイン成功
GAS Connected
ユーザー情報保存完了
```

失敗時はエラー内容が画面の赤いエラー欄に表示されます。

## GASレスポンス形式

成功時:

```json
{
  "ok": true,
  "message": "User saved",
  "mode": "created",
  "userId": "LINE_USER_ID"
}
```

`mode` は新規登録なら `created`、更新なら `updated` です。

失敗時(例外発生時もJSONで返ります):

```json
{
  "ok": false,
  "message": "Error message"
}
```

`doGet` は接続確認用で `{ "ok": true, "message": "GAS Connected", ... }` を返します。

## 初回セットアップ手順

1. GitHubのRepository settingsからPagesを有効化する
   - Source: Deploy from a branch
   - Branch: `main` / Folder: `/root`
2. LINE DevelopersでLIFFアプリのEndpoint URLをGitHub Pages URLに設定する
3. Google Apps Scriptプロジェクトに `gas/` 配下の4ファイル(`Code.gs`, `Config.gs`, `SheetService.gs`, `AuthService.gs`)を配置する
4. `gas/Config.gs` の `SPREADSHEET_ID` が保存先スプレッドシートと一致していることを確認する
5. GASをWebアプリとしてデプロイする(下記)
6. `config.js` に `LIFF_ID` と `GAS_WEB_APP_URL` を設定する

## GASデプロイ手順

1. Apps Scriptエディタで「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
2. 設定:
   - Execute as: **Me**
   - Who has access: **Anyone**
3. 発行されたWeb App URLを `config.js` の `GAS_WEB_APP_URL` に反映する

**注意:** GASのコードを変更した場合は「デプロイを管理」から既存デプロイの**新しいバージョン**を発行しないと反映されません。

## 運用手順

1. GitHub Pages URLをLINEアプリ内で開く
2. LINEログインする
3. 画面に `ユーザー情報保存完了` が表示される
4. スプレッドシートの `liff_users` に1ユーザー1行で保存される(再ログインで同じ行が更新される)

## トラブルシュート

### `LIFF起動中` / `LIFF初期化中` のまま止まる

- `config.js` の `LIFF_ID` が正しいか確認する
- LINE DevelopersのLIFF Endpoint URLがGitHub Pages URLと完全一致しているか確認する(末尾スラッシュ含む)
- LINEアプリ内ブラウザまたはLIFF対応環境で開いているか確認する

### `GAS Connected` が表示されない

- `config.js` の `GAS_WEB_APP_URL` が最新のデプロイURLか確認する
- ブラウザで `GAS_WEB_APP_URL` を直接開き、`{"ok":true,"message":"GAS Connected",...}` が返るか確認する
- GASのデプロイ設定が「Execute as: Me / Who has access: Anyone」になっているか確認する

### スプレッドシートに保存されない

- 画面のエラー欄とGAS Responseの内容を確認する
- `gas/Config.gs` の `SPREADSHEET_ID` が正しいか確認する
- GASの実行ユーザーがスプレッドシートの編集権限を持っているか確認する
- Apps Scriptの「実行数」ログで `doPost` のエラーを確認する

### CORSまたはWeb App権限の問題

- フロントは `Content-Type: text/plain` で送信しているため、通常CORSプリフライトは発生しない
- 「Who has access」が `Anyone` 以外だとリダイレクト先でHTMLが返り、JSONパースに失敗する
- コード変更後に新しいバージョンをデプロイし直したか確認する

### LIFF Endpoint URLの設定ミス

- Endpoint URLは `https://officialwork-design.github.io/DietManager/` を設定する
- URLが違うとログイン後のリダイレクトが失敗し、`400 Bad Request` などになる

### 旧形式のシートが残っている場合

以前の追記型フォーマット(`receivedAt` などの列)で作られた `liff_users` シートが残っている場合、不足列は自動追加されますが列順が混在します。きれいに運用したい場合は `liff_users` シートを削除してから再ログインしてください(自動で再作成されます)。
