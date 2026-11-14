import { messages } from '../../app/terms'
import { checkEach, toHalf, toHalfDigits, toKatakana, wasWidened } from '../../lib'
import { copy } from './copy'
import { contactId, NAME_MAX, orderedIds, readField, writeField, ids, type Errors, type FormValues } from './model'
import { digitsOf } from './zip'

/** 検査とそろえ（純粋な関数）。誤りは「何が起きたか＋どう直すか」の文（copy.error）。 */

/** ふりがな：全角・半角カナも受け、空白を除いてカタカナにそろえる（lib の toHalf・toKatakana）。 */
const katakanaOf = (raw: string) => toKatakana(toHalf(raw).replace(/[\s\u3000]/g, ''))

export type Normalized = { value: string; note?: string }

/** 欄を離れた時に黙って直す物と、直したことを知らせる文（F-06）。意味が変わらない直しだけ。 */
export function normalizeField(id: string, raw: string): Normalized {
  if (id === ids.zip) {
    const n = toHalfDigits(raw)
    const d = digitsOf(n)
    const value = /^[\d-]+$/.test(n) && d.length === 7 ? `${d.slice(0, 3)}-${d.slice(3)}` : n
    return { value, note: wasWidened(raw) ? messages.widened : undefined }
  }
  if (id === ids.kana) {
    const value = katakanaOf(raw)
    return { value, note: value !== raw && raw.trim() !== '' && /[\u3041-\u3096\uff66-\uff9f]/.test(raw) ? copy.note.kana : undefined }
  }
  if (/^cf-c\d+-phone$/.test(id)) {
    return { value: toHalfDigits(raw), note: wasWidened(raw) ? messages.widened : undefined }
  }
  if (/^cf-c\d+-email$/.test(id)) {
    return { value: toHalf(raw).trim(), note: wasWidened(raw) ? messages.widened : undefined }
  }
  return { value: raw }
}

const mailForm = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 1 つの欄の誤り。final=false は欄を離れた時（空の必須は叱らない）、true は送る時。
 * 誤りが無ければ null。
 */
export function fieldError(v: FormValues, id: string, final: boolean): string | null {
  const value = readField(v, id)
  if (id === ids.name) {
    const s = value.trim()
    if (s === '') return final ? copy.error.nameEmpty : null
    return [...s].length > NAME_MAX ? copy.error.nameLong : null
  }
  if (id === ids.kana) return katakanaOf(value) === '' || /^[\u30a0-\u30ff]+$/.test(katakanaOf(value)) ? null : copy.error.kana
  if (id === ids.zip) {
    const n = toHalfDigits(value)
    return n === '' || (/^[\d-]+$/.test(n) && digitsOf(n).length === 7) ? null : copy.error.zip
  }
  if (id === ids.payDay) return termsError(v)
  if (id === contactId(0, 'email') || /^cf-c\d+-email$/.test(id)) {
    const s = toHalf(value).trim()
    if (s === '') return id === contactId(0, 'email') && final ? copy.error.mailEmpty : null
    return mailForm.test(s) ? null : copy.error.mail
  }
  if (/^cf-c\d+-phone$/.test(id)) {
    const n = toHalfDigits(value)
    if (n === '') return null
    const d = digitsOf(n)
    return /^[\d-]+$/.test(n) && d.length >= 10 && d.length <= 11 ? null : copy.error.phone
  }
  return null
}

/** 当月払いで、支払期限が締め日以前になる（月末締めの当月払いも含む）。欄どうしの誤り。 */
export function termsError(v: FormValues): string | null {
  if (v.payMonths !== '0') return null
  if (v.closing === 'end') return copy.error.terms
  if (v.payDay === 'end') return null
  return Number(v.payDay) <= Number(v.closing) ? copy.error.terms : null
}

/** 送るときの全欄の誤り（欄の id → 文）。 */
export function validateClientForm(v: FormValues): Errors {
  return checkEach(orderedIds(v), (id) => fieldError(v, id, true)) as Errors
}

/** 送るとき、そろえる物を全部そろえる。 */
export function normalizeClientForm(v: FormValues): FormValues {
  return orderedIds(v).reduce((acc, id) => {
    const raw = readField(acc, id)
    const { value } = normalizeField(id, raw)
    return value === raw ? acc : writeField(acc, id, value)
  }, v)
}
