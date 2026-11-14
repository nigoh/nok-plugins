import { formatNumber } from '../lib'
import { cn } from './cn'

const sizeClass = { body: 'text-body', large: 'text-large', title: 'text-title', display: 'text-display' } as const
/** 数字に良し悪しの色は付けない（color-state.md C-06）。補足の数字だけ控えめにできる。 */
const toneClass = { default: 'text-fg', muted: 'text-muted' } as const

type Props = {
  /** 円（整数）。取れていない・未入力は null（「—」と出す。0 と別のもの：data.md G-06）。 */
  value: number | null
  size?: keyof typeof sizeClass
  tone?: keyof typeof toneClass
  /** 差額など、0 以外に「+」を付ける。負は常に「−」（U+2212）。 */
  signed?: boolean
  /** 表の列では単位を見出しに出して false にする。 */
  unit?: boolean
  className?: string
}

/**
 * CMP-008。金額。等幅の数字、右寄せ、数字と円を離さない。桁区切り・負の符号・欠損は data/format の 1 か所で決める。
 * 負の金額も赤にしない（C-06）。欠損は「—」と読み上げ用の「データなし」。
 */
export function Money({ value, size = 'body', tone = 'default', signed = false, unit = true, className }: Props) {
  const missing = value === null || !Number.isFinite(value)
  return (
    <span data-cmp="CMP-008" data-missing={missing || undefined} className={cn('inline-block text-right whitespace-nowrap tabular-nums', sizeClass[size], toneClass[tone], className)}>
      {formatNumber(value, { signed })}
      {missing ? <span className="sr-only">データなし</span> : unit && <span className="ml-1 text-body">円</span>}
    </span>
  )
}
