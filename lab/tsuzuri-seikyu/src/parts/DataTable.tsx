import type { ReactNode } from 'react'
import { cn, Icon } from '../ui'

export type Column<T> = {
  key: string
  /** 列の見出し。単位は見出しに書く（「金額（円）」）。狭い幅では各行のラベルになる。 */
  header: string
  render: (row: T) => ReactNode
  align?: 'start' | 'end'
  /** 広い幅での列の幅。fill=残りを使う。 */
  width?: 'sm' | 'md' | 'lg' | 'fill'
  /** 狭い幅で行の頭に置く列（ラベルなし・太字）。1 列だけ、columns の先頭に置く。 */
  main?: boolean
  /**
   * 並べ替えの対象の列（onSort を渡すと、見出しが押せるボタンになる）。押すと onSort(key)。向きは画面が持ち、sort で返す。
   */
  sortable?: boolean
  /**
   * 表の形（枠が広い）で枠が狭くなったとき、先に畳む（隠す）列。小さい番号から畳む：1＝896px 未満で隠す、2＝768px 未満で隠す。
   * 1 行ずつの形（672px 未満）では隠さず全部出す。隠れる列は、ほかの列から分かる補足だけにする（情報を失わない）。
   */
  fold?: 1 | 2
}

export type SortState = { key: string; direction: 'asc' | 'desc' }

type Props<T> = {
  /** 表の読み上げ名（「請求書の一覧」など）。 */
  label: string
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** いまの並び（列の key と向き）。その列の見出しに aria-sort が付く。並べ替えのある表だけ渡す。 */
  sort?: SortState
  /** 見出しを押したとき。渡すと sortable な列の見出しがボタンになる。 */
  onSort?: (key: string) => void
  className?: string
}

const foldClass = { 1: '@2xl:@max-4xl:hidden', 2: '@2xl:@max-3xl:hidden' } as const

const widthClass = {
  sm: '@2xl:w-24 @2xl:shrink-0',
  md: '@2xl:w-32 @2xl:shrink-0',
  lg: '@2xl:w-48 @2xl:shrink-0',
  fill: '@2xl:min-w-0 @2xl:flex-1',
} as const

/**
 * CMP-029。表。置かれた枠が 672px 以上なら表、未満なら 1 行ずつの形に組み替える（枠の幅で決める：S-08）。
 * 同じ DOM のまま role を手で補うので、どちらでも表として読み上げられる。狭い幅では見出しの行を隠し、各セルにラベルを出す。
 * セルの中身は div で包む（画面が div を返しても入れ子の誤り S-01 にならない。span の中に div を置かない）。
 * 並べ替え：sortable な列に sort と onSort を渡すと、見出しが押せるボタンになり aria-sort が付く（並べ替えを持つのは画面で、ここは見た目と読み上げだけ）。
 * 畳み順：fold を付けた列は、表の形で枠が狭くなると小さい番号から隠れる。
 */
export function DataTable<T>({ label, columns, rows, rowKey, sort, onSort, className }: Props<T>) {
  return (
    <div data-cmp="CMP-029" role="table" aria-label={label} className={cn('@container', className)}>
      <div role="rowgroup" className="hidden @2xl:block">
        <div role="row" className="flex gap-4 border-b border-line px-4 py-2 text-body text-muted">
          {columns.map((c) => (
            <div
              key={c.key}
              role="columnheader"
              aria-sort={c.sortable ? (sort?.key === c.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
              className={cn(widthClass[c.width ?? 'fill'], c.align === 'end' && 'text-right', c.fold && foldClass[c.fold])}
            >
              {c.sortable && onSort ? (
                <button
                  type="button"
                  onClick={() => onSort(c.key)}
                  className={cn('inline-flex min-h-11 items-center gap-1 rounded-tag text-body transition-colors duration-(--dur-instant) hover:text-fg active:bg-line', sort?.key === c.key ? 'font-bold text-fg' : 'text-muted')}
                >
                  {c.header}
                  <Icon name={sort?.key === c.key && sort.direction === 'desc' ? 'chevron-down' : 'chevron-up'} size="sm" className={cn(sort?.key !== c.key && 'invisible')} />
                </button>
              ) : c.header}
            </div>
          ))}
        </div>
      </div>
      <div role="rowgroup" className="flex flex-col">
        {rows.map((r) => (
          <div key={rowKey(r)} role="row" className="flex flex-col gap-1 border-b border-line px-4 py-3 text-body @2xl:flex-row @2xl:items-center @2xl:gap-4">
            {columns.map((c) => (
              <div key={c.key} role="cell" className={cn('flex items-baseline justify-between gap-4 @2xl:block', widthClass[c.width ?? 'fill'], c.align === 'end' && '@2xl:text-right', c.main && 'font-bold', c.fold && foldClass[c.fold])}>
                <span className={cn('text-muted @2xl:hidden', c.main && 'hidden')}>{c.header}</span>
                <div className="min-w-0">{c.render(r)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
