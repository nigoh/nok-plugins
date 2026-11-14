# 第 2 段の作業表：画面ごとに「何をどれに置き換えるか」

第3回の振り返り（決定 4）の第 1 段で、10 画面が別々に作った同じ物を土台に引き上げた。この表は第 2 段（画面の置き換え）の作業表。
使い方と名前は `app/docs/guide-for-screens.md` の「第3回の振り返りで足した物」。土台の側は変えない（足りない物があれば報告）。

## 0. 先に知っておくこと

**置き換えの終わり方**（番人は 2 つ。どちらも「新しい違反は落とす・いまの分は一覧を出す」の形）
- `src/structure.test.ts` の `UPLIFT_KNOWN`（38 行）：画面が `history.replaceState` を呼ぶ・`useLeaveGuard`/`useUrlParam`/`usePageParam` を自作する・`PAGE_SIZE` を定義する・`normalize('NFKC')` を直書きする・文言ファイルが `copy.ts` でない、の一覧。
- `src/app/terms.test.ts` の `UPLIFT_KNOWN`（38 行）：引き上げ済みの語（次へ進む・入力に戻る・保存しています・更新しています など）を直書きしている一覧。
- 画面を 1 つ置き換えるたびに、その画面の行を両方の一覧から消す。**全部消えたら、各ファイルの `UPLIFT_STRICT` を `true` にして落とす形に切り替える**（一覧は空にする）。`npm test` を打つと `[todo]` の残りがログに出る。

**挙動が変わる所**（テストの期待を直す。画面の設計書にも 1 行）
1. 離れる窓の並びと言い方が全画面で同じになる：離れる（danger）→**入力に戻る**→保存して離れる（主）。「編集に戻る」（invoice-new）・「やめる」（settings）はやめる。settings は設計書の順（やめる→保存せず離れる→…）ではなく決定 9 の順にそろえる（settings 設計書の D-05 を直す）。
2. 日付・金額の読みが `lib/normalize` の 1 つになる。invoice-detail の入金日は昭和も読み、元号の範囲（平成 31 年 5 月 1 日は読まない）を見る。年は 1900〜2100。金額の上限は引数（invoice-new は `readYen(text, MAX_AMOUNT)`、invoice-detail は既定の 999,999,999）。「円記号つき」「円」「，」「全角」はどちらも読む。
3. 「半角にそろえました」を出す条件が 1 つ（`wasWidened`：前後の空白を除いただけでは言わない）。5 通りあった条件が揃うので、境目のケース（半角カナ・全角空白のみ）のテストを見直す。
4. 保存の待ちが 600ms の 1 つ（invoice-detail の `makeService(ms)` と settings の `scenario.ts` は 600/700 が混在していた）。テストで待たない書き方（`ms=0`）をしていた所は、fake timers で `SAVE_WAIT_MS` 進める。
5. `?state=save_failed` を保存のある 6 画面（SCR-003・004・006・007・009・010）が受ける。`STATES` に `save_failed` を足し（`screens.yaml` は先に足してある。位置は `saving` の次）、状態ごとのテストを 1 つ足す。`structure.test.ts` の BT-02 は、足すまで画面に無くても通る。
6. 0 件の表示：初回の 0 件は見出し右の主ボタンと同じ名前のボタンを置かない（home 型。決定 9）。invoices・clients・report が対象。

**移すときの順（依存の少ない順）**：①文言（terms から引く）→②URL の値（`useUrlParam`・`paginate`）→③読み（`lib/normalize`）→④保存（`fakeSave`）→⑤離れる窓（`dirty`）→⑥部品（`Radio`・`TextField`・`StaleNotice`・`disabled`）→⑦`copy.ts` へ名前を変える→⑧番人の一覧から行を消す。

## 1. 画面ごとの置き換え

件数は「置き換える行為」の数。行数は今のファイルの行数。「消せる」は、置き換え後にファイルごと消える物。

### client-form（SCR-006）：6 件、消せるファイル 4（107 行）＋部分 約 30 行

