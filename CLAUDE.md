# AIへの指示書

[023] 天ノ音の続編「SpaceBGM2 - アドベンチャー」（SpaceBGM aka BGMコンシェルジュ）の作業リポジトリ。種類は「製品アプリ」。号機は023（天ノ音の続き）。

## 共通ルール（SpaceFamilyCompany）

**正本はこのリポジトリ（`SpaceFamilyCompany/Home`の`AGENTS.md`）。**どのエージェントも、共通ルールで迷ったらここを読む。他リポジトリの同名セクションはここからのコピー。変えるときはここを先に直す。

- 秘密情報（APIキー・トークン・パスワード）をコードにもコミットにも書かない。`.env` はコミットしない
- 作業ログやAIとの会話記録をリポジトリに入れない。節目の記録は報告書に書く（Notionには置かない）
- コミットメッセージは英語、1行目は命令形で72文字以内
- 和文と英数字の間にスペースを入れない。句読点は全角
- 日本語の文章（報告書・README・サイト文言・返事・下書き）を書く、直すときは、先に`.claude/skills/ja-writing/SKILL.md`を読み、出す前に「書く前の点検」を通す。名詞だけで止めない、主語と目的語を省かない、「率」のように略さない（正本はSpaceFamilySite。`publish`で写しを更新する）
- READMEは `#` を製品名に1回だけ、`##` をセクション、`####` 以下は使わない
- 号機の報告書は、会社のテンプレート（`SpaceFamilyCompany/SpaceFamilySite`の`templates/gadget-report.html`）のJSONを埋めて作る。頼まれなくても、セッションの節目（本番への公開・マージ、不具合の直し終わり、依頼の切り替わり、セッションの終わり）ごとに必ず出す。未報告の変更を残したままセッションを終えない。節目の決まりと手順は`gadget-report`スキル（正本はSpaceFamilySiteの`.claude/skills/gadget-report/SKILL.md`）
- 報告書は各リポジトリの`reports/`に`YYYY-MM-DD-種類.html`（種類は`progress`・`recovery`・`test`・`migration`など）で保存してコミットする。`reports/`は配信しない
- 報告書を足したら、`reports/README.md`と報告書ライブラリ（全号機の一覧ページ）も作り直す。全リポジトリを並べて取ってきて、`python3 SpaceFamilySite/tools/report_library.py publish`の1コマンド
- 報告書・タスクボードの手順は、このリポジトリの`.claude/skills/gadget-report/SKILL.md`と`.claude/skills/task-board/SKILL.md`にある。Claude CodeもCodexも、報告書やタスクボードを作る前にここを読む（正本はHome。`publish`で各リポジトリの写しを更新する）
- 進行中の複数タスクを追う作業は、会社のタスクボードテンプレート（`SpaceFamilyCompany/SpaceFamilySite`の`templates/task-board.html`）のJSONを埋めて作る。使い方は`.claude/skills/task-board/SKILL.md`
- タスクボードは各リポジトリの`boards/`に`YYYY-MM-DD-種類.html`で保存してコミットする。`boards/`は配信しない。生きているドキュメントなので、更新時は上書きでよい
- 秘密の置き場所：tomサーバーのClaude APIキーは`~/.config/spefami/anthropic-key`（1行、chmod 600）。値は表示せず、チャットにも貼らない。確認は形式チェックだけにする。`/etc/environment`や`~/.bashrc`には書かない。サービスから使うときは`EnvironmentFile=`で同じファイルを指し、コピーを作らない。LINE BotのAPIキーはCloudflare Workerのシークレットで、読み出せない
- tomサーバーの構成：議事録システムは`~/work/space/minutes/`（127.0.0.1:8090、音声は`data/audio/`に保存しgitに入れない）。Tailscaleの`serve`には既存の出口があり触らない。新しい出口を足すときは、内容を見せて確認を取る
- 号機のタグ：報告書の`gadget.num`、題名の`[タグ]`、GitHubの説明文に、同じタグを使う。会社の基盤は`C01`、公式サイトは`S01`、ボットは`B01`、プロジェクトは`P01`・`P02`と続け、プロダクト（号機）は3桁の数字（例：`024`）にする。新しい号機の番号は、`yousayrock`と`SpaceFamilyCompany`の両方のリポジトリ名を見て、空きを確かめてから付ける。ライブラリには、会社・サイト・プロジェクト・ボット・開発（号機）の順に並び、種類のタブで切り替える
- 内部画面の表示：色・書体・余白・最小タップ（44px）の正本は`SpaceFamilySite/public/assets/internal-ui.css`。直すときはこのファイルだけを直し、`python3 tools/sync_ui.py`で報告書・タスクボード・ライブラリへ反映する。各HTMLのトークン部分は手で直さない。新しい画面はこのトークンから作り、色を直書きしない。スマホで使う画面は`mobile-webapp`スキルに従い、1画面に収める。型は`SpaceFamilySite/templates/one-screen.html`
- スキルの正本：共通のスキル（`gadget-report`・`task-board`・`ja-writing`・`mobile-webapp`・`self-improvement`）の正本は、必ず`SpaceFamilyCompany/Home`の`.claude/skills/`に置く。ほかのリポジトリは写しで、`publish`が上書きする。スキルを直す、新しく作るときは、先にHomeに置き、`SpaceFamilySite/tools/report_library.py`の`SHARED_SKILLS`に足してから、`publish`で写す
- 自己改善：セッションを終えるとき、または所長に「自己改善を回して」と言われたときは、`self-improvement`スキルを使う。再利用できる学びはHomeの`learnings/`に追記し、ルールやスキルを変える提案はHomeの`proposals/`に1件ずつ書く。承認は、所長本人だけができる。方法は2つ：チャットで「承認」と明示する、またはダッシュボード（026）の確認画面で、内容を読んだことにチェックして承認する。AIが自分で承認済みにしない。ダッシュボードの承認ボタンも、AIは押さない。作業ログと会話の記録は、リポジトリに入れない（Notionにも置かない。節目の記録は報告書に書く）
- 新しいリポジトリの作り方：名前は英語名（英字・数字・ハイフンのみ。号機番号は入れない）。GitHubの説明文は`[タグ] 日本語名（ローマ字の読み）- 一行説明`（説明は30字以内の目安。例：`[023] 天ノ音（Amenone）- 世界を音楽にするBGMアプリ`）。Topicsは3〜6個、英小文字とハイフンのみ。種別（`web-app`・`line-bot`・`tool`）、技術（`astro`・`python`）、公開先（`cloudflare`・`line`）から選び、号機のタグも小文字で1つ入れる（例：`p01`・`023`・`b01`）。非公開は作成時に決める
- ルートに必ず置くファイル：`README.md`・`CLAUDE.md`・`AGENTS.md`・`.gitignore`。秘密を使うなら`.env.example`（項目名だけ、値は空）、画面があるなら`DESIGN.md`。作業ログとビルド済みファイル（`dist/`など）は置かない
- `.gitignore`に必ず入れるもの：`node_modules/`・`dist/`・`.astro/`、`.env`と`.env.*`（`.env.example`は除く）、OSとエディタのごみ（`.DS_Store`・`Thumbs.db`・`.vscode/`・`.idea/`）。Pythonは`__pycache__/`・`.venv/`・`*.pyc`、Androidは`.gradle/`・`build/`・`local.properties`・`*.keystore`を足す
- LICENSE：非公開のリポジトリには置かない（権利は会社に残る）。公開して使ってほしいものだけMIT。公開しても見せるだけのものは、LICENSEを置かず、READMEに「All rights reserved」と書く。公開にする前に、秘密情報が入っていないか必ず確かめる
- 秘密が漏れたとき：コミットを消すより先に、鍵を作り直す。旧リポジトリの履歴に鍵が残っているときは、移行で履歴を持ち込まず作り直し、鍵そのものも再発行する
- アカウント：当面は、個人アカウント`SpaceFamilyCompany`のまま使う。いずれ組織（Organization）へ移行する予定。移行は新しい組織を作ってリポジトリを移す形になり、個人アカウントを組織に変換するとログインできなくなるので、変換はしない


