import {
  clientOf, daysUntil, formatNumber, formatYen, invoiceTotal, lastDayOf, MISSING, pad, paymentStatus, ymdOf,
  type Client, type HistoryKind, type Invoice, type Payment,
} from '../../data'

/** ホームが読むデータの束。取得は useFake が返し、数えるのは下の関数（持たずに計算する：S-07、同じ数は 1 つの関数から：GP-7）。 */
export type HomeData = { invoices: Invoice[]; payments: Payment[]; clients: Client[] }


/** 「2026-11-13」→ 先月の同じ日。先月にその日が無ければ（3/31 → 2/28）先月の最終日。 */
export function sameDayLastMonth(today: string): string {
  const [y, m, d] = today.split('-').map(Number)
  const py = m === 1 ? y - 1 : y
  const pm = m === 1 ? 12 : m - 1
  return `${py}-${pad(pm)}-${pad(Math.min(d, lastDayOf(py, pm)))}`
}

const monthStartOf = (ymd: string) => `${ymd.slice(0, 7)}-01`

/** 送った（番号が付いた）請求書。下書きは請求していない。 */
const isIssued = (inv: Invoice) => inv.status !== 'draft'

/** その日までに取り消された請求書か。取り消しの履歴の日付で見る。履歴が無ければ請求日に取り消したものとみなす。 */
function isVoidedBy(inv: Invoice, date: string): boolean {
  if (inv.status !== 'void') return false
  const at = inv.history.find((h) => h.kind === 'voided')?.at
  return (at ? ymdOf(at) : inv.issuedOn) <= date
}

/** その日の時点で入金を待っていた請求書（送った・入金前・取り消し前）。 */
export function outstandingOn(invoices: Invoice[], date: string): Invoice[] {
  return invoices.filter((i) => isIssued(i) && i.issuedOn <= date && !(i.paidOn && i.paidOn <= date) && !isVoidedBy(i, date))
}

/** その日の時点で期限超過だった請求書（入金を待ち、支払期限がその日より前）。 */
export const overdueOn = (invoices: Invoice[], date: string): Invoice[] => outstandingOn(invoices, date).filter((i) => i.dueOn < date)

const sum = (list: Invoice[]) => list.reduce((s, i) => s + invoiceTotal(i), 0)

/** 期間 [from, to] に請求日がある、送った請求書の合計（取り消したものは含めない）。 */
export function billedBetween(invoices: Invoice[], from: string, to: string): number {
  return sum(invoices.filter((i) => isIssued(i) && i.status !== 'void' && i.issuedOn >= from && i.issuedOn <= to))
}

/** 比べる相手の期間に、記録（その日までに請求日のある送った請求書）が 1 件でもあるか。無ければ「記録がありません」と言う（G-03）。 */
const hasRecordUntil = (invoices: Invoice[], date: string) => invoices.some((i) => isIssued(i) && i.issuedOn <= date)

export type Compared = { now: number; before: number | null }

export type Metrics = {
  /** 今月の請求額（税込）。先月の同じ日までと比べる（流れの量）。 */
  billed: Compared
  /** 未入金の額（税込）と件数。先月の同じ日の時点と比べる（残高）。 */
  unpaid: Compared & { count: number }
  /** 期限超過の件数。先月の同じ日の時点と比べる（残高）。 */
  overdue: Compared
  /** 比べる相手の日（先月の同じ日） */
  compareDate: string
}

export function metricsOf(invoices: Invoice[], today: string): Metrics {
  const compareDate = sameDayLastMonth(today)
  const known = hasRecordUntil(invoices, compareDate)
  const out = outstandingOn(invoices, today)
  const outBefore = outstandingOn(invoices, compareDate)
  return {
    billed: { now: billedBetween(invoices, monthStartOf(today), today), before: known ? billedBetween(invoices, monthStartOf(compareDate), compareDate) : null },
    unpaid: { now: sum(out), before: known ? sum(outBefore) : null, count: out.length },
    overdue: { now: overdueOn(invoices, today).length, before: known ? overdueOn(invoices, compareDate).length : null },
    compareDate,
  }
}

/** 比べる相手の言い方。lead は「先月の13日までと比べて」、change は「+7,500円（+2%）」。相手が無い・0 のときは % を出さない（G-03）。 */
export type Comparison = { lead: string; change: string | null }

export function describeChange(c: Compared, opts: { unit: 'yen' | 'count'; span: 'until' | 'at'; compareDate: string }): Comparison {
  const day = Number(opts.compareDate.slice(8))
  const until = opts.span === 'until' ? 'まで' : ''
  const show = (n: number, o: { signed?: boolean } = {}) => (opts.unit === 'yen' ? formatYen(n, o) : `${formatNumber(n, o)}件`)
  if (c.before === null) return { lead: '先月の記録がありません', change: null }
  if (c.before === 0) return { lead: `先月の${day}日${until}は${show(0)}でした`, change: null }
  const diff = c.now - c.before
  const pct = Math.round((diff / c.before) * 100)
  return { lead: `先月の${day}日${until}と比べて`, change: `${show(diff, { signed: true })}（${formatNumber(pct, { signed: true })}%）` }
}

export type TodoFacts = {
  overdue: { count: number; oldestDue: string | null; daysOver: number }
  unmatched: { count: number; oldestReceived: string | null }
  drafts: { count: number }
}

export function todoOf(data: HomeData, today: string): TodoFacts {
  const overdue = overdueOn(data.invoices, today).sort((a, b) => a.dueOn.localeCompare(b.dueOn))
  const unmatched = data.payments.filter((p) => paymentStatus(p, data.invoices) === 'unmatched').sort((a, b) => a.receivedOn.localeCompare(b.receivedOn))
  return {
    overdue: { count: overdue.length, oldestDue: overdue[0]?.dueOn ?? null, daysOver: overdue[0] ? -daysUntil(overdue[0].dueOn, today) : 0 },
    unmatched: { count: unmatched.length, oldestReceived: unmatched[0]?.receivedOn ?? null },
    drafts: { count: data.invoices.filter((i) => i.status === 'draft').length },
  }
}

export const todoTotal = (t: TodoFacts) => t.overdue.count + t.unmatched.count + t.drafts.count

/** 最近の動きに載せる出来事。作ったことは送る・保存すると重なるので載せない。 */
const SHOWN: HistoryKind[] = ['saved', 'sent', 'paid', 'voided']

/** 最近の動きに載せる件数の上限（多くても 5 件）。骨組みの行数・テストもここから引く（1 か所：S-06）。 */
export const ACTIVITY_LIMIT = 5

export type HomeEvent = { id: string; at: string; kind: HistoryKind; invoice: Invoice; clientName: string }

export function recentEvents(data: HomeData, now: Date, limit = ACTIVITY_LIMIT): HomeEvent[] {
  const all = data.invoices.flatMap((invoice) =>
    invoice.history
      .filter((h) => SHOWN.includes(h.kind) && new Date(h.at).getTime() <= now.getTime())
      .map((h) => ({ id: h.id, at: h.at, kind: h.kind, invoice, clientName: clientOf(invoice.clientId, data.clients)?.name ?? MISSING })),
  )
  return all.sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id)).slice(0, limit)
}
