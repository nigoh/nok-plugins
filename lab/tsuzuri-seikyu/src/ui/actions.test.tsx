import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button, ButtonLink, IconButton, Spinner } from '.'

describe('[CMP-001] Button', () => {
  it('[REQ-007] 種類と文言で見つかり、押すと呼ばれる', async () => {
    const onClick = vi.fn()
    render(<Button variant="primary" onClick={onClick}>保存する</Button>)
    await userEvent.click(screen.getByRole('button', { name: '保存する' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
  it('[REQ-009] 処理中は押しても呼ばれず、名前が処理中の文言に変わる', async () => {
    const onClick = vi.fn()
    render(<Button busy busyLabel="保存しています" onClick={onClick}>保存する</Button>)
    const b = screen.getByRole('button', { name: '保存しています' })
    expect(b).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(b)
    expect(onClick).not.toHaveBeenCalled()
  })
  it('[REQ-007] 押せないときは disabled', () => {
    render(<Button disabled>送る</Button>)
    expect(screen.getByRole('button', { name: '送る' })).toBeDisabled()
  })
})

describe('[CMP-023] ButtonLink', () => {
  it('[REQ-001] 行き先を持つリンクとして読み上げられる', () => {
    render(<ButtonLink href="?screen=invoices">請求書へ</ButtonLink>)
    expect(screen.getByRole('link', { name: '請求書へ' })).toHaveAttribute('href', '?screen=invoices')
  })
})

describe('[CMP-002] IconButton', () => {
  it('[REQ-007] 読み上げ名で見つかる', () => {
    render(<IconButton label="閉じる" icon="x" />)
    expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
  })
})

describe('[CMP-028] Spinner', () => {
  it('[REQ-008] 読み上げには出さない（文言は隣に置く）', () => {
    const { container } = render(<Spinner />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
