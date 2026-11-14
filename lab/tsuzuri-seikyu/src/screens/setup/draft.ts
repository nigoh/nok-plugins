import type { Draft } from './model'

/**
 * 途中でやめたときの入力の保存先（仮）。取得の層に保存先が無いので、この画面のフォルダのメモリで代える。
 * 本物の保存（サーバーなど）に替えるときはこのファイルと saveSetup.ts だけを替える（画面は変えない）。
 */
let current: Draft | null = null

export const loadDraft = (): Draft | null => current
export const saveDraft = (draft: Draft): void => { current = draft }
export const clearDraft = (): void => { current = null }
