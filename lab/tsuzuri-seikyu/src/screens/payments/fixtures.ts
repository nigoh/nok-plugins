import { clients, invoices, invoiceTotal, makeManyInvoices, payments, type Invoice, type Payment } from '../../data'
import { copy } from './copy'

export type BulkResult = {
  /** まとめて確認しようとした件数 */
  total: number
  /** 確認できた入金 */
  confirmed: string[]
  /** 確認できなかった入金と理由 */
  failed: { paymentId: string; reason: string }[]
}

/** この画面が取る物。入金と、突き合わせ先の請求書（取引先は data の見本を使う）。 */
export type PaymentsData = { payments: Payment[]; invoices: Invoice[]; lastResult?: BulkResult }

const base: PaymentsData = { payments, invoices }

/** status_diff：アカシア電機の入金（241,670円）が、請求書（242,000円）に突き合わせ済みで、差額がある。 */
const diffCase: PaymentsData = {
  payments: payments.map((p) => (p.id === 'pay-008' ? { ...p, matchedInvoiceId: 'inv-022' } : p)),
  invoices,
}

/** partial：4 件をまとめて確認し、3 件が確認できて、1 件（石狩運輸）は通信が切れて残った。 */
const partialCase: PaymentsData = {
  payments: payments.map((p) => {
    const done: Record<string, string> = { 'pay-001': 'inv-027', 'pay-005': 'inv-025', 'pay-011': 'inv-021' }
    return done[p.id] ? { ...p, matchedInvoiceId: done[p.id] } : p
  }),
  invoices,
  lastResult: { total: 4, confirmed: ['pay-001', 'pay-005', 'pay-011'], failed: [{ paymentId: 'pay-012', reason: copy.failedByNetwork }] },
}

let manyCase: PaymentsData | null = null

/** many：未確認が 32 件（見本の 6 件＋26 件）。20 件ごとのページ送りを確かめる。入金の名義は取引先のかなから作る。 */
function makeMany(): PaymentsData {
  if (manyCase) return manyCase
  const sent = makeManyInvoices(240).filter((i) => i.status === 'sent')
  const extra: Payment[] = sent.slice(0, 26).map((inv, i) => ({
    id: `pay-x${String(i + 1).padStart(2, '0')}`,
    receivedOn: `2026-11-${String(1 + (i % 12)).padStart(2, '0')}`,
    payerName: `(カ)${(clients.find((c) => c.id === inv.clientId)?.kana ?? '').slice(0, 10)}`,
    amount: invoiceTotal(inv),
    matchedInvoiceId: null,
  }))
  manyCase = { payments: [...payments, ...extra], invoices: [...invoices, ...sent] }
  return manyCase
}

/** 状態名から確かめ用のデータを返す。同じ状態には同じ物（参照も同じ）を返す。 */
export function makePaymentsData(state: string): PaymentsData {
  if (state === 'status_diff') return diffCase
  if (state === 'partial') return partialCase
  if (state === 'many') return makeMany()
  return base
}

/** 状態名から、最初に開いておく入金（URL に ?pay= が無いとき）。 */
export function openedBy(state: string): string | null {
  if (state === 'status_diff') return 'pay-008'
  if (state === 'candidates_empty') return 'pay-007'
  return null
}
