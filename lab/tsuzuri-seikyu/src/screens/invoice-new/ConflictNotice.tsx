import { Button, Notice } from '../../ui'
import { copy } from './copy'
import type { Conflict } from './seed'

type Props = { change: Conflict; mine: string; newDue: string; onKeep: () => void; onUseNew: () => void }

/** 競合（E-09）：違う項目だけを「自分の内容」「更新後」で並べ、どちらかを選ぶまで保存と送る手続きを止める。 */
export function ConflictNotice({ change, mine, newDue, onKeep, onUseNew }: Props) {
  return (
    <Notice
      tone="warn"
      title={copy.conflict.title}
      action={<><Button onClick={onKeep}>{copy.conflict.keep}</Button><Button onClick={onUseNew}>{copy.conflict.useNew}</Button></>}
    >
      <p>{copy.conflict.changed(change.at, change.clientName)}</p>
      <dl className="flex flex-col gap-1">
        <div className="flex gap-2"><dt>{copy.conflict.mine}</dt><dd>{mine || copy.conflict.empty}</dd></div>
        <div className="flex gap-2"><dt>{copy.conflict.theirs}</dt><dd>{newDue}</dd></div>
      </dl>
      <p>{copy.conflict.hold}</p>
    </Notice>
  )
}
