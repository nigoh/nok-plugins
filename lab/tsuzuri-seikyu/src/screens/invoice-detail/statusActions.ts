import { actions } from '../../app/terms'
import type { InvoiceDisplayStatus } from '../../data'
import { invoiceFlow } from '../../parts'

/**
 * 状況ごとの操作の表（1 か所）。状況を足す・操作を替えるときはここの 1 行を直す（変更シナリオ 1・8）。
 * - primary：見出しの右（スマホは下に固定）の主ボタンが開く窓。null なら主ボタンを置かない（主操作が無い画面には塗りを置かない：D-04）。
 * - other：「ほかの操作」の 1 つ。取り返しがつかない物（void・remove）は danger、戻せる物（unrecord）はふつうのボタン。
 * - step：状況の流れの現在地（1 から）。null は流れの外（取り消し済み）。流れの全部が済んだら段の数＋1。
 */
export type Plan = {
  step: number | null
  primary: 'send' | 'record' | null
  other: 'remove' | 'void' | 'unrecord' | null
  editLink: boolean
  paymentsLink: boolean
}

const at = (s: 'draft' | 'sent' | 'paid') => invoiceFlow.indexOf(s) + 1

export const planOf: Record<InvoiceDisplayStatus, Plan> = {
  draft: { step: at('draft'), primary: 'send', other: 'remove', editLink: true, paymentsLink: false },
  sent: { step: at('sent'), primary: 'record', other: 'void', editLink: false, paymentsLink: true },
  overdue: { step: at('sent'), primary: 'record', other: 'void', editLink: false, paymentsLink: true },
  paid: { step: invoiceFlow.length + 1, primary: null, other: 'unrecord', editLink: false, paymentsLink: false },
  void: { step: null, primary: null, other: null, editLink: false, paymentsLink: false },
}

/** 主ボタンの文言（terms の actions から引く）。 */
export const primaryLabel = { send: actions.sendInvoice, record: actions.recordPayment } as const
