# 画面づくりの指示（第2段）

あなたは konomi スキルに従って、製品「つづり請求」の**1画面だけ**を作る。担当の画面は依頼文に書いてある（SCR-ID と slug）。
土台（骨格・基本の部品・データ・呼び名）はすでにある。他の9画面は別の人が同時に作っている。

## 先に読む（この順で、全部）
1. /home/claude/konomi/skills/konomi/SKILL.md
2. /home/claude/konomi-run3/docs/brief.md
3. app/docs/guide-for-screens.md, app/docs/structure.md, app/.konomi/screens.yaml, app/docs/requirements.md（自分の画面が covers している REQ）
4. /home/claude/konomi/skills/konomi/references/README.md（どの文書が正か）, decisions.md, structure.md, motion.md, taste.md, teamwork.md
4b. 同じ references/ の新しい理論：states.md（全員）, words.md（全員）, color-state.md（全員）, form.md（入力のある画面）, data.md（数字・表・図のある画面）
5. /home/claude/konomi/skills/konomi/laws/flow.md, visual.md, interaction.md, implementation.md, test.md
6. app/src/ui/index.ts と使う部品のファイル、app/src/app/AppShell.tsx、app/src/data/

## 作る順（設計を先に書く。コードはその後）
1. `app/docs/screens/<slug>.md` を先に書く。中身：
   - **この画面で人がすること**（1〜3行）と、最初の1画面に何を置くか（D-14）
   - **判断の記録**：1行1件。`D-05：ボタン 3 個・最長 9 字・375px で 1 行に収まらない → 縦に積む。主を上` の形。切り替えの形（D-01）、入力の形（D-02/03）、操作の出し方（D-04）、ボタンの並び（D-05）、文字（D-06）、余白（D-07）、揃え（D-08）、折り返し（D-09）、置き場所（D-10）、一覧の形（D-11）、図（D-12）、幅の組み替え（D-13）のうち、この画面に当てはまる物すべて。数字と条件を入れる。
     加えて、状態（E-：states を E-01 の 5 軸で見直し、足りない・要らない物があれば書く。失敗と立ち直り E-06〜E-10）、色と状況（C-）、入力（F-：欄の表を form.md の書式で）、数と図（G-：数字と図の表を data.md の書式で）、文言（L-：この画面だけの文の一覧。ボタン名・誤りの文・0 件の文・窓の文）のうち当てはまる物すべて。
   - **構造の設計図**（structure.md の書式）：部品の木（画面/取得/組み合わせ/基本 の層を書く）、入れ子の点検、状態の持ち場所（S-07）、**変更シナリオ表 3件以上**（「◯◯を変えたい → 直す所は何か所・どのファイル」）
   - **動きの仕様**（motion.md A-08 の書式）：動かす物ごとに 役（応答/手がかり/待ち/誘導/らしさ）・時間トークン・イージング・reduced-motion の時。動かさないと決めた物も1行（A-05）。
2. `app/src/screens/<slug>/` に実装。`index.tsx` が `export const screen: ScreenDef` を出す（id・slug・title・states は screens.yaml と一字一句同じ）。画面の中だけで使う組み合わせ部品は同じフォルダに分ける（1部品1ファイル）。
   - screens.yaml に書かれた states を**全部**作る。`?state=` で切り替わり、見た目がそれぞれ違うこと。
   - 幅 375px と 1280px の両方で成り立つこと。ライト／ダークの両方。
3. `app/src/screens/<slug>/<slug>.test.tsx` にテスト。名前に `[REQ-nnn]` と `[SCR-nnn:状態名]` を入れる。covers の全 REQ と全 states に最低1つ。laws/test.md に沿う。
4. 設計書に戻り、実装して**変わった判断**を「実装で変えたこと」として足す（消さない）。

## 決まり（破ると全体が壊れる）
- 触ってよいのは `app/src/screens/<自分の slug>/` と `app/docs/screens/<自分の slug>.md` だけ。`src/ui/`・`src/app/`・`src/data/`・`index.css`・他の画面は**書き換えない**。足りない・直したい物があれば、自分のフォルダの中でしのぎ、`--note` に「土台に足りない：…」と書く。
- 色・角丸・影・動きは @theme の名前だけ。任意値 `[#..]` `[13px]` や style 属性での色・px の直書きはしない。
- 呼び名・状況の語は screens.yaml の terms のとおり。UI の文言に設計の言葉（状態名・ID・「空状態」「エラー状態」など）を出さない。
- 依存の追加なし、外部の読み込みなし。図は自前の SVG（taste.md の図の決まり：ラベル14px以上・目盛12px以上、色だけで区別しない）。
- 確かめ：`cd app && npx tsc -b --noEmit 2>&1 | grep "screens/<slug>"` で自分の型エラーが 0、`npx vitest run src/screens/<slug>` が通る。他人の画面の失敗は気にしない。`npm run build` は他人の途中の物で落ちることがあるので、自分のファイルに原因が無ければよい。
- 使った法則・理論は `KONOMI_HOME=/home/claude/konomi-run3/home node /home/claude/konomi/skills/konomi/scripts/law-used.mjs <ID...>` で記録。法則・理論・手引きに無かった気づき、迷った所、矛盾は `--note "<slug>：…"` で記録（遠慮なく。これが一番ほしい）。
- rm -rf は使わない。

## 返す物（短く）
作ったファイル、テストの結果、判断で一番迷った所、スキルの文書で足りなかった所・矛盾していた所。
