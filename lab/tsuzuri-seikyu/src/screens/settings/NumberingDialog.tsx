import { Button, Dialog, Notice } from '../../ui'
import { numberExample } from './model'
import { TODAY } from '../../data'
import { actions, messages } from '../../app/terms'
import { copy } from './copy'

type Props = { open: boolean; from: string; to: string; issuedThisYear: number; saving: boolean; failed: boolean; onClose: () => void; onConfirm: () => void }

/** 番号の頭を変える前の確かめ。取り消せない影響（次の番号の付き方）なので窓で、いまと変えたあとの例を並べる（E-08）。 */
export function NumberingDialog({ open, from, to, issuedThisYear, saving, failed, onClose, onConfirm }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={copy.numbering.title}
      dismissible={!saving}
      secondary={<Button disabled={saving} onClick={onClose}>{actions.cancel}</Button>}
      primary={<Button variant="primary" busy={saving} busyLabel={messages.saving} onClick={onConfirm}>{copy.numbering.confirm}</Button>}
    >
      <div className="flex flex-col gap-4">
        <p>{copy.numbering.body}</p>
        <dl className="flex flex-col gap-2">
          <div className="flex gap-4"><dt className="w-24 text-muted">{copy.numbering.now}</dt><dd className="font-bold">{numberExample(from, issuedThisYear, TODAY)}</dd></div>
          <div className="flex gap-4"><dt className="w-24 text-muted">{copy.numbering.after}</dt><dd className="font-bold">{numberExample(to, issuedThisYear, TODAY)}</dd></div>
        </dl>
        {failed && <Notice tone="fail">{messages.saveFailed}</Notice>}
      </div>
    </Dialog>
  )
}
