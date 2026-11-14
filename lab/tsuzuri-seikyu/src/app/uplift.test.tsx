import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Button } from '../ui'
import { AppShell } from './AppShell'
import { paramNumber, replace, replaceParams, useUrlParam } from './nav'
import { RefreshingNote, StaleNotice } from './StaleNotice'
import { actions, messages } from './terms'

function setWidth(px: number) {
  window.matchMedia = ((q: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(q)?.[1] ?? 0)
    return { matches: px >= min, media: q, addEventListener: () => {}, removeEventListener: () => {} }
  }) as unknown as typeof window.matchMedia
}
afterEach(() => { Reflect.deleteProperty(window, 'matchMedia'); vi.unstubAllGlobals() })

const shell = (props: Partial<Parameters<typeof AppShell>[0]> = {}) => (
  <AppShell data-scr="SCR-006" state="default" states={['default']} title="取引先の登録" current="clients" kind="form" {...props}>
    <p>中身</p>
  </AppShell>
)
const at = (search: string) => window.history.replaceState(null, '', search)

describe('[MOD-003] nav：履歴を積まない移動と URL の値', () => {
  beforeEach(() => at('?screen=clients'))
  it('[REQ-027] replace は履歴を積まず、URL を置き換える', () => {
    const before = window.history.length
    replace('clients', { q: 'ほくと' })
    expect(window.location.search).toBe('?screen=clients&q=%E3%81%BB%E3%81%8F%E3%81%A8')
    expect(window.history.length).toBe(before)
  })
  it('[REQ-027] replaceParams は screen・state など、ほかの値を残して書き換え、空か null は外す', () => {
    at('?screen=invoices&state=many&page=3')
    replaceParams({ page: '2', q: '北斗' })
    expect(new URLSearchParams(window.location.search).get('state')).toBe('many')
    expect(new URLSearchParams(window.location.search).get('page')).toBe('2')
    replaceParams({ page: null, q: '' })
    expect(window.location.search).toBe('?screen=invoices&state=many')
  })
  it('[REQ-027] useUrlParam は既定の値を URL に書かず、描き直しで読み直し、履歴を積まない', () => {
    at('?screen=report')
    const before = window.history.length
    const { result } = renderHook(() => useUrlParam('period', '12m'))
    expect(result.current[0]).toBe('12m')
    act(() => result.current[1]('6m'))
    expect(result.current[0]).toBe('6m')
    expect(window.location.search).toBe('?screen=report&period=6m')
    act(() => result.current[1]('12m'))
    expect(result.current[0]).toBe('12m')
    expect(window.location.search).toBe('?screen=report')
    act(() => result.current[1]('3m'))
    act(() => result.current[1](null))
    expect(window.location.search).toBe('?screen=report')
    expect(window.history.length).toBe(before)
  })
  it('[REQ-027] ブラウザの戻る・進む（popstate）で値が URL に合う', () => {
    at('?screen=report&period=6m')
    const { result } = renderHook(() => useUrlParam('period', '12m'))
    expect(result.current[0]).toBe('6m')
    at('?screen=report&period=3m')
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(result.current[0]).toBe('3m')
  })
  it('[REQ-027] paramNumber は 1 以上の整数だけ読む', () => {
    expect([paramNumber('3'), paramNumber('0'), paramNumber('abc'), paramNumber('1.5'), paramNumber('', 1)]).toEqual([3, 1, 1, 1, 1])
  })
})

