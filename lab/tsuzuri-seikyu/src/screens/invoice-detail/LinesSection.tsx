import { paramNumber, useUrlParam } from '../../app/nav'
import { formatNumber, lineAmount, type Invoice, type InvoiceLine } from '../../data'
import { paginate } from '../../lib'
import { DataTable, type Column } from '../../parts'
import { Money, Pagination } from '../../ui'
import { columns as head, page as copy } from './copy'
import { Totals } from './Totals'

const columns: Column<InvoiceLine>[] = [
  { key: 'description', header: head.description, main: true, render: (l) => <span className="break-words">{l.description}</span> },
  { key: 'quantity', header: head.quantity, width: 'sm', align: 'end', render: (l) => `${formatNumber(l.quantity)}${l.unit}` },
  { key: 'unitPrice', header: head.unitPrice, width: 'md', align: 'end', render: (l) => <Money value={l.unitPrice} unit={false} /> },
  { key: 'taxRate', header: head.taxRate, width: 'sm', align: 'end', render: (l) => `${l.taxRate}%` },
  { key: 'amount', header: head.amount, width: 'md', align: 'end', render: (l) => <Money value={lineAmount(l)} unit={false} /> },
]

/** 明細（1 ページを超えたらページ送り：G-10）と合計の内訳。合計は全行から計算する。ページは URL（?page=）に持つ。 */
export function LinesSection({ invoice }: { invoice: Invoice }) {
  const [pageRaw, setPage] = useUrlParam('page', '1')
  const { rows, page, total, paged } = paginate(invoice.lines, paramNumber(pageRaw))
  return (
    <section aria-labelledby="lines-h" className="flex flex-col gap-4">
      <h2 id="lines-h" className="text-large font-bold">{copy.lines}</h2>
      <DataTable label={copy.lines} columns={columns} rows={rows} rowKey={(l) => l.id} />
      {paged && <Pagination page={page} total={total} onChange={(p) => setPage(String(p))} />}
      <Totals lines={invoice.lines} rounding={invoice.rounding} />
    </section>
  )
}
