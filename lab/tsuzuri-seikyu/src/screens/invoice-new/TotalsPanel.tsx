import { screenNames } from '../../app/terms'
import type { Rounding } from '../../data'
import { Money } from '../../ui'
import { copy } from './copy'
import { ids } from './fields'
import type { Summary } from './totals'

const roundingName: Record<Rounding, string> = { floor: '切り捨て', round: '四捨五入', ceil: '切り上げ' }

type Props = { summary: Summary; rounding: Rounding; error?: string }

/** 小計・消費税・合計の表示だけ。計算結果を受け取り、自分では計算しない。数字に色を付けない。 */
export function TotalsPanel({ summary, rounding, error }: Props) {
  const t = summary.totals
  return (
    <section id={ids.total} aria-labelledby="inv-total-title" className="flex flex-col gap-4 border-t border-line pt-6">
      <h3 id="inv-total-title" className="text-large font-bold">{copy.section.total}</h3>
      <dl className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <dt>{copy.totals.subtotal}</dt>
          <dd><Money value={t ? t.subtotal : null} /></dd>
        </div>
        {t === null ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt>{copy.totals.taxNone}</dt>
            <dd><Money value={null} /></dd>
          </div>
        ) : t.byRate.map((r) => (
          <div key={r.rate} className="flex items-baseline justify-between gap-4">
            <dt>{copy.totals.tax(r.rate)}</dt>
            <dd><Money value={r.tax} /></dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4">
          <dt className="font-bold">{copy.totals.total}</dt>
          <dd className="font-bold"><Money value={t ? t.total : null} size="title" /></dd>
        </div>
      </dl>
      {summary.incomplete > 0 && <p role="status" className="text-body text-muted">{copy.totals.incomplete(summary.incomplete)}</p>}
      {error && <p data-field-error className="text-body text-bad-text">{error}</p>}
      <p className="text-body text-muted">{copy.totals.rule(roundingName[rounding], screenNames.settings)}</p>
      <p className="text-body text-muted">{copy.totals.number}</p>
    </section>
  )
}
