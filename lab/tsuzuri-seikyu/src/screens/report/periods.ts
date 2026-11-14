import { addMonths, monthKey, pad } from '../../data'

/**
 * 期間の定義（S-03：1 か所）。選択肢・URL の読み取り・図の題・書き出しの名前が、ここから引く。
 * 月は 'YYYY-MM' の形。今日（見本の「いま」）の月が最後の月で、「途中」の月になる。
 */
export type Period = 'half' | 'year' | 'fiscal'
export const DEFAULT_PERIOD: Period = 'half'

const shiftMonthKey = (key: string, n: number): string => {
  const [y, m] = key.split('-').map(Number)
  const [yy, mm] = addMonths(y, m, n)
  return `${yy}-${pad(mm)}`
}

/** from から to まで（両端を含む）の月。 */
const between = (from: string, to: string): string[] => {
  const out: string[] = []
  for (let k = from; k <= to; k = shiftMonthKey(k, 1)) out.push(k)
  return out
}

const lastN = (n: number) => (today: string): string[] => {
  const now = monthKey(today)
  return between(shiftMonthKey(now, -(n - 1)), now)
}

/** 今年度＝4 月から翌年 3 月。今日の月までを数える。 */
export const fiscalYearOf = (today: string): number => {
  const [y, m] = monthKey(today).split('-').map(Number)
  return m >= 4 ? y : y - 1
}
const fiscalMonths = (today: string): string[] => between(`${fiscalYearOf(today)}-04`, monthKey(today))

export const PERIODS: ReadonlyArray<{ value: Period; label: string; months: (today: string) => string[] }> = [
  { value: 'half', label: '半年', months: lastN(6) },
  { value: 'year', label: '1年', months: lastN(12) },
  { value: 'fiscal', label: '今年度', months: fiscalMonths },
]

/** URL の値から期間を決める。知らない値は既定（半年）にする（誤りの文は出さない）。 */
export function parsePeriod(raw: string | null): Period {
  return PERIODS.find((p) => p.value === raw)?.value ?? DEFAULT_PERIOD
}

export const monthsOf = (period: Period, today: string): string[] => (PERIODS.find((p) => p.value === period) ?? PERIODS[0]).months(today)

const ym = (key: string) => key.split('-').map(Number) as [number, number]

/** 「2026年6月〜11月（6か月）」。年をまたぐときは「2025年12月〜2026年11月（12か月）」（G-07）。 */
export function rangeText(months: string[]): string {
  const [y1, m1] = ym(months[0])
  const [y2, m2] = ym(months[months.length - 1])
  const n = months.length
  if (n === 1) return `${y1}年${m1}月（1か月）`
  return y1 === y2 ? `${y1}年${m1}月〜${m2}月（${n}か月）` : `${y1}年${m1}月〜${y2}年${m2}月（${n}か月）`
}

/** 図の題の下に常に書く期間。今年度は年度の全体を併記する（G-07）。 */
export function periodCaption(period: Period, months: string[], today: string): string {
  if (period !== 'fiscal') return rangeText(months)
  const fy = fiscalYearOf(today)
  return `${fy}年度（${fy}年4月〜${fy + 1}年3月）のうち、${rangeText(months)}`
}
