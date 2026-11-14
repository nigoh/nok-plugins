import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { beforeEach, describe, expect, it } from 'vitest'
import { clients, dueNote, formatNumber, invoices, invoiceTotal } from '../../data'
import { ToastProvider } from '../../ui'
import { screen as def } from './index'
import { buildInvoiceRows, invoiceMatches, parseQuery, withQuery } from './query'

const Invoices = def.Component

/** 画面を描く。URL は ?screen=invoices（と状態、条件）にそろえる。 */
function open(state = 'default', search = '') {
  window.history.replaceState(null, '', `?screen=invoices${state === 'default' ? '' : `&state=${state}`}${search}`)
  return render(<ToastProvider><Invoices state={state} /></ToastProvider>)
}
const table = () => screen.getByRole('table', { name: '請求書の一覧' })
const dataRows = () => within(table()).getAllByRole('row').slice(1)
const search = () => window.location.search
const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? ''

beforeEach(() => { window.history.replaceState(null, '', '?screen=invoices') })

describe('[SCR-002] 画面の定義', () => {
  it('[REQ-001] screens.yaml のとおり（SCR-002・invoices・view）で、8 つの状態を持つ', () => {
    expect([def.id, def.slug, def.title, def.kind]).toEqual(['SCR-002', 'invoices', '請求書', 'view'])
    expect(def.states).toEqual(['default', 'loading', 'error', 'empty', 'filtered_empty', 'many', 'refreshing', 'stale'])
  })
})

