import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EmptyState, PAGE_SIZE, Pagination, Radio, RadioGroup, Segmented, Tabs, TextField } from '.'

describe('[CMP-032] Radio', () => {
  function Group({ variant }: { variant: 'plain' | 'card' }) {
    const [v, setV] = useState('a')
    return (
      <RadioGroup legend="住所の候補">
        <Radio name="addr" value="a" checked={v === 'a'} onChange={setV} label="札幌市中央区" variant={variant} />
        <Radio name="addr" value="b" checked={v === 'b'} onChange={setV} label="札幌市北区" description="請求額 12,000円" note="差額なし" variant={variant} />
        <Radio name="addr" value="c" checked={v === 'c'} onChange={setV} label="札幌市東区" disabled variant={variant} />
      </RadioGroup>
    )
  }
  it.each(['plain', 'card'] as const)('[REQ-009] %s：組の名前で見つかり、押して選べる。押せない選択肢は選べない', async (variant) => {
    render(<Group variant={variant} />)
    const group = screen.getByRole('group', { name: '住所の候補' })
    expect(within(group).getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: /札幌市中央区/ })).toBeChecked()
    await userEvent.click(screen.getByText('札幌市北区'))
    expect(screen.getByRole('radio', { name: /札幌市北区/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /札幌市東区/ })).toBeDisabled()
    await userEvent.click(screen.getByText('札幌市東区'))
    expect(screen.getByRole('radio', { name: /札幌市東区/ })).not.toBeChecked()
  })
  it('[REQ-009] 当たりは 44px：丸のまわりが size-11、ラベル全体が押せる（plain）。card は面全体が min-h-11', () => {
    const { container } = render(<Group variant="plain" />)
    const label = container.querySelector('label[data-variant="plain"]')!
    expect(label.className).toMatch(/min-h-11/)
    expect(label.querySelector('.size-11')).not.toBeNull()
    expect(label.querySelector('input')?.className).toMatch(/absolute inset-0 size-full/)
    const card = render(<Group variant="card" />).container.querySelector('label[data-variant="card"]')!
    expect(card.className).toMatch(/min-h-11/)
  })
  it('[REQ-009] 補足と注記が選択肢の名前に含まれる（読み上げ）', () => {
    render(<Group variant="card" />)
    expect(screen.getByRole('radio', { name: /札幌市北区.*請求額 12,000円.*差額なし/ })).toBeInTheDocument()
  })
})

describe('[CMP-039] TextField', () => {
  it('[REQ-009] ラベル・補足・知らせ・誤りが欄に結びつき、入力は文字で返る', async () => {
    const onChange = vi.fn()
    render(<TextField label="郵便番号" hint="例：060-0042" note="半角にそろえました" error="7桁で入れてください。" required value="" onChange={onChange} id="zip" />)
    const input = screen.getByRole('textbox', { name: /郵便番号/ })
    expect(input).toHaveAttribute('id', 'zip')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('例：060-0042 半角にそろえました 7桁で入れてください。')
    await userEvent.type(input, '1')
    expect(onChange).toHaveBeenCalledWith('1')
  })
  it('[REQ-009] rows で複数行になり、離れた時を受ける', async () => {
    const onBlur = vi.fn()
    render(<TextField label="振込先" rows={3} value="" onChange={() => {}} onBlur={onBlur} />)
    const box = screen.getByRole('textbox', { name: '振込先' })
    expect(box.tagName).toBe('TEXTAREA')
    box.focus()
    await userEvent.tab()
    expect(onBlur).toHaveBeenCalled()
  })
})

describe('[CMP-011] Segmented：disabled と aria-describedby', () => {
  const options = [{ value: 'all', label: 'すべて' }, { value: 'sent', label: '送付済み', disabled: true }]
  it('[REQ-006] 全体を押せなくでき、選択肢ごとにも押せなくできる', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<Segmented label="状況" options={options} value="all" onChange={onChange} />)
    expect(screen.getByRole('radio', { name: '送付済み' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'すべて' })).toBeEnabled()
    rerender(<Segmented label="状況" options={options} value="all" onChange={onChange} disabled />)
    expect(screen.getByRole('radio', { name: 'すべて' })).toBeDisabled()
    expect(screen.getByRole('radiogroup', { name: '状況' })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(screen.getByText('すべて'))
    expect(onChange).not.toHaveBeenCalled()
  })
  it('[REQ-006] aria-describedby で補足を読み上げる', () => {
    render(<><p id="why">更新中は変えられません</p><Segmented label="状況" options={options} value="all" onChange={() => {}} aria-describedby="why" /></>)
    expect(screen.getByRole('radiogroup', { name: '状況' })).toHaveAccessibleDescription('更新中は変えられません')
  })
})

describe('[CMP-027] Pagination：PAGE_SIZE の既定と disabled', () => {
  it('[REQ-013] pageSize を省略すると PAGE_SIZE（20）で数える', () => {
    render(<Pagination page={2} total={45} onChange={() => {}} />)
    expect(PAGE_SIZE).toBe(20)
    expect(screen.getByText('全45件のうち21〜40件')).toBeInTheDocument()
  })
  it('[REQ-013] disabled で前へ・次へが押せない。fieldset を使わない', async () => {
    const onChange = vi.fn()
    const { container } = render(<Pagination page={2} total={100} onChange={onChange} disabled />)
    expect(screen.getByRole('button', { name: '前へ' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '次へ' })).toBeDisabled()
    expect(container.querySelector('fieldset')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: '次へ' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('[CMP-010] Tabs：disabled と、乗せた時・押した時の応答', () => {
  const items = [{ id: 'a', label: '自社の情報' }, { id: 'b', label: '請求書の決まり', disabled: true }, { id: 'c', label: '通知' }]
  it('[REQ-025] 選んでいるタブにも、乗せた時（hover）と押した時（active）の変化がある', () => {
    render(<Tabs label="設定" items={items} value="a" onChange={() => {}} idBase="t" />)
    const selected = screen.getByRole('tab', { name: '自社の情報' })
    const other = screen.getByRole('tab', { name: '通知' })
    for (const tab of [selected, other]) {
      expect(tab.className).toMatch(/hover:bg-col/)
      expect(tab.className).toMatch(/active:bg-line/)
    }
    expect(screen.getByRole('tab', { name: '請求書の決まり' }).className).not.toMatch(/hover:bg-col/)
  })
  it('[REQ-025] 押せないタブは選べず、矢印キーは飛ばす。全体 disabled なら全部押せない', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<Tabs label="設定" items={items} value="a" onChange={onChange} idBase="t" />)
    expect(screen.getByRole('tab', { name: '請求書の決まり' })).toBeDisabled()
    screen.getByRole('tab', { name: '自社の情報' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('c')
    rerender(<Tabs label="設定" items={items} value="a" onChange={onChange} idBase="t" disabled />)
    for (const t of screen.getAllByRole('tab')) expect(t).toBeDisabled()
  })
})

describe('[CMP-014] EmptyState：文と文中リンクの形', () => {
  it('[REQ-001] 説明に文中のリンクを置ける。ボタンは置かなくてよい', () => {
    render(<EmptyState title="請求書はまだありません" description={<>請求書を送ると、ここに並びます。まず<a href="?screen=invoice-new">請求書を作る</a>ところから始めます。</>} />)
    expect(screen.getByText('請求書はまだありません')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '請求書を作る' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
