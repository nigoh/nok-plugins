import { Button } from './Button'
import { cn } from './cn'
import { formatNumber, PAGE_SIZE } from '../lib'

type Props = {
  /** 1 から。 */
  page: number
  /** 1 ページの件数。省略すると PAGE_SIZE（20）。画面で 20 を定義し直さない。 */
  pageSize?: number
  total: number
  onChange: (page: number) => void
  /** 更新中・保存中は前へ・次へを押せなくする。fieldset disabled で代用しない。 */
  disabled?: boolean
  className?: string
}

export { PAGE_SIZE }

/** CMP-027。件数つきのページ送り（1 ページ 20 件前後）。前へ・次へと「全120件のうち21〜40件」（数字と「件」の間に空白を入れない：words.md L-10）。ページ番号は URL に持たせる。 */
export function Pagination({ page, pageSize = PAGE_SIZE, total, onChange, disabled = false, className }: Props) {
  const last = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <nav data-cmp="CMP-027" aria-label="ページ送り" aria-disabled={disabled || undefined} className={cn('flex flex-wrap items-center justify-between gap-4', className)}>
      <p className="text-body text-muted tabular-nums">全{formatNumber(total)}件のうち{formatNumber(from)}〜{formatNumber(to)}件</p>
      <div className="flex gap-2">
        <Button leading="chevron-left" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>前へ</Button>
        <Button disabled={disabled || page >= last} onClick={() => onChange(page + 1)}>次へ</Button>
      </div>
    </nav>
  )
}
