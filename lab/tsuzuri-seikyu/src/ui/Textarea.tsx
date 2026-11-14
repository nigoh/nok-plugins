import type { ComponentPropsWithoutRef } from 'react'
import { cn } from './cn'

type Props = Omit<ComponentPropsWithoutRef<'textarea'>, 'className'> & { className?: string }

/** CMP-024。複数行の入力欄（備考など）。文字は 16px。 */
export function Textarea({ className, rows = 4, ...rest }: Props) {
  return (
    <textarea
      data-cmp="CMP-024"
      rows={rows}
      className={cn(
        'block w-full rounded-control border border-line-strong bg-panel px-3 py-2 text-large text-fg transition-colors duration-(--dur-instant)',
        'focus-visible:border-ai aria-invalid:border-bad disabled:bg-disabled-bg disabled:text-disabled-fg',
        className,
      )}
      {...rest}
    />
  )
}
