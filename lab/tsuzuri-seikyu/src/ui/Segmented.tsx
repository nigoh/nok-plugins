import { useId } from 'react'
import { cn } from './cn'

export type SegmentedOption = { value: string; label: string; /** この選択肢だけ押せない。 */ disabled?: boolean }

type Props = {
  /** 読み上げ名（「期間」など）。見えるラベルは Field の group で付ける。 */
  label: string
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  /** 全体を押せなくする（更新中・保存中）。fieldset disabled で代用しない。 */
  disabled?: boolean
  /** 補足・誤りの id（Field が渡す aria-describedby をそのまま受ける）。 */
  'aria-describedby'?: string
  className?: string
}

/** CMP-011。2〜3 個から 1 つを選ぶ（短いラベル）。中身は標準のラジオ。選んだものは ai-soft の地と 1px の ai の線。 */
export function Segmented({ label, options, value, onChange, disabled = false, 'aria-describedby': describedBy, className }: Props) {
  const name = useId()
  return (
    <div data-cmp="CMP-011" role="radiogroup" aria-label={label} aria-describedby={describedBy} aria-disabled={disabled || undefined} className={cn('inline-flex rounded-control bg-col p-1', className)}>
      {options.map((o) => {
        const off = disabled || o.disabled
        return (
          <label
            key={o.value}
            className={cn(
              'relative inline-flex min-h-11 items-center justify-center rounded-tag border px-4 text-body whitespace-nowrap transition-colors duration-(--dur-instant) has-focus-visible:outline-2 has-focus-visible:outline-ai',
              off && 'cursor-not-allowed border-transparent text-disabled-fg',
              !off && 'cursor-pointer',
              !off && (o.value === value ? 'border-ai bg-ai-soft font-bold text-ai-text' : 'border-transparent text-muted hover:text-fg active:bg-line'),
              off && o.value === value && 'border-line bg-panel font-bold',
            )}
          >
            <input type="radio" name={name} value={o.value} checked={o.value === value} disabled={off} onChange={() => onChange(o.value)} className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
            {o.label}
          </label>
        )
      })}
    </div>
  )
}
