import type { ComponentPropsWithoutRef } from 'react'
import { cn } from './cn'
import { Icon, type IconName } from './Icon'

const variantClass = {
  quiet: 'bg-transparent text-fg hover:bg-col',
  secondary: 'bg-panel text-fg border border-line-strong hover:bg-col',
  danger: 'bg-panel text-bad border border-bad hover:bg-bad-soft',
} as const

type Props = Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'children' | 'aria-label'> & {
  /** 読み上げ名。絵だけのボタンには必ず付ける。 */
  label: string
  icon: IconName
  variant?: keyof typeof variantClass
  className?: string
}

/** CMP-002。絵だけのボタン。意味が広く通じる絵（閉じる、検索、戻る）にだけ使う。大きさと当たり判定は Button と同じ。 */
export function IconButton({ label, icon, variant = 'quiet', className, type = 'button', ...rest }: Props) {
  return (
    <button
      data-cmp="CMP-002"
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex size-11 items-center justify-center rounded-control select-none transition duration-(--dur-quick) ease-move',
        'active:duration-(--dur-instant) active:scale-98 active:brightness-90 md:size-9 after:absolute after:inset-0 md:after:-inset-1',
        'disabled:bg-disabled-bg disabled:text-disabled-fg disabled:border-transparent',
        variantClass[variant],
        className,
      )}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  )
}
