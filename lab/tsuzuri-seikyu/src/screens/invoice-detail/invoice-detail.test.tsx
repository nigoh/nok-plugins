import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { calcTotals, clients, displayStatus, formatNumber, invoiceTotal, SAVE_WAIT_MS, TODAY } from '../../data'
import { readDate, readYen } from '../../lib'
import { ToastProvider } from '../../ui'
import { InvoiceDetail, screen as def } from './index'
import { makeService, nextNumber, paidOf, sentOf, voidedOf, type Service } from './operations'
import { manyInvoice, resolveInvoice, sampleFor } from './samples'
import { planOf } from './statusActions'
import { validateRecord } from './validate'

const Detail = def.Component
const show = (state = 'default', service?: Service) =>
  render(<ToastProvider>{service ? <InvoiceDetail state={state} service={service} /> : <Detail state={state} />}</ToastProvider>)
const open = (search: string) => window.history.replaceState(null, '', search)
afterEach(() => { vi.useRealTimers(); open('/') })
/** 保存の待ち（土台の SAVE_WAIT_MS の 1 つ）を fake timers で進める。待たずに通すための ms=0 の抜け道は持たない。 */
const fakeClock = () => vi.useFakeTimers({ shouldAdvanceTime: true })
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(SAVE_WAIT_MS) })
const real = makeService()
const clientName = (clientId: string) => clients.find((c) => c.id === clientId)?.name ?? ''
const dialog = () => screen.getByRole('dialog')
const click = (name: string | RegExp, root: HTMLElement | typeof document.body = document.body) => userEvent.click(within(root).getByRole('button', { name }))
const tag = () => document.querySelector('[data-cmp="CMP-021"]')
const primary = () => document.querySelector<HTMLElement>('[data-variant="primary"]')

describe('画面の登録', () => {
  it('screens.yaml のとおり SCR-004・invoice-detail・view で、states が 13 個（save_failed は saving の次）', () => {
    expect(def.id).toBe('SCR-004')
    expect(def.slug).toBe('invoice-detail')
    expect(def.kind).toBe('view')
    expect(def.states).toEqual(['default', 'status_draft', 'status_overdue', 'status_paid', 'status_void', 'saving', 'save_failed', 'confirming', 'invalid', 'many', 'loading', 'error', 'not_found'])
  })
})

