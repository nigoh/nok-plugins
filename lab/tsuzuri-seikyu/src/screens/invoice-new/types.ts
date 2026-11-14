import type { TaxRate } from '../../data'

/** 明細 1 行。入力した文字のまま持つ（数にするのは読むときだけ。欠けを 0 にしない：G-06）。 */
export type LineDraft = { id: string; desc: string; qty: string; unit: string; price: string; tax: TaxRate }

/** 入力した値。日付も入れた文字のまま持つ。dueTouched は支払期限を人が直したか（F-07）。 */
export type FormValues = {
  clientId: string
  issuedOn: string
  dueOn: string
  dueTouched: boolean
  memo: string
  lines: LineDraft[]
}

/** 画面の流れ。真偽値を並べず 1 つの列挙にする（S-07）。 */
export type Flow =
  | { kind: 'editing' }
  | { kind: 'confirm'; failed: boolean }
  | { kind: 'sending' }
  | { kind: 'draftSaving' }

/** 保存の結果。画面は同じ型の関数を受け取るので、本物の通信に替えてもこの型を守れば画面は変わらない（既定は data の fakeSave を包む）。 */
export type SaveResult = { ok: true; id: string } | { ok: false }
export type SaveFn = (kind: 'draft' | 'send') => Promise<SaveResult>

/** 明細の上限（REQ の件数想定）。 */
export const MAX_LINES = 50
/** 金額の上限（円）。 */
export const MAX_AMOUNT = 99999999
/** 数量の上限。 */
export const MAX_QUANTITY = 9999999
