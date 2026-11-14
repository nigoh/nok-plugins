import { clients as sampleClients, defaultSettings, formatDate, formatNumber, formatTime, TODAY, type Client, type Settings } from '../../data'
import { autoDue, newLine } from './formLogic'
import { toErrors, validate, type Errors } from './validate'
import { MAX_LINES, type Flow, type FormValues, type LineDraft } from './types'

/** この画面が取るデータ（取得の真似が返す）。 */
export type Data = { clients: Client[]; settings: Settings }

/** 競合：選んだ取引先の支払条件を別の人が先に変えた（E-09）。 */
export type Conflict = { clientName: string; at: string; newDue: string }

/** 状態ごとの見本。入力が「手を入れるまでは見本の値」になる（edits ?? seed）。draftFailed は下書きの保存に失敗した知らせを最初から出すか。 */
export type Seed = { values: FormValues; errors: Errors; flow: Flow; conflict: Conflict | null; draftFailed: boolean }

const seedOf = (values: FormValues, over: Partial<Seed> = {}): Seed => ({ values, errors: {}, flow: { kind: 'editing' }, conflict: null, draftFailed: false, ...over })

/** 取引先 200 社（many の確かめ用）。 */
function makeManyClients(): Client[] {
  return Array.from({ length: 200 }, (_, i) => {
    const base = sampleClients[i % sampleClients.length]
    return { ...base, id: `m${i + 1}`, name: `${base.name}（${i + 1}号店）`, kana: `${base.kana}${String(i + 1)}` }
  })
}

export const DATA_DEFAULT: Data = { clients: sampleClients, settings: defaultSettings }
export const DATA_MANY: Data = { clients: makeManyClients(), settings: defaultSettings }

const lineDraft = (i: number, over: Partial<LineDraft> = {}): LineDraft => ({ ...newLine(`l${i}`, defaultSettings.defaultTaxRate), ...over })

const filledLines = (): LineDraft[] => [lineDraft(1, { desc: 'ロゴデザイン', unit: '式', price: formatNumber(120000) }), lineDraft(2, { desc: '名刺の印刷', qty: '2', unit: '箱', price: formatNumber(3500), tax: 8 })]

const blank = (clientId: string): FormValues => ({ clientId, issuedOn: formatDate(TODAY), dueOn: '', dueTouched: false, memo: '', lines: [lineDraft(1)] })

export const emptySeed = (): Seed => seedOf(blank(''))

/** state は ?state= の値、clientParam は ?client=（取引先の初期選び）。 */
export function makeSeed(state: string, data: Data, clientParam: string | null): Seed {
  const known = (id: string | null) => (id !== null && data.clients.some((c) => c.id === id) ? id : '')
  const complete = (): FormValues => autoDue({ ...blank('c03'), memo: '', lines: filledLines() }, data.clients)
  switch (state) {
    case 'many':
      return seedOf(autoDue({ ...blank('m3'), lines: Array.from({ length: MAX_LINES }, (_, i) => lineDraft(i + 1, { desc: `作業${i + 1}`, unit: '式', price: formatNumber(1000 * (i + 1)) })) }, data.clients))
    case 'invalid': {
      const values = { ...blank(''), issuedOn: '' }
      return seedOf(values, { errors: toErrors(validate(values, 'send', data.clients, data.settings.rounding)) })
    }
    case 'confirming':
      return seedOf(complete(), { flow: { kind: 'confirm', failed: false } })
    case 'saving':
      return seedOf(complete(), { flow: { kind: 'sending' } })
    case 'save_failed':
      // 下書きの保存に失敗した姿（先頭の知らせ）。送るを押すと、窓の中でも同じく失敗する（保存の真似が失敗を返す）。
      return seedOf(complete(), { draftFailed: true })
    case 'conflict':
      return seedOf(complete(), { conflict: { clientName: '合同会社ソラノ設計', at: formatTime('2026-11-13T09:12:00+09:00'), newDue: '2027-01-31' } })
    default:
      return seedOf(autoDue(blank(known(clientParam)), data.clients))
  }
}
