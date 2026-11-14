import type { InvoiceDisplayStatus } from '../data'
import { StatusTag, type TagDensity } from '../ui'
import { invoiceStatusDef } from './status'

/** CMP-021。請求書の状況の札。業務の状況を、呼び名と調子に直して基本の札に渡す。density は tagDensityOf（C-08）の結果。 */
export function InvoiceStatusTag({ status, density }: { status: InvoiceDisplayStatus; density?: TagDensity }) {
  const d = invoiceStatusDef[status]
  return (
    <span data-cmp="CMP-021" className="inline-flex">
      <StatusTag tone={d.tone} density={density}>{d.label}</StatusTag>
    </span>
  )
}