## このリポジトリ

- 公開リポジトリ。コードにも履歴にも秘密情報や個人情報を入れない。LICENSEは置かず、READMEに「All rights reserved」と書く
- 公開は手動：`node build.mjs` → テスト → `npx wrangler deploy`。`main`にpushしただけでは公開されない
- 別のリポジトリ`SpaceBGM`（[023] 天ノ音、非公開）とは別のアプリ。互いのファイルやリモートを上書きしない

このリポジトリは「SpaceBGM aka BGMコンシェルジュ」の編集用ソースです。24時間かけっぱなしにできる、冒険が鳴らす音楽アプリ。
主人公は **ゆっぴ**、仲間は猫の **トム**。コンセプトと遊び方は README.md（ゲーム画面にはタイトルやルールを出さない）。
世界観と物語（神のもとから堕ち、世界の音を集めて三世代で還る）は docs/story.md、第1章は docs/chapter1.md。物語や仕様を変える時はここを先に直す。

## 大前提（崩さないこと）

- **世界のすべてが同じリズム。** 足音・攻撃・森の生き物・背景オブジェクトの1コマ1コマが音符で、1コマ = 8分音符。
- 音と絵は `web/score.mjs` の同じ楽譜から作る。音は「音の鳴るコマ（SOUND_FRAMES）に入った瞬間」だけ鳴り、鳴らない物は動かない。拍に乗らない自由な動きや、絵のない音を足さない。
- 単調にしない工夫（道のカードごとのスウィング、カード末のフィル＝ラン／ため、ブレイク小節）は楽譜側で、キャラのコマの並びとして作る。
- 冒険中の曲 = イベントカードの山札1束（12枚、`deckFor(cycle)`）。1枚 = 16拍 = `server/game.mjs` の `STEP_MS`（10909ms）。再生位置がそのまま冒険の進行。束は cycle ごとに同じ乱数でシャッフルし、`deckFor`・`cardMs` のサーバーとの一致はテストで確認している。束の残り4枚で次の束の曲を裏で作り、ループの継ぎ目で切り替える（画面を閉じている間は今の束がくり返す）。
- 音は端末内で合成したWAV（Web Worker）を **単一のHTML Audio** でループ再生する。iPhoneのバックグラウンド再生のため、リアルタイム生成やJSタイマーで鳴らす方式にしない。
- 色は Space Family のブランドカラー（ink #232046 / ink-deep #1C1A33 / ink-panel #3B3470 / lilac #EAE6F5 / field #B9B4D3 / pink #F0A9B9 / cyan #A9DDE2）。
- MVP はステージ1（蛍火の森）だけ。EXP・レベル・育成・地域選択は画面に出さない（サーバーには残っている）。トムは画面と音では常に同行。

