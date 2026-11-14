import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from './cn'

type Props = Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'size'> & {
  /** 数字や金額は 'end'（右寄せ、等幅の数字）。 */
  align?: 'start' | 'end'
  /** 欄の中の前置き（「〒」など）と後置き（「円」など）。 */
  leading?: ReactNode
  trailing?: ReactNode
  /** 外側の配置（幅など）だけに使う。 */
  className?: string
}

/** CMP-006。1 行の入力欄。文字は 16px（iOS の拡大を防ぐ）、高さは 44px。誤りは aria-invalid で見た目も変わる。 */
export function TextInput({ align = 'start', leading, trailing, className, ...rest }: Props) {
  return (
    <span
      data-cmp="CMP-006"
      className={cn(
        'flex min-h-11 items-stretch gap-2 rounded-control border border-line-strong bg-panel px-3 transition-colors duration-(--dur-instant)',
        'focus-within:border-ai focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ai',
        'has-aria-invalid:border-bad has-disabled:bg-disabled-bg has-disabled:text-disabled-fg',
        className,
      )}
    >
      {leading && <span className="flex items-center text-body text-muted">{leading}</span>}
      <input
        className={cn('min-w-0 flex-1 bg-transparent py-2 text-large text-fg outline-none focus-visible:outline-none', align === 'end' && 'text-right tabular-nums')}
        {...rest}
      />
      {trailing && <span className="flex items-center text-body text-muted">{trailing}</span>}
    </span>
  )
}
