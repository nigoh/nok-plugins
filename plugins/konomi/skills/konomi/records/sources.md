# 出どころ（理論ごと）

理論の本から移した。作るときは読まない。数値や指針を確かめ直すときに開く。

## color-state

### color-state.md から移した節（sources）

### 出どころ

確かめたもの：

- WCAG 2.2（1.4.1・1.4.3・1.4.11）：https://www.w3.org/TR/WCAG22/
- WCAG 2.2 解説 非テキストのコントラスト：https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- GOV.UK Design System「タグ」：https://design-system.service.gov.uk/components/tag/
- スコットランド政府「状況の札」：https://designsystem.gov.scot/components/status-tag
- NN/g「Indicators, Validations, and Notifications」：https://www.nngroup.com/articles/indicators-validations-notifications/
- デジタル庁 ダッシュボードのガイドブック「カラーパレット」：https://www.digital.go.jp/resources/dashboard-guidebook/color-palette

確かめていないもの：14px 太字は WCAG の「14pt 太字」からの換算。藍の面積、札の数 5・10・80%、系列 5 は〔目安〕。

## data

### data.md から移した節（sources）

### 出どころ

- GOV.UK Design System「Table」（右揃え、`scope`）https://design-system.service.gov.uk/components/table/ ／ NHS service manual「Table」（`aria-sort`）https://service-manual.nhs.uk/design-system/components/table
- Nielsen Norman Group「Choosing Chart Types」（比較は棒、推移は線、関係は点、円は読みにくい）https://www.nngroup.com/articles/choosing-chart-types/
- Apple HIG「Charts」https://developer.apple.com/design/human-interface-guidelines/charts.md、「Charting data」https://developer.apple.com/design/human-interface-guidelines/charting-data.md（0 の下限、目盛り、要約、評価の語を避ける）
- WCAG 2.2 理解 1.4.1（色だけにしない）https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html ／ 理解 1.4.11（線は 3:1）https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- 未確認：デジタル庁デザインシステムのデータ表現の頁（取得失敗）、公用文の数字の書き方、〔目安〕の数値、U+2212・万円・和暦・BOM の扱い。

## decisions

### decisions.md から移した節（sources）

### 出どころ

- タブは内容を見比べる必要があるときには向かない、タブの数は 6 個までが目安、パソコンでは複数を同時に開く必要のない内容の多いページに畳む部品を使う：Nielsen Norman Group「Tabs, Used Right」「Tabs vs. Accordions」と、それを引く各デザインシステムの指針。
- 正確な値には入力欄、2 択にはスイッチかラジオ、スライダーにはいまの値の表示と別の入力手段を添える、指を離すときに値がずれやすい：PatternFly、Calgary Summit、Semrush Intergalactic（Nielsen Norman Group を引用）のスライダーの指針。
- 本文の行の高さは文字の 150% 以上、操作できる要素の大きさは定めた下限を割らない：デジタル庁デザインシステム。
- 〔原理〕の P-2・P-3・P-4 は、それぞれヒックの法則、フィッツの法則、ゲシュタルトの近接・整列。数値を持たない考え方として使う。
- 〔目安〕の数値（比 1.125、4〜5 段、左端 3 本、上は下の 2 倍、30〜40 字）は、一次情報で確かめていない。実物で外れたら直す。
- 〔試作〕は第 2 回の試作 10 画面の気づきと計測から決めた。14px・12px・812px も試作の値で、公開された指針では確かめていない。

## form

### form.md から移した節（sources）

### 出どころ（開いて確かめたもの）

- WCAG 2.2 理解 3.3.7 冗長な入力：https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html
- 同 2.5.5 ターゲットのサイズ（44×44 CSS px と例外）：https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html
- 同 1.3.5 入力目的の特定（本人の情報でない入力は対象外）：https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html
- GOV.UK エラー一覧：https://design-system.service.gov.uk/components/error-summary/
- GOV.UK 質問のページ：https://design-system.service.gov.uk/patterns/question-pages/
- GOV.UK テキスト入力：https://design-system.service.gov.uk/components/text-input/
- NN/g Errors in Forms Design Guidelines：https://www.nngroup.com/articles/errors-forms-design-guidelines/
- デジタル庁デザインシステム テキストインプット：https://design.digital.go.jp/dads/components/input-text/usage/（「編集不可」は概要ページ）

確かめていない物：〔目安〕の数値、WCAG 2.5.7、電話の保存形式。

## motion

### motion.md から移した節（sources）

### 出どころ

