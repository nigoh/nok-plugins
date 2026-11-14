import type { ReactNode } from 'react'
import { formatTime } from '../lib'
import { Button, Notice } from '../ui'
import { actions, messages } from './terms'

type StaleProps = {
  /** 前のデータの時点（ISO）。useFake の stale が持つ asOf。 */
  asOf: string
  retry: () => void
  retrying?: boolean
  /** 画面固有の補足（「未入金額は更新前の金額です」「この間は、表を書き出せません」）。省略すると標準の 1 文。 */
  children?: ReactNode
}

/**
 * [CMP-040] 古い内容の知らせ（stale）。前のデータを残したまま「HH:MM 時点の内容です」と言い、「もう一度読み込む」を置く。
 * お金・番号・期限を確定する操作は、画面が押せなくして理由を children に書く（E-04）。文言は terms の messages に 1 つ。
 */
export function StaleNotice({ asOf, retry, retrying = false, children }: StaleProps) {
  return (
    <Notice
      tone="warn"
      title={messages.staleTitle(formatTime(asOf))}
      action={<Button busy={retrying} busyLabel={messages.loading} onClick={retry}>{actions.retry}</Button>}
    >
      {children ?? messages.staleBody}
    </Notice>
  )
}

/**
 * [CMP-040] 更新中（refreshing）の 1 文。前のデータを残し、骨組みは出さない。操作を止めるときは理由を children に続ける。
 * 読み上げには role=status で伝える。
 */
export function RefreshingNote({ id, children }: { /** 押せない操作の aria-describedby が指す id。 */ id?: string; children?: ReactNode }) {
  return (
    <p id={id} role="status" data-cmp="CMP-040" className="text-body text-muted">
      {messages.refreshing}
      {children && <>。{children}</>}
    </p>
  )
}
