---
name: mobile-webapp
description: iPhoneのSafariで開く内部ウェブアプリ・画面（議事録アプリなど）を作る・直すときに必ず使う。拡大（ピンチ・ダブルタップ）と横ずれを起こさない決まりと、スマホで使いやすくする決まり。
---

> この文書は `SpaceFamilyCompany/Home` の `.claude/skills/mobile-webapp/SKILL.md`（正本）の写し。`tools/report_library.py publish` で上書きされるので、ここは直さず正本を直す。

# スマホで使うウェブアプリの決まり

所長はiPhoneのSafariで開く。画面が拡大したり、横にぶれたりすると使えないので、新しい画面を作るとき・直すときは、次を最初から入れる。

## 拡大とぶれを起こさない（必須）

iOS Safariは`user-scalable=no`を無視するので、複数の手で止める。

1. viewport：`<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no,viewport-fit=cover">`
2. CSS：`html,body{touch-action:pan-y;overflow-x:hidden;max-width:100%}`（縦スクロールだけ許す。`pan-x`は入れない。横ずれの原因になる）
3. CSS：`*,*::before,*::after{box-sizing:border-box}`、`body{overflow-wrap:anywhere}`、`main`と`.card`に`min-width:0`、`input[type=file]`・`select`・`iframe`・`audio`は`max-width:100%`
4. JS：`gesturestart`・`gesturechange`・`gestureend`を`preventDefault`（ピンチ）。`touchend`の間隔が350ms未満なら`preventDefault`（ダブルタップ。`{passive:false}`が要る）
5. 入力欄（input・select・textarea）の文字は**16px以上**。これより小さいと、入力のたびにiPhoneが画面を拡大する
6. `html{-webkit-text-size-adjust:100%}`

## スマホで使いやすくする

- タップできるものは高さ44px以上（`--tap-min`）。上部は`padding-top:env(safe-area-inset-top)`で、時刻・ノッチに重ねない
- 入力欄は中身に合わせて伸ばす（`textarea`の高さを`scrollHeight`に合わせる）。枠の中でスクロールしないと読めない状態にしない。長い文の欄は`input`でなく`textarea`
- 長い処理（アップロード、文字起こし）は、進み具合（％・MB・速度）を出す。「送っています…」だけにしない。送信中は画面を開いたままにする旨を書き、サーバーが受け取ったら「閉じても続く」と書く
- 色・余白・書体は`SpaceFamilySite/public/assets/internal-ui.css`のトークンを使う。色を直書きしない（ライト・ダークの両方に効かせる）
- ブラウザのマイク・録音は、HTTPS（`tailscale serve`など）でないと動かない

## 1画面に収める型（テンプレート）

新しい画面は、ページを縦に長くせず、1画面に収める。型は、会社のテンプレート`SpaceFamilySite/templates/one-screen.html`（JSONを書き換えるだけで作れる）。報告書ライブラリと議事録アプリも、同じ作り。

- 上に見出し（題名と件数）、真ん中に今の種類の中身、下に種類のタブ（5つまで）を置く。ページ全体は、スクロールしない。長い中身は、真ん中の枠の中だけでスクロールする
- 1つの種類に項目が2つ以上あるときは、真ん中の上に小さな切り替え（チップ）を出し、項目は1つずつ見せる。全部を縦に並べない
- 種類は、会社・サイト・プロジェクト・ボット・開発のように、利用者が思い浮かべる分け方にする。「すべて」のタブは作らない
- 最後に開いたタブと項目は、端末に覚えておく。更新しても、同じ場所に戻る
- 折りたたみは、開く項目を1つに絞る。長い一覧は、日付などで束ねる
- 中身に使う文字は、`textContent`で入れる（`innerHTML`に、データを直接入れない）
- 手順が決まっている画面（議事録アプリの4手順など）も、同じ骨組みで、タブを手順にする

## 仕上げの確認（実機でしか分からない）

- iPhoneのSafariで、ピンチ・ダブルタップしても拡大しないこと
- 縦にスクロールしながら、指を横に動かしても、画面が横にずれないこと
- 入力欄をタップしても、画面が拡大しないこと
- 確認できない項目は、確認できていないと書く。直らなければ、所長にスクリーンショットを頼む
