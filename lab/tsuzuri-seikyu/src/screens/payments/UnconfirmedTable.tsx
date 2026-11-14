import { differenceOf, bestOf, type Row } from './logic'
import { formatDateColumn, MISSING, TODAY } from '../../data'
import { DataTable, PaymentStatusTag, paymentStatusDef, type Column } from '../../parts'
import { Button, Checkbox, Icon, Money, type StatusTone, type TagDensity } from '../../ui'
import { copy } from './copy'

type Props = {
  /** いま見えている行（1 ページぶん）。 */
  rows: Row[]
  density: (tone: StatusTone) => TagDensity
  checkedIds: ReadonlySet<string>
  /** 開いている入金の id。 */
  openId: string | null
  /** 処理中の相手。ある間は、ほかの確認を押せない。 */
  busy: string | null
  /** 更新中・古い内容。確認を押せない理由は lockedReasonId の文が言う。 */
  locked: boolean
  lockedReasonId: string
  /** 一部失敗で残った入金の理由。 */
  failures: Record<string, string>
  /** 確認の送信が失敗した入金（パネルを開いていなければ、その行に知らせる）。 */
  failedId: string | null
  onToggle: (paymentId: string) => void
  onOpen: (paymentId: string) => void
  onConfirm: (row: Row) => void
}

/** 候補の補足の 1 行（名義の下）。 */
function noteOf(row: Row): string {
  const best = bestOf(row)
  if (!best) return copy.noRowCandidate
  const more = row.matched ? 0 : Math.max(0, row.cands.length - 1)
  return copy.rowCandidate(best.invoice.number, best.clientName, more, differenceOf(row.payment, best.invoice))
}

/**
 * 未確認の入金の表（組み合わせの DataTable に列を渡すだけ）。名義の列に、まとめて確認するためのチェックと、候補の補足を置く。
 * チェックの無い行は、文字の頭を 48px（チェックの箱 44px＋間 4px）空けて揃える（D-08）。
 */
export function UnconfirmedTable({ rows, density, checkedIds, openId, busy, locked, lockedReasonId, failures, failedId, onToggle, onOpen, onConfirm }: Props) {
  const dates = new Map(formatDateColumn(rows.map((r) => r.payment.receivedOn), TODAY).map((d, i) => [rows[i].payment.id, d]))
  const columns: Column<Row>[] = [
    {
      key: 'payer', header: copy.colPayer, main: true,
      render: (r) => {
        const name = r.payment.payerName === '' ? MISSING : r.payment.payerName
        const saveFailed = failedId === r.payment.id && openId !== r.payment.id
        const failure = saveFailed ? copy.confirmFailed : failures[r.payment.id]
        return (
          <div className="flex flex-col">
            {r.sure
              ? <Checkbox label={name} checked={checkedIds.has(r.payment.id)} onChange={() => onToggle(r.payment.id)} disabled={busy !== null} />
              : <p className="flex min-h-11 items-center pl-12">{name}</p>}
            <p className="pl-12 text-body font-normal text-muted">{noteOf(r)}</p>
            {failure && (
              <p role={saveFailed ? 'alert' : undefined} className="flex items-start gap-1 pl-12 text-body font-normal text-bad-text"><Icon name="alert" size="sm" className="mt-1" />{failure}</p>
            )}
          </div>
        )
      },
    },
    { key: 'date', header: copy.colDate, width: 'sm', render: (r) => <span className="whitespace-nowrap">{dates.get(r.payment.id)}</span> },
    { key: 'amount', header: copy.colAmount, width: 'sm', align: 'end', render: (r) => <Money value={r.payment.amount} unit={false} /> },
    { key: 'status', header: copy.colStatus, width: 'sm', render: (r) => <PaymentStatusTag status={r.status} density={density(paymentStatusDef[r.status].tone)} /> },
    {
      key: 'action', header: copy.colAction, width: 'lg',
      render: (r) => {
        const mine = busy === r.payment.id
        const name = r.payment.payerName
        const label = r.sure ? copy.confirmOne : r.status === 'diff' ? copy.checkDiff : copy.pickInvoice
        const stuck = locked || (busy !== null && !mine)
        if (r.sure) {
          return (
            <Button
              busy={mine} busyLabel={copy.confirmBusy} disabled={stuck} aria-describedby={locked ? lockedReasonId : undefined}
              aria-label={copy.forPayer(name, label)} onClick={() => onConfirm(r)}
            >
              {label}
            </Button>
          )
        }
        return (
          <Button aria-expanded={openId === r.payment.id} aria-controls="payments-panel" aria-label={copy.forPayer(name, label)} onClick={() => onOpen(r.payment.id)}>
            {label}
          </Button>
        )
      },
    },
  ]
  return <DataTable label={copy.unconfirmedTable} columns={columns} rows={rows} rowKey={(r) => r.payment.id} />
}
