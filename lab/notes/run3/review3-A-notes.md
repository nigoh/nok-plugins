# 第3回 振り返り A：気づきの整理

番号は review3-notes.md を上から数えた通し番号（「--note」でつながった行は分けた。計 81 項目。見出しの 70 件は行数）。画面名は slug。点検は review3-audit.md。「保留」は 1 画面だけの物。

## 1. 束の一覧

| 束 | 原因 | 件 | 画面 | 穴の場所 |
| --- | --- | --- | --- | --- |
| B1 | 失敗の状態名が無い | 4 | 5 | states.md E-02、screens.yaml 語彙、trace-check |
| B2 | 離れる時の確かめの道具が無い | 5 | 3 | form.md F-09、土台 AppShell |
| B3 | 履歴を積まない移動が無い | 4 | 4 | 土台 nav.ts、flow.md W-06 |
| B4 | 部品の「押せない」・読み上げの口が無い | 6 | 5 | 土台 ui 部品 |
| B5 | 理論どうし・理論と要件の衝突 | 17 | 10 | L-03、E-05、F-01、W-26、G-11、F-09、requirements.md |
| B6 | 点検の誤検出 | 3（＋点検の 5 種） | 6 | ui-audit.py |
| B7 | 点検の不足 | 11（＋点検の 3 種） | 8 | trace-check、src-lint、ui-audit |
| B8 | 土台の雛形に無い物 | 19 | 10 | 土台 terms・useFake・sample・AppShell・画面内部品 |
| B9 | 法則・参照の言い足し | 11 | 6 | structure.md S-10、states.md E-02、color-state.md |
| — | 効いた物（記録のみ） | 1 | — | #14 |

効いた物 #14（層表・変更シナリオ表・D-05/D-13・W-29・A-01 の状態表）は削らない。未使用の法則（release.md 0/14 など）は今回の範囲の違いで、削る根拠にしない。

## 2. 原因ごとの提案

### B1 失敗の状態名が無い（#22 #52 #64 #75、#37 も）
- 出た画面：setup、invoice-detail、settings、invoice-new、client-form の 5 画面。保存・送る・取り消すの通信失敗を `?state=` で出せず、テストでしか再現できなかった。
- 穴：states.md E-02 の「足す共通の語（9 個）」に操作の失敗が無い。E-02 は「3 画面以上で起こる→共通の語に足す」と決めている。
- 直し：E-02 の表に 1 行、語彙表（templates/screens.yaml）と trace-check.mjs の STATES に `save_failed` を足す（土台担当、B-08）。
  - 文面「押した操作が通信で失敗（保存・送る・取り消す・記録）｜すべて `save_failed`。何の操作かは文言（「請求書を送れませんでした」）。入力は残し、押した所の近くに role=alert ＋もう一度（E-06・E-07）」

### B2 離れる時の確かめの道具が無い（#37 #65 #76 #77 #80）
- 出た画面：client-form、settings、invoice-new（同じ useLeaveGuard を 2 画面が別々に作り、3 画面目は document の capture で代用）。
- 穴：F-09 は規則だけで、土台の AppShell に戻り・メニューを止める口が無い。
- 直し：①土台に `useLeaveGuard(dirty)` を置き、AppShell の戻りとメニューがそれを通る。②F-09 に 1 行：「ブラウザの戻る・タブを閉じるは止められない（beforeunload のみ）。守るのは下書きの控え（F-09 の 2 行目）」。

### B3 履歴を積まない移動が無い（#20 #31 #48 #53）
- 出た画面：setup、invoices、report、invoice-detail。W-03（画面内の軽い切替は replace）は既にあるのに、土台の nav.ts に `go`（push）しか無く、3 画面が replaceState を自作した。
- 直し：①nav.ts に `replace(screen, extra)` と `useUrlParam(key)` を足す（手引き 3 にも）。②teamwork.md B-04「絞り込み・ページ・タブは URL に」→「…は nav.replace で」。③flow.md W-06 に 1 文：「削除のあと一覧へ移るのは replace（戻るで消えた物へ戻さない）」（#53）。

