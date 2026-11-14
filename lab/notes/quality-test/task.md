# 画面を 1 枚作る（圧縮後のスキルの確かめ）

製品「つづり請求」の画面を 1 枚、konomi スキルに従って新しく作る。担当と作業場所は依頼文にある。土台と他の 9 画面は出来ている。

## 読む物（これだけ。読んだ物と量を記録して返す）
1. /home/claude/konomi/skills/konomi/SKILL.md
2. /home/claude/konomi/skills/konomi/references/README.md の「何を読むか」の表に従う：自分の画面の種類で「全部読む」本だけ全部読み、ほかは references/INDEX.md で当てはまる判断を見つけ、その ID の節だけを本で開く。法則は laws/ の、いまの工程の点検表。
3. 作業場所の docs/guide-for-screens.md、docs/requirements.md（自分の画面が covers している REQ）、.konomi/screens.yaml（自分の画面の行と terms）、使う土台の部品のコード。
**読まない物**：records/、他の画面の設計書（docs/screens/ の他の SCR）、他の画面のコード（土台の使い方の確かめに 1 画面だけ index.tsx を見るのはよい）、/home/claude/konomi-run3/ 以下。

## やること
1. 設計書を先に書く：`docs/screens/SCR-nnn-<slug>.md`（references/design-doc.md の形。雛形は /home/claude/konomi/skills/konomi/templates/screen-design.md）。
2. 実装：`src/screens/<slug>/`（index.tsx が `export const screen`。screens.yaml の states を全部。375px と 1280px、ライトとダーク）。
3. テスト：`src/screens/<slug>/<slug>.test.tsx`（名前に `[REQ-nnn]` と `[SCR-nnn:状態]`。covers の全 REQ と全 states）。
4. 変更シナリオを 2 件以上、実際に変えて数える。設計書の「実装で変えたこと」を書く。
5. 確かめ（作業場所で）：`npx tsc -b --noEmit 2>&1 | grep "screens/<slug>"` が 0、`npx vitest run` が全部通る、`npm run build`、`python3 /home/claude/konomi/skills/konomi/scripts/ui-audit.py <作業場所> --spa <作業場所>/dist/index.html --only <slug> --out /tmp/q-<slug>`、`node /home/claude/konomi/skills/konomi/scripts/trace-check.mjs <作業場所> --out /tmp/qt-<slug>`、`node /home/claude/konomi/skills/konomi/scripts/src-lint.mjs <作業場所> --out /tmp/ql-<slug>`。
   **最初に点検を通した時の不合格の数と中身を、直す前に控えておく**（これが比べたい数字）。そのあと 0 になるまで直す。

## 決まり
- 触ってよいのは `src/screens/<slug>/` と `docs/screens/SCR-nnn-<slug>.md` だけ。土台は書き換えない。
- 依存を足さない。rm -rf と glob の削除を使わない。
- 使った判断は `KONOMI_HOME=<作業場所>/home node /home/claude/konomi/skills/konomi/scripts/law-used.mjs <ID...>`。**圧縮されたスキルで、判断するのに足りなかった説明・例・根拠**があれば `--note "<slug>：圧縮：…"` で必ず記録（どの本のどの ID で、何が分からなかったか）。

## 返す物（短く）
読んだ物と量（KB の概算）、最初の点検の不合格（数と中身）、直した後の結果、テストの件数、設計書の大きさと判断の行数、変更シナリオの結果、圧縮で足りなかった所（無ければ「無し」）、かかった手戻り。
