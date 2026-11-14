import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from './cn'

export type TabItem = { id: string; label: string; /** 件数など。狭い幅では出さない。 */ count?: number; /** このタブだけ押せない。 */ disabled?: boolean }

type Props = {
  /** タブ列の読み上げ名（「請求書の状況」など）。 */
  label: string
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  /** タブと中身を結ぶ名前。中身の側は tabPanelProps(idBase, value) を展開する。 */
  idBase: string
  /** 全体を押せなくする（保存中）。 */
  disabled?: boolean
  className?: string
}

/** 中身の側に置く属性。 */
export function tabPanelProps(idBase: string, value: string) {
  return { role: 'tabpanel' as const, id: `${idBase}-panel`, 'aria-labelledby': `${idBase}-tab-${value}`, tabIndex: 0 }
}

/**
 * CMP-010。画面内の表示の切り替え（2〜5 個、同格、ラベルは短く）。折り返さない。見比べる内容や 6 個以上は使わない。
 * 矢印キーで移る。切り替えに動きは付けない（1 日に何度も使う：A-05）。
 */
export function Tabs({ label, items, value, onChange, idBase, disabled = false, className }: Props): ReactNode {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const move = (e: KeyboardEvent, index: number) => {
    const next = e.key === 'ArrowRight' ? index + 1 : e.key === 'ArrowLeft' ? index - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null
    if (next === null) return
    e.preventDefault()
    const live = items.filter((t) => !disabled && !t.disabled)
    if (live.length === 0) return
    let i = (next + items.length) % items.length
    for (let n = 0; n < items.length && (disabled || items[i].disabled); n++) i = (i + (e.key === 'ArrowLeft' || e.key === 'End' ? -1 : 1) + items.length) % items.length
    const target = items[i]
    refs.current[target.id]?.focus()
    onChange(target.id)
  }
  return (
    <div data-cmp="CMP-010" role="tablist" aria-label={label} className={cn('flex flex-nowrap border-b border-line', className)}>
      {items.map((t, i) => {
        const selected = t.id === value
        const off = disabled || t.disabled
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el }}
            id={`${idBase}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`${idBase}-panel`}
            tabIndex={selected ? 0 : -1}
            disabled={off}
            aria-disabled={off || undefined}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => move(e, i)}
            className={cn(
              'relative -mb-px inline-flex min-h-11 items-center gap-1 border-b-2 px-2 text-body whitespace-nowrap transition-colors duration-(--dur-instant) md:px-4',
              // 乗せた時（hover）と押した時（active）は、選んでいるタブにも応える（応答：A-01）。選んでいる印は下線と太字。
              off && 'cursor-not-allowed text-disabled-fg',
              !off && 'hover:bg-col active:bg-line',
              !off && (selected ? 'border-ai font-bold text-ai-text' : 'border-transparent text-muted hover:text-fg'),
              off && (selected ? 'border-line-strong font-bold' : 'border-transparent'),
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="hidden text-small text-muted md:inline">{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
