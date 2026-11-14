import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clients, invoices, TODAY } from '../../data'
import { ToastProvider } from '../../ui'
import { PAGE_SIZE } from '../../lib'
import { clientRows, monthlyFigures, TOP_CLIENTS, TOP_WHEN_OTHER_LARGER, topClients, totalsOf } from './aggregate'
import { axisFor, labelIndexes } from './chartScale'
import { buildCsv, csvFileName } from './csv'
import { screen as def } from './index'
import { LONGEST_NAME, manySource } from './manySample'
import { monthsOf, parsePeriod, periodCaption } from './periods'
import { copy } from './copy'

const Report = def.Component
const show = (state = 'default') => render(<ToastProvider><Report state={state} /></ToastProvider>)
const open = (search: string) => window.history.replaceState(null, '', search)
afterEach(() => { open('/'); vi.restoreAllMocks() })

const HALF = monthsOf('half', TODAY)
const monthlyTable = () => screen.getByRole('table', { name: '月ごとの請求額と入金額の表' })
const clientTable = () => screen.getByRole('table', { name: '取引先別の請求額と入金額の表' })
const exportButton = () => screen.getByRole('button', { name: /表を書き出す/ })
const rowOf = (table: HTMLElement, text: string) => within(table).getAllByRole('row').find((r) => r.textContent?.includes(text)) as HTMLElement

describe('純粋な関数（図・表・書き出しの元）', () => {
  it('[REQ-023] 期間は半年・1年・今年度。今月が最後で、知らない値は半年にする', () => {
    expect(HALF).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
    expect(monthsOf('year', TODAY)).toHaveLength(12)
    expect(monthsOf('fiscal', TODAY)[0]).toBe('2026-04')
    expect(parsePeriod('xxx')).toBe('half')
    expect(periodCaption('fiscal', monthsOf('fiscal', TODAY), TODAY)).toBe('2026年度（2026年4月〜2027年3月）のうち、2026年4月〜11月（8か月）')
  })
  it('[REQ-023] 月ごとの請求額・入金額は、請求日の月・入金日の月で数える。取れない月は null（0 とは別）', () => {
    const f = monthlyFigures(invoices, HALF, TODAY, ['2026-08'])
    expect(f.find((x) => x.month === '2026-10')?.billed).toBe(1_413_500)
    expect(f.find((x) => x.month === '2026-11')).toMatchObject({ billed: 476_100, paid: 483_600, open: true })
    expect(f.find((x) => x.month === '2026-08')).toMatchObject({ billed: null, paid: null })
    expect(totalsOf(f).counted).toBe(5)
  })
  it('[REQ-023] 取引先別の合計は、月ごとの合計と一致する。多い順', () => {
    const f = monthlyFigures(invoices, HALF, TODAY)
    const rows = clientRows(invoices, clients, HALF, TODAY)
    expect(rows.reduce((s, r) => s + r.billed, 0)).toBe(totalsOf(f).billed)
    expect(rows.reduce((s, r) => s + r.paid, 0)).toBe(totalsOf(f).paid)
    expect(rows.map((r) => r.billed)).toEqual([...rows.map((r) => r.billed)].sort((a, b) => b - a))
  })
  it('[REQ-023] 棒は上位の数（TOP_CLIENTS）までは全部、それより多ければ上位とその他。その他が 1 位より大きければ上位を少なくする', () => {
    const row = (i: number, billed: number) => ({ id: `r${i}`, name: `社${i}`, billed, paid: 0, share: 0 })
    const small = Array.from({ length: TOP_CLIENTS }, (_, i) => row(i, 100 - i))
    expect(topClients(small, copy.otherLabel)).toHaveLength(TOP_CLIENTS)
    const many = Array.from({ length: TOP_CLIENTS + 4 }, (_, i) => row(i, i === 0 ? 1000 : 100 - i))
    const a = topClients(many, copy.otherLabel)
    expect(a).toHaveLength(TOP_CLIENTS + 1)
    expect(a[TOP_CLIENTS]).toMatchObject({ other: true, label: 'その他（4社）' })
    const flat = Array.from({ length: 30 }, (_, i) => row(i, 100))
    const b = topClients(flat, copy.otherLabel)
    expect(b).toHaveLength(TOP_WHEN_OTHER_LARGER + 1)
    expect(b[TOP_WHEN_OTHER_LARGER].label).toBe(`その他（${30 - TOP_WHEN_OTHER_LARGER}社）`)
  })
  it('[REQ-023] 縦軸は 0 始まりで、上端は次の 1・2・5 の刻み。100 万円以上は万円', () => {
    expect(axisFor([1_413_500, 483_600])).toMatchObject({ unitLabel: '万円', top: 150, label: '150万円' })
    expect(axisFor([4_500])).toMatchObject({ unitLabel: '円', top: 5000 })
    expect(axisFor([]).ticks).toEqual([0])
    expect(axisFor([1_413_500]).ticks.length).toBeGreaterThanOrEqual(3)
  })
  it('[REQ-006] 月の名前は 1 か月が 40px 未満なら 1 つおき（最後を基準に、最初は必ず出す）', () => {
    expect(labelIndexes(6, 50)).toEqual([0, 1, 2, 3, 4, 5])
    const thin = labelIndexes(12, 30)
    expect(thin).toContain(0)
    expect(thin).toContain(11)
    expect(thin.length).toBeLessThan(12)
  })
  it('[REQ-024] CSV は円も桁区切りも付けず、欠損は空欄、当月は「途中」。BOM は書き出し側で付く', () => {
    const f = monthlyFigures(invoices, HALF, TODAY, ['2026-08'])
    const csv = buildCsv(f, clientRows(invoices, clients, HALF, TODAY, ['2026-08']))
    expect(csv).toContain('2026-08,,,確定')
    expect(csv).toContain('2026-11,476100,483600,途中')
    const monthly = csv.split('\r\n').filter((l) => /^\d{4}-\d{2},/.test(l)).map((l) => l.split(','))
    expect(monthly).toHaveLength(6)
    for (const c of monthly) expect([c[1], c[2]].every((v) => /^\d*$/.test(v))).toBe(true)
    expect(csv).not.toContain('万円')
    expect(csv).not.toContain('円,')
    expect(csv.split('\r\n').length).toBeGreaterThan(10)
    expect(csvFileName(HALF)).toBe('つづり請求_売上レポート_2026-06_2026-11.csv')
  })
  it('[REQ-024] 名前にカンマや引用符がある取引先は囲んで書く', () => {
    const csv = buildCsv([], [{ id: 'x', name: '甲,乙"丙"', billed: 1, paid: 0, share: 100 }])
    expect(csv).toContain('"甲,乙""丙"""')
  })
})

