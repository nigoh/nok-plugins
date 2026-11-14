import type { StepProps } from './model'
import { StepField } from './StepPanel'

/** 1 段目 自社の情報。請求書の差出人に載る 6 欄（必須 4・任意 2）。自社の情報は本人の情報なので autocomplete を付ける（F-05）。 */
export function CompanyStep(props: StepProps) {
  return (
    <>
      <StepField {...props} step={1} field="companyName" />
      <StepField {...props} step={1} field="zip" />
      <StepField {...props} step={1} field="address" />
      <StepField {...props} step={1} field="phone" />
      <StepField {...props} step={1} field="email" />
      <StepField {...props} step={1} field="registrationNo" />
    </>
  )
}
