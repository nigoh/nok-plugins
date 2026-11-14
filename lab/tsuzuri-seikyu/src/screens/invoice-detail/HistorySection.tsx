import { formatAgo, NOW } from '../../data'
import { cn } from '../../ui'
import { page } from './copy'
import type { HistoryRow } from './operations'

/** 履歴（新しい順）。いま足した行は 1.5 秒だけ地を付けて知らせる（A-04）。 */
export function HistorySection({ rows, freshId }: { rows: HistoryRow[]; freshId: string | null }) {
  return (
    <section aria-labelledby="history-h" className="flex flex-col gap-4">
      <h2 id="history-h" className="text-large font-bold">{page.history}</h2>
      <ul className="flex flex-col">
        {rows.map((r) => (
          <li
            key={r.id}
            data-fresh={r.id === freshId || undefined}
            className={cn(
              '-mx-2 flex flex-col gap-1 rounded-control border-b border-line px-2 py-3 transition-colors duration-(--dur-slow) ease-move md:flex-row md:gap-4',
              r.id === freshId && 'bg-ai-soft',
            )}
          >
            <time dateTime={r.at} className="whitespace-nowrap text-muted md:w-44 md:shrink-0">{formatAgo(r.at, NOW)}</time>
            <span className="min-w-0 break-words">
              {r.label}
              {r.note && <span className="ml-2 text-muted">{page.historyReason(r.note)}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
