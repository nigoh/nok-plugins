import { clients, invoices, makeManyInvoices, payments, TODAY, type Client, type Invoice, type Payment } from '../../data'
import type { HomeData } from './summary'

/**
 * 状態ごとの確かめ用データ（この画面の中だけ。土台の見本は書き換えない）。
 * - default：土台の見本そのまま（期限超過 3・未確認の入金 6・下書き 2）。
 * - todo_empty：期限超過を入金済みに、未確認の入金を確認済みに、下書きを外した見本（今日やることが 0 件）。
 * - many：請求書 250 件超、未確認の入金 126 件、期限超過は 3 けた。取引先名は最長の 60 字。
 */

/** 取引先名の最長（60 字）。requirements.md R-03 の上限どおり。 */
export const LONGEST_CLIENT_NAME = '一般社団法人北海道中小企業デジタル化推進協議会札幌支部事務局運営委員会特別事業部門連絡調整室北海道内市町村担当者連絡会議'

const cache = new Map<string, HomeData>()

function todoEmpty(): HomeData {
  const firstId = invoices[0].id
  return {
    clients,
    invoices: invoices
      .filter((i) => i.status !== 'draft')
      .map((i): Invoice => (i.status === 'sent' && i.dueOn < TODAY ? { ...i, status: 'paid', paidOn: TODAY } : i)),
    payments: payments.map((p): Payment => (p.matchedInvoiceId ? p : { ...p, matchedInvoiceId: firstId })),
  }
}

function many(): HomeData {
  const longClient: Client = { ...clients[0], id: 'c99', name: LONGEST_CLIENT_NAME, kana: 'イッパンシャダンホッカイドウ' }
  const base = invoices[invoices.length - 6]
  const longInvoice: Invoice = {
    ...base, id: 'inv-long', number: 'INV-2026-9999', clientId: longClient.id, status: 'sent', issuedOn: TODAY, dueOn: '2026-12-10', paidOn: null,
    history: [{ id: 'inv-long-h1', at: '2026-11-13T00:25:00Z', kind: 'sent' }],
  }
  const unmatched: Payment[] = Array.from({ length: 120 }, (_, i) => ({
    id: `pay-m${i + 1}`, receivedOn: i % 2 === 0 ? '2026-10-09' : '2026-11-05', payerName: `ヤマダ タロウ${i + 1}`, amount: 33000 + i * 100, matchedInvoiceId: null,
  }))
  return {
    clients: [...clients, longClient],
    // 請求日が今日より先の請求書は、まだ存在しないので外す
    invoices: [...invoices, ...makeManyInvoices(240).filter((i) => i.issuedOn <= TODAY), longInvoice],
    payments: [...payments, ...unmatched],
  }
}

/** useFake の make。毎回の描画で呼ばれるので、状態ごとに 1 度だけ作る。 */
export function homeSample(state: string): HomeData {
  const hit = cache.get(state)
  if (hit) return hit
  const data = state === 'todo_empty' ? todoEmpty() : state === 'many' ? many() : { clients, invoices, payments }
  cache.set(state, data)
  return data
}
