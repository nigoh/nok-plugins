import { formatDate, formatYen } from '../../data'
import { readDate, readYen } from '../../lib'
import { record } from './copy'

/**
 * 入金の記録の欄の検査（form.md F-04）。読みと「そろえる形」は土台の lib/normalize（readDate・readYen・settleDate・settleYen）。
 * ここに残すのは、この窓だけの誤りの文と範囲（請求日から今日まで・請求額と同じ）。
 */
export type RecordValues = { paidOn: string; amount: string }
export type RecordErrors = Partial<Record<keyof RecordValues, string>>
export type RecordContext = { issuedOn: string; today: string; total: number }

/**
 * 1 つの欄の誤り。strict=false は欄を離れた時（形式の誤りだけ。空欄は出さない：F-04）、strict=true は送る時（空欄・範囲・違う額も）。
 * 文は「何が起きたか＋どう直すか」。責めない。
 */
export function checkPaidOn(raw: string, ctx: RecordContext, strict: boolean): string | null {
  const r = readDate(raw, ctx.today)
  if (r.kind === 'empty') return strict ? record.error.paidOnEmpty : null
  if (r.kind === 'bad') return record.error.paidOnBad(formatDate(ctx.today))
  if (strict && (r.ymd < ctx.issuedOn || r.ymd > ctx.today)) return record.error.paidOnRange(formatDate(ctx.issuedOn))
  return null
}

export function checkAmount(raw: string, ctx: RecordContext, strict: boolean): string | null {
  const r = readYen(raw)
  if (r.kind === 'empty') return strict ? record.error.amountEmpty : null
  if (r.kind !== 'ok') return record.error.amountBad
  if (!strict) return null
  if (r.value < 1) return record.error.amountMin
  if (r.value !== ctx.total) return record.error.amountDiff(formatYen(ctx.total))
  return null
}

/** 送る時の検査。誤りのある欄だけ文を持つ。 */
export function validateRecord(values: RecordValues, ctx: RecordContext): RecordErrors {
  const errors: RecordErrors = {}
  const date = checkPaidOn(values.paidOn, ctx, true)
  const amount = checkAmount(values.amount, ctx, true)
  if (date) errors.paidOn = date
  if (amount) errors.amount = amount
  return errors
}
