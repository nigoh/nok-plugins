import { dueNote, formatYen } from '../../data'

/**
 * この画面にしか出ない文言（L-13）。全画面で同じ語（画面名・ボタンの動詞）は app/terms.ts から引き、ここに書かない。
 * 数や名前は連結せず、差し込む（M-21）。文言を直すときはここ 1 か所。
 */
export const copy = {
  searchLabel: '取引先を探す',
  searchHint: '取引先名か読み仮名で探せます。例：ほくと',
  clearQuery: '探す語を消す',
  sortLabel: '並び順',
  searchRegion: '取引先を探す・並べる',
  tableLabel: '取引先の一覧',
  loading: '取引先の一覧を読み込んでいます',
  /** 更新中の知らせの続き（RefreshingNote の子。「更新しています」は terms）。 */
  refreshingLock: '並び順とページは変えられません',
  /** 初回の 0 件。次の一手は文中のリンク（「取引先を登録する」＋この文の続き）。 */
  empty: { title: '取引先はまだありません', afterLink: 'と、請求書の宛先として選べるようになります。' },
  filteredEmpty: { title: '条件に合う取引先はありません' },
  staleBody: '更新できませんでした。未入金額は更新前の金額です。もう一度読み込んでください。',
} as const

export const filteredEmptyDescription = (q: string) => `「${q}」に当たる取引先名と読み仮名はありません。探す語を変えるか、消してください。`

/** 表の上の 1 文。条件に合う件数・並び順・未入金額の合計（税込）。合計は条件に合う全件（ページでなく全体：G-04）。 */
export function summary(opts: { count: number; filtered: boolean; sortLabel: string; unpaidTotal: number }): string {
  const { count, filtered, sortLabel, unpaidTotal } = opts
  const lead = filtered ? `条件に合う${count}件を${sortLabel}に並べています。` : `全${count}件を${sortLabel}に並べています。`
  return `${lead}未入金額は、税込で合計${formatYen(unpaidTotal)}です。`
}

/** 担当者の補足。2 人目以降の人数。 */
export const otherContacts = (n: number) => `ほか${n}名`

/** 未入金の補足の 3 つの塊。数字と日本語の間に空白を入れない（L-10）。 */
export const unpaidNotes = (opts: { count: number; due: string; days: number }): string[] => {
  const { count, due, days } = opts
  const dueLine = count > 1 ? `最も早い期限は${due}` : `期限は${due}`
  return [`${count}件`, dueLine, dueNote(days)]
}

/** 取引先名のリンクの、読み上げだけで足す文字（見える名前を含める：L-12）。 */
export const editSuffix = 'を編集する'
