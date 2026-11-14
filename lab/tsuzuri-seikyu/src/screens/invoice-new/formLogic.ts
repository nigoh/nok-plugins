import { formatDate, TODAY, type Client, type TaxRate } from '../../data'
import { readDate, readQuantity, settleDate, settleYen, wasWidened, type Settled } from '../../lib'
import { dueDateFor } from './dueDate'
import { MAX_AMOUNT, MAX_QUANTITY, type FormValues, type LineDraft } from './types'

export const newLine = (id: string, tax: TaxRate): LineDraft => ({ id, desc: '', qty: '1', unit: '', price: '', tax })

export const patchLine = (v: FormValues, id: string, patch: Partial<LineDraft>): FormValues => ({ ...v, lines: v.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) })

/** 人が支払期限を直していなければ、取引先の支払条件と請求日から入れ直す（F-07）。 */
export function autoDue(v: FormValues, clients: Client[]): FormValues {
  const client = clients.find((c) => c.id === v.clientId)
  const issued = readDate(v.issuedOn, TODAY)
  if (!client || issued.kind !== 'ok' || v.dueTouched) return v
  return { ...v, dueOn: formatDate(dueDateFor(issued.ymd, client.terms)) }
}

/** 離れた時に、読めた日付を「2026年11月13日」に直す（土台の settleDate）。 */
export const tidyDate = (text: string): Settled => settleDate(text, TODAY)

/** 単価は桁区切りに（土台の settleYen）。 */
export const tidyYen = (text: string): Settled => settleYen(text, MAX_AMOUNT)

/** 数量は読めたら数にそろえる。土台に数量の settle が無いので、この画面で読みと知らせの要否だけ組む。 */
export function tidyQuantity(text: string): Settled {
  const r = readQuantity(text, MAX_QUANTITY)
  return r.kind === 'ok' ? { value: String(r.value), adjusted: wasWidened(text) } : { value: text, adjusted: false }
}
