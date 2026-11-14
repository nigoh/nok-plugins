import { formatTime } from '../../data'
import { DataTable } from '../../parts'
import { Button, Notice } from '../../ui'
import { describeValue, overlapKeys, valueLabel } from './model'
import type { Conflict, Values } from './types'
import { actions } from '../../app/terms'
import { copy } from './copy'

/** 理由の文の id。保存の主ボタンが aria-describedby で結ぶ（止まっている理由を、止めた物の近くで言う：S-07）。 */
export const CONFLICT_REASON_ID = 'settings-conflict-reason'

type Props = { conflict: Conflict; values: Values; saving: boolean; onTheirs: () => void; onOverwrite: () => void }

/** 別の人が先に更新したとき。同じ項目が違う物だけを並べ、どちらにするかを選ばせる（E-09）。 */
export function ConflictPanel({ conflict, values, saving, onTheirs, onOverwrite }: Props) {
  const rows = overlapKeys(conflict.base, values, conflict.theirs)
  return (
    <section aria-label={copy.conflictTitle(formatTime(conflict.at))} className="flex flex-col gap-4">
      <Notice tone="warn" title={copy.conflictTitle(formatTime(conflict.at))}>{copy.conflict.body}</Notice>
      <DataTable
        label={copy.conflict.tableLabel}
        rows={rows}
        rowKey={(k) => k}
        columns={[
          { key: 'item', header: copy.conflict.colItem, main: true, width: 'md', render: (k) => valueLabel(k) },
          { key: 'mine', header: copy.conflict.colMine, render: (k) => describeValue(k, values) },
          { key: 'theirs', header: copy.conflict.colTheirs, render: (k) => describeValue(k, conflict.theirs) },
        ]}
      />
      <p id={CONFLICT_REASON_ID} className="text-body text-muted">{copy.conflict.blocked}</p>
      <div className="flex flex-col gap-2 md:flex-row">
        <Button disabled={saving} onClick={onTheirs}>{actions.useTheirs}</Button>
        <Button disabled={saving} onClick={onOverwrite}>{actions.overwriteSave}</Button>
      </div>
    </section>
  )
}

