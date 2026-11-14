# 置き換えの指示（引き上げ 第2段）

製品「つづり請求」（/home/claude/konomi-run3/app）の土台に、画面が別々に作っていた同じ物が引き上げられた。あなたは**担当の 2 画面**（依頼文にある）を、土台の物に置き換え、設計書を新しい決まりで書き直す。ほかの 8 画面は別の人が同時に作業している。

## 先に読む
1. /home/claude/konomi-run3/docs/decisions-review3.md（決まったこと）
2. /home/claude/konomi-run3/docs/uplift-plan.md（0 節の「決めた挙動の変更」と、**自分の画面の置き換え一覧**）
3. app/docs/guide-for-screens.md（「第3回の振り返りで足した物」）、app/.konomi/screens.yaml の自分の画面
4. /home/claude/konomi/skills/konomi/references/README.md（何を読むかの表）と references/design-doc.md（設計書の書き方。全部読む）。理論の本は README の表のとおり、自分の画面の種類の本だけ全部、ほかは先頭の早見表から当てはまる判断だけ開く。**読んだ本と節を記録して返す**（読み分けが足りたかを知りたい）。
5. 自分の画面のコード・テスト・今の設計書

## やること（画面ごとに）
1. **置き換え**：uplift-plan.md の一覧どおり、画面の自作を土台の物（`lib/format`・`lib/normalize`・`lib/paginate`・`app/nav` の `replace`／`useUrlParam`・`useLeaveGuard`／`AppShell` の `dirty`・`data/fakeSave`・`ui/Radio`・`ui/TextField`・`StaleNotice`・terms の `actions`／`messages` など）に置き換え、要らなくなったファイルは**中身を空にせず削除**する（`rm <ファイル>` を 1 つずつ。`rm -rf` と glob は使わない）。画面内の文言ファイルは `copy.ts` の名前にそろえる。
2. **状態**：screens.yaml の自分の画面の states に `save_failed` があれば、画面の STATES に（yaml と同じ位置に）足し、`?state=save_failed` で保存の失敗の姿が出るようにする。テスト `[SCR-nnn:save_failed]` も。
3. **残っている不具合**（自分の画面に当たる物だけ）：下に固定した帯が最後の要素を隠す件は土台で直ったはずなので確かめる／report：更新中に文字を薄くして文字のコントラストが 4.5:1 を切る（color-state.md C-10：文字の不透明度を下げない）／settings：タブの押した時の応答は土台で直ったので確かめる／invoices：「条件をすべて外す」の見た目が設計とずれている／settings：離れる窓の順が設計と逆（土台の窓に置き換えれば解消）。
4. **設計書を書き直す**：references/design-doc.md と templates/screen-design.md（/home/claude/konomi/skills/konomi/templates/）の形で、`app/docs/screens/SCR-nnn-<slug>.md` に**新しく書く**（古い `<slug>.md` は消さずに残す。report は古い物が無い）。本体 20KB 以内／当てはまらない判断は書かない／判断は `ID：事実（数字・条件）→ 選んだ物` の形だけ／変更シナリオ 3 件以上、うち **2 件以上を実際に変えて数える**（変えて、直す所の数とテストが落ちるかを見て、元に戻す。表に 見込み・実際・試した＝済）／「実装で変えたこと」に今回の置き換えを書く。
5. **確かめ**（app で）：`npx tsc -b --noEmit 2>&1 | grep "screens/<slug>"` が 0 件、`npx vitest run src/screens/<slug>` が通る、`npx vitest run src/structure.test.ts src/app` が自分の原因で落ちない。`npm run build` のあと、`python3 /home/claude/konomi/skills/konomi/scripts/ui-audit.py /home/claude/konomi-run3/app --spa /home/claude/konomi-run3/app/dist/index.html --only <slug> --out /tmp/audit-<slug>` で自分の画面の不合格を 0 に（他人の途中の物で build が落ちる時は少し待って再試行。自分のファイルに原因が無ければよい）。設計書は `node /home/claude/konomi/skills/konomi/scripts/trace-check.mjs /home/claude/konomi-run3/app --out /tmp/trace-<slug>` で自分の画面の DOC-* が出ないこと。

## 決まり
- 触ってよいのは `app/src/screens/<自分の 2 つの slug>/` と `app/docs/screens/SCR-nnn-<自分の slug>.md` だけ。土台（ui・parts・app・data・lib・index.css・screens.yaml）と他の画面は書き換えない。土台に足りない・おかしい物は、自分の場所でしのぎ、報告する。
- 見た目と振る舞いは、uplift-plan.md 0 節の「決めた挙動の変更」以外は変えない。テストを消して通さない（置き換えで意味が無くなったテストだけ、理由を書いて直す）。
- 気づきは `KONOMI_HOME=/home/claude/konomi-run3/home node /home/claude/konomi/skills/konomi/scripts/law-used.mjs --note "<slug>：置き換え：…"`。新しい設計書の雛形・読み分けの表・早見表で**困った所・足りなかった所**を必ず書く。

## 返す物（短く・画面ごと）
置き換えた件数、消したファイルと行数（前後の `wc -l`。テストを除く）、テスト・ui-audit・trace-check の結果、変更シナリオを試した結果（見込みと実際）、読んだ本と節（KB の概算）、雛形と読み分けで困った所。