### B4 部品の「押せない」・読み上げの口が無い（#28 #29 #30 #51 #57 #71）
- 出た画面：clients、invoices、report で Segmented・Pagination に disabled が無く、fieldset disabled で代用（3 画面）。
- 穴：土台の ui 部品。fieldset 代用は見た目と読み上げが部品ごとにそろわない。
- 直し：ui 部品の入口の決まり（手引き 3）に「全部品は `disabled`・`aria-describedby`・名前を受ける」と書き、structure.test で部品ごとに確かめる。同時に Segmented の describedby（#71）。
- 保留：#29（DataTable の aria-sort）、#57（Stepper の「いま」）は 1 画面。

### B5 理論どうし・理論と要件の衝突（17 件、次の節）

### B6・B7 点検の道具（3 節）

### B8 土台の雛形に無い物（19 件）

| 入れる先 | 足す物 | 根拠 | 扱い |
| --- | --- | --- | --- |
| terms.ts の actions | 次へ進む・前の段へ戻る・下書きを削除する・相手の内容を使う・上書きして保存する・編集に戻る。端数処理の語 | #19 #53 #56 #66 #54（setup、invoice-detail、settings、invoice-new） | 足す |
| useFake | E-07 の自動 2 回再試行、filtered_empty のデータ、makeManyInvoices を同じ id にする | #44 #48 #32 #33（home、report、invoices） | 足す |
| AppShell | 下に固定する帯の高さを変数で測り、本文の下の余白に結ぶ。手引きに busyLabel は 7 字以内（#23。ui-audit で初めて見つかった） | #23 | 足す |
| parts/DataTable.tsx:52 | `span` を `div` に（span の中に画面の div.flex が入り、S-01 が invoices と payments で不合格） | audit | 直す（実害） |
| 画面内の小部品の ID | 「CMP は 2 画面以上で使う物だけ。画面内の物は ID を付けず `data-part`」を B-04 と screens.yaml に | #41 #55 #72（home、invoice-detail、settings） | 決める（第 5 節） |
| 入力の保存先 | `useDraft(key)`（メモリ）。F-09 の控えもこれ | #21 #80 | 保留（2 画面） |

### B9 法則・参照の言い足し（#5 #7 #10 #16 #27 #39 #58 #59 #68 #79 #81）
- #5：`--dur-spin`・`--delay-wait` は motion.md と tokens.css に既にある。確認のみ。
- #7：structure.md S-10 に 1 行：「置き場所が幅で変わるときは CSS の order でなく、useMedia で DOM ごと替える。matchMedia が無い環境では狭い側を既定にする」。
- #10：E-02 に「`部位_共通語`・`step_n`・`mode_*`・`status_*` は extra_states に書かなくてよい」と書き、trace-check がそれを許す。
- #16：color-state.md C-?? の「80% 以上」に「札が 6 枚以上の一覧だけ。5 枚以下は数えない」。
- #27：teamwork.md B-05 の手引きに「状態ごとに AppShell の主・副を替える例（読み込み中だけ別の枠にしない）」。
- #81：structure.md S-06 の変更シナリオ表「欄を足す」を設計 4 か所→5 か所（fields.ts の欄の数と LineItem の表示が型に出ない）。

## 3. 衝突を 1 つずつ（B5）

「正」は私の推奨。根は共通で、要件が部品名・ボタン名・字数を書いてしまうこと（#60 #63 #34 #62）。requirements.md に **R-19「要件にボタンの文字・部品名・字数を書かない。名前が要るときは『呼び名の案』と書き、画面設計で L-03 などに合わせる」**を足す。