## すぐに開発する

Node.js 22以降。外部npm依存はありません。

```sh
node build.mjs
node --test tests/*.test.mjs
node scripts/preview.mjs 4320        # http://127.0.0.1:4320/ 。起動時の dist を読むので、再ビルド後は再起動
node scripts/sprite-preview.mjs      # dist/sprite-preview.html
```

## ファイル

| ファイル | 役割 |
|---|---|
| web/score.mjs | 楽譜エンジン（コマ・音符・スクロール・背景オブジェクト配置・合成・WAV）。画面と Worker の両方で同じソースを使う |
| web/page.html / app.css / app.js | 画面は上から 状態帯・舞台・語り帯・音を集める場所（再生前は大きな再生、再生中はレーン＋タップ、試練は2択）・コマンド4つ。舞台（Canvas。320×180 の世界の中央 256×152 を描く。ドット絵は起動時に1度だけ画像化し、変化した時だけ描き直す）・イベントカードの列・操作・再生 |
| scripts/pixel-art.mjs | キャラ・森の生き物・装備の着せ替えパーツ（Codex 制作。32×32、1コマ=8分音符） |
| scripts/creature-motion.mjs | フクロウ・カエル・蛍の鳴く動きと、音の出ない待機（idle）の動き（pixel-art から組み立て） |
| scripts/monsters.mjs | 仮のモンスター（キノコの子・カブトムシ・鬼火。Claude 作、Codex の本番版に差し替え予定） |
| scripts/forest-objects.mjs / forest-scene.mjs | 背景オブジェクト（far/mid/near の視差、景色4種）と空・地面の土台（Codex 制作） |
| server/game.mjs | 進行・装備（空き欄なら拾った装備を自動で着る）・報酬 |
| server/worker.mjs / server/store.mjs | HTTP・保存API。`/bgm` 配下でも動く。保存は Durable Object（`GameStore`）、テスト・プレビューは R2 互換の `BUCKET` |
| build.mjs | すべてを `worker/index.js`（と `dist/server/index.js`）にまとめる |

`worker/index.js` と `dist/` は生成物。ドット絵は Codex に `codex exec -s workspace-write` で依頼してきた。依頼時は新規ファイルだけ触らせて衝突を避ける。

## 公開先

- URL: https://spefami.com/bgm/ （Cloudflare Workers `spacebgm2`、route `spefami.com/bgm*`）
- `node build.mjs` → テスト → `npx wrangler deploy`
- spefami.com 本体は別リポジトリ（SpaceFamilySite）の Custom Domain Worker。このルートがその手前で `/bgm` だけを受け取るので、本体には触らない。
- 保存は1つを全員で共有（アクセス制限なし、ユーザーの選択）。一般公開で複数人が遊ぶなら保存先の分離が必要。
- 旧公開先（OpenAI Sites: spacebgm2-adventure.spacefamily.chatgpt.site）は旧版のまま。

## 別プロジェクトに注意

このPCの `SpaceBGM2-work` は `yousayrock/Space-BGM` の別アプリ「月音の庭」です。本リポジトリとは別なので、そちらのファイルやリモートを上書きしないでください。
