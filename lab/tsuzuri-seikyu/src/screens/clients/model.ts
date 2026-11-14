import { invoiceTotal, isUnpaid, type Client, type Invoice } from '../../data'
import { matchesWords } from '../../lib'

/** 取引先 1 件ぶんの行。未入金額・件数・最も早い期限は請求書から計算する（持たずに計算：S-07）。 */
export type ClientRow = {
  client: Client
  /** 未入金（送付済みと期限超過）の請求書の税込の合計。円。0 は「計算して 0」。 */
  unpaid: number
  unpaidCount: number
  /** 未入金の請求書のうち、支払期限が最も早い日。未入金が無ければ null。 */
  earliestDue: string | null
}

/** 取引先ごとの未入金額を請求書から数える。 */
export function rowsFrom(clients: Client[], invoices: Invoice[]): ClientRow[] {
  return clients.map((client) => {
    const open = invoices.filter((i) => i.clientId === client.id && isUnpaid(i))
    const dues = open.map((i) => i.dueOn).sort()
    return { client, unpaid: open.reduce((sum, i) => sum + invoiceTotal(i), 0), unpaidCount: open.length, earliestDue: dues[0] ?? null }
  })
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** 並び順の定義 1 か所（表示・検査・テストはここから引く：S-03）。既定は先頭（読み仮名順：G-04）。 */
export const SORTS = [
  { value: 'kana', label: '読み仮名順', compare: (a: ClientRow, b: ClientRow) => compare(a.client.kana, b.client.kana) },
  { value: 'unpaid', label: '未入金額の多い順', compare: (a: ClientRow, b: ClientRow) => b.unpaid - a.unpaid || compare(a.client.kana, b.client.kana) },
] as const

export type SortKey = (typeof SORTS)[number]['value']
export const DEFAULT_SORT: SortKey = SORTS[0].value
export const isSortKey = (v: string | null): v is SortKey => SORTS.some((s) => s.value === v)
export const sortLabel = (key: SortKey) => SORTS.find((s) => s.value === key)?.label ?? SORTS[0].label

/** 探す語との照合（語の分け方・比べ方は lib の matchesWords）。照合先は取引先名と読み仮名だけ。担当者名などの個人名は対象にしない（REQ-027）。 */
export const clientMatches = (row: ClientRow, q: string): boolean => matchesWords([row.client.name, row.client.kana], q)

export function arrange(rows: ClientRow[], q: string, sort: SortKey): ClientRow[] {
  const order = SORTS.find((s) => s.value === sort) ?? SORTS[0]
  return rows.filter((r) => clientMatches(r, q)).sort(order.compare)
}

export const sumUnpaid = (rows: ClientRow[]) => rows.reduce((sum, r) => sum + r.unpaid, 0)
