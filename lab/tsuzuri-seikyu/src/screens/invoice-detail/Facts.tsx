import type { ReactNode } from 'react'
import { cn } from '../../ui'

export type Fact = { label: string; value: ReactNode; strong?: boolean; rule?: boolean }

/**
 * 名前と値の組の並び（dl）。inline は名前を左の固定幅に、split は名前を左・値を右端にそろえる（合計の内訳）。
 * 値は折り返してよい（長い取引先名・宛先）。strong は太字、rule は上に細い線（合計）。
 */
export function Facts({ items, layout = 'inline', className }: { items: Fact[]; layout?: 'inline' | 'split'; className?: string }) {
  return (
    <dl className={cn('flex flex-col', className)}>
      {items.map((f) => (
        <div
          key={f.label}
          className={cn(
            'flex gap-x-4 py-2',
            layout === 'inline' ? 'flex-col md:flex-row' : 'items-baseline justify-between',
            f.rule && 'mt-2 border-t border-line pt-4',
          )}
        >
          <dt className={cn('text-muted', layout === 'inline' && 'md:w-24 md:shrink-0', f.strong && 'font-bold text-fg')}>{f.label}</dt>
          <dd className={cn('min-w-0 break-words', layout === 'split' && 'text-right', f.strong && 'font-bold')}>{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}
