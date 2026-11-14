import type { ReactNode } from 'react'
import { cn } from './cn'

type Props = {
  title: string
  /** 左上の戻り。「← 請求書」のように行き先の名前つきのリンクを渡す。 */
  back?: ReactNode
  description?: ReactNode
  /** 右の操作。左から副、右端が主。 */
  actions?: ReactNode
  className?: string
}

/** CMP-018。画面の見出しの帯。h1 はここだけ。戻りは見出しの上、操作は右（狭い幅では見出しの下）。 */
export function PageHeader({ title, back, description, actions, className }: Props) {
  return (
    <header data-cmp="CMP-018" className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="flex min-w-0 flex-col gap-2">
        {back}
        <h1 className="text-title font-bold">{title}</h1>
        {description && <p className="text-body text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
