import { calcTotals, MISSING, type Settings } from '../../data'
import { checkEach, checkRule, toHalf, toHalfDigits, wasWidened, type FieldRule } from '../../lib'
import { FIELD, FIELDS, NOTIFY_OPTIONS, PREFIX_MAX, ROUNDING_OPTIONS, type TabId } from './fields'
import type { Errors, TextKey, Values } from './types'

/** 設定（保存される形）→ 画面の入力の形。Company の欄が増えても、ここは変えない。 */
export function fromSettings(s: Settings): Values {
  return { ...s.company, numberPrefix: s.numberPrefix, rounding: s.rounding, ...s.notify }
}

const keysOf = (v: Values) => Object.keys(v) as (keyof Values)[]
export const sameValues = (a: Values, b: Values) => keysOf(a).every((k) => a[k] === b[k])

/* ---- 正規化（F-06）：受ける側が合わせる。意味が変わる直しはしない ---- */

/** 全角などを半角へ直す欄（直したときだけ「半角にそろえました」）。欄ごとの規則（郵便番号の形・登録番号の T・大文字）は下の normalize に残す。 */
const WIDE_TARGETS: readonly TextKey[] = ['zip', 'phone', 'email', 'registrationNo', 'numberPrefix']

export function normalize(key: TextKey, raw: string): string {
  const v = raw.trim()
  switch (key) {
    case 'zip': {
      const d = toHalfDigits(v).replace(/-/g, '')
      return /^\d{7}$/.test(d) ? `${d.slice(0, 3)}-${d.slice(3)}` : toHalfDigits(v)
    }
    case 'phone': return toHalfDigits(v)
    case 'email': return toHalf(v).replace(/\s/g, '')
    case 'registrationNo': return toHalfDigits(v).toUpperCase().replace(/-/g, '')
    case 'numberPrefix': return toHalf(v)
    default: return v
  }
}

/** 全角などを半角へ直したか（lib の wasWidened）。直したときだけ「半角にそろえました」を言う。 */
export const widenedKey = (key: TextKey, raw: string) => WIDE_TARGETS.includes(key) && wasWidened(raw)

/** 保存する時：欄ごとに正規化した値をまとめて返す。 */
export function normalizeSettings(values: Values): Values {
  const out = { ...values }
  for (const f of FIELDS) out[f.key] = normalize(f.key, values[f.key])
  return out
}

/* ---- 検査（F-04）：形式は離れた時、空欄は保存する時 ---- */

const FORMAT: Partial<Record<TextKey, (v: string) => boolean>> = {
  zip: (v) => /^\d{3}-\d{4}$/.test(v),
  phone: (v) => /^[0-9-]+$/.test(v) && [10, 11].includes(v.replace(/\D/g, '').length),
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  registrationNo: (v) => /^T\d{13}$/.test(v),
  numberPrefix: (v) => new RegExp(`^[A-Za-z0-9-]{1,${PREFIX_MAX}}$`).test(v),
}

/** 欄の表（FIELDS）と形の検査（FORMAT）から、lib の検査の骨に渡す 1 欄ぶんの定義を作る。形の検査は正規化したあとの値で見る。 */
export function ruleOf(key: TextKey): FieldRule {
  const f = FIELD[key]
  return { key, required: f.required, empty: f.empty, bad: f.invalid, valid: FORMAT[key] }
}

/** 保存する時の全部の検査。空の必須と、形の誤り（回し方と空・形の判定は lib の checkEach・checkRule）。 */
export function validateSettings(values: Values): Errors {
  return checkEach(FIELDS.map((f) => f.key), (key) => checkRule(ruleOf(key), values[key]))
}

/** 誤りのある最初の区分（フォーカスを移す先）。 */
export function firstErrorTab(errors: Errors): TabId | null {
  return FIELDS.find((f) => errors[f.key])?.tab ?? null
}

/* ---- 番号と端数の例（G-05：計算は calcTotals から） ---- */

/** 次に送る請求書の番号の例。今年すでに付いた数＋1 を 4 桁の連番にする。 */
export const numberExample = (prefix: string, issuedThisYear: number, today: string) =>
  `${prefix}${today.slice(0, 4)}-${String(issuedThisYear + 1).padStart(4, '0')}`

const EXAMPLE_BASE = 1005
/** 税抜 1,005 円・10%（100.5 円）を、端数処理ごとに計算した消費税。 */
export function roundingExamples(): { label: string; tax: number }[] {
  return ROUNDING_OPTIONS.map((o) => ({
    label: o.label,
    tax: calcTotals([{ quantity: 1, unitPrice: EXAMPLE_BASE, taxRate: 10 }], o.value).tax,
  }))
}
export const ROUNDING_EXAMPLE_BASE = EXAMPLE_BASE

/* ---- 同時に編集（E-09） ---- */

const changed = (a: Values, b: Values, k: keyof Values) => a[k] !== b[k]

/** 自分も相手も変えて、しかも値が違う項目（人が選ぶ物）。 */
export function overlapKeys(base: Values, mine: Values, theirs: Values): (keyof Values)[] {
  return keysOf(base).filter((k) => changed(base, mine, k) && changed(base, theirs, k) && changed(mine, theirs, k))
}

/** 自分が変えた項目は自分の値、変えていない項目は相手の値。重ならない更新を黙って取り込む形。 */
export function mergeKeepingMine(base: Values, mine: Values, theirs: Values): Values {
  const out = { ...theirs }
  for (const k of keysOf(base)) if (changed(base, mine, k)) Object.assign(out, { [k]: mine[k] })
  return out
}

export function valueLabel(key: keyof Values): string {
  if (key === 'rounding') return '税の端数処理'
  const notify = NOTIFY_OPTIONS.find((o) => o.key === key)
  return notify ? notify.label : FIELD[key as TextKey].label
}

/** 食い違いの表に出す値。空は「—」（0 ではない）、チェックは「知らせる／知らせない」。 */
export function describeValue(key: keyof Values, v: Values): string {
  const x = v[key]
  if (key === 'rounding') return ROUNDING_OPTIONS.find((o) => o.value === v.rounding)?.label ?? MISSING
  if (typeof x === 'boolean') return x ? '知らせる' : '知らせない'
  return x === '' ? MISSING : String(x)
}
