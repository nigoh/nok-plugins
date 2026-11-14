import { Field, Icon, IconButton, Segmented, TextInput } from '../../ui'
import { copy } from './copy'
import { isSortKey, SORTS, type SortKey } from './model'

/** 探す欄の id。語を消したあとにフォーカスを戻す先。 */
export const SEARCH_ID = 'clients-search'

type Props = {
  q: string
  sort: SortKey
  /** 更新の待ち（refreshing）のあいだ、並び順を止める。探す欄は止めない（E-04）。 */
  locked: boolean
  onQuery: (q: string) => void
  onSort: (sort: SortKey) => void
}

const options = SORTS.map((s) => ({ value: s.value, label: s.label }))

/**
 * 探す欄と並び順。受け取るのは現在の値と変える口だけ。URL は知らない（画面が持つ）。
 * 768px 以上は横に並べ、未満は縦に積む（探す欄の幅を保つ。D-05・D-13）。
 */
export function ListControls({ q, sort, locked, onQuery, onSort }: Props) {
  return (
    <div role="search" aria-label={copy.searchRegion} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
      <Field id={SEARCH_ID} label={copy.searchLabel} hint={copy.searchHint} className="md:w-96">
        {(p) => (
          <TextInput
            {...p}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            spellCheck={false}
            maxLength={60}
            value={q}
            onChange={(e) => onQuery(e.target.value)}
            leading={<Icon name="search" size="sm" />}
            trailing={q !== '' ? (
              <IconButton label={copy.clearQuery} icon="x" onClick={() => { onQuery(''); document.getElementById(SEARCH_ID)?.focus() }} />
            ) : undefined}
          />
        )}
      </Field>
      <Field label={copy.sortLabel} group>
        {(p) => <Segmented label={copy.sortLabel} value={sort} options={options} disabled={locked} aria-describedby={p['aria-describedby']} onChange={(v) => { if (isSortKey(v)) onSort(v) }} />}
      </Field>
    </div>
  )
}
