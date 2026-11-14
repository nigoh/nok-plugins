import { defaultSettings, fakeSave, invoices, NOW, ymdOf, type FakeSaveOutcome, type HistoryEntry, type HistoryKind, type Invoice } from '../../data'
import { historyLabel } from '../../parts'

/** この画面で行う操作。窓を開く物と、窓を経ない物（unrecord）。 */
export type Op = 'send' | 'record' | 'void' | 'remove'
export type RecordInput = { paidOn: string; amount: number }
export type Request = { op: 'send' } | { op: 'void' } | { op: 'remove' } | { op: 'record'; input: RecordInput }

const stamp = () => NOW.toISOString()

/** 送るときに付く番号。見本の請求書の最後の番号の次（設定の接頭辞＋年＋4 桁）。 */
export function nextNumber(): string {
  const prefix = `${defaultSettings.numberPrefix}${ymdOf(stamp()).slice(0, 4)}-`
  const last = invoices.reduce((m, i) => (i.number?.startsWith(prefix) ? Math.max(m, Number(i.number.slice(prefix.length))) : m), 0)
  return `${prefix}${String(last + 1).padStart(4, '0')}`
}

const entry = (inv: Invoice, kind: HistoryKind, note?: string): HistoryEntry => ({ id: `${inv.id}-h${inv.history.length + 1}`, at: stamp(), kind, note })

/** 状況の移り変わり（純粋な関数。元の請求書は変えず、新しい請求書を返す）。 */
export const sentOf = (inv: Invoice): Invoice => ({ ...inv, status: 'sent', number: inv.number ?? nextNumber(), history: [...inv.history, entry(inv, 'sent')] })
export const paidOf = (inv: Invoice, paidOn: string): Invoice => ({ ...inv, status: 'paid', paidOn, history: [...inv.history, entry(inv, 'paid')] })
export const voidedOf = (inv: Invoice): Invoice => ({ ...inv, status: 'void', history: [...inv.history, entry(inv, 'voided')] })
/** 入金の記録を取り消す。履歴の記録は消さない（取り消した旨は画面が足す：E-08）。 */
export const unpaidOf = (inv: Invoice): Invoice => ({ ...inv, status: 'sent', paidOn: null })

/** 履歴の 1 行。データの履歴と、画面だけが足す行（入金の記録を取り消した）を同じ形にする。 */
export type HistoryRow = { id: string; at: string; label: string; note?: string }

/** 新しい順の履歴の行。同じ時刻なら、あとから足した行が先。 */
export function historyRows(inv: Invoice, extra: HistoryRow[]): HistoryRow[] {
  const rows: HistoryRow[] = inv.history.map((h) => ({ id: h.id, at: h.at, label: historyLabel[h.kind], note: h.note }))
  return [...rows, ...extra].sort((a, b) => a.at.localeCompare(b.at)).reverse()
}

/** 偽の通信。本物の API に替えるときは、これと同じ形の物を渡す（画面は変えない：変更シナリオ 9）。 */
export type Service = {
  send(inv: Invoice): Promise<Invoice>
  record(inv: Invoice, input: RecordInput): Promise<Invoice>
  unrecord(inv: Invoice): Promise<Invoice>
  voidInvoice(inv: Invoice): Promise<Invoice>
  remove(inv: Invoice): Promise<void>
}

/**
 * 偽の通信。待ち（SAVE_WAIT_MS）と結果は土台の fakeSave が決める。失敗は例外にして、画面の失敗の扱い（窓の中に残す）へ渡す。
 * 本物の API に替えるときは、Service と同じ形の物を渡す（画面は変えない：変更シナリオ）。
 */
export function makeService(outcome: FakeSaveOutcome = 'ok'): Service {
  const run = async <T,>(value: T): Promise<T> => {
    const r = await fakeSave(value, { outcome })
    if (!r.ok) throw new Error(r.reason)
    return r.value
  }
  return {
    send: (inv) => run(sentOf(inv)),
    record: (inv, input) => run(paidOf(inv, input.paidOn)),
    unrecord: (inv) => run(unpaidOf(inv)),
    voidInvoice: (inv) => run(voidedOf(inv)),
    remove: () => run(undefined),
  }
}
