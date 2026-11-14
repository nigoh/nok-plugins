import type { ReactNode } from 'react'
import type { Comparison } from './summary'

type Props = {
  /** 数字の名前（「今月の請求額（税込）」）。 */
  label: string
  /** 数字そのもの（Money か、件数）。 */
  value: ReactNode
  /** 数字の隣に添える補足（件数など。muted）。 */
  aside?: ReactNode
  /** 比べる相手の言葉。 */
  compare: Comparison
}

/**
 * 数字 1 つ（G-03）：名前 → 数字 → 比べる相手 1 つ。dl の 1 組。
 * 比べる言葉は 2 つの要素に分け、間に空白の文字を入れない（数字と日本語の間に空白を作らない：L-10）。
 */
export function Metric({ label, value, aside, compare }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-body text-muted">{label}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-3">
        {value}
        {aside && <span className="text-body whitespace-nowrap text-muted">{aside}</span>}
      </dd>
      <dd className="flex flex-wrap gap-x-2 text-body text-muted">
        <span>{compare.lead}</span>
        {compare.change && <span className="whitespace-nowrap">{compare.change}</span>}
      </dd>
    </div>
  )
}
