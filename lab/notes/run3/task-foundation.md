# 土台づくりの指示（第1段）

あなたは konomi スキルに従って、製品「つづり請求」の**土台**を作る。画面そのものは後で別の10人が1画面ずつ作る。
あなたの仕事は、その10人が迷わず・そろった物を作れるようにすること。

## 先に読む（この順で、全部）
1. /home/claude/konomi/skills/konomi/SKILL.md
2. /home/claude/konomi-run3/docs/brief.md
3. /home/claude/konomi/skills/konomi/references/taste.md, structure.md, motion.md, decisions.md
4. /home/claude/konomi/skills/konomi/laws/requirements.md, flow.md, implementation.md, test.md
5. アプリの今の姿：/home/claude/konomi-run3/app の src/app/*, src/index.css, src/styles/tokens.css, vite.config.ts, .konomi/screens.template.yaml

## 作る物（すべて /home/claude/konomi-run3/app の下）
1. `docs/requirements.md` — REQ-001 からの要件（受け入れ条件つき、20〜30件）。laws/requirements.md に沿う。
2. `.konomi/screens.yaml` — テンプレートの形で。sources / targets / shell（nav・主操作・戻り方）/ terms（使う語・避ける語・状況の呼び名と色）/ screens（10画面。covers・states・entry・to・components）/ components（CMP-ID）。
   状態の名は、偽の取得で再現できる物にする（例：default, loading, empty, error, ほか画面固有）。画面ごとの states はここで決め切る。
3. `docs/structure.md` — 構造の設計図（structure.md の書式）。層（画面/取得/組み合わせ/基本/トークン）と取り込みの向き、部品の木、公開する面（props）、入れ子の点検、**変更シナリオ表（5件以上。どこを何か所直すか）**。
4. `src/ui/` — 基本の部品。最低限：Button（primary/secondary/quiet/danger、busy、A-01 の hover/press/focus、スマホ44px・PC36px見た目+44px当たり）、IconButton、StatusTag（状況の呼び名と色は terms から）、Notice、Field（ラベル・補足・エラーの結び付け）、TextInput、Select、Money（金額の表示。等幅数字・右寄せ）、Card、Tabs または Segmented、Dialog、Skeleton、EmptyState、ErrorState、Toast、Stepper、PageHeader。1部品1ファイル、`src/ui/index.ts` でまとめて出す。動きは motion.md に従いトークンだけを使う。reduced-motion に従う。
5. `src/app/AppShell.tsx` — 全画面共通の骨格（nav、現在地、主操作の置き場、スマホでの出し方）。`<main>` を持つ。画面は AppShell に title・主操作・中身を渡すだけにする。
6. `src/data/` — 型（Invoice, Client, Payment…）、見本データ（日本の実在しそうな架空の社名・金額。件数は一覧が成り立つ量）、金額・日付の整形（Intl）、`useFake(state, 作る関数)` のような、状態名から 待ち/空/失敗/成功 を返す取得の真似。
7. テスト — `src/ui/*.test.tsx` に基本の部品のテスト（名前に `[CMP-nnn]` を入れる）。laws/test.md に沿う。
8. `docs/guide-for-screens.md` — 画面を作る10人への手引き（1〜2ページ）。使える部品と props、やってはいけないこと（基本の部品を書き換えない／色・px を直書きしない／層を逆向きに取り込まない／呼び名を変えない）、画面ファイルの決まった形、テストの名付け、状態の切り替え方。
9. `docs/foundation-decisions.md` — 判断の記録。1行1件、`D-05：… → …` の形。動きは 5 つの役のどれかを書く。どの法則・理論を使ったか ID で。

## 決まり
- 画面（src/screens/）は作らない。ただし骨格の確かめ用に `src/screens/probe/index.tsx` を、AppShell と基本の部品を全部並べた見本に書き換えてよい（slug は probe のまま、id は SCR-000）。
- 色・角丸・影・動きは `src/index.css` の @theme にある名前だけ。足りなければ tokens.css / @theme に**役の名前で**足し、理由を foundation-decisions.md に書く。任意値 `[#...]` `[13px]` は使わない（文字の大きさだけは @theme に段を足して名前で使う）。
- 外部の読み込みなし。依存の追加なし（アイコンは自前の小さな SVG 部品）。
- UI の文言に設計の言葉（状態名・ID・「空状態」など）を出さない。
- `npm run build` と `npm test` が通るまで直す。
- 使った法則は `KONOMI_HOME=/home/claude/konomi-run3/home node /home/claude/konomi/skills/konomi/scripts/law-used.mjs <ID...>` で記録。法則や理論に無かった気づき・困ったことは同じ道具の `--note "…"` で記録（遠慮なく。これが一番ほしい）。

## 返す物（短く）
作ったファイルの一覧、build/test の結果、スキルの文書で**役に立った所・足りなかった所・矛盾していた所**を箇条書きで。