describe('[SCR-008:default] 売上レポート', () => {
  it('[REQ-001] 見出しは売上レポート、現在地は売上レポート、主ボタンは 1 つ（表を書き出す）', () => {
    show()
    expect(screen.getByRole('heading', { level: 1, name: '売上レポート' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: '主なメニュー' })).getByRole('link', { name: '売上レポート' })).toHaveAttribute('aria-current', 'page')
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
    expect(exportButton()).toBeEnabled()
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })
  it('[REQ-023] 図は読み上げの名前に要約を持ち、月ごとの表と取引先別の表が並ぶ。期間と範囲を書く', () => {
    show()
    expect(screen.getByRole('heading', { level: 2, name: '月ごとの請求額と入金額（万円）' })).toBeInTheDocument()
    expect(screen.getAllByText('2026年6月〜11月（6か月）').length).toBeGreaterThan(0)
    const img = screen.getByRole('img')
    expect(img.getAttribute('aria-label')).toContain('請求額は')
    expect(within(monthlyTable()).getAllByRole('row')).toHaveLength(HALF.length + 2)
    expect(screen.getByText(/下書きと取り消し済みは入れていません/)).toBeInTheDocument()
    expect(screen.getByText(/2026年11月は途中の月/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '取引先別の請求額' })).toBeInTheDocument()
  })
  it('[REQ-003] 表の金額は桁区切りで 1 円まで。合計の行がある。負の記号と欠損は別の表記', () => {
    show()
    expect(within(rowOf(monthlyTable(), '2026年10月')).getByText('1,413,500')).toBeInTheDocument()
    expect(within(rowOf(monthlyTable(), '合計')).getAllByRole('cell')[0]).toHaveTextContent('合計')
    expect(within(rowOf(clientTable(), '合計')).getAllByRole('cell').length).toBe(4)
  })
  it('[REQ-023] 表の合計は取引先別でも月ごとでも同じ請求額', () => {
    show()
    const month = within(rowOf(monthlyTable(), '合計')).getAllByRole('cell')[1].textContent
    const client = within(rowOf(clientTable(), '合計')).getAllByRole('cell')[1].textContent
    expect(month?.replace(/\D/g, '')).toBe(client?.replace(/\D/g, ''))
  })
  it('[REQ-027] 期間は URL に持ち、切り替えても履歴に積まない', async () => {
    const user = userEvent.setup()
    show()
    const before = window.history.length
    await user.click(screen.getByRole('radio', { name: '1年' }))
    expect(window.location.search).toContain('period=year')
    expect(window.history.length).toBe(before)
    expect(screen.getAllByText('2025年12月〜2026年11月（12か月）').length).toBeGreaterThan(0)
    expect(within(monthlyTable()).getAllByRole('row')).toHaveLength(14)
  })
  it('[REQ-027] URL の期間で開く。知らない値は半年', () => {
    open('/?period=fiscal')
    show()
    expect(screen.getByRole('radio', { name: '今年度' })).toBeChecked()
  })
  it('[REQ-023] 期間を替えて縦軸の上限が変わるとき、変わったことを文で言う', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('radio', { name: '今年度' }))
    const note = screen.queryByText(/縦軸の上限が/)
    const before = axisFor(monthlyFigures(invoices, HALF, TODAY).flatMap((f) => [f.billed ?? 0, f.paid ?? 0])).label
    const after = axisFor(monthlyFigures(invoices, monthsOf('fiscal', TODAY), TODAY).flatMap((f) => [f.billed ?? 0, f.paid ?? 0])).label
    if (before === after) expect(note).toBeNull()
    else expect(note).toHaveTextContent(`${before}から${after}`)
  })
  it('[REQ-024] 書き出す：最中は押したボタンだけ処理中、終わると知らせる', async () => {
    const user = userEvent.setup()
    const create = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    show()
    await user.click(exportButton())
    expect(screen.getByRole('button', { name: /書き出しています/ })).toHaveAttribute('aria-busy', 'true')
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1))
    expect(create).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('表を書き出しました')).toBeInTheDocument()
    expect(exportButton()).toBeEnabled()
  })
  it('[REQ-024] 書き出せないとき、理由と再試行（もう一度書き出す）の言葉を知らせ、ボタンは戻る', async () => {
    const user = userEvent.setup()
    Object.assign(URL, { createObjectURL: () => { throw new Error('x') }, revokeObjectURL: vi.fn() })
    show()
    await user.click(exportButton())
    expect(await screen.findByText(copy.exportFailed)).toBeInTheDocument()
    expect(exportButton()).toBeEnabled()
  })
  it('[REQ-007] axe の違反が無い', async () => {
    const { container } = show()
    const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(r.violations.map((v) => v.id)).toEqual([])
  })
  it('[REQ-006] 月の名前が 40px 未満の幅（343px）では 1 つおきになり、表は全部の月を持つ', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 343, height: 260, x: 0, y: 0, top: 0, left: 0, right: 343, bottom: 260, toJSON: () => ({}) })
    open('/?period=year')
    show()
    const svg = screen.getByRole('img')
    const labels = svg.querySelectorAll('text[data-month]')
    if (labels.length > 0) expect(labels.length).toBeLessThan(12)
    expect(within(monthlyTable()).getAllByRole('row')).toHaveLength(14)
  })
})

