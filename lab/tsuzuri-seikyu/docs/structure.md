# 構造の設計図（つづり請求・土台）

references/structure.md の書式。画面は 10 人が別々に作るので、「層」と「公開する面」と「触る場所の数」を先に固定する。

## 1. 層と取り込みの向き（S-04）

```
画面     src/screens/<slug>/index.tsx   取るデータを選び、部品を置き、URL と状態の対応を持つ
  ↓
骨格     src/app/ (AppShell, Link, LinkButton, terms, nav, Root)   画面の外枠・移動・呼び名の正本
  ↓
組み合わせ src/parts/ (DataTable, InvoiceStatusTag, PaymentStatusTag, status)  基本の部品＋業務の言葉
  ↓
基本     src/ui/ (Button … Pagination)  自分の見た目と状態だけ。業務の言葉を知らない
  ↓
トークン src/index.css の @theme, src/styles/tokens.css  値（色・角・影・文字・時間）

取得     src/data/ (types, sample, derive, calc, format, clock, useFake)  型・見本・整形・取得の真似
```

| 層 | 知っていること | 知らないこと | 取り込んでよい |
| --- | --- | --- | --- |
| 画面 | どのデータが要るか（useFake を呼ぶ）、どの部品をどこへ置くか、URL ↔ 状態 | 部品の中の見た目 | app・parts・ui・data |
| 骨格（app） | メニューの項目と並び、現在地、主操作の置き場、幅による出し分け | 画面の中身 | ui・parts・data |
| 組み合わせ（parts） | 状況→呼び名と札の調子、表の組み替え | データの取り方、置かれる場所 | ui・data（型だけ） |
| 基本（ui） | 自分の見た目、押せない・処理中、標準の属性 | 業務の言葉、どの画面か | ui の中、data/format（整形の純粋関数だけ） |
| 取得（data） | 型、見本、計算、整形、待ち・空・失敗の再現 | どの画面が使うか、見た目 | data の中だけ |

- 向きは `src/structure.test.ts` が検査する（[REQ-028]）。画面どうしの取り込みも禁止。
- 例外は 1 つだった（ui の Money・Pagination が `data/format` を取り込む）が、第3回の振り返りで解消した：整形は最下層 `src/lib/format` に移り、ui と data の両方が `lib` を取り込む（決定 8。下の「第3回の振り返りで足した物」）。

## 2. 部品の木と公開する面（S-09）

```
AppShell（骨格）      受け取る：data-scr, state, states, title, current, primary?, secondary?, description?, back?, width?, children
├ スキップリンク
├ サイドメニュー(≥1024) / 上の帯＋窓のメニュー(<1024)   Link ×6（現在地は aria-current）
├ main
│ ├ PageHeader（基本）  title, back?, description?, actions?   ← 主・副は ≥768 のここ
│ └ children            画面が置く
└ 下に固定の操作帯(<768)  secondary?, primary?
Link / LinkButton（骨格） to, params?, bare?/inline?（Link）　移動は履歴に積む
DataTable（組み合わせ）   label, columns[{key,header,render,align?,width?,main?}], rows, rowKey　枠 672px で表↔行
├ InvoiceStatusTag / PaymentStatusTag（組み合わせ）  status → 呼び名と調子
│ └ StatusTag（基本）    tone, children
Button / ButtonLink / IconButton（基本）  variant, busy?, busyLabel?, leading?  標準の属性は残りを渡す
Field（基本）          label, hint?, error?, required?, group?, children(control props) → TextInput / Select / Textarea / Segmented
TextInput / Select / Textarea / Checkbox / Switch（基本）  標準の属性を渡す。見た目の口は align・leading・trailing・options のみ
Money（基本）          value, size?, tone?, signed?, unit?
Card / Notice / Tabs / Segmented / Dialog / Stepper / Pagination / EmptyState / ErrorState / Skeleton（基本）
ToastProvider（Root に 1 つ）＋ useToast().show({message, tone?, action?})
```
- 外側の余白・幅は持たない（T-5）。`className` は外側の配置（幅いっぱい、列の位置）だけに使う。
- 見た目の変化は `:disabled` → `aria-*` → `data-*` の順で書く。クラス名の付け替えで状態を表さない。
- テストは role・ラベル・文言で見つかる（T-01）。

