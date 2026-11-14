import { formatDate, formatNumber, formatTime, NOW, TODAY } from '../../data'
import { Money } from '../../ui'
import { copy, asOfLine } from './copy'
import { Metric } from './Metric'
import { describeChange, type Metrics } from './summary'

const HEADING_ID = 'home-metrics'

/** 件数の数字（title）。単位は数字の隣に小さく（Money と同じ作り）。 */
function Count({ value }: { value: number }) {
  return (
    <span className="inline-block text-title whitespace-nowrap tabular-nums">
      {formatNumber(value)}
      <span className="ml-1 text-body">{copy.unit}</span>
    </span>
  )
}

/**
 * 請求と入金の状況（REQ-012）：今月の請求額・未入金の額・期限超過の件数を、先月と比べる言葉と時点つきで。
 * 主役の数字（今月の請求額）だけ display、ほかは title（G-03）。数字に色は付けない（C-06）。
 * 幅：768px 未満は 1 列、768px 以上 1024px 未満は 3 列、1024px 以上は左の列（今日やること）の隣で縦 1 列。
 */
export function MetricsSection({ metrics }: { metrics: Metrics }) {
  const at = metrics.compareDate
  const billed = describeChange(metrics.billed, { unit: 'yen', span: 'until', compareDate: at })
  const unpaid = describeChange(metrics.unpaid, { unit: 'yen', span: 'at', compareDate: at })
  const overdue = describeChange(metrics.overdue, { unit: 'count', span: 'at', compareDate: at })
  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={HEADING_ID} className="text-large font-bold">{copy.headings.metrics}</h2>
        <p className="text-body text-muted">{asOfLine(formatDate(TODAY), formatTime(NOW.toISOString()))}</p>
      </div>
      <dl className="grid gap-6 md:grid-cols-3 md:gap-8 lg:grid-cols-1">
        <Metric label={copy.metricLabels.billed} value={<Money value={metrics.billed.now} size="display" />} compare={billed} />
        <Metric label={copy.metricLabels.unpaid} value={<Money value={metrics.unpaid.now} size="title" />} aside={`${formatNumber(metrics.unpaid.count)}${copy.unit}`} compare={unpaid} />
        <Metric label={copy.metricLabels.overdue} value={<Count value={metrics.overdue.now} />} compare={overdue} />
      </dl>
    </section>
  )
}