describe('[MOD-004] 離れる確かめ（AppShell が持つ。画面は dirty を渡すだけ）', () => {
  beforeEach(() => { at('?screen=client-form'); setWidth(1280) })
  const menu = () => within(screen.getByRole('navigation', { name: '主なメニュー' })).getByRole('link', { name: '請求書' })

  it('[REQ-001] 変更がなければ確かめずに移る', async () => {
    render(shell({ dirty: false }))
    await userEvent.click(menu())
    expect(window.location.search).toBe('?screen=invoices')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('[REQ-001] 変更があれば、メニュー・戻りのリンクで窓が出て、移らない。窓の順は 離れる→入力に戻る→保存して離れる', async () => {
    render(shell({ dirty: true, back: { to: 'clients', label: '取引先' }, onSaveBeforeLeave: () => true }))
    await userEvent.click(menu())
    expect(window.location.search).toBe('?screen=client-form')
    const dialog = await screen.findByRole('dialog', { name: messages.leave.title })
    const order = [actions.discardAndLeave, actions.backToInput, actions.saveAndLeave].map((n) => within(dialog).getByRole('button', { name: new RegExp(n) }))
    expect(order[0].compareDocumentPosition(order[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(order[1].compareDocumentPosition(order[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: actions.discardAndLeave })).toHaveAttribute('data-variant', 'danger')
    expect(within(dialog).getByRole('button', { name: actions.saveAndLeave })).toHaveAttribute('data-variant', 'primary')
    await userEvent.click(within(dialog).getByRole('button', { name: actions.backToInput }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await userEvent.click(within(screen.getByRole('main')).getByRole('link', { name: '取引先' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(window.location.search).toBe('?screen=client-form')
  })
  it('[REQ-001] 保存せず離れる で行き先へ移る', async () => {
    render(shell({ dirty: true }))
    await userEvent.click(menu())
    await userEvent.click(await screen.findByRole('button', { name: actions.discardAndLeave }))
    expect(window.location.search).toBe('?screen=invoices')
  })
  it('[REQ-001] 保存して離れる は保存できたときだけ移る。失敗なら窓を閉じて画面に残る', async () => {
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    render(shell({ dirty: true, onSaveBeforeLeave: save }))
    await userEvent.click(menu())
    await userEvent.click(await screen.findByRole('button', { name: actions.saveAndLeave }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(save).toHaveBeenCalledTimes(1)
    expect(window.location.search).toBe('?screen=client-form')
    await userEvent.click(menu())
    await userEvent.click(await screen.findByRole('button', { name: actions.saveAndLeave }))
    await waitFor(() => expect(window.location.search).toBe('?screen=invoices'))
  })
  it('[REQ-001] 保存の手段が無い画面は「保存して離れる」を出さず、主が「入力に戻る」', async () => {
    render(shell({ dirty: true }))
    await userEvent.click(menu())
    const dialog = await screen.findByRole('dialog', { name: messages.leave.titlePlain })
    expect(within(dialog).queryByRole('button', { name: actions.saveAndLeave })).toBeNull()
    expect(within(dialog).getByRole('button', { name: actions.backToInput })).toHaveAttribute('data-variant', 'primary')
  })
  it('[REQ-001] 修飾キー付き・同じ URL へのリンクは止めない', async () => {
    render(shell({ dirty: true, back: { to: 'client-form', label: '同じ画面' } }))
    const link = menu()
    window.addEventListener('click', (e) => e.preventDefault(), { once: true }) // jsdom が実際に移ろうとするのを止める（止めるのはガードのあと）
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.location.search).toBe('?screen=client-form')
    await userEvent.click(within(screen.getByRole('main')).getByRole('link', { name: '同じ画面' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('[REQ-001] ブラウザの戻る：変更があれば窓が出て画面は動かない。入力に戻るで残り、離れるで 2 つ戻る', async () => {
    at('?screen=home')
    window.history.pushState(null, '', '?screen=client-form')
    render(shell({ dirty: true }))
    window.history.back()
    const dialog = await screen.findByRole('dialog')
    expect(window.location.search).toBe('?screen=client-form')
    await userEvent.click(within(dialog).getByRole('button', { name: actions.backToInput }))
    expect(window.location.search).toBe('?screen=client-form')
    window.history.back()
    await userEvent.click(await screen.findByRole('button', { name: actions.discardAndLeave }))
    await waitFor(() => expect(window.location.search).toBe('?screen=home'))
  })
  it('[REQ-001] 変更がなければ、ブラウザの戻るは窓を出さない', async () => {
    at('?screen=home')
    window.history.pushState(null, '', '?screen=client-form')
    render(shell({ dirty: false }))
    window.history.back()
    await waitFor(() => expect(window.location.search).toBe('?screen=home'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('[CMP-020] AppShell：下に固定する帯と副の操作', () => {
  beforeEach(() => at('?screen=client-form'))
  it('[REQ-001] 副は 2 つまで置け、DOM の順は 副→副→主。帯は副が上の段・主が下の段いっぱい（768px 未満）', () => {
    setWidth(375)
    const { container } = render(shell({ secondary: [<Button key="a">やめる</Button>, <Button key="b">下書きを保存する</Button>], primary: <Button variant="primary">取引先を登録する</Button> }))
    const bar = container.querySelector('[data-bar]')!
    expect(within(bar as HTMLElement).getAllByRole('button').map((b) => b.textContent)).toEqual(['やめる', '下書きを保存する', '取引先を登録する'])
    expect(bar.className).toMatch(/grid-cols-2/)
    expect(bar.className).toMatch(/\*:last:col-span-2/)
  })
  it('[REQ-001] 副が 1 つのときは 2 列、広い幅では末尾の右に 副→主', () => {
    setWidth(375)
    const { container } = render(shell({ secondary: <Button>やめる</Button>, primary: <Button variant="primary">登録</Button> }))
    expect(container.querySelector('[data-bar]')!.className).toMatch(/grid-flow-col/)
    setWidth(1280)
    const wide = render(shell({ secondary: [<Button key="a">やめる</Button>, <Button key="b">下書きを保存する</Button>], primary: <Button variant="primary">登録</Button> }))
    const end = wide.container.querySelector('[data-actions="end"]')!
    expect(within(end as HTMLElement).getAllByRole('button').map((b) => b.textContent)).toEqual(['やめる', '下書きを保存する', '登録'])
  })
  it('[REQ-001] 帯の高さを測って、本文の下の余白（スペーサー）を決める。帯が高くなると余白も追う', () => {
    setWidth(375)
    let height = 72
    let notify: () => void = () => {}
    vi.stubGlobal('ResizeObserver', class { constructor(cb: () => void) { notify = cb } observe() {} disconnect() {} })
    const spec = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return (this as HTMLElement).hasAttribute('data-bar') ? height : 0 } })
    try {
      const { container } = render(shell({ primary: <Button variant="primary">取引先を登録する</Button> }))
      const root = container.querySelector('[data-cmp="CMP-020"]') as HTMLElement
      expect(root.style.getPropertyValue('--bar-h')).toBe('72px')
      expect(container.querySelector('[data-bar-spacer]')).not.toBeNull()
      height = 116
      act(() => notify())
      expect(root.style.getPropertyValue('--bar-h')).toBe('116px')
    } finally {
      if (spec) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', spec)
      else Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight')
    }
  })
  it('[REQ-001] 帯が無い幅（768px 以上）ではスペーサーを置かない', () => {
    setWidth(1280)
    const { container } = render(shell({ primary: <Button variant="primary">登録</Button> }))
    expect(container.querySelector('[data-bar-spacer]')).toBeNull()
  })
})

describe('[CMP-040] StaleNotice・RefreshingNote', () => {
  it('[REQ-008] 古い内容：時刻つきの題と標準の 1 文、もう一度読み込む。押すと retry', async () => {
    const retry = vi.fn()
    render(<StaleNotice asOf="2026-11-13T00:30:00.000Z" retry={retry} />)
    expect(screen.getByRole('status')).toHaveTextContent('09:30時点の内容です')
    expect(screen.getByText(messages.staleBody)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: actions.retry }))
    expect(retry).toHaveBeenCalled()
  })
  it('[REQ-008] 画面固有の補足で標準の 1 文を差し替えられ、再読み込み中は押せない', () => {
    render(<StaleNotice asOf="2026-11-13T00:30:00.000Z" retry={() => {}} retrying>未入金額は更新前の金額です。</StaleNotice>)
    expect(screen.getByText('未入金額は更新前の金額です。')).toBeInTheDocument()
    expect(screen.queryByText(messages.staleBody)).toBeNull()
    expect(screen.getByRole('button', { name: /読み込んでいます|もう一度読み込む/ })).toHaveAttribute('aria-busy', 'true')
  })
  it('[REQ-008] 更新中：標準の 1 文を role=status で。理由を続けられる', () => {
    const { rerender } = render(<RefreshingNote />)
    expect(screen.getByRole('status')).toHaveTextContent(`${messages.refreshing}`)
    rerender(<RefreshingNote>更新が終わるまで、並び順は変えられません</RefreshingNote>)
    expect(screen.getByRole('status')).toHaveTextContent('更新しています。更新が終わるまで、並び順は変えられません')
  })
})
