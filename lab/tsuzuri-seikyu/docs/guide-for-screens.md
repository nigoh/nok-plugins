# 画面を作る人への手引き（つづり請求）

あなたは 1 画面を作る。土台（部品・骨格・見本データ・取得の真似）は出来ている。**土台は書き換えない**。足りない物が見つかったら、直さずに報告する（7）。
書式は teamwork.md B-05 の型。法則は ID で指すだけにして、中身は各文書を読む。

## 0. 先に読む物（土台の完了点＝第1.5段、2026-11-13）
- `.konomi/screens.yaml`：自分の画面の行（kind・covers・states・none・components）と、terms（呼び名）。
- `docs/requirements.md`：自分の REQ。`docs/structure.md`：層と部品の木。`docs/foundation-decisions.md`：土台の判断（第1.5段で変えたこと）。
- 見本：`?screen=probe`（部品を全部並べた見る画面）と `?screen=probe-form`（入力画面。必須と任意の印、誤りの一覧、主ボタンの置き場所）。`src/screens/probe/index.tsx`・`src/screens/probe-form/index.tsx` は写してよい。
- konomi の references：states.md・words.md・color-state.md は全員、form.md は入力のある画面、data.md は数字・表・図のある画面。

## 1. やってはいけないこと（✓＝機械が止める。`npm test`）
1. `src/ui` `src/parts` `src/app` `src/data`、トークン、`screens.yaml` を書き換えない。足りない物は報告し、必要な見本データや組み合わせは自分のフォルダの中で作る（B-03）。
2. ✓ 色・px・角丸・影・秒数を直書きしない。`bg-ai` `text-muted` `rounded-card` `text-body` `duration-(--dur-quick)` のように名前だけ。`[...]` の任意値、`text-sm`、`font-medium`、`style` 属性、`!important` は使わない。余白は 1・2・3・4・6・8・12・20（4・8・12・16・24・32・48・80px）の段だけ。
3. ✓ 層を逆に取り込まない。別の画面を取り込まない。`import` は `../../ui` `../../parts` `../../app/…` `../../data` の入口から。外部の読み込み・依存の追加をしない。
4. ✓ 画面の文字に、避ける言い方（ステータス・顧客・送信・発行・キャンセル…）、設計の言葉（状態名・ID・「空状態」「主役」）、「…」「！」、絵文字、全角の数字、半角カナ、数字と日本語の間の空白を出さない。`terms.ts` にある語（画面名・ボタンの動詞）を直書きせず、日本語の文を `+` でつながない（4.6）。
5. ✓ 基本の部品を自前で作り直さない（ボタン・窓・タブ・入力欄・表）。`<div onClick>` を作らない。見た目の順を `order-*`・`flex-*-reverse` で入れ替えない（DOM の順＝見た目の順：S-10）。
6. ✓ 数の欠損を `?? 0`・`|| 0` で 0 にしない（型で `null` を持つ）。`Intl`・`toLocaleString`・`¥` を使わず、整形は `data` の関数と `Money` だけ（4.3）。
7. ✓ 入力欄に `placeholder` を付けない。`type="number"` にしない（金額は `type="text" inputMode="numeric"`）。Enter で送るなら変換確定の Enter（`isComposing`）を除く。
8. 画面で状態の名前を足さない・変えない。見直して足りない物は報告する（4.5）。

## 2. 画面ファイルの形（✓ BT-02：screens.yaml と一致するか機械が見る）
`src/screens/<slug>/index.tsx`。slug・SCR-ID・kind・states は screens.yaml のとおり（SCR-002 の見本）。

