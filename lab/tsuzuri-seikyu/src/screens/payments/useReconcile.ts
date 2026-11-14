import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { actions } from '../../app/terms'
import { clients, fakeSave, outcomeOf } from '../../data'
import { useToast } from '../../ui'
import { type BulkResult, type PaymentsData } from './fixtures'
import { buildPaymentRows, differenceOf, sumAmount, type Row } from './logic'
import { copy } from './copy'

/** 処理中の相手、または確認が失敗した相手。'bulk'＝まとめて確認、'retry'＝失敗した分の再試行、それ以外は入金の id（1 件の確認）。 */
export type Busy = string | null

type Args = {
  data: PaymentsData
  /** 画面の状態名。窓を開いて始める状態（確かめ中・送っている最中）と、処理中のまま止める状態を決める。 */
  state: string
  /** 更新中・古い内容のとき true。古い金額で確定させない（E-04）。 */
  locked: boolean
}

/**
 * 入金の確認の操作と、その結果の持ち場所（画面の中の状態）。
 * 持つ物：確認した入金、チェックを外した入金、選んだ請求書、窓の開閉、処理中の相手、確認の失敗の相手、一部失敗の結果。
 * 持たない物（計算する）：状況・候補・差額・件数・合計（logic.ts）。
 * 確認の送信は data の fakeSave（待ちは 1 つ）。本物にするときは fakeSave を同じ戻り値の送信に替える。
 */
export function useReconcile({ data, state, locked }: Args) {
  const toast = useToast()
  const [matches, setMatches] = useState<Record<string, string>>({})
  const [fees, setFees] = useState<Record<string, number>>({})
  const [unchecked, setUnchecked] = useState<ReadonlySet<string>>(() => new Set())
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [windowOpen, setWindowOpen] = useState(state === 'confirming' || state === 'saving' || state === 'save_failed')
  const [busy, setBusy] = useState<Busy>(state === 'saving' ? 'bulk' : null)
  /** 確認の送信が失敗した相手（save_failed）。押した所の近くに知らせを出し、選んだ内容は残す。 */
  const [failedAt, setFailedAt] = useState<Busy>(state === 'save_failed' ? 'bulk' : null)
  const [result, setResult] = useState<BulkResult | null>(() => data.lastResult ?? null)

  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const { rows, unpaid } = useMemo(() => buildPaymentRows(data.payments, data.invoices, clients, matches), [data, matches])
  const unconfirmed = useMemo(() => rows.filter((r) => r.status !== 'matched'), [rows])
  const confirmed = useMemo(() => rows.filter((r) => r.status === 'matched'), [rows])
  const checked = useMemo(() => unconfirmed.filter((r) => r.sure && !unchecked.has(r.payment.id)), [unconfirmed, unchecked])
  const failures = useMemo(
    () => Object.fromEntries((result?.failed ?? []).filter((f) => !matches[f.paymentId]).map((f) => [f.paymentId, f.reason])),
    [result, matches],
  )

  const choiceOf = (row: Row): string => choices[row.payment.id] ?? row.matched?.invoice.id ?? row.sure?.invoice.id ?? ''
  const choose = (paymentId: string, invoiceId: string) => setChoices((c) => ({ ...c, [paymentId]: invoiceId }))
  const clearChoice = (paymentId: string) => {
    setChoices((c) => Object.fromEntries(Object.entries(c).filter(([id]) => id !== paymentId)))
    setFailedAt((f) => (f === paymentId ? null : f))
  }
  const toggle = (paymentId: string) => setUnchecked((s) => { const n = new Set(s); if (n.has(paymentId)) n.delete(paymentId); else n.add(paymentId); return n })

  const undo = useCallback((ids: string[]) => {
    setMatches((m) => Object.fromEntries(Object.entries(m).filter(([id]) => !ids.includes(id))))
    setFees((f) => Object.fromEntries(Object.entries(f).filter(([id]) => !ids.includes(id))))
    toast.show({ message: copy.undone, tone: 'info' })
  }, [toast])

  const apply = (pairs: Record<string, string>, diffs: Record<string, number>, message: string) => {
    setMatches((m) => ({ ...m, ...pairs }))
    setFees((f) => ({ ...f, ...Object.fromEntries(Object.entries(diffs).filter(([, d]) => d !== 0)) }))
    setBusy(null)
    toast.show({ message, tone: 'ok', action: { label: actions.undo, onAction: () => undo(Object.keys(pairs)) } })
  }

  /** 1 件の確認。after は確認できたあとの片付け（開いたパネルを閉じる）。 */
  const confirmOne = async (row: Row, invoiceId: string, after?: () => void) => {
    if (locked || busy !== null) return
    const inv = [...unpaid, ...(row.matched ? [row.matched.invoice] : [])].find((i) => i.id === invoiceId)
    if (!inv) return
    setBusy(row.payment.id)
    setFailedAt(null)
    const saved = await fakeSave(invoiceId, { outcome: outcomeOf(state) })
    if (!alive.current) return
    if (!saved.ok) { setBusy(null); setFailedAt(row.payment.id); return }
    apply({ [row.payment.id]: invoiceId }, { [row.payment.id]: differenceOf(row.payment, inv) }, copy.confirmedOne)
    after?.()
  }

  /**
   * 複数件を 1 回の送信で確認する（まとめて・失敗分の再試行）。成否は送信全体で 1 つ（fakeSave）。
   * 失敗したら窓も選んだ内容も残して知らせる（save_failed）。件ごとに成否が分かれる一部失敗（partial）は、見本の結果（fixtures の lastResult）で見せる。
   */
  const confirmMany = async (targets: Row[], who: 'bulk' | 'retry') => {
    setBusy(who)
    setFailedAt(null)
    const saved = await fakeSave(targets.map((r) => r.payment.id), { outcome: outcomeOf(state) })
    if (!alive.current) return
    if (!saved.ok) { setBusy(null); setFailedAt(who); return }
    apply(Object.fromEntries(targets.map((r) => [r.payment.id, r.sure?.invoice.id ?? ''])), {}, copy.confirmedMany(targets.length))
    setWindowOpen(false)
    setResult(null)
  }

  /** チェックした入金をまとめて確認する。窓の「入金を確認する」から。 */
  const confirmChecked = () => {
    if (locked || busy !== null || checked.length === 0) return
    void confirmMany(checked, 'bulk')
  }

  /** 一部失敗のあと、失敗した分だけ確認し直す。 */
  const retryFailed = () => {
    if (locked || busy !== null || !result) return
    void confirmMany(unconfirmed.filter((r) => failures[r.payment.id] !== undefined && r.sure), 'retry')
  }

  return {
    rows, unconfirmed, confirmed, unpaid, checked, checkedTotal: sumAmount(checked), failures, result, fees,
    busy, failedAt, windowOpen, openWindow: () => setWindowOpen(true), closeWindow: () => { setWindowOpen(false); setFailedAt((f) => (f === 'bulk' ? null : f)) },
    choiceOf, choose, clearChoice, toggle, confirmOne, confirmChecked, retryFailed,
  }
}
