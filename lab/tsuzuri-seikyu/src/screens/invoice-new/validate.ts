import { formatDate, formatNumber, TODAY, type Client } from '../../data'
import { readDate, readQuantity, readYen } from '../../lib'
import { copy } from './copy'
import { ids, lineIds } from './fields'
import { summarize } from './totals'
import { MAX_AMOUNT, MAX_QUANTITY, type FormValues } from './types'
import type { Rounding } from '../../data'

/** 誤り 1 件。id は欄の id（まとめの一覧のリンク先）、empty は空欄の誤りか（空欄は送る時に出し、離れた時には出さない：F-04）。 */
export type Issue = { id: string; message: string; empty: boolean }
/** draft＝下書き（途中でも保存できる）、send＝送る前（全部が揃っていること）。 */
export type Mode = 'draft' | 'send'
export type Errors = Record<string, string>

const exampleIssued = formatDate(TODAY)
const exampleDue = formatDate('2026-12-31')

/** 誤りを欄の並び順（画面の上から下）で返す。 */
export function validate(v: FormValues, mode: Mode, clients: Client[], rounding: Rounding): Issue[] {
  const out: Issue[] = []
  const add = (id: string, message: string, empty = false) => out.push({ id, message, empty })

  const client = clients.find((c) => c.id === v.clientId)
  if (!client) add(ids.client, copy.error.pickClient, true)
  else if (mode === 'send' && !client.contacts.some((c) => c.email !== '')) add(ids.client, copy.error.noEmail)

  const issued = readDate(v.issuedOn, TODAY)
  if (issued.kind === 'empty') add(ids.issued, copy.error.issuedEmpty, true)
  else if (issued.kind === 'bad') add(ids.issued, copy.error.issuedBad(exampleIssued))

  const due = readDate(v.dueOn, TODAY)
  if (due.kind === 'empty') add(ids.due, copy.error.dueEmpty, true)
  else if (due.kind === 'bad') add(ids.due, copy.error.dueBad(exampleDue))
  else if (issued.kind === 'ok' && due.ymd < issued.ymd) add(ids.due, copy.error.dueBeforeIssued)

  v.lines.forEach((l, i) => {
    const n = i + 1
    const f = lineIds(l.id)
    if (mode === 'send' && l.desc.trim() === '') add(f.desc, copy.error.descEmpty(n), true)
    const q = readQuantity(l.qty, MAX_QUANTITY)
    if (q.kind === 'empty') { if (mode === 'send') add(f.qty, copy.error.qtyEmpty(n), true) }
    else if (q.kind === 'bad') add(f.qty, copy.error.qtyBad(n))
    else if (q.kind === 'over') add(f.qty, copy.error.qtyOver(n, formatNumber(MAX_QUANTITY)))
    const p = readYen(l.price, MAX_AMOUNT)
    if (p.kind === 'empty') { if (mode === 'send') add(f.price, copy.error.priceEmpty(n), true) }
    else if (p.kind === 'bad') add(f.price, copy.error.priceBad(n))
    else if (p.kind === 'over') add(f.price, copy.error.priceOver(n, formatNumber(MAX_AMOUNT)))
  })

  const totals = summarize(v.lines, rounding).totals
  if (totals && totals.total > MAX_AMOUNT) add(ids.total, copy.error.totalOver(formatNumber(MAX_AMOUNT)))
  return out
}

export const toErrors = (issues: Issue[]): Errors => Object.fromEntries(issues.map((i) => [i.id, i.message]))
