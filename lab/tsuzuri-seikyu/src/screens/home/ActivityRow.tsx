import { Link } from '../../app/Link'
import { formatAgo, NOW } from '../../data'
import { historyLabel } from '../../parts'
import { Icon } from '../../ui'
import type { HomeEvent } from './summary'

/**
 * 最近の動きの 1 行。起きたことを言い、取引先と番号、いつかを添える。行全体が請求書の詳細へのリンク。
 * 狭い幅は 3 つを縦に、768px 以上は時刻を右へ（DOM の順は同じ）。取引先名は 60 字まで折り返して全部見せる。
 */
export function ActivityRow({ event }: { event: HomeEvent }) {
  const who = [event.clientName, event.invoice.number].filter(Boolean).join('・')
  return (
    <li>
      <Link
        to="invoice-detail"
        params={{ id: event.invoice.id }}
        bare
        className="-mx-3 flex min-h-11 items-center gap-3 rounded-control px-3 py-3 text-fg transition-colors duration-(--dur-instant) hover:bg-col active:bg-line"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-center md:justify-between md:gap-4">
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-bold">{historyLabel[event.kind]}</span>
            <span className="sr-only">、</span>
            <span className="text-body text-muted">{who}</span>
          </span>
          <span className="sr-only">、</span>
          <span className="text-body whitespace-nowrap text-muted">{formatAgo(event.at, NOW)}</span>
        </span>
        <Icon name="chevron-right" className="text-muted" />
      </Link>
    </li>
  )
}
