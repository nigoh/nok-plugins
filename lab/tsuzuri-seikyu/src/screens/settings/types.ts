import type { Company, Rounding, Settings } from '../../data'

/** この画面の入力の形。自社の情報（Company の全部）・番号の頭・端数処理・通知を 1 枚にしたもの。 */
export type Values = Company & { numberPrefix: string; rounding: Rounding } & Settings['notify']

/** 文字を入れる欄の名前。欄の定義（fields.ts）はこの全部に 1 行ずつある。 */
export type TextKey = keyof Company | 'numberPrefix'

/** 欄ごとの誤りの文と、半角へ直したときの知らせ。 */
export type Errors = Partial<Record<TextKey, string>>
export type Notes = Partial<Record<TextKey, string>>

/** 別の人が先に更新したとき。at は更新の時刻（UTC の ISO）、base は自分が読み込んだ版、theirs は相手の内容。 */
export type Conflict = { at: string; base: Values; theirs: Values }

export type SaveInput = { values: Values; baseVersion: number; force?: boolean }
export type SaveResult =
  | { kind: 'ok'; version: number }
  | { kind: 'fail' }
  | { kind: 'conflict'; at: string; theirs: Values; version: number }
/** 保存の真似。本物の API に替えるときはここの型のまま差し替える。 */
export type Saver = (input: SaveInput) => Promise<SaveResult>

/** 画面を開いたときの材料（状態ごとに scenario.ts が作る）。 */
export type Scenario = {
  /** 保存済み（読み込んだ版）の値と版 */
  saved: Values
  version: number
  /** 開いたときの入力。保存済みと同じなら未保存の変更は無い。 */
  mine: Values
  /** 今年すでに番号が付いた請求書の数（次の番号の例に使う） */
  issuedThisYear: number
  conflict: Conflict | null
  /** 開いた直後に窓を出す（番号を変える前の確かめの見本） */
  dialog: 'numbering' | null
  /** 保存の最中の見本 */
  saving: boolean
  /** 開いた直後に誤りを出す（送ったあとの見本） */
  showErrors: boolean
  /** 保存に失敗したあとの見本（?state=save_failed）。入力は残り、保存の操作はまた失敗する */
  saveFailed: boolean
}
