import { Skeleton } from '../../ui'
import { copy } from './copy'
import { ACTIVITY_LIMIT } from './summary'

/**
 * 読み込み中の骨組み。区画の見出しは出し（変わらない物）、中身だけを本物と同じ数・同じ高さの四角にする（今日やること 3 行、数字 3 つ、最近の動きは上限の行数）。
 * 読み上げは最初の 1 つだけ（残りの骨組みは隠す。同じ「読み込んでいます」を何度も言わせない）。見出しは読み上げに残す。
 */
export function HomeSkeleton() {
  return (
    <div className="grid gap-8 md:gap-12 lg:grid-cols-2">
      <section className="flex flex-col gap-4">
        <h2 className="text-large font-bold">{copy.headings.todo}</h2>
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-16" label={copy.loading} />
          <div aria-hidden="true" className="flex flex-col gap-3">
            <Skeleton variant="block" className="h-16" />
            <Skeleton variant="block" className="h-16" />
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-large font-bold">{copy.headings.metrics}</h2>
        <div aria-hidden="true" className="grid gap-6 md:grid-cols-3 md:gap-8 lg:grid-cols-1">
          <Skeleton variant="block" className="h-24" />
          <Skeleton variant="block" className="h-24" />
          <Skeleton variant="block" className="h-24" />
        </div>
      </section>
      <section className="flex flex-col gap-4 lg:col-span-2">
        <h2 className="text-large font-bold">{copy.headings.activity}</h2>
        <div aria-hidden="true" className="flex flex-col gap-3 lg:max-w-2xl">
          {Array.from({ length: ACTIVITY_LIMIT }, (_, i) => <Skeleton key={i} variant="block" className="h-16" />)}
        </div>
      </section>
    </div>
  )
}
