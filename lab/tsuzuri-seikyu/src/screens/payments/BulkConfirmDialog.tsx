import { actions } from '../../app/terms'
import { formatYen, MISSING } from '../../data'
import { Button, Dialog, Money, Notice } from '../../ui'
import { bestOf, sumAmount, type Row } from './logic'
import { copy } from './copy'

/** 内訳を出す件数の上限。これを超えるときは、件数と合計額だけを言う（E-08：5 件以上は窓 1 回に件数と合計額）。 */
const DETAIL_MAX = 4

type Props = {
  open: boolean
  rows: Row[]
  /** 確認している最中。窓は閉じられず、押した「入金を確認する」だけが処理中になる。 */
  busy: boolean
  /** 確認の送信が失敗した（save_failed）。窓は閉じず、選んだ内容を残して、もう一度確認できる。 */
  failed: boolean
  onClose: () => void
  onConfirm: () => void
}

/** まとめて確認する窓。起きること 1 文＋戻せるか 1 文。件数と合計額、少ないときは内訳を項目で並べる。 */
export function BulkConfirmDialog({ open, rows, busy, failed, onClose, onConfirm }: Props) {
  const total = sumAmount(rows)
  return (
    <Dialog
      open={open} onClose={onClose} title={copy.dialogTitle(rows.length)} dismissible={!busy}
      secondary={<Button onClick={onClose} disabled={busy}>{actions.cancel}</Button>}
      primary={<Button variant="primary" busy={busy} busyLabel={copy.confirmBusy} onClick={onConfirm}>{failed ? copy.retryFailed : copy.confirmOne}</Button>}
    >
      <div className="flex flex-col gap-4">
        <p>{copy.dialogBody}</p>
        <dl className="flex flex-col gap-1">
          <div className="flex gap-4"><dt className="w-16 shrink-0 text-muted">{copy.dialogCount}</dt><dd>{copy.countValue(rows.length)}</dd></div>
          <div className="flex gap-4"><dt className="w-16 shrink-0 text-muted">{copy.dialogTotal}</dt><dd>{formatYen(total)}</dd></div>
        </dl>
        {rows.length <= DETAIL_MAX && (
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {rows.map((r) => (
              <li key={r.payment.id} className="flex items-start justify-between gap-4 py-3">
                <span className="flex min-w-0 flex-col">
                  <span className="font-bold">{r.payment.payerName}</span>
                  <span className="text-muted">{bestOf(r)?.invoice.number ?? MISSING}</span>
                </span>
                <Money value={r.payment.amount} />
              </li>
            ))}
          </ul>
        )}
        {failed && <Notice tone="fail">{copy.confirmFailed}</Notice>}
      </div>
    </Dialog>
  )
}
