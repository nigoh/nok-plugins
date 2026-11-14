import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Dialog, EmptyState, ErrorState, Notice, Skeleton, StatusTag, Stepper, ToastProvider, useToast } from '.'
import { useState } from 'react'

afterEach(() => vi.useRealTimers())

describe('[CMP-004] Notice', () => {
  it('[REQ-008] 失敗は alert、ほかは status で伝える', () => {
    render(<><Notice tone="fail">失敗</Notice><Notice tone="info">案内</Notice></>)
    expect(screen.getByRole('alert')).toHaveTextContent('失敗')
    expect(screen.getByRole('status')).toHaveTextContent('案内')
  })
})

describe('[CMP-003] StatusTag', () => {
  it('[REQ-002] 色だけでなく言葉を持つ', () => {
    render(<StatusTag tone="done">入金済み</StatusTag>)
    expect(screen.getByText('入金済み')).toBeInTheDocument()
  })
})

describe('[CMP-003] StatusTag の調子と絵（color-state.md C-04・C-08）', () => {
  const tones = ['wait', 'progress', 'fail', 'done', 'calm', 'draft'] as const
  it('[REQ-002] 6 つの調子は絵がすべて別で、札の中の絵は回らない', () => {
    const { container } = render(<>{tones.map((t) => <StatusTag key={t} tone={t}>{t}</StatusTag>)}</>)
    const paths = [...container.querySelectorAll('[data-cmp="CMP-003"]')].map((el) => el.querySelector('svg')?.innerHTML)
    expect(new Set(paths).size).toBe(6)
    for (const svg of container.querySelectorAll('[data-cmp="CMP-003"] svg')) expect(svg.getAttribute('class') ?? '').not.toMatch(/animate|spin/)
  })
  it('[REQ-002] 静かな札は地を外すが、絵と言葉は残す', () => {
    render(<StatusTag tone="done" density="quiet">入金済み</StatusTag>)
    const el = screen.getByText('入金済み')
    expect(el.className).not.toMatch(/bg-ok-soft/)
    expect(el.querySelector('svg')).not.toBeNull()
  })
})

describe('[CMP-013] Skeleton', () => {
  it('[REQ-008] 読み込み中を status で伝える', () => {
    render(<Skeleton />)
    expect(screen.getByRole('status')).toHaveTextContent('読み込んでいます')
  })
})

describe('[CMP-014] EmptyState', () => {
  it('[REQ-008] 何が無いかと次の一手を出す', () => {
    render(<EmptyState title="請求書はまだありません" action={<button>請求書を作る</button>} />)
    expect(screen.getByText('請求書はまだありません')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '請求書を作る' })).toBeInTheDocument()
  })
})

describe('[CMP-015] ErrorState', () => {
  it('[REQ-008] alert で伝え、再試行できる', async () => {
    const retry = vi.fn()
    render(<ErrorState description="通信できませんでした。もう一度読み込んでください。" onRetry={retry} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'もう一度読み込む' }))
    expect(retry).toHaveBeenCalled()
  })
})

describe('[CMP-017] Stepper', () => {
  it('[REQ-026] 現在地を aria-current で示す', () => {
    render(<Stepper label="進み具合" steps={['自社の情報', '請求の決まり', '最初の取引先']} current={2} />)
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('請求の決まり')
  })
})

describe('[CMP-012] Dialog の操作帯（form.md F-10）', () => {
  it('[REQ-015] やめる→主の順（DOM も同じ）', () => {
    render(<Dialog open onClose={() => {}} title="請求書を取り消しますか" secondary={<button>やめる</button>} primary={<button>請求書を取り消す</button>}>本文</Dialog>)
    const names = within(screen.getByRole('dialog')).getAllByRole('button').map((b) => b.textContent)
    expect(names.slice(-2)).toEqual(['やめる', '請求書を取り消す'])
  })
})

describe('[CMP-012] Dialog', () => {
  function Host() {
    const [open, setOpen] = useState(false)
    return <><button onClick={() => setOpen(true)}>開く</button><Dialog open={open} onClose={() => setOpen(false)} title="確認">中身</Dialog></>
  }
  it('[REQ-015] 開くと名前つきの窓が出て、閉じるで消える', async () => {
    render(<Host />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '開く' }))
    expect(screen.getByRole('dialog', { name: '確認' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('[CMP-016] Toast', () => {
  function Host() {
    const t = useToast()
    return <button onClick={() => t.show({ message: '保存しました', tone: 'ok' })}>出す</button>
  }
  it('[REQ-008] 出して、しばらくして消える', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<ToastProvider><Host /></ToastProvider>)
    await userEvent.click(screen.getByRole('button', { name: '出す' }))
    expect(screen.getByRole('status')).toHaveTextContent('保存しました')
    await act(async () => { vi.advanceTimersByTime(7000) })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