describe('[SCR-004:default] 請求書の詳細（送付済み）', () => {
  it('[REQ-001] 見出しは請求書の詳細、メニューの現在地は請求書、戻りは請求書の一覧、番号が説明に出る', () => {
    show()
    const inv = sampleFor('default')!
    expect(screen.getByRole('heading', { level: 1, name: '請求書の詳細' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: '主なメニュー' })).getByRole('link', { name: '請求書' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('link', { name: '請求書' }).map((a) => a.getAttribute('href'))).toEqual(['?screen=invoices', '?screen=invoices'])
    expect(document.querySelector('[data-scr="SCR-004"]')).toHaveAttribute('data-state', 'default')
    expect(document.querySelector('[data-kind="view"]')).not.toBeNull()
    expect(screen.getAllByText(inv.number as string).length).toBeGreaterThan(0)
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
  })
  it('[REQ-002] 状況の札は「送付済み」で、状況の流れの現在地は 2 段目', () => {
    show()
    expect(tag()).toHaveTextContent('送付済み')
    const flow = screen.getByRole('navigation', { name: '請求書の状況の流れ' })
    expect(within(flow).getAllByRole('listitem').map((li) => li.textContent?.replace(/（.*?）/g, '').replace(/^\d/, ''))).toEqual(['下書き', '送付済み', '入金済み'])
    expect(within(flow).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step')
  })
  it('[REQ-003] 合計（税込）・小計・税率ごとの消費税が桁区切りで 1 円まで合い、日付は「2026年11月13日」の形', () => {
    show()
    const inv = sampleFor('default')!
    const t = calcTotals(inv.lines, inv.rounding)
    expect(screen.getAllByText(formatNumber(invoiceTotal(inv))).length).toBeGreaterThan(0)
    expect(screen.getByText('小計（税抜）').nextSibling).toHaveTextContent(`${formatNumber(t.subtotal)}円`)
    for (const r of t.byRate) expect(screen.getByText(`${r.rate}%の消費税`).nextSibling).toHaveTextContent(`${formatNumber(r.tax)}円`)
    expect(screen.getByText('支払期限').nextSibling).toHaveTextContent(/\d{4}年\d{1,2}月\d{1,2}日/)
    expect(screen.getByText('消費税は税率ごとに1回だけ、切り捨てで計算しています。')).toBeInTheDocument()
  })
  it('[REQ-016] 明細・合計・取引先・支払期限・履歴（起きたことと時刻）が見える。主ボタンは入金を記録する', () => {
    show()
    const inv = sampleFor('default')!
    expect(screen.getByText(clientName(inv.clientId))).toBeInTheDocument()
    expect(within(screen.getByRole('table', { name: '明細' })).getAllByRole('row')).toHaveLength(inv.lines.length + 1)
    const items = within(screen.getByRole('heading', { name: '履歴' }).closest('section')!).getAllByRole('listitem')
    expect(items).toHaveLength(inv.history.length)
    expect(items[0]).toHaveTextContent('請求書を送りました')
    expect(primary()).toHaveTextContent('入金を記録する')
    expect(screen.getByRole('button', { name: '請求書を取り消す' })).toBeInTheDocument()
  })
  it('[REQ-007] 見出しの階層が飛ばず、表と一覧に名前があり、axe の違反が無い', async () => {
    const { container } = show()
    expect(screen.getAllByRole('heading').map((h) => h.tagName)).toEqual(['H1', 'H2', 'H2', 'H2'])
    expect(screen.getByRole('table', { name: '明細' })).toBeInTheDocument()
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(result.violations.map((v) => v.id)).toEqual([])
  })
  it('[REQ-027] ?id= で対象の請求書を選ぶ', () => {
    open('?screen=invoice-detail&id=inv-034')
    show()
    expect(tag()).toHaveTextContent('下書き')
    expect(screen.getByText('番号は送るときに付きます')).toBeInTheDocument()
  })
})

describe('[SCR-004:status_draft] 下書き', () => {
  it('[REQ-016] 主ボタンは請求書を送る。ほかの操作に直す・削除がある。流れの現在地は 1 段目', () => {
    show('status_draft')
    expect(tag()).toHaveTextContent('下書き')
    expect(primary()).toHaveTextContent('請求書を送る')
    expect(screen.getByRole('link', { name: '下書きの内容を直す' })).toHaveAttribute('href', expect.stringContaining('screen=invoice-new&id='))
    expect(screen.getByRole('button', { name: '下書きを削除する' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: '請求書の状況の流れ' })).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step')
  })
  it('[REQ-015] 送る：宛先・合計・支払期限と注意を窓に出し、やめるで閉じ、送ると番号が付いて履歴が増え、知らせが出る', async () => {
    fakeClock()
    show('status_draft')
    const inv = sampleFor('status_draft')!
    await click('請求書を送る', document.body)
    const d = dialog()
    expect(within(d).getByText('送ると番号が付き、相手にメールが届きます。送ったあとは内容を直せません。')).toBeInTheDocument()
    for (const label of ['宛先', '合計（税込）', '支払期限']) expect(within(d).getByText(label)).toBeInTheDocument()
    await click('やめる', d)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await click('請求書を送る', document.body)
    await click('請求書を送る', dialog())
    await settle()
    await waitFor(() => expect(screen.getByText('請求書を送りました', { selector: '[role=status] *, [role=status]' })).toBeInTheDocument())
    expect(screen.getByText(nextNumber().slice(0, -4), { exact: false })).toBeInTheDocument()
    expect(primary()).toHaveTextContent('入金を記録する')
    expect(inv.status).toBe('draft')
  })
  it('[REQ-017] 下書きの削除は確認の窓を経て、一覧へ移る', async () => {
    fakeClock()
    show('status_draft')
    await click('下書きを削除する')
    expect(within(dialog()).getByText('削除すると、この下書きは一覧から消えます。元には戻せません。')).toBeInTheDocument()
    await click('下書きを削除する', dialog())
    await settle()
    await waitFor(() => expect(window.location.search).toContain('screen=invoices'))
  })
})

describe('[SCR-004:status_overdue] 期限超過', () => {
  it('[REQ-002] 札は期限超過、期限の補足は「〜日超過」、主ボタンは入金を記録する', () => {
    show('status_overdue')
    expect(tag()).toHaveTextContent('期限超過')
    expect(screen.getByText(/日超過$/)).toBeInTheDocument()
    expect(primary()).toHaveTextContent('入金を記録する')
  })
})

describe('[SCR-004:status_paid] 入金済み', () => {
  it('[REQ-016] 主ボタンは無く、流れは全部済み、入金日が出て、記録を取り消せる', () => {
    show('status_paid')
    expect(tag()).toHaveTextContent('入金済み')
    expect(primary()).toBeNull()
    expect(screen.getByText('入金日')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: '請求書の状況の流れ' })).queryByText('（いま', { exact: false })).toBeNull()
    expect(screen.getByRole('button', { name: '記録を取り消す' })).toBeInTheDocument()
  })
  it('[REQ-017] 記録を取り消すと入金前の状況に戻り、履歴に残り、新しい行が一時だけ色づく', async () => {
    fakeClock()
    show('status_paid')
    await click('記録を取り消す')
    await settle()
    await waitFor(() => expect(tag()).toHaveTextContent('送付済み'))
    const history = within(screen.getByRole('heading', { name: '履歴' }).closest('section')!).getAllByRole('listitem')
    expect(history[0]).toHaveTextContent('入金の記録を取り消しました')
    expect(history[0]).toHaveAttribute('data-fresh')
    act(() => { vi.advanceTimersByTime(1600) })
    expect(history[0]).not.toHaveAttribute('data-fresh')
  })
})

