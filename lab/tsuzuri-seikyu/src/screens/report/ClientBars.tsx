import { formatNumber } from '../../data'
import { Money } from '../../ui'
import type { BarItem } from './aggregate'

type Props = {
  /** 読み上げの名前（「取引先別の請求額」など） */
  label: string
  items: BarItem[]
}

/**
 * 取引先別の横棒。名前は HTML で折り返して全部見せ（最長 60 字。D-09・D-12）、棒は SVG（100 を 1 本の長さとして伸ばす）。
 * 棒は 0 始まりで、いちばん長い物が全幅。「その他」は灰、取引先は藍（C-11）。棒は読み上げから外し、名前と数字は文字が持つ。
 */
export function ClientBars({ label, items }: Props) {
  const max = items.reduce((m, it) => (it.billed > m ? it.billed : m), 0)
  return (
    <ul aria-label={label} className="flex flex-col gap-4">
      {items.map((it) => (
        <li key={it.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-4">
            <span className="min-w-0">{it.label}</span>
            <span className="shrink-0 whitespace-nowrap text-body">
              <Money value={it.billed} />
              <span className="ml-2 text-muted tabular-nums">{formatNumber(it.share)}%</span>
            </span>
          </div>
          <svg aria-hidden="true" viewBox="0 0 100 8" preserveAspectRatio="none" className="h-2 w-full">
            <rect width="100" height="8" className="fill-col" />
            <rect width={max > 0 ? (it.billed / max) * 100 : 0} height="8" className={it.other ? 'fill-line-strong' : 'fill-ai'} />
          </svg>
        </li>
      ))}
    </ul>
  )
}
