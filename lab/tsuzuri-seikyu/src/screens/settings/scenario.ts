import { defaultSettings, fakeSave as save, invoices, NOW, outcomeOf, TODAY } from '../../data'
import { fromSettings } from './model'
import type { Saver, Scenario, Values } from './types'

const SAVED: Values = fromSettings(defaultSettings)
const VERSION = 3
const CONFLICT_MINUTES_AGO = 18

/** 今年すでに番号が付いた請求書の数（下書きは番号が無いので数えない）。 */
const issuedThisYear = invoices.filter((i) => i.number !== null && i.issuedOn.startsWith(TODAY.slice(0, 4))).length

/** 状態名ごとの開いたときの材料。見本だけを返す軽い関数（T-07）。 */
export function scenarioFor(state: string): Scenario {
  const base: Scenario = { saved: SAVED, version: VERSION, mine: SAVED, issuedThisYear, conflict: null, dialog: null, saving: false, showErrors: false, saveFailed: false }
  switch (state) {
    case 'invalid':
      return { ...base, mine: { ...SAVED, name: '', email: 'info@iroha-seisaku' }, showErrors: true }
    case 'saving':
      return { ...base, mine: { ...SAVED, phone: '011-555-0123' }, saving: true }
    case 'save_failed':
      return { ...base, mine: { ...SAVED, phone: '011-555-0123' }, saveFailed: true }
    case 'confirming':
      return { ...base, mine: { ...SAVED, numberPrefix: 'IROHA-' }, dialog: 'numbering' }
    case 'conflict': {
      const mine: Values = { ...SAVED, phone: '011-555-0123', rounding: 'round' }
      const theirs: Values = { ...SAVED, phone: '011-555-0188', rounding: 'ceil', zip: '060-0061' }
      const at = new Date(NOW.getTime() - CONFLICT_MINUTES_AGO * 60_000).toISOString()
      return { ...base, mine, conflict: { at, base: SAVED, theirs } }
    }
    default:
      return base
  }
}

/**
 * 保存の真似（通信はしない）。待ちと結果は土台の fakeSave が決める（待ちは 1 つ。画面で時間を決めない）。
 * 失敗は ?state=save_failed のときだけ。conflict の状態は食い違いを開いた時点で見せ、上書き（force）の保存は成功させるので失敗にしない。
 * 本物にするときはこの形（Saver）のまま差し替える。
 */
export const saverFor = (state: string): Saver => async ({ values, baseVersion }) => {
  const r = await save(values, { outcome: state === 'conflict' ? 'ok' : outcomeOf(state) })
  return r.ok ? { kind: 'ok', version: baseVersion + 1 } : { kind: 'fail' }
}
