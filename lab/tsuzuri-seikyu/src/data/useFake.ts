import { useEffect, useState } from 'react'
import { NOW } from './clock'

/**
 * 取得の真似が返す形。画面は kind で描き分ける（真偽値を並べない：S-07）。
 * - empty：データが無い。state が 'empty'（初回・片付いた）か 'filtered_empty'（条件に合う物が無い）かで文と次の一手が違う（E-05）。
 * - refreshing：待ちだが前のデータがある（並べ替え・ページ送り・再読み込み）。前のデータを残し、骨組みは出さない（E-04）。
 * - stale：更新に失敗したが前のデータがある。asOf の時点の内容と知らせ、お金・番号・期限を確定する操作は止める（E-04）。
 */
export type Fake<T> =
  | { kind: 'loading' }
  | { kind: 'empty'; state: 'empty' | 'filtered_empty' }
  | { kind: 'error'; message: string; retry: () => void; retrying: boolean }
  | { kind: 'refreshing'; state: string; data: T }
  | { kind: 'stale'; state: string; data: T; asOf: string; message: string; retry: () => void; retrying: boolean }
  | { kind: 'ready'; state: string; data: T }

/** 失敗から「もう一度」で立ち直るまでの見せかけの待ち。 */
const RETRY_MS = 600

/** 読むだけの失敗を、画面が知らせる前に自動でやり直す回数（E-07）。書く操作（保存・送る）は自動で繰り返さない。 */
export const READ_RETRIES = 2

/** 失敗の既定の文。何が起きたか＋どう直すか。 */
export const ERROR_MESSAGE = '通信がうまくいきませんでした。しばらくしてから、もう一度読み込んでください。'

export type FakeOptions = {
  /**
   * 読むだけの取得（state=error）を、失敗とみなす前に READ_RETRIES 回まで自動でやり直す（E-07）。
   * やり直している間は kind=loading を返し、使い切ると kind=error（retry は手でのやり直し）。既定は false（すぐ error）。
   */
  autoRetry?: boolean
}

type Recovery = { state: string; phase: 'retrying' | 'recovered' }

/**
 * 状態名から 待ち / 空 / 失敗 / 成功 を返す取得の真似（M-09・T-07）。通信はしない。
 * - 'loading'        … いつまでも待ち（骨組みの確かめ用）
 * - 'empty'          … 空（make は呼ばない）
 * - 'filtered_empty' … 条件に合う物が 0 件（make は呼ばない。条件を外す導線を出す）
 * - 'error'          … 失敗。retry を呼ぶと待ちを経て default の成功に立ち直る
 * - 'refreshing'     … 待ち＋前のデータ（make の結果を返す。いつまでも更新中）
 * - 'stale'          … 失敗＋前のデータ（make の結果と asOf を返す。retry で default に立ち直る）
 * - 'save_failed'    … 読み込みは成功（make('default')）。state='save_failed' を画面に渡す。画面は保存の操作で fakeSave(…, { outcome: outcomeOf(state) }) を使う
 * - それ以外         … make(状態名) の結果を成功として返す。画面固有の状態（many・partial・invalid・saving・conflict・expired・
 *                       status_＊・mode_＊・step_N・zip_＊・todo_empty・candidates_empty など）は make と画面が state を見て作る
 * make は見本を返すだけの軽い関数にする。絞り込みや並べ替えは返った data を画面で加工する。
 */
export function useFake<T>(state: string, make: (state: string) => T, errorMessage = ERROR_MESSAGE, options: FakeOptions = {}): Fake<T> {
  const [recovery, setRecovery] = useState<Recovery | null>(null)
  const mine = recovery && recovery.state === state ? recovery.phase : null
  useEffect(() => {
    if (mine !== 'retrying') return
    const t = window.setTimeout(() => setRecovery({ state, phase: 'recovered' }), RETRY_MS)
    return () => window.clearTimeout(t)
  }, [mine, state])

  // 自動のやり直し：読むだけの失敗（error）を 2 回まで静かにやり直し、なお失敗なら画面に出す。
  const [auto, setAuto] = useState({ state, tries: 0 })
  const tries = auto.state === state ? auto.tries : 0
  const autoRetrying = Boolean(options.autoRetry) && state === 'error' && mine === null && tries < READ_RETRIES
  useEffect(() => {
    if (!autoRetrying) return
    const t = window.setTimeout(() => setAuto({ state, tries: tries + 1 }), RETRY_MS)
    return () => window.clearTimeout(t)
  }, [autoRetrying, state, tries])

  const retry = () => setRecovery({ state, phase: 'retrying' })
  if (state === 'loading' || autoRetrying) return { kind: 'loading' }
  if (state === 'empty' || state === 'filtered_empty') return { kind: 'empty', state }
  if (state === 'error' && mine !== 'recovered') return { kind: 'error', message: errorMessage, retrying: mine === 'retrying', retry }
  if (state === 'stale' && mine !== 'recovered') {
    return { kind: 'stale', state, data: make(state), asOf: NOW.toISOString(), message: errorMessage, retrying: mine === 'retrying', retry }
  }
  if (state === 'refreshing') return { kind: 'refreshing', state, data: make(state) }
  // save_failed は「保存・送る・記録が通信で失敗した」見え方。読み込みは成功しているので、データは default のまま、state だけ画面に渡す。
  const shown = state === 'error' || state === 'stale' ? 'default' : state
  return { kind: 'ready', state: shown, data: make(state === 'save_failed' ? 'default' : shown) }
}