describe('[REQ-001] 共通の骨格', () => {
  it('メニュー 6 項目の並びと現在地、h1、main、主ボタン 1 つ', () => {
    open()
    const nav = screen.getByRole('navigation', { name: '主なメニュー' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['ホーム', '請求書', '取引先', '入金の確認', '売上レポート', '設定'])
    expect(within(nav).getByRole('link', { name: '請求書' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('請求書')
    expect(screen.getAllByRole('link', { name: '請求書を作る' })).toHaveLength(1)
    expect(screen.getByRole('link', { name: '請求書を作る' })).toHaveAttribute('href', '?screen=invoice-new')
  })
  it('詳細への行き先は、請求書の id を URL に持つ', () => {
    open()
    const first = dataRows()[0]
    expect(within(first).getByRole('link')).toHaveAttribute('href', expect.stringMatching(/^\?screen=invoice-detail&id=inv-/))
  })
})

describe('[REQ-002] 状況の呼び名と札', () => {
  it('期限超過は、送付済みで支払期限が今日より前のものから計算する（送付済みの札と並べない）', () => {
    open()
    const overdue = dataRows().filter((r) => within(r).queryByText('期限超過'))
    expect(overdue).toHaveLength(3)
    for (const r of overdue) expect(within(r).queryByText('送付済み')).toBeNull()
    expect(within(overdue[0]).getByRole('link')).toHaveTextContent(clientName('c06'))
  })
  it('札は言葉を持つ（色だけで伝えない）。呼び名は terms のとおり', () => {
    open('default', '&sort=due_desc')
    const text = table().textContent ?? ''
    for (const w of ['期限超過', '送付済み', '入金済み', '下書き']) expect(text).toContain(w)
    for (const w of ['延滞', '期限切れ', '送信済み', '発行済み', '完了', 'ステータス']) expect(text).not.toContain(w)
  })
})

describe('[REQ-003] 金額と日付の表示', () => {
  it('金額は桁区切りで列の見出しに単位、日付は「10/31(土)」の短い形、期限超過は日数を数字で言う', () => {
    open()
    const row = dataRows().find((r) => within(r).queryByText('期限超過') && within(r).queryByText(/豊平クリーンサービス/))
    expect(row).toBeDefined()
    const r = within(row as HTMLElement)
    expect(r.getByText('36,300')).toBeInTheDocument()
    expect(r.getByText('10/31(土)')).toBeInTheDocument()
    expect(r.getByText('9/30(水)')).toBeInTheDocument()
    expect(r.getByText('13日超過')).toBeInTheDocument()
    expect(within(table()).getByRole('columnheader', { name: '税込金額（円）' })).toBeInTheDocument()
    expect(table().textContent).not.toMatch(/[¥￥]/)
  })
  it('支払期限の前の送付済みは、日付の下に「あと17日」の形で言葉を足す', () => {
    open()
    const row = dataRows().find((r) => within(r).queryByText('送付済み') && within(r).queryByText(/みどり園芸/))
    expect(within(row as HTMLElement).getByText(dueNote(17))).toBeInTheDocument()
    expect(within(row as HTMLElement).getByText('11/30(月)')).toBeInTheDocument()
  })
  it('番号が無い下書きは、番号の代わりに理由を言う（0 や空にしない）', () => {
    open('default', '&status=draft')
    expect(screen.getAllByText('番号は送ると付きます')).toHaveLength(2)
  })
  it('今年以外の日付が 1 件でもある列は、全行を長い形にそろえる（請求日）', () => {
    open('default', '&sort=issued')
    expect(within(dataRows()[0]).getByText('2025年12月15日')).toBeInTheDocument()
    expect(within(dataRows()[1]).getByText(/^20\d\d年\d+月\d+日$/)).toBeInTheDocument()
  })
})

describe('[REQ-005] 用語の統一', () => {
  it('どの状態でも、避ける言い方と設計の言葉が画面に出ない', () => {
    const avoid = ['ステータス', '顧客', '送信', '発行', 'キャンセル', 'インボイス', 'ダッシュボード', '空状態', '主役']
    const design = /\b(default|loading|error|empty|filtered_empty|many|refreshing|stale|SCR-\d+|REQ-\d+|CMP-\d+)\b/
    for (const s of def.states) {
      const { unmount } = open(s)
      const text = document.body.textContent ?? ''
      for (const w of avoid) expect(text, `${s}: ${w}`).not.toContain(w)
      expect(text, s).not.toMatch(design)
      unmount()
    }
  })
})

describe('[REQ-006] 幅 3 段階の見え方', () => {
  it('表は枠の幅で行の形に組み替わる。項目を落とさない（各行に 4 つのセルとラベルがある）', () => {
    open()
    expect(table().className).toContain('@container')
    for (const r of dataRows()) expect(within(r).getAllByRole('cell')).toHaveLength(4)
    // 狭い幅では見出しの行を隠し、各セルにラベルを出す（DOM には常にある）
    expect(screen.getAllByText('支払期限')).toHaveLength(dataRows().length + 1)
    expect(screen.getAllByText('状況', { selector: 'span' }).length).toBeGreaterThanOrEqual(dataRows().length)
  })
  it('絞り込みの欄は 768px 未満で縦に積み、以上で横に並べる（成り行きの折り返しにしない）', () => {
    open()
    const form = screen.getByRole('search', { name: '請求書の絞り込み' })
    expect(form.className).toContain('flex-col')
    expect(form.className).toContain('md:flex-row')
  })
  it('長い取引先名は省略せず全部出す', () => {
    open('many')
    const long = clients.reduce((a, c) => (c.name.length > a.length ? c.name : a), '')
    const { unmount } = render(<ToastProvider><Invoices state="many" /></ToastProvider>)
    unmount()
    expect(long.length).toBeGreaterThan(25)
    expect(document.body.innerHTML).not.toContain('truncate')
    expect(document.body.innerHTML).not.toContain('text-ellipsis')
  })
})

describe('[REQ-007] アクセシビリティ', () => {
  it('全部の状態で axe の違反が無い（色の対比は実ブラウザで確かめる）', async () => {
    for (const s of def.states) {
      const { container, unmount } = open(s)
      const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
      expect(result.violations.map((v) => `${s}: ${v.id}`), s).toEqual([])
      unmount()
    }
  }, 30_000)
  it('キーボードだけで、探す→状況→並べ替え→行のリンクの順に届き、欄にはラベルがある', async () => {
    open()
    const user = userEvent.setup()
    const find = screen.getByRole('textbox', { name: '取引先名・番号で探す' })
    const status = screen.getByRole('combobox', { name: '状況' })
    const sort = screen.getByRole('combobox', { name: '並べ替え' })
    await user.click(screen.getByRole('link', { name: '請求書を作る' }))
    window.history.replaceState(null, '', '?screen=invoices')
    find.focus()
    await user.tab()
    expect(status).toHaveFocus()
    await user.tab()
    expect(sort).toHaveFocus()
    await user.tab()
    expect(within(dataRows()[0]).getByRole('link')).toHaveFocus()
  })
})

describe('[REQ-008] 待ち・空・失敗の見せ方', () => {
  it('失敗は何が起きたかと直し方を言い、「もう一度読み込む」で処理中になり、成功で立ち直る', async () => {
    open('error')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('請求書の一覧を読み込めませんでした。しばらくしてから、もう一度読み込んでください。')
    expect(alert.textContent).not.toMatch(/エラー|不正|無効|サーバー/)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'もう一度読み込む' }))
    expect(screen.getByRole('button', { name: /読み込んでいます/ })).toHaveAttribute('aria-busy', 'true')
    await waitFor(() => expect(table()).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('[REQ-013] 請求書の一覧：状況で絞る・探す・並べ替える・ページ送り', () => {
  it('状況で絞ると、その状況の行だけになり、条件が見えて、URL に残る（履歴には積まない）', async () => {
    open()
    const user = userEvent.setup()
    const before = window.history.length
    await user.selectOptions(screen.getByRole('combobox', { name: '状況' }), '期限超過（3件）')
    expect(dataRows()).toHaveLength(3)
    expect(screen.getByText('全3件・入金待ちを先に、支払期限が近い順')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '状況：期限超過の条件を外す' })).toBeInTheDocument()
    expect(search()).toBe('?screen=invoices&status=overdue')
    expect(window.history.length).toBe(before)
    expect(screen.queryByRole('navigation', { name: 'ページ送り' })).toBeNull()
  })
  it('状況の選択肢に、状況ごとの件数が出る（探す語には影響されない）', async () => {
    open()
    const options = within(screen.getByRole('combobox', { name: '状況' })).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['すべて（36件）', '下書き（2件）', '送付済み（6件）', '期限超過（3件）', '入金済み（24件）', '取り消し済み（1件）'])
    await userEvent.setup().type(screen.getByRole('textbox', { name: '取引先名・番号で探す' }), '北斗')
    expect(within(screen.getByRole('combobox', { name: '状況' })).getAllByRole('option')[0]).toHaveTextContent('すべて（36件）')
  })
  it('取引先名で探せる。かな（ひらがな）・全角半角・大文字小文字・空白区切りでも探せる', async () => {
    open()
    const user = userEvent.setup()
    const box = screen.getByRole('textbox', { name: '取引先名・番号で探す' })
    const hokuto = invoices.filter((i) => i.clientId === 'c01').length
    await user.type(box, '北斗')
    expect(dataRows()).toHaveLength(hokuto)
    await user.clear(box)
    await user.type(box, 'ほくと')
    expect(dataRows()).toHaveLength(hokuto)
    await user.clear(box)
    await user.type(box, 'ＨＯＫＵＴＯ')
    expect(screen.getByText('条件に合う請求書はありません')).toBeInTheDocument()
    await user.clear(box)
    await user.type(box, '北斗 印刷')
    expect(dataRows()).toHaveLength(hokuto)
    expect(search()).toBe(`?screen=invoices&q=${encodeURIComponent('北斗 印刷').replace(/%20/g, '+')}`)
  })
  it('請求書番号で探せる', async () => {
    open()
    const inv = invoices.find((i) => i.number)
    const number = inv?.number ?? ''
    await userEvent.setup().type(screen.getByRole('textbox', { name: '取引先名・番号で探す' }), number.toLowerCase())
    expect(dataRows()).toHaveLength(1)
    expect(within(dataRows()[0]).getByText(number)).toBeInTheDocument()
  })
  it('日本語の変換の途中は絞らず、確定したときに絞る。Enter で送られない', () => {
    open()
    const box = screen.getByRole('textbox', { name: '取引先名・番号で探す' })
    fireEvent.compositionStart(box)
    fireEvent.input(box, { target: { value: 'ほ' }, isComposing: true })
    expect(box).toHaveValue('ほ')
    expect(dataRows()).toHaveLength(20)
    expect(search()).toBe('?screen=invoices')
    fireEvent.input(box, { target: { value: '北斗' }, isComposing: true })
    fireEvent.compositionEnd(box, { data: '北斗' })
    expect(dataRows().length).toBeLessThan(20)
    expect(search()).toContain('q=')
    const form = screen.getByRole('search', { name: '請求書の絞り込み' })
    expect(fireEvent.submit(form)).toBe(false)
  })
  it('既定の並びは支払期限が近い順：入金待ちと下書きを先に、入金済み・取り消し済みは後ろ', () => {
    open()
    const rows = dataRows()
    const first = rows.slice(0, 11)
    for (const r of first) expect(r.textContent).toMatch(/期限超過|送付済み|下書き/)
    expect(within(rows[0]).getByText('期限超過')).toBeInTheDocument()
    expect(rows[11].textContent).toMatch(/入金済み|取り消し済み/)
    expect(screen.getByRole('combobox', { name: '並べ替え' })).toHaveValue('due')
  })
  it('金額で並べ替えると、先頭が最大。並びは URL に残り、条件はそのまま', async () => {
    open('default', '&status=paid')
    const user = userEvent.setup()
    await user.selectOptions(screen.getByRole('combobox', { name: '並べ替え' }), '金額が大きい順')
    const max = Math.max(...invoices.filter((i) => i.status === 'paid').map(invoiceTotal))
    expect(within(dataRows()[0]).getByText(formatNumber(max))).toBeInTheDocument()
    expect(search()).toBe('?screen=invoices&status=paid&sort=amount_desc')
    expect(screen.getByText('全24件・金額が大きい順')).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: '並べ替え' }), '支払期限が近い順')
    expect(search()).toBe('?screen=invoices&status=paid')
  })
  it('適用中の条件は個別に外せる。2 つ以上のときは「すべて外す」もある', async () => {
    open('default', '&status=paid&q=%E5%8C%97%E6%96%97')
    const user = userEvent.setup()
    const list = screen.getByRole('list', { name: '適用中の条件' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    await user.click(within(list).getByRole('button', { name: '「北斗」で探すの条件を外す' }))
    expect(search()).toBe('?screen=invoices&status=paid')
    expect(screen.getByRole('textbox', { name: '取引先名・番号で探す' })).toHaveValue('')
    expect(within(screen.getByRole('list', { name: '適用中の条件' })).getAllByRole('listitem')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: '状況：入金済みの条件を外す' }))
    expect(screen.queryByRole('list', { name: '適用中の条件' })).toBeNull()
    expect(dataRows()).toHaveLength(20)
  })
  it('0 件になる条件でも外せる（条件は見えたまま、まとめても個別にも外せる）', async () => {
    open('default', '&status=void&q=%E5%8C%97%E6%96%97')
    const user = userEvent.setup()
    expect(screen.getByText('条件に合う請求書はありません')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: '適用中の条件' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('list', { name: '適用中の条件' })).getByRole('button', { name: '状況：取り消し済みの条件を外す' }))
    expect(dataRows().length).toBeGreaterThan(0)
  })
  it('20 件ごとのページ送り（件数つき）。ページは URL に残り、並び・条件は変わらない', async () => {
    open()
    const user = userEvent.setup()
    expect(dataRows()).toHaveLength(20)
    const nav = screen.getByRole('navigation', { name: 'ページ送り' })
    expect(nav).toHaveTextContent('全36件のうち1〜20件')
    await user.click(within(nav).getByRole('button', { name: '次へ' }))
    expect(dataRows()).toHaveLength(16)
    expect(nav).toHaveTextContent('全36件のうち21〜36件')
    expect(search()).toBe('?screen=invoices&page=2')
    await user.click(within(nav).getByRole('button', { name: '前へ' }))
    expect(search()).toBe('?screen=invoices')
  })
  it('条件を変えると 1 ページ目に戻る。範囲外のページは最後のページに寄せる', async () => {
    open('default', '&page=2')
    expect(dataRows()).toHaveLength(16)
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: '並べ替え' }), '金額が小さい順')
    expect(search()).toBe('?screen=invoices&sort=amount')
    expect(dataRows()).toHaveLength(20)
  })
  it('条件・並び順・ページは URL から復元される（再読み込み・戻る）。知らない値は既定に戻す', () => {
    const { unmount } = open('default', '&status=sent&sort=amount_desc')
    expect(screen.getByRole('combobox', { name: '状況' })).toHaveValue('sent')
    expect(screen.getByRole('combobox', { name: '並べ替え' })).toHaveValue('amount_desc')
    expect(dataRows()).toHaveLength(6)
    unmount()
    open('default', '&status=zzz&sort=zzz&page=-4')
    expect(screen.getByRole('combobox', { name: '状況' })).toHaveValue('all')
    expect(screen.getByRole('combobox', { name: '並べ替え' })).toHaveValue('due')
  })
})