| # | 今のファイル・行 | 置き換え先 | 消せるファイル |
| --- | --- | --- | --- |
| 1 | `useLeaveGuard.ts`（38 行。`targetOf`・capture の click）、`LeaveDialog.tsx`（28 行）、`index.tsx:10,16,42,46-53,79`（`leaving` の state と窓）、`texts.ts` の `leave`（保存して離れますか／入力に戻る…） | AppShell の `dirty={form.dirty && !form.saving}` と `onSaveBeforeLeave={…submit(同じ画面)→成功か}`。窓は骨格が出す（terms の文言） | `useLeaveGuard.ts` `LeaveDialog.tsx` |
| 2 | `validate.ts:9,10,12,17,19,22,29-34,54,59,64,94`（`halfDigits`・`hasWide`・`katakanaOf`・`normalize('NFKC')`）、`useClientForm.ts:98-118`（`note`） | `lib` の `toHalf`・`toHalfDigits`・`wasWidened`・`toKatakana`。知らせは `messages.widened`。郵便番号の 7 桁・かなの形の検査は画面に残す | — |
| 3 | `save.ts`（10 行。`SAVE_MS`・`saveClient`）、`useClientForm.ts:10,162,177`（`await saveClient`・元に戻す） | `fakeSave(client, { outcome: outcomeOf(state) })`。失敗は値（`ok:false`）で受け、`saveFailed` を立てる（例外にしない） | `save.ts` |
| 4 | `AddressChoice.tsx`（31 行）、`index.tsx` の使用 1 か所 | `RadioGroup legend={…}` ＋ `Radio variant="plain"`（当たり 44px は部品が持つ） | `AddressChoice.tsx` |
| 5 | `texts.ts`（75 行）→ `copy.ts`。`busy.save`・`saveFail.*`・`leave.*`・`note.half` を terms へ | `messages.saving`・`saveFailed`・`widened`・`leave`、`actions.backToInput`（入力に戻る）・`discardAndLeave`・`saveAndLeave` | （名前を変える） |
| 6 | `index.tsx` の `STATES`、`client-form.test.tsx` | `save_failed` を足す。`zip_error` とは別（住所の補完の失敗ではなく、登録・保存の失敗） | — |

### clients（SCR-005）：6 件、消せるファイル 1（43 行）＋部分 約 20 行

| # | 今のファイル・行 | 置き換え先 | 消せるファイル |
| --- | --- | --- | --- |
| 1 | `useListQuery.ts`（43 行。`readUrl`・`writeUrl`・popstate）、`index.tsx:13,23` | `useUrlParam('q')`・`useUrlParam('sort', DEFAULT_SORT)`・`useUrlParam('page', '1')`＋`paramNumber`。条件を変えたらページを 1 に戻すのは `replaceParams({ q, sort, page: null })` で 1 度に | `useListQuery.ts` |
| 2 | `model.ts:23,59-64`（`PAGE_SIZE`・`lastPage`・`pageOf`）、`index.tsx:12,29,82-84` | `paginate(rows, page)`（`Paged`：rows・page・last・paged）と `ui` の `Pagination`（`pageSize` を渡さない） | — |
| 3 | `index.tsx:57-63`（stale の Notice）、`copy.ts:15,19,24`（`refreshing`・`staleBody`・`staleTitle`） | `StaleNotice asOf retry retrying`（子に `copy.staleBody` のまま「未入金額は更新前の金額です」）、`RefreshingNote`（子に「並び順とページは変えられません」） | — |
| 4 | `ListControls.tsx:44-48`・`index.tsx:83-85`（`fieldset disabled` で代用） | `Segmented`・`Select`・`Pagination` の `disabled` | — |
| 5 | `model.ts:41`（NFKC＋かな→カタカナ＋空白除去） | `foldForSearch(query)` と `foldForSearch(name)` を比べる | — |
| 6 | `index.tsx:49-53`（初回 0 件：`action` に「取引先を登録する」＝主と同名） | 文中リンク（`Link inline`）に。`copy.empty.description` を「取引先を登録すると…」の文＋リンクの形に | — |

### home（SCR-001）：1 件（変更が最小。home は 0 件の標準の形のもとになった画面）

