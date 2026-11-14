import { Button, Dialog } from '../ui'
import { actions, messages } from './terms'

type Props = {
  open: boolean
  /** 「保存して離れる」を実行している最中。窓は閉じず、押せなくする。 */
  saving?: boolean
  /** 保存の手段があるか。無ければ主は「入力に戻る」になる（保存して離れるは出さない）。 */
  canSave: boolean
  onStay: () => void
  onDiscard: () => void
  onSave: () => void
}

/**
 * [CMP-037] 離れる前の確かめ（変更があるときだけ。入力が消えて戻せないので窓で確かめる：E-08・F-09）。
 * 並びは 保存せず離れる（danger）→ 入力に戻る → 保存して離れる（主）。縦に積むときも同じ順で主が下（D-05）。
 * 文言は terms から。画面は持たない（AppShell が持つ）。
 */
export function LeaveDialog({ open, saving = false, canSave, onStay, onDiscard, onSave }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onStay}
      title={canSave ? messages.leave.title : messages.leave.titlePlain}
      dismissible={!saving}
      secondary={
        <>
          <Button variant="danger" disabled={saving} onClick={onDiscard}>{actions.discardAndLeave}</Button>
          {canSave && <Button disabled={saving} onClick={onStay}>{actions.backToInput}</Button>}
        </>
      }
      primary={canSave
        ? <Button variant="primary" busy={saving} busyLabel={messages.saving} onClick={onSave}>{actions.saveAndLeave}</Button>
        : <Button variant="primary" onClick={onStay}>{actions.backToInput}</Button>}
    >
      <p data-cmp="CMP-037">{messages.leave.body}</p>
    </Dialog>
  )
}
