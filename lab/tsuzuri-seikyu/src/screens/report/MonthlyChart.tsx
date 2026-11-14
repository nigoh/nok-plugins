import { useId, type ReactNode } from 'react'
import { formatMonthOnly, formatNumber } from '../../data'
import type { MonthFigure } from './aggregate'
import { labelIndexes, type Axis } from './chartScale'
import { copy } from './copy'
import { useWidth } from './useWidth'

/** 系列の見た目はこの 1 つの表から、棒と凡例が引く（S-03）。藍＝請求額（主）、灰＝入金額（比べる相手）。C-11。 */
const SERIES = {
  billed: { fill: 'fill-ai', edge: 'stroke-ai', name: copy.legend.billed },
  paid: { fill: 'fill-line-strong', edge: 'stroke-line-strong', name: copy.legend.paid },
} as const
type SeriesKey = keyof typeof SERIES

const HEIGHT = 260
const PAD_TOP = 8
const PAD_BOTTOM = 48
const PAD_RIGHT = 8
const FALLBACK_WIDTH = 640

/** 途中の月の斜線。塗りと同じ色の縞。 */
function Hatch({ id, fill }: { id: string; fill: string }) {
  return (
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="3" height="6" className={fill} />
    </pattern>
  )
}

function Legend({ hasOpen }: { hasOpen: boolean }) {
  const id = `${useId().replace(/:/g, '')}-l`
  const keys: SeriesKey[] = ['billed', 'paid']
  return (
    <ul aria-label="凡例" className="flex flex-wrap gap-x-6 gap-y-2 text-body">
      {keys.map((k) => (
        <li key={k} className="flex items-center gap-2">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" className={SERIES[k].fill} /></svg>
          {SERIES[k].name}
        </li>
      ))}
      {hasOpen && (
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
            <defs><Hatch id={id} fill="fill-muted" /></defs>
            <rect x="0.75" y="0.75" width="14.5" height="14.5" fill={`url(#${id})`} className="stroke-muted" strokeWidth="1.5" />
          </svg>
          {copy.legend.open}
        </li>
      )}
    </ul>
  )
}

type Props = {
  figures: MonthFigure[]
  axis: Axis
  /** 図の読み上げの名前。見える要約と同じ文（G-11） */
  summary: string
  /** 軸だけを描く（0 件の期間。G-06）。棒も 0 も描かない */
  bare?: boolean
  /** 軸だけの図の上に置く文 */
  children?: ReactNode
}

/**
 * 月ごとの請求額と入金額の並べた縦棒。実寸（1 目盛り＝1px）で描き、縮めて文字を小さくしない（D-12）。
 * 棒は 0 始まり。月の名前 14px・目盛り 12px。1 か月が LABEL_MIN 未満の幅になると 1 つおき。当月は斜線で「途中」。
 * 取れない月は棒を描かず「—」、計算できて 0 の月は高さ 0 の棒に「0」（G-06）。押せる要素は作らない（V-33）。
 */
export function MonthlyChart({ figures, axis, summary, bare = false, children }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>(FALLBACK_WIDTH)
  const uid = useId().replace(/:/g, '')
  const hatch = { billed: `${uid}-b`, paid: `${uid}-p` } as const

  const longest = axis.ticks.reduce((m, t) => Math.max(m, formatNumber(t).length), 1)
  const left = Math.max(32, longest * 7 + 16)
  const plotW = Math.max(width - left - PAD_RIGHT, 1)
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM
  const base = PAD_TOP + plotH
  const n = figures.length
  const slot = plotW / Math.max(n, 1)
  const groupW = Math.min(slot * 0.72, 64)
  const barW = Math.max(Math.floor((groupW - 2) / 2), 2)
  const yOf = (v: number) => (axis.top > 0 ? base - (v / (axis.top * axis.unit)) * plotH : base)

  const shown = labelIndexes(n, slot)
  const yearOf = (i: number) => Number(figures[i].month.slice(0, 4))
  let prevYear: number | null = null
  const ticks = shown.map((i) => {
    const year = yearOf(i)
    const line2 = i === n - 1 && figures[i].open ? copy.openTick : year !== prevYear ? `${year}年` : null
    prevYear = year
    return { i, line2 }
  })

  return (
    <div className="flex flex-col gap-3">
      {!bare && <Legend hasOpen={figures.some((f) => f.open)} />}
      <div ref={ref} className="relative w-full">
        <svg role="img" aria-label={summary} width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} className="block max-w-full">
          <defs>
            <Hatch id={hatch.billed} fill={SERIES.billed.fill} />
            <Hatch id={hatch.paid} fill={SERIES.paid.fill} />
          </defs>
          {axis.ticks.map((t) => {
            const y = yOf(t * axis.unit)
            return (
              <g key={t}>
                <line x1={left} x2={width - PAD_RIGHT} y1={y} y2={y} strokeWidth="1" className={t === 0 ? 'stroke-line-strong' : 'stroke-line'} />
                <text x={left - 8} y={y + 4} textAnchor="end" className="fill-muted text-small tabular-nums">{formatNumber(t)}</text>
              </g>
            )
          })}
          {!bare && figures.map((f, i) => {
            const x0 = left + slot * i + (slot - groupW) / 2
            if (f.billed === null || f.paid === null) {
              return <text key={f.month} x={left + slot * (i + 0.5)} y={base - 6} textAnchor="middle" className="fill-muted text-small">{copy.missingMonthMark}</text>
            }
            const values: Record<SeriesKey, number> = { billed: f.billed, paid: f.paid }
            return (
              <g key={f.month}>
                {(['billed', 'paid'] as const).map((k, j) => {
                  const x = x0 + j * (barW + 2)
                  const h = base - yOf(values[k])
                  return values[k] === 0 ? (
                    <text key={k} x={x + barW / 2} y={base - 4} textAnchor="middle" className="fill-muted text-small tabular-nums">0</text>
                  ) : f.open ? (
                    <rect key={k} x={x} y={base - h} width={barW} height={h} fill={`url(#${hatch[k]})`} strokeWidth="1.5" className={SERIES[k].edge} />
                  ) : (
                    <rect key={k} x={x} y={base - h} width={barW} height={h} className={SERIES[k].fill} />
                  )
                })}
              </g>
            )
          })}
          {ticks.map(({ i, line2 }) => (
            <g key={figures[i].month}>
              <text x={left + slot * (i + 0.5)} y={base + 18} textAnchor="middle" className="fill-fg text-body">{formatMonthOnly(`${figures[i].month}-01`)}</text>
              {line2 && <text x={left + slot * (i + 0.5)} y={base + 36} textAnchor="middle" className="fill-muted text-small">{line2}</text>}
            </g>
          ))}
        </svg>
        {children && <div className="absolute inset-0 flex items-center justify-center px-4"><div className="max-w-prose rounded-card bg-bg p-4 text-center">{children}</div></div>}
      </div>
    </div>
  )
}
