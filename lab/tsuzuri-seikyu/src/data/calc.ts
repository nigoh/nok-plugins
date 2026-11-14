import type { InvoiceLine, Rounding, TaxRate, Totals } from './types'

const round = (n: number, how: Rounding) => (how === 'floor' ? Math.floor(n) : how === 'ceil' ? Math.ceil(n) : Math.round(n))

/** 1 行の税抜金額（円）。数量が小数でも円で止める。 */
export function lineAmount(l: Pick<InvoiceLine, 'quantity' | 'unitPrice'>): number {
  return Math.floor(l.quantity * l.unitPrice)
}

/** 合計の自動計算。税は税率ごとの小計に 1 回だけ端数処理する（インボイスの決まり）。 */
export function calcTotals(lines: Pick<InvoiceLine, 'quantity' | 'unitPrice' | 'taxRate'>[], rounding: Rounding): Totals {
  const rates: TaxRate[] = [10, 8]
  const byRate = rates
    .map((rate) => {
      const base = lines.filter((l) => l.taxRate === rate).reduce((s, l) => s + lineAmount(l), 0)
      return { rate, base, tax: round((base * rate) / 100, rounding) }
    })
    .filter((r) => r.base > 0)
  const subtotal = byRate.reduce((s, r) => s + r.base, 0)
  const tax = byRate.reduce((s, r) => s + r.tax, 0)
  return { subtotal, byRate, tax, total: subtotal + tax }
}
