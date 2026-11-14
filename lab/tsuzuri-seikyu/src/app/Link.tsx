import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../ui'
import { go, hrefTo } from './nav'

type Props = Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'className'> & {
  /** 行き先の画面の slug（?screen= の値）。 */
  to: string
  params?: Record<string, string>
  className?: string
  /** true なら既定の見た目（藍・下線）を付けない。メニューなど、見た目を自分で決める場所で使う。 */
  bare?: boolean
  /** 文章の途中のリンク。押す範囲を広げない（それ以外は高さ 44px の行になる）。 */
  inline?: boolean
}

/** 画面の移動の標準のリンク。href を持つので、新しいタブでも開ける。ふつうの押し方なら履歴に積んで移る。 */
export function Link({ to, params, className, bare = false, inline = false, onClick, children, ...rest }: Props) {
  return (
    <a
      data-cmp="CMP-030"
      href={hrefTo(to, params)}
      className={cn(!bare && !inline && 'inline-flex min-h-11 items-center',
        !bare && 'text-ai-text underline underline-offset-4 transition-colors duration-(--dur-instant) hover:text-ai-hover', className)}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        go(to, params)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
