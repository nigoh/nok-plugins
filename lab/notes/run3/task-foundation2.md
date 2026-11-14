# 土台の手直し（第1.5段）

konomi スキルに理論 6 本が足され、既存の文書も直された。製品「つづり請求」の土台（/home/claude/konomi-run3/app）を、新しい理論に合わせて直す。画面 10 枚はまだ作られていない（この後、別の 10 人が作る）。

## 先に読む
1. /home/claude/konomi/skills/konomi/SKILL.md、references/README.md（どの文書が正か・先に決めた答え）
2. references/ の新しい 6 本：color-state.md, form.md, data.md, words.md, states.md, teamwork.md（特に各文書の「設計段階で示す物」「機械で確かめられること」と、実物への指摘）
3. 直された taste.md, decisions.md（D-05）, motion.md（A-03・トークン）, structure.md（S-04）, templates/screens.yaml
4. app の今の姿：docs/*.md, .konomi/screens.yaml, src/ui, src/parts, src/app, src/data, src/structure.test.ts, src/app/terms.test.ts

## 直す物
1. **主ボタンの置き場所**（README の答え 4、form.md F-10）：AppShell が画面の種類（見る画面／入力画面）を受け取り、入力画面では主操作を入力の末尾に置けるようにする（768px 以上は末尾の右、未満は下に固定。「やめる→主」の順）。Dialog の操作帯も同じ順。screens.yaml の shell.primary_action と、各画面がどちらの種類かを書く。
2. **Field**：必須と任意の示し方を form.md F-03 に合わせる。誤りの出し方・まとめの一覧（2 件以上で role=alert、フォーカスは最初の誤り欄）を F-04 に合わせ、使い回せる部品か関数にする。
3. **数と日付**（data.md G-05〜G-07）：負の数 U+2212、欠損「—」、相対の時刻は 24 時間未満だけ、を src/data/format.ts と Money に。テストも。
4. **状況の調子**（color-state.md C-01〜C-04）：StatusTag と parts の状況の定義を 6 つの調子に合わせる。札の中の絵は回さない。一区切りの絵を完了と別に。
5. **文言**（words.md）：terms.ts の不揃い（語尾、対象の無い動詞、直し方の無い誤りの文、「…」「！」）を直す。画面だけの文の置き場所の決まり（L-13）を手引きに。
6. **状態の語彙**（states.md E-02）：screens.yaml の各画面の states と extra_states を共通の語彙に寄せ直す（名前を変えたら理由を書く）。none の理由を E-03 の書き方に。useFake が新しい名前を扱えること。
7. **機械の番人**（teamwork.md B-06、各文書の「機械で確かめられること」）：src/structure.test.ts と terms.test.ts に、ソースを読んで確かめられる物を足す（例：画面ファイルの形 BT-02、設計の言葉 WORDS-02、「…」「！」WORDS-07、`?? 0` の検出など。無理のない範囲で。足した検査は一覧にする）。
8. **手引き** docs/guide-for-screens.md を teamwork.md B-05 の型に合わせて書き直す。新しい理論で画面担当が守ること（入力画面の欄の表、数字と図の表、状態の見直し、文言の一覧）を入れる。docs/structure.md と docs/foundation-decisions.md にも変えた所を足す（消さずに「第1.5段で変えたこと」として）。
9. probe を直した部品に合わせる。

## 決まり
- 画面（src/screens/ の probe 以外）は作らない。依存を足さない。rm -rf を使わない。
- `npm run build` と `npm test` が通るまで直す。`python3 /home/claude/konomi/skills/konomi/scripts/ui-audit.py /home/claude/konomi-run3/app --spa /home/claude/konomi-run3/app/dist/index.html` で probe の不合格が 0。
- 使った判断は `KONOMI_HOME=/home/claude/konomi-run3/home node /home/claude/konomi/skills/konomi/scripts/law-used.mjs <ID...>`、気づき・矛盾・足りない所は `--note "土台1.5：…"` で記録（新しい理論が実物に当てて使えたか・使えなかったかが一番ほしい）。

## 返す物（短く）
直した所の一覧、build/test/ui-audit の結果、足した機械の検査、新しい理論で**使えた判断・当てはめに困った判断・実物と合わなかった判断**。
