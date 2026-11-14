import type { Rounding, Settings } from '../../data'
import { invoiceStatusDef } from '../../parts'
import type { TextKey } from './types'

/** 区分（タブ）の定義。並びがタブの並び。id は URL の tab に使う。 */
export const TABS = [
  { id: 'company', label: '自社の情報' },
  { id: 'invoice', label: '請求書の決まり' },
  { id: 'notify', label: '通知' },
] as const
export type TabId = (typeof TABS)[number]['id']
export const TAB_LABEL = Object.fromEntries(TABS.map((t) => [t.id, t.label])) as Record<TabId, string>

/**
 * 文字を入れる欄の定義。ラベル・必須・区分・補足・誤りの文は、ここ 1 か所に置く（T-3・T-6）。
 * 必須の印は、この表の数（必須 4・全体 8）から markFor が決める。
 * 補足は入れ方の規則や例だけ（L-09）。誤りは空が「指示」、形式が「事実＋頼み」（L-06）。
 */
export type FieldDef = {
  key: TextKey
  id: string
  label: string
  required: boolean
  tab: TabId
  hint?: string
  /** 空のまま保存したとき */
  empty?: string
  /** 形が違うとき（欄を離れた時と保存する時） */
  invalid?: string
}

/** 番号の頭の字数の上限。規則（model.ts の検査）と誤りの文は、この 1 つから作る（T-3）。 */
export const PREFIX_MAX = 10

export const FIELDS: readonly FieldDef[] = [
  { key: 'name', id: 'settings-name', label: '会社名', required: true, tab: 'company', hint: '請求書の差出人として、そのまま載ります。', empty: '会社名を入れてください。' },
  { key: 'zip', id: 'settings-zip', label: '郵便番号', required: false, tab: 'company', hint: '例：060-0042', invalid: '郵便番号は7桁の数字で入れてください。' },
  { key: 'address', id: 'settings-address', label: '住所', required: true, tab: 'company', hint: '請求書の差出人として載ります。都道府県から入れてください。', empty: '住所を入れてください。' },
  { key: 'phone', id: 'settings-phone', label: '電話', required: false, tab: 'company', hint: '例：011-555-0199', invalid: '電話は市外局番から入れてください。' },
  { key: 'email', id: 'settings-email', label: 'メール', required: true, tab: 'company', hint: '請求書を送るときの差出人になります。', empty: 'メールを入れてください。', invalid: 'メールは info@example.jp の形で入れてください。' },
  { key: 'registrationNo', id: 'settings-registration', label: '登録番号', required: false, tab: 'company', hint: '適格請求書発行事業者の登録番号です。例：T1234567890123', invalid: '登録番号はTのあとに13桁の数字を続けて入れてください。' },
  { key: 'bank', id: 'settings-bank', label: '振込先', required: false, tab: 'company', hint: '請求書に振込先として載ります。' },
  { key: 'numberPrefix', id: 'settings-prefix', label: '番号の頭', required: true, tab: 'invoice', empty: '番号の頭に付ける文字を入れてください。', invalid: `番号の頭に付ける文字は、半角の英数字とハイフンで${PREFIX_MAX}字以内にしてください。` },
]

export const FIELD = Object.fromEntries(FIELDS.map((f) => [f.key, f])) as Record<TextKey, FieldDef>
/** markFor に渡す数（空にできる欄の数）。端数処理とチェックは空にならないので数えない。 */
export const FIELD_COUNT = { required: FIELDS.filter((f) => f.required).length, total: FIELDS.length }

export const ROUNDING_LABEL = '税の端数処理'
/** 端数処理の選択肢の定義（ここ 1 か所）。型 Rounding と calc.ts は土台。 */
export const ROUNDING_OPTIONS: readonly { value: Rounding; label: string }[] = [
  { value: 'floor', label: '切り捨て' },
  { value: 'round', label: '四捨五入' },
  { value: 'ceil', label: '切り上げ' },
]

export const NOTIFY_LABEL = 'メールで知らせる場面'
export type NotifyKey = keyof Settings['notify']
/** 通知の選択肢の定義。状況の語は parts/status.ts から引く（L-13）。 */
export const NOTIFY_OPTIONS: readonly { key: NotifyKey; label: string }[] = [
  { key: 'onPaid', label: `請求書が${invoiceStatusDef.paid.label}になったとき` },
  { key: 'onOverdue', label: `請求書が${invoiceStatusDef.overdue.label}になったとき` },
  { key: 'weeklySummary', label: '1週間のまとめ（週に1回）' },
]
