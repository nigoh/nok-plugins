# 第3回の点検結果（合流後）

- build 成功（1 枚 485KB／gzip 147KB。目標 300KB 超え）。テスト 525 件通過。土台の書き換え 0（差分で確認）。
- trace-check：要件 28／画面 10／部品 31／状態 91、切れ目 1（見本ページ SCR-000 が一覧に無い）。
- src-lint：不合格 2（ui/Money・ui/Pagination が data/format を取り込む＝層の向き）。
- 目で見つけた不具合：売上レポートの図のラベルが「6月月」。
- 売上レポートは設計書が書けなかった（ファイル名 report.md が実行環境に拒まれた）。
- ui-audit：446 項目、不合格 17。

## 不合格
- S-01-block-in-phrasing｜invoices｜default: span.min-w-0 の中に div.flex; many: span.min-w-0 の中に div.flex; refreshing: span.min-w-0 の中に div.flex
- hit-area-44｜invoice-new｜confirming: button:メニュー 114x44, a:請求書 343x44, select:選んでください
株式会社北斗印刷 343x45, input: 317x43; saving: button:メニュー 114x44, a:請求書 343x44, select:選んでください
株式会社北斗印刷 343x45, input: 317x43（延べ 46 か所）
- hit-area-44｜invoice-detail｜saving: button:メニュー 114x44, a:請求書 343x44, a:入金の確認を開く 343x44, button:請求書を取り消す 146x44; confirming: button:メニュー 114x44, a:請求書 343x44, a:下書きの内容を直す 343x44, button:下書きを削除する 146x44; invalid: button:メニュー 114x44, a:請求書 343x44, a:入金の確認を開く 343x44, button:請求書を取り消す 146x44（
- states-distinct｜invoice-detail｜表示の文字数が同じ状態が 1 組ある（状態が切り替わっていない疑い）
- hit-area-44｜client-form｜confirming: button:メニュー 114x44, a:取引先 343x44, input: 317x43, input: 317x43（延べ 19 か所）
- hit-area-44｜payments｜confirming: button:メニュー 114x44, input: 44x44, button:入金を確認する 198x44, input: 44x44; saving: button:メニュー 114x44, button:請求書を選ぶ 118x44, button:請求書を選ぶ 118x44, a:INV-2026-0027 104x44（延べ 27 か所）
- S-01-block-in-phrasing｜payments｜default: span.min-w-0 の中に div.flex; many: span.min-w-0 の中に div.flex; candidates_empty: span.min-w-0 の中に div.flex
- axe-serious｜report｜color-contrast×167
- terms｜settings｜「発行」が使われている（決めた呼び名は「送る」）状態 default
- terms｜settings｜「発行」が使われている（決めた呼び名は「送る」）状態 invalid
- terms｜settings｜「発行」が使われている（決めた呼び名は「送る」）状態 saving
- terms｜settings｜「発行」が使われている（決めた呼び名は「送る」）状態 confirming
- terms｜settings｜「発行」が使われている（決めた呼び名は「送る」）状態 conflict
- hit-area-44｜settings｜confirming: button:メニュー 114x44, a:ホーム 343x44, button:自社の情報 86x44, button:請求書の決まり 114x44（延べ 13 か所）
- A-01-hover｜settings｜乗せても見た目が変わらない: 自社の情報
- A-01-press｜settings｜押しても見た目が変わらない: 自社の情報, 請求書の決まり, 通知
- shell-nav｜report｜決めていない項目: ['請求書の一覧を見る', '取引先の一覧を見る']

補足：hit-area-44 の 5 件は、窓が開いた状態（confirming・saving）で窓の裏の要素を数えている疑い（道具の誤検出）。terms の 5 件は制度の語「適格請求書発行事業者」。

