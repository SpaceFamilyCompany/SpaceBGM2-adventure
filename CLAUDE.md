# Claude Code 開発引き継ぎ

このリポジトリは「SpaceBGM aka BGMコンシェルジュ」の編集用ソースです。24時間かけっぱなしにできる、冒険が鳴らす音楽アプリ。
主人公は **ゆっぴ**、仲間は猫の **トム**。コンセプトと遊び方は README.md（ゲーム画面にはタイトルやルールを出さない）。

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
| web/page.html / app.css / app.js | 舞台（Canvas。320×180 の世界の中央 256×144 を描く。ドット絵は起動時に1度だけ画像化し、変化した時だけ描き直す）・イベントカードの列・操作・再生 |
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
