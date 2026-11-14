import { actions } from '../../app/terms'
import { formatDate, formatDateColumn, formatYen, MISSING, TODAY, type Candidate } from '../../data'

/**
 * 入金の確認の文言の正本（設計書の文言の一覧と同じ内容）。この画面にしか出ない文だけを置く。
 * 全画面で同じ語（画面名・ボタンの動詞）は app/terms.ts から引く。文は連結せず差し込む（L-13）。
 */
export const copy = {
  // 見出し・区画
  unconfirmedHeading: '未確認の入金',
  confirmedHeading: '確認済みの入金',
  unconfirmedTable: '未確認の入金の一覧',
  confirmedTable: '確認済みの入金の一覧',
  panelHeading: '入金の突き合わせ',
  // 表の見出し
  colPayer: '振込名義',
  colDate: '入金日',
  colAmount: '金額（円）',
  colStatus: '状況',
  colAction: '操作',
  // ボタン
  confirmAll: 'まとめて確認する',
  confirmOne: '入金を確認する',
  confirmBusy: '入金を確認しています',
  pickInvoice: '請求書を選ぶ',
  checkDiff: '差額を確かめる',
  backWithoutConfirm: '確認せず戻る',
  confirmAsFee: '差額を手数料として確認する',
  retryFailed: 'もう一度確認する',
  retryBusy: '確認しています',
  // 選んでいる件数
  selectNone: 'まとめて確認する入金を選んでください。',
  // パネル
  panelDate: '入金日',
  panelPayer: '振込名義',
  panelAmount: '入金額',
  candidatesLegend: '候補の請求書',
  searchedLegend: '探した請求書',
  unpaidLegend: '未入金の請求書',
  searchLabel: '請求書を探す',
  searchHint: '請求書番号か取引先名で探せます。',
  noCandidates: '合う請求書の候補が見つかりませんでした。請求書番号か取引先名で探してください。',
  pickToConfirm: '請求書を選ぶと、入金を確認できます。',
  // 差額
  diffTitle: '差額があります',
  diffReason: '考えられる理由は、振込手数料です。',
  diffDirection: '差額は、入金額から請求額を引いた額です。',
  diffTooBig: '差額が大きいため、ここでは確認できません。請求書の金額と入金額を確かめてください。',
  // 窓
  dialogBody: `確認すると、候補の請求書が入金済みになります。確認した直後は「${actions.undo}」で戻せます。`,
  dialogCount: '件数',
  dialogTotal: '合計',
  // 済んだ知らせ
  confirmedOne: '入金を確認しました',
  undone: '確認を元に戻しました',
  // 一部失敗
  okList: '確認できた入金',
  failedList: '確認できなかった入金',
  failedByNetwork: '通信が途中で切れました。',
  // 片付いた・失敗・待ち
  allDoneTitle: '未確認の入金はすべて確認しました',
  allDoneBody: '新しい入金があると、ここに並びます。',
  loadFailed: '入金を読み込めませんでした',
  loading: '入金を読み込んでいます',
  /** 更新中・古い内容のときに、確認を押せない理由（RefreshingNote・StaleNotice の中身）。 */
  lockRefreshing: '終わるまで、入金を確認できません',
  lockStale: '更新できませんでした。新しい内容を読み込むまで、入金を確認できません。もう一度読み込んでください。',
  /** 確認の送信が失敗した（save_failed）。入力は残る。 */
  confirmFailed: '入金を確認できませんでした。選んだ内容は残っています。もう一度確認してください。',
  // 行
  noRowCandidate: '候補の請求書はありません',

  summary: (count: number, total: number, oldest: string) =>
    `${count}件・合計${formatYen(total)}・いちばん古い入金は${formatDateColumn([oldest], TODAY)[0]}`,
  selected: (count: number, total: number) => `${count}件を選んでいます・合計${formatYen(total)}`,
  searchNone: (query: string) => `「${query}」に合う請求書は見つかりませんでした。別の語で探してください。`,
  searchMore: (count: number) => `ほかに${count}件あります。探す語で絞ってください。`,
  diffBody: (amount: number, total: number, diff: number) =>
    `入金は${formatYen(amount)}、請求額は${formatYen(total)}（税込）です。差額は${formatYen(diff, { signed: true })}（${shortage(diff)}）です。`,
  dialogTitle: (count: number) => `${count}件の入金を確認しますか`,
  countValue: (count: number) => `${count}件`,
  confirmedMany: (count: number) => `${count}件の入金を確認しました`,
  partialTitle: (total: number, ok: number) => `${total}件中${ok}件を確認しました`,
  partialBody: (failed: number) => `${failed}件は確認できませんでした。もう一度確認してください。`,
  confirmedCap: (count: number) => `新しい${count}件を表示しています`,
  feeNote: (diff: number) => `差額${formatYen(diff, { signed: true })}は手数料として確認しました`,
  /** 行ごとの操作の読み上げ名。見える文字を含める（L-12）。 */
  forPayer: (payer: string, verb: string) => `${payer}の${verb}`,
  candidateMeta: (total: number, dueOn: string) => `請求額${formatYen(total)}（税込）・支払期限${formatDate(dueOn)}`,
  /** 行の補足：いちばん合う候補（差額があれば添える）。 */
  rowCandidate: (number: string | null, clientName: string, more: number, diff: number) => {
    const head = `候補：${number ?? MISSING}（${clientName}）`
    const rest = more > 0 ? `ほか${more}件` : ''
    const gap = diff === 0 ? '' : `・差額${formatYen(diff, { signed: true })}`
    return `${head}${rest}${gap}`
  },
  /** 候補が合う理由。金額が 0 円の差で合っていれば「合います」、近いだけなら「近いです」。 */
  reason: (c: Pick<Candidate, 'reason' | 'difference'>) => {
    const exact = c.difference === 0
    if (c.reason === 'both') return exact ? '名義と金額が合います' : '名義が合い、金額が近いです'
    if (c.reason === 'name') return '名義が合います'
    return exact ? '金額が合います' : '金額が近いです'
  },
  /** 候補ごとの差額の言い方（0 のときは言わない）。 */
  diffNote: (diff: number) => (diff === 0 ? '' : `差額${formatYen(diff, { signed: true })}（${shortage(diff)}）`),
} as const

/** 差額の向きは「入金額 − 請求額」。負なら不足、正なら多い（G-05）。 */
export function shortage(diff: number): string {
  if (diff < 0) return `${formatYen(-diff)}不足`
  if (diff > 0) return `${formatYen(diff)}多い`
  return '差額なし'
}
