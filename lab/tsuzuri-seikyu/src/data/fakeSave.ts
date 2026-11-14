/**
 * [MOD-005] 偽の保存。通信はしない。待ちを置いて、成功・失敗・競合のどれかを返す（結果は例外にせず値で返す）。
 * 保存先を本物に替えるときは、この関数を同じ戻り値の本物に替える（画面は変えない）。
 * 画面ごとに作られていた 6 つの保存の真似（待ちが 600ms と 700ms で理由なし）を 1 つにした。
 */

/** 偽の保存の待ち。画面で時間を決めない（待ちは 1 つ。テストは fake timers でこの値だけ進める）。 */
export const SAVE_WAIT_MS = 600

export type FakeSaveOutcome = 'ok' | 'failed' | 'conflict'
export type FakeSaveResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'failed' }
  | { ok: false; reason: 'conflict'; theirs?: T }

export type FakeSaveOptions<T> = {
  /** 結果。既定は成功。 */
  outcome?: FakeSaveOutcome
  /** 競合のとき、相手が先に書いた内容（「相手の内容を使う」で見せる）。 */
  theirs?: T
}

/** 画面の状態名から結果を決める。save_failed → 失敗、conflict → 競合、それ以外 → 成功。画面は state をそのまま渡す。 */
export function outcomeOf(state: string): FakeSaveOutcome {
  return state === 'save_failed' ? 'failed' : state === 'conflict' ? 'conflict' : 'ok'
}

/** 値を保存したことにして返す。SAVE_WAIT_MS 待つ。 */
export function fakeSave<T>(value: T, options: FakeSaveOptions<T> = {}): Promise<FakeSaveResult<T>> {
  const { outcome = 'ok', theirs } = options
  return new Promise((resolve) => {
    window.setTimeout(() => {
      if (outcome === 'failed') resolve({ ok: false, reason: 'failed' })
      else if (outcome === 'conflict') resolve({ ok: false, reason: 'conflict', theirs })
      else resolve({ ok: true, value })
    }, SAVE_WAIT_MS)
  })
}