describe('[SCR-004:status_void] 取り消し済み', () => {
  it('[REQ-016] 読み取り専用：先頭に 1 度だけ知らせ、主ボタンも操作も無い', () => {
    show('status_void')
    expect(screen.getAllByText('取り消し済みです。変更できません。')).toHaveLength(1)
    expect(primary()).toBeNull()
    expect(screen.queryByRole('navigation', { name: '請求書の状況の流れ' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'ほかの操作' })).toBeNull()
  })
})

describe('[SCR-004:confirming] 送る確認の窓', () => {
  it('[REQ-015] 送る窓が開いた状態で、窓の題と主ボタンは同じ動詞', () => {
    show('confirming')
    const d = dialog()
    expect(within(d).getByRole('heading', { name: '請求書を送りますか' })).toBeInTheDocument()
    expect(within(d).getByRole('button', { name: '請求書を送る' })).toBeInTheDocument()
  })
  it('[REQ-015] 通信中は押したボタンだけ処理中で、閉じられず、2 回押しても通信は 1 回', async () => {
    const send = vi.fn(() => new Promise<never>(() => {}))
    show('confirming', { ...real, send })
    const btn = within(dialog()).getByRole('button', { name: '請求書を送る' })
    await userEvent.click(btn)
    await userEvent.click(btn)
    expect(send).toHaveBeenCalledTimes(1)
    expect(btn).toHaveAttribute('aria-busy', 'true')
    expect(within(dialog()).getByRole('button', { name: 'やめる' })).toBeDisabled()
  })
  it('[REQ-017] 失敗は窓の中に残り、まだ送られていないと言い、3 回続くと言い方を足す', async () => {
    const send = vi.fn(() => Promise.reject(new Error('x')))
    show('confirming', { ...real, send })
    for (let i = 0; i < 3; i++) await click('請求書を送る', dialog())
    await waitFor(() => expect(within(dialog()).getByText(/続けて失敗しています/)).toBeInTheDocument())
    expect(within(dialog()).getByText(/請求書はまだ送られていません/)).toBeInTheDocument()
  })
})

