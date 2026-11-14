import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'

/** 種類ごとの色。乗せたとき（hover）・押したとき（active）・押せない（disabled）をここに集める。 */
const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-ai text-on-ai hover:bg-ai-hover',
  secondary: 'bg-panel text-fg border border-line-strong hover:bg-col active:bg-line',
  quiet: 'bg-transparent text-ai-text hover:bg-ai-soft',
  danger: 'bg-panel text-bad border border-bad hover:bg-bad-soft',
}

/**
 * スマホ幅は見た目も 44px 以上。パソコン幅は見た目 36px、当たり判定は ::after で上下 4px ずつ広げて 44px。
 * 押した瞬間は --dur-instant（待たせない）、戻りは --dur-quick。2% 縮む。
 */
const base =
  'relative inline-flex min-h-11 items-center justify-center rounded-control px-4 py-2 text-body font-bold ' +
  'select-none transition duration-(--dur-quick) ease-move active:duration-(--dur-instant) active:scale-98 active:brightness-90 ' +
  'md:min-h-9 after:absolute after:inset-x-0 after:inset-y-0 md:after:-inset-y-1 ' +
  'disabled:border-transparent disabled:bg-disabled-bg disabled:text-disabled-fg disabled:active:scale-100 ' +
  'aria-disabled:cursor-progress'

export function buttonClass(variant: ButtonVariant, className?: string): string {
  return cn(base, variantClass[variant], className)
}