```tsx
const STATES = ['default', 'loading', 'error', 'empty', 'filtered_empty', 'many', 'refreshing', 'stale'] as const

function Invoices({ state }: { state: string }) {
  const fake = useFake(state, (s) => (s === 'many' ? makeManyInvoices() : invoices))
  return (
    <AppShell data-scr="SCR-002" state={state} states={STATES} title={screenNames.invoices} current="invoices" kind="view"
      primary={<LinkButton to="invoice-new" variant="primary">{actions.createInvoice}</LinkButton>}>
      {fake.kind === 'loading' && <Skeleton lines={6} />}
      {fake.kind === 'empty' && …}
      {fake.kind === 'error' && <ErrorState description={fake.message} onRetry={fake.retry} retrying={fake.retrying} />}
      {fake.kind === 'ready' && …}
    </AppShell>
  )
}
export const screen: ScreenDef = { id: 'SCR-002', slug: 'invoices', title: screenNames.invoices, kind: 'view', states: [...STATES], Component: Invoices }
```

- `data-scr="SCR-002"` と `kind="view"`（か `"form"`）は**文字そのまま**で AppShell に渡す。`state={state}` と `states={STATES}` も必須。STATES は screens.yaml の states と同じ名前・同じ並び。
- いちばん外は AppShell。`<main>` と `<h1>` は書かない（骨格が出す）。大きな区切りは `<section>` と `h2`。
- **主ボタンの置き場所は kind で決まる**（form.md F-10）。見る画面・一覧（view）：768px 以上は見出しの右。入力画面（form）：768px 以上は入力の末尾の右。どちらも 768px 未満は下に固定。順は「やめる」→主で、`secondary={…}` に「やめる」、`primary={…}` に主を渡す。1 画面に主は 1 つ。
- 入力画面の主ボタンは `<Button type="submit" form="<form の id>" variant="primary">`。入力欄は `<form id="…" ref={formRef} noValidate onSubmit={…}>` で包む。見本は `probe-form`。
- 別の画面へ行くボタンは `LinkButton`、同じ画面での操作は `Button`、文中の移動は `Link`（`inline`）。画面を直接開く id は `?id=` などの URL パラメータ（`useRoute().params`）。絞り込み・並べ替え・ページ・タブは URL に残す。

## 3. 使える部品（入口ごと。import は入口から。✓ この表と実物の一致を機械が見る）
| 入口 | 部品と、受け取るもの |
| --- | --- |
| `../../ui` | **Button**（variant primary/secondary/quiet/danger、busy、busyLabel、leading）／**ButtonLink**／**IconButton**（label 必須、icon）／**StatusTag**（tone、density）／**Notice**（tone info/warn/fail/ok、title、action）／**Field**（label、hint、error、required、mark、id、group、`{(p) => <TextInput {...p} />}`）＋`markFor`／**ErrorSummary**（errors：`{id, message}` の配列。2 件以上のときだけ出る）／`focusFirstInvalid(form)`・`useFocusFirstInvalid(ref, attempt)`／**TextInput**（align end、leading、trailing）／**Textarea**／**Select**（options、placeholder）／**Checkbox**／**Radio**・**RadioGroup**（縦の選択肢。当たり 44px）／**TextField**（Field＋TextInput／Textarea）／**Switch**／**Money**（value は数か `null`、size、tone default/muted、signed、unit）／**Card**（as、selected）／**Tabs**（label、items、value、onChange、idBase）＋`tabPanelProps`／**Segmented**／**Dialog**（open、onClose、title、`secondary`＝やめる、`primary`、dismissible）／**Skeleton**（lines、variant）／**EmptyState**（title、description、action）／**ErrorState**（description、onRetry、retrying）／**Stepper**（label、steps、current）／**PageHeader**／**Pagination**（page、pageSize＝既定は `PAGE_SIZE`、total、onChange、disabled）／**Spinner**（待ちの印。1 画面に 1 つまで）／**Icon**／**ToastProvider**（Root が持つ）と `useToast().show({message, tone, action})`／`cn` |
| `../../parts` | **DataTable**（label、columns、rows、rowKey。主の列を先頭に `main: true`、枠 672px で表、未満で行）／**InvoiceStatusTag**・**PaymentStatusTag**（status、density）／`tagDensityOf(見えている札の調子の配列)`（札が多いとき静かにする）／`invoiceStatusDef` `paymentStatusDef` `invoiceFlow` `historyLabel` |
| `../../app/…` | **AppShell**（kind 必須。`dirty`・`onSaveBeforeLeave`・`secondary` は 2 つまで）／**Link**／**LinkButton**／**LeaveDialog**（AppShell が持つ。画面は置かない）／**StaleNotice**・**RefreshingNote**（`app/StaleNotice`）／`terms`（screenNames、navItems、actions、messages、appName）／`nav`（useRoute、go、replace、replaceParams、useUrlParam、paramNumber、hrefTo）／`types`（ScreenDef、ScreenKind） |
| `../../lib` | 数・日付の整形（formatNumber…monthName、桁をそろえる `pad`、月の最終日 `lastDayOf`、月の足し引き `addMonths`、支払期限の補足 `dueNote`。`data` からも同じ物が出る）／入力の読み（toHalf、toHalfDigits、wasWidened、readDate、readYen、readQuantity、settleDate、settleYen、foldForSearch、`matchesWords`、toKatakana、`MAX_YEN`）／欄の検査の骨（`checkEach`、`checkRule`、`formatError`）／`PAGE_SIZE`・`paginate` |
| `../../data` | 型（Invoice、Client、Payment…）／見本（invoices、clients、payments、defaultSettings、makeManyInvoices）／`calcTotals`、`displayStatus`、`dueNoteOf`、`invoiceTotal`、`candidatesFor`、`paymentStatus`、`describeTerms`／整形（formatNumber、formatYen、MISSING、formatDate、formatDateShort、formatDateColumn、formatDateTime、formatMonth、formatMonthOnly、formatTime、formatAgo、daysUntil、formatZip、ymdOf、dateOf、monthKey）／`NOW`・`TODAY`／`useFake`（`state='save_failed'`・`autoRetry`）／`fakeSave`・`outcomeOf`・`SAVE_WAIT_MS`／`manyInvoices()`（many の見本を 1 度だけ作って共有） |

