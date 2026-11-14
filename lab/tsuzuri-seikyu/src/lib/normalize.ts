/**
 * [MOD-002] 入力の読み・そろえ（form.md F-06）。全角→半角、ハイフンの種類、日付（西暦・和暦・8 桁・年なし）、金額・数量、探す語。
 * 画面ごとに作られていた 5 通りの「半角にそろえる」と 2 通りの日付・金額の読みを、いちばん細かい物（invoice-new の読み）に 1 つにした。
 * 知らせの文（「半角にそろえました」）は app/terms の messages.widened。ここは文を持たない。
 * 全角の文字そのものはソースに書かず、コードポイントで書く（全角数字の直書きを番人が止めるため）。
 */
import { formatDate, formatNumber, pad } from './format'

/** ハイフンに見える字（‐ ‑ ‒ – — ― − －）。長音「ー」は含めない（名前や読みの中の長音を壊さないため）。 */
const DASHES = /[‐-―−－]/g

/** 全角の英数・記号・空白を半角に、ハイフンの種類を「-」に。前後の空白と中の空白は触らない。 */
export function toHalf(raw: string): string {
  return raw.normalize('NFKC').replace(DASHES, '-')
}

/** 数字や日付の欄用。toHalf に加えて、長音「ー」も「-」に、空白をすべて除く。 */
export function toHalfDigits(raw: string): string {
  return toHalf(raw).replace(/ー/g, '-').replace(/\s+/g, '')
}

/** 全角などを直したか。直したときだけ「半角にそろえました」を出す（F-06）。前後の空白を除いただけでは言わない。 */
export function wasWidened(raw: string): boolean {
  const t = raw.trim()
  return t !== '' && toHalf(t) !== t
}

/* ---- 日付 ---- */

export type ReadDate = { kind: 'empty' } | { kind: 'bad' } | { kind: 'ok'; ymd: string }

