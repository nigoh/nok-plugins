import { cn } from './cn'

type Props = {
  /** lines=文章の行、block=四角（高さは className で、例 h-24）。 */
  variant?: 'lines' | 'block'
  lines?: number
  /** 読み上げに伝える言葉。 */
  label?: string
  className?: string
}

/**
 * CMP-013。形が予想できる読み込みの骨組み。役割：待ち。0.3 秒たってから現れる（短い待ちでちらつかせない）。動かさない。
 * 読み上げには role=status で伝える。
 */
export function Skeleton({ variant = 'lines', lines = 3, label = '読み込んでいます', className }: Props) {
  return (
    <div data-cmp="CMP-013" role="status" aria-busy="true" className={cn('animate-wait-in', className)}>
      <span className="sr-only">{label}</span>
      {variant === 'block' ? (
        <div aria-hidden="true" className="h-full min-h-12 w-full rounded-card bg-col" />
      ) : (
        <div aria-hidden="true" className="flex flex-col gap-3">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className={cn('h-4 rounded-tag bg-col', i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')} />
          ))}
        </div>
      )}
    </div>
  )
}
