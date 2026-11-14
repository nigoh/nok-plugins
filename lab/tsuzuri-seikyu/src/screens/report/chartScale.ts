import { formatNumber } from '../../data'

/** 図の目盛りと月の名前の間引き（純粋な関数）。 */

/** この額（円）以上なら軸を万円にする（G-05）。 */
export const MAN_FROM = 1_000_000
/** 月の名前 1 つに要る幅（px）。1 か月の幅がこれ未満なら 1 つおきに出す（G-08・D-13）。 */
export const LABEL_MIN = 40

export type Axis = {
  unit: 1 | 10000
  unitLabel: '円' | '万円'
  /** 単位に直した目盛り（0 から） */
  ticks: number[]
  /** 軸の上端（単位に直した値）。0 のときは図に棒が無い */
  top: number
  /** 「200万円」「40,000円」。縦軸が変わった文に使う */
  label: string
}

/** 目盛り 3〜6 本、刻みは 1・2・5 の 10 のべき、上端は最大値の次の刻み（G-08）。 */
export function axisFor(values: number[]): Axis {
  const max = values.reduce((m, v) => (v > m ? v : m), 0)
  if (max === 0) return { unit: 1, unitLabel: '円', ticks: [0], top: 0, label: '0円' }
  const unit = max >= MAN_FROM ? 10000 : 1
  const unitLabel = unit === 1 ? '円' : '万円'
  const maxU = max / unit
  for (const p of [1, 10, 100, 1000, 10000, 100000]) {
    for (const m of [1, 2, 5]) {
      const step = m * p
      const count = Math.ceil(maxU / step)
      if (count <= 5) {
        const ticks = Array.from({ length: count + 1 }, (_, i) => i * step)
        const top = count * step
        return { unit, unitLabel, ticks, top, label: `${formatNumber(top)}${unitLabel}` }
      }
    }
  }
  const top = Math.ceil(maxU)
  return { unit, unitLabel, ticks: [0, top], top, label: `${formatNumber(top)}${unitLabel}` }
}

/** 名前を出す月の位置。最後の月を基準に 1 つおき、最初の月は必ず出す（G-08）。 */
export function labelIndexes(n: number, slot: number): number[] {
  if (n <= 0) return []
  const step = Math.max(1, Math.ceil(LABEL_MIN / slot))
  const idx: number[] = []
  for (let i = n - 1; i >= 0; i -= step) idx.push(i)
  idx.reverse()
  if (idx[0] !== 0) {
    if (idx[0] >= step) idx.unshift(0)
    else idx[0] = 0
  }
  return idx
}
