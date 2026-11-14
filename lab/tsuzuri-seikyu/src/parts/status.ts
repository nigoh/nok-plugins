import type { HistoryKind, InvoiceDisplayStatus, InvoiceStatus, PaymentDisplayStatus } from '../data'
import type { StatusTone, TagDensity } from '../ui'

/**
 * 状況の呼び名と札の調子の正本（screens.yaml の terms と同じ内容）。
 * 状況を足す・呼び名を変えるときは、ここ 1 か所と terms を直す。
 */
export const invoiceStatusDef: Record<InvoiceDisplayStatus, { label: string; tone: StatusTone }> = {
  draft: { label: '下書き', tone: 'draft' },
  sent: { label: '送付済み', tone: 'progress' },
  paid: { label: '入金済み', tone: 'done' },
  overdue: { label: '期限超過', tone: 'wait' },
  void: { label: '取り消し済み', tone: 'calm' },
}

export const paymentStatusDef: Record<PaymentDisplayStatus, { label: string; tone: StatusTone }> = {
  unmatched: { label: '未確認', tone: 'wait' },
  matched: { label: '確認済み', tone: 'done' },
  diff: { label: '差額あり', tone: 'wait' },
}

/** 請求書の状況の流れ（下書き→送付済み→入金済み）。取り消しは流れの外。 */
export const invoiceFlow: InvoiceStatus[] = ['draft', 'sent', 'paid']

/** 履歴の 1 行。起きたことを言う。 */
export const historyLabel: Record<HistoryKind, string> = {
  created: '請求書を作りました',
  saved: '下書きを保存しました',
  sent: '請求書を送りました',
  paid: '入金を記録しました',
  voided: '請求書を取り消しました',
}

/**
 * 見えている札の並びから、調子ごとの札の見え方を決める（color-state.md C-08）。画面は、いま見えている行の調子を全部渡す。
 * - 5 枚以下：すべて通常の札。
 * - 1 つの調子が 80% 以上（6 枚以上）：多数派を静かな札に、少数派だけ通常の札で目立たせる。
 * - 6〜9 枚：通常の札。太字は wait と fail だけ、ほかは太さ 400（plain）。
 * - 10 枚以上：wait と fail は通常の札、ほかは静かな札（地なし。絵と言葉は残す）。
 * 「状況 1 つで絞り込み中」は全行が同じ調子なので、状況の列を外すか、全部が静かな札になる。
 */
export function tagDensityOf(visible: StatusTone[]): (tone: StatusTone) => TagDensity {
  const n = visible.length
  if (n <= 5) return () => 'normal'
  const count = new Map<StatusTone, number>()
  for (const t of visible) count.set(t, (count.get(t) ?? 0) + 1)
  const major = [...count.entries()].find(([, c]) => c / n >= 0.8)?.[0]
  if (major) return (tone) => (tone === major ? 'quiet' : 'normal')
  const attention = (tone: StatusTone) => tone === 'wait' || tone === 'fail'
  if (n >= 10) return (tone) => (attention(tone) ? 'normal' : 'quiet')
  return (tone) => (attention(tone) ? 'normal' : 'plain')
}
