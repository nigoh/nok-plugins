import type { ComponentPropsWithoutRef } from 'react'
import { cn } from './cn'
import { Icon } from './Icon'

export type SelectOption = { value: string; label: string }

type Props = Omit<ComponentPropsWithoutRef<'select'>, 'className' | 'children'> & {
  options: SelectOption[]
  /** 未選択のときの 1 行目（「選んでください」など）。 */
  placeholder?: string
  className?: string
}

/** CMP-007。標準のセレクト（6〜15 個の選択肢）。開いた一覧は端末のものに任せる。 */
export function Select({ options, placeholder, className, ...rest }: Props) {
  return (
    <span data-cmp="CMP-007" className={cn('relative block', className)}>
      <select
        className="min-h-11 w-full appearance-none rounded-control border border-line-strong bg-panel py-2 pr-12 pl-3 text-large text-fg transition-colors duration-(--dur-instant) focus-visible:border-ai aria-invalid:border-bad disabled:bg-disabled-bg disabled:text-disabled-fg"
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
    </span>
  )
}
