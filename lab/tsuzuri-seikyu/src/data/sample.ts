import { addMonths, lastDayOf, pad } from '../lib'
import { calcTotals } from './calc'
import type { Client, ClientTerms, HistoryEntry, Invoice, InvoiceLine, InvoiceStatus, Payment, Rounding, Settings, TaxRate } from './types'

/** 見本データ。社名・人名・住所はすべて架空。件数は一覧が成り立つ量（請求書 34 件、取引先 14 件、入金 12 件）。 */

const T_END_NEXT: ClientTerms = { closingDay: 'end', payMonthsLater: 1, payDay: 'end' }
const T_20_NEXT: ClientTerms = { closingDay: 20, payMonthsLater: 1, payDay: 'end' }
const T_END_2: ClientTerms = { closingDay: 'end', payMonthsLater: 2, payDay: 10 }

export const clients: Client[] = [
  { id: 'c01', name: '株式会社北斗印刷', kana: 'ホクトインサツ', zip: '060-0042', address: '北海道札幌市中央区大通西5丁目8-3 北斗ビル4階', terms: T_END_NEXT, contacts: [{ name: '佐藤 健一', section: '営業部', email: 'k.sato@hokuto-print.example.jp', phone: '011-555-0101' }] },
  { id: 'c02', name: '有限会社みどり園芸', kana: 'ミドリエンゲイ', zip: '065-0013', address: '北海道札幌市東区北13条東7丁目2-15', terms: T_END_NEXT, contacts: [{ name: '高橋 美咲', email: 'takahashi@midori-engei.example.jp', phone: '011-555-0102' }] },
  { id: 'c03', name: '合同会社ソラノ設計', kana: 'ソラノセッケイ', zip: '060-0061', address: '北海道札幌市中央区南1条西10丁目 ソラノビル2階', terms: T_20_NEXT, contacts: [{ name: '伊藤 大地', section: '代表', email: 'ito@solano-design.example.jp' }, { name: '中村 彩', section: '経理', email: 'keiri@solano-design.example.jp' }] },
  { id: 'c04', name: '株式会社ナナカマド食品', kana: 'ナナカマドショクヒン', zip: '062-0020', address: '北海道札幌市豊平区月寒中央通7丁目4-1', terms: T_END_2, contacts: [{ name: '小林 隆', section: '総務課', email: 'kobayashi@nanakamado-foods.example.jp', phone: '011-555-0104' }] },
  { id: 'c05', name: '東雲デザイン事務所', kana: 'シノノメデザインジムショ', zip: '064-0804', address: '北海道札幌市中央区南4条西20丁目1-7', terms: T_END_NEXT, contacts: [{ name: '東雲 結', email: 'yui@shinonome-d.example.jp' }] },
  { id: 'c06', name: '株式会社豊平クリーンサービス', kana: 'トヨヒラクリーンサービス', zip: '062-0932', address: '北海道札幌市豊平区平岸2条13丁目6-22', terms: T_END_NEXT, contacts: [{ name: '山田 修', section: '管理部', email: 'yamada@toyohira-clean.example.jp', phone: '011-555-0106' }] },
  { id: 'c07', name: '有限会社石狩運輸', kana: 'イシカリウンユ', zip: '061-3213', address: '北海道石狩市新港中央2丁目750', terms: T_END_NEXT, contacts: [{ name: '松本 浩二', email: 'matsumoto@ishikari-unyu.example.jp', phone: '0133-55-0107' }] },
  { id: 'c08', name: '合同会社リンクス北海道', kana: 'リンクスホッカイドウ', zip: '060-0807', address: '北海道札幌市北区北7条西4丁目 リンクスビル', terms: T_20_NEXT, contacts: [{ name: '井上 玲奈', section: '事業部', email: 'inoue@links-hokkaido.example.jp' }] },
  { id: 'c09', name: '一般社団法人札幌まちづくり協会', kana: 'サッポロマチヅクリキョウカイ', zip: '060-0001', address: '北海道札幌市中央区北1条西2丁目 市民会館内', terms: T_END_2, contacts: [{ name: '木村 恵子', section: '事務局', email: 'jimukyoku@sapporo-machi.example.jp', phone: '011-555-0109' }] },
  { id: 'c10', name: '株式会社アカシア電機', kana: 'アカシアデンキ', zip: '063-0051', address: '北海道札幌市西区宮の沢1条1丁目4-3', terms: T_END_NEXT, contacts: [{ name: '林 誠', section: '購買課', email: 'hayashi@acacia-denki.example.jp', phone: '011-555-0110' }] },
  { id: 'c11', name: '医療法人社団あおぞら会 あおぞら歯科クリニック', kana: 'イリョウホウジンシャダンアオゾラカイアオゾラシカクリニック', zip: '003-0027', address: '北海道札幌市白石区本通8丁目北2-5', terms: T_END_NEXT, contacts: [{ name: '清水 あかり', section: '事務長', email: 'shimizu@aozora-dental.example.jp' }] },
  { id: 'c12', name: '北見測量株式会社', kana: 'キタミソクリョウ', zip: '090-0014', address: '北海道北見市北4条西3丁目11', terms: T_END_NEXT, contacts: [{ name: '森 勇気', email: 'mori@kitami-survey.example.jp', phone: '0157-55-0112' }] },
  { id: 'c13', name: '株式会社藻岩ベーカリー', kana: 'モイワベーカリー', zip: '064-0942', address: '北海道札幌市中央区双子山2丁目3-9', terms: T_END_NEXT, contacts: [{ name: '阿部 紗季', email: 'abe@moiwa-bakery.example.jp' }] },
  { id: 'c14', name: '一般社団法人北海道中小企業デジタル化推進協議会 札幌支部事務局', kana: 'ホッカイドウチュウショウキギョウデジタルカスイシンキョウギカイサッポロシブジムキョク', zip: '060-0003', address: '北海道札幌市中央区北3条西3丁目1-5 北海道経済センタービル12階', terms: T_END_2, contacts: [{ name: '渡辺 悠斗', section: '企画担当', email: 'watanabe@hokkaido-digital.example.jp', phone: '011-555-0114' }] },
]

