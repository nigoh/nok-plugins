import { Link } from '../../app/Link'
import { Button, Notice } from '../../ui'
import type { Invoice } from '../../data'
import type { Op } from './operations'
import type { Plan } from './statusActions'
import type { Failure, Pending } from './useInvoiceOps'
import { actions } from '../../app/terms'
import { otherExplain, page, repeated, unrecord } from './copy'

type Props = {
  plan: Plan
  invoice: Invoice
  pending: Pending | null
  failure: Failure | null
  onOpen: (op: Op) => void
  onUnrecord: () => void
}

/** ほかの操作：直す・入金の確認へ・取り返しのつかない操作。説明は操作のすぐ上に置く。 */
export function OtherActions({ plan, invoice, pending, failure, onOpen, onUnrecord }: Props) {
  if (!plan.other && !plan.editLink && !plan.paymentsLink) return null
  const unrecordFailed = failure?.op === 'unrecord' ? failure : null
  return (
    <section aria-labelledby="other-h" className="flex flex-col gap-4">
      <h2 id="other-h" className="text-large font-bold">{page.other}</h2>
      {(plan.editLink || plan.paymentsLink) && (
        <div className="flex flex-col md:flex-row md:gap-6">
          {plan.editLink && <Link to="invoice-new" params={{ id: invoice.id }}>{page.editDraft}</Link>}
          {plan.paymentsLink && <Link to="payments">{page.openPayments}</Link>}
        </div>
      )}
      {plan.other && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-body text-muted">{otherExplain[plan.other]}</p>
          {plan.other === 'unrecord' ? (
            <Button busy={pending === 'unrecord'} busyLabel={unrecord.busy} onClick={onUnrecord}>{unrecord.button}</Button>
          ) : (
            <Button variant="danger" onClick={() => onOpen(plan.other as Op)}>{plan.other === 'remove' ? actions.deleteDraft : actions.voidInvoice}</Button>
          )}
          {unrecordFailed && (
            <Notice tone="fail" title={unrecord.failure.title}>
              {unrecord.failure.body}
              {unrecordFailed.count >= 3 && <> {repeated}</>}
            </Notice>
          )}
        </div>
      )}
    </section>
  )
}
