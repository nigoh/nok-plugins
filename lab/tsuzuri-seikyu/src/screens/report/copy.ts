import { messages, screenNames } from '../../app/terms'
import { formatMonth, formatMonthOnly, formatNumber, formatYen } from '../../data'
import type { BarItem, MonthFigure } from './aggregate'

/**
 * この画面にしか出ない文（題・説明・注記・知らせ）。全画面で同じ語（画面名・ボタンの動詞）は terms から引く（L-13）。
 * 文は連結せず差し込む（M-21）。です・ます。ボタンと見出しは言い切り。「集計」は避ける語なので「数える」「合計」で言う。
 */
const yearMonthName = (key: string) => formatMonth(`${key}-01`)

export const copy = {
  exportScope: '月ごとと取引先別の2つの表を、1つのファイルに書き出せます。',
  exportScopePartial: '読み込めなかった月は、空欄のまま書き出されます。',
  exportBusy: '書き出しています',
  exported: '表を書き出しました',
  exportFailed: '表を書き出せませんでした。もう一度書き出してください。',

  periodLabel: '期間',
  widenPeriod: '期間を1年にする',

  monthlyHeading: (unit: string | null) => (unit === null ? '月ごとの請求額と入金額' : `月ごとの請求額と入金額（${unit}）`),
  clientsHeading: `${screenNames.clients}別の請求額`,
  legend: { billed: '請求額', paid: '入金額', open: '途中の月' },
  columns: { month: '月', billed: '請求額（円）', paid: '入金額（円）', share: '割合（%）' },
  total: '合計',
  totalPartial: (counted: number) => `合計（取れた${counted}か月ぶん）`,
  monthLabel: (key: string, open: boolean) => (open ? `${yearMonthName(key)}（途中）` : yearMonthName(key)),
  openTick: '途中',
  missingMonthMark: '—',
  otherLabel: (n: number) => `その他（${n}社）`,
  pagedTotal: (n: number, billed: number, paid: number) => `全${formatNumber(n)}社・請求額の合計${formatYen(billed)}・入金額の合計${formatYen(paid)}`,

  loading: '売上を読み込んでいます',
  errorTitle: '売上を読み込めませんでした',
  /** 更新中の知らせの続き（RefreshingNote の子。「更新しています」は terms）。期間も書き出しも止める理由。 */
  refreshingLock: 'この間は、期間を変えることも、表を書き出すこともできません',

  emptyTitle: '売上はまだありません',
  /** 初回の 0 件。次の一手は文中のリンク（beforeLink＋「請求書を作る」＋afterLink）。 */
  emptyBody: '請求書を送ると、月ごとの請求額と入金額がここに並びます。',
  emptyBeforeLink: 'まだなら、',
  emptyAfterLink: 'ところから始めましょう。',
  filteredTitle: '条件に合う請求書はありません',
  filteredBody: (range: string, canWiden: boolean) =>
    canWiden ? `選んだ期間は${range}です。期間を広げると、ほかの月の売上を見られます。` : `選んだ期間は${range}です。この期間に送った請求書はありません。`,

  /** 古い内容の知らせの本文（StaleNotice の子）。標準の 1 文に、書き出しを止める理由を続ける。 */
  staleNote: `${messages.staleBody}この間は、表を書き出せません。`,
  partialTitle: '一部の月を読み込めませんでした',
  partialBody: (failed: string[]) => `${failed.map(yearMonthName).join('・')}は読み込めませんでした。図と表の「—」がその月です。もう一度読み込んでください。`,
  recovered: (n: number) => `${n}か月ぶんを読み込みました`,

  axisChanged: (before: string, after: string) => `縦軸の上限が${before}から${after}に変わりました。`,
  note: (openKey: string | null) =>
    openKey === null
      ? '請求額は、送付済みと入金済みの請求書を、請求日の月で数えています（税込）。入金額は、入金済みの請求書を、入金日の月で数えています。下書きと取り消し済みは入れていません。'
      : `請求額は、送付済みと入金済みの請求書を、請求日の月で数えています（税込）。入金額は、入金済みの請求書を、入金日の月で数えています。下書きと取り消し済みは入れていません。${yearMonthName(openKey)}は途中の月で、これからも変わります。`,

  linkInvoices: '請求書の一覧を見る',
  linkClients: `${screenNames.clients}の一覧を見る`,
}

/** 図の要約と読み上げの名前（G-11）。数字を入れ、評価の語を使わない。 */
export function chartSummary(range: string, billed: number, paid: number, counted: number, months: number, top: MonthFigure | null): string {
  const head = counted < months ? `${range}のうち、取れた${counted}か月ぶんの` : `${range}の`
  const first = `${head}請求額は${formatYen(billed)}、入金額は${formatYen(paid)}です。`
  return top === null || top.billed === null ? first : `${first}請求額がいちばん多い月は${formatMonthOnly(`${top.month}-01`)}で、${formatYen(top.billed)}です。`
}

export function clientSummary(first: BarItem): string {
  return `請求額がいちばん多い取引先は${first.label}で、${formatYen(first.billed)}（${formatNumber(first.share)}%）です。`
}
