import { Notice } from '../../ui'
import { messages } from '../../app/terms'
import { copy } from './copy'

type Props = { failed: boolean; dirty: boolean; saving: boolean }

/** 保存の結果の知らせ。失敗は入力を残したまま、欄の近くで言う。未保存の変更は静かな 1 行（F-09）。 */
export function SaveStatus({ failed, dirty, saving }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {failed && <Notice tone="fail">{messages.saveFailed}</Notice>}
      <p role="status" className="text-body text-muted empty:hidden">{dirty && !saving && !failed ? copy.unsaved : ''}</p>
    </div>
  )
}