## 3. 入れ子と順序の確認（S-01・S-10）
- 押せるものの中に押せるものを置かない：Card は面だけで押せない。押せる面は見出しのリンクを `after:absolute after:inset-0` で広げ、ほかの操作は `relative` で上に重ねる。
- 表は `role=table/rowgroup/row/columnheader/cell` を手で付け、`div` の組。一覧は `ul > li`。Stepper は `ol > li`。
- 見た目の順と DOM の順は同じ。例外なし：Dialog の操作帯は「やめる→主」の順で、スマホも縦に同じ順（親指側の下が主）。下に固定する帯も DOM の最後。
- `h1` は PageHeader だけ。見出しは段を飛ばさない（h1→h2）。`nav` は aria-label で区別（主なメニュー・ページ送り・手順）。

## 4. 状態の持ち方（S-07）
- 画面の状態は `?state=` の列挙 1 つ（default / loading / …）。真偽値を並べない。取得の結果は `Fake<T>`（loading | empty | error | ready）の判別共用体。
- 絞り込み・並べ替え・ページ・タブ・対象 id は URL。入力中の値は画面内。合計・件数・期限超過は持たず計算する（derive.ts）。

## 5. 変更シナリオ表（S-06）

| # | 起こりそうな変更 | 触る場所 | 数 |
| --- | --- | --- | --- |
| 1 | アクセントの色（藍）を変える | `styles/tokens.css` の `--ai` 系（明・暗） | 1（明暗で 2 行） |
| 2 | ボタンの角丸・高さを変える | `ui/buttonStyle.ts`（角丸は `--radius-control` なら tokens 1 か所） | 1 |
| 3 | 請求書の状況を 1 つ足す（例：保留中） | `data/types.ts` の型、`parts/status.ts` の呼び名と調子、`screens.yaml` の terms、`derive.ts`（計算するなら） | 4 |
| 4 | 状況の呼び名を直す（送付済み→送信済み…） | `parts/status.ts` 1 行と `screens.yaml` terms 1 行 | 2 |
| 5 | 表の列を 1 つ足す（請求書一覧に「担当者」） | その画面の columns に 1 項目 | 1 |
| 6 | メニューの項目を足す・並べ替える | `app/terms.ts` の navItems と screenNames | 1 |
| 7 | 画面幅の境目（表→行）を変える | `parts/DataTable.tsx`（`@2xl` を替える） | 1 |
| 8 | 税の端数処理の選択肢を足す | `data/types.ts` の Rounding、`data/calc.ts`、設定画面の選択肢の定義 | 3 |
| 9 | データの取得先を本物の API に替える | `data/useFake.ts` を同じ戻り値の本物の取得に替える（画面は変えない） | 1 |
| 10 | 金額の表記を「¥1,234」に替える | `data/format.ts` と `ui/Money.tsx` の単位の出し方 | 2 |
| 11 | 動きの速さを変える | `styles/tokens.css` の `--dur-*` | 1 |
| 12 | ボタンの文言（保存する→保存）を直す | `app/terms.ts` の actions 1 行（画面は引くだけ） | 1 |

- 3 か所以上は 3（4 か所）と 8（3 か所）。どちらも「型・定義・表示」の 3 点セットで、型が通らなくなる箇所を数えているので許容（型が漏れを見つける）。1 か所で済ませたい場合は、状況の定義（呼び名・調子・流れ）を 1 つのオブジェクトにまとめる案がある。実装後に 2〜3 件を実際に変えて数える。
- 暗い画面：役の名前の対応（tokens.css の `@media (prefers-color-scheme: dark)`）1 か所。値で済まない画像は無い。

## 6. 第1.5段で変えたこと（上の 1〜5 は残し、変わった所だけをここに足す）
新しい理論（form.md・data.md・color-state.md・words.md・states.md・teamwork.md）に合わせた。層の向きと取り込みの表は変わらない。

