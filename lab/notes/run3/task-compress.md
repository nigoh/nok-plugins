# ハーネスの圧縮の指示（共通）

konomi スキル（/home/claude/konomi/skills/konomi/）の知識を、**判断の質を落とさずに短くする**。製品のソースは対象外。担当は依頼文にある。

## 先に読む
1. /home/claude/konomi-run3/docs/compress-plan.md（圧縮の案。**2 章の本ごとの案と、自分の担当の章を必ず**。8 章の歯止め、9 章の決まり）
2. /home/claude/konomi-run3/docs/compress-trial/（実際に圧縮した前後の実例 `<本>.before.md` `<本>.after.md` と、照合の道具 `check.py`、許可リスト `.allow` の書き方）
3. /home/claude/konomi/KNOWLEDGE.md
4. 自分の担当のファイル

## 決まったこと
- 判断は削らない。ID・表の行・数値・印（〔調査〕〔原理〕〔目安〕〔試作〕）を落とさない。縮めるのは、説明の文、くり返し、例（1 つ残す）、経緯、〔試作〕の根拠の長い文（根拠は 1 語にし、長い経緯は置き場へ）。
- 文を表の 1 行に。条件｜選ぶもの｜根拠 の表はそのまま（列の中の文を短く）。
- 置き場（作るときは読まない層）は `records/`。すでに `references/_moved/` は消し、`references/SOURCES.md` は `records/sources.md`、`references/checks.md` は `records/checks.md`、設計書の見本の一部は `records/design-samples/` に移してある。本の中に残る `_moved/…` `SOURCES.md` `checks.md` への指しは、`records/sources.md`・`records/checks.md`・`references/design-doc.md` に直す（1 行で）。
- **移す＝消す**。別の場所へ移した物を元の場所に残さない。控えは作らない（直す前の控えは /home/claude/konomi-before-compress/ にある）。
- **足さない**。圧縮の途中で新しい知見・言い足しを足さない。
- やさしい日本語のまま。意味が変わる言い換えをしない。

## 照合（必ず通す）
ファイルごとに `python3 -I /home/claude/konomi-run3/docs/compress-trial/check.py <前> <後> [--allow <許可リスト>] [--rows-moved N]` を通す。「前」は /home/claude/konomi-before-compress/skills/konomi/ の同じファイル。
落ちたら、欠けた ID・数値・印を戻す。例や経緯を消したために減った数値だけ、理由つきで許可リスト（`/home/claude/konomi-run3/docs/compress-check/<ファイル名>.allow`。1 行 1 語。先頭に `# 理由` の行）に書く。**ID と印は許可リストに入れない**（別の本へ移した ID は、移し先のファイルで在ることを grep で確かめ、報告に書く）。

## 返す物（短く）
ファイルごとの前後の大きさ（wc -c）と比率、照合の結果（通った／許可リストに入れた語の数と理由）、縮められなかった所とその理由、置き場へ降ろした物。
