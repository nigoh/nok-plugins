import type { ComponentPropsWithoutRef } from 'react'
import { buttonClass, type ButtonVariant } from './buttonStyle'
import { Icon, type IconName } from './Icon'

type Props = Omit<ComponentPropsWithoutRef<'a'>, 'className'> & {
  href: string
  variant?: ButtonVariant
  leading?: IconName
  className?: string
}

/** CMP-001 の兄弟。行き先を持つボタンの形。移動はリンク（a）で、押した結果が別の場所になるものに使う。 */
export function ButtonLink({ variant = 'secondary', leading, className, children, ...rest }: Props) {
  return (
    <a data-cmp="CMP-023" data-variant={variant} className={buttonClass(variant, className)} {...rest}>
      <span className="inline-flex items-center justify-center gap-2">
        {leading && <Icon name={leading} size="sm" />}
        {children}
      </span>
    </a>
  )
}