## 4. 使い方の決まり
### 4.1 ボタン・面・動き
- ボタンの並び：全部 1 行に収まる幅だけ横。収まらなければ縦に積む（成り行きの折り返しにしない）。`flex-col md:flex-row` のように幅ごとに決める。ページの流れの中で縦に積むときは主を上、窓・下に固定する帯・入力画面の末尾では「やめる→主」で主が下（D-05）。
- 面（Card）は「独立して選ぶ・開く 1 つの単位」だけ。一覧の行・フォームの節は面にしない（余白と区切り線）。
- 画面の並び方は主役から決める（題名→説明→知らせ→本体の定型にしない）。スマホ幅（高さ 812）の最初の 1 画面に主役の頭と主操作を入れる。
- 動きを足さない。基本の部品が持つ動きで足りる。足すなら 5 つの役（応答・手がかり・待ち・誘導・らしさ）のどれかを言い、秒数・曲線はトークン。

### 4.2 入力画面：欄の表と流れ（form.md。設計書に書く。入力のある画面）
設計書に「欄の表」と「流れの 3 行」を書いてから作る。見本は form.md の「設計段階で示す物」。

```
<画面名>　F-01：項目 9・塊 2 → 1 画面に 2 節
| 項目 | 必須 | 欄の形 | 補足文 | 初期値（出どころ） | 誤りの文 |
確かめ：形式は離れた時、空欄は送る時、2 件以上で一覧（F-04）
ボタン：<主の名前>は末尾の右、768 未満は下に固定。成功は<行き先>へ移り知らせる（F-10）
離れる：未保存なら「保存して離れる」を主にした窓（F-09）
```
- **必須と任意の印**（F-03）：欄の数を数え、`markFor(必須か, { required: 必須の数, total: 全部の数 })` を各 Field の `mark` に渡す。必須が半分より少なければ必須に「必須」、半分以上なら任意に「任意」、全部必須なら印なしで先頭に「すべて入力してください」。`required` は欄の属性として常に付ける。
- **誤りの出し方**（F-04）：入力中は出さない。形式の誤りは欄を離れた時、空欄は送る時。誤りは Field の `error`（何が起きたか＋どう直すか）に。送った時に 2 件以上なら先頭に `<ErrorSummary errors={[{ id: 欄の id, message: 欄と同じ文 }]} />`（role=alert。フォーカスは移さない）。欄の id は `<Field id="…">` で画面が決める。
- **最初の誤り欄へ**：`setErrors(…); setAttempt((n) => n + 1)` と `useFocusFirstInvalid(formRef, attempt)`。誤りの state を直した直後に `focusFirstInvalid` を呼ぶと、描き直し前で欄はまだ invalid ではない（このフックが描き直しのあとに移す）。入力値は消さない。
- 送る・保存の最中は押したボタンだけ `busy`＋`busyLabel`。必須が空でも押せる（押したら誤りを出す）。Enter で送るなら変換確定の Enter（`e.nativeEvent.isComposing`）では送らない。
- 全角数字・ハイフンの種類は受け、離れた時に半角へ直して「半角にそろえました」（F-06）。金額は `type="text" inputMode="numeric" align="end" trailing="円"`、他人の情報（取引先の住所・担当者）には `autocomplete` を付けない（F-05）。

