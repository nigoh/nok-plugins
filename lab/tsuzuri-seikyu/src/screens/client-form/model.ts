import type { Client, ClientTerms, Contact } from '../../data'
import { splitAddress } from './zip'

export const MAX_CONTACTS = 5
export const NAME_MAX = 60

export type ContactValues = { key: number; name: string; section: string; email: string; phone: string }
/** 入力中の値。選択は文字（'end' か日付の数字、'0'〜'2'）で持ち、保存のときだけ数に直す。 */
export type FormValues = {
  name: string
  kana: string
  zip: string
  address: string
  street: string
  closing: string
  payMonths: string
  payDay: string
  contacts: ContactValues[]
}

/** 郵便番号の補完の結果。同時に 1 つしか成り立たない（T-7）。 */
export type ZipState =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'filled' }
  | { kind: 'kept' }
  | { kind: 'many'; options: string[]; chosen: string | null }
  | { kind: 'empty' }
  | { kind: 'error' }

/** 欄の id → 誤りの文。 */
export type Errors = Record<string, string>

/** 日の選択肢（締め日と支払日で同じ定義を引く）。 */
const DAY_VALUES = ['end', '5', '10', '15', '20', '25']
export const dayLabel = (v: string) => (v === 'end' ? '月末' : `${v}日`)
/** 保存された値が選択肢に無いとき（設定で 3 日など）も、その値を選べる形で残す。 */
export function dayOptions(current: string) {
  const values = DAY_VALUES.includes(current) ? DAY_VALUES : [...DAY_VALUES, current]
  return values.map((v) => ({ value: v, label: dayLabel(v) }))
}
export const monthOptions = [
  { value: '0', label: '当月' },
  { value: '1', label: '翌月' },
  { value: '2', label: '翌々月' },
]

let seq = 0
const nextKey = () => (seq += 1)
export const blankContact = (): ContactValues => ({ key: nextKey(), name: '', section: '', email: '', phone: '' })

export function termsValues(t: ClientTerms) {
  return { closing: String(t.closingDay), payMonths: String(t.payMonthsLater), payDay: String(t.payDay) }
}

export const blankClientValues = (defaults: ClientTerms): FormValues => ({
  name: '', kana: '', zip: '', address: '', street: '', ...termsValues(defaults), contacts: [blankContact()],
})

/** 保存された取引先 → 入力値。保存された締め日・支払期限は標準の条件で書き換えない（F-11）。 */
export function toValues(client: Client): FormValues {
  const { address, street } = splitAddress(client.zip, client.address)
  return {
    name: client.name, kana: client.kana, zip: client.zip, address, street, ...termsValues(client.terms),
    contacts: (client.contacts.length > 0 ? client.contacts : [{ name: '', email: '' } as Contact]).map((c) => ({
      key: nextKey(), name: c.name, section: c.section ?? '', email: c.email, phone: c.phone ?? '',
    })),
  }
}

const dayNumber = (v: string): 'end' | number => (v === 'end' ? 'end' : Number(v))

export function termsOf(v: FormValues): ClientTerms {
  return { closingDay: dayNumber(v.closing), payMonthsLater: Number(v.payMonths) as ClientTerms['payMonthsLater'], payDay: dayNumber(v.payDay) }
}

/** 入力値 → 取引先。空の担当者の行は落とす。 */
export function toClient(v: FormValues, id: string): Client {
  const contacts = v.contacts
    .filter((c) => [c.name, c.section, c.email, c.phone].some((x) => x.trim() !== ''))
    .map((c): Contact => ({ name: c.name.trim(), section: c.section.trim() || undefined, email: c.email.trim(), phone: c.phone.trim() || undefined }))
  return { id, name: v.name.trim(), kana: v.kana, zip: v.zip, address: `${v.address.trim()}${v.street.trim()}`, terms: termsOf(v), contacts }
}

/** 変わったかを比べる文字列（行の key は含めない）。未保存かどうかは持たずに計算する（S-07）。 */
export const signature = (v: FormValues) =>
  JSON.stringify([v.name, v.kana, v.zip, v.address, v.street, v.closing, v.payMonths, v.payDay, v.contacts.map((c) => [c.name, c.section, c.email, c.phone])])

/** 欄の数（必須と任意の印を決める数。F-03）。担当者の行ごとに 4 欄。 */
export const clientFieldCount = (v: FormValues) => 7 + 4 * v.contacts.length
export const REQUIRED_COUNT = 2

export const ids = {
  name: 'cf-name', kana: 'cf-kana', zip: 'cf-zip', address: 'cf-address', street: 'cf-street',
  closing: 'cf-closing', payMonths: 'cf-paymonths', payDay: 'cf-payday', addContact: 'cf-add-contact',
} as const
export type ContactField = 'name' | 'section' | 'email' | 'phone'
export const contactId = (i: number, f: ContactField) => `cf-c${i}-${f}`
const contactRe = /^cf-c(\d+)-(name|section|email|phone)$/

/** 画面の上から下の順の欄の id（誤りの一覧の並び）。 */
export function orderedIds(v: FormValues): string[] {
  return [
    ids.name, ids.kana, ids.zip, ids.address, ids.street, ids.closing, ids.payDay,
    ...v.contacts.flatMap((_, i) => (['name', 'section', 'email', 'phone'] as const).map((f) => contactId(i, f))),
  ]
}

export function readField(v: FormValues, id: string): string {
  const m = contactRe.exec(id)
  if (m) return v.contacts[Number(m[1])]?.[m[2] as ContactField] ?? ''
  switch (id) {
    case ids.name: return v.name
    case ids.kana: return v.kana
    case ids.zip: return v.zip
    case ids.address: return v.address
    case ids.street: return v.street
    case ids.closing: return v.closing
    case ids.payMonths: return v.payMonths
    case ids.payDay: return v.payDay
    default: return ''
  }
}

export function writeField(v: FormValues, id: string, value: string): FormValues {
  const m = contactRe.exec(id)
  if (m) {
    const i = Number(m[1])
    return { ...v, contacts: v.contacts.map((c, j) => (j === i ? { ...c, [m[2]]: value } : c)) }
  }
  switch (id) {
    case ids.name: return { ...v, name: value }
    case ids.kana: return { ...v, kana: value }
    case ids.zip: return { ...v, zip: value }
    case ids.address: return { ...v, address: value }
    case ids.street: return { ...v, street: value }
    case ids.closing: return { ...v, closing: value }
    case ids.payMonths: return { ...v, payMonths: value }
    case ids.payDay: return { ...v, payDay: value }
    default: return v
  }
}
