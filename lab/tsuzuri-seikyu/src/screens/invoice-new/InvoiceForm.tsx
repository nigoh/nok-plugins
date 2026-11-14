import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { messages } from '../../app/terms'
import { describeTerms, formatDate, TODAY } from '../../data'
import { readDate } from '../../lib'
import { Button, ErrorSummary, Field, Notice, Textarea, useFocusFirstInvalid, type FieldError } from '../../ui'
import { ClientField } from './ClientField'
import { ConflictNotice } from './ConflictNotice'
import { DateField } from './DateField'
import { copy } from './copy'
import { weekendName } from './dueDate'
import { FORM_ID, ids, lineIds, markOf } from './fields'
import { LineItem } from './LineItem'
import { SendDialog } from './SendDialog'
import { TotalsPanel } from './TotalsPanel'
import { MAX_LINES } from './types'
import type { InvoiceFormApi } from './useInvoiceForm'

/** 入力画面の本体。値と操作は form（useInvoiceForm）から受け取り、描くだけ。窓は <form> の外。 */
export function InvoiceForm({ form }: { form: InvoiceFormApi }) {
  const ref = useRef<HTMLFormElement>(null)
  useFocusFirstInvalid(ref, form.attempt)
  const { values, errors, flow, conflict, clients, summary } = form

  useEffect(() => {
    if (form.focusLine) {
      document.getElementById(lineIds(form.focusLine).desc)?.focus()
      form.clearFocusLine()
    }
  }, [form])

  const client = clients.find((c) => c.id === values.clientId)
  const due = readDate(values.dueOn, TODAY)
  const weekend = due.kind === 'ok' ? weekendName(due.ymd) : null
  const dueBase = !client ? copy.hint.dueNoClient : values.dueTouched ? copy.hint.dueTouched : copy.hint.dueFromTerms(describeTerms(client.terms))
  const dueHint = weekend && due.kind === 'ok' ? `${dueBase}${copy.hint.dueWeekend(formatDate(due.ymd), weekend)}` : dueBase

  const order = [ids.client, ids.issued, ids.due, ...values.lines.flatMap((l) => [lineIds(l.id).desc, lineIds(l.id).qty, lineIds(l.id).price]), ids.total]
  const list: FieldError[] = order.filter((id) => errors[id]).map((id) => ({ id, message: errors[id] }))

  const submit = (e: FormEvent) => { e.preventDefault(); form.review() }
  /** 欄の中の Enter は何もしない（長い入力の途中で「内容を確かめる」が押されるのを避ける。変換確定の Enter も除く）。 */
  const keyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    if ((e.target as HTMLElement).tagName === 'INPUT') e.preventDefault()
  }
  const atMax = values.lines.length >= MAX_LINES
  const email = client?.contacts.find((c) => c.email !== '')?.email ?? ''
  const busyFlow = flow.kind === 'sending' || flow.kind === 'draftSaving'

  return (
    <>
      <form id={FORM_ID} ref={ref} noValidate onSubmit={submit} onKeyDown={keyDown} className="flex flex-col gap-8">
        <ErrorSummary errors={list} />
        {form.draftFailed && <Notice tone="fail">{messages.saveFailed}</Notice>}
        {conflict && <ConflictNotice change={conflict} mine={values.dueOn} newDue={formatDate(conflict.newDue)} onKeep={form.keepMine} onUseNew={form.useNewDue} />}

        <fieldset disabled={busyFlow} className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="sec-dest" className="flex flex-col gap-6">
            <h2 id="sec-dest" className="text-large font-bold">{copy.section.dest}</h2>
            <ClientField clients={clients} value={values.clientId} mark={markOf('client')} error={errors[ids.client]} filter={form.filter} onFilter={form.setFilter} onChange={form.setClient} />
            <DateField id={ids.issued} label={copy.label.issued} value={values.issuedOn} mark={markOf('issued')} hint={copy.hint.issuedExample(formatDate(TODAY))} error={errors[ids.issued]} adjusted={Boolean(form.adjusted[ids.issued])} onChange={form.setIssued} onBlur={form.blurIssued} />
            <DateField
              id={ids.due} label={copy.label.due} value={values.dueOn} mark={markOf('due')} hint={dueHint} error={errors[ids.due]} adjusted={Boolean(form.adjusted[ids.due])} onChange={form.setDue} onBlur={form.blurDue}
              below={
                <>
                  {form.dueChanged && <p role="status" className="text-body text-muted">{copy.dueChanged}</p>}
                  {values.dueTouched && client && <div><Button variant="quiet" onClick={form.resetDue}>{copy.resetDue}</Button></div>}
                </>
              }
            />
          </section>

          <section aria-labelledby="sec-lines" className="flex flex-col gap-6">
            <h2 id="sec-lines" className="text-large font-bold">{copy.section.lines}</h2>
            <p className="text-body text-muted">{copy.hint.lines}</p>
            <ol className="flex flex-col gap-6">
              {values.lines.map((l, i) => {
                const f = lineIds(l.id)
                return (
                  <LineItem
                    key={l.id} n={i + 1} line={l} amount={summary.amounts[i]}
                    errors={{ desc: errors[f.desc], qty: errors[f.qty], price: errors[f.price] }}
                    adjusted={{ qty: Boolean(form.adjusted[f.qty]), price: Boolean(form.adjusted[f.price]) }}
                    canRemove={values.lines.length > 1}
                    onChange={(key, v) => form.setLine(l.id, key, v)} onBlur={(key) => form.blurLine(l.id, key)} onRemove={() => form.removeLine(l.id)}
                  />
                )
              })}
            </ol>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Button onClick={form.addLine} disabled={atMax} leading="plus">{copy.addLine}</Button>
              {atMax && <p className="text-body text-muted">{copy.maxLines(MAX_LINES)}</p>}
            </div>
            <TotalsPanel summary={summary} rounding={form.rounding} error={errors[ids.total]} />
          </section>

          <section aria-labelledby="sec-memo" className="flex flex-col gap-6">
            <h2 id="sec-memo" className="text-large font-bold">{copy.section.memo}</h2>
            <Field id={ids.memo} label={copy.label.memo} mark={markOf('memo')} hint={copy.hint.memo}>
              {(p) => <Textarea {...p} value={values.memo} onChange={(e) => form.setMemo(e.target.value)} />}
            </Field>
          </section>
        </fieldset>
      </form>

      <SendDialog
        open={flow.kind === 'confirm' || flow.kind === 'sending'} busy={flow.kind === 'sending'} failed={flow.kind === 'confirm' && flow.failed}
        clientName={client?.name ?? ''} email={email} total={summary.totals ? summary.totals.total : null} due={values.dueOn}
        onClose={form.closeConfirm} onSend={form.send}
      />
    </>
  )
}
