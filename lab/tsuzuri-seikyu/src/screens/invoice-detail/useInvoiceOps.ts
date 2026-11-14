import { useEffect, useRef, useState } from 'react'
import { go } from '../../app/nav'
import { actions } from '../../app/terms'
import { NOW, type Invoice } from '../../data'
import { useToast } from '../../ui'
import { historyRows, type HistoryRow, type Op, type Request, type Service } from './operations'
import { unrecord, windows } from './copy'

export type Pending = Op | 'unrecord'
/** 失敗した操作と、同じ操作での連続の失敗回数（3 回で言い方を足す：E-07）。 */
export type Failure = { op: Pending; count: number }

const FRESH_MS = 1500

/**
 * 操作の状態を 1 か所に持つ：開いている窓・通信中・失敗・直した請求書・足した履歴。
 * 画面は結果を描くだけ。通信は service（偽物でも本物でも同じ形）に任せる。
 * state は見本の見せ方だけに使う（confirming＝送る窓を開く、saving＝記録の窓で通信中のまま、invalid＝記録の窓、save_failed＝記録の窓で失敗の知らせを出したまま）。
 */
export function useInvoiceOps(base: Invoice | null, state: string, service: Service) {
  const toast = useToast()
  const [override, setOverride] = useState<Invoice | null>(null)
  const [extra, setExtra] = useState<HistoryRow[]>([])
  const [openOp, setOpenOp] = useState<Op | null>(state === 'confirming' ? 'send' : state === 'saving' || state === 'invalid' || state === 'save_failed' ? 'record' : null)
  const [pending, setPending] = useState<Pending | null>(state === 'saving' ? 'record' : null)
  const [failure, setFailure] = useState<Failure | null>(state === 'save_failed' ? { op: 'record', count: 1 } : null)
  const [freshId, setFreshId] = useState<string | null>(null)
  const alive = useRef(true)
  const busy = useRef(state === 'saving')
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    if (!freshId) return
    const t = window.setTimeout(() => setFreshId(null), FRESH_MS)
    return () => window.clearTimeout(t)
  }, [freshId])

  const invoice = override ?? base

  const open = (op: Op) => { setFailure(null); setOpenOp(op) }
  const close = () => { if (!busy.current) { setOpenOp(null); setFailure(null) } }

  const settle = (next: Invoice) => {
    setOverride(next)
    setFailure(null)
    setOpenOp(null)
    const last = next.history[next.history.length - 1]
    if (last) setFreshId(last.id)
  }
  const fail = (op: Pending) => setFailure((f) => ({ op, count: f && f.op === op ? f.count + 1 : 1 }))

  const undoRecord = async (inv: Invoice) => {
    if (busy.current) return
    busy.current = true
    setPending('unrecord')
    try {
      const next = await service.unrecord(inv)
      if (!alive.current) return
      const row: HistoryRow = { id: `${inv.id}-unrecord-${extra.length + 1}`, at: NOW.toISOString(), label: unrecord.history }
      setExtra((e) => [...e, row])
      setOverride(next)
      setFailure(null)
      setFreshId(row.id)
      toast.show({ message: unrecord.done, tone: 'ok' })
    } catch {
      if (alive.current) fail('unrecord')
    } finally {
      busy.current = false
      if (alive.current) setPending(null)
    }
  }

  /** 窓の主ボタンから。通信中は 2 回目を受けない。 */
  const run = async (req: Request) => {
    if (!invoice || busy.current) return
    busy.current = true
    setPending(req.op)
    try {
      if (req.op === 'remove') {
        await service.remove(invoice)
        if (!alive.current) return
        toast.show({ message: windows.remove.done, tone: 'ok' })
        go('invoices')
        return
      }
      const next = req.op === 'send' ? await service.send(invoice) : req.op === 'void' ? await service.voidInvoice(invoice) : await service.record(invoice, req.input)
      if (!alive.current) return
      settle(next)
      if (req.op === 'record') toast.show({ message: windows.record.done, tone: 'ok', action: { label: actions.undo, onAction: () => { void undoRecord(next) } } })
      else toast.show({ message: windows[req.op].done, tone: 'ok' })
    } catch {
      if (alive.current) fail(req.op)
    } finally {
      busy.current = false
      if (alive.current) setPending(null)
    }
  }

  return {
    invoice,
    rows: invoice ? historyRows(invoice, extra) : [],
    openOp,
    pending,
    failure,
    freshId,
    open,
    close,
    run,
    undo: () => { if (invoice) void undoRecord(invoice) },
  }
}
