import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFake } from './useFake'

afterEach(() => vi.useRealTimers())

describe('[MOD-007] [REQ-008] useFake：状態名から 待ち・空・失敗・成功', () => {
  const make = (s: string) => ({ s })
  it('loading / empty / ready / many', () => {
    expect(renderHook(() => useFake('loading', make)).result.current.kind).toBe('loading')
    expect(renderHook(() => useFake('empty', make)).result.current.kind).toBe('empty')
    const r = renderHook(() => useFake('many', make)).result.current
    expect(r.kind === 'ready' && r.data).toEqual({ s: 'many' })
  })
  it('error は再試行で待ちを経て立ち直る', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useFake('error', make))
    expect(result.current.kind).toBe('error')
    act(() => { if (result.current.kind === 'error') result.current.retry() })
    expect(result.current.kind === 'error' && result.current.retrying).toBe(true)
    act(() => { vi.advanceTimersByTime(700) })
    expect(result.current.kind).toBe('ready')
  })
})

describe('[REQ-008] useFake：共通の状態の語彙（states.md E-02・E-04・E-05）', () => {
  const made: string[] = []
  const make = (s: string) => { made.push(s); return { s } }
  it('filtered_empty は 0 件の一種（条件が違う）。make は呼ばない', () => {
    made.length = 0
    const r = renderHook(() => useFake('filtered_empty', make)).result.current
    expect(r).toEqual({ kind: 'empty', state: 'filtered_empty' })
    expect(renderHook(() => useFake('empty', make)).result.current).toEqual({ kind: 'empty', state: 'empty' })
    expect(made).toEqual([])
  })
  it('refreshing は前のデータを持った待ち（骨組みにしない）', () => {
    const r = renderHook(() => useFake('refreshing', make)).result.current
    expect(r.kind).toBe('refreshing')
    expect(r.kind === 'refreshing' && r.data).toEqual({ s: 'refreshing' })
  })
  it('stale は前のデータと時刻を持った失敗。再試行で default に立ち直る', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useFake('stale', make))
    const r = result.current
    expect(r.kind).toBe('stale')
    if (r.kind !== 'stale') return
    expect(r.data).toEqual({ s: 'stale' })
    expect(r.asOf).toBe('2026-11-13T00:30:00.000Z')
    expect(r.message).toMatch(/もう一度/)
    act(() => r.retry())
    expect(result.current.kind === 'stale' && result.current.retrying).toBe(true)
    act(() => { vi.advanceTimersByTime(700) })
    const after = result.current
    expect(after.kind === 'ready' && after.state).toBe('default')
  })
  it.each(['invalid', 'saving', 'done', 'resumed', 'conflict', 'expired', 'status_overdue', 'mode_edit', 'step_2', 'zip_many', 'zip_empty', 'zip_error', 'candidates_empty', 'todo_empty', 'partial', 'confirming'])('%s は成功として返り、画面が state を見て描き分ける', (state) => {
    const r = renderHook(() => useFake(state, (s) => ({ s }))).result.current
    expect(r.kind === 'ready' && r.state).toBe(state)
    expect(r.kind === 'ready' && r.data).toEqual({ s: state })
  })
})