### 4.3 数字と図の表・書き方の約束（data.md。数字・表・図のある画面）
設計書に「数字と図の表」を書く。1 行が 1 つの見せ物。

```
| 見せ物 | 形（G-01・G-02） | 比べる相手・期間 | 書き方 | 欠け方 | 要約・表 |
```
- 金額は `Money`（表の列は `unit={false}`、見出しに「金額（円）」）。文の中は `formatYen`。桁区切りは半角カンマ、`¥` は使わない。
- **負の数は「−」（U+2212）**、赤にしない。**欠損は「—」**：`Money value={null}`（読み上げは「データなし」）。0 とは別のもの。`?? 0` で 0 にしない。差額は `signed`（0 以外に「+」）と言葉「550円不足」。
- 日付は `formatDate`（詳細・文）、`formatDateShort`（一覧）。同じ列に今年以外が 1 件でもあれば全行を長い形：`formatDateColumn(列の全部, TODAY)`。履歴・更新時刻は `formatAgo`：**24 時間未満だけ**「N分前」「N時間前」、それ以上は「11/12(木) 15:20」。期限の補足は「あと3日」「3日超過」（`daysUntil`、14px・`muted`）。
- 図：棒は 0 始まり、ラベル 14px 以上・目盛 12px 以上、系列は 5 つ以下（上位 4＋「その他」）、色だけで区別しない。すべての図に題＋数字の入った 1 文の要約と、同じ数字の表（12 行以下は常に、13 行以上は「数字で見る」）。図は自前の SVG。

### 4.4 状況の札・色（color-state.md）
- 状況の札は必ず `InvoiceStatusTag` / `PaymentStatusTag`。調子は 6 つ（wait・progress・fail・done・calm・draft）で、絵は調子ごとに別、**札の中の絵は回さない**。期限超過は wait（手の絵）、取り消し済みは calm、下書きは draft。
- 札が多いとき：見えている行の調子を `tagDensityOf` に渡し、返った関数で各札の `density` を決める（10 枚以上は wait・fail だけ通常の札、ほかは静かな札）。藍の下地の上の札は `density="quiet"`。
- 数字（金額・件数・比率）に色を付けない。色は札と知らせだけ。主ボタンの藍の塗りは 1 画面に 1 つ。設計書に「色の予算」を 1 行（主ボタン数・札の調子の種類・知らせの数・回る絵の数）。

### 4.5 状態の見直し（states.md。全員）
- screens.yaml の states と none は先に決めてあり、**画面で足さない・変えない**。作る前に E-01 の 5 軸（量・時間・成否・人・入力）で見直し、足りない状態・要らない状態があれば設計書に書いて報告する。
- 設計書に「状態表」（軸と値・状態・残す／隠す・次の一手・再現）と「操作表」（操作・戻せるか・相手・確かめ・失敗の置き場所・再試行）を書く。確かめの窓か「元に戻す」かは E-08（戻せない・相手に届く・番号が付く → 窓。お金・番号・期限に関わる物を「先に結果を見せて裏で送る」にしない）。
- 0 件は種類で分ける（E-05）：`empty`（初回、または片付いた）と `filtered_empty`（条件に合う物が無い。条件を外す導線）。通信が失敗しても 0 件にしない。
- `refreshing` は前のデータを残して「更新しています」（骨組みを出さない）。`stale` は前のデータを「HH:MM 時点の内容です。更新できませんでした」と見せ、お金・番号・期限を確定する操作は押せなくして理由を書く。

