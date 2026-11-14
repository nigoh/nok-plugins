import { Notice, Button } from '../../ui'
import { canTreatAsFee } from './logic'
import { copy } from './copy'

type Props = {
  amount: number
  total: number
  /** 入金額 − 請求額。 */
  diff: number
  busy: boolean
  /** 更新中・古い内容・ほかを処理中のとき true。理由は locked の説明（親）が近くに書く。 */
  locked: boolean
  lockedReasonId?: string
  onBack: () => void
  onFee: () => void
}

/**
 * 差額の知らせと、2 つの選択（確認せず戻る／差額を手数料として確認する）。窓にせず、選んだ請求書のすぐ下に置く（E-08）。
 * 差額が手数料の範囲を超えるときは、確認の選択を出さず、戻るだけ（黙って確定しない）。
 */
export function DiffChoice({ amount, total, diff, busy, locked, lockedReasonId, onBack, onFee }: Props) {
  const fee = canTreatAsFee(diff)
  return (
    <div className="flex flex-col gap-4">
      <Notice tone="warn" title={copy.diffTitle}>
        <div className="flex flex-col gap-1">
          <p>{copy.diffBody(amount, total, diff)}</p>
          <p>{fee ? copy.diffReason : copy.diffTooBig}</p>
          <p>{copy.diffDirection}</p>
        </div>
      </Notice>
      <div className="flex flex-col gap-2 md:flex-row md:justify-end">
        <Button onClick={onBack} disabled={busy}>{copy.backWithoutConfirm}</Button>
        {fee && (
          <Button busy={busy} busyLabel={copy.confirmBusy} disabled={locked} aria-describedby={locked ? lockedReasonId : undefined} onClick={onFee}>
            {copy.confirmAsFee}
          </Button>
        )}
      </div>
    </div>
  )
}
