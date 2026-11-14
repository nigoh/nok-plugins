import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeSave, outcomeOf, SAVE_WAIT_MS } from './fakeSave'
import { ERROR_MESSAGE, READ_RETRIES, useFake } from './useFake'

afterEach(() => vi.useRealTimers())

describe('[MOD-005] fakeSave：偽の保存', () => {
  it('[REQ-014] 待ちは SAVE_WAIT_MS の 1 つ。それより前には返らず、成功は値を返す', async () => {
    vi.useFakeTimers()
    let done: unknown = null
    void fakeSave({ id: 1 }).then((r) => { done = r })
    await vi.advanceTimersByTimeAsync(SAVE_WAIT_MS - 1)
    expect(done).toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toEqual({ ok: true, value: { id: 1 } })
    expect(SAVE_WAIT_MS).toBe(600)
  })
  it('[REQ-014] 失敗と競合は引数で作れる（例外にせず値で返る）。競合は相手の内容を持てる', async () => {
    vi.useFakeTimers()
    const failed = fakeSave('mine', { outcome: 'failed' })
    const conflict = fakeSave('mine', { outcome: 'conflict', theirs: 'theirs' })
    await vi.advanceTimersByTimeAsync(SAVE_WAIT_MS)
    expect(await failed).toEqual({ ok: false, reason: 'failed' })
    expect(await conflict).toEqual({ ok: false, reason: 'conflict', theirs: 'theirs' })
  })
  it('[REQ-014] 画面の状態名から結果を決める：save_failed は失敗、conflict は競合、ほかは成功', () => {
    expect(outcomeOf('save_failed')).toBe('failed')
    expect(outcomeOf('conflict')).toBe('conflict')
    for (const s of ['default', 'saving', 'invalid', 'confirming']) expect(outcomeOf(s)).toBe('ok')
  })
})

describe('[REQ-008] useFake：save_failed と自動の再試行', () => {
  const make = (s: string) => ({ s })
  it('save_failed は読み込み成功のまま state だけ渡す（データは default）', () => {
    const r = renderHook(() => useFake('save_failed', make)).result.current
    expect(r.kind === 'ready' && r.state).toBe('save_failed')
    expect(r.kind === 'ready' && r.data).toEqual({ s: 'default' })
  })
  it('既定では error はすぐ error（自動の再試行は opt-in）', () => {
    expect(renderHook(() => useFake('error', make)).result.current.kind).toBe('error')
  })
  it('autoRetry：読むだけの失敗は 2 回まで静かにやり直し（loading）、なお失敗なら error を出す', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useFake('error', make, ERROR_MESSAGE, { autoRetry: true }))
    expect(READ_RETRIES).toBe(2)
    expect(result.current.kind).toBe('loading')
    act(() => { vi.advanceTimersByTime(600) })
    expect(result.current.kind).toBe('loading')
    act(() => { vi.advanceTimersByTime(600) })
    expect(result.current.kind).toBe('error')
    const e = result.current
    if (e.kind !== 'error') return
    expect(e.message).toBe(ERROR_MESSAGE)
    act(() => e.retry())
    act(() => { vi.advanceTimersByTime(700) })
    expect(result.current.kind).toBe('ready')
  })
  it('autoRetry は書く操作の状態（save_failed・saving）には働かない', () => {
    const r = renderHook(() => useFake('save_failed', make, ERROR_MESSAGE, { autoRetry: true })).result.current
    expect(r.kind).toBe('ready')
  })
})
