import type { PaymentDisplayStatus } from '../data'
import { StatusTag, type TagDensity } from '../ui'
import { paymentStatusDef } from './status'

/** CMP-022。入金の確認の状況の札。 */
export function PaymentStatusTag({ status, density }: { status: PaymentDisplayStatus; density?: TagDensity }) {
  const d = paymentStatusDef[status]
  return (
    <span data-cmp="CMP-022" className="inline-flex">
      <StatusTag tone={d.tone} density={density}>{d.label}</StatusTag>
    </span>
  )
}
