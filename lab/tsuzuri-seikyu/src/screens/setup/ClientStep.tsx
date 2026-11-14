import { Button } from '../../ui'
import { copy } from './copy'
import type { StepProps } from './model'
import { StepField } from './StepPanel'

/**
 * 3 段目 最初の取引先。他人の情報なので autocomplete を付けない（F-05）。
 * 「あとで登録する」は quiet で欄の続きに置く（主・副と取り違えない）。登録しなくても終えられると、押す操作の直前に書く（D-10）。
 */
export function ClientStep({ onSkip, ...props }: StepProps & { onSkip: () => void }) {
  return (
    <>
      <StepField {...props} step={3} field="clientName" />
      <StepField {...props} step={3} field="clientEmail" />
      <StepField {...props} step={3} field="contact" />
      <div className="flex flex-col items-start gap-2">
        <p className="text-body text-muted">{copy.skipNote}</p>
        <Button variant="quiet" onClick={onSkip}>{copy.skip}</Button>
      </div>
    </>
  )
}