describe('[SCR-004:saving] 入金の記録の通信中', () => {
  it('[REQ-017] 記録の窓で、主ボタンだけ処理中、入力は触れず、閉じられない', () => {
    show('saving')
    const d = dialog()
    expect(within(d).getByRole('button', { name: '入金を記録しています' })).toHaveAttribute('aria-busy', 'true')
    expect(within(d).getByRole('textbox', { name: /入金日/ })).toBeDisabled()
    expect(within(d).getByRole('button', { name: 'やめる' })).toBeDisabled()
  })
})

describe('[SCR-004:save_failed] 操作の失敗（?state= で出す）', () => {
  it('[REQ-017] 入金の記録の窓に失敗の知らせが出て、まだ記録されていないと言う。入力は残り、窓は閉じず、押し直しても同じ失敗になる', async () => {
    fakeClock()
    show('save_failed')
    const d = dialog()
    expect(within(d).getByRole('alert')).toHaveTextContent('入金を記録できませんでした')
    expect(within(d).getByText(/入金はまだ記録されていません/)).toBeInTheDocument()
    expect(within(d).getByRole('textbox', { name: /入金額/ })).toHaveValue(formatNumber(invoiceTotal(sampleFor('save_failed')!)))
    await click('入金を記録する', d)
    expect(within(dialog()).getByRole('button', { name: '入金を記録しています' })).toHaveAttribute('aria-busy', 'true')
    await settle()
    expect(within(dialog()).getByRole('alert')).toHaveTextContent('入金を記録できませんでした')
    expect(within(dialog()).getByRole('button', { name: '入金を記録する' })).not.toHaveAttribute('aria-busy')
    expect(tag()).toHaveTextContent('送付済み')
  })
  it('[REQ-017] 3 回続けて失敗すると、言い方を足す', async () => {
    fakeClock()
    show('save_failed')
    for (let i = 0; i < 2; i++) { await click('入金を記録する', dialog()); await settle() }
    expect(within(dialog()).getByText(/続けて失敗しています/)).toBeInTheDocument()
  })
})

describe('[SCR-004:invalid] 入金の記録の誤り', () => {
  it('[REQ-017] 日付と金額の誤りを欄の直下とまとめの一覧に同じ文で出し、最初の誤りの欄へ移る', () => {
    show('invalid')
    const d = dialog()
    const summary = within(d).getByText('2か所を直してください').closest('[data-cmp="CMP-031"]') as HTMLElement
    const messages = [...d.querySelectorAll('[data-field-error]')].map((e) => e.textContent)
    expect(messages).toHaveLength(2)
    for (const m of messages) expect(within(summary).getByText(m as string)).toBeInTheDocument()
  })
  it('[REQ-017] 金額が請求額と違うときは記録せず、入金の確認へ案内する。直すと消える', async () => {
    const record = vi.fn(real.record)
    show('invalid', { ...real, record })
    const d = dialog()
    const amount = within(d).getByRole('textbox', { name: /入金額/ })
    await userEvent.clear(amount)
    await userEvent.type(amount, '１２３')
    await userEvent.tab()
    expect(amount).toHaveValue('123')
    expect(within(d).getByText('半角にそろえました。', { exact: false })).toBeInTheDocument()
    await click('入金を記録する', d)
    expect(record).not.toHaveBeenCalled()
    expect(within(d).getAllByText(/入金の確認で扱います/).length).toBeGreaterThan(0)
  })
})

