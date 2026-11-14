import { useState } from 'react'
import { invoiceStatusDef } from '../../parts'
import { formatNumber } from '../../data'
import { Field, Icon, Select, TextInput } from '../../ui'
import { SORTS, SORT_KEYS, STATUS_FILTERS, type Query, type SortKey, type StatusFilter } from './query'

type Props = {
  query: Pick<Query, 'status' | 'q' | 'sort'>
  /** 状況ごとの件数（探す語には影響されない） */
  counts: Record<StatusFilter, number>
  onChange: (patch: Partial<Pick<Query, 'status' | 'q' | 'sort'>>) => void
  /** 更新の待ちの間、並べ替えを止める（states.md E-04） */
  sortLocked?: boolean
}

const statusLabel = (s: StatusFilter) => (s === 'all' ? 'すべて' : invoiceStatusDef[s].label)

/**
 * 探す・状況で絞る・並べ替える。条件の値は持たず、親（URL）が持つ。誤りは出さない（探す語はどんな文字も受ける）。
 * 日本語の変換の途中は絞らず、確定したときに絞る。送るボタンは無く、Enter で送らない。
 */
export function InvoiceToolbar({ query, counts, onChange, sortLocked = false }: Props) {
  /** 変換の途中の文字。変換していないときは null（URL の値をそのまま見せる）。 */
  const [composing, setComposing] = useState<string | null>(null)
  return (
    <form role="search" aria-label="請求書の絞り込み" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4 md:flex-row md:items-end">
      <Field label="取引先名・番号で探す" className="md:min-w-0 md:flex-1">
        {(p) => (
          <TextInput
            {...p}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            leading={<Icon name="search" size="sm" />}
            value={composing ?? query.q}
            onChange={(e) => {
              if ((e.nativeEvent as InputEvent).isComposing) setComposing(e.target.value)
              else onChange({ q: e.target.value })
            }}
            onCompositionStart={(e) => setComposing(e.currentTarget.value)}
            onCompositionEnd={(e) => { setComposing(null); onChange({ q: e.currentTarget.value }) }}
          />
        )}
      </Field>
      <Field label="状況" className="md:w-64 md:shrink-0">
        {(p) => (
          <Select
            {...p}
            value={query.status}
            onChange={(e) => onChange({ status: e.target.value as StatusFilter })}
            options={STATUS_FILTERS.map((s) => ({ value: s, label: `${statusLabel(s)}（${formatNumber(counts[s])}件）` }))}
          />
        )}
      </Field>
      <Field label="並べ替え" className="md:w-56 md:shrink-0">
        {(p) => (
          <Select
            {...p}
            value={query.sort}
            disabled={sortLocked}
            onChange={(e) => onChange({ sort: e.target.value as SortKey })}
            options={SORT_KEYS.map((k) => ({ value: k, label: SORTS[k].label }))}
          />
        )}
      </Field>
    </form>
  )
}