describe('[SCR-008:default] 図の月の名前', () => {
  it('[REQ-006] 図の目盛りの月は「6月」で、「6月月」にならない（月の名前は土台の 1 か所）', () => {
    show()
    const labels = Array.from(screen.getByRole('img').querySelectorAll('text')).map((t) => t.textContent ?? '')
    expect(labels).toContain('6月')
    expect(labels.join('')).not.toContain('月月')
  })
})

describe('[SCR-008:loading] 読み込み', () => {
  it('[REQ-008] 骨組みを出し、書き出しは押せない', () => {
    show('loading')
    expect(screen.getByRole('status')).toHaveTextContent('売上を読み込んでいます')
    expect(exportButton()).toBeDisabled()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('[SCR-008:error] 失敗', () => {
  it('[REQ-008] 何が起きたかと直し方、再試行で立ち直る', async () => {
    const user = userEvent.setup()
    show('error')
    expect(screen.getByText('売上を読み込めませんでした')).toBeInTheDocument()
    expect(exportButton()).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /もう一度読み込む/ }))
    expect(screen.getByRole('button', { name: /読み込んでいます/ })).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: '月ごとの請求額と入金額の表' }, { timeout: 2000 })).toBeInTheDocument()
  })
})

describe('[SCR-008:empty] 売上がまだ無い', () => {
  it('[REQ-008] 理由と次の一手（請求書を作る）。書き出しの代わりに主ボタンが請求書を作る', () => {
    show('empty')
    expect(screen.getByText('売上はまだありません')).toBeInTheDocument()
    // 主は見出し右の 1 つ。0 件の表示には同じ名前のボタンを重ねず、文中のリンクで導く（決定 9）
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
    expect(screen.getByText('売上はまだありません').parentElement?.querySelector('button')).toBeNull()
    const inline = within(screen.getByText('売上はまだありません').parentElement as HTMLElement).getByRole('link', { name: '請求書を作る' })
    expect(inline.closest('p')).toHaveTextContent('まだなら、請求書を作るところから始めましょう。')
    expect(screen.queryByRole('button', { name: /表を書き出す/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })
})

describe('[SCR-008:filtered_empty] 期間に請求書が無い', () => {
  it('[REQ-023] 軸だけの図に理由を出し、期間を広げる導線を出す。書き出しは押せない', async () => {
    const user = userEvent.setup()
    show('filtered_empty')
    expect(screen.getAllByText('条件に合う請求書はありません').length).toBeGreaterThan(0)
    expect(exportButton()).toBeDisabled()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '期間を1年にする' }))
    expect(window.location.search).toContain('period=year')
  })
})

