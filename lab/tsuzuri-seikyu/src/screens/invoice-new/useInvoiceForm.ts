import { useRef, useState } from 'react'
import { go } from '../../app/nav'
import { actions } from '../../app/terms'
import { formatDate, type Rounding } from '../../data'
import { useToast } from '../../ui'
import { copy } from './copy'
import { ids, lineIds } from './fields'
import { autoDue, newLine, patchLine, tidyDate, tidyQuantity, tidyYen } from './formLogic'
import type { Conflict, Data, Seed } from './seed'
import { summarize } from './totals'
import { toErrors, validate, type Errors, type Mode } from './validate'
import { MAX_LINES, type Flow, type FormValues, type LineDraft, type SaveFn } from './types'

/** 手を入れた物だけを持つ。入れていない物は見本（seed）の値を使う（edits ?? seed）。 */
type Edits = {
  values?: FormValues
  errors?: Errors
  flow?: Flow
  conflict?: Conflict | null
  /** 最後に保存した入力。これと違えば未保存。 */
  saved?: FormValues
  dueChanged?: boolean
  adjusted?: Record<string, boolean>
  draftFailed?: boolean
  attempt: number
  filter?: string
  focusLine?: string | null
}

type Args = { seed: Seed; data: Data; save: SaveFn }

export function useInvoiceForm({ seed, data, save }: Args) {
  const toast = useToast()
  const [edits, setEdits] = useState<Edits>({ attempt: 0 })
  const nextId = useRef(seed.values.lines.length + 1)
  const { clients, settings } = data
  const rounding: Rounding = settings.rounding

  const values = edits.values ?? seed.values
  const errors = edits.errors ?? seed.errors
  const flow = edits.flow ?? seed.flow
  const conflict = edits.conflict === undefined ? seed.conflict : edits.conflict
  const adjusted = edits.adjusted ?? {}
  const dirty = JSON.stringify(values) !== JSON.stringify(edits.saved ?? seed.values)
  const summary = summarize(values.lines, rounding)

  const patch = (p: Partial<Edits>) => setEdits((e) => ({ ...e, ...p }))
  const setValues = (fn: (v: FormValues) => FormValues) => setEdits((e) => ({ ...e, values: fn(e.values ?? seed.values) }))
  const setError = (id: string, message: string | undefined) =>
    setEdits((e) => {
      const next = { ...(e.errors ?? seed.errors) }
      if (message) next[id] = message
      else delete next[id]
      return { ...e, errors: next }
    })
  const setAdjusted = (id: string, on: boolean) => setEdits((e) => ({ ...e, adjusted: { ...(e.adjusted ?? {}), [id]: on } }))
  const clearTouched = (id: string) => {
    if (errors[id]) setError(id, undefined)
    if (adjusted[id]) setAdjusted(id, false)
  }

  /** 離れた時の確かめ（形式の誤りだけ。空欄は送る時：F-04）。 */
  const checkOne = (v: FormValues, ...checkIds: string[]) => {
    const issues = validate(v, 'draft', clients, rounding)
    for (const id of checkIds) setError(id, issues.find((i) => i.id === id && !i.empty)?.message)
  }

  const setClient = (clientId: string) => {
    clearTouched(ids.client)
    const next = autoDue({ ...values, clientId }, clients)
    patch({ values: next, dueChanged: values.dueOn !== '' && next.dueOn !== values.dueOn && !values.dueTouched ? true : edits.dueChanged })
    setError(ids.due, undefined)
  }
  const setIssued = (text: string) => { clearTouched(ids.issued); setValues((v) => ({ ...v, issuedOn: text })) }
  const blurIssued = () => {
    const t = tidyDate(values.issuedOn)
    const tidied = { ...values, issuedOn: t.value }
    const next = autoDue(tidied, clients)
    patch({ values: next, dueChanged: values.dueOn !== '' && next.dueOn !== values.dueOn ? true : edits.dueChanged })
    setAdjusted(ids.issued, t.adjusted)
    checkOne(next, ids.issued, ids.due)
  }
  const setDue = (text: string) => {
    clearTouched(ids.due)
    patch({ dueChanged: false })
    setValues((v) => ({ ...v, dueOn: text, dueTouched: true }))
  }
  const blurDue = () => {
    const t = tidyDate(values.dueOn)
    const next = { ...values, dueOn: t.value }
    patch({ values: next })
    setAdjusted(ids.due, t.adjusted)
    checkOne(next, ids.due)
  }
  const resetDue = () => {
    const next = autoDue({ ...values, dueTouched: false }, clients)
    patch({ values: next, dueChanged: false })
    setError(ids.due, undefined)
  }
  const setMemo = (memo: string) => setValues((v) => ({ ...v, memo }))

  const setLine = (id: string, key: keyof LineDraft, value: string) => {
    const f = lineIds(id)
    const fieldId = (f as Record<string, string>)[key]
    if (fieldId) clearTouched(fieldId)
    if (errors[ids.total]) setError(ids.total, undefined)
    setValues((v) => patchLine(v, id, { [key]: key === 'tax' ? Number(value) : value }))
  }
  const blurLine = (id: string, key: 'qty' | 'price') => {
    const line = values.lines.find((l) => l.id === id)
    if (!line) return
    const t = key === 'qty' ? tidyQuantity(line.qty) : tidyYen(line.price)
    const next = patchLine(values, id, key === 'qty' ? { qty: t.value } : { price: t.value })
    patch({ values: next })
    const fieldId = lineIds(id)[key]
    setAdjusted(fieldId, t.adjusted)
    checkOne(next, fieldId, ids.total)
  }

  const addLine = () => {
    if (values.lines.length >= MAX_LINES) return
    const id = `l${nextId.current++}`
    patch({ values: { ...values, lines: [...values.lines, newLine(id, settings.defaultTaxRate)] }, focusLine: id })
  }
  const removeLine = (id: string) => {
    if (values.lines.length <= 1) return
    const index = values.lines.findIndex((l) => l.id === id)
    if (index < 0) return
    const removed = values.lines[index]
    patch({ values: { ...values, lines: values.lines.filter((l) => l.id !== id) } })
    toast.show({
      message: copy.toast.lineRemoved(index + 1),
      action: {
        label: actions.undo,
        onAction: () => setValues((v) => (v.lines.some((l) => l.id === id) ? v : { ...v, lines: [...v.lines.slice(0, index), removed, ...v.lines.slice(index)] })),
      },
    })
  }

  /** 誤りがあれば欄の直下に出し、最初の誤り欄へ移る。誤りが無ければ true。 */
  const check = (mode: Mode): boolean => {
    const issues = validate(values, mode, clients, rounding)
    if (issues.length === 0) { patch({ errors: {} }); return true }
    patch({ errors: toErrors(issues), attempt: edits.attempt + 1 })
    return false
  }

  const finish = (kind: 'draft' | 'send', id: string) => {
    patch({ saved: values, flow: { kind: 'editing' } })
    toast.show({ message: kind === 'send' ? copy.toast.sent : copy.toast.draftSaved, tone: 'ok' })
    go('invoice-detail', { id })
  }

  /** 下書きを保存する。失敗なら入力を残して先頭の知らせを出し false。leaving は「保存して離れる」から：成功しても詳細へは移らず、移る先は骨格が決める。 */
  const runDraft = async (leaving = false): Promise<boolean> => {
    patch({ flow: { kind: 'draftSaving' }, draftFailed: false })
    const r = await save('draft')
    if (!r.ok) { patch({ flow: { kind: 'editing' }, draftFailed: true }); return false }
    if (leaving) { patch({ saved: values, flow: { kind: 'editing' } }); toast.show({ message: copy.toast.draftSaved, tone: 'ok' }); return true }
    finish('draft', r.id)
    return true
  }

  const saveDraft = () => { if (conflict === null && flow.kind === 'editing' && check('draft')) void runDraft() }
  const review = () => { if (conflict === null && flow.kind === 'editing' && check('send')) patch({ flow: { kind: 'confirm', failed: false } }) }
  const closeConfirm = () => { if (flow.kind === 'confirm') patch({ flow: { kind: 'editing' } }) }
  const send = async () => {
    if (flow.kind !== 'confirm') return
    patch({ flow: { kind: 'sending' } })
    const r = await save('send')
    if (r.ok) finish('send', r.id)
    else patch({ flow: { kind: 'confirm', failed: true } })
  }

  /** 離れる窓の「保存して離れる」（AppShell の onSaveBeforeLeave）。必須が欠けていれば誤りを出して false（途中で壊れた下書きを作らない）。 */
  const saveBeforeLeave = async (): Promise<boolean> => (flow.kind === 'editing' && check('draft') ? runDraft(true) : false)

  const keepMine = () => { patch({ conflict: null }); if (check('draft')) void runDraft() }
  const useNewDue = () => {
    if (!conflict) return
    const before = { values, conflict }
    const rest = { ...errors }
    delete rest[ids.due]
    patch({ values: { ...values, dueOn: formatDate(conflict.newDue), dueTouched: false }, conflict: null, errors: rest })
    toast.show({ message: copy.toast.newDue, action: { label: actions.undo, onAction: () => patch({ values: before.values, conflict: before.conflict }) } })
  }

  return {
    values, errors, flow, conflict, adjusted, dirty, summary, rounding,
    attempt: edits.attempt, filter: edits.filter ?? '', dueChanged: edits.dueChanged ?? false, draftFailed: edits.draftFailed ?? seed.draftFailed, focusLine: edits.focusLine ?? null,
    clients, settings,
    setFilter: (filter: string) => patch({ filter }),
    setClient, setIssued, blurIssued, setDue, blurDue, resetDue, setMemo, setLine, blurLine, addLine, removeLine,
    saveDraft, review, closeConfirm, send, saveBeforeLeave, keepMine, useNewDue,
    clearFocusLine: () => patch({ focusLine: null }),
  }
}

export type InvoiceFormApi = ReturnType<typeof useInvoiceForm>
