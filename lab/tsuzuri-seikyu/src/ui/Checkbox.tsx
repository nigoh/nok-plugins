import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from './cn'
import { Icon } from './Icon'

type Props = Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'children'> & {
  label: ReactNode
  className?: string
}

/** CMP-025。チェック。押せる範囲は 44px 四方とラベル全体。保存や送るで確定する選択に使う（すぐ反映するものは Switch）。 */
export function Checkbox({ label, className, ...rest }: Props) {
  return (
    <label data-cmp="CMP-025" className={cn('group inline-flex min-h-11 items-center gap-1 text-body', className)}>
      <span className="relative inline-flex size-11 shrink-0 items-center justify-center">
        <input type="checkbox" className="peer absolute inset-0 size-full cursor-pointer opacity-0" {...rest} />
        <span className="flex size-5 items-center justify-center rounded-tag border border-line-strong bg-panel text-on-ai transition-colors duration-(--dur-instant) peer-checked:border-ai peer-checked:bg-ai peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ai peer-disabled:bg-disabled-bg ">
          <Icon name="check" size="sm" className="invisible group-has-checked:visible" />
        </span>
      </span>
      <span>{label}</span>
    </label>
  )
}
