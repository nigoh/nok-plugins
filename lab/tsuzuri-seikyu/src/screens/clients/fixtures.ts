import { clients, invoices, TODAY, dateOf, pad, ymdOf, type Client, type ClientTerms } from '../../data'
import { rowsFrom, type ClientRow } from './model'

/**
 * 「多い」状態の見本（取引先 200 件・最長 60 字の名前を含む）。この画面の中だけで使う（土台の見本は 14 件）。
 * 数は式で決める。同じ呼び出しは同じ結果（日付は見本の「いま」から数える）。
 */

/** 最長の名前（60 字。R-03）。 */
export const LONGEST_NAME = '一般社団法人北海道中小企業デジタル化推進協議会札幌支部事務局企画推進部地域連携課第二担当室道央圏広域連携推進委員会運営室'
const LONGEST_KANA = 'イッパンシャダンホウジンホッカイドウチュウショウキギョウデジタルカスイシンキョウギカイサッポロシブジムキョクキカクスイシンブチイキレンケイカダイニタントウシツドウオウケンコウイキレンケイスイシンイインカイウンエイシツ'

const PREFIXES: [string, string][] = [['株式会社', 'カブシキガイシャ'], ['有限会社', 'ユウゲンガイシャ'], ['合同会社', 'ゴウドウガイシャ'], ['一般社団法人', 'イッパンシャダンホウジン']]
const STEMS: [string, string][] = [
  ['青葉', 'アオバ'], ['北辰', 'ホクシン'], ['白樺', 'シラカバ'], ['星野', 'ホシノ'], ['道南', 'ドウナン'],
  ['ハマナス', 'ハマナス'], ['石山', 'イシヤマ'], ['雪見', 'ユキミ'], ['茨戸', 'バラト'], ['大通', 'オオドオリ'],
  ['手稲', 'テイネ'], ['円山', 'マルヤマ'], ['清田', 'キヨタ'], ['厚別', 'アツベツ'], ['藤野', 'フジノ'],
  ['琴似', 'コトニ'], ['麻生', 'アサブ'], ['発寒', 'ハッサム'], ['真駒内', 'マコマナイ'], ['澄川', 'スミカワ'],
]
const TRADES: [string, string][] = [
  ['商事', 'ショウジ'], ['建設', 'ケンセツ'], ['工業', 'コウギョウ'], ['食品', 'ショクヒン'], ['設計', 'セッケイ'],
  ['運輸', 'ウンユ'], ['印刷', 'インサツ'], ['電機', 'デンキ'], ['農産', 'ノウサン'], ['企画', 'キカク'],
]
const SURNAMES = ['佐々木', '鈴木', '田中', '山口', '斎藤', '吉田', '石川', '池田']
const GIVEN = ['翔太', '陽子', '拓海', '千尋', '直樹', '美穂', '健太', '裕子']
const TERMS: ClientTerms[] = [
  { closingDay: 'end', payMonthsLater: 1, payDay: 'end' },
  { closingDay: 20, payMonthsLater: 1, payDay: 'end' },
  { closingDay: 'end', payMonthsLater: 2, payDay: 10 },
]
/** 未入金額の見本（税込）。 */
const AMOUNTS = [33000, 36300, 112200, 129600, 198000, 241670, 356400]

/** 暦日 'YYYY-MM-DD' から days 日あとの暦日（日本時間）。 */
const addDays = (ymd: string, days: number): string => ymdOf(new Date(dateOf(ymd).getTime() + days * 86400000).toISOString())

function extraRow(i: number): ClientRow {
  const [pre, preKana] = PREFIXES[i % PREFIXES.length]
  const [stem, stemKana] = STEMS[i % STEMS.length]
  const [trade, tradeKana] = TRADES[Math.floor(i / STEMS.length) % TRADES.length]
  const longest = i === 0
  const client: Client = {
    id: `cm${pad(i + 1, 3)}`,
    name: longest ? LONGEST_NAME : `${pre}${stem}${trade}`,
    kana: longest ? LONGEST_KANA : `${preKana}${stemKana}${tradeKana}`,
    zip: '060-0001',
    address: '北海道札幌市中央区北1条西2丁目',
    terms: TERMS[i % TERMS.length],
    contacts: [
      { name: `${SURNAMES[i % SURNAMES.length]} ${GIVEN[(i * 3) % GIVEN.length]}`, section: i % 3 === 0 ? '総務部' : undefined, email: `contact${pad(i + 1, 3)}@example.jp` },
      ...(i % 7 === 0 ? [{ name: `${SURNAMES[(i + 1) % SURNAMES.length]} ${GIVEN[(i + 2) % GIVEN.length]}`, email: `sub${pad(i + 1, 3)}@example.jp` }] : []),
    ],
  }
  // 4 件に 1 件は未入金がある。件数は 1〜3 件、期限は 20 日前から 45 日先まで。
  const open = i % 4 === 1 ? 1 + (i % 3) : 0
  const unpaid = Array.from({ length: open }, (_, k) => AMOUNTS[(i + k) % AMOUNTS.length]).reduce((s, a) => s + a, 0)
  const earliestDue = open > 0 ? addDays(TODAY, ((i * 11) % 66) - 20) : null
  return { client, unpaid, unpaidCount: open, earliestDue }
}

/** 取引先 200 件（土台の 14 件と、足した 186 件）。 */
export function makeManyRows(total = 200): ClientRow[] {
  const base = rowsFrom(clients, invoices)
  return [...base, ...Array.from({ length: Math.max(0, total - base.length) }, (_, i) => extraRow(i))]
}
