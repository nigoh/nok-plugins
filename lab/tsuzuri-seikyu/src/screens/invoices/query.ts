import { clientOf, displayStatus, invoiceTotal, MISSING, TODAY, type Client, type Invoice, type InvoiceDisplayStatus } from '../../data'
import { matchesWords } from '../../lib'

/**
 * 請求書の一覧の「条件」と、その読み方・並べ方・探し方。画面を知らない（見た目も取得も持たない）。
 * 条件は URL に持つ（status・q・sort・page。既定の値は書かない）。
 */

export type StatusFilter = 'all' | InvoiceDisplayStatus
/** 状況の欄の並び。流れの順に、期限超過は送付済みの隣。 */
export const STATUS_FILTERS: StatusFilter[] = ['all', 'draft', 'sent', 'overdue', 'paid', 'void']

export type Query = { status: StatusFilter; q: string; sort: SortKey; page: number }

/** 一覧の 1 行。取引先の名前などを引いておき、並べる・探す・出すの全部がこれを使う。 */
export type ListRow = {
  invoice: Invoice
  clientName: string
  clientKana: string
  status: InvoiceDisplayStatus
  /** 税込の合計（円） */
  total: number
}

/** 入金を待っている・まだ送っていない（人がこれから動く）。それ以外は片付いている。 */
const settled = (s: InvoiceDisplayStatus) => s === 'paid' || s === 'void'
const byId = (a: ListRow, b: ListRow) => a.invoice.id.localeCompare(b.invoice.id)

/**
 * 並べ替えの定義 1 か所（欄の選択肢・URL の検査・件数の行の文がここから出る）。
 * due：入金待ち（下書き・送付済み・期限超過）を支払期限の早い順に先に、入金済み・取り消し済みを後ろに（支払期限の新しい順）。
 * 昇順のままだと先頭が過去の入金済みになり、行動に結びつかないため（data.md G-04）。
 */
export const SORTS = {
  due: {
    label: '支払期限が近い順',
    note: '入金待ちを先に、支払期限が近い順',
    compare: (a: ListRow, b: ListRow) =>
      Number(settled(a.status)) - Number(settled(b.status)) ||
      (settled(a.status) ? b.invoice.dueOn.localeCompare(a.invoice.dueOn) : a.invoice.dueOn.localeCompare(b.invoice.dueOn)) ||
      byId(a, b),
  },
  due_desc: { label: '支払期限が遠い順', note: '支払期限が遠い順', compare: (a: ListRow, b: ListRow) => b.invoice.dueOn.localeCompare(a.invoice.dueOn) || byId(a, b) },
  issued_desc: { label: '請求日が新しい順', note: '請求日が新しい順', compare: (a: ListRow, b: ListRow) => b.invoice.issuedOn.localeCompare(a.invoice.issuedOn) || byId(a, b) },
  issued: { label: '請求日が古い順', note: '請求日が古い順', compare: (a: ListRow, b: ListRow) => a.invoice.issuedOn.localeCompare(b.invoice.issuedOn) || byId(a, b) },
  amount_desc: { label: '金額が大きい順', note: '金額が大きい順', compare: (a: ListRow, b: ListRow) => b.total - a.total || byId(a, b) },
  amount: { label: '金額が小さい順', note: '金額が小さい順', compare: (a: ListRow, b: ListRow) => a.total - b.total || byId(a, b) },
} as const

export type SortKey = keyof typeof SORTS
export const DEFAULT_SORT: SortKey = 'due'
export const SORT_KEYS = Object.keys(SORTS) as SortKey[]

export const DEFAULT_QUERY: Query = { status: 'all', q: '', sort: DEFAULT_SORT, page: 1 }

const isSort = (v: string | null): v is SortKey => v !== null && v in SORTS
const isStatus = (v: string | null): v is StatusFilter => v !== null && (STATUS_FILTERS as string[]).includes(v)

/** URL の読み取り。知らない値は既定に戻す。 */
export function parseQuery(p: URLSearchParams): Query {
  const status = p.get('status')
  const sort = p.get('sort')
  const page = Number.parseInt(p.get('page') ?? '', 10)
  return {
    status: isStatus(status) ? status : DEFAULT_QUERY.status,
    q: p.get('q') ?? '',
    sort: isSort(sort) ? sort : DEFAULT_SORT,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  }
}

/** 条件を URL の文字にする。ほかの項目（screen・state）は残し、既定の値は書かない。 */
export function withQuery(search: string, q: Query): string {
  const p = new URLSearchParams(search)
  const set = (key: string, value: string, isDefault: boolean) => (isDefault ? p.delete(key) : p.set(key, value))
  set('status', q.status, q.status === DEFAULT_QUERY.status)
  set('q', q.q, q.q === '')
  set('sort', q.sort, q.sort === DEFAULT_SORT)
  set('page', String(q.page), q.page <= 1)
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** 条件（状況・探す語）が 1 つも無いか。並び・ページは条件ではない。 */
export const hasNoConditions = (q: Pick<Query, 'status' | 'q'>) => q.status === 'all' && q.q.trim() === ''

/** 請求書と取引先から、一覧の行を作る。 */
export function buildInvoiceRows(invoices: Invoice[], clients: Client[]): ListRow[] {
  return invoices.map((invoice) => {
    const client = clientOf(invoice.clientId, clients)
    return { invoice, clientName: client?.name ?? MISSING, clientKana: client?.kana ?? '', status: displayStatus(invoice, TODAY), total: invoiceTotal(invoice) }
  })
}

/** 探す語との照合（語の分け方・比べ方は lib の matchesWords）。照合先は取引先名・取引先のかな・請求書番号。 */
export const invoiceMatches = (row: ListRow, q: string): boolean => matchesWords([row.clientName, row.clientKana, row.invoice.number ?? ''], q)

/** 状況ごとの件数（探す語には影響されない。状況の欄の選択肢に出す）。 */
export function countByStatus(rows: ListRow[]): Record<StatusFilter, number> {
  const n = (s: InvoiceDisplayStatus) => rows.filter((r) => r.status === s).length
  return { all: rows.length, draft: n('draft'), sent: n('sent'), overdue: n('overdue'), paid: n('paid'), void: n('void') }
}

/** 条件に合う行を、並べ替えの順に。 */
export function selectRows(rows: ListRow[], q: Pick<Query, 'status' | 'q' | 'sort'>): ListRow[] {
  return rows.filter((r) => (q.status === 'all' || r.status === q.status) && invoiceMatches(r, q.q)).sort(SORTS[q.sort].compare)
}
