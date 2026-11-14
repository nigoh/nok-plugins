# konomi（好み）

好みに沿った良いフロントエンドを、要件→設計→実装→テストまで一貫して作るための知識型スキルです。日本語の画面を前提にしています。

## 入れ方

```
/plugin marketplace add nigoh/nok-plugins
/plugin install konomi@nok-plugins
```

## 入っている物

| 物 | 場所 | 役割 |
| --- | --- | --- |
| スキル本体 | `skills/konomi/SKILL.md` | いつも読む入口（約 11KB） |
| 理論 | `skills/konomi/references/` | 判断の表（部品選び・構造・動き・色と状況・入力・数と図・文言・状態・分業）。`INDEX.md` から判断の番号単位で開く |
| 点検表 | `skills/konomi/laws/` | 工程ごとの確かめること |
| 置き場 | `skills/konomi/records/` | 記録・出どころ・検査の一覧。作るときは読まない |
| 雛形 | `skills/konomi/templates/` | 画面の一覧と状態表、設計書、手引き、トークン |
| 点検の道具 | `skills/konomi/scripts/` | 画面の点検（ui-audit）、つながり（trace-check）、ソース（src-lint）、読む量（read-budget・bundle-budget）など |
| フック | `hooks/` | 証拠レポートが無い・古い・不合格のうちは完了を止める |
| 育て方 | `KNOWLEDGE.md` | 知識の足し方・圧縮の決まり。作るときは読まない |

## 使う前に要る物

- Node.js 22 以上。道具の依存を入れる：このフォルダで `npm install`（`yaml` だけ）。
- 画面の点検（`ui-audit.py`）は Python 3、`playwright`（Python）、Chrome が要る。`axe-core` は点検する側のプロジェクトに入れる。
- フックは `.konomi/screens.yaml` があるリポジトリでだけ働く。止めたいときは環境変数 `KONOMI_GATE=off`。

## 分かっている限界

- 理論の数値の多くは〔目安〕（調べた値ではなく置いた値）。〔調査〕の印も、出どころの中身との突き合わせは済んでいない。
- 試したのは業務アプリ（React + Tailwind）の 1 製品だけ。LP・配信・忠実再現（デザインどおりに作る）は未検証。
- フックの入力の `stop_hook_active` の扱いは、公式の資料で最後まで確かめられていない。
- 試作と振り返りの記録は、このリポジトリの `lab/` にある（プラグインには入らない）。
