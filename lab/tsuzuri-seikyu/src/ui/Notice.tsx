import type { ReactNode } from 'react'
import { cn } from './cn'
import { Icon, type IconName } from './Icon'

const tones = {
  info: { icon: 'info', cls: 'bg-ai-soft text-ai-text' },
  warn: { icon: 'alert', cls: 'bg-warn-soft text-warn-text' },
  fail: { icon: 'circle-x', cls: 'bg-bad-soft text-bad-text' },
  ok: { icon: 'circle-check', cls: 'bg-ok-soft text-ok-text' },
} satisfies Record<string, { icon: IconName; cls: string }>

export type NoticeTone = keyof typeof tones

type Props = {
  tone?: NoticeTone
  /** 太字の 1 行。省略できる。 */
  title?: string
  children?: ReactNode
  /** 次の一手（ボタンやリンク）。知らせの直近に置く。 */
  action?: ReactNode
  className?: string
}

/** CMP-004。画面の中の知らせ。失敗は role=alert、そのほかは role=status で読み上げに伝える。 */
export function Notice({ tone = 'info', title, children, action, className }: Props) {
  const t = tones[tone]
  return (
    <div data-cmp="CMP-004" data-tone={tone} role={tone === 'fail' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-card p-4 text-body', t.cls, className)}>
      <Icon name={t.icon} className="mt-1" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {title && <p className="font-bold">{title}</p>}
        {children && <div>{children}</div>}
        {action && <div className="flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  )
}