describe('[REQ-013] 条件の読み書きと探し方（純粋な関数）', () => {
  it('URL の読み書きは既定の値を書かず、ほかの項目（screen・state）を残す', () => {
    const q = parseQuery(new URLSearchParams('status=overdue&q=a&sort=issued&page=3'))
    expect(q).toEqual({ status: 'overdue', q: 'a', sort: 'issued', page: 3 })
    expect(withQuery('?screen=invoices&state=many', q)).toBe('?screen=invoices&state=many&status=overdue&q=a&sort=issued&page=3')
    expect(withQuery('?screen=invoices&state=many&status=paid&page=2', { status: 'all', q: '', sort: 'due', page: 1 })).toBe('?screen=invoices&state=many')
  })
  it('探す語の照合：全角半角・大小・ひらがな・ハイフンの種類・空白をそろえる（lib の foldForSearch を 1 か所で使う）', () => {
    const rows = buildInvoiceRows(invoices, clients)
    const hokuto = rows.find((r) => r.clientName.includes('北斗'))!
    const wide = (s: string) => s.replace(/[A-Za-z0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0)).replace(/-/g, '\u2010')
    const number = hokuto.invoice.number ?? ''
    expect(number).not.toBe('')
    expect(invoiceMatches(hokuto, wide(number.toLowerCase()))).toBe(true)
    expect(invoiceMatches(hokuto, 'ほくと')).toBe(true)
    expect(invoiceMatches(hokuto, ' 北斗 \u3000印刷 ')).toBe(true)
    expect(invoiceMatches(hokuto, 'ＨＯＫＵＴＯ')).toBe(false)
  })
  it('範囲外のページは最後のページに寄せる（paginate が持つ。画面は 20 件を定義しない）', () => {
    open('default', '&page=9')
    expect(dataRows()).toHaveLength(16)
    expect(screen.getByRole('navigation', { name: 'ページ送り' })).toHaveTextContent('全36件のうち21〜36件')
  })
})

