import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, describe, expect, it } from 'vitest'
import { clients, dueNote, invoices, NOW } from '../../data'
import { ToastProvider } from '../../ui'
import { foldForSearch, paginate } from '../../lib'
import { PAGE_SIZE } from '../../ui'
import { summary } from './copy'
import { LONGEST_NAME, makeManyRows } from './fixtures'
import { clientMatches, rowsFrom, SORTS } from './model'
import { screen as def } from './index'

const Clients = def.Component
const show = (state = 'default') => render(<ToastProvider><Clients state={state} /></ToastProvider>)
const open = (search: string) => window.history.replaceState(null, '', search)
afterEach(() => open('/'))

const table = () => screen.getByRole('table', { name: '取引先の一覧' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const searchBox = () => screen.getByRole('textbox', { name: /取引先を探す/ })
const nameOf = (row: HTMLElement) => within(row).getAllByRole('cell')[0].textContent?.replace(/^取引先名/, '') ?? ''

describe('[SCR-005:default] 取引先の一覧', () => {
  it('[REQ-018] 取引先を 1 行ずつ、取引先名・担当者・締め日と支払期限・未入金額の順に並べる', () => {
    show()
    expect(within(table()).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['取引先名', '担当者', '締め日と支払期限', '未入金額（税込・円）'])
    expect(bodyRows()).toHaveLength(clients.length)
    const first = bodyRows().find((r) => nameOf(r).includes('北斗印刷')) as HTMLElement
    expect(within(first).getByRole('link', { name: '株式会社北斗印刷を編集する' })).toHaveAttribute('href', '?screen=client-form&id=c01')
    expect(first).toHaveTextContent('佐藤 健一')
    expect(first).toHaveTextContent('営業部')
    expect(first).toHaveTextContent('月末締め・翌月末払い')
  })
  it('[REQ-018] 担当者が 2 名以上のとき「ほか1名」と言う。ページ送りは 20 件以下では出さない', () => {
    show()
    expect(screen.getByText('ほか1名')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'ページ送り' })).not.toBeInTheDocument()
  })
  it('[REQ-018] 初期は読み仮名順。条件と未入金額の合計（税込）を 1 文で言う', () => {
    show()
    const names = bodyRows().map(nameOf)
    expect(names[0]).toContain('アカシア電機')
    expect(screen.getByRole('radio', { name: '読み仮名順' })).toBeChecked()
    expect(screen.getByText('全14件を読み仮名順に並べています。未入金額は、税込で合計1,457,500円です。')).toBeInTheDocument()
  })
  it('[REQ-003] 金額は桁区切りで 1 円まで、0 は 0、日付は「10/31(土)」の形、期限の補足は 14px の言葉', () => {
    show()
    const row = bodyRows().find((r) => nameOf(r).includes('豊平クリーンサービス')) as HTMLElement
    expect(within(row).getByText('36,300')).toBeInTheDocument()
    expect(row).toHaveTextContent('1件・期限は10/31(土)・13日超過')
    const none = bodyRows().find((r) => nameOf(r).includes('東雲デザイン事務所')) as HTMLElement
    expect(within(none).getByText('0')).toBeInTheDocument()
    expect(none).not.toHaveTextContent('件・')
    expect(document.querySelector('[data-cmp="CMP-008"]')?.className).toContain('text-fg')
  })
  it('[REQ-001] 見出しは取引先で、メニューの現在地が取引先、主ボタンは 1 つ（取引先を登録する）', () => {
    show()
    expect(screen.getByRole('heading', { level: 1, name: '取引先' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: '主なメニュー' })).getByRole('link', { name: '取引先' })).toHaveAttribute('aria-current', 'page')
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
    expect(screen.getByRole('link', { name: '取引先を登録する' })).toHaveAttribute('href', '?screen=client-form')
    expect(document.querySelector('[data-scr="SCR-005"]')).toHaveAttribute('data-state', 'default')
  })
  it('[REQ-006] どの行も 4 つの項目を持ち、各項目に見出しの文字が残る（狭い幅で項目を落とさない）', () => {
    show()
    for (const row of bodyRows()) expect(within(row).getAllByRole('cell')).toHaveLength(4)
    const cell = within(bodyRows()[0]).getAllByRole('cell')[3]
    expect(cell).toHaveTextContent('未入金額（税込・円）')
    expect(table().className).toContain('@container')
    expect(table().innerHTML).not.toMatch(/overflow-x|\bw-\d{3,}/)
  })
  it('[REQ-007] 探す欄は名前・補足・16px の文字を持ち、プレースホルダーが無い。axe の違反が無い', async () => {
    const { container } = show()
    expect(searchBox()).toHaveAccessibleDescription('取引先名か読み仮名で探せます。例：ほくと')
    expect(searchBox()).not.toHaveAttribute('placeholder')
    expect(searchBox().className).toContain('text-large')
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(result.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 80)}`)).toEqual([])
  })
})

describe('[SCR-005:default] 探す・並べる（REQ-018・REQ-027）', () => {
  it('[REQ-018] 取引先名の一部・読み仮名（ひらがな・半角カナ）・全角の空白で探せる', async () => {
    const user = userEvent.setup()
    show()
    for (const word of ['北斗', 'ほくと', 'ﾎｸﾄ', 'ほくと　いんさつ']) {
      await user.clear(searchBox())
      await user.type(searchBox(), word)
      expect(bodyRows().map(nameOf), word).toEqual(['株式会社北斗印刷を編集する'])
    }
    expect(screen.getByText('条件に合う1件を読み仮名順に並べています。未入金額は、税込で合計112,200円です。')).toBeInTheDocument()
  })
  it('[REQ-018] 担当者名では探さない（個人名を探す対象にも URL にも入れない）', async () => {
    show()
    expect(clientMatches(rowsFrom(clients, invoices)[0], '佐藤')).toBe(false)
  })
  it('[REQ-018] 未入金額の多い順に並べ替えられる。同額は読み仮名順', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('radio', { name: '未入金額の多い順' }))
    const names = bodyRows().map(nameOf)
    expect(names[0]).toContain('札幌まちづくり協会')
    expect(names[1]).toContain('アカシア電機')
    expect(names[2]).toContain('北海道中小企業デジタル化推進協議会')
    expect(screen.getByText(/を未入金額の多い順に並べています/)).toBeInTheDocument()
    expect(names.slice(-1)[0]).toBeTruthy()
  })
  it('[REQ-027] 探す語・並び順は URL に持つ。履歴は積まず（replace）、既定の値は書かない', async () => {
    const user = userEvent.setup()
    const before = window.history.length
    show()
    await user.type(searchBox(), '北斗')
    expect(new URLSearchParams(window.location.search).get('q')).toBe('北斗')
    await user.click(screen.getByRole('radio', { name: '未入金額の多い順' }))
    expect(new URLSearchParams(window.location.search).get('sort')).toBe('unpaid')
    await user.click(screen.getByRole('radio', { name: '読み仮名順' }))
    expect(new URLSearchParams(window.location.search).has('sort')).toBe(false)
    expect(window.history.length).toBe(before)
  })
  it('[REQ-027] URL の探す語・並び順で開き直すと同じ画面になる。戻る・進むで読み直す', () => {
    open('?screen=clients&q=%E5%8C%97%E6%96%97&sort=unpaid')
    show()
    expect(searchBox()).toHaveValue('北斗')
    expect(screen.getByRole('radio', { name: '未入金額の多い順' })).toBeChecked()
    expect(bodyRows()).toHaveLength(1)
    act(() => { open('?screen=clients'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(searchBox()).toHaveValue('')
    expect(bodyRows()).toHaveLength(14)
  })
  it('[REQ-018] 探す語を消すボタンは語があるときだけ出て、押すとフォーカスが欄へ戻る', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.queryByRole('button', { name: '探す語を消す' })).not.toBeInTheDocument()
    await user.type(searchBox(), '北斗')
    await user.click(screen.getByRole('button', { name: '探す語を消す' }))
    expect(searchBox()).toHaveValue('')
    expect(searchBox()).toHaveFocus()
    expect(bodyRows()).toHaveLength(14)
  })
})

describe('[SCR-005:loading] 待ち', () => {
  it('[REQ-008] 表の部分だけ骨組み（読み上げあり）。探す欄・0 件の表示は出さない。主ボタンは残る', () => {
    show('loading')
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('取引先の一覧を読み込んでいます')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText(/ありません/)).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '取引先を登録する' })).toBeInTheDocument()
  })
})

describe('[SCR-005:error] 失敗', () => {
  it('[REQ-008] 何が起きたかと直し方を role=alert で言い、もう一度読み込むと立ち直る', async () => {
    const user = userEvent.setup()
    show('error')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('読み込めませんでした')
    expect(alert).toHaveTextContent('もう一度読み込んでください')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await user.click(within(alert).getByRole('button', { name: 'もう一度読み込む' }))
    expect(await screen.findByRole('table', { name: '取引先の一覧' }, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('[SCR-005:empty] 初回の 0 件', () => {
  it('[REQ-008] 取引先はまだありませんと、何をすれば並ぶか、登録への導線を出す。探す欄は隠す', () => {
    show('empty')
    expect(screen.getByText('取引先はまだありません')).toBeInTheDocument()
    const empty = document.querySelector('[data-cmp="CMP-014"]') as HTMLElement
    expect(empty).toHaveTextContent('取引先を登録すると、請求書の宛先として選べるようになります。')
    // 次の一手は文中のリンクだけ。見出し右の主ボタンと同じ名前のボタンは重ねない（決定 9）
    expect(within(empty).getByRole('link', { name: '取引先を登録する' })).toHaveAttribute('href', '?screen=client-form')
    expect(within(empty).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: '取引先を登録する' })).toHaveLength(2)
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('[SCR-005:filtered_empty] 探す語に合う物が無い', () => {
  it('[REQ-008] 適用中の語を見せ、作る導線は主にせず、探す語を消すと全件が戻る', async () => {
    const user = userEvent.setup()
    show('filtered_empty')
    expect(searchBox()).toHaveValue('ゆきぞら')
    expect(screen.getByText('条件に合う取引先はありません')).toBeInTheDocument()
    expect(screen.getByText(/「ゆきぞら」に当たる取引先名と読み仮名はありません/)).toBeInTheDocument()
    expect(screen.queryByText('取引先はまだありません')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
    const empty = document.querySelector('[data-cmp="CMP-014"]') as HTMLElement
    await user.click(within(empty).getByRole('button', { name: '探す語を消す' }))
    expect(bodyRows()).toHaveLength(14)
  })
})

describe('[SCR-005:many] 多い', () => {
  it('[REQ-018] 200 件を 1 ページの件数（PAGE_SIZE）ごとに分け、件数つきのページ送りで進める。ページは URL に残る', async () => {
    const user = userEvent.setup()
    show('many')
    expect(bodyRows()).toHaveLength(PAGE_SIZE)
    const nav = screen.getByRole('navigation', { name: 'ページ送り' })
    expect(nav).toHaveTextContent(`全200件のうち1〜${PAGE_SIZE}件`)
    expect(within(nav).getByRole('button', { name: '前へ' })).toBeDisabled()
    await user.click(within(nav).getByRole('button', { name: '次へ' }))
    expect(nav).toHaveTextContent(`全200件のうち${PAGE_SIZE + 1}〜${PAGE_SIZE * 2}件`)
    expect(new URLSearchParams(window.location.search).get('page')).toBe('2')
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('全200件を読み仮名順に並べています')
    expect(screen.getByRole('status', { name: '' })).toHaveFocus()
  })
  it('[REQ-018] 範囲の外のページ番号は端に寄せ、探す語を変えたらページは 1 に戻る', async () => {
    const user = userEvent.setup()
    open('?screen=clients&state=many&page=99')
    show('many')
    expect(screen.getByRole('navigation', { name: 'ページ送り' })).toHaveTextContent(`全200件のうち${Math.floor(199 / PAGE_SIZE) * PAGE_SIZE + 1}〜200件`)
    await user.type(searchBox(), '建設')
    expect(new URLSearchParams(window.location.search).has('page')).toBe(false)
    expect(searchBox()).toHaveFocus()
  })
  it('[REQ-006] 最長 60 字の取引先名を省略せず全部見せる。見本は 200 件で最長の名前を含む', async () => {
    const user = userEvent.setup()
    expect([...LONGEST_NAME]).toHaveLength(60)
    const rows = makeManyRows()
    expect(rows).toHaveLength(200)
    expect(new Set(rows.map((r) => r.client.id)).size).toBe(200)
    show('many')
    await user.type(searchBox(), '運営室')
    expect(bodyRows()).toHaveLength(1)
    expect(screen.getByRole('link', { name: `${LONGEST_NAME}を編集する` })).toBeInTheDocument()
    expect(table().innerHTML).not.toMatch(/truncate|text-ellipsis|line-clamp/)
  })
  it('[REQ-007] 多い状態でも axe の違反が無い', async () => {
    const { container } = show('many')
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(result.violations.map((v) => v.id)).toEqual([])
  })
})

describe('[SCR-005:refreshing] 更新中', () => {
  it('[REQ-008] 前の表を残して「更新しています」と言い、並び順とページ送りだけを止める（探す欄は止めない）', () => {
    show('refreshing')
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
    expect(screen.getByText('更新しています。並び順とページは変えられません')).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(14)
    expect(document.querySelector('[data-cmp="CMP-013"]')).not.toBeInTheDocument()
    for (const r of screen.getAllByRole('radio')) expect(r).toBeDisabled()
    expect(searchBox()).toBeEnabled()
  })
  it('[REQ-008] 更新中の多い一覧では、ページ送りも押せない', () => {
    open('?screen=clients&state=refreshing')
    show('refreshing')
    expect(screen.queryByRole('navigation', { name: 'ページ送り' })).not.toBeInTheDocument()
  })
})

describe('[SCR-005:stale] 更新できなかった', () => {
  it('[REQ-008] 前の表を HH:MM 時点で見せ、何が古いかと次の一手を言う。再読み込みで立ち直る', async () => {
    const user = userEvent.setup()
    show('stale')
    const note = document.querySelector('[data-cmp="CMP-004"]') as HTMLElement
    expect(note).toHaveTextContent('09:30時点の内容です')
    expect(note).toHaveTextContent('更新できませんでした。未入金額は更新前の金額です。もう一度読み込んでください。')
    expect(bodyRows()).toHaveLength(14)
    expect(NOW.getTime()).toBeGreaterThan(0)
    await user.click(within(note).getByRole('button', { name: 'もう一度読み込む' }))
    await waitFor(() => expect(document.querySelector('[data-cmp="CMP-004"]')).not.toBeInTheDocument(), { timeout: 4000 })
    expect(bodyRows()).toHaveLength(14)
  }, 8000)
})

describe('[REQ-018] 取引先の行の計算と定義', () => {
  it('[REQ-018] 未入金額は送付済み（期限超過を含む）の請求書の税込の合計、最も早い期限を持つ', () => {
    const rows = rowsFrom(clients, invoices)
    const c06 = rows.find((r) => r.client.id === 'c06')
    expect(c06).toMatchObject({ unpaid: 36300, unpaidCount: 1, earliestDue: '2026-10-31' })
    expect(rows.find((r) => r.client.id === 'c05')).toMatchObject({ unpaid: 0, unpaidCount: 0, earliestDue: null })
    expect(rows.reduce((s, r) => s + r.unpaid, 0)).toBe(1457500)
  })
  it('[REQ-018] 並び順の定義は 2 つ、既定は読み仮名順。ページの範囲は端に寄せる', () => {
    expect(SORTS.map((s) => s.value)).toEqual(['kana', 'unpaid'])
    expect(paginate([1, 2, 3], 0).page).toBe(1)
    expect(paginate(Array.from({ length: PAGE_SIZE * 2 + 1 }, (_, i) => i), 9).rows).toEqual([PAGE_SIZE * 2])
  })
  it('[REQ-018] 探す語は全角半角・ひらがなとカタカナ・空白・英字の大小を同じ値にそろえる', () => {
    expect(foldForSearch('ﾎｸﾄ インサツ')).toBe('ホクトインサツ')
    expect(foldForSearch('ほくと　いんさつ')).toBe('ホクトインサツ')
    expect(foldForSearch('ＡＢＣ')).toBe('abc')
  })
  it('[REQ-003] 期限の言い方は「あと3日」「3日超過」「今日まで」、合計の文は税込を言う', () => {
    expect([dueNote(3), dueNote(-3), dueNote(0)]).toEqual(['あと3日', '3日超過', '今日まで'])
    expect(summary({ count: 2, filtered: true, sortLabel: '読み仮名順', unpaidTotal: 0 })).toBe('条件に合う2件を読み仮名順に並べています。未入金額は、税込で合計0円です。')
  })
})
