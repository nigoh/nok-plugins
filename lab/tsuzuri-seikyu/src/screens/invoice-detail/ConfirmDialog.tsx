import { clientOf, clients, formatDate, invoiceTotal, formatYen, type Invoice } from '../../data'
import { actions, screenNames } from '../../app/terms'
import { Button, Dialog, Notice } from '../../ui'
import { Facts, type Fact } from './Facts'
import type { Op } from './operations'
import type { Failure } from './useInvoiceOps'
import { fact, repeated, windows } from './copy'

type Props = {
  /** 開いている窓。record は RecordDialog が持つので、ここでは null と同じに扱う。 */
  op: Op | null
  invoice: Invoice
  pending: boolean
  failure: Failure | null
  onConfirm: () => void
  onClose: () => void
}

/** 窓に出す対象（何を送る・取り消す・消すのかを窓の中で言う）。 */
function itemsOf(op: Op, invoice: Invoice): Fact[] {
  const client = clientOf(invoice.clientId, clients)
  const total: Fact = { label: fact.total, value: formatYen(invoiceTotal(invoice)) }
  const to = client?.contacts[0]
  if (op === 'send') return [{ label: fact.to, value: to ? `${client?.name}　${to.email}` : (client?.name ?? '—') }, total, { label: fact.due, value: formatDate(invoice.dueOn) }]
  if (op === 'void') return [{ label: fact.number, value: invoice.number ?? '—' }, { label: screenNames.clients, value: client?.name ?? '—' }, total]
  return [{ label: screenNames.clients, value: client?.name ?? '—' }, total]
}

/** CMP-012。送る・取り消す・下書きを削除する、の確認の窓。通信中は閉じられず、失敗は窓の中に残す。 */
export function ConfirmDialog({ op, invoice, pending, failure, onConfirm, onClose }: Props) {
  const shown = op && op !== 'record' ? op : null
  const def = shown ? windows[shown] : null
  const failed = shown && failure?.op === shown ? failure : null
  return (
    <Dialog
      open={shown !== null}
      onClose={onClose}
      title={def?.title ?? ''}
      dismissible={!pending}
      secondary={<Button disabled={pending} onClick={onClose}>{actions.cancel}</Button>}
      primary={def && <Button variant={def.danger ? 'danger' : 'primary'} busy={pending} busyLabel={def.busy} onClick={onConfirm}>{def.primary}</Button>}
    >
      {shown && def && (
        <div className="flex flex-col gap-4">
          <p>{def.body}</p>
          <Facts items={itemsOf(shown, invoice)} />
          {failed && (
            <Notice tone="fail" title={def.failure.title}>
              {def.failure.body}
              {failed.count >= 3 && <> {repeated}</>}
            </Notice>
          )}
        </div>
      )}
    </Dialog>
  )
}