| # | 今のファイル・行 | 置き換え先 | 消せるファイル |
| --- | --- | --- | --- |
| 1 | `sampleVariants.ts:1,40`（`makeManyInvoices(240)` を各自で呼ぶ） | 変えなくてよい（`filter` している）。many の共有は `manyInvoices()` を使えるが、home は絞って使うので必須ではない | — |

### invoice-detail（SCR-004）：6 件、消せるファイル 1（22 行）＋部分 約 75 行

| # | 今のファイル・行 | 置き換え先 | 消せるファイル |
| --- | --- | --- | --- |
| 1 | `usePageParam.ts`（22 行）、`LinesSection.tsx:5,19` | `const [pageRaw, setPage] = useUrlParam('page', '1')`＋`paramNumber`（`replaceState` ＋ 偽の popstate をやめる） | `usePageParam.ts` |
| 2 | `LinesSection.tsx:7,21-24,29`（`PAGE_SIZE = 20`・`last`・`slice`） | `paginate(invoice.lines, page)` と `Pagination` | — |
| 3 | `parse.ts:9-60`（`half`・`hadFullWidth`・`validYmd`・`ERA_BASE`・`parseDate`・`parseAmount`・`normalizeDate`・`normalizeAmount`）、`RecordDialog.tsx:7,49-50,62-63,71` | `readDate`（`kind` で empty/bad/ok）・`readYen`・`settleDate`・`settleYen`・`wasWidened`。`checkPaidOn`・`checkAmount`・`validateRecord`（誤りの文）は画面に残す（約 40 行）。挙動の違いは 0 の 2 | （`parse.ts` の 約 45 行） |
| 4 | `operations.ts:45-62`（`wait`・`makeService(600)`） | `fakeSave(値, { outcome })` で作る（`Service` の型は残してよい）。テストの `makeService(0)` は fake timers に | — |
| 5 | `windows.ts`（81 行）→ `copy.ts`。`下書きを削除する` は `actions.deleteDraft`（`windows.ts`・`ConfirmDialog.tsx`） | terms から引く | （名前を変える） |
| 6 | `index.tsx` の `STATES` | `save_failed` を足す（送る・記録・取り消し・削除のどれの失敗かは文言で分ける。`saving` が 4 種を 1 つの名前で受けているのと同じ） | — |

### invoice-new（SCR-003）：7 件、消せるファイル 5（139 行）＋部分 約 40 行

| # | 今のファイル・行 | 置き換え先 | 消せるファイル |
| --- | --- | --- | --- |
| 1 | `useLeaveGuard.ts`（34 行）、`LeaveDialog.tsx`（24 行。「編集に戻る」）、`useInvoiceForm.ts:173-176,199`（`askLeave`・`stay`・`leaveWithout`・`leaveWithSave`）、`flow` の `leave` の種類、`index.tsx:13,26-27`、`InvoiceForm.tsx:10,111` | AppShell の `dirty={form.dirty && flow.kind === 'editing'}` と `onSaveBeforeLeave`（`check('draft')` が通れば `runDraft` を await して true）。「編集に戻る」は「入力に戻る」に（決定 9） | `useLeaveGuard.ts` `LeaveDialog.tsx` |
| 2 | `dateInput.ts`（46 行。`readDate`・`wasAdjusted` は lib の元になった物） | `lib` の `readDate`・`ReadDate`・`wasWidened`・`settleDate`。テストの import（`invoice-new.test.tsx:7`）を `lib` に | `dateInput.ts` |
| 3 | `numberInput.ts`（25 行） | `readYen(text, MAX_AMOUNT)`・`readQuantity(text, MAX_QUANTITY)`・`ReadNum`。テスト import（`:9`）を `lib` に | `numberInput.ts` |
| 4 | `formLogic.ts:2,4,14,23-39`（探す語の NFKC・かな）、`DateField.tsx:26`・`LineItem.tsx:37,48`（「半角にそろえました」の直書き 3 か所） | `foldForSearch`、`messages.widened`（`TextField` の `note` でも可） | — |
| 5 | `save.ts`（10 行。`WAIT_MS`・`fakeSave`・`SaveFn`）、`index.tsx:10,46` | `data` の `fakeSave`。`save` を注入する形（テスト）は `useInvoiceForm` の引数のまま、既定を `fakeSave` を包む関数に | `save.ts` |
| 6 | `index.tsx:46`（保存しています）、`InvoiceForm.tsx` の `保存できませんでした…`、`LeaveDialog.tsx`（保存しています） | `messages.saving`・`messages.saveFailed` | — |
| 7 | `index.tsx` の `STATES` | `save_failed` を足す（`draftFailed`・`failed: true` の 2 つの出し方を 1 つの状態名で受ける） | — |