| # | 衝突 | 画面 | 正 | 直し（文面） |
| --- | --- | --- | --- | --- |
| 1 | L-03 の 9 字と REQ-022「差額を手数料として確認する」13 字（#60）。L-03 と L-05（窓の題と主ボタンは同じ動詞）で 10 字超（#69） | payments、settings | L-03 | REQ-022 を「差額を確認する」にし、手数料の意味は窓の項目で言う。L-05 に「題は名詞でもよい（番号の付け方）。主ボタンは L-03 の 9 字以内の動詞」。やむを得ない長い名は L-03 に「要件が名前を指定したときは画面の words に理由 1 行、375px で縦積み（D-05）」 |
| 2 | 主ボタンは 1 つ（D-04）と、E-05 の初回 0 件で作る導線を主にする（REQ-001）（#35 #40） | home、invoices | D-04 | E-05 に追記「初回の 0 件：見出し右の主を出さず、案内側の導線を主にする（同時に主は 1 つ）。片付いた 0 件：作る導線は出さない」 |
| 3 | F-01（項目 9〜20 は節）と REQ-025（区分で切り替える）（#62） | settings | 要件 | F-01 に行「要件が区分で切り替えると指定→D-01 の切替（タブ）。節分けは区分の中」。#34（REQ の CMP-010 と D-01 の Select）も同じ根：screens.yaml に「components は D-01 で選んだあとに書く」 |
| 4 | W-26（段は push）と REQ-027（画面内の切り替えは積まない）（#18） | setup | W-26 | W-26 に「段の移動は push。同じ段の中のタブ・絞り込み・ページは replace（W-03）」。REQ-027 は「段の移動を除く」と言い直す |
| 5 | G-11（13 行以上は畳む）と REQ-023（取引先の全件表）（#49） | report | 要件 | G-11 に「表が要件の主役（全件を見る）なら畳まない。畳むのは図の補助の表」 |
| 6 | F-09 の副「戻る」と L-03「やめる」（#73） | invoice-new | F-09 を直す | F-09 の窓：主「保存して離れる」・「保存せず離れる」・副「編集に戻る」。L-03 の表にも同じ行（戻りのリンクと取り違えない） |
| 7 | REQ-025「スイッチ」と D-02・I-23（保存で確定する 2 択はチェック）（#63） | settings | D-02 | R-19 で要件から部品名を外す |
| 8 | E-09「上書きする」と新規に上書き先が無い（#74） | invoice-new | E-09 | E-09 に「新規で参照先が先に変わった→『この内容で保存する』『新しい○○を使う』」。保留（1 画面） |
| 9 | G-05（小数の円を出さない）と「100.5円」の例（#70） | settings | G-05 | G-05 に「操作の説明の例だけ小数の円を可」。保留（1 画面） |
| 10 | 済み：D-06 と taste の 15px（#1）、期限超過・下書きの調子（#2 #3）、回る絵と A-04（#4）、D-05・S-10・PC の三つ巴（#6） | home 他 | README「先に決めた答え」1〜4 | taste.md 本体が 16px・draft・「回すのは処理中のボタンだけ」に直っているかを確認 |

## 4. 点検の道具への直し

### 誤検出（ui-audit.py、B6）
| 検査 | どう直す | 根拠 |
| --- | --- | --- |
| hit-area-44 | 窓（`[aria-modal=true]`）が見えている間は窓の外の要素を対象から外す（inert・aria-hidden の祖先も）。窓の裏は elementFromPoint が覆いに当たる | 5 画面 5 件。5 件とも幅は 44 以上 |
| A-01-hover・press | `aria-selected=true`・`aria-current`・`aria-pressed=true` は飛ばす。SNAP に `scale`・`translate`・`rotate` を足す（Tailwind v4 の scale は transform に出ない）。press は「乗せたとも元とも違う」で判定し、motion.md A-01 に「押下は乗せたと別の見た目」と明記 | settings の 3 件、#11 |
| terms | screens.yaml の terms に `allow: ["適格請求書発行事業者"]` を持たせ、ui-audit と terms.test.ts が同じ許可を読む。words.md L-01 に 1 行 | settings 5 件、#24 |
| shell-nav | 数える対象を `header nav` と `[data-shell-nav]` だけにする（`nav[aria-label] a` は本文の関連リンクを拾う） | report「請求書の一覧を見る」 |
| states-distinct | 文字数でなく整えた本文のハッシュで比べる | invoice-detail 1 組 |
| axe-serious | 同じ原因の数（167）を（規則、色の組）でまとめ、上位 3 つの selector と色を出す。実害か判断できるようにする。実害かどうかは未確認 | report |

