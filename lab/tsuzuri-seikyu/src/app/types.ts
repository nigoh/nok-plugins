import type { ComponentType } from 'react'

/** 画面の種類。view＝見る画面・一覧、form＝入力画面（主操作の置き場所が違う。form.md F-10）。 */
export type ScreenKind = 'view' | 'form'

export type ScreenDef = {
  /** screens.yaml の SCR-ID */
  id: string
  /** URL の ?screen= に使う名前 */
  slug: string
  /** 画面の呼び名（screens.yaml の terms に合わせる） */
  title: string
  /** 画面の種類。screens.yaml の kind と同じ。 */
  kind: ScreenKind
  /** この画面が持つ状態。先頭が既定。 */
  states: string[]
  Component: ComponentType<{ state: string }>
}