/** 実在する日だけ 'YYYY-MM-DD' にする（11月31日は null）。 */
function build(y: number, m: number, d: number): string | null {
  const t = new Date(Date.UTC(y, m - 1, d))
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

/** 元号。改元の日をまたぐ日付（平成31年5月1日など）は読まない。 */
const ERAS = [
  { names: ['令和', 'R'], base: 2018, from: '2019-05-01', to: '9999-12-31' },
  { names: ['平成', 'H'], base: 1988, from: '1989-01-08', to: '2019-04-30' },
  { names: ['昭和', 'S'], base: 1925, from: '1926-12-25', to: '1989-01-07' },
] as const

/** 西暦の年の範囲（読み違いの 0001 年などを誤りにする）。 */
const YEAR_MIN = 1900
const YEAR_MAX = 2100

/**
 * 日付の欄を読む。「2026年11月13日」「2026/11/13」「2026-11-13」「20261113」「令和8年11月13日」「R8.11.13」「11月13日」（年は today の年）を受け、
 * 全角・ハイフンの種類・空白は直して読む。保存は暦日 'YYYY-MM-DD'。実在しない日と元号の範囲外は bad。
 */
export function readDate(text: string, today: string): ReadDate {
  const s = toHalfDigits(text)
  if (s === '') return { kind: 'empty' }
  const ok = (ymd: string | null): ReadDate => (ymd ? { kind: 'ok', ymd } : { kind: 'bad' })
  let m = /^(令和|平成|昭和|[RHS])(元|\d{1,2})[年./-](\d{1,2})[月./-](\d{1,2})日?$/i.exec(s)
  if (m) {
    const name = m[1].toUpperCase()
    const era = ERAS.find((e) => (e.names as readonly string[]).includes(name))
    if (!era) return { kind: 'bad' }
    const ymd = build(era.base + (m[2] === '元' ? 1 : Number(m[2])), Number(m[3]), Number(m[4]))
    return ok(ymd !== null && ymd >= era.from && ymd <= era.to ? ymd : null)
  }
  m = /^(\d{4})[年./-](\d{1,2})[月./-](\d{1,2})日?$/.exec(s) ?? /^(\d{4})(\d{2})(\d{2})$/.exec(s)
  if (m) {
    const y = Number(m[1])
    return ok(y < YEAR_MIN || y > YEAR_MAX ? null : build(y, Number(m[2]), Number(m[3])))
  }
  m = /^(\d{1,2})[月./-](\d{1,2})日?$/.exec(s)
  if (m) return ok(build(Number(today.slice(0, 4)), Number(m[1]), Number(m[2])))
  return { kind: 'bad' }
}

/* ---- 金額・数量 ---- */

export type ReadNum = { kind: 'empty' } | { kind: 'bad' } | { kind: 'over' } | { kind: 'ok'; value: number }

/** 金額の上限の既定（9 桁）。画面が小さい上限を持つなら max で渡す。 */
export const MAX_YEN = 999_999_999

/** 全角・桁区切り「,」・円記号（頭の円記号か、後ろの「円」）・空白を除いた数字の列にする。 */
const digitsOf = (text: string) => toHalfDigits(text).replace(/,/g, '').replace(/^\u00a5/, '').replace(/\u5186$/, '')

/** 金額（円の整数）を読む。欠けは empty、数字でないのは bad、上限超えは over。 */
export function readYen(text: string, max: number = MAX_YEN): ReadNum {
  const s = digitsOf(text)
  if (s === '') return { kind: 'empty' }
  if (!/^\d+$/.test(s)) return { kind: 'bad' }
  const value = Number(s)
  return value > max ? { kind: 'over' } : { kind: 'ok', value }
}

/** 数量（0 より大きい。小数は 2 桁まで）を読む。 */
export function readQuantity(text: string, max = 9_999_999): ReadNum {
  const s = digitsOf(text)
  if (s === '') return { kind: 'empty' }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { kind: 'bad' }
  const value = Number(s)
  if (value <= 0) return { kind: 'bad' }
  return value > max ? { kind: 'over' } : { kind: 'ok', value }
}

/* ---- 欄を離れた時にそろえる形 ---- */

export type Settled = { value: string; adjusted: boolean }

/** 欄を離れた時の日付。読めたら「2026年11月13日」に、読めなければそのまま返す（書き換えない：F-06）。adjusted は知らせを出すかどうか。 */
export function settleDate(raw: string, today: string): Settled {
  const r = readDate(raw, today)
  return r.kind === 'ok' ? { value: formatDate(r.ymd), adjusted: wasWidened(raw) } : { value: raw, adjusted: false }
}

/** 欄を離れた時の金額。読めたら「112,200」に。 */
export function settleYen(raw: string, max?: number): Settled {
  const r = readYen(raw, max)
  return r.kind === 'ok' ? { value: formatNumber(r.value), adjusted: wasWidened(raw) } : { value: raw, adjusted: false }
}

/* ---- 探す語 ---- */

/** ひらがなをカタカナに。 */
export const toKatakana = (s: string) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))

/** 探す語・読みの比べ方。全角→半角、大文字小文字を無視、ひらがな→カタカナ、空白・中点を除く。両方にかけて比べる。 */
export const foldForSearch = (s: string): string => toKatakana(toHalf(s).toLowerCase()).replace(/[\s　・]/g, '')

/**
 * 探す語と照合する（一覧の探す欄）。空白（全角も）で区切った語はすべて「かつ」で、どの語も fields（名前・かな・番号など）のどれかに含まれること。
 * 語が空なら全部に合う。両方に foldForSearch をかけて比べる。どの欄を照合先にするかは画面が決める。
 */
export function matchesWords(fields: readonly string[], query: string): boolean {
  const words = query.split(/[\s\u3000]+/).map(foldForSearch).filter(Boolean)
  if (words.length === 0) return true
  const hay = fields.map(foldForSearch).join('\n')
  return words.every((w) => hay.includes(w))
}
