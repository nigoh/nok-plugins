import type { ComponentPropsWithoutRef } from 'react'
import { buttonClass, type ButtonVariant } from './buttonStyle'
import { cn } from './cn'
import { Icon, type IconName } from './Icon'
import { Spinner } from './Spinner'

type Props = Omit<ComponentPropsWithoutRef<'button'>, 'className'> & {
  /** 種類。主は 1 画面に 1 つ。 */
  variant?: ButtonVariant
  /** 処理中。押しても何も起きず、幅も高さも変わらない。 */
  busy?: boolean
  /** 処理中に出す文言（「保存しています」など）。幅は長いほうに固定する。 */
  busyLabel?: string
  /** 文言の前に置く絵。 */
  leading?: IconName
  /** 外側の配置（幅いっぱい、など）だけに使う。 */
  className?: string
}

/** CMP-001。ボタン。見た目は buttonStyle に集め、ここは処理中の扱いだけを持つ。 */
export function Button({ variant = 'secondary', busy = false, busyLabel, leading, className, children, onClick, type = 'button', ...rest }: Props) {
  const layer = 'col-start-1 row-start-1 inline-flex items-center justify-center gap-2'
  return (
    <button
      data-cmp="CMP-001"
      data-variant={variant}
      type={type}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      className={buttonClass(variant, className)}
      onClick={(e) => {
        if (busy) { e.preventDefault(); return }
        onClick?.(e)
      }}
      {...rest}
    >
      <span className="inline-grid">
        <span aria-hidden={busy || undefined} className={cn(layer, busy && 'invisible')}>
          {leading && <Icon name={leading} size="sm" />}
          {children}
        </span>
        <span aria-hidden={!busy} className={cn(layer, !busy && 'invisible')}>
          <span className="size-4 shrink-0">{busy && <Spinner />}</span>
          {busyLabel}
        </span>
      </span>
    </button>
  )
}
