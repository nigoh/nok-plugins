import type { ReactNode } from 'react'
import { ButtonLink, type ButtonVariant, type IconName } from '../ui'
import { go, hrefTo } from './nav'

type Props = { to: string; params?: Record<string, string>; variant?: ButtonVariant; leading?: IconName; className?: string; children: ReactNode }

/** 別の画面へ行くボタンの形（ButtonLink の画面移動つき）。「請求書を作る」のような、押すと別の画面が開くものに使う。 */
export function LinkButton({ to, params, ...rest }: Props) {
  return (
    <ButtonLink
      href={hrefTo(to, params)}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        go(to, params)
      }}
      {...rest}
    />
  )
}
