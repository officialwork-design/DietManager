# DietManager

LINE LIFF上で体重・食事・目標カロリー・自由項目を手入力して記録できるアプリです。GitHub Pagesで開いたLIFFアプリからGoogle Apps Script(GAS)経由でGoogleスプレッドシートへ保存します。

- 第1段階(完了): LIFFログインしたLINEユーザーを `liff_users` シートに **1ユーザー1行** で保存(再ログイン時は更新、重複登録なし)
- 第2段階(完了): 体重・食事・目標カロリー・自由項目の手入力、保存済みデータの一覧表示、編集・更新

## 主な機能

- 体重記録(履歴型: 保存するたびに行が増える)
- 食事記録(履歴型、食事区分・カロリー・メモ付き)
- 目標体重・目標カロリー設定(ユーザーごとに1行でupsert)
- 自由項目記録(項目名+値を自由に追加できる履歴型)
- 保存済みデータの一覧表示(ログインユーザー本人の記録のみ)
- 一覧からの編集・更新(`id` 単位で上書き)

自動カロリー計算・画像認識・AI分析・LINE通知は未実装(対象外)です。

## 構成

- Frontend: `index.html`, `config.js`, `style.css`, `app.js`
- GAS: `gas/Code.gs`, `gas/Config.gs`, `gas/SheetService.gs`, `gas/AuthService.gs`, `gas/DietService.gs`

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

### 記録用シート(第2段階)

いずれも存在しなければ初回アクセス時に自動作成され、ヘッダー不足時は自動補完されます。`userId` で必ずユーザーに紐づき、他ユーザーのデータは返しません。

**`weight_logs`(体重・履歴型)**

| 列 | 内容 |
| --- | --- |
| `id` | 記録ID(`wt_` + UUID。編集・更新のキー) |
| `userId` | LINEユーザーID |
| `date` | 記録日(yyyy-MM-dd) |
| `weight` | 体重(kg、手入力) |
| `memo` | メモ |
| `createdAt` / `updatedAt` | 作成・更新日時 |

**`meal_logs`(食事・履歴型)**

| 列 | 内容 |
| --- | --- |
| `id` | 記録ID(`ml_` + UUID) |
| `userId` | LINEユーザーID |
| `date` | 記録日 |
| `mealType` | 食事区分(朝食/昼食/夕食/間食) |
| `foodName` | 食事内容 |
| `calorie` | カロリー(kcal、手入力・任意) |
| `memo` | メモ |
| `createdAt` / `updatedAt` | 作成・更新日時 |

**`user_goals`(目標・1ユーザー1行upsert)**

| 列 | 内容 |
| --- | --- |
| `userId` | LINEユーザーID(主キー) |
| `targetWeight` | 目標体重(kg) |
| `targetCalorie` | 目標カロリー(kcal/日) |
| `goalType` | 目標タイプ(減量/維持/増量) |
| `memo` | メモ |
| `createdAt` / `updatedAt` | 作成・更新日時 |

**`custom_logs`(自由項目・履歴型)**

| 列 | 内容 |
| --- | --- |
| `id` | 記録ID(`cs_` + UUID) |
| `userId` | LINEユーザーID |
| `date` | 記録日 |
| `itemName` | 項目名(例: 腹囲) |
| `itemValue` | 値(例: 81.5cm) |
| `memo` | メモ |
| `createdAt` / `updatedAt` | 作成・更新日時 |

## doPost action一覧

`doPost` はJSONボディの `action` で処理を振り分けます。`action` なしは従来どおりユーザー保存(`saveUser`)です。