const L = (id: string, description: string, quantity: number, unitPrice: number, taxRate: TaxRate = 10, unit = '式'): InvoiceLine => ({ id, description, quantity, unit, unitPrice, taxRate })

const SERVICES: InvoiceLine[][] = [
  [L('a', 'ウェブサイト保守（月額）', 1, 33000, 10, '月')],
  [L('a', 'チラシデザイン（A4表裏）', 1, 68000), L('b', '写真撮影・レタッチ', 4, 8500, 10, '点')],
  [L('a', 'ロゴデザイン一式', 1, 150000), L('b', '利用ガイドライン作成', 1, 30000)],
  [L('a', 'ランディングページ制作', 1, 280000), L('b', '原稿整理・取材同行', 2, 22000, 10, '日')],
  [L('a', 'パッケージ用イラスト制作', 3, 40000, 8, '点')],
  [L('a', 'パンフレット編集・デザイン（8ページ）', 1, 220000)],
]

const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const dueFor = (issuedOn: string, terms: ClientTerms) => {
  const [y, m] = issuedOn.split('-').map(Number)
  const [yy, mm] = addMonths(y, m, terms.payMonthsLater)
  return ymd(yy, mm, terms.payDay === 'end' ? lastDayOf(yy, mm) : terms.payDay)
}

const history = (id: string, status: InvoiceStatus, issuedOn: string, paidOn: string | null): HistoryEntry[] => {
  const h: HistoryEntry[] = [{ id: `${id}-h1`, at: `${issuedOn}T00:20:00Z`, kind: 'created' }]
  if (status === 'draft') return [...h, { id: `${id}-h2`, at: `${issuedOn}T01:05:00Z`, kind: 'saved' }]
  h.push({ id: `${id}-h2`, at: `${issuedOn}T01:00:00Z`, kind: 'sent' })
  if (status === 'paid' && paidOn) h.push({ id: `${id}-h3`, at: `${paidOn}T03:00:00Z`, kind: 'paid' })
  if (status === 'void') h.push({ id: `${id}-h3`, at: `${issuedOn}T08:00:00Z`, kind: 'voided', note: '内容に誤りがあったため' })
  return h
}

