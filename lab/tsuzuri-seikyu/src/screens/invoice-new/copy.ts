/**
 * 請求書の作成にしか出ない文（題・説明・誤り・知らせ）。ここ 1 か所に集める（words.md L-13）。
 * 全画面で同じ語（画面名・ボタンの動詞・保存しています・半角にそろえました）は app/terms から引き、ここに書かない。
 * 数や名前は差し込む（連結しない）。
 */
export const copy = {
  loading: '取引先と期限を読み込んでいます',
  section: { dest: '宛先と期限', lines: '明細', memo: '備考', total: '合計' },
  label: { issued: '請求日', due: '支払期限', memo: '備考', desc: '品名', qty: '数量', unit: '単位', price: '単価（税抜）', tax: '税率', amount: '金額（税抜）', filter: '取引先を絞る' },

  /** 欄の補足（常時見える。規則・例・出どころ：F-03）。 */
  hint: {
    issuedExample: (date: string) => `例：${date}`,
    dueNoClient: '取引先を選ぶと、支払条件から入ります。',
    dueTouched: '自分で入れた日付です。',
    dueFromTerms: (terms: string) => `取引先の支払条件から入れました（${terms}）。`,
    dueWeekend: (date: string, weekday: string) => `${date}は${weekday}です。`,
    memo: '請求書の下に載り、相手に見えます。',
    filter: '取引先名・かなで絞れます。',
    lines: '単価は税抜の金額です。数量は0.5のように小数も入れられます。税率の8%は軽減税率です。',
  },
  select: '選んでください',
  noClientMatch: (word: string) => `「${word}」に合う取引先はありません。`,
  clientMissing: '取引先が見つからないときは、',
  dueChanged: '取引先の支払条件に合わせて、支払期限を変えました。',
  resetDue: '自動に戻す',
  addLine: '明細を足す',
  maxLines: (n: number) => `明細は${n}行までです。`,
  removeLine: (name: string) => `${name}を消す`,
  lineName: (n: number) => `明細${n}`,
  lineTax: (name: string) => `${name}の税率`,

  totals: {
    subtotal: '小計（税抜）',
    taxNone: '消費税',
    tax: (rate: number) => `消費税（${rate}%）`,
    total: '合計（税込）',
    incomplete: (n: number) => `${n}行は金額が入っていないため、合計に入っていません。`,
    rule: (rounding: string, settings: string) => `税は税率ごとの小計に1回だけ、${rounding}で計算します。端数の扱いは${settings}で変えられます。`,
    number: '請求書の番号は、送ると付きます。',
  },

  /** 送る前の確かめの窓。送ると番号が付き相手にメールが届く（戻せない）ので、結果を先に言う（E-08・L-05）。 */
  send: {
    title: '請求書を送りますか',
    busy: '請求書を送っています',
    body: '送ると番号が付き、相手にメールが届きます。送ったあとは書き換えられません。',
    failed: '送れませんでした。入力は残っています。もう一度送ってください。',
    to: '宛先',
    mail: 'メール',
    total: '合計（税込）',
    due: '支払期限',
  },

  /** 競合：選んだ取引先の支払条件を別の人が先に変えた（E-09）。 */
  conflict: {
    title: '別の人が先に更新しました',
    changed: (at: string, client: string) => `${at}に${client}の支払条件が更新されました。`,
    mine: '自分の内容の支払期限',
    theirs: '更新後の支払期限',
    empty: '未入力',
    hold: '選ぶまで、保存と送る手続きは止めています。',
    keep: 'この内容で保存する',
    useNew: '新しい期限を使う',
  },

  toast: {
    sent: '請求書を送りました',
    draftSaved: '下書きを保存しました',
    lineRemoved: (n: number) => `明細${n}を消しました`,
    newDue: '支払期限を新しくしました',
  },

  /** 欄の誤り（何が起きたか＋どう直すか。L-06）。明細の文には行を入れる。 */
  error: {
    pickClient: '取引先を選んでください。',
    noEmail: 'この取引先にはメールの宛先がありません。取引先の登録で追加してください。',
    issuedEmpty: '請求日を入れてください。',
    issuedBad: (example: string) => `請求日は「${example}」のように入れてください。`,
    dueEmpty: '支払期限を入れてください。',
    dueBad: (example: string) => `支払期限は「${example}」のように入れてください。`,
    dueBeforeIssued: '支払期限は請求日と同じか、それより後の日にしてください。',
    descEmpty: (n: number) => `明細${n}の品名を入れてください。`,
    qtyEmpty: (n: number) => `明細${n}の数量を入れてください。`,
    qtyBad: (n: number) => `明細${n}の数量は0より大きい数字で入れてください。`,
    qtyOver: (n: number, max: string) => `明細${n}の数量は${max}以下で入れてください。`,
    priceEmpty: (n: number) => `明細${n}の単価を入れてください。`,
    priceBad: (n: number) => `明細${n}の単価は数字で入れてください。`,
    priceOver: (n: number, max: string) => `明細${n}の単価は${max}円以下で入れてください。`,
    totalOver: (max: string) => `合計が${max}円を超えています。単価か数量を見直してください。`,
  },
} as const
