---
name: gadget-report
description: セッションの節目（本番への公開・マージ、不具合の直し終わり、依頼の切り替わり、セッションの終わり）ごとに必ず使う。号機の進捗・復旧・テスト結果を、会社の報告書テンプレートのJSONを埋めたHTML報告書にして、報告書ライブラリまで公開する。頼まれなくても使う。
---

> この文書は `SpaceFamilyCompany/Home` の `.claude/skills/gadget-report/SKILL.md`（正本）の写し。`tools/report_library.py publish` で上書きされるので、ここは直さず正本を直す。

# 号機の報告書

Claude CodeもCodexも、この手順に従う（Codexは`AGENTS.md`からここへ来る）。

号機（スペースガジェット研究所の各プロダクト）の報告は、必ず会社の報告書テンプレートで作る。所長から頼まれなくても、**節目ごとに必ず1本**出す。報告書を出すまでが、その作業。

## 節目（このどれかに来たら、所長への返事より先に報告書を出す）

1. **本番に出した**：`main`へのマージ・push、デプロイが成功した（いちばん多い節目。公開の成功を確かめたら、続けて報告書）
2. **直し終わった**：不具合・障害の原因が分かって直った。復旧した
3. **依頼が切り替わる**：所長が別の話を始めた。前の依頼の作業に、まだ報告していない変更があれば、新しい作業に入る前に出す
4. **セッションを終える**：「できた」「終わった」と返す前、所長が席を外す前。未報告の変更を残したまま終えない
5. **頼まれた**：報告書・レポート・まとめ・振り返りを頼まれた

決まり：

- 小さな修正が続くときは、次の節目の1本にまとめてよい。ただし、公開した変更が報告書に1つも載らないまま、セッションが終わらないようにする
- 節目かどうか迷ったら、出す。出しすぎより、抜けのほうが困る
- 所長への返事の最後に、出した報告書のファイル名と、ライブラリに載ったかを1行で書く。出さなかったときは、その理由を書く（「前の報告書にまとめた」など）
- 報告書は号機ごと。1つの節目で複数の号機を変えたら、号機ごとにその号機のリポジトリの`reports/`へ出す。会社全体の作業（体制・法人化など）は`SpaceFamilyCompany/Home`の`reports/`

## テンプレートの場所

正本は`SpaceFamilyCompany/SpaceFamilySite`の`templates/gadget-report.html`。このリポジトリではリポジトリ直下の`templates/gadget-report.html`を読む。

## 作り方

1. 材料を集める。会話・ログ・`git log`・実測値など、確かめた事実だけを使う。推測は書かない。わからない値は聞くか、項目ごと消す
2. テンプレートをコピーし、冒頭の`<script type="application/json" id="report">`のJSONだけを埋める。HTML・CSS・JSは変えない
3. `<title>`を「[号機番号] 号機名｜報告の種類」に書き換える（例：`[002] 家系Bot｜復旧報告`）
4. 1行目の`"sample"`は消す
5. 使わないブロックは配列から消す。空のまま残さない

## 書き方の決まり

- `verdict`（結論）を最初に書く。一文で言い切る
- `state`は`ok`（良好・完了）／`warn`（注意）／`crit`（重大）／`wait`（保留）。`milestones`は`done`／`now`／`todo`
- 宛先`report.to`は`所長`。社外向けのときは`代表`。どちらも名字や氏名は書かない（プライバシーのため）
- 書き手`report.by`は、チャットならクロ、Claude Codeならクロコ
- 日時は日本時間で`YYYY-MM-DD HH:MM`
- 文中の書式は`**太字**`と`` `コード` ``だけ
- 和文と英数字の間にスペースを入れない。句読点は全角
- 番号付きの`next`は、実際に順番があるときだけ使う

ブロックの種類：`text`（段落）／`timeline`（経緯）／`cause`（原因・核心）／`checklist`（やったこと）／`proof`（ログ抜粋）／`metrics`（予定と実測）／`issues`（課題）。書き方はテンプレート冒頭のコメントにある。

## 渡し方

- その号機のリポジトリの`reports/`に`YYYY-MM-DD-種類.html`で保存してコミットする（種類は`progress`・`recovery`・`test`・`migration`など。同じ日に2本目なら`-2`を付ける）。`reports/`は配信しない場所なので、`public/`の中に置かない
- claude.aiではArtifactとしても公開し、1行で何の報告かを伝える

## 一覧を作り直す（1コマンド）

報告書を足したら、手で一覧を書かずに、全リポジトリぶんを1コマンドで作り直す。

1. `reports/`を持つSpaceFamilyCompanyのリポジトリを、同じフォルダに並べて取ってくる（Claude Codeでは`/home/user/`の下。足りなければ`list_repos`で探し、`add_repo`で足す。いまは SpaceFamilySite・FamilyLineBot・Home・SpaceBGM）
2. `python3 SpaceFamilySite/tools/report_library.py publish`を実行する。各リポジトリの`reports/README.md`と、SpaceFamilySiteの`public/library/`（`boards.json`と`sources.json`も）を作り直す
   - 前回のライブラリに入っていたリポジトリが手元にないと、作り直さずに止まる（`sources.json`と見比べる）。止まったら、そのリポジトリを取ってきてやり直す。止まったのを無視して、`library`を手で回さない（ほかの号機の報告書がライブラリから消える）
3. コミットとpush
   - 報告書を足したリポジトリ：`reports/`をコミットする。プルリクエストでマージする決まりのリポジトリ（FamilyLineBotなど）は、報告書だけのプルリクエストを作ってマージする（報告書だけなら公開は要らない）
   - SpaceFamilySite：`public/library/`をコミットして`main`にpushする。`https://spefami.com/library/`と、LINE管理画面の`https://admin.spefami.com/admin/library/`に出る。どちらもCloudflare Accessで所長だけが開ける
   - `wrangler.jsonc`は触らない（`workers_dev: false`と独自ドメインの`routes`で、ライブラリの鍵とサイトの公開を守っている）
4. 引っ越し前でリポジトリがない号機の報告書は、SpaceFamilySiteの`reports/legacy/<号機番号>/`に置く。引っ越したら、その号機のリポジトリの`reports/`へ移す

リポジトリを取ってこられない環境（チャットだけのとき、Codexなど1つのリポジトリしか触れないとき）では、次のところまでやる。

1. 報告書をそのリポジトリの`reports/`に作る（テンプレートが手元にないときは、同じ`reports/`の最新の報告書をコピーして、JSONだけを書き換える）
2. `reports/README.md`の表の先頭（見出し行の次）に、同じ形で1行足す（次の`publish`で作り直されるので、手で足してよい）
3. コミットする。所長への返事の最後に「報告書ライブラリへの反映は、次にクロコ（Claude Code）が`publish`するときに入る」と書く
