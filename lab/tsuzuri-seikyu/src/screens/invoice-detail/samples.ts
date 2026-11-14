import { displayStatus, invoices, TODAY, type HistoryEntry, type Invoice, type InvoiceLine } from '../../data'

/**
 * 状態ごとの見本の請求書（?state= で選ぶ）。状況は「データの値」なので、状態名の status_＊ は見本の選び方だけを決める。
 * id は土台の見本データの並びに依る。合わなくなったら述語で探し直す（テストが状況の合致を確かめる）。
 */
const pick = (id: string, ok: (i: Invoice) => boolean): Invoice => invoices.find((i) => i.id === id && ok(i)) ?? invoices.find(ok) ?? invoices[0]
const shows = (status: string) => (i: Invoice) => displayStatus(i, TODAY) === status

const SENT = pick('inv-031', shows('sent'))
const DRAFT = pick('inv-034', shows('draft'))
const OVERDUE = pick('inv-021', shows('overdue'))
const PAID = pick('inv-024', shows('paid'))
const VOID = pick('inv-028', shows('void'))

const NAMES = ['取材・原稿整理', '写真撮影・レタッチ', 'ページ組版', 'イラスト制作', '校正・修正対応', '進行管理', '印刷データ作成']
const UNITS = ['式', 'ページ', '点', '日', '時間']
const LONG_NAME = '北海道中小企業デジタル化推進協議会札幌支部2026年度事業報告書第4章の取材・原稿整理・校正（修正対応を含む）'

/** 明細の上限（50 行）。品名の長さ・税率・単位をばらけさせる。 */
function manyLines(n: number): InvoiceLine[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `many-${i + 1}`,
    description: i === 3 ? LONG_NAME : `${NAMES[i % NAMES.length]}（第${i + 1}章）`,
    quantity: 1 + (i % 4),
    unit: UNITS[i % UNITS.length],
    unitPrice: 3000 + (i % 7) * 2500,
    taxRate: i % 9 === 8 ? 8 : 10,
  }))
}

/** 履歴 8 件（作成→保存 6 回→送付）。 */
function manyHistory(id: string): HistoryEntry[] {
  const day = ['2026-10-29T00:20:00Z', '2026-10-29T06:10:00Z', '2026-10-29T08:40:00Z', '2026-10-30T01:05:00Z', '2026-10-30T05:30:00Z', '2026-10-30T07:55:00Z', '2026-10-31T00:15:00Z', '2026-10-31T01:00:00Z']
  return day.map((at, i) => ({ id: `${id}-h${i + 1}`, at, kind: i === 0 ? 'created' : i === day.length - 1 ? 'sent' : 'saved' }))
}

let many: Invoice | null = null
/** 多すぎる：明細 50 行・取引先名 60 字超（c14）・履歴 8 件・長いメモ。 */
export function manyInvoice(): Invoice {
  if (many) return many
  const base = pick('inv-026', (i) => i.clientId === 'c14')
  many = {
    ...base,
    id: 'inv-many',
    lines: manyLines(50),
    history: manyHistory('inv-many'),
    memo: '2026年度の事業報告書の制作費です。校正の回数が多かったため、修正対応を明細に分けています。お支払いは期限までにお願いします。',
  }
  return many
}

/** ?state= から見本の請求書を選ぶ。null は見つからない。 */
export function sampleFor(state: string): Invoice | null {
  switch (state) {
    case 'status_draft':
    case 'confirming':
      return DRAFT
    case 'status_overdue':
      return OVERDUE
    case 'status_paid':
      return PAID
    case 'status_void':
      return VOID
    case 'many':
      return manyInvoice()
    case 'not_found':
      return null
    default:
      return SENT
  }
}

/** 対象の請求書。?id= は default のときだけ効く（ほかの状態は見本を見せる）。存在しない id は null＝見つからない。 */
export function resolveInvoice(state: string, id: string | null): Invoice | null {
  if (state === 'default' && id) return invoices.find((i) => i.id === id) ?? null
  return sampleFor(state)
}
