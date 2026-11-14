import { useId, type ReactNode } from 'react'
import { cn } from './cn'

type RadioProps = {
  /** 同じ組のラジオに共通の名前。RadioGroup の中なら省略できる。 */
  name: string
  value: string
  checked: boolean
  onChange: (value: string) => void
  /** 選択肢の名前（太字）。 */
  label: ReactNode
  /** ラベルの下の補足（請求額・期限など）。 */
  description?: ReactNode
  /** 差額や合う理由など、さらに添える 1 行。 */
  note?: ReactNode
  disabled?: boolean
  /**
   * 見た目。plain＝丸だけ（住所の候補のような短い選択肢）。card＝選んだものが面（ai-soft の地＋ai の線）で分かる（請求書の候補のような情報の多い選択肢）。
   * どちらも、丸の周り 44px 四方とラベル全体が押せる。
   */
  variant?: 'plain' | 'card'
  className?: string
}

/**
 * [CMP-032] ラジオ。2〜5 個から 1 つを選ぶ縦の選択肢（D-02。2〜3 個の短い物は Segmented）。標準の input[type=radio] を使う。
 * 当たり判定：丸のまわり 44px 四方（plain）か面全体（card、高さ 44px 以上）。ラベル全体も押せる。
 * 選んだ状態は色だけにしない（plain は丸の内側が太い縁、card は面と太字）。
 */
export function Radio({ name, value, checked, onChange, label, description, note, disabled = false, variant = 'plain', className }: RadioProps) {
  const input = (
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      disabled={disabled}
      onChange={() => onChange(value)}
      className={cn('peer', variant === 'plain' ? 'absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed' : 'mt-1 size-5 shrink-0 accent-ai')}
    />
  )
  if (variant === 'card') {
    return (
      <label
        data-cmp="CMP-032"
        data-variant="card"
        className={cn(
          'flex min-h-11 cursor-pointer items-start gap-3 rounded-control border p-3 transition-colors duration-(--dur-instant) has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ai',
          checked ? 'border-ai bg-ai-soft text-ai-text' : 'border-line bg-panel text-fg hover:bg-col active:bg-line',
          disabled && 'cursor-not-allowed text-disabled-fg hover:bg-panel',
          className,
        )}
      >
        {input}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-bold">{label}</span>
          {description && <span className={cn(!checked && 'text-muted')}>{description}</span>}
          {note && <span className={cn(!checked && 'text-muted')}>{note}</span>}
        </span>
      </label>
    )
  }
  return (
    <label data-cmp="CMP-032" data-variant="plain" className={cn('flex min-h-11 cursor-pointer items-center gap-1 text-body', disabled && 'cursor-not-allowed text-disabled-fg', className)}>
      <span className="relative inline-flex size-11 shrink-0 items-center justify-center">
        {input}
        <span className="size-5 rounded-chip border border-line-strong bg-panel transition-colors duration-(--dur-instant) peer-checked:border-4 peer-checked:border-ai peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ai peer-disabled:border-line peer-disabled:bg-disabled-bg" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span>{label}</span>
        {description && <span className="text-muted">{description}</span>}
        {note && <span className="text-muted">{note}</span>}
      </span>
    </label>
  )
}

type GroupProps = {
  /** 組の名前（見える題）。「住所の候補」。 */
  legend: ReactNode
  children: ReactNode
  /** card のときは間を空ける。 */
  gap?: 'none' | 'sm'
  className?: string
  disabled?: boolean
}

/** [CMP-032] ラジオの組。fieldset と legend で包む（読み上げが組の名前を言う）。 */
export function RadioGroup({ legend, children, gap = 'none', disabled, className }: GroupProps) {
  const id = useId()
  return (
    <fieldset data-cmp="CMP-032" data-group id={id} disabled={disabled} className={cn('flex min-w-0 flex-col text-body', gap === 'sm' && 'gap-2', className)}>
      <legend className="mb-1 p-0">{legend}</legend>
      {children}
    </fieldset>
  )
}
