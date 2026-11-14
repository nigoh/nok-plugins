import { daysUntil, dueNote } from '../lib'
import { calcTotals } from './calc'
import type { Client, ClientTerms, Invoice, InvoiceDisplayStatus, Payment } from './types'

/** ほかの値から計算できるものは持たず、ここで計算する（S-07）。 */

export const invoiceTotal = (inv: Invoice): number => calcTotals(inv.lines, inv.rounding).total

/** 画面に出す状況。送付済みで期限を過ぎていれば「期限超過」。 */
export function displayStatus(inv: Invoice, today: string): InvoiceDisplayStatus {
  return inv.status === 'sent' && inv.dueOn < today ? 'overdue' : inv.status
}

/**
 * 支払期限の補足（「あと3日」「今日まで」「3日超過」）。入金を待っている請求書（送付済み・期限超過）だけ。
 * 入金済み・取り消し済み・下書きには期限の知らせは要らないので null。言い方は lib の dueNote。
 */
export function dueNoteOf(inv: Invoice, today: string): string | null {
  const status = displayStatus(inv, today)
  return status === 'sent' || status === 'overdue' ? dueNote(daysUntil(inv.dueOn, today)) : null
}

/** 入金を待っている額（送付済み＋期限超過）。 */
export const isUnpaid = (inv: Invoice) => inv.status === 'sent'

export const clientOf = (id: string, list: Client[]): Client | undefined => list.find((c) => c.id === id)

/** 例：「月末締め・翌月末払い」「20日締め・翌月末払い」「月末締め・翌々月10日払い」 */
export function describeTerms(t: ClientTerms): string {
  const closing = t.closingDay === 'end' ? '月末' : `${t.closingDay}日`
  const month = t.payMonthsLater === 0 ? '当月' : t.payMonthsLater === 1 ? '翌月' : '翌々月'
  const day = t.payDay === 'end' ? '末' : `${t.payDay}日`
  return `${closing}締め・${month}${day}払い`
}

/** 全角カナ・半角カナ・かっこ・空白をそろえた比較用の文字列（M-34：比較の前に 1 か所で正規化）。 */
export function normalizeName(s: string): string {
  return s.normalize('NFKC').replace(/[(（][^)）]*[)）]?/g, '').replace(/[\s・゛゜]/g, '')
}

export type Candidate = { invoice: Invoice; clientName: string; difference: number; reason: 'name' | 'amount' | 'both' }

/** 入金に合いそうな請求書を、名義と金額から挙げる。差額が 1,000 円以内（振込手数料ぶん）なら金額が合うとみなす。 */
export function candidatesFor(p: Payment, invoicesList: Invoice[], clientList: Client[]): Candidate[] {
  const payer = normalizeName(p.payerName)
  const out: Candidate[] = []
  for (const inv of invoicesList) {
    if (!isUnpaid(inv)) continue
    const client = clientOf(inv.clientId, clientList)
    if (!client) continue
    const nameHit = payer.length > 0 && normalizeName(client.kana).includes(payer.slice(0, 6))
    const difference = invoiceTotal(inv) - p.amount
    const amountHit = Math.abs(difference) <= 1000
    if (nameHit || amountHit) out.push({ invoice: inv, clientName: client.name, difference, reason: nameHit && amountHit ? 'both' : nameHit ? 'name' : 'amount' })
  }
  const rank = { both: 0, name: 1, amount: 2 } as const
  return out.sort((a, b) => rank[a.reason] - rank[b.reason] || Math.abs(a.difference) - Math.abs(b.difference))
}

export type PaymentDisplayStatus = 'unmatched' | 'matched' | 'diff'

/** 入金の確認の状況。突き合わせ先が無ければ未確認、あって金額が違えば差額あり。 */
export function paymentStatus(p: Payment, invoicesList: Invoice[]): PaymentDisplayStatus {
  if (!p.matchedInvoiceId) return 'unmatched'
  const inv = invoicesList.find((i) => i.id === p.matchedInvoiceId)
  return inv && invoiceTotal(inv) !== p.amount ? 'diff' : 'matched'
}
