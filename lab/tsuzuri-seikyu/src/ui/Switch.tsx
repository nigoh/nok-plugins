import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from './cn'

type Props = Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'role' | 'children'> & {
  label: ReactNode
  className?: string
}

/** CMP-026。スイッチ。切り替えたらすぐ反映するものだけに使う。位置でも分かる（色だけにしない）。押した瞬間に動く。 */
export function Switch({ label, className, ...rest }: Props) {
  return (
    <label data-cmp="CMP-026" className={cn('inline-flex min-h-11 items-center gap-3 text-body', className)}>
      <span className="relative inline-flex h-11 shrink-0 items-center">
        <input type="checkbox" role="switch" className="peer absolute inset-0 size-full cursor-pointer opacity-0" {...rest} />
        <span className="h-6 w-11 rounded-chip bg-line-strong transition-colors duration-(--dur-instant) peer-checked:bg-ai peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ai peer-disabled:bg-disabled-bg" />
        <span className="pointer-events-none absolute top-1/2 left-1 -mt-2 size-4 rounded-chip bg-bg transition-transform duration-(--dur-quick) ease-move peer-checked:translate-x-5" />
      </span>
      <span>{label}</span>
    </label>
  )
}
