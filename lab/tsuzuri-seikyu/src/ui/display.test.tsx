import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Card, Money, PageHeader, Pagination, Tabs, tabPanelProps } from '.'

describe('[CMP-008] Money', () => {
  it('[REQ-003] 桁区切りと円、単位は外せる', () => {
    const { rerender } = render(<Money value={1457500} />)
    expect(screen.getByText('1,457,500')).toBeInTheDocument()
    expect(screen.getByText('円')).toBeInTheDocument()
    rerender(<Money value={-330} signed unit={false} />)
    expect(screen.getByText('\u2212330')).toBeInTheDocument()
    expect(screen.queryByText('円')).not.toBeInTheDocument()
  })
  it('[REQ-003] 負の数は U+2212 で、赤にしない', () => {
    render(<Money value={-1200} />)
    const el = screen.getByText('\u2212' + '1,200').closest('[data-cmp="CMP-008"]')
    expect(el?.textContent).toBe('\u22121,200円')
    expect(el?.className).toContain('text-fg')
    expect(el?.className).not.toMatch(/bad|warn/)
  })
  it('[REQ-003] 欠損は「—」と「データなし」で、0 や円にしない', () => {
    render(<Money value={null} />)
    const el = document.querySelector('[data-cmp="CMP-008"]')
    expect(el?.textContent).toBe('\u2014データなし')
    expect(el).toHaveAttribute('data-missing', 'true')
    expect(screen.queryByText('円')).not.toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
  it('[REQ-003] 等幅の数字・右寄せ', () => {
    render(<Money value={10} />)
    const el = screen.getByText('10').closest('[data-cmp="CMP-008"]')
    expect(el?.className).toContain('tabular-nums')
    expect(el?.className).toContain('text-right')
  })
})

describe('[CMP-009] Card', () => {
  it('[REQ-012] 選んだ状態は data で分かる', () => {
    render(<Card selected>中身</Card>)
    expect(screen.getByText('中身')).toHaveAttribute('data-selected', 'true')
  })
})

describe('[CMP-018] PageHeader', () => {
  it('[REQ-001] h1 は 1 つ、操作と戻りを持てる', () => {
    render(<PageHeader title="請求書" back={<a href="#">ホーム</a>} actions={<button>請求書を作る</button>} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'ホーム' })).toBeInTheDocument()
  })
})

describe('[CMP-010] Tabs', () => {
  it('[REQ-013] 選択中が分かり、矢印キーで移る', async () => {
    const onChange = vi.fn()
    render(<><Tabs idBase="t" label="状況" value="all" onChange={onChange} items={[{ id: 'all', label: 'すべて' }, { id: 'draft', label: '下書き' }]} /><div {...tabPanelProps('t', 'all')}>中身</div></>)
    expect(screen.getByRole('tab', { name: 'すべて' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('すべて')
    screen.getByRole('tab', { name: 'すべて' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('draft')
  })
})

describe('[CMP-027] Pagination', () => {
  it('[REQ-013] 件数を示し、端では押せない', async () => {
    const onChange = vi.fn()
    render(<Pagination page={1} pageSize={20} total={120} onChange={onChange} />)
    expect(screen.getByText('全120件のうち1〜20件')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '前へ' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '次へ' }))
    expect(onChange).toHaveBeenCalledWith(2)
  })
})
