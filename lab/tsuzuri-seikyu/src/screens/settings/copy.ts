/**
 * この画面にしか出ない文（知らせ・窓・見出し）。全画面で同じ語（画面名・ボタンの動詞・保存しています・保存できませんでした・半角にそろえました・離れる窓）は app/terms.ts から引き、ここには置かない。
 * 欄のラベル・補足・誤りの文は fields.ts。連結せず、変わる所は差し込む（M-21）。
 */
export const copy = {
  saved: '設定を保存しました',
  restored: '設定を元に戻しました',
  mergedSaved: 'ほかの人の更新も含めて保存しました',
  unsaved: '未保存の変更があります',
  loadFailed: '設定を読み込めませんでした。しばらくしてから、もう一度読み込んでください。',
  tabsLabel: '設定の区分',
  roundingPick: '端数の処理を選ぶ',
  numbering: {
    title: '番号の付け方を変えますか',
    body: '次に送る請求書から、新しい付け方で番号が付きます。送付済みの請求書の番号は変わりません。',
    now: 'いま',
    after: '変えたあと',
    confirm: '付け方を変える',
  },
  conflict: {
    body: '同じ項目が変わっています。どちらの内容にするか選んでください。',
    blocked: 'どちらかを選ぶまで、保存できません。',
    colItem: '項目',
    colMine: '自分の内容',
    colTheirs: '相手の内容',
    tableLabel: '食い違っている項目',
  },
  backup: {
    body: '相手の内容を読み込みました。自分の入力は控えに残してあります。',
    restore: '自分の入力を戻す',
  },
  /** 食い違いの見出し。時刻は差し込む。 */
  conflictTitle: (time: string) => `別の人が${time}に更新しました`,
  /** 番号の例の文。 */
  nextNumber: (example: string) => `次に送る請求書の番号は${example}になります。送付済みの請求書の番号は変わりません。`,
  /** 端数の例の文。 */
  roundingExample: (base: string, tax: string, parts: string) => `例：税抜${base}の10%は${tax}円です。${parts}になります。`,
  roundingPart: (label: string, yen: string) => `${label}なら${yen}`,
} as const
