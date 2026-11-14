import { calcTotals, formatNumber, type InvoiceLine, type Rounding } from '../../data'
import { fact, roundingName } from './copy'
import { Facts, type Fact } from './Facts'

/** 合計の内訳。全明細（ページに関係なく）から計算する。税は税率ごとに 1 回だけ端数処理する。 */
export function Totals({ lines, rounding }: { lines: InvoiceLine[]; rounding: Rounding }) {
  const t = calcTotals(lines, rounding)
  const yen = (n: number) => `${formatNumber(n)}円`
  const items: Fact[] = [{ label: fact.subtotal, value: yen(t.subtotal) }]
  for (const r of t.byRate) {
    items.push({ label: fact.base(r.rate), value: yen(r.base) })
    items.push({ label: fact.tax(r.rate), value: yen(r.tax) })
  }
  items.push({ label: fact.total, value: yen(t.total), strong: true, rule: true })
  return (
    <div className="flex flex-col gap-2 md:ml-auto md:w-96">
      <Facts items={items} layout="split" />
      <p className="text-body text-muted">{fact.rule(roundingName[rounding])}</p>
    </div>
  )
}
