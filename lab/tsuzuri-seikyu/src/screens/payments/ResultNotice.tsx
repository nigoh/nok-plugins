import { Button, Notice } from '../../ui'
import type { BulkResult } from './fixtures'
import { copy } from './copy'

type Props = {
  result: BulkResult
  /** 入金 id → 名義。 */
  names: Record<string, string>
  /** 失敗した入金の id → 理由（まだ確認できていない物だけ）。 */
  failures: Record<string, string>
  busy: boolean
  /** 更新中・古い内容のとき true。 */
  locked: boolean
  /** 失敗した分の確認し直しも失敗した（save_failed）。 */
  retryFailed: boolean
  onRetry: () => void
}

/** まとめて確認した結果が一部だけ失敗したときの知らせ。成功と失敗を分けて言い、失敗した分だけ確認し直せる（E-06）。 */
export function ResultNotice({ result, names, failures, busy, locked, retryFailed, onRetry }: Props) {
  const failedIds = Object.keys(failures)
  return (
    <Notice
      tone="warn" title={copy.partialTitle(result.total, result.confirmed.length)}
      action={<Button busy={busy} busyLabel={copy.retryBusy} disabled={locked} onClick={onRetry}>{copy.retryFailed}</Button>}
    >
      <div className="flex flex-col gap-2">
        <p>{copy.partialBody(failedIds.length)}</p>
        <div>
          <p className="font-bold">{copy.okList}</p>
          <ul>{result.confirmed.map((id) => <li key={id}>{names[id]}</li>)}</ul>
        </div>
        <div>
          <p className="font-bold">{copy.failedList}</p>
          <ul>{failedIds.map((id) => <li key={id}>{names[id]}　{failures[id]}</li>)}</ul>
        </div>
        {retryFailed && <p role="alert" className="font-bold">{copy.confirmFailed}</p>}
      </div>
    </Notice>
  )
}
