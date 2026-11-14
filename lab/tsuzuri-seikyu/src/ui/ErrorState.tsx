import { Button } from './Button'
import { cn } from './cn'
import { Icon } from './Icon'

type Props = {
  title?: string
  /** 何が起きたかと、どうすれば直るか。謝るだけにしない。 */
  description: string
  onRetry?: () => void
  /** 再試行の最中。 */
  retrying?: boolean
  className?: string
}

/** CMP-015。取得や送信に失敗したとき。role=alert で読み上げる。再試行の手段をその場に置く。 */
export function ErrorState({ title = '読み込めませんでした', description, onRetry, retrying = false, className }: Props) {
  return (
    <div data-cmp="CMP-015" role="alert" className={cn('flex flex-col items-center gap-3 px-4 py-12 text-center', className)}>
      <Icon name="circle-x" size="lg" className="text-bad" />
      <p className="text-large font-bold">{title}</p>
      <p className="max-w-prose text-body text-muted">{description}</p>
      {onRetry && (
        <Button className="mt-2" busy={retrying} busyLabel="読み込んでいます" onClick={onRetry}>もう一度読み込む</Button>
      )}
    </div>
  )
}