describe('[REQ-027] URL と戻る', () => {
  it('絞り込みは URL に持つが履歴に積まない。行のリンクは href を持ち、押すと履歴に積んで移る', async () => {
    open('many')
    const user = userEvent.setup()
    const before = window.history.length
    await user.selectOptions(screen.getByRole('combobox', { name: '状況' }), screen.getByRole('option', { name: /^送付済み/ }))
    expect(search()).toBe('?screen=invoices&state=many&status=sent')
    expect(window.history.length).toBe(before)
    const a = within(dataRows()[0]).getByRole('link')
    await user.click(a)
    expect(window.history.length).toBe(before + 1)
    expect(search()).toMatch(/^\?screen=invoice-detail&id=/)
  })
  it('個人情報は URL に入れない（取引先名の探す語だけが q に入る。請求書の金額・住所は入らない）', async () => {
    open()
    await userEvent.setup().type(screen.getByRole('textbox', { name: '取引先名・番号で探す' }), '北斗')
    expect(search()).not.toMatch(/@|\d{3}-\d{4}|円/)
  })
})

describe('[SCR-002:default] 既定', () => {
  it('[REQ-013] 36 件を 20 件ごとに表で出し、見出しの次が探す・絞る・並べ替えの 3 欄', () => {
    open()
    expect(dataRows()).toHaveLength(20)
    expect(screen.getByText('全36件・入金待ちを先に、支払期限が近い順')).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    const text = document.body.textContent ?? ''
    expect(text.indexOf('取引先名・番号で探す')).toBeLessThan(text.indexOf('全36件'))
  })
  it('[REQ-002] 札は 20 枚を超えない 1 ページに、期限超過だけが通常の札で、ほかは静かな札', () => {
    const { container } = open()
    const tags = [...container.querySelectorAll('[data-density]')]
    const of = (label: string) => tags.filter((t) => t.textContent === label).map((t) => t.getAttribute('data-density'))
    expect(of('期限超過')).toEqual(['normal', 'normal', 'normal'])
    for (const l of ['送付済み', '入金済み', '下書き']) for (const d of of(l)) expect(d).toBe('quiet')
  })
})

