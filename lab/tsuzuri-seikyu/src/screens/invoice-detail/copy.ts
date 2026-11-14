import { actions } from '../../app/terms'
import type { Op } from './operations'

/**
 * 請求書の詳細にしか出ない文（題・説明・窓・誤り・知らせ）。ここ 1 か所に集める（words.md L-13）。
 * 全画面で同じ語（ボタンの動詞・画面名）は app/terms から引く。数や名前は差し込む（連結しない）。
 */

/**
 * 窓の文言（変更シナリオ 2）。題・本文・主ボタンは同じ動詞（words.md L-05）。
 * 本文は起きること 1 文＋戻せるか 1 文。処理中は「〜しています」、済んだ知らせは「〜しました」（L-08）。
 * 失敗は「何ができなかったか＋次の一手」。送る・取り消すは、まだ起きていないと書く（form.md F-10）。
 * 4 つの操作の失敗は、どれも状態名 save_failed で受け、どの操作かはこの文で分ける（states.md E-02）。
 */
export type WindowDef = {
  title: string
  body: string
  primary: string
  busy: string
  /** 取り返しがつかない物は danger の主ボタン。 */
  danger: boolean
  failure: { title: string; body: string }
  /** 済んだ知らせ（20 字以内・句点なし）。 */
  done: string
}

export const windows: Record<Op, WindowDef> = {
  send: {
    title: '請求書を送りますか',
    body: '送ると番号が付き、相手にメールが届きます。送ったあとは内容を直せません。',
    primary: actions.sendInvoice,
    busy: '請求書を送っています',
    danger: false,
    failure: { title: '請求書を送れませんでした', body: '請求書はまだ送られていません。もう一度送ってください。' },
    done: '請求書を送りました',
  },
  record: {
    title: '入金を記録しますか',
    body: '記録すると、この請求書は入金済みになります。あとから記録を取り消せます。',
    primary: actions.recordPayment,
    busy: '入金を記録しています',
    danger: false,
    failure: { title: '入金を記録できませんでした', body: '入金はまだ記録されていません。入力は残っています。もう一度記録してください。' },
    done: '入金を記録しました',
  },
  void: {
    title: '請求書を取り消しますか',
    body: '取り消すと、この請求書は取り消し済みになります。元には戻せません。',
    primary: actions.voidInvoice,
    busy: '請求書を取り消しています',
    danger: true,
    failure: { title: '請求書を取り消せませんでした', body: '請求書はまだ取り消されていません。もう一度取り消してください。' },
    done: '請求書を取り消しました',
  },
  remove: {
    title: '下書きを削除しますか',
    body: '削除すると、この下書きは一覧から消えます。元には戻せません。',
    primary: actions.deleteDraft,
    busy: '下書きを削除しています',
    danger: true,
    failure: { title: '下書きを削除できませんでした', body: '下書きはまだ削除されていません。もう一度削除してください。' },
    done: '下書きを削除しました',
  },
}

/** 入金の記録を取り消す（窓を経ない。戻せる・届かない：E-08）。 */
export const unrecord = {
  button: '記録を取り消す',
  busy: '記録を取り消しています',
  explain: '記録を取り消すと、入金前の状況に戻ります。履歴には残ります。',
  failure: { title: '記録を取り消せませんでした', body: '入金の記録はそのままです。もう一度取り消してください。' },
  done: '入金の記録を取り消しました',
  history: '入金の記録を取り消しました',
} as const

/** 窓の外のほかの操作の説明（操作のすぐ上に置く：D-10）。 */
export const otherExplain = {
  remove: windows.remove.body,
  void: windows.void.body,
  unrecord: unrecord.explain,
} as const

/** 手動で 3 回続けて失敗したとき足す文（E-07）。 */
export const repeated = '続けて失敗しています。時間をおいて、もう一度試してください。'

/** 入金の記録の窓の中（欄・補足・誤り。誤りは何が起きたか＋どう直すか：L-06）。 */
export const record = {
  all: 'すべて入力してください。',
  paidOn: '入金日',
  amount: '入金額',
  hintPaidOn: '今日の日付を入れています。',
  hintAmount: '請求額を入れています。',
  /** 欄の補足の末尾（全角を直したとき）。 */
  widenedTail: (widened: string) => `${widened}。`,
  error: {
    paidOnEmpty: '入金日を入れてください。',
    paidOnBad: (example: string) => `入金日は${example}のように入力してください。`,
    paidOnRange: (issued: string) => `入金日は請求日（${issued}）から今日までにしてください。`,
    amountEmpty: '入金額を入れてください。',
    amountBad: '入金額は数字で入力してください。',
    amountMin: '入金額は1円以上で入力してください。',
    amountDiff: (total: string) => `入金額が請求額の${total}と違います。差額のある入金は入金の確認で扱います。`,
  },
} as const

/** 画面の本体（見出し・説明・知らせ・表の見出し）。 */
export const page = {
  noNumber: '番号は送るときに付きます',
  voidNotice: '取り消し済みです。変更できません。',
  flow: '請求書の状況の流れ',
  loadFailedTitle: '請求書を読み込めませんでした',
  loadFailed: '請求書を読み込めませんでした。しばらくしてから、もう一度読み込んでください。',
  notFoundTitle: '請求書が見つかりません',
  notFound: '削除されたか、アドレスが違うかもしれません。一覧から探してください。',
  toList: '請求書の一覧を見る',
  overview: '概要',
  lines: '明細',
  history: '履歴',
  historyReason: (note: string) => `理由：${note}`,
  other: 'ほかの操作',
  editDraft: '下書きの内容を直す',
  openPayments: '入金の確認を開く',
} as const

/** 概要・窓の項目・合計の内訳。 */
export const fact = {
  due: '支払期限',
  issued: '請求日',
  paid: '入金日',
  to: '宛先',
  memo: 'メモ',
  total: '合計（税込）',
  number: '請求書番号',
  subtotal: '小計（税抜）',
  base: (rate: number) => `${rate}%対象（税抜）`,
  tax: (rate: number) => `${rate}%の消費税`,
  rule: (rounding: string) => `消費税は税率ごとに1回だけ、${rounding}で計算しています。`,
} as const

export const columns = {
  description: '品名',
  quantity: '数量',
  unitPrice: '単価（税抜・円）',
  taxRate: '税率',
  amount: '金額（税抜・円）',
} as const

export const roundingName = { floor: '切り捨て', round: '四捨五入', ceil: '切り上げ' } as const
