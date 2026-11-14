import { markFor, type FieldMark } from '../../ui'

/** 入力画面の form の id。主ボタン（type=submit）が form 属性で結ぶ。 */
export const FORM_ID = 'invoice-new-form'

/**
 * 欄の表（必須か）。必須と任意の印の数え方はここ 1 か所（F-03）。
 * 税率は初期値が常に入っているので数えない。
 */
const required = { client: true, issued: true, due: true, memo: false, desc: true, qty: true, unit: false, price: true } as const
export type FieldKey = keyof typeof required
const count = { required: Object.values(required).filter(Boolean).length, total: Object.keys(required).length }

/** その欄に付ける印（必須・任意・なし）。 */
export const markOf = (key: FieldKey): FieldMark => markFor(required[key], count)
export const isRequired = (key: FieldKey): boolean => required[key]

/** 欄の id。まとめの一覧のリンク先になる。明細は行の id を含める。 */
export const ids = { client: 'inv-client', issued: 'inv-issued', due: 'inv-due', memo: 'inv-memo', total: 'inv-total' } as const
export const lineIds = (lineId: string) => ({
  desc: `line-${lineId}-desc`,
  qty: `line-${lineId}-qty`,
  unit: `line-${lineId}-unit`,
  price: `line-${lineId}-price`,
})
