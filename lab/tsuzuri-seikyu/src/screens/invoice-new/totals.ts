import { calcTotals, lineAmount, type Rounding, type Totals } from '../../data'
import { readQuantity, readYen } from '../../lib'
import { MAX_AMOUNT, MAX_QUANTITY, type LineDraft } from './types'

/** 1 行の金額（税抜）。数量か単価が揃わなければ null（0 にしない）。 */
export function amountOf(l: LineDraft): number | null {
  const q = readQuantity(l.qty, MAX_QUANTITY)
  const p = readYen(l.price, MAX_AMOUNT)
  return q.kind === 'ok' && p.kind === 'ok' ? lineAmount({ quantity: q.value, unitPrice: p.value }) : null
}

/** まだ何も入れていない行（品名も単価も空）。 */
export const isBlank = (l: LineDraft): boolean => l.desc.trim() === '' && l.price.trim() === ''

export type Summary = {
  amounts: (number | null)[]
  /** 計算できる行が 1 つも無ければ null（0 にしない）。 */
  totals: Totals | null
  /** 入れかけで金額が揃わない行の数。合計に入っていない。 */
  incomplete: number
}

export function summarize(lines: LineDraft[], rounding: Rounding): Summary {
  const amounts = lines.map(amountOf)
  const done = lines.flatMap((l) => {
    const q = readQuantity(l.qty, MAX_QUANTITY)
    const p = readYen(l.price, MAX_AMOUNT)
    return q.kind === 'ok' && p.kind === 'ok' ? [{ quantity: q.value, unitPrice: p.value, taxRate: l.tax }] : []
  })
  return {
    amounts,
    totals: done.length > 0 ? calcTotals(done, rounding) : null,
    incomplete: lines.filter((l, i) => !isBlank(l) && amounts[i] === null).length,
  }
}