## 参考（info）
- S-08-css｜probe｜!important 0 個、style 属性 0 個、同じ宣言のかたまりの重複 0 種、div の深さ 8
- A-motion-layout-props｜probe｜幅・高さ・余白などを動かしている 0 か所、transition: all が 0 か所
- A-motion-tokens｜probe｜時間のトークン 3/3 個が定義されている。くり返す動き 0 個、1 秒を超える動き 0 個
- D-06-font-steps｜probe｜文字サイズ 4 段 [14, 16, 22, 28]
- D-07-spacing-scale｜probe｜刻みに無い余白 0/721 か所
- S-08-css｜probe-form｜!important 0 個、style 属性 0 個、同じ宣言のかたまりの重複 0 種、div の深さ 4
- A-motion-layout-props｜probe-form｜幅・高さ・余白などを動かしている 0 か所、transition: all が 0 か所
- A-motion-tokens｜probe-form｜時間のトークン 3/3 個が定義されている。くり返す動き 0 個、1 秒を超える動き 0 個
- D-06-font-steps｜probe-form｜文字サイズ 3 段 [14, 16, 22]
- D-07-spacing-scale｜probe-form｜刻みに無い余白 0/88 か所
- S-08-css｜home｜!important 0 個、style 属性 0 個、同じ宣言のかたまりの重複 0 種、div の深さ 5
- A-motion-layout-props｜home｜幅・高さ・余白などを動かしている 0 か所、transition: all が 0 か所
- A-motion-tokens｜home｜時間のトークン 3/3 個が定義されている。くり返す動き 0 個、1 秒を超える動き 0 個
- D-06-font-steps｜home｜文字サイズ 4 段 [14, 16, 22, 28]
- D-07-spacing-scale｜home｜刻みに無い余白 0/162 か所
- S-08-css｜invoices｜!important 0 個、style 属性 0 個、同じ宣言のかたまりの重複 0 種、div の深さ 11
- A-motion-layout-props｜invoices｜幅・高さ・余白などを動かしている 0 か所、transition: all が 0 か所
- A-motion-tokens｜invoices｜時間のトークン 3/3 個が定義されている。くり返す動き 0 個、1 秒を超える動き 0 個
- D-06-font-steps｜invoices｜文字サイズ 3 段 [14, 16, 22]
- D-07-spacing-scale｜invoices｜刻みに無い余白 0/510 か所
- S-08-css｜invoice-new｜!important 0 個、style 属性 0 個、同じ宣言のかたまりの重複 0 種、div の深さ 6
- A-motion-layout-props｜invoice-new｜幅・高さ・余白などを動かしている 0 か所、transition: all が 0 か所
- A-motion-tokens｜invoice-new｜時間のトークン 3/3 個が定義されている。くり返す動き 0 個、1 秒を超える動き 0 個
- D-06-font-steps｜invoice-new｜文字サイズ 3 段 [14, 16, 22]
- D-07-spacing-scale｜invoice-new｜刻みに無い余白 0/161 か所
- S-08-css｜invoice-detail｜!important 0 個、style 属性 0 個、同じ宣言のかたまりの重複 0 種、div の深さ 7
- A-motion-layout-props｜invoice-detail｜幅・高さ・余白などを動かしている 0 か所、transition: all が 0 か所
- A-motion-tokens｜invoice-detail｜時間のトークン 3/3 個が定義されている。くり返す動き 0 個、1 秒を超える動き 0 個
- D-06-font-steps｜invoice-detail｜文字サイズ 4 段 [14, 16, 22, 28]
- D-07-spacing-scale｜invoice-detail｜刻みに無い余白 0/140 か所
- S-08-css｜clients｜!important 0 個、style 属性 0 個、同じ宣言のかたまりの重複 0 種、div の深さ 9
- A-motion-layout-props｜clients｜幅・高さ・余白などを動かしている 0 か所、transition: all が 0 か所
- A-motion-tokens｜clients｜時間のトークン 3/3 個が定義されている。くり返す動き 0 個、1 秒を超える動き 0 個
- D-06-font-steps｜clients｜文字サイズ 3 段 [14, 16, 22]
- D-07-spacing-scale｜clients｜刻みに無い余白 0/261 か所
- S-08-css｜client-form｜!important 0 個、style 属性 0 個、同じ宣言のかたまりの重複 0 種、div の深さ 6
- A-motion-layout-props｜client-form｜幅・高さ・余白などを動かしている 0 か所、transition: all が 0 か所
- A-motion-tokens｜client-form｜時間のトークン 3/3 個が定義されている。くり返す動き 0 個、1 秒を超える動き 0 個
- D-06-font-steps｜client-form｜文字サイズ 3 段 [14, 16, 22]
- D-07-spacing-scale｜client-form｜刻みに無い余白 0/182 か所
- S-08-css｜payments｜!important 0 個、style 属性 0 個、同じ宣言のかたまりの重複 0 種、div の深さ 8
- A-motion-layout-props｜payments｜幅・高さ・余白などを動かしている 0 か所、transition: all が 0 か所
- A-motion-tokens｜payments｜時間のトークン 3/3 個が定義されている。くり返す動き 0 個、1 秒を超える動き 0 個
- D-06-font-steps｜payments｜文字サイズ 3 段 [14, 16, 22]
- D-07-spacing-scale｜payments｜刻みに無い余白 0/352 か所
- S-08-css｜report｜!important 0 個、style 属性 0 個、同じ宣言のかたまりの重複 0 種、div の深さ 9
- A-motion-layout-props｜report｜幅・高さ・余白などを動かしている 0 か所、transition: all が 0 か所
- A-motion-tokens｜report｜時間のトークン 3/3 個が定義されている。くり返す動き 0 個、1 秒を超える動き 0 個
- D-06-font-steps｜report｜文字サイズ 3 段 [14, 16, 22]
- D-07-spacing-scale｜report｜刻みに無い余白 0/399 か所
- D-12-figure-first-screen｜report｜最初の図の位置 518px（1 画面は 812px）
- S-08-css｜settings｜!important 0 個、style 属性 0 個、同じ宣言のかたまりの重複 0 種、div の深さ 6
- A-motion-layout-props｜settings｜幅・高さ・余白などを動かしている 0 か所、transition: all が 0 か所
- A-motion-tokens｜settings｜時間のトークン 3/3 個が定義されている。くり返す動き 0 個、1 秒を超える動き 0 個
- D-06-font-steps｜settings｜文字サイズ 3 段 [14, 16, 22]
- D-07-spacing-scale｜settings｜刻みに無い余白 0/112 か所
- S-08-css｜setup｜!important 0 個、style 属性 0 個、同じ宣言のかたまりの重複 0 種、div の深さ 4
- A-motion-layout-props｜setup｜幅・高さ・余白などを動かしている 0 か所、transition: all が 0 か所
- A-motion-tokens｜setup｜時間のトークン 3/3 個が定義されている。くり返す動き 0 個、1 秒を超える動き 0 個
- D-06-font-steps｜setup｜文字サイズ 3 段 [14, 16, 22]
- D-07-spacing-scale｜setup｜刻みに無い余白 0/110 か所