- 0.1 秒・1 秒・10 秒：Jakob Nielsen「Response Times: The 3 Important Limits」（Nielsen 1993。Miller 1968、Card ほか 1983 にもとづく）。
- 動きの長さは 100〜500ms、チェックやスイッチは約 100ms、窓の出入りは 200〜300ms、400ms は大きな移動だけ、長すぎる失敗のほうが多い：Nielsen Norman Group「Executing UX Animations: Duration and Motion Characteristics」。
- 入るものは減速、出るものは加速：Material Design の easing の指針と、それに沿う各デザインシステム。
- 1 秒を超えたら進み具合を示す、回る印は 2〜10 秒、10 秒を超えたら割合を示す、骨組みの表示は 10 秒未満の待ちに使う：Nielsen Norman Group「Progress Indicators」「Skeleton Screens 101」。骨組みの表示がかえって長く感じられたという比較もあり、効果は割れている。
- 自動で始まり 5 秒を超える動きに止める手段を付ける：WCAG 2.2.2。条文は使う前に確かめる。
- WCAG 2.2：2.5.8（押す範囲 24px）、2.5.7（ドラッグ以外の手段）、1.4.11（輪の対比 3:1）、2.3.1（点滅）。例外は条文で確認。
- 〔目安〕の数値（表示を出すまで 0.3〜0.5 秒、出したら 0.5 秒保つ、ずらし 30〜50ms、2% の縮み、44px、余韻 1〜2 秒、イージングの曲線）は一次情報で確かめていない。実物で外れたら直す。

## states

### states.md から移した節（sources）

### 出どころ

確かめたもの（2026-11-14 に取得）：

- WCAG 2.2 理解 3.3.4 誤りの防止：https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html
- 同 3.3.7 冗長な入力：https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html
- 同 2.2.1 時間制限の調整：https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html
- 同 4.1.3 ステータスメッセージ：https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- NN/g「Designing Empty States in Complex Applications」：https://www.nngroup.com/articles/empty-state-interface-design/
- NN/g「10 Usability Heuristics」：https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g「Confirmation Dialogs Can Prevent User Errors」：https://www.nngroup.com/articles/confirmation-dialog/
- GOV.UK Design System「Error message」：https://design-system.service.gov.uk/components/error-message/

〔目安〕の数値（再試行 2 回と 1・3 秒、3 回続けて失敗、2 分前、10 回／日、5 件、5 個）は確かめていない。「元に戻す」10 秒は第3回の土台（Toast）の値。

## structure

### structure.md から移した節（sources）

### 出どころ

- 押せる要素の中に押せる要素を入れられないこと、段落・ボタン・見出しが文章の中身（phrasing content）しか持てないこと：WHATWG HTML Living Standard の各要素の content model（Rocket Validator、DockYard「Why Buttons Don't Like Divs」で確認）。
- T-2（単一責任）、T-3（DRY）、T-4（早すぎる抽象化を避ける。3 回目でまとめる）は、ソフトウェア設計で広く使われる原則。
- 〔目安〕の数値（3 か所目で切る、真偽値 3 つまで、触る場所 1〜2 か所）は一次情報で確かめていない。実物で外れたら直す。

## teamwork

### teamwork.md から移した節（sources）

### 出どころ

- コンウェイの法則：Martin Fowler「Conway's Law」 https://martinfowler.com/bliki/ConwaysLaw.html
- 持ち主と承認：GitHub Docs「About code owners」 https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- 部品を足す条件：GOV.UK Design System「Contribution criteria」 https://design-system.service.gov.uk/community/contribution-criteria/
- 約束をテストで知る：Martin Fowler「Contract Test」 https://martinfowler.com/bliki/ContractTest.html

## words

### words.md から移した節（sources）

### 出どころ

- 同じ命令は同じ文言、動詞で始める、「OK」を避ける：Nielsen Norman Group「UI Copy」https://www.nngroup.com/articles/ui-copy/
- 誤りは近くに、具体的に、直し方を示し、責めず、入力を残す：同「Error-Message Guidelines」https://www.nngroup.com/articles/error-message-guidelines/
- 「何が起きたか」と「どう直すか」、欄と一覧で同じ文、「please」「sorry」「invalid」を使わない：GOV.UK Design System「Error message」https://design-system.service.gov.uk/components/error-message/
- 読み上げ名は見える文言を含む（2.5.3）：WCAG 2.2 Understanding「Label in Name」https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html
- リンクは目的を言う（2.4.4）：同「Link Purpose (In Context)」https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html
- 誤りの修正案（3.3.3）：同「Error Suggestion」https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html
- ひらく語、句読点、算用数字と桁区切り、「3か所」：文化庁「公用文作成の考え方」https://www.bunka.go.jp/seisaku/bunkashingikai/kokugo/hokoku/pdf/93651301_01.pdf
- 確かめていない物：デジタル庁デザインシステムは、開いたページに文言の規則が無く使っていない。〔目安〕の数値（3〜9 字、5・8・9 字の上限、16・20・40 字）、日付の形式、敬語の使い分けは一次情報で確かめていない。
