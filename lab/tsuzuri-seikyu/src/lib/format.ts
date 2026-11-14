/**
 * [MOD-001] 数・金額・日付・時刻の整形。Intl だけを使い、書き方はここ 1 か所で決める（M-20）。
 * 置き場所は lib（ui と data の両方から使うので、どちらにも属さない最下層：決定 8）。data/format.ts はここを出し直すだけ。
 */

const LOCALE = 'ja-JP'
const ZONE = 'Asia/Tokyo'

const plain = new Intl.NumberFormat(LOCALE)
const signed = new Intl.NumberFormat(LOCALE, { signDisplay: 'exceptZero' })

/** 数が無い（取れていない・未入力）ときの書き方。0 とは別のもの（data.md G-06）。 */
export const MISSING = '\u2014'
/** 負の符号。Intl の出力は半角ハイフンで、欠損の「—」と見間違えるので、ここで U+2212 に替える（G-05）。 */
const MINUS = '\u2212'

/**
 * 数の整形の 1 か所（M-20）。桁区切りは半角カンマ、負は「−」（U+2212）、0 以外に signed なら「+」。
 * 値が無い（null・undefined・数でない）ときは「—」。0 に落とさない（G-06）。
 */
export function formatNumber(n: number | null | undefined, opts: { signed?: boolean } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return MISSING
  const v = Object.is(n, -0) ? 0 : n
  return (opts.signed ? signed : plain).format(v).replace(/^[-\u2212]/, MINUS)
}

/** 「1,234,567円」「−1,200円」。値が無ければ「—」（円は付けない）。数字と単位を離さない場所（文章の中）で使う。表の列は Money に unit=false。 */
export function formatYen(n: number | null | undefined, opts: { signed?: boolean } = {}): string {
  return n === null || n === undefined || !Number.isFinite(n) ? MISSING : `${formatNumber(n, opts)}円`
}

/** 数を桁数（既定 2）に 0 でそろえる。月・日は 2 桁、連番は 3〜4 桁。桁をそろえる書き方はここ 1 か所。 */
export const pad = (n: number, width = 2): string => String(n).padStart(width, '0')

/** 月の最終日（28〜31）。m は 1〜12。 */
export const lastDayOf = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** 年月に n か月を足す（引くときは負）。[年, 月（1〜12）]。月の計算はここ 1 か所。 */
export function addMonths(y: number, m: number, n: number): [number, number] {
  const t = y * 12 + (m - 1) + n
  return [Math.floor(t / 12), (t % 12) + 1]
}

/** 暦日 'YYYY-MM-DD' を、日本時間の正午の瞬間にする（日付がずれないように）。 */
export function dateOf(ymd: string): Date {
  return new Date(`${ymd}T12:00:00+09:00`)
}

const long = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long', timeZone: ZONE })
const short = new Intl.DateTimeFormat(LOCALE, { month: 'numeric', day: 'numeric', weekday: 'short', timeZone: ZONE })
const month = new Intl.DateTimeFormat(LOCALE, { year: 'numeric', month: 'long', timeZone: ZONE })
const monthOnly = new Intl.DateTimeFormat(LOCALE, { month: 'numeric', timeZone: ZONE })
const clock = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONE })
const rel = new Intl.RelativeTimeFormat('ja', { numeric: 'always' })

/** 2026年11月13日 */
export const formatDate = (ymd: string) => long.format(dateOf(ymd))
/** 11/13(金) */
export const formatDateShort = (ymd: string) => short.format(dateOf(ymd))
/**
 * 一覧の 1 列ぶんの日付をそろえる。ふだんは「11/13(金)」、同じ列に今年以外が 1 件でもあれば全行を「2026年11月13日」（G-07）。
 * 画面は列の全部の値を渡して、同じ順の文字列を受け取る。
 */
export function formatDateColumn(ymds: string[], today: string): string[] {
  const thisYear = today.slice(0, 4)
  const long = ymds.some((d) => d.slice(0, 4) !== thisYear)
  return ymds.map((d) => (long ? formatDate(d) : formatDateShort(d)))
}
/** 2026年11月 */
export const formatMonth = (ymd: string) => month.format(dateOf(ymd))
/**
 * 月の名前を作る 1 か所。「6月」。月の数（1〜12）、'2026-06'、'2026-06-30' のどれからでも作る。
 * Intl の月だけの書き方がすでに「6月」と「月」を含むので、あとから「月」を足さない（足すと「6月月」になる）。
 */
export function monthName(month: number | string): string {
  const n = typeof month === 'number' ? month : Number(month.slice(5, 7))
  return monthOnly.format(dateOf(`2026-${String(n).padStart(2, '0')}-15`))
}
/** 6月（図の目盛り）。ymd・'YYYY-MM-01' を渡す。monthName の別名で、名前を作るのは 1 か所。 */
export const formatMonthOnly = (ymd: string) => monthName(ymd)
/** 09:30 */
export const formatTime = (iso: string) => clock.format(new Date(iso))
/** 瞬間 → 暦日（日本時間） */
export function ymdOf(iso: string): string {
  const p = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeZone: ZONE }).format(new Date(iso))
  return p
}

/** 24 時間。これ未満だけ「N分前」「N時間前」と言い、それ以上は日付と時刻にする（G-07）。 */
const DAY_SEC = 86400

/** 11/12(木) 15:20。今年でなければ 2025年12月31日 15:20（G-07：履歴・更新時刻の 24 時間以上前）。 */
export function formatDateTime(iso: string, now: Date): string {
  const day = ymdOf(iso)
  const sameYear = day.slice(0, 4) === ymdOf(now.toISOString()).slice(0, 4)
  return `${sameYear ? formatDateShort(day) : formatDate(day)} ${formatTime(iso)}`
}

/**
 * 履歴・更新時刻の言い方。60 秒未満は「たったいま」、24 時間未満は「5分前」「3時間前」、
 * それ以上は「11/12(木) 15:20」。「2日前」とは言わない（G-07。期限の「あと3日」は daysUntil で別に作る）。
 */
export function formatAgo(iso: string, now: Date): string {
  const sec = Math.round((new Date(iso).getTime() - now.getTime()) / 1000)
  const abs = Math.abs(sec)
  if (abs < 60) return 'たったいま'
  if (abs < 3600) return rel.format(Math.round(sec / 60), 'minute').replace(/\s/g, '')
  if (abs < DAY_SEC) return rel.format(Math.round(sec / 3600), 'hour').replace(/\s/g, '')
  return formatDateTime(iso, now)
}

/** 期限までの日数（過ぎていれば負）。 */
export function daysUntil(ymd: string, today: string): number {
  return Math.round((dateOf(ymd).getTime() - dateOf(today).getTime()) / 86400000)
}

/**
 * 支払期限の補足の言い方（G-07：絶対の日付が主で、これは小さく添える）。「あと3日」「今日まで」「3日超過」。
 * 超過は日数を数字で言う。どの画面も同じ言い方にするため、文はここ 1 か所。
 */
export function dueNote(days: number): string {
  return days < 0 ? `${-days}日超過` : days === 0 ? '今日まで' : `あと${days}日`
}

/** 「2026-11」の形の月を数える・並べるための鍵。 */
export const monthKey = (ymd: string) => ymd.slice(0, 7)

/** 郵便番号を 123-4567 の形に。全角・ハイフン無しも受ける。 */
export function formatZip(raw: string): string {
  const d = raw.normalize('NFKC').replace(/\D/g, '')
  return d.length === 7 ? `${d.slice(0, 3)}-${d.slice(3)}` : raw
}