### 4.6 文言の一覧と置き場所（words.md）
設計書に「文言表」を書く（場面・文言・型 L-xx・字数。未決は「要確認」）。
- ボタン：「対象を＋動詞」の言い切り、3〜9 字、「…」「！」・句点なし。同じ操作は全画面で同じ名前で、**`actions` から引く**。窓の題と主ボタンは同じ動詞（「請求書を取り消しますか」と「請求書を取り消す」）。
- 誤りの文：何が起きたか＋どう直すか。責めない、「エラー」「不正」「無効」・技術の言葉・謝罪語を使わない。通信・保存の失敗は「送れませんでした。入力は残っています。もう一度送ってください。」の型。入力の空は指示（「取引先名を入れてください。」）。
- 0 件の文は種類で違う。初回は「請求書はまだありません」＋説明 1 文＋主ボタン 1 つ。待ちは「〜しています」、済んだ知らせは「〜しました」（20 字以内、句点なし）。
- **文言の置き場所（L-13）**：全画面で同じ語（画面名・メニュー・状況の語・ボタンの動詞）は `terms.ts` と `parts/status.ts` から引き、直書きしない。**画面にしか出ない文（題・説明・空の文・誤りの文）は画面ファイルに置いてよい**。そのときも文を `+` でつながず、`{件数}件を確認しました` のように差し込む（✓ 機械が止める）。
- 数・日付を文に入れるときも G-05・G-07 の形のまま（「万」に丸めない、和暦にしない）。税は税抜・税込を必ず書く。

## 5. 状態の切り替え方
`?screen=<slug>&state=<名前>`。画面の `states` に無い名前は default になる。名前と意味は screens.yaml の `states` のコメントと `extra_states`。`useFake(state, make)` が返す形：

| 状態の名前 | useFake の戻り（kind） | 画面ですること |
| --- | --- | --- |
| `loading` | `loading`（いつまでも待ち） | 骨組み（0.3 秒たってから）。0 件の表示を出さない |
| `empty`・`filtered_empty` | `empty`（`state` で区別。make は呼ばない） | 初回・片付いた／条件を外す導線 |
| `error` | `error`（retry で待ちを経て default に） | ErrorState を本体の位置に |
| `refreshing` | `refreshing`（`data` を持つ） | 前のデータを残し「更新しています」 |
| `stale` | `stale`（`data`・`asOf`・retry） | 前のデータと「HH:MM 時点」、確定の操作は止める |
| それ以外 | `ready`（`state` と、`make(名前)` の結果） | `many`・`partial`・`invalid`・`saving`・`confirming`・`conflict`・`status_*`・`mode_*`・`step_N`・`zip_*`・`*_empty` などを、画面が `state` を見て作る |

screens.yaml の states を**全部**表示できること。状態ごとの確かめ用データは自分の画面ファイルの中に置く。

## 6. テストの付け方
画面ファイルの隣 `src/screens/<slug>/<slug>.test.tsx`。`render(<ToastProvider><Component state="…" /></ToastProvider>)` で描く。
- 要件：`it('[REQ-013] 状況で絞ると …', …)`。自分の covers の REQ をすべて 1 回以上。
- 状態：`it('[SCR-002:empty] 請求書が 0 件のとき …', …)`。states の**すべて**に 1 つずつ（`step_2` のように数字を含む名前も、そのまま書く）。
- 部品を使い方で確かめるなら `[CMP-001]`。
- 要素は role・ラベル・文言で取る（クラス名・DOM 階層・テスト ID に頼らない）。固定の「いま」は `data/clock` の `NOW`。
- 終わりに `npm test`（`src/structure.test.ts` が層・直書き・画面ファイルの形・状態の名前・欠損・順序を、`src/app/terms.test.ts` が避ける言い方・設計の言葉・「…」「！」・数字の書き方・文言の置き場所を検査する）。落ちたのが自分の画面でなければ、報告に 1 行書く（他人のテストを消さない・skip しない：B-07）。

