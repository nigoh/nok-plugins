import { clientOf, invoiceTotal, monthKey, type Client, type Invoice } from '../../data'

/**
 * 画面に出す数を作る関数（取得でも見た目でもない）。図・表・書き出しは、ここの同じ関数から作る（GP-7）。
 * 数え方：請求額＝送付済みと入金済みの請求書を請求日の月で。入金額＝入金済みの請求書を入金日の月で。
 * 下書きと取り消し済みは入れない。今日より後の日付は入れない。
 */
export const TOP_CLIENTS = 10
export const TOP_WHEN_OTHER_LARGER = 7

export type MonthFigure = {
  month: string
  /** null＝取れなかった月（0 とは別のもの：G-06） */
  billed: number | null
  paid: number | null
  /** 今月。まだ変わる（途中） */
  open: boolean
}

export const billedMonthOf = (inv: Invoice, today: string): string | null =>
  (inv.status === 'sent' || inv.status === 'paid') && inv.issuedOn <= today ? monthKey(inv.issuedOn) : null

export const paidMonthOf = (inv: Invoice, today: string): string | null =>
  inv.status === 'paid' && inv.paidOn !== null && inv.paidOn <= today ? monthKey(inv.paidOn) : null

/** 数え始め：まだ数えていない物を 0 から数える（欠損を 0 にするのではない）。 */
function add(map: Map<string, number>, key: string, n: number) {
  const cur = map.get(key)
  map.set(key, cur === undefined ? n : cur + n)
}
const calculated = (map: Map<string, number>, key: string): number => {
  const v = map.get(key)
  return v === undefined ? 0 : v
}

export function monthlyFigures(invoices: Invoice[], months: string[], today: string, failed: string[] = []): MonthFigure[] {
  const bill = new Map<string, number>()
  const pay = new Map<string, number>()
  for (const inv of invoices) {
    const b = billedMonthOf(inv, today)
    if (b) add(bill, b, invoiceTotal(inv))
    const p = paidMonthOf(inv, today)
    if (p) add(pay, p, invoiceTotal(inv))
  }
  const now = monthKey(today)
  return months.map((m) =>
    failed.includes(m)
      ? { month: m, billed: null, paid: null, open: m === now }
      : { month: m, billed: calculated(bill, m), paid: calculated(pay, m), open: m === now },
  )
}

/** 取れた月だけの合計。欠けを 0 とみなさない。counted＝数えた月の数。 */
export function totalsOf(figures: MonthFigure[]): { billed: number; paid: number; counted: number } {
  let billed = 0
  let paid = 0
  let counted = 0
  for (const f of figures) {
    if (f.billed === null || f.paid === null) continue
    billed += f.billed
    paid += f.paid
    counted += 1
  }
  return { billed, paid, counted }
}

/** 請求額がいちばん多い月（同じなら新しい月）。1 円も無いときは null。 */
export function topMonth(figures: MonthFigure[]): MonthFigure | null {
  let best: MonthFigure | null = null
  for (const f of figures) if (f.billed !== null && f.billed > 0 && (best === null || (best.billed !== null && f.billed >= best.billed))) best = f
  return best
}

export type ClientRow = { id: string; name: string; billed: number; paid: number; share: number }

/** 取引先別。月ごとの図と同じ範囲（期間の月・今日以前・取れた月）で数える。請求も入金も 0 の取引先は載せない。 */
export function clientRows(invoices: Invoice[], clients: Client[], months: string[], today: string, failed: string[] = []): ClientRow[] {
  const used = new Set(months.filter((m) => !failed.includes(m)))
  const bill = new Map<string, number>()
  const pay = new Map<string, number>()
  for (const inv of invoices) {
    const b = billedMonthOf(inv, today)
    if (b && used.has(b)) add(bill, inv.clientId, invoiceTotal(inv))
    const p = paidMonthOf(inv, today)
    if (p && used.has(p)) add(pay, inv.clientId, invoiceTotal(inv))
  }
  const ids = new Set([...bill.keys(), ...pay.keys()])
  const rows: Omit<ClientRow, 'share'>[] = []
  for (const id of ids) {
    const c = clientOf(id, clients)
    if (c) rows.push({ id, name: c.name, billed: calculated(bill, id), paid: calculated(pay, id) })
  }
  const total = rows.reduce((s, r) => s + r.billed, 0)
  return rows
    .map((r) => ({ ...r, share: total > 0 ? Math.round((r.billed / total) * 100) : 0 }))
    .sort((a, b) => b.billed - a.billed || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

export type BarItem = { key: string; label: string; billed: number; share: number; other: boolean }

/**
 * 取引先の棒に出す物。TOP_CLIENTS 社以下は全部。それより多ければ上位 TOP_CLIENTS＋「その他（N社）」。「その他」が 1 位より大きければ上位 TOP_WHEN_OTHER_LARGER（G-09）。
 * 「その他」の件数の文は呼ぶ側が決める（otherLabel）。
 */
export function topClients(rows: ClientRow[], otherLabel: (n: number) => string): BarItem[] {
  const item = (r: ClientRow): BarItem => ({ key: r.id, label: r.name, billed: r.billed, share: r.share, other: false })
  if (rows.length <= TOP_CLIENTS) return rows.map(item)
  const total = rows.reduce((s, r) => s + r.billed, 0)
  const restOf = (k: number) => rows.slice(k).reduce((s, r) => s + r.billed, 0)
  const k = restOf(TOP_CLIENTS) > rows[0].billed ? TOP_WHEN_OTHER_LARGER : TOP_CLIENTS
  const rest = restOf(k)
  const other: BarItem = { key: 'other', label: otherLabel(rows.length - k), billed: rest, share: total > 0 ? Math.round((rest / total) * 100) : 0, other: true }
  return [...rows.slice(0, k).map(item), other]
}
