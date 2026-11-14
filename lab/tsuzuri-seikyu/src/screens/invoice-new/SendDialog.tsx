import { actions } from '../../app/terms'
import { Button, Dialog, Money, Notice } from '../../ui'
import { copy } from './copy'

type Props = {
  open: boolean
  busy: boolean
  failed: boolean
  clientName: string
  email: string
  total: number | null
  due: string
  onClose: () => void
  onSend: () => void
}

/** 送る前の確かめの窓。送ると番号が付き、相手にメールが届く（戻せない）ので、結果を先に言う（E-08・L-05）。 */
export function SendDialog({ open, busy, failed, clientName, email, total, due, onClose, onSend }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={copy.send.title}
      secondary={<Button onClick={onClose} disabled={busy}>{actions.cancel}</Button>}
      primary={<Button variant="primary" busy={busy} busyLabel={copy.send.busy} onClick={onSend}>{actions.sendInvoice}</Button>}
    >
      <div className="flex flex-col gap-4">
        {failed && <Notice tone="fail">{copy.send.failed}</Notice>}
        <dl className="flex flex-col gap-2">
          <div className="flex flex-col"><dt className="text-muted">{copy.send.to}</dt><dd>{clientName}</dd></div>
          <div className="flex flex-col"><dt className="text-muted">{copy.send.mail}</dt><dd>{email}</dd></div>
          <div className="flex flex-col"><dt className="text-muted">{copy.send.total}</dt><dd><Money value={total} size="large" /></dd></div>
          <div className="flex flex-col"><dt className="text-muted">{copy.send.due}</dt><dd>{due}</dd></div>
        </dl>
        <p>{copy.send.body}</p>
      </div>
    </Dialog>
  )
}