## 7. 報告のしかた（B-03）
- 足りない物を見つけたら直さず、`--note` に 1 行：**何が・どの画面で・どう困る・仮に何を**。例：`<slug>：土台に足りない：○○（この画面で△△に困る。仮に自分のフォルダで□□）`。
- 仮の物は自分のフォルダに置き、土台と同じ名前にしない。2 画面以上で同じ決めごと（呼び名・状態・金額や日付の形・状況の札）になった物は、合流で土台へ上げる。
- 判断は設計書に 1 行ずつ（`C-02：…`、`E-08：…`、`F-04：…`、`G-05：…`、`L-03：…`）。使った判断は `law-used.mjs` に、法則に無い気づき・矛盾は `--note` に。

## 8. 迷ったら
法則に無いこと・土台に足りない物は、自分で作らず、迷った点を報告する。理論どうしが食い違うときは `references/README.md`（どの文書が正か）の表に従う。

## 第3回の振り返りで足した物（土台。決定 4・6・8・9。詳しい置き換えは docs/uplift-plan.md）
第3回の振り返りで、10 画面が別々に作った同じ物を土台に引き上げた。**画面はこれを使い、自分のフォルダに同じ物を作らない**（番人が止める：structure.test.ts の `[todo]`）。

| 物 | 入口 | 使い方 | これまで画面が作っていた物 |
| --- | --- | --- | --- |
| 数・日付の整形 | `lib/format`（`data` からも同じ名前で出る） | `monthName(6 または '2026-06')`＝「6月」を 1 か所で作る。`formatMonthOnly` は同じ物。「月」を足さない（「6月月」の元） | report/MonthlyChart が `formatMonthOnly` に「月」を足していた |
| 履歴を積まない移動 | `app/nav` の `replace(screen, extra)`・`replaceParams({k: v})` | 絞り込み・並べ替え・ページ・タブ・開いた行、「削除のあと一覧へ移る」は `replace`／`replaceParams`（`null` か空で外す。`screen`・`state` は残る）。`window.history.replaceState` を画面で呼ばない | useListQuery・useInvoiceQuery・usePageParam・useUrlParam×2・useSettingsForm |
| URL の値 | `app/nav` の `useUrlParam(name, 既定値)` | `const [period, setPeriod] = useUrlParam('period', '12m')`。既定の値は URL に書かず（外す）、履歴も積まない。数は `paramNumber(page)` で読む | 同名 2 つ・別名 3 つ |
| 離れる確かめ | `AppShell` の `dirty`・`onSaveBeforeLeave` | 画面は `dirty={form.dirty && !form.saving}` を渡すだけ。メニュー・戻りのリンク・ブラウザの戻るで、変更があるときだけ離れる窓（LeaveDialog）が出る。窓は 離れる（danger）→入力に戻る→保存して離れる（主）。保存の手段が無い画面は `onSaveBeforeLeave` を渡さず、主が「入力に戻る」になる。タブを閉じる・再読み込みはブラウザの確認（beforeunload）に任せ、止めきれない | useLeaveGuard×3・LeaveDialog×3 |
| 入力の読み | `lib/normalize` | `toHalf`（全角→半角・ハイフンの種類）、`wasWidened(raw)`（直したときだけ `messages.widened` を出す）、`readDate(text, TODAY)`（西暦・和暦・8 桁・年なし）、`readYen`・`readQuantity`（桁区切り・円・円記号・全角、`over` あり）、`settleDate`・`settleYen`（欄を離れた時にそろえる形と知らせの要否）、`foldForSearch`（探す語：全角・大小・かな・空白） | invoice-new の dateInput/numberInput、invoice-detail の parse、5 通りの NFKC |
| 偽の保存 | `data/fakeSave` | `await fakeSave(値, { outcome: outcomeOf(state) })`。待ちは `SAVE_WAIT_MS`（600）の 1 つ。`{ ok: true, value }`／`{ ok: false, reason: 'failed' }`／`{ ok: false, reason: 'conflict', theirs? }` を値で返す（例外にしない） | 6 つの保存の真似（待ち 600・700 ms） |
| save_failed | `useFake`・screens.yaml の語彙 | `?state=save_failed` は読み込みは成功（データは default）で、`state` だけ画面に渡る。画面は保存の操作で失敗（`outcomeOf('save_failed')`）にし、押した所の近くに `role=alert` ＋もう一度（入力は残す：E-06・E-07）。保存のある画面（SCR-003・004・006・007・009・010）は states に足す | テストでしか失敗を出せなかった 5 画面 |
| 自動の再試行 | `useFake(state, make, undefined, { autoRetry: true })` | 読むだけの失敗は `READ_RETRIES`（2）回まで静かにやり直し（その間は `loading`）、なお失敗なら `error`。書く操作は自動で繰り返さない（E-07） | 無し |
| ラジオ | `ui` の `Radio`・`RadioGroup` | 2〜5 個の縦の選択肢。`variant="plain"`（短い物）／`"card"`（情報の多い物。選ぶと面）。当たりは丸の周り 44px 四方か面全体 | client-form AddressChoice・payments CandidateOption |
| 文字の欄 | `ui` の `TextField` | `<TextField label hint error required mark note={wide ? messages.widened : undefined} value onChange={(v) => …} onBlur />`。`rows` で複数行 | settings・setup の TextField |
| 押せない・読み上げ | `Segmented`・`Pagination`・`Tabs` の `disabled`、`Segmented` の `aria-describedby` | 更新中・保存中は `disabled`。`fieldset disabled` で代用しない。Tabs は選んでいるタブにも乗せた時・押した時の応答がある | fieldset disabled（clients・invoices・…） |
| ページ送り | `ui` の `PAGE_SIZE`・`Pagination`、`lib` の `paginate(items, page)` | 1 ページの件数は 1 か所（20）。`const { rows, page, last, paged } = paginate(items, page)`。`PAGE_SIZE` を画面で定義しない | `PAGE_SIZE = 20` を 5 回 |
| 更新中・古い内容 | `app/StaleNotice` の `StaleNotice`・`RefreshingNote` | `fake.kind === 'stale'` → `<StaleNotice asOf={fake.asOf} retry={fake.retry} retrying={fake.retrying}>画面固有の補足</StaleNotice>`（省略すると標準の 1 文）。`refreshing` → `<RefreshingNote>操作を止める理由</RefreshingNote>`。「N時点の内容です」は `messages.staleTitle` に 1 つ | 4 画面で 4 通りの文 |
| 0 件 | `EmptyState` | 標準は「題＋説明の文（文中リンクを含められる）」。見出し右の主ボタンと同じ名前のボタンを重ねない（決定 9）。「条件をすべて外す」のような別の操作だけ `action` | home 型と invoices 型の食い違い |
| 表 | `parts` の `DataTable` | セルの中身が div でも入れ子の誤りにならない。`sortable`＋`sort`＋`onSort` で見出しが押せるボタンになり `aria-sort` が付く。`fold: 1｜2` は表の形で枠が狭いとき小さい番号から隠す列（1 行ずつの形では隠さない） | span の中の div（invoices・payments） |
| 呼び名・文 | `app/terms` の `actions`・`messages` | `actions.next`（次へ進む）・`prev`（前の段へ戻る）・`backToInput`（入力に戻る）・`deleteDraft`（下書きを削除する）・`useTheirs`（相手の内容を使う）・`overwriteSave`（上書きして保存する）・`discardAndLeave`・`saveAndLeave`。`messages.saving`・`loading`・`refreshing`・`staleTitle(time)`・`staleBody`・`widened`・`saveFailed`・`leave` | 画面の直書き（38 件） |
| 支払期限の補足 | `lib` の `dueNote(days)`、`data` の `dueNoteOf(invoice, TODAY)` | 「あと3日」「今日まで」「3日超過」（G-07）。入金を待つ請求書（送付済み・期限超過）だけ `dueNoteOf` が返し、それ以外は null。日数だけ分かる所は `dueNote`。画面で文を作らない | invoices・invoice-detail・clients の `dueNote`（詳細だけ「今日が期限です」だった） |
| 桁をそろえる | `lib` の `pad(n, width = 2)` | 月・日は 2 桁、連番は `pad(n, 3)`。`String(n).padStart` を画面に書かない | `pad` を 5 か所 |
| 月の計算 | `lib` の `lastDayOf(年, 月)`・`addMonths(年, 月, n)` | 月末は `lastDayOf`、「n か月後」は `addMonths`（`[年, 月]` を返す。負で戻る）。`Date.UTC(y, m, 0)` や `y * 12 + m` を画面に書かない | `lastDay`・`lastDayOf`・`addMonths` を 4 か所 |
| 探す語の照合 | `lib` の `matchesWords(照合先の文字の配列, 探す語)` | 空白で区切った語はすべて「かつ」。どの欄を照合先にするかだけ画面が決める（`invoiceMatches`・`clientMatches`） | invoices と clients の `matchesQuery` |
| 欄の検査の骨 | `lib` の `checkEach(欄の配列, 欄 → 文)`・`checkRule(欄の定義, 値)`・`formatError(欄の定義, 値)` | 空の必須は `empty`、入っていれば `valid` で見て `bad`。欄の表と欄どうしの誤りは画面が持つ（`validateSettings`・`validateStep`・`validateClientForm`） | settings・setup・client-form の `validateAll`・`formatError` |
| 制度の語 | screens.yaml の terms の `allow` | 避ける語（avoid）を含んでも使ってよい制度の語は、その行の `allow` に書く（例：送る の allow に「適格請求書発行事業者」） | terms.test.ts に直書き |