describe('[SCR-002:loading] 読み込み中', () => {
  it('[REQ-008] 骨組みを role=status で伝え、0 件の表示も表も出さない。見出しと主ボタンは残る', () => {
    open('loading')
    expect(screen.getByRole('status')).toHaveTextContent('読み込んでいます')
    expect(screen.queryByText('請求書はまだありません')).toBeNull()
    expect(screen.queryByText('条件に合う請求書はありません')).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('請求書')
    expect(screen.getByRole('link', { name: '請求書を作る' })).toBeInTheDocument()
  })
})

describe('[SCR-002:error] 失敗', () => {
  it('[REQ-008] 本体の位置に失敗の表示と再試行。表と欄は出さず、0 件にしない', () => {
    open('error')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'もう一度読み込む' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('search')).toBeNull()
    expect(screen.queryByText('請求書はまだありません')).toBeNull()
  })
})

describe('[SCR-002:empty] 初回の 0 件', () => {
  it('[REQ-008] 理由と次の一手（文中のリンク）。欄と表は出さない。主ボタンは見出しの右の 1 つだけで、同じ名前のボタンを重ねない', () => {
    open('empty')
    expect(screen.getByText('請求書はまだありません')).toBeInTheDocument()
        // 主ボタンと同じ名前のボタンは重ねない（決定 9）。作る導線は文中のリンクだけ
    const main = screen.getAllByRole('link', { name: '請求書を作る' })
    expect(main).toHaveLength(1)
    expect(main[0].closest('[data-cmp="CMP-014"]')).toBeNull()
    const empty = screen.getByText('請求書はまだありません').closest('[data-cmp="CMP-014"]') as HTMLElement
    expect(within(empty).queryByRole('button')).toBeNull()
    const inline = within(empty).getByRole('link', { name: '最初の請求書を作る' })
    expect(inline).toHaveAttribute('href', '?screen=invoice-new')
    expect(inline.parentElement).toHaveTextContent('最初の請求書を作ると、ここに並びます。')
    expect(screen.queryByRole('search')).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('[SCR-002:filtered_empty] 条件に合う請求書が 0 件', () => {
  it('[REQ-013] 適用中の条件が見え、作る導線は置かず、条件を外すと一覧に戻る', async () => {
    open('filtered_empty')
    const user = userEvent.setup()
    expect(screen.getByText('条件に合う請求書はありません')).toBeInTheDocument()
    expect(screen.getByText('条件を外すと、ほかの請求書が見つかります。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '状況：取り消し済みの条件を外す' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '「北斗」で探すの条件を外す' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: '請求書を作る' })).toHaveLength(1)
    expect(screen.queryByText('請求書はまだありません')).toBeNull()
    // 「条件をすべて外す」は副（枠）のボタン（D-04）。条件の並びの中のものも quiet にしない
    const all = screen.getAllByRole('button', { name: '条件をすべて外す' })
    expect(all).toHaveLength(2)
    for (const b of all) expect(b).toHaveAttribute('data-variant', 'secondary')
    const empty = screen.getByText('条件に合う請求書はありません').closest('[data-cmp="CMP-014"]') as HTMLElement
    await user.click(within(empty).getByRole('button', { name: '条件をすべて外す' }))
    expect(dataRows()).toHaveLength(20)
    expect(screen.queryByRole('list', { name: '適用中の条件' })).toBeNull()
    expect(search()).toBe('?screen=invoices&state=filtered_empty')
  })
})

describe('[SCR-002:many] 大量', () => {
  it('[REQ-013] 240 件を 20 件ごとに出し、ページ送りは 12 ページ。札は静かにする', async () => {
    const { container } = open('many')
    expect(dataRows()).toHaveLength(20)
    expect(screen.getByText(/^全240件・/)).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'ページ送り' })
    expect(nav).toHaveTextContent('全240件のうち1〜20件')
    expect(within(screen.getByRole('combobox', { name: '状況' })).getAllByRole('option')[0]).toHaveTextContent('すべて（240件）')
    for (let i = 0; i < 11; i++) await userEvent.setup().click(within(nav).getByRole('button', { name: '次へ' }))
    expect(nav).toHaveTextContent('全240件のうち221〜240件')
    expect(within(nav).getByRole('button', { name: '次へ' })).toBeDisabled()
    expect(search()).toBe('?screen=invoices&state=many&page=12')
    const tags = [...container.querySelectorAll('[data-density]')]
    expect(tags).toHaveLength(20)
    expect(tags.filter((t) => t.getAttribute('data-density') === 'quiet').length).toBeGreaterThan(10)
  })
})

describe('[SCR-002:refreshing] 更新中', () => {
  it('[REQ-008] 前の一覧を残して「更新しています」。骨組みは出さず、並べ替えとページ送りだけ止める', () => {
    open('refreshing')
    expect(screen.getByRole('status')).toHaveTextContent('更新しています。並べ替えとページ送りは、終わるまで変えられません')
    expect(dataRows()).toHaveLength(20)
    expect(screen.queryByText('読み込んでいます')).toBeNull()
    expect(screen.getByRole('combobox', { name: '並べ替え' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '次へ' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: '状況' })).toBeEnabled()
    expect(screen.getByRole('textbox', { name: '取引先名・番号で探す' })).toBeEnabled()
  })
})

describe('[SCR-002:stale] 更新できず前の一覧を見せている', () => {
  it('[REQ-008] 「HH:MM時点の内容です」と前の一覧。再試行は処理中になり、成功で知らせが消える', async () => {
    open('stale')
    expect(screen.getByText('09:30時点の内容です')).toBeInTheDocument()
    expect(screen.getByText('更新できませんでした。もう一度読み込んでください。')).toBeInTheDocument()
    expect(dataRows()).toHaveLength(20)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'もう一度読み込む' }))
    expect(screen.getByRole('button', { name: /読み込んでいます/ })).toHaveAttribute('aria-busy', 'true')
    await waitFor(() => expect(screen.queryByText('09:30時点の内容です')).toBeNull(), { timeout: 3000 })
    expect(dataRows()).toHaveLength(20)
  })
})
