import type { ReactNode } from 'react'
import { Link } from '../../app/Link'
import { formatNumber } from '../../data'
import { Icon } from '../../ui'
import { copy } from './copy'

type Props = {
  /** 状況の札（InvoiceStatusTag・PaymentStatusTag）。絵と言葉を持つ。 */
  tag: ReactNode
  /** 何の件か（「請求書」「入金」）。 */
  noun: string
  count: number
  /** 2 行目の補足（最も古い期限など）。 */
  note: string
  /** 行き先の画面の slug と、絞り込みの URL パラメータ。 */
  to: string
  params?: Record<string, string>
}

/**
 * 今日やることの 1 行。行全体が 1 つのリンク（中にほかの押せるものを置かない：S-01）。
 * 札・名詞・補足・件数の間に、読み上げ用の読点を入れる（見た目には出さない。数字と日本語の間に空白を作らないため）。
 */
export function TodoRow({ tag, noun, count, note, to, params }: Props) {
  return (
    <li>
      <Link
        to={to}
        params={params}
        bare
        className="-mx-3 flex min-h-11 items-center gap-3 rounded-control px-3 py-3 text-fg transition-colors duration-(--dur-instant) hover:bg-col active:bg-line"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            {tag}
            <span className="sr-only">、</span>
            <span className="font-bold">{noun}</span>
          </span>
          <span className="sr-only">、</span>
          <span className="text-body text-muted">{note}</span>
        </span>
        <span className="sr-only">、</span>
        <span className="shrink-0 text-large font-bold whitespace-nowrap tabular-nums">{formatNumber(count)}{copy.unit}</span>
        <Icon name="chevron-right" className="text-muted" />
      </Link>
    </li>
  )
}
