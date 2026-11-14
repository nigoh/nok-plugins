import { Link } from '../../app/Link'
import { screenNames } from '../../app/terms'
import { formatDateColumn, MISSING, TODAY } from '../../data'
import { DataTable, PaymentStatusTag, paymentStatusDef, type Column } from '../../parts'
import { Money, type StatusTone, type TagDensity } from '../../ui'
import type { Row } from './logic'
import { copy } from './copy'

type Props = {
  rows: Row[]
  density: (tone: StatusTone) => TagDensity
  /** 差額を手数料として確認した入金の差額（入金 id → 円）。 */
  fees: Record<string, number>
}

/** 確認済みの入金の表。突き合わせた請求書の番号は、請求書の詳細へのリンク（行き先は URL の id）。 */
export function ConfirmedTable({ rows, density, fees }: Props) {
  const dates = new Map(formatDateColumn(rows.map((r) => r.payment.receivedOn), TODAY).map((d, i) => [rows[i].payment.id, d]))
  const columns: Column<Row>[] = [
    { key: 'payer', header: copy.colPayer, main: true, render: (r) => (r.payment.payerName === '' ? MISSING : r.payment.payerName) },
    { key: 'date', header: copy.colDate, width: 'sm', render: (r) => <span className="whitespace-nowrap">{dates.get(r.payment.id)}</span> },
    { key: 'amount', header: copy.colAmount, width: 'sm', align: 'end', render: (r) => <Money value={r.payment.amount} unit={false} /> },
    {
      key: 'invoice', header: screenNames.invoices, width: 'lg',
      render: (r) => {
        const inv = r.matched?.invoice
        const fee = fees[r.payment.id]
        if (!inv) return MISSING
        return (
          <span className="flex flex-col">
            <Link to="invoice-detail" params={{ id: inv.id }} inline className="inline-flex min-h-11 items-center">{inv.number ?? MISSING}</Link>
            {fee !== undefined && <span className="text-body text-muted">{copy.feeNote(fee)}</span>}
          </span>
        )
      },
    },
    { key: 'status', header: copy.colStatus, width: 'sm', render: (r) => <PaymentStatusTag status={r.status} density={density(paymentStatusDef[r.status].tone)} /> },
  ]
  return <DataTable label={copy.confirmedTable} columns={columns} rows={rows} rowKey={(r) => r.payment.id} />
}