### invoices（SCR-002）：8 件、消せるファイル 0（約 25 行消える）＋部分 約 35 行

| # | 今のファイル・行 | 置き換え先 | 消せるファイル |
| --- | --- | --- | --- |
| 1 | `useInvoiceQuery.ts`（41 行。`known` の ref・popstate の取り直し・`replaceState`）、`index.tsx:12,33` | `useRoute()` で URL を読み、書くときは `replaceParams(withQuery…)`。`query.ts:62,76`（`parseQuery`・`withQuery`）は純粋な関数なので残す。フックは約 15 行に | （約 25 行） |
| 2 | `query.ts:9,122-125`（`PAGE_SIZE`・`pageOf`）、`index.tsx:11,39,87-89` | `paginate`、`Pagination`（`pageSize` を渡さない） | — |
| 3 | `index.tsx:67-76`（stale の Notice と「請求書の一覧を更新しています」） | `StaleNotice`・`RefreshingNote` | — |
| 4 | `index.tsx:88-90`（`fieldset disabled={refreshing}`） | `Pagination disabled={refreshing}` | — |
| 5 | `query.ts:100`（`normalizeForSearch`） | `foldForSearch` | — |
| 6 | `index.tsx:23-24`（`manySample ??= makeManyInvoices()`） | `data` の `manyInvoices()` | — |
| 7 | `index.tsx:50`（初回 0 件。見出し右の主と同名の「請求書を作る」ボタンを重ねている） | 文中リンクだけに（home 型。決定 9） | — |
| 8 | `InvoiceTable.tsx`（span の中の div で S-01 不合格） | **画面の変更なし**（`DataTable` が直った）。ui-audit を再実行して確かめる | — |

### payments（SCR-007）：8 件、消せるファイル 2（58 行）＋部分 約 40 行

| # | 今のファイル・行 | 置き換え先 | 消せるファイル |
| --- | --- | --- | --- |
| 1 | `useUrlParam.ts`（19 行）、`index.tsx:17,38-39` | `app/nav` の `useUrlParam('pay')`・`useUrlParam('page', '1')`（戻りが `string`＋既定なので、`null` 判定を既定の値の判定に） | `useUrlParam.ts` |
| 2 | `CandidateOption.tsx`（39 行）、`MatchPanel.tsx:55,74-77,86-90`（fieldset×2＋ラジオ） | `RadioGroup`＋`Radio variant="card"`（`label`＝請求書番号と取引先、`description`＝請求額と期限、`note`＝合う理由と差額） | `CandidateOption.tsx` |
| 3 | `index.tsx:23,58-60,140-141`（`PAGE_SIZE`・`lastPage`・`slice`） | `paginate`、`Pagination` | — |
| 4 | `index.tsx:94-104`（stale の Notice と更新中の `p#LOCK_ID`）、`words.ts:65,66,82`（`refreshing`・`staleBody`・`staleTitle`） | `StaleNotice`（外側の `div#LOCK_ID` は残す）・`RefreshingNote id={LOCK_ID}`。子に「新しい内容を読み込むまで、入金を確認できません」 | — |
| 5 | `useReconcile.ts:5,24,38`（`SAVE_MS`・`later(fn)`） | `fakeSave(…, { outcome: partial ? … })`。一部失敗（`partial`）は `ok:false` を集める形に | — |
| 6 | `logic.ts:36`（`fold`） | `foldForSearch` | — |
| 7 | `words.ts`（111 行）→ `copy.ts` | （名前を変える。保存しています・読み込んでいます等は terms） | （名前を変える） |
| 8 | `index.tsx` の `STATES`、`payments.test.tsx` | `save_failed` を足す（確認の送信全体の失敗。`partial`＝一部失敗とは別） | — |