describe('[SCR-008:many] 取引先が多い', () => {
  it('[REQ-023] 棒は上位とその他。表は全件で 20 行ずつ、全体の合計とページ送りが出る。長い名前を切らない', async () => {
    const user = userEvent.setup()
    show('many')
    const src = manySource()
    const rows = clientRows(src.invoices, src.clients, HALF, TODAY)
    expect(rows.length).toBeGreaterThan(PAGE_SIZE)
    expect(screen.getByText(/その他（\d+社）/)).toBeInTheDocument()
    expect(within(clientTable()).getAllByRole('row')).toHaveLength(PAGE_SIZE + 1)
    expect(screen.getByText(new RegExp(`全${rows.length}社`))).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'ページ送り' })
    const before = window.history.length
    await user.click(within(nav).getByRole('button', { name: /次/ }))
    expect(window.location.search).toContain('page=2')
    expect(window.history.length).toBe(before)
    expect(LONGEST_NAME.length).toBeGreaterThanOrEqual(50)
  })
})

describe('[SCR-008:partial] 一部の月が取れない', () => {
  it('[REQ-008] 取れない月は「—」、合計は取れた月だけと書く。再読み込みで立ち直り知らせる', async () => {
    const user = userEvent.setup()
    show('partial')
    expect(screen.getByText('一部の月を読み込めませんでした')).toBeInTheDocument()
    expect(within(rowOf(monthlyTable(), '2026年8月')).getAllByText('—').length).toBe(2)
    expect(within(monthlyTable()).getByText(/取れた4か月ぶん/)).toBeInTheDocument()
    expect(screen.getByText(/空欄のまま書き出されます/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /もう一度読み込む/ }))
    expect(await screen.findByText('2か月ぶんを読み込みました', undefined, { timeout: 2000 })).toBeInTheDocument()
    expect(screen.queryByText('一部の月を読み込めませんでした')).not.toBeInTheDocument()
  })
})

describe('[SCR-008:saving] 書き出し中', () => {
  it('[REQ-024] 書き出すボタンだけが処理中で、押せない', () => {
    show('saving')
    const b = screen.getByRole('button', { name: /書き出しています/ })
    expect(b).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('radio', { name: '半年' })).toBeEnabled()
  })
})

describe('[SCR-008:refreshing] 更新中', () => {
  it('[REQ-008] 前の図と表を残し、更新中と言う。期間と書き出しは押せない', () => {
    show('refreshing')
    expect(screen.getByRole('status')).toHaveTextContent('更新しています。この間は、期間を変えることも、表を書き出すこともできません')
    expect(monthlyTable()).toBeInTheDocument()
    expect(exportButton()).toBeDisabled()
    expect(screen.getByRole('radio', { name: '1年' })).toBeDisabled()
    expect(screen.getByRole('radiogroup', { name: '期間' })).toHaveAttribute('aria-describedby', screen.getByRole('status').id)
  })
  it('[REQ-007] 更新中も文字を薄くしない（C-10：文字の不透明度を下げない）', () => {
    show('refreshing')
    for (const el of [screen.getByRole('main'), ...Array.from(screen.getByRole('main').querySelectorAll<HTMLElement>('*:not(input)'))]) {
      expect(el.getAttribute('class') ?? '').not.toMatch(/(^|\s)opacity-/)
      expect(el.style.opacity).toBe('')
    }
  })
})

describe('[SCR-008:stale] 古い内容', () => {
  it('[REQ-008] 何時点の内容かを言い、書き出しは止める。もう一度読み込むで立ち直る', async () => {
    const user = userEvent.setup()
    show('stale')
    expect(screen.getByText('09:30時点の内容です')).toBeInTheDocument()
    expect(exportButton()).toBeDisabled()
    expect(exportButton()).toHaveAttribute('aria-describedby')
    await act(async () => { await user.click(screen.getByRole('button', { name: /もう一度読み込む/ })) })
    await waitFor(() => expect(screen.queryByText('09:30時点の内容です')).not.toBeInTheDocument(), { timeout: 2000 })
    expect(exportButton()).toBeEnabled()
  })
})
