import { clients, defaultSettings, describeTerms, formatZip, type ClientTerms, type Rounding, type TaxRate } from '../../data'
import { checkEach, checkRule, toHalf, toHalfDigits, wasWidened } from '../../lib'

/** はじめての設定の中身（段・欄の表・初期値・検査）。純粋な関数と表だけを置く（表示も取得も知らない）。 */

export type StepNo = 1 | 2 | 3
export const STEP_NAMES = ['自社の情報', '請求の決まり', '最初の取引先'] as const

export type TextKey =
  | 'companyName' | 'zip' | 'address' | 'phone' | 'email' | 'registrationNo'
  | 'prefix' | 'bank'
  | 'clientName' | 'clientEmail' | 'contact'

export type Values = Record<TextKey, string> & { rounding: Rounding; taxRate: TaxRate; termsKey: string }
export type Errors = Partial<Record<TextKey, string>>
export type Notes = Partial<Record<TextKey, true>>
/** 途中でやめたときの保存の中身。reached＝いちばん先まで進んだ段。 */
export type Draft = { values: Values; reached: StepNo }

/** 段の部品の共通の props。値と誤りを受け取り、変更と離れた合図を返す（持ち場所は useSetupFlow）。 */
export type StepProps = {
  values: Values
  errors: Errors
  notes: Notes
  onChange: <K extends keyof Values>(key: K, value: Values[K]) => void
  onBlur: (key: TextKey) => void
}

/* ---------- 選択肢 ---------- */

const termsList: ClientTerms[] = [
  { closingDay: 'end', payMonthsLater: 0, payDay: 'end' },
  { closingDay: 'end', payMonthsLater: 1, payDay: 'end' },
  { closingDay: 'end', payMonthsLater: 2, payDay: 'end' },
  { closingDay: 20, payMonthsLater: 1, payDay: 'end' },
  { closingDay: 25, payMonthsLater: 1, payDay: 'end' },
  { closingDay: 'end', payMonthsLater: 1, payDay: 10 },
]
export const termsOptions = termsList.map((t) => ({ value: `${t.closingDay}-${t.payMonthsLater}-${t.payDay}`, label: describeTerms(t) }))
export const roundingOptions: { value: Rounding; label: string }[] = [
  { value: 'floor', label: '切り捨て' },
  { value: 'round', label: '四捨五入' },
  { value: 'ceil', label: '切り上げ' },
]
export const taxRateOptions: { value: string; label: string }[] = [
  { value: '10', label: '10%' },
  { value: '8', label: '8%' },
]

/** 2 段目の初期値（多くの事業者が使う決まり。F-07）。 */
export const rulesDefaults = { prefix: 'INV-', rounding: 'floor' as Rounding, taxRate: 10 as TaxRate, termsKey: termsOptions[1].value }

/* ---------- 欄の表（F-03・F-04・F-05・F-06） ---------- */

export type FieldSpec = {
  key: TextKey
  step: StepNo
  id: string
  label: string
  required: boolean
  hint?: string
  /** 必須の欄が空のとき（送る時に出す）。 */
  empty?: string
  /** 値の形が違うとき（離れた時に出す）。 */
  bad?: string
  /** 全角・ハイフンの種類などを直す（離れた時・送る時）。 */
  normalize?: (raw: string) => string
  /** 値が入っているときの形の検査（normalize のあとの値を渡す）。 */
  valid?: (v: string) => boolean
  input: { type?: 'email' | 'tel'; inputMode?: 'numeric'; autoComplete?: string; width?: 'zip' | 'tel' }
}

/** 全角を半角に、前後の空白を除く（lib の toHalf）。数字・ハイフンの欄は toHalfDigits（ハイフンの種類と空白もそろえる）。 */
const half = (raw: string) => toHalf(raw).trim()
const mailForm = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const mailBad = 'メールの形で入力してください。例：info@example.jp'

