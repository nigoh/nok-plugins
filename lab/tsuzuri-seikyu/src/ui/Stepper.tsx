import { cn } from './cn'
import { Icon } from './Icon'

type Props = {
  /** 段の名前。短く（6 字ほど）。折り返さない。 */
  steps: string[]
  /** いまの段（1 から）。これより前は済み、あとは先。 */
  current: number
  /** 読み上げ名（「はじめての設定の進み具合」など）。 */
  label: string
  className?: string
}

/** CMP-017。順番に進むものの現在地と全体の数。済み=check、いま=ai の太い字、先=薄い字。色だけにしない。 */
export function Stepper({ steps, current, label, className }: Props) {
  return (
    <nav data-cmp="CMP-017" aria-label={label} className={className}>
      <ol className="flex">
        {steps.map((s, i) => {
          const n = i + 1
          const done = n < current
          const here = n === current
          return (
            <li key={s} aria-current={here ? 'step' : undefined} className="relative flex flex-1 flex-col items-center gap-1 text-center text-body">
              {i > 0 && <span aria-hidden="true" className={cn('absolute top-4 right-1/2 h-px w-full -translate-y-1/2', n <= current ? 'bg-ai' : 'bg-line-strong')} />}
              <span className={cn('relative flex size-8 items-center justify-center rounded-chip border text-body font-bold', done ? 'border-ai bg-ai text-on-ai' : here ? 'border-ai bg-ai-soft text-ai-text' : 'border-line-strong bg-panel text-muted')}>
                {done ? <Icon name="check" size="sm" /> : n}
              </span>
              <span className={cn(here ? 'font-bold text-fg' : 'text-muted')}>{s}</span>
              <span className="sr-only">{done ? '（済み）' : here ? `（いま。全${steps.length}段のうち${n}段目）` : '（これから）'}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