**部品の木の変更（S-09）**
```
AppShell（骨格）   受け取る：data-scr, state, states, title, current, kind(必須: 'view'|'form'), primary?, secondary?, description?, back?, width?, children
                  置き場所：view＝≥768 は見出しの右／form＝≥768 は main の末尾の右（data-actions="end"）／どちらも <768 は下に固定。順は secondary→primary（DOM も同じ）
Dialog（基本）     受け取る：open, onClose, title, secondary?(やめる), primary?, dismissible?, children　← actions を廃止（順を型で守る）
Field（基本）      受け取る：label, hint?, error?, required?, mark?('required'|'optional'|'none'), id?, group?, children　＋ markFor(必須か, {required, total})
ErrorSummary（基本・CMP-031）  errors:{id,message}[]。2 件以上のときだけ Notice(fail) の形で出る。focus は移さない
useFocusFirstInvalid(ref, attempt)（基本）  描き直しのあとに最初の誤り欄へ
StatusTag（基本）  tone（6 つ。絵は調子ごとに別、circle-minus は一区切り）, density('normal'|'plain'|'quiet')
Money（基本）      value: number|null（null は「—」＋読み上げ「データなし」）, tone は default/muted だけ（赤を無くした）
parts/status.ts    tagDensityOf(見えている札の調子[]) → 調子ごとの density（C-08）
data/format.ts     formatNumber/formatYen は null で「—」、負は U+2212、formatAgo は 24 時間未満だけ相対、formatDateTime・formatDateColumn を追加
data/useFake.ts    Fake に refreshing・stale を追加、filtered_empty は kind=empty（state で区別）
app/types.ts       ScreenKind、ScreenDef に kind
```
- 層の表（1）の「骨格」の行：主操作の置き場所は **画面の種類（kind）で決まる**。骨格は画面の中身を知らず、kind だけを受け取る。
- `ErrorSummary` は基本の層（Notice の形を再利用）。誤りの文は画面が持ち、部品は並べてリンクにするだけ（S-04）。
- 例外（1 つのまま）：ui の Money・Pagination は `data/format` を取り込む。

**入れ子と順序の確認（3）への足し**：入力画面の末尾の操作帯も DOM の最後（main の最後の子）。見る画面の見出しの右の操作は Tab で欄より先に届くので、入力のある画面は kind="form" にする（S-10・F-10）。

**変更シナリオ表（5）への足し**

| # | 起こりそうな変更 | 触る場所 | 数 |
| --- | --- | --- | --- |
| 13 | 入力画面の主操作を、見る画面と同じ見出しの右にしたい | `app/AppShell.tsx` の `headerActions`／`endActions` の条件 1 か所（画面は kind の値を変えるだけ） | 1 |
| 14 | 「必須」「任意」を出す規則（半分で分ける）を変える | `ui/Field.tsx` の `markFor` | 1 |
| 15 | 札を静かにする枚数（10 枚）や割合（80%）を変える | `parts/status.ts` の `tagDensityOf` | 1 |
| 16 | 負の符号を「△」にする（取引先が求める書類） | `data/format.ts` の `MINUS`（書類の出力は別関数） | 1 |
| 17 | 相対の時刻を 24 時間以外で切る | `data/format.ts` の `DAY_SEC` | 1 |
| 18 | 札の調子を 7 つ目に足す（C-01：次の行動の主が違うときだけ） | `ui/StatusTag.tsx` の tones、`ui/Icon.tsx` に新しい絵、`parts/status.ts` に対応、`screens.yaml` の terms | 4 |
| 19 | 状態の語彙に 1 語足す（E-02） | `screens.yaml` の extra_states（共通の語にするなら trace-check の既知の語と `structure.test.ts` の COMMON_STATES）。取得の見え方が変わるなら `data/useFake.ts` | 1〜3 |
| 20 | 「やめる」の位置（主の左）を変える | `ui/Dialog.tsx` の 1 行と `app/AppShell.tsx` の 2 か所（DOM の並び） | 3 |

- 18 は 4 か所。「型・定義・表示・呼び名」の組で、型が通らなくなる箇所を数えている（3 と同じ理由で許容）。

## 7. 第3回の振り返りで足した物（上の 1〜6 は残し、変わった所だけをここに足す）
同じ決めごとを 10 画面が別々に作っていた物（review3-C の束 14 のうち土台に上げる 11）を、土台に引き上げた。画面の置き換えは第 2 段（docs/uplift-plan.md）。

