import { useRef, useState, type FormEvent } from 'react'
import { actions, messages } from '../../app/terms'
import { formatDate, formatNumber, invoiceTotal, TODAY, type Invoice } from '../../data'
import { readDate, readYen, settleDate, settleYen } from '../../lib'
import { Button, Dialog, ErrorSummary, Field, markFor, Notice, TextInput, useFocusFirstInvalid, type FieldError } from '../../ui'
import type { RecordInput } from './operations'
import { record, repeated, windows } from './copy'
import { checkAmount, checkPaidOn, validateRecord, type RecordContext, type RecordErrors, type RecordValues } from './validate'
import type { Failure } from './useInvoiceOps'

const FORM_ID = 'record-payment-form'
const IDS = { paidOn: 'record-paid-on', amount: 'record-amount' } as const
/** 2 欄とも必須（全部が必須なので印は付けず、先頭に「すべて入力してください」）。 */
const COUNT = { required: 2, total: 2 }
/** 見本の「入力に誤りがある」状態の初期値（差額 2,200 円。日付は存在しない）。 */
const INVALID_DIFF = 2200

type Props = {
  open: boolean
  invoice: Invoice
  state: string
  pending: boolean
  failure: Failure | null
  onSubmit: (input: RecordInput) => void
  onClose: () => void
}

function RecordForm({ invoice, state, pending, failure, onSubmit }: Omit<Props, 'open' | 'onClose'>) {
  const ctx: RecordContext = { issuedOn: invoice.issuedOn, today: TODAY, total: invoiceTotal(invoice) }
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<RecordValues>(() =>
    state === 'invalid'
      ? { paidOn: '2026/13/40', amount: formatNumber(ctx.total - INVALID_DIFF) }
      : { paidOn: formatDate(TODAY), amount: formatNumber(ctx.total) },
  )
  const [errors, setErrors] = useState<RecordErrors>(() => (state === 'invalid' ? validateRecord(values, ctx) : {}))
  const [fixed, setFixed] = useState<{ paidOn: boolean; amount: boolean }>({ paidOn: false, amount: false })
  const [attempt, setAttempt] = useState(0)
  useFocusFirstInvalid(formRef, attempt)

  const change = (key: keyof RecordValues, v: string) => {
    setValues((s) => ({ ...s, [key]: v }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }
  const blur = (key: keyof RecordValues) => {
    const raw = values[key]
    const settled = key === 'paidOn' ? settleDate(raw, TODAY) : settleYen(raw)
    const next = settled.value
    setValues((s) => ({ ...s, [key]: next }))
    setFixed((f) => ({ ...f, [key]: settled.adjusted }))
    const msg = key === 'paidOn' ? checkPaidOn(next, ctx, false) : checkAmount(next, ctx, false)
    setErrors((e) => ({ ...e, [key]: msg ?? undefined }))
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (pending) return
    const found = validateRecord(values, ctx)
    setErrors(found)
    if (found.paidOn || found.amount) { setAttempt((n) => n + 1); return }
    const paidOn = readDate(values.paidOn, TODAY)
    const amount = readYen(values.amount)
    if (paidOn.kind === 'ok' && amount.kind === 'ok') onSubmit({ paidOn: paidOn.ymd, amount: amount.value })
  }

  const list: FieldError[] = [
    ...(errors.paidOn ? [{ id: IDS.paidOn, message: errors.paidOn }] : []),
    ...(errors.amount ? [{ id: IDS.amount, message: errors.amount }] : []),
  ]
  const hint = (key: 'paidOn' | 'amount', origin: string) => `${origin}${fixed[key] ? record.widenedTail(messages.widened) : ''}`
  const failed = failure?.op === 'record' ? failure : null
  return (
    <form id={FORM_ID} ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-4">
      <p>{windows.record.body}</p>
      <p className="text-muted">{record.all}</p>
      <ErrorSummary errors={list} />
      <Field id={IDS.paidOn} label={record.paidOn} mark={markFor(true, COUNT)} required error={errors.paidOn} hint={hint('paidOn', record.hintPaidOn)}>
        {(p) => <TextInput {...p} value={values.paidOn} disabled={pending} onChange={(e) => change('paidOn', e.target.value)} onBlur={() => blur('paidOn')} />}
      </Field>
      <Field id={IDS.amount} label={record.amount} mark={markFor(true, COUNT)} required error={errors.amount} hint={hint('amount', record.hintAmount)}>
        {(p) => <TextInput {...p} align="end" trailing="円" inputMode="numeric" value={values.amount} disabled={pending} onChange={(e) => change('amount', e.target.value)} onBlur={() => blur('amount')} />}
      </Field>
      {failed && (
        <Notice tone="fail" title={windows.record.failure.title}>
          {windows.record.failure.body}
          {failed.count >= 3 && <> {repeated}</>}
        </Notice>
      )}
    </form>
  )
}

/** CMP-012。入金を記録する入力の窓。通信中は閉じられず、入力は残す。 */
export function RecordDialog({ open, onClose, ...rest }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={windows.record.title}
      dismissible={!rest.pending}
      secondary={<Button disabled={rest.pending} onClick={onClose}>{actions.cancel}</Button>}
      primary={<Button type="submit" form={FORM_ID} variant="primary" busy={rest.pending} busyLabel={windows.record.busy}>{windows.record.primary}</Button>}
    >
      <RecordForm {...rest} />
    </Dialog>
  )
}