describe('[SCR-004:default] 入金の記録', () => {
  it('[REQ-017] 今日の日付と請求額が入っていて、そのまま記録すると入金済みになり履歴に残り、元に戻すもある', async () => {
    fakeClock()
    show('default')
    const inv = sampleFor('default')!
    await click('入金を記録する', document.body)
    const d = dialog()
    expect(within(d).getByRole('textbox', { name: /入金日/ })).toHaveValue('2026年11月13日')
    expect(within(d).getByRole('textbox', { name: /入金額/ })).toHaveValue(formatNumber(invoiceTotal(inv)))
    expect(within(d).getByText('すべて入力してください。')).toBeInTheDocument()
    expect(d.querySelector('[data-field-mark]')).toBeNull()
    await click('入金を記録する', d)
    await settle()
    await waitFor(() => expect(tag()).toHaveTextContent('入金済み'))
    expect(screen.getByRole('button', { name: '元に戻す' })).toBeInTheDocument()
    await click('元に戻す')
    await settle()
    await waitFor(() => expect(tag()).toHaveTextContent('送付済み'))
  })
  it('[REQ-017] 取り消しは確認の窓で「元には戻せません」と直前に言い、取り消すと読み取り専用になる', async () => {
    fakeClock()
    show('default')
    await click('請求書を取り消す', document.body)
    const d = dialog()
    expect(within(d).getByText('取り消すと、この請求書は取り消し済みになります。元には戻せません。')).toBeInTheDocument()
    await click('請求書を取り消す', d)
    await settle()
    await waitFor(() => expect(screen.getByText('取り消し済みです。変更できません。')).toBeInTheDocument())
    expect(primary()).toBeNull()
  })
})

describe('[SCR-004:many] 多すぎる', () => {
  it('[REQ-008] 明細 50 行は 20 行ずつ、件数つきのページ送りを ?page= に置き換えで持ち（履歴に積まない）、合計は全行から出る', async () => {
    show('many')
    const inv = manyInvoice()
    expect(within(screen.getByRole('table', { name: '明細' })).getAllByRole('row')).toHaveLength(21)
    expect(screen.getByText('全50件のうち1〜20件')).toBeInTheDocument()
    expect(screen.getAllByText(formatNumber(invoiceTotal(inv))).length).toBeGreaterThan(0)
    const before = window.history.length
    await click('次へ')
    expect(window.location.search).toContain('page=2')
    expect(screen.getByText('全50件のうち21〜40件')).toBeInTheDocument()
    expect(window.history.length).toBe(before)
  })
  it('[REQ-003] 長い取引先名は折り返し、履歴 8 件が新しい順に並ぶ', () => {
    show('many')
    const inv = manyInvoice()
    const name = screen.getByText(clientName(inv.clientId))
    expect(name.className).toContain('break-words')
    const items = within(screen.getByRole('heading', { name: '履歴' }).closest('section')!).getAllByRole('listitem')
    expect(items).toHaveLength(8)
    expect(items[0]).toHaveTextContent('請求書を送りました')
  })
})

describe('[SCR-004:loading][SCR-004:error][SCR-004:not_found] 待ち・失敗・見つからない', () => {
  it('[REQ-008] loading：骨組みを出し、操作は出さない', () => {
    show('loading')
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
    expect(primary()).toBeNull()
  })
  it('[REQ-008] error：直し方と再試行を出し、押すと請求書に立ち直る', async () => {
    show('error')
    expect(screen.getByRole('alert')).toHaveTextContent('請求書を読み込めませんでした')
    await userEvent.click(screen.getByRole('button', { name: 'もう一度読み込む' }))
    await waitFor(() => expect(tag()).toHaveTextContent('送付済み'), { timeout: 2000 })
  })
  it('[REQ-016] not_found：見つかりませんと一覧への導線。存在しない id も同じ', () => {
    show('not_found')
    expect(screen.getByText('請求書が見つかりません')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '請求書の一覧を見る' })).toHaveAttribute('href', '?screen=invoices')
  })
  it('[REQ-016] 存在しない ?id= は見つかりません', () => {
    open('?screen=invoice-detail&id=inv-zzz')
    show()
    expect(screen.getByText('請求書が見つかりません')).toBeInTheDocument()
  })
})