**層の変更（S-04）**
```
画面     src/screens/<slug>/
  ↓
骨格     src/app/ (AppShell, Link, LinkButton, LeaveDialog, StaleNotice, terms, nav, useLeaveGuard, Root)
  ↓
組み合わせ src/parts/ (DataTable, 札, status)
  ↓
基本     src/ui/ (… Radio, TextField)
  ↓
最下層   src/lib/ (format, normalize, paginate)   ← ui・data・parts・app が取り込む。lib は lib の中だけ
取得     src/data/ (… fakeSave, useFake, format＝lib/format の出し直し)
```
| 層 | 取り込んでよい（追加分） |
| --- | --- |
| lib | lib の中だけ（Intl・正規化・ページ割りなどの純粋な関数。業務の言葉・文言を持たない） |
| ui | ui の中と `lib`（`data` は取り込まない。層の向きの不合格 2 件の解消） |
| data | data の中と `lib`（`data/format.ts` は `lib/format` を出し直すだけ。画面の `import { formatYen } from '../../data'` は壊れない） |
| parts・app | 既存に加えて `lib` |
| 画面 | 既存に加えて `lib` |

- 文言を持つ物（離れる窓・古い内容の知らせ）は、文言の正本 `terms` を引くので app に置く（ui は terms を知らない）。
- `lib/format.ts` が `Intl` を持つ唯一のファイル（番人もそこだけを許す）。月の名前は `monthName` の 1 か所。

**部品の木の変更（S-09）**
```
AppShell（骨格）  受け取る：…, primary?, secondary?（2 つまで：[a, b]）, dirty?, onSaveBeforeLeave?, …
├ 下に固定の操作帯(<768)  高さを測って --bar-h に。本文の下に同じ高さのスペーサー（処理中の文言で帯が高くなっても最後の要素が隠れない）
└ LeaveDialog（骨格）      open, canSave, saving, onStay, onDiscard, onSave　順：離れる→入力に戻る→保存して離れる
useLeaveGuard(dirty, onBlocked)（骨格）  リンク（メニュー・戻り・本文）の押しとブラウザの戻る。同じ URL・修飾キー付きは通す
nav（骨格）        useRoute, go（積む）, replace・replaceParams（積まない）, useUrlParam(name, 既定値), paramNumber
StaleNotice・RefreshingNote（骨格）  asOf, retry, retrying, children ／ children
Radio・RadioGroup・TextField（基本）  CMP-032・CMP-039
DataTable（組み合わせ）  columns[{…, sortable?, fold?}], sort?, onSort?　aria-sort。セルの中身は div で包む
Segmented・Pagination・Tabs（基本）  disabled。Segmented は aria-describedby。Pagination の pageSize は PAGE_SIZE が既定
lib/format・lib/normalize・lib/paginate   整形・入力の読み・ページ割り
data/fakeSave・useFake                    fakeSave(値, { outcome })・outcomeOf・save_failed・autoRetry（読むだけ 2 回）
```

**入れ子と順序の確認（3）への足し**：DataTable のセルの中身は `div`（`span` の中に `div` を置かない：S-01）。離れる窓も「やめる系→主」の順で、主が最後（DOM でも見た目でも）。

**変更シナリオ表（5）への足し**

| # | 起こりそうな変更 | 触る場所 | 数 |
| --- | --- | --- | --- |
| 21 | 1 ページの件数を 20 から 30 にする | `lib/paginate.ts` の `PAGE_SIZE` | 1 |
| 22 | 偽の保存の待ちを変える | `data/fakeSave.ts` の `SAVE_WAIT_MS` | 1 |
| 23 | 離れる窓の「戻る」の言い方を変える | `app/terms.ts` の `actions.backToInput` | 1 |
| 24 | 日付の欄で和暦の昭和を受けない | `lib/normalize.ts` の `ERAS` | 1 |
| 25 | 更新中・古い内容の文を変える | `app/terms.ts` の `messages.refreshing`・`staleTitle`・`staleBody` | 1（4 画面ぶんが変わる） |
| 26 | 読むだけの自動の再試行を 2 回から 3 回にする | `data/useFake.ts` の `READ_RETRIES` | 1 |
| 27 | 月の名前を「6月」から「6月分」にする | `lib/format.ts` の `monthName` | 1 |

- 画面を置き換える前の「実際に触った数」は、21 が 5 か所（clients・invoices・payments・invoice-detail・report の `PAGE_SIZE`）、25 が 4 か所（文言の定義）、22 が 6 か所（保存の真似）。置き換えたあとに 1 になる。