| action | 内容 | 主なパラメータ |
| --- | --- | --- |
| (なし) / `saveUser` | LIFFユーザーをupsert | `userId`, `displayName`, ... |
| `saveWeight` | 体重を新規保存 | `userId`, `date`, `weight`, `memo` |
| `updateWeight` | 体重記録を更新 | `userId`, `id`, 更新フィールド |
| `saveMeal` | 食事を新規保存 | `userId`, `date`, `mealType`, `foodName`, `calorie`, `memo` |
| `updateMeal` | 食事記録を更新 | `userId`, `id`, 更新フィールド |
| `saveGoal` / `updateGoal` | 目標をupsert(1ユーザー1行) | `userId`, `targetWeight`, `targetCalorie`, `goalType`, `memo` |
| `saveCustomLog` | 自由項目を新規保存 | `userId`, `date`, `itemName`, `itemValue`, `memo` |
| `updateCustomLog` | 自由項目を更新 | `userId`, `id`, 更新フィールド |
| `getDashboardData` | 本人の目標+記録一覧を取得 | `userId` |

- 保存系のレスポンス: `{ "ok": true, "message": "Saved", "mode": "created|updated", "id": "..." }`
- `getDashboardData` のレスポンス: `{ "ok": true, "data": { "goal": {...}, "weights": [...], "meals": [...], "customLogs": [...] } }`(各一覧は日付降順・最大50件)
- 更新時は `id` の行の `userId` が一致しない場合エラーになります(他ユーザーの記録は編集不可)

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

## デプロイ手順

リポジトリはclasp連携済みです(`.clasp.json` → `rootDir: gas`)。

```bash
# フロント(GitHub Pagesが自動反映)
git push origin main

# GAS(pushだけでは本番Web Appに反映されない)
clasp push -f
clasp deploy -i AKfycby6v4qJsgjf8gSrjQGabbhA56Uk4CU8QX59LZBjphlkCZVmE7TUiobBL4pyw83HgjTk -d "Add diet input screens"
```

`clasp deploy -i 既存デプロイID` で同じWeb App URLのまま新バージョンが発行されるため、`config.js` の変更は不要です。

初回のみApps Script側の設定: 「デプロイ」→ 種類「ウェブアプリ」、Execute as: **Me** / Who has access: **Anyone**。

## 運用手順

1. GitHub Pages URLをLINEアプリ内で開き、LINEログインする
2. 画面に `ユーザー情報保存完了` が表示され、入力画面が開く
3. 目標設定で目標体重・目標カロリーを入力して保存(再保存で上書き)
4. 今日の体重を入力して保存
5. 食事(区分・内容・カロリー)を入力して保存
6. 必要に応じて自由項目(項目名+値)を追加
7. 「保存済みデータ」で自分の記録を確認し、「編集」ボタンでフォームに読み込んで修正・更新する

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

### 保存できない(体重・食事・目標・自由項目)

- フォーム下の赤いメッセージと画面下部のエラー欄を確認する
- 必須項目(体重、食事内容、項目名)が空だと `xxx is required.` エラーになる
- GASのコード変更後に新バージョンをデプロイしたか確認する(下記「GAS Web Appのバージョンが古い」)

### 記録用シートが作成されない

- シートは**最初の保存時**に自動作成される(何も保存していなければ存在しなくて正常)
- GASの実行ユーザーがスプレッドシートの編集権限を持っているか確認する

### 自分のデータが表示されない

- `getDashboardData` は `userId` が一致する行だけ返すため、シート上の `userId` と画面のUser ID表示が一致しているか確認する
- 「再読み込み」ボタンで再取得する
- 一覧は日付降順で最大50件まで表示される

### LIFFログイン後に入力画面が出ない

- 入力画面は「ユーザー情報保存完了」の後に表示される。エラー欄に失敗理由が出ていないか確認する
- GitHub Pagesの反映待ちの可能性があるため、数分待ってからLIFFを開き直す

### GAS Web Appのバージョンが古い

- `clasp push -f` だけでは本番Web Appは更新されない。必ず `clasp deploy -i 既存デプロイID -d "..."` を実行する
- `clasp list-deployments` で本番デプロイIDのバージョンと説明を確認できる
- 症状例: 新しいactionを送ると `Unknown action` や旧形式のレスポンスが返る

### 旧形式のシートが残っている場合

以前の追記型フォーマット(`receivedAt` などの列)で作られた `liff_users` シートが残っている場合、不足列は自動追加されますが列順が混在します。きれいに運用したい場合は `liff_users` シートを削除してから再ログインしてください(自動で再作成されます)。
