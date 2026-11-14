import type { ReactNode } from 'react'
import { cn } from './cn'

type Props = {
  /** 意味に合う要素を選ぶ。一覧の中なら 'li'、見出しを持つなら 'section'。 */
  as?: 'div' | 'section' | 'article' | 'li'
  /** 選んでいる。ai-soft の地に 1px の ai の線。 */
  selected?: boolean
  children: ReactNode
  className?: string
}

/** CMP-009。独立して選ぶ・動かす・開く 1 つの単位だけに使う面。一覧の行やフォームの節には使わない。内側は 4 辺とも同じ（スマホ 16px、パソコン 24px）。 */
export function Card({ as: Tag = 'div', selected = false, children, className }: Props) {
  return (
    <Tag
      data-cmp="CMP-009"
      data-selected={selected || undefined}
      className={cn('relative rounded-card p-4 shadow-card md:p-6', selected ? 'border border-ai bg-ai-soft text-ai-text' : 'border border-transparent bg-panel', className)}
    >
      {children}
    </Tag>
  )
}
