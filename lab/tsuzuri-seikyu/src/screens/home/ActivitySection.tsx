import { ActivityRow } from './ActivityRow'
import { copy } from './copy'
import type { HomeEvent } from './summary'

const HEADING_ID = 'home-activity'

/** 最近の動き（REQ-012）。起きたことを新しい順に並べる。件数の上限は呼ぶ側が決める（recentEvents の limit）。 */
export function ActivitySection({ events }: { events: HomeEvent[] }) {
  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4 lg:col-span-2">
      <h2 id={HEADING_ID} className="text-large font-bold">{copy.headings.activity}</h2>
      <ul className="flex flex-col divide-y divide-line lg:max-w-2xl">
        {events.map((e) => <ActivityRow key={`${e.invoice.id}-${e.id}`} event={e} />)}
      </ul>
    </section>
  )
}
