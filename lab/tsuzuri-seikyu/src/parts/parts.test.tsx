import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTable, InvoiceStatusTag, invoiceStatusDef, PaymentStatusTag, paymentStatusDef, tagDensityOf } from '.'
import type { StatusTone } from '../ui'

describe('[CMP-021] InvoiceStatusTag', () => {
  it('[REQ-002] 状況の呼び名が terms のとおり', () => {
    render(<>{(['draft', 'sent', 'paid', 'overdue', 'void'] as const).map((s) => <InvoiceStatusTag key={s} status={s} />)}</>)
    for (const t of ['下書き', '送付済み', '入金済み', '期限超過', '取り消し済み']) expect(screen.getByText(t)).toBeInTheDocument()
  })
})

describe('[CMP-022] PaymentStatusTag', () => {
  it('[REQ-002] 入金の状況の呼び名', () => {
    render(<>{(['unmatched', 'matched', 'diff'] as const).map((s) => <PaymentStatusTag key={s} status={s} />)}</>)
    for (const t of ['未確認', '確認済み', '差額あり']) expect(screen.getByText(t)).toBeInTheDocument()
  })
})

describe('[CMP-029] DataTable', () => {
  it('[REQ-013] 表の役割で行と列が読める', () => {
    render(<DataTable label="一覧" rows={[{ id: '1', n: 'A社' }, { id: '2', n: 'B社' }]} rowKey={(r) => r.id} columns={[{ key: 'n', header: '取引先', main: true, render: (r) => r.n }]} />)
    const table = screen.getByRole('table', { name: '一覧' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByRole('columnheader', { name: '取引先' })).toBeInTheDocument()
  })
})

describe('[CMP-029] DataTable の組み替え', () => {
  it('[REQ-006] 枠の幅（コンテナクエリ）で表と行を替え、画面幅には頼らない', () => {
    const { container } = render(<DataTable label="一覧" rows={[{ id: '1' }]} rowKey={(r) => r.id} columns={[{ key: 'a', header: 'A', render: () => 'x' }]} />)
    expect(container.firstElementChild?.className).toContain('@container')
    expect(container.innerHTML).toContain('@2xl:')
    expect(container.innerHTML).not.toMatch(/\b(md|lg):/)
  })
})

describe('[REQ-002] 状況の定義と terms の対（color-state.md CK-12）', () => {
  const yaml = readFileSync(join(__dirname, '..', '..', '.konomi', 'screens.yaml'), 'utf8')
  const terms = [...yaml.matchAll(/\{ use: "([^"]+)", avoid: \[[^\]]*\], status: (\w+) \}/g)].map((m) => [m[1], m[2]])
  const defs = [...Object.values(invoiceStatusDef), ...Object.values(paymentStatusDef)].map((d) => [d.label, d.tone])
  it('status.ts の呼び名と調子が、screens.yaml の terms の status と同じ（状況は 8 つ）', () => {
    expect(defs).toHaveLength(8)
    expect(terms.slice().sort()).toEqual(defs.slice().sort())
  })
  it('調子は 6 つまで。期限超過は wait、取り消し済みは calm、下書きは draft（完了にしない）', () => {
    expect(new Set(defs.map((d) => d[1])).size).toBeLessThanOrEqual(6)
    expect(invoiceStatusDef.overdue.tone).toBe('wait')
    expect(invoiceStatusDef.void.tone).toBe('calm')
    expect(invoiceStatusDef.draft.tone).toBe('draft')
    expect(invoiceStatusDef.paid.tone).toBe('done')
  })
})

describe('[REQ-002] 札が多いときは静かにする（color-state.md C-08）', () => {
  const rep = (t: StatusTone, n: number): StatusTone[] => Array.from({ length: n }, () => t)
  it('5 枚以下はすべて通常の札', () => {
    const d = tagDensityOf([...rep('done', 3), ...rep('wait', 2)])
    expect(['done', 'wait', 'draft'].map((t) => d(t as StatusTone))).toEqual(['normal', 'normal', 'normal'])
  })
  it('6〜9 枚：wait と fail は通常、ほかは太さ 400', () => {
    const d = tagDensityOf([...rep('done', 3), ...rep('progress', 2), ...rep('wait', 2), 'fail'])
    expect([d('wait'), d('fail'), d('done'), d('progress')]).toEqual(['normal', 'normal', 'plain', 'plain'])
  })
  it('10 枚以上：wait と fail は通常の札、ほかは静かな札', () => {
    const d = tagDensityOf([...rep('done', 4), ...rep('progress', 3), ...rep('draft', 2), ...rep('wait', 2), 'fail'])
    expect([d('wait'), d('fail'), d('done'), d('progress'), d('draft'), d('calm')]).toEqual(['normal', 'normal', 'quiet', 'quiet', 'quiet', 'quiet'])
  })
  it('1 つの調子が 80% 以上：多数派を静かに、少数派だけ通常で目立たせる', () => {
    const d = tagDensityOf([...rep('done', 20), ...rep('wait', 2)])
    expect([d('done'), d('wait')]).toEqual(['quiet', 'normal'])
  })
  it('札の見え方は札に渡り、絵と言葉は消えない', () => {
    render(<InvoiceStatusTag status="paid" density="quiet" />)
    const el = screen.getByText('入金済み')
    expect(el).toHaveAttribute('data-density', 'quiet')
    expect(el.querySelector('svg')).not.toBeNull()
  })
})
