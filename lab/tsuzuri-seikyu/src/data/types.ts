/** 業務の型。ここが「請求書とは何か」の正本。金額は円の整数、日付は 'YYYY-MM-DD'（日本の暦日）、時刻は UTC の ISO 文字列。 */

export type TaxRate = 10 | 8
export type Rounding = 'floor' | 'round' | 'ceil'

/** 保存される状況。「期限超過」は期限と今日から計算できるので持たない（derive.ts の displayStatus）。 */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void'
/** 画面に出す状況。 */
export type InvoiceDisplayStatus = InvoiceStatus | 'overdue'

export type Contact = { name: string; section?: string; email: string; phone?: string }

/** 締め日と支払期限。例：月末締め・翌月末払い = closingDay 'end', payMonthsLater 1, payDay 'end' */
export type ClientTerms = { closingDay: 'end' | number; payMonthsLater: 0 | 1 | 2; payDay: 'end' | number }

export type Client = {
  id: string
  name: string
  /** 並べ替えと探すとき用（全角カタカナ） */
  kana: string
  zip: string
  address: string
  terms: ClientTerms
  contacts: Contact[]
}

export type InvoiceLine = {
  id: string
  description: string
  quantity: number
  unit: string
  /** 税抜の単価 */
  unitPrice: number
  taxRate: TaxRate
}

export type HistoryKind = 'created' | 'saved' | 'sent' | 'paid' | 'voided'
export type HistoryEntry = { id: string; at: string; kind: HistoryKind; note?: string }

export type Invoice = {
  id: string
  /** 送るときに付く。下書きは null。 */
  number: string | null
  clientId: string
  status: InvoiceStatus
  issuedOn: string
  dueOn: string
  paidOn: string | null
  lines: InvoiceLine[]
  rounding: Rounding
  memo?: string
  history: HistoryEntry[]
}

export type Payment = {
  id: string
  receivedOn: string
  /** 通帳に出る振込名義 */
  payerName: string
  amount: number
  /** 突き合わせ済みの請求書。無ければ未確認。 */
  matchedInvoiceId: string | null
}

export type Totals = {
  subtotal: number
  /** 税率ごとの内訳（請求書 1 通につき税率ごとに 1 回だけ端数処理する） */
  byRate: { rate: TaxRate; base: number; tax: number }[]
  tax: number
  total: number
}

export type Company = {
  name: string
  zip: string
  address: string
  phone: string
  email: string
  registrationNo: string
  bank: string
}

export type Settings = {
  company: Company
  numberPrefix: string
  rounding: Rounding
  defaultTaxRate: TaxRate
  defaultTerms: ClientTerms
  notify: { onPaid: boolean; onOverdue: boolean; weeklySummary: boolean }
}