export const fieldSpecs: FieldSpec[] = [
  { key: 'companyName', step: 1, id: 'setup-company-name', label: '会社名', required: true, hint: '請求書にそのまま載ります。', empty: '会社名を入れてください。', input: { autoComplete: 'organization' } },
  { key: 'zip', step: 1, id: 'setup-zip', label: '郵便番号', required: true, hint: '例：060-0042', empty: '郵便番号を入れてください。', bad: '郵便番号は7桁の数字で入力してください。', normalize: (r) => formatZip(toHalfDigits(r)), valid: (v) => /^\d{3}-\d{4}$/.test(v), input: { inputMode: 'numeric', autoComplete: 'postal-code', width: 'zip' } },
  { key: 'address', step: 1, id: 'setup-address', label: '住所', required: true, hint: '都道府県から入れます。', empty: '住所を入れてください。', input: { autoComplete: 'street-address' } },
  { key: 'phone', step: 1, id: 'setup-phone', label: '電話', required: false, hint: '例：011-555-0199', bad: '電話は数字とハイフンで入力してください。', normalize: toHalfDigits, valid: (v) => /^[\d-]+$/.test(v) && [10, 11].includes(v.replace(/\D/g, '').length), input: { type: 'tel', autoComplete: 'tel', width: 'tel' } },
  { key: 'email', step: 1, id: 'setup-email', label: 'メール', required: true, hint: '請求書を送るときの差出人になります。', empty: 'メールを入れてください。', bad: mailBad, normalize: half, valid: (v) => mailForm.test(v), input: { type: 'email', autoComplete: 'email' } },
  { key: 'registrationNo', step: 1, id: 'setup-registration-no', label: '登録番号', required: false, hint: '税務署から通知された、Tで始まる番号です。例：T1234567890123', bad: '登録番号は「T」と13桁の数字で入力してください。', normalize: (r) => toHalfDigits(r).toUpperCase(), valid: (v) => /^T\d{13}$/.test(v), input: {} },
  { key: 'prefix', step: 2, id: 'setup-prefix', label: '番号の頭', required: true, hint: '請求書の番号の頭に付きます。例：INV-', empty: '番号の頭を入れてください。', normalize: half, input: {} },
  { key: 'bank', step: 2, id: 'setup-bank', label: '振込先', required: true, hint: '請求書に載ります。例：北洋信用金庫 中央支店 普通口座1234567', empty: '振込先を入れてください。', input: {} },
  { key: 'clientName', step: 3, id: 'setup-client-name', label: '取引先名', required: true, hint: '請求書にそのまま載ります。例：株式会社北斗印刷', empty: '取引先名を入れてください。', input: {} },
  { key: 'clientEmail', step: 3, id: 'setup-client-email', label: 'メール', required: true, hint: '請求書の送り先になります。', empty: 'メールを入れてください。', bad: mailBad, normalize: half, valid: (v) => mailForm.test(v), input: { type: 'email' } },
  { key: 'contact', step: 3, id: 'setup-contact', label: '担当者名', required: false, input: {} },
]

export const specsOfStep = (step: StepNo) => fieldSpecs.filter((s) => s.step === step)
export const specOf = (key: TextKey) => fieldSpecs.find((s) => s.key === key) as FieldSpec

/** 2 段目の「税の端数」「標準の税率」「支払条件」は選ぶだけの必須の欄。印の数え方（F-03）に含める。 */
const choiceCount: Record<StepNo, number> = { 1: 0, 2: 3, 3: 0 }
export function setupFieldCount(step: StepNo): { required: number; total: number } {
  const specs = specsOfStep(step)
  return { required: specs.filter((s) => s.required).length + choiceCount[step], total: specs.length + choiceCount[step] }
}

/** 全角などを直した値（欄を離れた時・送る時）。 */
export const normalized = (spec: FieldSpec, raw: string) => (spec.normalize ? spec.normalize(raw) : raw.trim())
/** 直したことを「半角にそろえました」と知らせる条件。半角にそろえる欄で、全角などを直したときだけ（前後の空白を除いただけでは言わない）。 */
export const needsNote = (spec: FieldSpec, raw: string) => spec.normalize !== undefined && wasWidened(raw)

/** 送る時の検査。空欄の必須と、形の誤り（欄の表 fieldSpecs を、lib の検査の骨で回す）。値は直したあとの値を渡す。 */
export function validateStep(step: StepNo, values: Values): Errors {
  return checkEach(specsOfStep(step).map((s) => s.key), (key) => checkRule(specOf(key), values[key]))
}

/* ---------- 初期値と見本 ---------- */

export function blankSetupValues(): Values {
  return {
    companyName: '', zip: '', address: '', phone: '', email: '', registrationNo: '',
    ...rulesDefaults, bank: '',
    clientName: '', clientEmail: '', contact: '',
  }
}

const c = defaultSettings.company
const demoCompany = { companyName: c.name, zip: c.zip, address: c.address, phone: c.phone, email: c.email, registrationNo: c.registrationNo }
const demoClient = { clientName: clients[0].name, clientEmail: clients[0].contacts[0].email, contact: clients[0].contacts[0].name }

export type Seed = { values: Values; errors: Errors }

/**
 * 状態の名前から、欄の初めの値と誤りを決める（画面を開いたときの 1 回）。保存してある入力があれば、それを使う（invalid だけは確かめ用に空から）。
 * default・loading・error は空の 1 段目。step_2・resumed は 1 段目が入った 2 段目、step_3・saving・save_failed・done は 3 段目まで入った見本。
 */
export function setupSeedFor(state: string, draft: Draft | null): Seed {
  const blank = blankSetupValues()
  let values = blank
  if (state === 'step_2' || state === 'resumed') values = { ...blank, ...demoCompany }
  if (state === 'step_3' || state === 'saving' || state === 'save_failed' || state === 'done') values = { ...blank, ...demoCompany, bank: c.bank, ...(state === 'saving' || state === 'save_failed' ? demoClient : {}) }
  if (draft && state !== 'invalid') values = draft.values
  return { values, errors: state === 'invalid' ? validateStep(1, values) : {} }
}

/** 状態の名前から、いま出す段（resumed は保存してある続きの段）。 */
export function stepOf(state: string, resumedStep: StepNo): StepNo {
  if (state === 'step_2') return 2
  if (state === 'step_3' || state === 'saving' || state === 'save_failed') return 3
  if (state === 'resumed') return resumedStep
  return 1
}

export const later = (a: StepNo, b: StepNo): StepNo => (a > b ? a : b)
export const stateOfStep = (step: StepNo): string => (step === 1 ? 'default' : `step_${step}`)
