import { manyInvoices, type Client, type Invoice } from '../../data'

/**
 * many の確かめ用の見本（取引先が 36 社・請求書 240 件・名前が最長 60 字）。請求書は土台の manyInvoices()、社の割り当てだけこの画面に残す。
 * 土台の見本（取引先 14 社）では「その他」が 3 社・表が 1 ページで、ページ送りと長い名前が試せないので、取引先はこの画面の中で作る（B-03）。
 */
const PREFIX = ['株式会社', '有限会社', '合同会社']
const CORE = ['北斗', '白樺', '雪見', '藻岩', '手稲', '石狩', '豊平', '月寒', '円山', '琴似', '新川', '麻生']
const BIZ = ['商事', '工業', '食品', '設計', '運輸', '印刷']
const LONGEST = '一般社団法人北海道中小企業デジタル化推進協議会 札幌支部事務局 経理・総務グループ 請求書ご担当窓口'

/** 取引先 36 社（名前が最長 60 字を含む）。請求書は土台の manyInvoices() に、この社の割り当てだけ重ねる。 */
const makeClients = (): Client[] =>
  Array.from({ length: 36 }, (_, i) => ({
    id: `m${String(i + 1).padStart(2, '0')}`,
    name: i === 35 ? LONGEST : `${PREFIX[i % 3]}${CORE[i % 12]}${BIZ[(Math.floor(i / 12) * 2 + (i % 2)) % 6]}`,
    kana: '',
    zip: '060-0000',
    address: '北海道札幌市中央区',
    terms: { closingDay: 'end', payMonthsLater: 1, payDay: 'end' },
    contacts: [],
  }))

export type Source = { invoices: Invoice[]; clients: Client[] }

let cache: Source | null = null
export function manySource(): Source {
  if (cache) return cache
  const clients = makeClients()
  const invoices = manyInvoices().map((inv, i) => ({ ...inv, clientId: clients[(i * 7 + 3) % clients.length].id }))
  cache = { invoices, clients }
  return cache
}
export const LONGEST_NAME = LONGEST
