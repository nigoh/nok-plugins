import { clientOf, clients, displayStatus, dueNoteOf, formatDate, invoiceTotal, TODAY, type Invoice } from '../../data'
import { InvoiceStatusTag } from '../../parts'
import { Money } from '../../ui'
import { fact, page } from './copy'
import { Facts, type Fact } from './Facts'

/** 概要：状況・取引先・合計（税込）を左に、期限・日付・宛先・メモを右に。 */
export function Overview({ invoice }: { invoice: Invoice }) {
  const client = clientOf(invoice.clientId, clients)
  const contact = client?.contacts[0]
  const note = dueNoteOf(invoice, TODAY)
  const items: Fact[] = [
    { label: fact.due, value: <>{formatDate(invoice.dueOn)}{note && <span className="ml-2 text-muted">{note}</span>}</> },
    { label: fact.issued, value: formatDate(invoice.issuedOn) },
  ]
  if (invoice.paidOn) items.push({ label: fact.paid, value: formatDate(invoice.paidOn) })
  if (contact) items.push({ label: fact.to, value: <>{contact.name}<br />{contact.email}</> })
  if (invoice.memo) items.push({ label: fact.memo, value: invoice.memo })
  return (
    <section aria-label={page.overview} className="flex flex-col gap-6 md:flex-row md:justify-between md:gap-8">
      <div className="flex min-w-0 flex-col items-start gap-4">
        <InvoiceStatusTag status={displayStatus(invoice, TODAY)} />
        <p className="text-title font-bold break-words">{client?.name ?? '—'}</p>
        <div className="flex flex-col">
          <span className="text-muted">{fact.total}</span>
          <Money value={invoiceTotal(invoice)} size="display" />
        </div>
      </div>
      <Facts items={items} className="md:w-96 md:shrink-0" />
    </section>
  )
}