### report（SCR-008）：8 件、消せるファイル 1（20 行）＋部分 約 25 行

| # | 今のファイル・行 | 置き換え先 | 消せるファイル |
| --- | --- | --- | --- |
| 1 | `useUrlParam.ts`（20 行）、`index.tsx:19,37-38` | `app/nav` の `useUrlParam('period', '12m')`・`useUrlParam('page', '1')`＋`paramNumber`。`parsePeriod` は画面に残す | `useUrlParam.ts` |
| 2 | `aggregate.ts:10`（`PAGE_SIZE`）、`ClientTable.tsx:5,26-27,33` | `paginate`・`Pagination` | — |
| 3 | `index.tsx:95-107,140-145`（stale・更新中）、`texts.ts:36,44-45` | `StaleNotice`（子の `span#exportNoteId` は残す）・`RefreshingNote`（子に「この間は、表を書き出せません」を足すかは設計書で決める） | — |
| 4 | `index.tsx:131-135`（`fieldset disabled={locked}` で Segmented を囲む） | `Segmented disabled={locked}`（`Field` の `aria-describedby` も Segmented が受ける） | — |
| 5 | `MonthlyChart.tsx:138`・`texts.ts:64`（`formatMonthOnly` に「月」が重なって「6月月」） | **画面の変更なし**。土台の `formatMonthOnly`（＝`monthName`）が「6月」を返すように直った。テストを 1 つ足す（図のラベルに「月月」が出ない） | — |
| 6 | `manySample.ts:26-33`（`makeManyInvoices(240)` を各自で呼ぶ） | 基は `manyInvoices()`（社の割り当てだけ画面に残す。約 5 行） | — |
| 7 | `index.tsx:128`（初回 0 件の `action`＝主と同名） | 文中リンクのみ（決定 9） | — |
| 8 | `texts.ts`（69 行）→ `copy.ts` | （名前を変える） | （名前を変える） |

### settings（SCR-009）：7 件、消せるファイル 3（104 行）＋部分 約 55 行

| # | 今のファイル・行 | 置き換え先 | 消せるファイル |
| --- | --- | --- | --- |
| 1 | `useLeaveGuard.ts`（42 行。`moveOf`・`current` 引数）、`LeaveDialog.tsx`（26 行）、`useSettingsForm.ts:7,56`、`useSaveFlow.ts:93-100,129`（`askLeave`・`leaveDiscard`・`leaveSave`・`dialog.kind==='leave'`）、`index.tsx:7,55`、`words.ts` の `leave` | AppShell の `dirty={flow.dirty && !flow.saving}`、`onSaveBeforeLeave={…保存して成功か}`。順は 離れる→入力に戻る→保存して離れる（設計書 D-05 の順を直す）。「やめる」（`actions.cancel`）は使わない | `useLeaveGuard.ts` `LeaveDialog.tsx` |
| 2 | `TextField.tsx`（36 行。`form`・`name`・`FIELD` から引く） | `ui` の `TextField`（`label`・`hint`・`error`・`required`・`mark`・`note`・`value`・`onChange(v)`・`onBlur`・`rows`）。`fields.ts` から値を渡す薄い呼び出しに（`CompanyPanel` などの各所で 1 行） | `TextField.tsx` |
| 3 | `useSettingsForm.ts:10-20`（タブを `replaceState`）、`tabs.tsx` | `useUrlParam('tab', 'company')`。`Tabs disabled={saving}` | — |
| 4 | `model.ts:15,16,28-30,36`（`hyphens`・`normalize`・`widenedToAscii`） | `toHalf`・`toHalfDigits`・`wasWidened`。欄ごとの規則（郵便番号の形・登録番号の `T`・大文字）は画面に残す | — |
| 5 | `scenario.ts:33-37`（`setTimeout`＋`SAVE_MS`）、`index.tsx:9,63`、`useSaveFlow.ts` | `fakeSave(値, { outcome, theirs })`（`conflict` は `ok:false, reason:'conflict', theirs`） | — |
| 6 | `words.ts`（50 行）→ `copy.ts`。`widened`・`saving`・`saveFailed`・`leave`・`useTheirs`（相手の内容を使う）・`overwriteSave`（上書きして保存する） | terms の `messages`・`actions` | （名前を変える） |
| 7 | `index.tsx` の `STATES` | `save_failed` を足す。「発行」の指摘は `screens.yaml` の `allow` で解消済み（画面は変えない）。Tabs の応答（A-01 hover/press）は部品で解消済み。ui-audit を再実行して確かめる | — |