### 不足（B7）
| 道具 | 足す検査 | 根拠 |
| --- | --- | --- |
| trace-check | sources.requirements がファイルも読む（isFile なら直接）。templates のコメントも「フォルダかファイル」に | #8 |
| trace-check | `data-scr` の文字に加え、画面の `id: 'SCR-nnn'`（B-04 の書き方）も拾う。コメントの中は除いてから探す | #9 |
| trace-check | 見本ページは `SCR-000: {kind: sample}` と書けば切れ目にしない | 点検の切れ目 1 |
| trace-check | `部位_共通語`・`step_n`・`mode_*`・`status_*` を語彙に自動で入れる（B9 #10）。#17 の正規表現は現行 `[a-z0-9_]+` で直っている | #10 #17 |
| ui-audit | `--only <slug>` と出力先を指定できるようにする。画面の一覧から全画面を撮るので、他人の未完成を巻き込む | #25 |
| ui-audit | 下に固定した帯が最後の操作を隠さないか（末尾までスクロールして、帯の上端と比べる） | #23 |
| ui-audit | 本文の単位の重なり `/([月日年円件％])\1/`（「6月月」は目で見つかった。formatMonthOnly が月を 2 度付けた） | 点検 |
| src-lint | structure.test に自作した物を取り込み、画面ごとに出す：DAT-03（`?? 0`、全体 3 か所の予算でなく画面ごと）、画面の .ts の全角直書き、層の向き。他人の失敗を巻き込まない `--only` | #15 #36 #50 #61 |
| src-lint | ビルドの重さ：screens.yaml targets に `bundle_kb: 300` を数値で書き、超えたら fail（485KB が通った） | #46 |
| src-lint | 層の向き 2 件（ui/Money・Pagination が data/format を取り込む）は道具が正しい。規則側を決める（第 5 節） | 点検 |

#13 は templates に書式が既にあり済み。#47（report.md が書けない）は実行環境の問題で、スキル側の直しは無い。

## 5. 保留（1 画面だけ）
#26 #29 #38 #39 #42 #43 #45 #57 #58 #59 #67 #68 #70 #74 #77 #78 #79 #80。次回も出たら法則にする（#38 #42 #43 #45 #67 は要件側で決める）。

## 6. 人に決めてもらう点

1. **要件と法則が食い違ったときの正**
   - A：要件が見た目（ボタン名・部品・字数）を書かない（R-19）。食い違えば法則（L-03・D-02）を正にし、要件を直す〔推奨〕
   - B：要件を正にし、法則に「要件が指定したら」の例外を足す（F-01・G-11 型）
   - 推奨は A。ただし F-01・G-11 のように「全件の表」「区分で切り替え」は要件の中身そのものなので、B の例外を足す。
2. **層の向き：ui/Money・Pagination が data/format を取り込む**
   - A：整形の関数だけ `lib/` に出し、ui も data も読める〔推奨〕
   - B：src-lint で ui→data/format だけ許す
   - C：ui 側に整形を複製する
3. **画面内の小部品に CMP-ID を付けるか**（3 画面で出た）
   - A：2 画面以上で使う物だけ CMP、画面内は `data-part`〔推奨〕
   - B：全部に CMP を付け、使わない CMP は点検で許す
4. **失敗の状態名**
   - A：`save_failed` を 1 語足す〔推奨〕
   - B：操作ごとに分ける（send_failed・record_failed など）
   - C：状態にせず、テストだけで確かめる
5. **土台に上げるもの**（useLeaveGuard、nav.replace、disabled、再試行）：今回の 10 画面に反映するか、次回の土台に入れるか。