type Row = { client: string; status: InvoiceStatus; issuedOn: string; dueOn?: string; paidOn?: string | null; service: number; memo?: string }
/** id と請求書番号の数え方。見本を何度作っても同じ id・番号になるよう、作るたびに数え始めを決める（makeManyInvoices は基本の見本のあとから数える）。 */
type Ctx = { seq: number; counters: Record<string, number> }
const baseCtx: Ctx = { seq: 0, counters: {} }
function make(prefix: string, r: Row, rounding: Rounding = 'floor', ctx: Ctx = baseCtx): Invoice {
  ctx.seq += 1
  const { counters } = ctx
  const id = `${prefix}${pad(ctx.seq, 3)}`
  const client = clients.find((c) => c.id === r.client) ?? clients[0]
  const year = r.issuedOn.slice(0, 4)
  let number: string | null = null
  if (r.status !== 'draft') { counters[year] = (counters[year] ?? 0) + 1; number = `INV-${year}-${pad(counters[year], 4)}` }
  const paidOn = r.status === 'paid' ? (r.paidOn ?? r.issuedOn) : null
  return {
    id, number, clientId: r.client, status: r.status, issuedOn: r.issuedOn,
    dueOn: r.dueOn ?? dueFor(r.issuedOn, client.terms), paidOn,
    lines: SERVICES[r.service % SERVICES.length].map((l) => ({ ...l, id: `${id}-${l.id}` })),
    rounding, memo: r.memo, history: history(id, r.status, r.issuedOn, paidOn),
  }
}

/** 過去の分（2025年12月〜2026年8月）：毎月 2 件、すべて入金済み。 */
function historic(): Row[] {
  const rows: Row[] = []
  for (let i = 0; i < 18; i++) {
    const [y, m] = addMonths(2025, 12, Math.floor(i / 2))
    const client = clients[(i * 5) % clients.length]
    const issuedOn = ymd(y, m, i % 2 === 0 ? 15 : lastDayOf(y, m))
    const dueOn = dueFor(issuedOn, client.terms)
    const [py, pm, pd] = dueOn.split('-').map(Number)
    rows.push({ client: client.id, status: 'paid', issuedOn, dueOn, paidOn: ymd(py, pm, Math.max(1, pd - 1 - (i % 3))), service: i })
  }
  return rows
}

const recent: Row[] = [
  { client: 'c01', status: 'paid', issuedOn: '2026-09-15', paidOn: '2026-10-29', service: 0 },
  { client: 'c04', status: 'paid', issuedOn: '2026-09-30', paidOn: '2026-11-09', service: 4 },
  { client: 'c06', status: 'sent', issuedOn: '2026-09-30', dueOn: '2026-10-31', service: 0 },
  { client: 'c10', status: 'sent', issuedOn: '2026-09-30', dueOn: '2026-10-31', service: 5, memo: 'お支払いは月末までにお願いします。' },
  { client: 'c03', status: 'paid', issuedOn: '2026-10-05', paidOn: '2026-10-30', service: 3 },
  { client: 'c12', status: 'paid', issuedOn: '2026-10-12', paidOn: '2026-11-10', service: 1 },
  { client: 'c08', status: 'sent', issuedOn: '2026-10-20', dueOn: '2026-11-10', service: 2 },
  { client: 'c14', status: 'sent', issuedOn: '2026-10-31', service: 5, memo: '2026年度 事業報告書の制作費です。' },
  { client: 'c02', status: 'sent', issuedOn: '2026-10-31', service: 0 },
  { client: 'c13', status: 'void', issuedOn: '2026-10-25', service: 4 },
  { client: 'c05', status: 'paid', issuedOn: '2026-10-31', paidOn: '2026-11-12', service: 1 },
  { client: 'c09', status: 'sent', issuedOn: '2026-10-31', service: 3 },
  { client: 'c01', status: 'sent', issuedOn: '2026-11-05', service: 1 },
  { client: 'c11', status: 'sent', issuedOn: '2026-11-09', service: 2 },
  { client: 'c07', status: 'sent', issuedOn: '2026-11-12', service: 0 },
  { client: 'c10', status: 'draft', issuedOn: '2026-11-12', service: 3 },
  { client: 'c03', status: 'draft', issuedOn: '2026-11-13', service: 1 },
  { client: 'c04', status: 'paid', issuedOn: '2026-11-02', paidOn: '2026-11-11', dueOn: '2026-11-30', service: 4 },
]

export const invoices: Invoice[] = [...historic(), ...recent].map((r) => make('inv-', r))
const baseSeq = baseCtx.seq
const baseCounters = { ...baseCtx.counters }