### setup（SCR-010）：5 件、消せるファイル 2（49 行）＋部分 約 12 行

| # | 今のファイル・行 | 置き換え先 | 消せるファイル |
| --- | --- | --- | --- |
| 1 | `TextField.tsx`（41 行。`StepProps`・`specOf`・`fieldCount`） | `ui` の `TextField`（段の欄の数は `markFor(spec.required, fieldCount(step))` を渡す）。sr-only の status 1 行は画面に残す | `TextField.tsx` |
| 2 | `saveSetup.ts`（8 行）、`useSetupFlow.ts:11,89` | `fakeSave(values, { outcome: outcomeOf(state) })` | `saveSetup.ts` |
| 3 | `model.ts:65,96`（`half`・`needsNote`）、`useSetupFlow.ts:8,52` | `toHalf`・`wasWidened`（`needsNote` は `wasWidened`） | — |
| 4 | `copy.ts`：`next`（次へ進む）・`prev`（前の段へ戻る）・`normalized`・`saving`・`saveFailed` | `actions.next`・`actions.prev`・`messages.widened`・`saving`・`saveFailed` | — |
| 5 | `index.tsx` の `STATES` | `save_failed` を足す。離れる窓は持たない（F-09 の対象外。`dirty` は渡さない）。 | — |

## 2. 数え

| 画面 | 件数 | 消せるファイル | ファイルごと消える行 | 部分で消える行（見込み） |
| --- | --- | --- | --- | --- |
| client-form | 6 | useLeaveGuard・LeaveDialog・save・AddressChoice | 107 | 約 30 |
| clients | 6 | useListQuery | 43 | 約 20 |
| home | 1 | — | 0 | 0 |
| invoice-detail | 6 | usePageParam | 22 | 約 75 |
| invoice-new | 7 | useLeaveGuard・LeaveDialog・dateInput・numberInput・save | 139 | 約 40 |
| invoices | 8 | — | 0 | 約 60 |
| payments | 8 | useUrlParam・CandidateOption | 58 | 約 40 |
| report | 8 | useUrlParam | 20 | 約 25 |
| settings | 7 | useLeaveGuard・LeaveDialog・TextField | 104 | 約 55 |
| setup | 5 | TextField・saveSetup | 49 | 約 12 |
| **計** | **62** | **16 ファイル** | **542** | **約 355** |

→ 消せる見込みは **約 900 行**（ファイルごと 542＋部分 約 355）。画面のテストを除く合計 7,902 行の約 11%。土台に足したのはテストを除いて +823／−147 行（正味 +676）なので、置き換え後の正味は約 220 行の減。行数よりも、同じ決めごとの別実装が 10 画面に散らばっていた状態が 1 か所になることが効く（変更シナリオの触る場所：`PAGE_SIZE` 5→1、保存の待ち 6→1、離れる窓 3→1、更新中の文 4→1、URL の値のフック 6→1）。

## 3. 置き換えたあとに確かめること
- `npm test` で `[todo]` の一覧が減り、最後に空になる。`UPLIFT_STRICT` を true に切り替えて通る。
- `npm run build`（1 枚 HTML の大きさ。いまは 約 491KB で目標 300KB 超え。置き換え後に減る見込みで、減らなければ別の議題）。
- ui-audit：hit-area-44（Radio・Tabs・窓の裏の誤検出を除く）、S-01（span の中の div）、A-01（Tabs の hover/press）、terms（「発行」の allow）、states-distinct、shell-nav が減っているか。report の `axe-serious`（color-contrast×167）は今回の対象外。
- 設計書（`app/docs/screens/*.md`）の「5 実装で変えたこと」に、置き換えた件数を 1 行。
