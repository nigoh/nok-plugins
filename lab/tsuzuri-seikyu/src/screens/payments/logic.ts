import {
  candidatesFor, clientOf, invoiceTotal, isUnpaid, paymentStatus,
  type Candidate, type Client, type Invoice, type Payment, type PaymentDisplayStatus,
} from '../../data'
import { foldForSearch } from '../../lib'

/** 振込手数料とみなす差額の上限（円）。入金のほうが少なく、この額以内なら「手数料として確認」を選べる。 */
export const FEE_LIMIT = 1000

/** 突き合わせ先の請求書と、その取引先名。 */
export type Matched = { invoice: Invoice; clientName: string }

/** 表の 1 行ぶん。状況・候補・差額は入金と請求書から計算し、持たない（S-07）。 */
export type Row = {
  payment: Payment
  status: PaymentDisplayStatus
  /** 未確認・差額ありのときだけ。名義と金額から挙げた候補。 */
  cands: Candidate[]
  /** 名義と金額が合い、1 つに決まる候補（差額なし）。まとめて確認できる。 */
  sure: Candidate | null
  /** すでに突き合わせた請求書（差額あり・確認済み）。 */
  matched: Matched | null
}

/** 入金額 − 請求額。負なら不足。向きは画面にも書く（G-05）。 */
export const differenceOf = (p: Payment, inv: Invoice): number => p.amount - invoiceTotal(inv)

/** 入金のほうが少なく、振込手数料の範囲なら、手数料として確認できる。 */
export const canTreatAsFee = (diff: number): boolean => diff < 0 && diff >= -FEE_LIMIT

/** 名義と金額が合う候補がちょうど 1 つで、差額が無いとき、その候補。 */
export function sureCandidate(cands: Candidate[]): Candidate | null {
  const both = cands.filter((c) => c.reason === 'both')
  return both.length === 1 && both[0].difference === 0 ? both[0] : null
}

/** 未入金の請求書を、番号・取引先名・かなで探す。全角半角・大文字小文字・ひらがなとカタカナを問わない（foldForSearch）。支払期限の近い順。 */
export function searchUnpaid(query: string, invoices: Invoice[], clients: Client[]): Invoice[] {
  const q = foldForSearch(query)
  const open = invoices.filter(isUnpaid)
  const hit = q === '' ? open : open.filter((inv) => {
    const client = clientOf(inv.clientId, clients)
    return foldForSearch(inv.number ?? '').includes(q) || foldForSearch(client?.name ?? '').includes(q) || foldForSearch(client?.kana ?? '').includes(q)
  })
  return [...hit].sort((a, b) => a.dueOn.localeCompare(b.dueOn))
}

/**
 * 入金の行を作る。確認した入金（matches：入金 id → 請求書 id）を反映し、確認済みの請求書は候補から外す。
 * 並びは入金の新しい順（G-04）。同じ日は元の順。
 */
export function buildPaymentRows(payments: Payment[], invoices: Invoice[], clients: Client[], matches: Record<string, string>): { rows: Row[]; unpaid: Invoice[] } {
  const effective = payments.map((p) => (matches[p.id] ? { ...p, matchedInvoiceId: matches[p.id] } : p))
  const statusOf = (p: Payment): PaymentDisplayStatus => (matches[p.id] ? 'matched' : paymentStatus(p, invoices))
  const paidIds = new Set(effective.filter((p) => statusOf(p) === 'matched' && p.matchedInvoiceId).map((p) => p.matchedInvoiceId))
  const open = invoices.map((inv) => (paidIds.has(inv.id) && inv.status === 'sent' ? { ...inv, status: 'paid' as const } : inv))
  const nameOf = (inv: Invoice) => clientOf(inv.clientId, clients)?.name ?? ''
  const rows = effective.map((payment): Row => {
    const status = statusOf(payment)
    const found = payment.matchedInvoiceId ? invoices.find((i) => i.id === payment.matchedInvoiceId) : undefined
    const matched = found ? { invoice: found, clientName: nameOf(found) } : null
    if (status === 'matched') return { payment, status, cands: [], sure: null, matched }
    const cands = candidatesFor(payment, open, clients)
    return { payment, status, cands, sure: status === 'unmatched' ? sureCandidate(cands) : null, matched }
  })
  rows.sort((a, b) => b.payment.receivedOn.localeCompare(a.payment.receivedOn))
  return { rows, unpaid: open.filter(isUnpaid) }
}

/** 行でいちばん合う請求書（突き合わせ済み → 候補の先頭）。 */
export function bestOf(row: Row): { invoice: Invoice; clientName: string } | null {
  if (row.matched) return row.matched
  const c = row.cands[0]
  return c ? { invoice: c.invoice, clientName: c.clientName } : null
}

/** 合計（円）。 */
export const sumAmount = (rows: Row[]): number => rows.reduce((s, r) => s + r.payment.amount, 0)