describe('[REQ-016] 状況ごとの操作の表と見本の対応', () => {
  it('見本の請求書の状況が状態名と合い、操作の表が全状況を持つ', () => {
    expect(displayStatus(sampleFor('default')!, TODAY)).toBe('sent')
    expect(displayStatus(sampleFor('status_draft')!, TODAY)).toBe('draft')
    expect(displayStatus(sampleFor('status_overdue')!, TODAY)).toBe('overdue')
    expect(displayStatus(sampleFor('status_paid')!, TODAY)).toBe('paid')
    expect(displayStatus(sampleFor('status_void')!, TODAY)).toBe('void')
    expect(Object.keys(planOf).sort()).toEqual(['draft', 'overdue', 'paid', 'sent', 'void'])
    expect(sampleFor('not_found')).toBeNull()
    expect(resolveInvoice('status_paid', 'inv-001')?.id).toBe(sampleFor('status_paid')?.id)
  })
  it('[REQ-017] 状況の移り変わり：送ると番号と履歴、記録すると入金日、取り消すと取り消し済み', () => {
    const draft = sampleFor('status_draft')!
    const sent = sentOf(draft)
    expect(sent.status).toBe('sent')
    expect(sent.number).toMatch(/^.+\d{4}-\d{4}$/)
    expect(sent.history).toHaveLength(draft.history.length + 1)
    expect(paidOf(sent, TODAY)).toMatchObject({ status: 'paid', paidOn: TODAY })
    expect(voidedOf(sent).status).toBe('void')
    expect(draft.status).toBe('draft')
  })
})

describe('[REQ-017] 入金の記録の欄の受け方（読みは土台の lib/normalize。ここは窓の検査）', () => {
  it('日付は全角・区切り・和暦（昭和も）・年なしを受け、存在しない日付と元号の範囲外は受けない', () => {
    const ymd = (t: string) => { const r = readDate(t, TODAY); return r.kind === 'ok' ? r.ymd : r.kind }
    expect(ymd('2026年11月13日')).toBe('2026-11-13')
    expect(ymd('2026/11/13')).toBe('2026-11-13')
    expect(ymd('令和8年11月13日')).toBe('2026-11-13')
    expect(ymd('昭和64年1月7日')).toBe('1989-01-07')
    expect(ymd('11/13')).toBe('2026-11-13')
    expect(ymd('2026/13/40')).toBe('bad')
    expect(ymd('2026/02/30')).toBe('bad')
    expect(ymd('平成31年5月1日')).toBe('bad')
  })
  it('金額は全角・円・カンマを受け、数字でない・桁あふれは受けない（上限は既定の 999,999,999）', () => {
    expect(readYen('１１２，２００円')).toEqual({ kind: 'ok', value: 112200 })
    expect(readYen('112,200')).toEqual({ kind: 'ok', value: 112200 })
    expect(readYen('abc')).toEqual({ kind: 'bad' })
    expect(readYen('999999999')).toEqual({ kind: 'ok', value: 999999999 })
    expect(readYen('1000000000')).toEqual({ kind: 'over' })
  })
  it('送る時の検査：空・範囲外・違う額を、それぞれの欄の文で返す', () => {
    const ctx = { issuedOn: '2026-10-31', today: TODAY, total: 1000 }
    expect(validateRecord({ paidOn: '', amount: '' }, ctx)).toEqual({ paidOn: '入金日を入れてください。', amount: '入金額を入れてください。' })
    expect(validateRecord({ paidOn: '2026/10/01', amount: '1000' }, ctx).paidOn).toContain('請求日')
    expect(validateRecord({ paidOn: '2026/11/14', amount: '1000' }, ctx).paidOn).toContain('今日まで')
    expect(validateRecord({ paidOn: '2026/11/13', amount: '900' }, ctx).amount).toContain('入金の確認で扱います')
    expect(validateRecord({ paidOn: '2026/11/13', amount: '1,000' }, ctx)).toEqual({})
  })
})
