import type { ReactNode } from 'react'
import { cn } from './cn'
import { Icon, type IconName } from './Icon'

type Props = {
  /** 何が無いかを言う（「請求書はまだありません」）。 */
  title: string
  /**
   * どうすれば現れるか。次の一手。文か、文中のリンクを含む文（「<Link inline>請求書を作る</Link>と、ここに並びます。」）。
   * 初回の 0 件は、この文と文中リンクだけで導く（決定 9：見出し右の主ボタンと同じ名前のボタンを重ねない。標準の形）。
   */
  description?: ReactNode
  /**
   * 次の一手のボタン。「条件をすべて外す」のように、見出し右の主ボタンと別の操作のときだけ置く。
   * 主ボタンと同じ名前のボタンは置かない（1 画面に主は 1 つ：D-04）。
   */
  action?: ReactNode
  icon?: IconName
  className?: string
}

/** CMP-014。0 件のとき。理由と次の一手をその場に置く（W-10）。標準の形は「題＋説明の文（文中リンクを含められる）」。 */
export function EmptyState({ title, description, action, icon = 'file', className }: Props) {
  return (
    <div data-cmp="CMP-014" className={cn('flex flex-col items-center gap-3 px-4 py-12 text-center', className)}>
      <Icon name={icon} size="lg" className="text-muted" />
      <p className="text-large font-bold">{title}</p>
      {description && <p className="max-w-prose text-body text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
