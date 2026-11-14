import { screenNames } from '../../app/terms'
import { formatNumber } from '../../data'
import { paginate } from '../../lib'
import { DataTable, type Column } from '../../parts'
import { Money, Pagination } from '../../ui'
import type { ClientRow } from './aggregate'
import { copy } from './copy'

type Row = { key: string; name: string; billed: number; paid: number; share: number | null; total: boolean }

const columns: Column<Row>[] = [
  { key: 'name', header: screenNames.clients, main: true, render: (r) => r.name },
  { key: 'billed', header: copy.columns.billed, align: 'end', width: 'md', render: (r) => <Money value={r.billed} unit={false} /> },
  { key: 'paid', header: copy.columns.paid, align: 'end', width: 'md', render: (r) => <Money value={r.paid} unit={false} /> },
  { key: 'share', header: copy.columns.share, align: 'end', width: 'sm', render: (r) => (r.share === null ? '' : <span className="tabular-nums">{formatNumber(r.share)}</span>) },
]

type Props = { rows: ClientRow[]; page: number; onPage: (page: number) => void; /** 更新中はページを送れない（E-04）。 */ disabled?: boolean }

/**
 * 取引先別の表（全件。請求額の多い順）。20 行以下は最後に合計の行、21 行以上は表の上に全件の合計の 1 行とページ送り（G-04）。
 * REQ-023 の内訳の本体なので、13 行以上でも畳まない（G-11 の項）。
 */
export function ClientTable({ rows, page, onPage, disabled = false }: Props) {
  const billed = rows.reduce((s, r) => s + r.billed, 0)
  const paid = rows.reduce((s, r) => s + r.paid, 0)
  const shown = paginate(rows, page)
  const paged = shown.paged
  const body: Row[] = shown.rows.map((r) => ({ key: r.id, name: r.name, billed: r.billed, paid: r.paid, share: r.share, total: false }))
  const all: Row[] = paged ? body : [...body, { key: 'total', name: copy.total, billed, paid, share: null, total: true }]
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {paged && <p className="text-body text-muted tabular-nums">{copy.pagedTotal(rows.length, billed, paid)}</p>}
      <DataTable label="取引先別の請求額と入金額の表" columns={columns} rows={all} rowKey={(r) => r.key} />
      {paged && <Pagination page={shown.page} total={rows.length} onChange={onPage} disabled={disabled} />}
    </div>
  )
}