### 文言ファイルの名前
画面にしか出ない文のファイルは **`copy.ts`**（`texts.ts`・`words.ts`・`windows.ts` にしない）。home・invoices・invoice-new のように tsx に直書きした文も `copy.ts` へ。

### AppShell の下に固定する帯と、状態ごとの主・副
- 帯の高さは測って本文の下の余白（`--bar-h`）に結ぶので、処理中の文言（busyLabel）が長くなって帯が高くなっても最後の要素が隠れない。画面は余白を足さない（`pb-20` などを書かない）。busyLabel は 7 字以内を目安にする。
- 副は 2 つまで：`secondary={[<やめる/>, <下書きを保存する/>]}`。幅が狭いときは副が上の段に並び、主が下の段いっぱいになる（順は DOM でも 副→副→主）。
- **状態ごとに主・副を替える書き方**：状態ごとに別の AppShell や別の枠を作らず、渡す物を状態で替える。読み込み中だけ別の枠にしない（骨組みの間は主を押せなくする）。

```tsx
const saving = state === 'saving'
<AppShell … kind="form" dirty={dirty && !saving} onSaveBeforeLeave={save}
  secondary={saving ? <Button disabled>{actions.cancel}</Button> : [<Button onClick={cancel}>{actions.cancel}</Button>, <Button onClick={draft}>{actions.saveDraft}</Button>]}
  primary={<Button type="submit" form="f" variant="primary" busy={saving} busyLabel={messages.saving}>{actions.sendInvoice}</Button>}>
```

### 画面の置き換えの順
画面ごとに「何をどれに置き換えるか」は `docs/uplift-plan.md`。置き換えるたびに `structure.test.ts` の `UPLIFT_KNOWN`・`terms.test.ts` の `UPLIFT_KNOWN` から該当の行を消す。すべて消えたら `UPLIFT_STRICT` を true にして落とす形に切り替える。