/** 大量のとき用（一覧のページ送りや長い社名の確かめ）。240 件。何度呼んでも同じ id（inv-m037〜）・同じ番号になる。 */
export function makeManyInvoices(n = 240): Invoice[] {
  const ctx: Ctx = { seq: baseSeq, counters: { ...baseCounters } } // 何度呼んでも同じ id・番号（呼んだ順に依存しない）
  const out: Invoice[] = []
  const statuses: InvoiceStatus[] = ['paid', 'paid', 'paid', 'sent', 'paid', 'sent', 'void', 'paid']
  for (let i = 0; i < n; i++) {
    const [y, m] = addMonths(2025, 1, Math.floor(i / 10))
    const issuedOn = ymd(y, m, 1 + ((i * 3) % 27))
    const client = clients[(i * 7 + (i % 5 === 0 ? 13 : 0)) % clients.length]
    out.push(make('inv-m', { client: client.id, status: statuses[i % statuses.length], issuedOn, service: i }, 'floor', ctx))
  }
  return out
}

let manyCache: Invoice[] | null = null
/**
 * 大量のときの見本を 1 度だけ作って共有する（4 画面が各自で `let manySample ??= makeManyInvoices()` を持っていた）。
 * 同じ id の同じ配列を返すので、画面をまたいで同じ物を指せる。件数を変えたいときは makeManyInvoices(n) を直接呼ぶ（共有しない）。
 */
export const manyInvoices = (): Invoice[] => (manyCache ??= makeManyInvoices())

const rawPayments: Omit<Payment, 'id'>[] = [
  { receivedOn: '2026-11-12', payerName: '(カ)ミドリエンゲイ', amount: 36300, matchedInvoiceId: null },
  { receivedOn: '2026-11-12', payerName: 'シノノメ ユイ', amount: 112200, matchedInvoiceId: 'inv-029' },
  { receivedOn: '2026-11-11', payerName: '(カ)ナナカマドショクヒン', amount: 129600, matchedInvoiceId: 'inv-036' },
  { receivedOn: '2026-11-10', payerName: 'キタミソクリョウ(カ', amount: 112200, matchedInvoiceId: 'inv-024' },
  { receivedOn: '2026-11-10', payerName: '(カ)リンクスホッカイドウ', amount: 198000, matchedInvoiceId: null },
  { receivedOn: '2026-11-09', payerName: 'ナナカマドショクヒン', amount: 129600, matchedInvoiceId: 'inv-020' },
  { receivedOn: '2026-11-09', payerName: 'ヤマダ ケンタ', amount: 50000, matchedInvoiceId: null },
  { receivedOn: '2026-11-06', payerName: '(カ)アカシアデンキ', amount: 241670, matchedInvoiceId: null },
  { receivedOn: '2026-10-30', payerName: 'ソラノセッケイ(ド', amount: 356400, matchedInvoiceId: 'inv-023' },
  { receivedOn: '2026-10-29', payerName: '(カ)ホクトインサツ', amount: 36300, matchedInvoiceId: 'inv-019' },
  { receivedOn: '2026-10-29', payerName: '(カ)トヨヒラクリーンサービス', amount: 36300, matchedInvoiceId: null },
  { receivedOn: '2026-10-15', payerName: 'イシカリウンユ(ユ', amount: 36300, matchedInvoiceId: null },
]
export const payments: Payment[] = rawPayments.map((p, i) => ({ id: `pay-${pad(i + 1, 3)}`, ...p }))

/** 見本の請求書の合計（テストや説明に使う）。 */
export const totalOf = (inv: Invoice) => calcTotals(inv.lines, inv.rounding).total

export const defaultSettings: Settings = {
  company: { name: '合同会社イロハ制作室', zip: '064-0809', address: '北海道札幌市中央区南9条西3丁目 イロハビル301', phone: '011-555-0199', email: 'info@iroha-seisaku.example.jp', registrationNo: 'T1234567890123', bank: '北洋信用金庫 中央支店 普通 1234567 イロハセイサクシツ(ド' },
  numberPrefix: 'INV-',
  rounding: 'floor',
  defaultTaxRate: 10,
  defaultTerms: T_END_NEXT,
  notify: { onPaid: true, onOverdue: true, weeklySummary: false },
}
