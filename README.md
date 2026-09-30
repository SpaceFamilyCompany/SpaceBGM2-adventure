# SpaceBGM2｜音の冒険

ゆっぴと猫のトムが音楽と一緒に旅する放置RPG。

## 操作

下部の「冒険・育成・装備」または左右スワイプで切り替えます。音楽はどの画面でも再生・停止できます。
装備は宝箱・ボス・通常戦闘から発見。「おすすめを装備」で持っている中から武器と防具を選びます。
進行は自動保存し、留守中は最大8時間分を反映します。

## 開発

`node build.mjs` でビルド、`node --test tests/*.test.mjs` で検証。
`node scripts/preview.mjs 4320` でローカルサンプルを起動します。公開中の保存データには接続しません。

- `web/page.html`：3画面と共通の音楽操作
- `web/app.css` / `web/app.js`：表示と保存API操作
- `web/navigation.js` / `web/equipment.js`：スワイプと装備UI
- `scripts/pixel-characters.mjs` / `web/characters.*`：オリジナルのドット絵と歩行・戦闘・休憩アニメーション
- `web/music.js`：HTML Audio / Media Sessionによる音楽再生
- `server/game.mjs`：冒険・装備・旧セーブ互換
- `server/worker.mjs` / `server/media.mjs`：保存APIと音声配信

所有者限定のSitesアプリ。保存キーは `spacebgm2/owner-game-v1.json` を維持。一般公開・複数ユーザー化には保存先の分離が必要です。
2026-10-01：ユーザーからiPhone実機テスト通過の報告。UI変更後の音声方式は維持しています。
音声はネイティブメディアのループ再生です。iOSによる強制終了や着信後の継続は保証せず、完全オフライン起動には未対応です。
