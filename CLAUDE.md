# Claude Code 開発引き継ぎ

このリポジトリは、公開中の「SpaceBGM2｜音の冒険」の編集用ソースです。
主人公は **ゆっぴ**、仲間は猫の **トム**。レトロRPG風のピクセルアニメーションと、音楽に合わせた放置探索のゲームです。

## すぐに開発する

Node.js 22以降を推奨。外部npm依存はありません。

```sh
node build.mjs
node --test tests/*.test.mjs
node scripts/preview.mjs 4320
```

プレビュー: http://127.0.0.1:4320/
別のポートを使う場合は最後の引数を変更してください。
プレビューはメモリー内のサンプルデータで、全地域・全装備を解放した休憩状態から始まります。再起動すると初期化されます。公開データには接続しません。
変更後は再ビルドしてプレビューを再起動し、ブラウザーを再読み込みしてください。
`npm test` は先にビルドが必要です。

## 編集するファイル

| ファイル | 役割 |
|---|---|
| web/page.html | 冒険・育成・装備の3画面と共通音楽操作 |
| web/app.css | レスポンシブUI、iPhoneのsafe area |
| web/app.js | 表示更新、保存API、ユーザー操作 |
| web/navigation.js | タブ・左右スワイプ・キーボード操作 |
| web/equipment.js | 装備一覧、比較、おすすめ一括装備 |
| scripts/pixel-characters.mjs | ゆっぴ・トム・敵などのオリジナルドット絵 |
| web/characters.js / web/characters.css | SVG表示と歩行・戦闘・休憩アニメーション |
| web/music.js | 単一HTML Audio、Media Session、背景再生 |
| scripts/music-assets.mjs | 地域・場面ごとのWAV生成 |
| server/game.mjs | 進行、装備、報酬、旧セーブ移行 |
| server/worker.mjs | HTTP・保存API、R2のETag競合制御 |
| server/media.mjs | 音声Range/HEADレスポンス |
| build.mjs | HTML・画像・音声・APIをWorkerへまとめる |

`worker/index.js` と `dist/` は生成物です。ソースを編集して再ビルドしてください。`worker/index.js` は現在Git管理されています。

## 守るべき既存の動作

- 主人公名は「ゆっぴ」。過去の保存ログに残る旧名は履歴として保持します。
- 保存キー `spacebgm2/owner-game-v1.json` を維持。v1保存はv2に移行し、レベル・通貨・踏破・休憩状態を保持します。
- 公開版は所有者専用で保存先は1つ。一般公開・複数プレイヤー対応の前に認証と保存先分離が必要です。
- 音楽は単一のHTML Audioで再生。バックグラウンド中にJSタイマーで音を生成する方式へ戻さないでください。
- ユーザーから2026-10-01にiPhone実機テスト通過の報告あり。UI再整理後はブラウザー確認済み。着信やOS強制終了後の再生継続は保証しません。
- スワイプは縦スクロール、画面端ジェスチャー、ボタンやスライダーの操作と干渉させません。
- 装備ドロップは決定的な計算で、再試行・一括オフライン計算で報酬が変わらないようにしています。
- テストは現在22件。ゲーム・保存・音声Range・スワイプ・UI参照の整合性を確認します。

## 公開先

- URL: https://spacebgm2-adventure.spacefamily.chatgpt.site/
- Sites project: `appgprj_6abca63c65488191831f1487689d4797`
- 設定: `.openai/hosting.json`、R2 binding: `BUCKET`
- 直近公開のソース: `b45d461cb6cf32939a188caac0bab33aad3885e6`
- Sitesソースのリモートは `git.chatgpt-team.site`。GitHubはソース共有用で、GitHubへpushするだけでは公開されません。

公開はSites連携が使える環境で行います。既存プロジェクトを再利用し、新しいSiteを作成しないでください。
1. ビルド・テストし、ソースをコミット。
2. Sitesの一時Git認証を使い、そのコミットを既存Sitesリモートのmainへpush。
3. 同じコミットから作った成果物を梱包。

```sh
tar -czf site.tar.gz .openai/hosting.json dist/server/index.js
```

4. Sitesでそのコミットとアーカイブを保存・非公開デプロイし、成功状態を確認。

Sitesのトークンは短期認証です。URL、ファイル、コミット、ログに残さないでください。連携がない場合はローカル開発とGitHubへの保存まで進め、公開はSites連携のあるCodex等へ引き継いでください。

## spefami.com

Sitesへの独自ドメイン登録のみ完了。CloudflareへのログインとDNS設定は未完了です。現在の公開先が切り替わったとは扱わないでください。
Custom domain ID: `appgdom_6abd46f3e1788191b4b1dabc00a3cf10`
設定値はSitesから最新を読み取り、既存DNSの用途を確認してから変更します。

## 別プロジェクトに注意

このPCの `SpaceBGM2-work` は `yousayrock/Space-BGM` の別アプリ「月音の庭」です。本リポジトリとは別なので、そちらのファイルやリモートを上書きしないでください。
