import { Button, Notice } from '../../ui'
import { copy } from './copy'

/** 相手の内容を読み込んだあと、自分の入力を戻せる口を残す（E-09）。 */
export function BackupNotice({ onRestore }: { onRestore: () => void }) {
  return (
    <Notice tone="info" action={<Button onClick={onRestore}>{copy.backup.restore}</Button>}>
      {copy.backup.body}
    </Notice>
  )
}
