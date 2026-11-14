import { invoiceStatusDef } from '../../parts'
import { Button } from '../../ui'
import { copy } from './copy'
import type { Query } from './query'

type Props = {
  query: Pick<Query, 'status' | 'q'>
  onClearStatus: () => void
  onClearQuery: () => void
  onClearAll: () => void
}

/**
 * 適用中の条件。個別に外せる（0 件になる条件でも外せる：W-15）。条件が 2 つ以上のときだけ「すべて外す」を添える。
 * チップは折り返してよい種類（行頭をそろえ、縦横の間は同じ）。外すボタンの読み上げ名は見える文字を含める。
 */
export function AppliedConditions({ query, onClearStatus, onClearQuery, onClearAll }: Props) {
  const word = query.q.trim()
  const items = [
    ...(query.status !== 'all' ? [{ key: 'status', text: copy.chipStatus(invoiceStatusDef[query.status].label), off: onClearStatus }] : []),
    ...(word ? [{ key: 'q', text: copy.chipQuery(word), off: onClearQuery }] : []),
  ]
  if (items.length === 0) return null
  return (
    <ul aria-label="適用中の条件" className="flex flex-wrap items-center gap-2">
      {items.map((i) => (
        <li key={i.key}>
          <Button leading="x" aria-label={copy.chipOff(i.text)} onClick={i.off}>{i.text}</Button>
        </li>
      ))}
      {items.length > 1 && (
        <li><Button onClick={onClearAll}>{copy.clearAll}</Button></li>
      )}
    </ul>
  )
}
