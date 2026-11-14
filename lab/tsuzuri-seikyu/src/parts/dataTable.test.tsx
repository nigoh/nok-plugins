import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, type Column } from '.'

type Row = { id: string; name: string; amount: number; note: string }
const rows: Row[] = [{ id: '1', name: 'A社', amount: 100, note: 'メモ' }, { id: '2', name: 'B社', amount: 200, note: '' }]
const columns: Column<Row>[] = [
  { key: 'name', header: '取引先', main: true, sortable: true, render: (r) => r.name },
  { key: 'amount', header: '金額（円）', align: 'end', sortable: true, render: (r) => r.amount },
  { key: 'note', header: 'メモ', fold: 1, render: (r) => r.note },
]

describe('[CMP-029] DataTable：入れ子と並べ替え', () => {
  it('[REQ-013] セルの中身が div でも入れ子の誤りにならない（span の中に div を置かない）', () => {
    const { container } = render(<DataTable label="一覧" rows={rows} rowKey={(r) => r.id} columns={[{ key: 'x', header: 'X', render: (r) => <div className="flex">{r.name}</div> }]} />)
    for (const div of container.querySelectorAll('div.flex')) expect(div.closest('span')).toBeNull()
  })
  it('[REQ-013] sort を渡すと、並べ替えの列の見出しに aria-sort が付き、ほかの列は none。並べ替えのない列には付かない', () => {
    render(<DataTable label="一覧" rows={rows} rowKey={(r) => r.id} columns={columns} sort={{ key: 'amount', direction: 'desc' }} onSort={() => {}} />)
    expect(screen.getByRole('columnheader', { name: '金額（円）' })).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByRole('columnheader', { name: '取引先' })).toHaveAttribute('aria-sort', 'none')
    expect(screen.getByRole('columnheader', { name: 'メモ' })).not.toHaveAttribute('aria-sort')
  })
  it('[REQ-013] 昇順は ascending。見出しを押すと onSort(key)', async () => {
    const onSort = vi.fn()
    render(<DataTable label="一覧" rows={rows} rowKey={(r) => r.id} columns={columns} sort={{ key: 'name', direction: 'asc' }} onSort={onSort} />)
    expect(screen.getByRole('columnheader', { name: '取引先' })).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(within(screen.getByRole('columnheader', { name: '金額（円）' })).getByRole('button'))
    expect(onSort).toHaveBeenCalledWith('amount')
  })
  it('[REQ-013] onSort が無ければ見出しは文字のまま（ボタンにならない）', () => {
    render(<DataTable label="一覧" rows={rows} rowKey={(r) => r.id} columns={columns} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
  it('[REQ-013] fold を付けた列は、表の形で枠が狭くなると隠れ、1 行ずつの形では隠れない（クラスで決まる）', () => {
    render(<DataTable label="一覧" rows={rows} rowKey={(r) => r.id} columns={[...columns, { key: 'z', header: 'Z', fold: 2, render: () => 'z' }]} />)
    expect(screen.getByRole('columnheader', { name: 'メモ' }).className).toMatch(/@2xl:@max-4xl:hidden/)
    expect(screen.getByRole('columnheader', { name: 'Z' }).className).toMatch(/@2xl:@max-3xl:hidden/)
    expect(screen.getByRole('columnheader', { name: '取引先' }).className).not.toMatch(/hidden/)
  })
})
