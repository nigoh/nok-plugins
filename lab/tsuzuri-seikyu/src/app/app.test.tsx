import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'
import { Link } from './Link'
import { navItems, screenNames } from './terms'
import { Button } from '../ui'

const shell = (props: Partial<Parameters<typeof AppShell>[0]> = {}) => (
  <AppShell data-scr="SCR-001" state="default" states={['default']} title="請求書" current="invoices" kind="view" primary={<Button variant="primary">請求書を作る</Button>} {...props}>
    <p>中身</p>
  </AppShell>
)

/** 画面の幅を替える（jsdom には matchMedia が無い）。(min-width: Npx) の問いにだけ答える。 */
function setWidth(px: number) {
  window.matchMedia = ((q: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(q)?.[1] ?? 0)
    return { matches: px >= min, media: q, addEventListener: () => {}, removeEventListener: () => {} }
  }) as unknown as typeof window.matchMedia
}
afterEach(() => { Reflect.deleteProperty(window, 'matchMedia') })
const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe('[CMP-020] AppShell', () => {
  it('[REQ-001] main は 1 つ、h1 は画面の題、メニューは決まった並びで現在地を示す', () => {
    render(shell())
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: '請求書' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: '主なメニュー' })
    const names = within(nav).getAllByRole('link').map((a) => a.textContent)
    expect(names).toEqual(navItems.map((n) => screenNames[n.slug]))
    expect(within(nav).getByRole('link', { name: '請求書' })).toHaveAttribute('aria-current', 'page')
  })
  it('[REQ-001] 主操作は 1 か所に置かれ、題名がタブの題になる', () => {
    render(shell({ back: { to: 'home', label: 'ホーム' } }))
    expect(screen.getAllByRole('button', { name: '請求書を作る' })).toHaveLength(1)
    expect(document.title).toBe('請求書 | つづり請求')
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'ホーム' })).toHaveAttribute('href', '?screen=home')
  })
  it('[REQ-027] data 属性で画面と状態が分かる', () => {
    const { container } = render(shell())
    const root = container.querySelector('[data-scr]')
    expect(root).toHaveAttribute('data-scr', 'SCR-001')
    expect(root).toHaveAttribute('data-state', 'default')
  })
})

describe('[CMP-020] 主操作の置き場所（form.md F-10）', () => {
  const both = { secondary: <Button>やめる</Button>, primary: <Button variant="primary">登録する</Button> }
  it('[REQ-001] 見る画面は 768px 以上で見出しの右。やめる→主の順', () => {
    setWidth(1280)
    const { container } = render(shell({ kind: 'view', ...both }))
    const head = container.querySelector('[data-cmp="CMP-018"]') as HTMLElement
    const buttons = within(head).getAllByRole('button').map((b) => b.textContent)
    expect(buttons).toEqual(['やめる', '登録する'])
  })
  it('[REQ-001] 入力画面は 768px 以上で入力の末尾の右。見出しの右には置かない', () => {
    setWidth(1280)
    const { container } = render(shell({ kind: 'form', ...both }))
    const head = container.querySelector('[data-cmp="CMP-018"]') as HTMLElement
    expect(within(head).queryByRole('button')).not.toBeInTheDocument()
    const end = container.querySelector('[data-actions="end"]') as HTMLElement
    expect(within(end).getAllByRole('button').map((b) => b.textContent)).toEqual(['やめる', '登録する'])
    expect(follows(screen.getByText('中身'), end)).toBe(true)
    expect(end.className).toContain('justify-end')
    expect(container.querySelector('[data-kind="form"]')).not.toBeNull()
  })
  it.each(['view', 'form'] as const)('[REQ-001] %s は 768px 未満で下に固定。DOM でも やめる→主 で、main のあと', (kind) => {
    setWidth(375)
    const { container } = render(shell({ kind, ...both }))
    const bar = container.querySelector('.fixed.inset-x-0.bottom-0') as HTMLElement
    expect(within(bar).getAllByRole('button').map((b) => b.textContent)).toEqual(['やめる', '登録する'])
    expect(follows(screen.getByRole('main'), bar)).toBe(true)
    expect(container.querySelector('[data-actions="end"]')).toBeNull()
  })
  it('[REQ-001] 主操作が 1 か所だけ見つかる（幅ごとに置き場所を替え、二重に出さない）', () => {
    for (const w of [375, 1280]) {
      setWidth(w)
      for (const kind of ['view', 'form'] as const) {
        const { unmount } = render(shell({ kind, ...both }))
        expect(screen.getAllByRole('button', { name: '登録する' })).toHaveLength(1)
        unmount()
      }
    }
  })
})

describe('[CMP-030] Link', () => {
  it('[REQ-027] ふつうの押し方は履歴に積んで移る', async () => {
    render(<Link to="clients">取引先</Link>)
    await userEvent.click(screen.getByRole('link', { name: '取引先' }))
    expect(window.location.search).toBe('?screen=clients')
  })
})
