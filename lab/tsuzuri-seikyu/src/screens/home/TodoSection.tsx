import { Link } from '../../app/Link'
import { screenNames } from '../../app/terms'
import { formatDateColumn, TODAY, formatNumber } from '../../data'
import { InvoiceStatusTag, invoiceStatusDef, PaymentStatusTag, paymentStatusDef, tagDensityOf } from '../../parts'
import { Notice } from '../../ui'
import { copy, overdueNote, unmatchedNote } from './copy'
import type { TodoFacts } from './summary'
import { TodoRow } from './TodoRow'

const HEADING_ID = 'home-todo'

/**
 * 今日やること（REQ-012）。件数つきの行を、期限超過 → 未確認の入金 → 下書きの順に並べる。0 件の行は出さない。
 * 全部 0 件なら「片付いた」の結果を言う知らせ 1 つ（作る導線は区画に出さない：E-05）。
 * 行き先の絞り込みの名前（status=…）は一覧の画面が決める。決まるまでの仮（報告に書いた）。
 */
export function TodoSection({ facts }: { facts: TodoFacts }) {
  const oldestDue = facts.overdue.oldestDue
  const oldestReceived = facts.unmatched.oldestReceived
  const rows = [
    { key: 'overdue', count: facts.overdue.count, tone: invoiceStatusDef.overdue.tone, noun: screenNames.invoices, to: 'invoices', params: { status: 'overdue' },
      note: oldestDue ? overdueNote(formatDateColumn([oldestDue], TODAY)[0], formatNumber(facts.overdue.daysOver)) : '' },
    { key: 'unmatched', count: facts.unmatched.count, tone: paymentStatusDef.unmatched.tone, noun: copy.todoPayment, to: 'payments', params: { status: 'unmatched' },
      note: oldestReceived ? unmatchedNote(formatDateColumn([oldestReceived], TODAY)[0]) : '' },
    { key: 'draft', count: facts.drafts.count, tone: invoiceStatusDef.draft.tone, noun: screenNames.invoices, to: 'invoices', params: { status: 'draft' },
      note: copy.draftNote },
  ].filter((r) => r.count > 0)
  const density = tagDensityOf(rows.map((r) => r.tone))
  const tagOf = (key: string, tone: (typeof rows)[number]['tone']) =>
    key === 'unmatched'
      ? <PaymentStatusTag status="unmatched" density={density(tone)} />
      : <InvoiceStatusTag status={key === 'overdue' ? 'overdue' : 'draft'} density={density(tone)} />
  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4">
      <h2 id={HEADING_ID} className="text-large font-bold">{copy.headings.todo}</h2>
      {rows.length === 0 ? (
        <Notice tone="ok" title={copy.todoDone.title} action={<Link to="invoices">{copy.todoDone.link}</Link>}>
          {copy.todoDone.body}
        </Notice>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {rows.map((r) => <TodoRow key={r.key} tag={tagOf(r.key, r.tone)} noun={r.noun} count={r.count} note={r.note} to={r.to} params={r.params} />)}
        </ul>
      )}
    </section>
  )
}
