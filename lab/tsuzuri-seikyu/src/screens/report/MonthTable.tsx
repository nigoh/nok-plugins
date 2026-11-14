import { DataTable, type Column } from '../../parts'
import { Money } from '../../ui'
import type { MonthFigure } from './aggregate'
import { totalsOf } from './aggregate'
import { copy } from './copy'

type Row = { key: string; label: string; billed: number | null; paid: number | null; total: boolean }

const columns: Column<Row>[] = [
  { key: 'month', header: copy.columns.month, main: true, render: (r) => r.label },
  { key: 'billed', header: copy.columns.billed, align: 'end', width: 'md', render: (r) => <Bold on={r.total}><Money value={r.billed} unit={false} /></Bold> },
  { key: 'paid', header: copy.columns.paid, align: 'end', width: 'md', render: (r) => <Bold on={r.total}><Money value={r.paid} unit={false} /></Bold> },
]

function Bold({ on, children }: { on: boolean; children: React.ReactNode }) {
  return on ? <strong className="font-bold">{children}</strong> : <>{children}</>
}

/** 月ごとの表（図の直下。12 行以下なので常に見せる：G-11）。最後に合計。取れない月は「—」で、合計は取れた月だけ（G-06）。 */
export function MonthTable({ figures }: { figures: MonthFigure[] }) {
  const sum = totalsOf(figures)
  const rows: Row[] = [
    ...figures.map((f) => ({ key: f.month, label: copy.monthLabel(f.month, f.open), billed: f.billed, paid: f.paid, total: false })),
    { key: 'total', label: sum.counted < figures.length ? copy.totalPartial(sum.counted) : copy.total, billed: sum.billed, paid: sum.paid, total: true },
  ]
  return <DataTable label="月ごとの請求額と入金額の表" columns={columns} rows={rows} rowKey={(r) => r.key} className="max-w-3xl" />
}
