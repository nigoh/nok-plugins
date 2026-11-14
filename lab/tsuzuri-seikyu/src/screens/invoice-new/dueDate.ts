import { addMonths, dateOf, lastDayOf, pad, type ClientTerms } from '../../data'


/**
 * 取引先の支払条件と請求日から、支払期限を計算する（REQ-014）。
 * 締め日（例：20日締め）を過ぎた請求日は、次の月の分に入る。支払日が月に無い日（31日など）は月末に寄せる。
 */
export function dueDateFor(issuedOn: string, terms: ClientTerms): string {
  const [y, m, d] = issuedOn.split('-').map(Number)
  const closesNextMonth = terms.closingDay !== 'end' && d > terms.closingDay
  const [py, pm] = addMonths(y, m, (closesNextMonth ? 1 : 0) + terms.payMonthsLater)
  const day = terms.payDay === 'end' ? lastDayOf(py, pm) : Math.min(terms.payDay, lastDayOf(py, pm))
  return `${py}-${pad(pm)}-${pad(day)}`
}

const WEEK = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'] as const

/** 土日なら曜日の名前（休日の期限は誤りにせず知らせる：F-06）。平日は null。 */
export function weekendName(ymd: string): string | null {
  const w = dateOf(ymd).getUTCDay()
  return w === 0 || w === 6 ? WEEK[w] : null
}
