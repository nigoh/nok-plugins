import { useMemo } from 'react'
import { Link } from '../../app/Link'
import { screenNames } from '../../app/terms'
import { dueNoteOf, formatDateColumn, TODAY } from '../../data'
import { DataTable, InvoiceStatusTag, invoiceStatusDef, tagDensityOf, type Column } from '../../parts'
import { Money } from '../../ui'
import { copy } from './copy'
import type { ListRow } from './query'

type Dates = { issued: string; due: string }

/**
 * 請求書の表。列は 取引先（番号・請求日の補助行）→ 状況 → 支払期限 → 税込金額（円）の 4 つ（G-04）。
 * 受け取るのはそのページの行だけ。日付の書き方は列ごとにそろえ、札の見え方は見えている札の調子から決める。
 * 枠が 672px 未満なら DataTable が 1 行ずつの形に組み替える。
 */
export function InvoiceTable({ rows }: { rows: ListRow[] }) {
  const dates = useMemo(() => {
    const issued = formatDateColumn(rows.map((r) => r.invoice.issuedOn), TODAY)
    const due = formatDateColumn(rows.map((r) => r.invoice.dueOn), TODAY)
    return new Map<string, Dates>(rows.map((r, i) => [r.invoice.id, { issued: issued[i], due: due[i] }]))
  }, [rows])
  const density = tagDensityOf(rows.map((r) => invoiceStatusDef[r.status].tone))

  const columns: Column<ListRow>[] = [
    {
      key: 'client',
      header: `${screenNames.clients}・番号・請求日`,
      main: true,
      render: (r) => (
        <div className="flex flex-col">
          <Link to="invoice-detail" params={{ id: r.invoice.id }}>
            {r.clientName}
            <span className="sr-only">{copy.rowOf(r.invoice.number)}</span>
          </Link>
          <div className="flex flex-wrap gap-x-4 font-normal text-muted">
            <span className="whitespace-nowrap">{r.invoice.number ?? copy.noNumber}</span>
            <span className="flex gap-1 whitespace-nowrap">
              <span>請求日</span>
              <span>{dates.get(r.invoice.id)?.issued}</span>
            </span>
          </div>
        </div>
      ),
    },
    { key: 'status', header: '状況', width: 'md', render: (r) => <InvoiceStatusTag status={r.status} density={density(invoiceStatusDef[r.status].tone)} /> },
    {
      key: 'due',
      header: '支払期限',
      width: 'md',
      render: (r) => {
        const note = dueNoteOf(r.invoice, TODAY)
        return (
          <div className="flex flex-col">
            <span className="whitespace-nowrap">{dates.get(r.invoice.id)?.due}</span>
            {note && <span className="whitespace-nowrap text-muted">{note}</span>}
          </div>
        )
      },
    },
    { key: 'total', header: '税込金額（円）', width: 'md', align: 'end', render: (r) => <Money value={r.total} unit={false} /> },
  ]

  return <DataTable label="請求書の一覧" columns={columns} rows={rows} rowKey={(r) => r.invoice.id} />
}
